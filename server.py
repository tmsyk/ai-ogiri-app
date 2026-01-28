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

# --- スコア計算ロジック（4次元モデル対応版） ---
def calculate_overall_score(radar):
    """
    4次元モデル + 新規性 に基づく総合点計算
    """
    # 新しいキーで取得（なければ1をデフォルトにして極端な0点を防ぐ）
    linguistic = radar.get('linguistic', 1) # 言語的
    cognitive = radar.get('cognitive', 1)   # 認知的
    emotional = radar.get('emotional', 1)   # 情動的
    focus = radar.get('focus', 1)           # 視点
    novelty = radar.get('novelty', 1)       # 新規性

    # 1. 基礎点 (Base Validity): 認知的距離が適切か？
    # 認知(cognitive)が極端に低い(1以下)と「意味不明」として減点
    base_factor = 1.0
    if cognitive < 2:
        base_factor = 0.5 

    # 2. 爆発力 (Impact): 突出した要素があるか？
    # 言語、情動、視点、新規性の中で最も高い数値を評価
    max_impact = max(linguistic, emotional, focus, novelty)
    
    # 平均点も加味（バランスよく高い場合も評価）
    avg_score = (linguistic + cognitive + emotional + focus + novelty) / 5.0
    
    # パワー算出: 最大値重視だが平均も少し見る
    power = (max_impact * 0.7) + (avg_score * 0.3)

    # 3. 総合計算
    # 5点満点 -> 100点満点換算 (x20)
    raw_score = power * 20 * base_factor
    
    # ボーナス加点
    bonus = 0
    # 「インテリジェンス（言語的）」かつ「シュール（視点・新規性）」などのコンボ
    if linguistic >= 4 and (focus >= 4 or novelty >= 4):
        bonus += 5
    # 「共感（情動的）」が高い
    if emotional >= 4:
        bonus += 5

    final_score = int(raw_score + bonus)
    # 最低10点、最高100点
    return min(100, max(10, final_score))

# --- Watashihaモデル用関数 ---
def generate_by_watashiha(prompt_text):
    if not HF_API_KEY:
        return None
    
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
            "temperature": 0.8,
            "top_p": 0.9,
            "top_k": 50,
            "return_full_text": False
        }
    }
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=8)
        output = response.json()
        if isinstance(output, list) and len(output) > 0 and "generated_text" in output[0]:
            text = output[0]["generated_text"].strip()
            return text if text else None
        return None
    except Exception:
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
    if 0.4 <= similarity <= 0.6: return 1.2 
    elif 0.2 < similarity < 0.8: return 1.0 
    else: return 0.8 

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server (Fixed Scoring)"}

@app.post("/api/watashiha")
def generate_joke(req: WatashihaRequest):
    answer = generate_by_watashiha(req.topic)
    if answer: return {"answer": answer}
    else:
        try:
            prompt = f"大喜利のお題「{req.topic}」に対して、人間味のあるボケ回答を1つ出力してください。回答のみ。"
            res = client.models.generate_content(model=GEN_MODEL_NAME, contents=prompt)
            return {"answer": res.text.strip() + " (Gemini代打)"}
        except: return {"answer": "（思いつかなかった...）"}

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
    
    ai_example = generate_by_watashiha(req.topic)
    if not ai_example: ai_example = "（考え中...）"

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

    # ★重要: レーダーチャートのキー名をここで統一
    prompt = f"""
    {personality_prompt}
    {feedback_text}

    以下のお題と回答（名詞）を、「面白さの4次元評価モデル」に基づいて審査してください。

    [お題]: {req.topic}
    [回答]: {req.answer}
    [参考]: 類似度 {similarity:.4f} ({distance_eval})

    # 評価基準 (0-5点)
    1. linguistic (言語的距離): 言葉の硬さ・格式のギャップ。
    2. cognitive (認知的距離): カテゴリーの飛躍。
    3. emotional (情動的距離): 聖俗のギャップ。
    4. focus (視点): 具体と抽象のズレ。
    5. novelty (新規性): アイデアの斬新さ。

    # 名詞アンカー理論
    認知（意味）がつながっているのに、言語（硬さ）や情動（聖俗）が真逆である回答を高評価としてください。

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
        
        # 補正適用
        radar = result.get("radar", {})
        for k in radar:
            if k == "cognitive":
                radar[k] = max(0, min(5, round(radar[k] * multiplier)))
            else:
                radar[k] = max(0, min(5, radar[k]))
        
        # ★修正: 新しいロジックでスコア計算
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
            "score": 40, # エラー時でも最低点は与える
            "comment": "採点不能...",
            "reasoning": "通信エラーが発生しました。",
            "distance": similarity,
            "ai_example": ai_example,
            # フォールバック用データもキー名を統一
            "radar": {"linguistic":2,"cognitive":2,"emotional":2,"focus":2,"novelty":2}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)