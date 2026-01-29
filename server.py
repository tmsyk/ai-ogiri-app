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

# --- スコア計算ロジック（甘口調整版） ---
def calculate_overall_score(radar):
    """
    4次元モデルに基づく総合点計算。
    AIが「3」をつけた場合に60-70点が出るように調整。
    """
    # 各項目を取得（なければ2をデフォルトにして極端な0点を防ぐ）
    linguistic = radar.get('linguistic', 2)
    cognitive = radar.get('cognitive', 2)
    emotional = radar.get('emotional', 2)
    focus = radar.get('focus', 2)
    novelty = radar.get('novelty', 2)

    # 1. 突出度 (Peak): 最も高い要素を評価
    max_val = max(linguistic, cognitive, emotional, focus, novelty)
    
    # 2. 平均点 (Average)
    avg_val = (linguistic + cognitive + emotional + focus + novelty) / 5.0

    # 3. 基礎スコア計算
    # 最大値を重視しつつ、平均値で底上げ
    # 例: 全部3なら power = 3.0。 全部2なら power = 2.0。
    # 1点につき約15-20点の価値を持たせる
    power = (max_val * 0.6) + (avg_val * 0.4)
    
    # 4. 100点満点換算
    # power=3.0 -> 60点 + 基礎10点 = 70点
    # power=5.0 -> 100点 + 基礎10点 = 110点 -> 100点
    raw_score = (power * 20) + 10

    # 5. コンボボーナス（尖った回答への報酬）
    bonus = 0
    if novelty >= 4: bonus += 5
    if linguistic >= 4: bonus += 5
    if emotional >= 4: bonus += 5

    final_score = int(raw_score + bonus)
    
    # 範囲制限
    return min(100, max(10, final_score))

# --- Watashihaモデル用関数 (Gemini代打付き) ---
def generate_by_watashiha(prompt_text):
    """
    Hugging Faceのモデルでボケを生成する。
    失敗時やタイムアウト時はGeminiが代打を行う。
    """
    # 1. まずWatashihaモデル (Hugging Face) を試す
    if HF_API_KEY:
        API_URL = "https://api-inference.huggingface.co/models/watashiha/Watashiha-Llama-2-13B-Ogiri-sft"
        headers = {"Authorization": f"Bearer {HF_API_KEY}"}
        
        formatted_prompt = f"""
以下は、タスクを説明する指示と、文脈のある入力の組み合わせです。要求を適切に満たす応答を書きなさい。

### 指示:
入力の文は大喜利のお題です。お題に沿った面白いボケを生成してください。

### 入力:
{prompt_text}

### 応答:
"""
        payload = {
            "inputs": formatted_prompt,
            "parameters": {
                "max_new_tokens": 64, 
                "temperature": 0.85,
                "top_p": 0.9,
                "top_k": 50,
                "return_full_text": False
            }
        }
        
        try:
            # 無料APIは遅いことがあるのでタイムアウトを短めに設定してGeminiへ回す
            response = requests.post(API_URL, headers=headers, json=payload, timeout=5)
            output = response.json()
            
            # エラーチェック
            if isinstance(output, list) and len(output) > 0 and "generated_text" in output[0]:
                text = output[0]["generated_text"].strip()
                if text:
                    return text
        except Exception:
            pass # エラーやタイムアウト時はスルーしてGeminiへ

    # 2. 失敗したらGeminiが代打
    try:
        fallback_prompt = f"大喜利のお題「{prompt_text}」に対して、シュールで面白いボケ回答を1つだけ出力してください。解説不要。回答のみ。"
        res = client.models.generate_content(model=GEN_MODEL_NAME, contents=fallback_prompt)
        text = res.text.strip()
        # 代打であることを明記
        return f"{text} (Gemini代打)"
    except Exception:
        return "（思いつきませんでした...）"

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
    if 0.4 <= similarity <= 0.6: return 1.2 
    elif 0.2 < similarity < 0.8: return 1.0 
    else: return 0.8 

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server (Ver 0.87 Gemini Fallback)"}

@app.post("/api/watashiha")
def generate_joke(req: WatashihaRequest):
    # 関数内でフォールバック処理を行うためシンプルに呼び出すだけ
    answer = generate_by_watashiha(req.topic)
    return {"answer": answer}

@app.post("/api/topic")
def generate_topic(req: TopicRequest):
    ref_text = ""
    if req.reference_topics:
        ref_sample = "\n".join(req.reference_topics[:5])
        ref_text = f"以下はユーザーが高く評価したお題の例です:\n{ref_sample}"
    prompt = f"""
    大喜利のお題を1つ作成してください。
    条件: 問いかけ形式（「〜とは？」「〜は？」）。回答は名詞一言でボケられるもの。
    {ref_text}
    JSON出力: {{"topic":"..."}}
    """
    try:
        response = client.models.generate_content(model=GEN_MODEL_NAME, contents=prompt, config={'response_mime_type': 'application/json'})
        return json.loads(response.text)
    except Exception: return {"topic": "エラーが発生したため、お題が出せません。"}

@app.post("/api/cards")
def generate_cards(req: CardRequest):
    prompt = f"""
    大喜利の回答カード（単語・短いフレーズ）を{req.count}個作成。
    条件: 1.実在する言葉 2.インパクト強なら"rarity":"rare" 3.既出避け: {', '.join(req.used_cards[-20:])}
    出力JSON: {{"answers": [{{ "text": "...", "rarity": "normal" }}, ... ]}}
    """
    try:
        response = client.models.generate_content(model=GEN_MODEL_NAME, contents=prompt, config={'response_mime_type': 'application/json'})
        return json.loads(response.text)
    except Exception: return {"answers": []}

@app.post("/api/judge")
def judge_answer(req: JudgeRequest):
    similarity = 0.5
    distance_eval = "Unknown"
    multiplier = 1.0
    
    # 1. Watashihaモデルによる回答例の生成（採点と並行して行う）
    ai_example = generate_by_watashiha(req.topic)

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
        if 0.4 <= similarity <= 0.6: distance_eval = "Sweet Spot"
        elif similarity > 0.8: distance_eval = "Too Close"
        elif similarity < 0.2: distance_eval = "Too Far"
        else: distance_eval = "Normal"
    except Exception as e:
        print(f"Calc Error: {e}")

    personas = {
        "logic": "あなたは「名詞アンカー理論」を提唱するお笑い評論家です。",
        "standard": "あなたは標準的なお笑い審査員です。",
        "strict": "あなたは激辛審査員です。",
        "gal": "あなたはギャル審査員です。",
        "chuuni": "あなたは厨二病審査員です。"
    }
    personality_prompt = personas.get(req.personality, personas["logic"])

    feedback_text = ""
    if req.feedback_logs:
        logs = "\n".join(req.feedback_logs[:5])
        feedback_text = f"[ユーザーの好み]\n{logs}"

    # 評価基準を少し甘めに指示
    radar_desc = """
    以下の4つの次元(0-5点)で評価してください。面白ければ積極的に4点以上をつけてください。
    1. linguistic (言語的距離): 言葉の硬度と格式。
    2. cognitive (認知的距離): カテゴリーの飛躍。
    3. emotional (情動的距離): 聖と俗のギャップ。
    4. focus (視点・解像度): 具体と抽象のズレ。
    5. novelty (新規性): アイデアの斬新さ。
    """

    prompt = f"""
    {personality_prompt}
    {feedback_text}

    以下のお題と回答（名詞）を審査してください。

    [お題]: {req.topic}
    [回答]: {req.answer}
    [参考]: 類似度 {similarity:.4f} ({distance_eval})

    # 評価基準
    {radar_desc}
    
    # 指示
    - 全体的に少し甘めの採点（60点基準）でお願いします。
    - どれか一つの項目でも突出していれば高評価にしてください。
    
    出力JSON: {{
        "comment": "15文字程度の鋭いツッコミ",
        "reasoning": "解説",
        "hardness": 0.5,
        "word_texture": "硬/軟/外",
        "radar": {{"linguistic":3, "cognitive":3, "emotional":3, "focus":3, "novelty":3}}
    }}
    """

    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        result = json.loads(response.text)
        
        radar = result.get("radar", {})
        # 欠損項目の補完
        for key in ["linguistic", "cognitive", "emotional", "focus", "novelty"]:
            if key not in radar: radar[key] = 2
            
        # 認知的距離の補正
        radar["cognitive"] = max(0, min(5, round(radar["cognitive"] * multiplier)))
        
        # スコア計算
        final_score = calculate_overall_score(radar)
        
        return {
            "score": final_score,
            "comment": result.get("comment", ""),
            "reasoning": result.get("reasoning", ""),
            "word_texture": result.get("word_texture", "不明"),
            "hardness": result.get("hardness", 0.5),
            "radar": radar,
            "distance": similarity,
            "ai_example": ai_example
        }

    except Exception as e:
        print(f"Judge Error: {e}")
        return {
            "score": 50, 
            "comment": "採点不能...",
            "reasoning": "通信エラーが発生しました。",
            "distance": similarity,
            "ai_example": ai_example,
            "radar": {"linguistic":2,"cognitive":2,"emotional":2,"focus":2,"novelty":2}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)