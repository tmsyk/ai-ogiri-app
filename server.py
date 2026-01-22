import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from sentence_transformers import SentenceTransformer, util
import json
import random

# --- 設定 ---
# 環境変数から取得するロジック
API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    # ローカルテスト用（必要に応じて書き換えてください。Gitには上げないでください）
    # API_KEY = "AIzaSy..." 
    pass

if not API_KEY:
    print("エラー: APIキーが設定されていません。環境変数 GEMINI_API_KEY を設定してください。")
    # サーバー起動自体はさせるが、APIコール時にエラーになる
    
# --- 初期化 ---
app = FastAPI()

# CORS設定（Reactアプリからの通信を許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境ではドメインを指定することを推奨
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading models... (これには時間がかかります)")
try:
    # Gemini Client
    client = genai.Client(api_key=API_KEY)
    MODEL_NAME = 'gemini-2.0-flash'
    
    # Vector Model (CPUでも動く軽量モデル)
    vector_model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
    print("Models loaded successfully!")
except Exception as e:
    print(f"Model loading error: {e}")
    # モデル読み込み失敗時もサーバー自体は落とさない（ヘルスチェック用）

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

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server is running"}

@app.post("/api/topic")
def generate_topic():
    prompt = "大喜利のお題を1つ作成してください。条件: 問いかけ形式（「〜とは？」「〜は？」）。回答は名詞一言。プレースホルダーは禁止。JSON出力{\"topic\":\"...\"}"
    try:
        response = client.models.generate_content(
            model=MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Topic Error: {e}")
        return {"topic": "エラーが発生しました。お題が出せません。"}

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
            model=MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Cards Error: {e}")
        return {"answers": []}

@app.post("/api/judge")
def judge_answer(req: JudgeRequest):
    # 1. ベクトル類似度の計算
    try:
        emb1 = vector_model.encode(req.topic)
        emb2 = vector_model.encode(req.answer)
        similarity = float(util.cos_sim(emb1, emb2).item())
    except Exception:
        similarity = 0.5 # エラー時のデフォルト値

    # 距離感の判定テキスト
    distance_eval = "Normal"
    if 0.4 <= similarity <= 0.6:
        distance_eval = "Sweet Spot (絶妙)"
    elif similarity > 0.8:
        distance_eval = "Too Close (近すぎ)"
    elif similarity < 0.2:
        distance_eval = "Too Far (遠すぎ)"

    # 2. 審査員ペルソナの設定 (JS側と合わせる)
    personas = {
        "strict": "あなたは激辛審査員です。採点は厳しく（基準より低め）、辛辣なコメントをします。",
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
            model=MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        result = json.loads(response.text)
        
        # Python側で計算した類似度を結果に追加
        result["distance"] = similarity
        
        return result
    except Exception as e:
        print(f"Judge Error: {e}")
        # エラー時のフォールバック
        return {
            "comment": "審査中にエラーが起きたみたいやわ...",
            "reasoning": "AIとの通信に失敗しました。",
            "distance": similarity,
            "radar": {"surprise":1, "context":1, "punchline":1, "humor":1, "intelligence":1}
        }

if __name__ == "__main__":
    import uvicorn
    # ローカルサーバー起動用
    uvicorn.run(app, host="0.0.0.0", port=8000)