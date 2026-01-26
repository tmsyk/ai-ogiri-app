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

# --- 計算ロジック: 総合点評価 ---
def calculate_overall_score(radar):
    """
    ユーザー提案の「足切り × 最大火力」ロジックによるスコア計算
    """
    # 0-5点のスコアを取得
    clarity = radar.get('clarity', 0)
    relevance = radar.get('relevance', 0)
    novelty = radar.get('novelty', 0)
    intelligence = radar.get('intelligence', 0)
    empathy = radar.get('empathy', 0)

    # 【A】 必須基盤（足切り用）: 0.0 ~ 1.0
    # どちらかが2点未満なら足切り（係数0）
    if clarity < 2 or relevance < 2:
        return 0
    
    # 基礎係数: 両方5なら1.0。低いと下がる。
    # (例: 3点と3点なら 0.6 * 0.6 = 0.36... これだと厳しすぎるので少し緩和)
    # 平均をとって正規化するアプローチに変更
    base_score = (clarity + relevance) / 10.0 # 最大1.0
    
    # さらに厳しくするなら掛け算にする
    # gate_factor = (clarity / 5.0) * (relevance / 5.0) 

    # 【B/C】 スタイル・増幅因子（最大火力）: 0 ~ 5
    # どれか一つでも突出していればOK
    max_power = max(novelty, intelligence, empathy)
    
    # ボーナス: 突出した項目が4以上ならさらに加点
    bonus = 0
    if max_power >= 4:
        bonus = 1.0
    
    # 総合点計算 (100点満点)
    # (基礎係数) * (最大火力 + ボーナス) を100点スケールにマッピング
    # 例: 基礎(1.0) * (5 + 1) = 6 -> これをどう100点にするか
    
    # シンプルな式:
    # Score = 基礎点(40点) + スタイル点(60点)
    # 基礎点 = gate_factor * 40
    # スタイル点 = (max_power / 5.0) * 60
    
    score = (base_score * 40) + ((max_power / 5.0) * 60)
    
    # インテリ/シュールなどのコンボボーナス（相性の良い組み合わせなら加点）
    # 例: 新規性と知性が両方高い
    if novelty >= 4 and intelligence >= 4:
        score += 5
    # 例: 共感性と明瞭性が高い
    if empathy >= 4 and clarity >= 4:
        score += 5

    return int(min(100, score))

# --- Watashihaモデル用関数 ---
def generate_by_watashiha(prompt):
    if not HF_API_KEY:
        return None
    API_URL = "https://api-inference.huggingface.co/models/watashiha/watashiha-gpt-6b"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {
        "inputs": f"大喜利のお題：{prompt}\n面白い回答：",
        "parameters": {"max_new_tokens": 20, "temperature": 0.9, "return_full_text": False, "stop": ["\n", "。"]}
    }
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=3)
        output = response.json()
        if isinstance(output, list) and len(output) > 0 and "generated_text" in output[0]:
            text = output[0]["generated_text"].strip().replace("回答：", "")
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

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server (High-Precision Scoring)"}

@app.post("/api/watashiha")
def generate_joke(req: WatashihaRequest):
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
    
    # 1. Watashihaモデル回答例 (参考用)
    ai_example = generate_by_watashiha(req.topic) or "..."

    # 2. Python側での計算（認知的距離：ベクトル類似度）
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
        
        # 距離感判定 (0.4-0.6がSweet Spot)
        if 0.4 <= similarity <= 0.6: distance_eval = "Sweet Spot"
        elif similarity > 0.8: distance_eval = "Too Close"
        elif similarity < 0.2: distance_eval = "Too Far"
        else: distance_eval = "Normal"

    except Exception as e:
        print(f"Calc Error: {e}")

    # 3. 審査員ペルソナ & プロンプト構築
    feedback_text = ""
    if req.feedback_logs:
        logs = "\n".join(req.feedback_logs[:5])
        feedback_text = f"[ユーザーの好み]\n{logs}"

    # 言語的硬さ（テクスチャ）の判定基準
    texture_guide = """
    回答の単語が持つ『硬さ（語感）』を以下から判定せよ。
    - [硬]: 漢語、行政・法律・科学用語、事務的 (例: 施工, 概念, デフォルト)
    - [軟]: 和語、日常語、感情語、幼児語 (例: ふわふわ, おやつ, 薔薇)
    - [外]: カタカナ語、ビジネス用語 (例: アジェンダ, ソリューション)
    """

    prompt = f"""
    あなたは『名詞限定大喜利』の辛口審査員です。
    以下の手順で評価を行い、JSONで出力してください。
    {feedback_text}

    [お題]: {req.topic}
    [回答]: {req.answer}
    [参考データ]: ベクトル類似度は {similarity:.4f} ({distance_eval}) です。

    # 手順
    1. 【語種判定】: {texture_guide} に基づき判定し、hardnessを数値化せよ(軟=0.0, 外=0.5, 硬=1.0)。
    2. 【足切り判定】: 「clarity(明瞭性)」と「relevance(関連性)」を評価。これが低い（2点未満）場合は容赦なく低評価にせよ。
       ※relevanceはベクトル類似度だけでなく、文脈的つながり（因果関係など）があれば高く評価してよい。
    3. 【加点評価】: 「novelty(新規性)」「intelligence(知性)」「empathy(共感性)」を評価。
       - 全てが高得点である必要はない。どれか一つでも突出していれば高評価。
       - 例: ベタなあるあるネタならempathy=5, novelty=1。シュールならnovelty=5, empathy=1。

    # 出力フォーマット (JSON)
    {{
        "word_texture": "[硬/軟/外]",
        "hardness": 0.0〜1.0,
        "scores": {{
            "novelty": 0-5, 
            "clarity": 0-5, 
            "relevance": 0-5, 
            "intelligence": 0-5, 
            "empathy": 0-5
        }},
        "comment": "言葉の質感(硬/軟)とお題とのギャップに触れたツッコミ",
        "reasoning": "なぜこの点数なのか、不突合と解決のロジックから1文で解説"
    }}
    """

    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        result = json.loads(response.text)
        
        # スコア計算はPython側で行う
        scores = result.get("scores", {})
        radar = {
            "novelty": scores.get("novelty", 0),
            "clarity": scores.get("clarity", 0),
            "relevance": scores.get("relevance", 0),
            "intelligence": scores.get("intelligence", 0),
            "empathy": scores.get("empathy", 0)
        }
        
        final_score = calculate_overall_score(radar)
        
        response_data = {
            "score": final_score,
            "comment": result.get("comment", ""),
            "reasoning": result.get("reasoning", ""),
            "word_texture": result.get("word_texture", "不明"),
            "hardness": result.get("hardness", 0.5),
            "radar": radar,
            "distance": similarity,
            "ai_example": ai_example
        }
        return response_data

    except Exception as e:
        print(f"Judge Error: {e}")
        return {
            "score": 0,
            "comment": "採点不能...",
            "reasoning": "エラー",
            "distance": similarity,
            "radar": {"novelty":0,"clarity":0,"relevance":0,"intelligence":0,"empathy":0}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)