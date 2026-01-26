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
import unicodedata

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

# --- 計算ロジック: 言語的距離（言葉の硬さ） ---
def calc_linguistic_hardness(text):
    """
    文字列の「硬さ」を判定する。
    漢字が多いほど硬く(1.0に近い)、ひらがな・カタカナが多いほど軟らかい(0.0に近い)。
    """
    if not text: return 0.0
    
    # 評価対象とする文字数（記号などを除く）
    valid_chars = [c for c in text if unicodedata.category(c) != 'Po']
    if not valid_chars: return 0.0
    
    length = len(valid_chars)
    kanji_count = 0
    
    for c in valid_chars:
        name = unicodedata.name(c, '')
        # 漢字の判定
        if 'CJK UNIFIED IDEOGRAPH' in name:
            kanji_count += 1
            
    # 漢字率 (0.0 ~ 1.0)
    hardness = kanji_count / length
    
    # 四字熟語ボーナス（4文字で全て漢字なら硬度MAX）
    if length == 4 and kanji_count == 4:
        hardness = 1.0
        
    return hardness

# --- Watashihaモデル用関数 ---
def generate_by_watashiha(prompt):
    if not HF_API_KEY:
        return None
    
    API_URL = "https://api-inference.huggingface.co/models/watashiha/watashiha-gpt-6b"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    
    payload = {
        "inputs": f"大喜利のお題：{prompt}\n面白い回答：",
        "parameters": {
            "max_new_tokens": 20, # 短く
            "temperature": 0.9,   # ランダム性を高く
            "return_full_text": False,
            "stop": ["\n", "。"]  # 一言で止める
        }
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=5) # タイムアウト設定
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

def calculate_overall_score(radar):
    """
    ユーザー提示の総合判定アルゴリズム
    Overall = (Clarity * Relevance) * Max(Novelty, Intelligence, Empathy)
    ※ 各項目は0-5点とし、計算のために0.0-1.0に正規化してから計算し、最後に100点満点に戻す
    """
    # 0-5点のスコアを取得
    clarity = radar.get('clarity', 0)
    relevance = radar.get('relevance', 0)
    novelty = radar.get('novelty', 0)
    intelligence = radar.get('intelligence', 0)
    empathy = radar.get('empathy', 0)

    # 必須項目（足切り係数）: 0.0 ~ 1.0
    # 5点満点なので /5 する。さらに厳しめにするなら2乗するなど調整可
    # gate_factor = (clarity / 5.0) * (relevance / 5.0) 
    # 少し緩和: 両方5なら1.0。片方1なら0.2になる
    gate_factor = (clarity / 5.0) * (relevance / 5.0)

    # 特化項目（最大火力）: 0 ~ 100点
    # いずれか一つでも5点なら100点満点のポテンシャル
    max_power = max(novelty, intelligence, empathy)
    # 5点満点を100点満点スケールに変換
    power_score = (max_power / 5.0) * 100

    # 総合点
    overall = gate_factor * power_score
    
    return int(overall)

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server (Noun Anchor Theory Edition)"}

@app.post("/api/watashiha")
def generate_joke(req: WatashihaRequest):
    # 直接呼び出し用エンドポイント
    answer = generate_by_watashiha(req.topic)
    if answer: return {"answer": answer}
    else: return {"answer": "（思いつかなかった...）"}

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
    hardness = 0.0

    # 1. Watashihaモデルによる回答例生成（参考）
    ai_example = generate_by_watashiha(req.topic)
    if not ai_example: ai_example = "（考え中...）"

    # 2. Python側での計算（言語的距離 & 認知的距離）
    try:
        # 言語的距離（硬さ）の計算
        hardness = calc_linguistic_hardness(req.answer)
        
        # 認知的距離（ベクトル類似度）の計算
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
        
        # 類似度(Similarity)から距離(Distance)への変換イメージ
        # Sim 1.0 (近い) -> Dist 0.0
        # Sim 0.0 (遠い) -> Dist 1.0
        # Sweet Spot (Sim 0.4~0.6)
        
        if 0.4 <= similarity <= 0.6: distance_eval = "Sweet Spot (絶妙)"
        elif similarity > 0.8: distance_eval = "Too Close (近すぎ/Anchor)"
        elif similarity < 0.2: distance_eval = "Too Far (遠すぎ/Leap)"
        else: distance_eval = "Normal"

    except Exception as e:
        print(f"Calc Error: {e}")

    # 3. 審査員プロンプト構築
    feedback_text = ""
    if req.feedback_logs:
        logs = "\n".join(req.feedback_logs[:5])
        feedback_text = f"[ユーザーの好み]\n{logs}"

    # ヒント情報の構築
    hints = {
        "linguistic_hardness": f"{hardness:.2f} (1.0に近いほど硬い/漢字多)",
        "semantic_distance_val": f"{similarity:.4f} (1.0に近いほど意味が近い)",
        "distance_judgment": distance_eval
    }

    prompt = f"""
    あなたは『名詞限定大喜利』の辛口審査員です。
    入力された【距離データ】と【名詞回答】に基づき、5つの評価基準(0-5点)で厳密に採点してください。
    {feedback_text}

    [お題]: {req.topic}
    [回答]: {req.answer}
    [距離データ(Hints)]: {json.dumps(hints, ensure_ascii=False)}

    # 評価ロジック
    1. 足切り (Gatekeeper):
       - 「clarity(明瞭性)」や「relevance(関連性)」が低い場合、他が高くても総合点は低くなります。
       - 特に「relevance」は、ベクトル類似度が低くても(遠くても)、文脈や音で隠れたロジックが成立していれば高得点を与えてください。
    
    2. 加点ルート (Winning Styles):
       - A. シュール型: 距離が遠い(similarity低)が、novelty(新規性)が高い。
       - B. インテリ型: 言語的距離(hardness)のギャップがあり、intelligence(知性)が高い。
       - C. 共感型: 距離が近い(similarity高)が、empathy(共感性)が高い。

    # 出力フォーマット
    JSONで出力してください。
    {{
        "scores": {{
            "novelty": 0-5, "clarity": 0-5, "relevance": 0-5, 
            "intelligence": 0-5, "empathy": 0-5
        }},
        "comment": "距離と質に触れた辛口コメント",
        "reasoning": "なぜこの点数なのか、不突合と解決のロジックから1文で解説"
    }}
    """

    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        result = json.loads(response.text)
        
        # 4. 総合点の計算 (Python側で厳密に実施)
        scores = result.get("scores", {})
        # キー名の揺らぎ補正（念のため）
        radar = {
            "novelty": scores.get("novelty", 0),
            "clarity": scores.get("clarity", 0),
            "relevance": scores.get("relevance", 0),
            "intelligence": scores.get("intelligence", 0),
            "empathy": scores.get("empathy", 0)
        }
        
        final_score = calculate_overall_score(radar)
        
        # レスポンス構築
        response_data = {
            "score": final_score,
            "comment": result.get("comment", "ノーコメント"),
            "reasoning": result.get("reasoning", ""),
            "radar": radar,
            "distance": similarity,
            "hardness": hardness,
            "ai_example": ai_example
        }
        
        return response_data

    except Exception as e:
        print(f"Judge Error: {e}")
        return {
            "score": 0,
            "comment": "審査中にエラーが発生しました。",
            "reasoning": "通信エラー",
            "distance": similarity,
            "radar": {"novelty":0,"clarity":0,"relevance":0,"intelligence":0,"empathy":0}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)