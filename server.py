import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
import json
import numpy as np

# --- 設定 ---
# 環境変数から取得するロジック
API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("エラー: APIキーが設定されていません。環境変数 GEMINI_API_KEY を設定してください。")
    
# --- 初期化 ---
app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing Gemini Client...")
try:
    # Gemini Client
    client = genai.Client(api_key=API_KEY)
    
    # テキスト生成モデル
    GEN_MODEL_NAME = 'gemini-2.0-flash'
    # ベクトル埋め込みモデル（軽量・高速）
    EMBED_MODEL_NAME = 'text-embedding-004'
    
    print("Client initialized successfully!")
except Exception as e:
    print(f"Initialization error: {e}")

# --- リクエスト型定義 ---
class TopicRequest(BaseModel):
    pass

class CardRequest(BaseModel):
    count: int = 10
    used_cards: list[str] = []

class JudgeRequest(BaseModel):
    topic: str
    answer: str
    is_manual: bool = False
    personality: str = "standard"

# --- 内部関数: コサイン類似度計算 ---
def calculate_cosine_similarity(vec1, vec2):
    # numpyを使って計算
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    return dot_product / (norm_a * norm_b)

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server is running (Lightweight Mode)"}

@app.post("/api/topic")
def generate_topic():
    prompt = "大喜利のお題を1つ作成してください。条件: 問いかけ形式（「〜とは？」「〜は？」）。回答は名詞一言。プレースホルダーは禁止。JSON出力{\"topic\":\"...\"}"
    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Topic Error: {e}")
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
        print(f"Cards Error: {e}")
        return {"answers": []}

@app.post("/api/judge")
def judge_answer(req: JudgeRequest):
    similarity = 0.5
    distance_eval = "Unknown"

    # 1. API経由でベクトル類似度を計算 (サーバーのメモリを使わない)
    try:
        # お題と回答をベクトル化
        result_topic = client.models.embed_content(
            model=EMBED_MODEL_NAME,
            contents=req.topic
        )
        result_answer = client.models.embed_content(
            model=EMBED_MODEL_NAME,
            contents=req.answer
        )
        
        # 類似度計算
        similarity = calculate_cosine_similarity(
            result_topic.embeddings[0].values,
            result_answer.embeddings[0].values
        )
        similarity = float(similarity) # numpy float -> python float

        # 距離感の判定テキスト
        if 0.4 <= similarity <= 0.6:
            distance_eval = "Sweet Spot (絶妙)"
        elif similarity > 0.8:
            distance_eval = "Too Close (近すぎ)"
        elif similarity < 0.2:
            distance_eval = "Too Far (遠すぎ)"
        else:
            distance_eval = "Normal"

    except Exception as e:
        print(f"Embedding Error: {e}")
        # エラーでも採点自体は止めない

    # 2. 審査員ペルソナの設定
    personas = {
        "strict": "あなたは激辛審査員です。採点は厳しく（基準より-10点）、辛辣なコメントをします。",
        "gal": "あなたはギャル審査員です。「ウケる」「それな」などの若者言葉でノリよく採点します。",
        "chuuni": "あなたは厨二病審査員です。闇の炎や禁断の力に例えて大げさにコメントします。",
        "standard": "あなたは「ノリの良いお笑い審査員」です。"
    }
    personality_prompt = personas.get(req.personality, personas["standard"])

    # 3. Geminiによる評価
    radar_desc = "radarは5項目(surprise:意外性, context:文脈, punchline:瞬発力, humor:毒気, intelligence:知性)を0-5で厳正に評価（3が標準）"

    prompt = f"""
    {personality_prompt}
    以下のお題と回答を審査してください。

    [お題]: {req.topic}
    [回答]: {req.answer}
    [分析データ]: お題との意味的類似度は {similarity:.4f} です（1.0に近いほど似ている）。判定は「{distance_eval}」です。

    # 評価ルール
    1. 類似度が0.4〜0.6付近（Sweet Spot）の回答は「適度なズレ」として高く評価してください。
    2. 類似度が高すぎる（0.8以上）は「ひねりがない」、低すぎる（0.2以下）は「無関係」として減点対象ですが、面白い場合は救済してください。
    3. {radar_desc}
    4. 「reasoning」には、類似度の観点を含めた論理的な解説を記述してください。

    出力JSON: {{
        "comment": "15文字程度のツッコミ",
        "reasoning": "100文字程度の解説",
        "radar": {{"surprise":3, "context":3, "punchline":3, "humor":3, "intelligence":3}}
    }}
    """

    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        result = json.loads(response.text)
        
        # 計算した類似度を結果に追加
        result["distance"] = similarity
        
        return result
    except Exception as e:
        print(f"Judge Error: {e}")
        return {
            "comment": "審査中にエラーが起きたみたいやわ...",
            "reasoning": "AIとの通信に失敗しました。",
            "distance": similarity,
            "radar": {"surprise":1, "context":1, "punchline":1, "humor":1, "intelligence":1}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)