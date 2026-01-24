import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
import json
import numpy as np
import requests

# --- 設定 ---
API_KEY = os.environ.get("GEMINI_API_KEY")
HF_API_KEY = os.environ.get("HUGGINGFACE_API_KEY")

if not API_KEY:
    # ローカルテスト用（Gitには上げないでください）
    # API_KEY = "AIzaSy..." 
    pass

if not API_KEY:
    print("エラー: APIキーが設定されていません。")
    
# --- 初期化 ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing Gemini Client...")
try:
    client = genai.Client(api_key=API_KEY)
    GEN_MODEL_NAME = 'gemini-2.0-flash'
    EMBED_MODEL_NAME = 'text-embedding-004'
    print("Client initialized successfully!")
except Exception as e:
    print(f"Initialization error: {e}")

# --- Watashihaモデル用関数 ---
def generate_by_watashiha(prompt):
    if not HF_API_KEY:
        return None
    
    API_URL = "https://api-inference.huggingface.co/models/watashiha/watashiha-gpt-6b"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    
    payload = {
        "inputs": f"大喜利のお題：{prompt}\n面白い回答：",
        "parameters": {
            "max_new_tokens": 30,
            "temperature": 0.85,
            "return_full_text": False,
            "stop": ["\n", "。"]
        }
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        output = response.json()
        if isinstance(output, list) and len(output) > 0 and "generated_text" in output[0]:
            text = output[0]["generated_text"].strip().replace("回答：", "")
            return text if text else None
        return None
    except Exception as e:
        print(f"Watashiha Error: {e}")
        return None

# --- リクエスト型定義 ---
class TopicRequest(BaseModel):
    reference_topics: list[str] = []

class CardRequest(BaseModel):
    count: int = 10
    used_cards: list[str] = []

class JudgeRequest(BaseModel):
    topic: str
    answer: str
    is_manual: bool = False
    personality: str = "logic"
    feedback_logs: list[str] = []

class WatashihaRequest(BaseModel):
    topic: str

# --- 内部関数 ---
def calculate_cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    return dot_product / (norm_a * norm_b)

def get_distance_multiplier(similarity):
    # 逆U字型仮説に基づく補正
    if 0.4 <= similarity <= 0.6: return 1.2 # Sweet Spot
    elif 0.2 < similarity < 0.8: return 1.0 # Normal
    else: return 0.8 # Too Close / Too Far

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server (Computational Humor Edition)"}

@app.post("/api/watashiha")
def generate_joke(req: WatashihaRequest):
    answer = generate_by_watashiha(req.topic)
    if answer:
        return {"answer": answer}
    else:
        # フォールバックとしてGeminiを使用
        try:
            prompt = f"大喜利のお題「{req.topic}」に対して、人間味のあるボケ回答を1つ出力してください。回答のみ。"
            res = client.models.generate_content(model=GEN_MODEL_NAME, contents=prompt)
            return {"answer": res.text.strip()}
        except:
            return {"answer": "（思いつかなかった...）"}

@app.post("/api/topic")
def generate_topic(req: TopicRequest):
    ref_text = ""
    if req.reference_topics:
        ref_sample = "\n".join(req.reference_topics[:5])
        ref_text = f"以下はユーザーが高く評価したお題の例です。これらと似たテイストや形式を意識してください:\n{ref_sample}"

    prompt = f"""
    大喜利のお題を1つ作成してください。
    条件: 
    1. 問いかけ形式（「〜とは？」「〜は？」）。
    2. 回答は名詞一言でボケられるもの。
    3. プレースホルダー（穴埋め）は禁止。
    {ref_text}
    JSON出力: {{"topic":"..."}}
    """
    
    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text)
    except Exception as e:
        return {"topic": "エラーが発生したため、お題が出せません。"}

@app.post("/api/cards")
def generate_cards(req: CardRequest):
    prompt = f"""
    大喜利の回答カード（単語・短いフレーズ）を{req.count}個作成。
    条件:
    1. 世の中に実在する言葉、名詞、慣用句。
    2. インパクトの強い言葉には "rarity": "rare" を付与。
    3. 以下の既出リストに含まれる言葉は避ける: {', '.join(req.used_cards[-20:])}
    出力JSON: {{"answers": [{{ "text": "...", "rarity": "normal" }}, ... ]}}
    """
    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text)
    except Exception as e:
        return {"answers": []}

@app.post("/api/judge")
def judge_answer(req: JudgeRequest):
    similarity = 0.5
    distance_eval = "Unknown"
    multiplier = 1.0

    # 1. API経由でベクトル類似度を計算
    try:
        result_topic = client.models.embed_content(
            model=EMBED_MODEL_NAME, contents=req.topic,
            config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
        )
        result_answer = client.models.embed_content(
            model=EMBED_MODEL_NAME, contents=req.answer,
            config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
        )
        
        similarity = float(calculate_cosine_similarity(
            result_topic.embeddings[0].values,
            result_answer.embeddings[0].values
        ))

        multiplier = get_distance_multiplier(similarity)

        if 0.4 <= similarity <= 0.6: distance_eval = "Sweet Spot (絶妙)"
        elif similarity > 0.8: distance_eval = "Too Close (近すぎ)"
        elif similarity < 0.2: distance_eval = "Too Far (遠すぎ)"
        else: distance_eval = "Normal"

    except Exception:
        pass

    # 2. 審査員ペルソナ
    personas = {
        "logic": "あなたは計算論的ユーモア理論を実装した「論理派AI審査エンジン」です。",
        "strict": "あなたは激辛審査員です。採点は厳しく（基準より-10点）、辛辣なコメントをします。",
        "gal": "あなたはギャル審査員です。「ウケる」「それな」などの若者言葉でノリよく採点します。",
        "chuuni": "あなたは厨二病審査員です。闇の炎や禁断の力に例えて大げさにコメントします。",
        "standard": "あなたは「ノリの良いお笑い審査員」です。"
    }
    personality_prompt = personas.get(req.personality, personas["logic"])

    feedback_text = ""
    if req.feedback_logs:
        logs = "\n".join(req.feedback_logs[:5])
        feedback_text = f"[ユーザーの好み情報]\n{logs}"

    # 3. 計算論的ユーモア理論に基づく評価プロンプト
    theory_instructions = """
    【重要：4つの距離によるユーモア解析】
    以下の4つの観点から、お題と回答の間の「距離」と「不一致の解決」を分析してください。

    1. 意味的距離 (Semantic Distance):
       - ベクトル類似度がSweet Spot(0.4-0.6)にあるか？
       - スクリプト対立（Script Opposition）が成立しているか？
    2. 発音的距離 (Phonetic Distance):
       - 語呂合わせ、ダジャレ、リズム感、音象徴による面白さはあるか？
    3. 視覚的距離 (Visual Distance):
       - 文字の見た目、表記の逸脱、イメージのギャップはあるか？
    4. 感情的距離 (Emotional Distance):
       - 緊張の緩和（Relief）や、感情の落差（ネガティブ→ポジティブ等）はあるか？
    """

    radar_desc = "radarは5項目(novelty:新規性, clarity:明瞭性, relevance:関連性, intelligence:知性, empathy:共感性)を0-5で厳正に評価（3が標準）"

    prompt = f"""
    {personality_prompt}
    {feedback_text}

    以下のお題と回答を審査してください。

    [お題]: {req.topic}
    [回答]: {req.answer}
    [分析データ]: 意味的類似度 {similarity:.4f} ({distance_eval})

    # 評価ルール
    {theory_instructions}

    1. 上記の4つの距離の観点から総合的に面白さを判断してください。
    2. 類似度データは重要な指標ですが、ダジャレ（発音的距離）やシュールさ（視覚的距離）などでカバーできている場合は、類似度が範囲外でも高評価としてください。
    3. {radar_desc}
    4. 「reasoning」には、どの「距離」が面白さに貢献したかを明記して解説してください。

    出力JSON: {{
        "comment": "15文字程度のツッコミ",
        "reasoning": "理論に基づく分析解説",
        "radar": {{"novelty":3, "clarity":3, "relevance":3, "intelligence":3, "empathy":3}}
    }}
    """

    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        result = json.loads(response.text)
        
        # 定量的補正
        radar = result.get("radar", {})
        for k in radar:
            # 類似度による補正をかけるが、AIが「他の距離でカバーできている」と判断して高得点をつけている場合は尊重する
            # ここでは極端な補正はせず、AIの判断を主とする
            new_score = round(radar[k] * multiplier)
            radar[k] = max(0, min(5, new_score))
        
        result["radar"] = radar
        result["distance"] = similarity
        
        # 解説に補正情報を追記
        if "Sweet Spot" in distance_eval:
            result["reasoning"] += " (★意味的距離が絶妙)"
        
        return result
    except Exception as e:
        print(f"Judge Error: {e}")
        return {
            "comment": "評価不能や...", 
            "reasoning": "通信エラー", 
            "distance": similarity,
            "radar": {"novelty":1,"clarity":1,"relevance":1,"intelligence":1,"empathy":1}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)