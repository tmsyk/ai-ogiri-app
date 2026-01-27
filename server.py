import os
import sys
import re
import json
import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types

# --- 設定 ---
# 環境変数からAPIキーを取得
API_KEY = os.environ.get("GEMINI_API_KEY")
HF_API_KEY = os.environ.get("HUGGINGFACE_API_KEY")

if not API_KEY:
    print("警告: GEMINI_API_KEYが設定されていません。")

# --- 初期化 ---
app = FastAPI()

# CORS設定: 本番環境では特定のオリジンに絞ることを推奨
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing Gemini Client...")
client = None
GEN_MODEL_NAME = 'gemini-2.0-flash'
EMBED_MODEL_NAME = 'text-embedding-004'

try:
    # google-genai SDK (v1.0+) の初期化
    if API_KEY:
        client = genai.Client(api_key=API_KEY)
        print("Client initialized successfully!")
    else:
        print("Skipping Client init (No API Key)")
except Exception as e:
    print(f"Initialization error: {e}")

# --- ユーティリティ関数（重要: JSONクリーニング） ---
def clean_json_text(text: str) -> str:
    """
    AIの出力からJSON部分のみを抽出・クリーニングする。
    Markdownのコードブロック (```json ... ```) などを除去してパースエラーを防ぐ。
    """
    if not text: return "{}"
    text = text.strip()
    
    # 正規表現: Markdownのコードブロック記法 ```json { ... } ``` を除去
    # 表示崩れを防ぐために文字列を分割して記述
    backticks = "`" * 3
    pattern_block = backticks + r'(?:json)?\s*(\{.*?\})\s*' + backticks
    
    match = re.search(pattern_block, text, re.DOTALL)
    if match:
        return match.group(1)
    
    # 全体を { ... } で検索（コードブロックがない場合）
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1)
        
    return text

def calculate_cosine_similarity(vec1, vec2):
    """コサイン類似度を計算（ゼロ除算対策済み）"""
    if vec1 is None or vec2 is None:
        return 0.5
    try:
        dot_product = np.dot(vec1, vec2)
        norm_a = np.linalg.norm(vec1)
        norm_b = np.linalg.norm(vec2)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)
    except Exception:
        return 0.5

def get_distance_multiplier(similarity):
    """類似度に基づいてスコア補正値を決定"""
    if 0.4 <= similarity <= 0.6: return 1.2  # Sweet Spot
    elif 0.2 < similarity < 0.8: return 1.0  # Normal
    else: return 0.8  # Too Far or Too Close

# --- スコア計算ロジック ---
def calculate_overall_score(radar):
    """
    レーダーチャートの値から総合点（0-100）を計算する。
    """
    novelty = radar.get('novelty', 0)
    clarity = radar.get('clarity', 0)
    relevance = radar.get('relevance', 0)
    intelligence = radar.get('intelligence', 0)
    empathy = radar.get('empathy', 0)

    # 1. 基礎点
    base_avg = (clarity + relevance) / 2.0
    base_factor = 1.0
    if base_avg < 2.0:
        base_factor = 0.5
    elif base_avg < 3.0:
        base_factor = 0.8

    # 2. スタイル点
    max_style = max(novelty, intelligence, empathy)
    avg_style = (novelty + intelligence + empathy) / 3.0
    power_score = max(max_style, avg_style)

    # 3. 総合計算
    raw_score = power_score * 20 * base_factor
    
    # ボーナス
    bonus = 0
    if novelty >= 4 and relevance >= 3: bonus += 5
    if empathy >= 4: bonus += 5
    
    final_score = int(raw_score + bonus)
    return min(100, max(0, final_score))

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
        # タイムアウト対策
        response = requests.post(API_URL, headers=headers, json=payload, timeout=8)
        if response.status_code != 200:
            print(f"Watashiha API Status: {response.status_code}")
            return None
            
        output = response.json()
        if isinstance(output, list) and len(output) > 0 and "generated_text" in output[0]:
            text = output[0]["generated_text"].strip()
            return text if text else None
        return None
    except Exception as e:
        print(f"Watashiha Exception: {e}")
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

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Ogiri Server (Ver 1.0.2 Fixed)"}

@app.post("/api/watashiha")
def generate_joke(req: WatashihaRequest):
    answer = generate_by_watashiha(req.topic)
    if answer:
        return {"answer": answer}
    else:
        # フォールバック: Gemini
        try:
            if not client: raise Exception("Client not init")
            prompt = f"大喜利のお題「{req.topic}」に対して、人間味のある面白いボケ回答を1つ出力してください。回答のみ。"
            res = client.models.generate_content(model=GEN_MODEL_NAME, contents=prompt)
            return {"answer": res.text.strip() + " (Gemini)"}
        except:
            return {"answer": "（思いつかなかった...）"}

@app.post("/api/topic")
def generate_topic(req: TopicRequest):
    if not client:
        return {"topic": "冷蔵庫に入っていた意外なものとは？"}

    ref_text = ""
    if req.reference_topics:
        ref_sample = "\n".join(req.reference_topics[:5])
        ref_text = f"以下はユーザーが高く評価したお題の例です:\n{ref_sample}"

    prompt = f"""
    大喜利のお題を1つ作成してください。
    条件: 
    1. 問いかけ形式（「〜とは？」「〜は？」など）
    2. 回答は名詞一言でボケられるもの
    3. シンプルで誰でもわかる状況設定
    {ref_text}
    JSON出力: {{"topic":"..."}}
    """
    
    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        # JSONクリーニングを適用
        json_text = clean_json_text(response.text)
        return json.loads(json_text)
    except Exception as e:
        print(f"Topic Error: {e}")
        return {"topic": "冷蔵庫に入っていた意外なものとは？"}

@app.post("/api/cards")
def generate_cards(req: CardRequest):
    if not client:
        return {"answers": []}

    prompt = f"""
    大喜利の回答カード（単語・短いフレーズ）を{req.count}個作成。
    条件: 
    1. 実在する言葉
    2. インパクトが強い・変な言葉なら "rarity":"rare"
    3. 既出避け: {', '.join(req.used_cards[-20:])}
    出力JSON: {{"answers": [{{ "text": "...", "rarity": "normal" }}, ... ]}}
    """
    try:
        response = client.models.generate_content(
            model=GEN_MODEL_NAME, contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        json_text = clean_json_text(response.text)
        return json.loads(json_text)
    except Exception as e:
        print(f"Cards Error: {e}")
        return {"answers": []}

@app.post("/api/judge")
def judge_answer(req: JudgeRequest):
    if not client:
        return {"score": 50, "comment": "API設定エラー", "radar": {}}

    similarity = 0.5
    distance_eval = "Unknown"
    multiplier = 1.0
    ai_example = "（考え中...）"
    
    # AI回答生成
    ai_gen = generate_by_watashiha(req.topic)
    if ai_gen:
        ai_example = ai_gen

    # Embedding計算（エラーハンドリング強化）
    try:
        if req.topic and req.answer:
            result_topic = client.models.embed_content(
                model=EMBED_MODEL_NAME, contents=req.topic,
                config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
            )
            result_answer = client.models.embed_content(
                model=EMBED_MODEL_NAME, contents=req.answer,
                config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
            )
            
            # SDK v1.0のレスポンス構造に合わせてembeddingsを取得
            # 注: 環境によっては .embeddings[0].values ではなく .embeddings[0] の場合もあるため安全策をとる
            emb1 = None
            emb2 = None
            
            if hasattr(result_topic, 'embeddings') and result_topic.embeddings:
                emb1 = result_topic.embeddings[0]
                if hasattr(emb1, 'values'): emb1 = emb1.values
                
            if hasattr(result_answer, 'embeddings') and result_answer.embeddings:
                emb2 = result_answer.embeddings[0]
                if hasattr(emb2, 'values'): emb2 = emb2.values

            if emb1 is not None and emb2 is not None:
                similarity = float(calculate_cosine_similarity(emb1, emb2))
                multiplier = get_distance_multiplier(similarity)
            
            if 0.4 <= similarity <= 0.6: distance_eval = "Sweet Spot"
            elif similarity > 0.8: distance_eval = "Too Close"
            elif similarity < 0.2: distance_eval = "Too Far"
            else: distance_eval = "Normal"
            
    except Exception as e:
        print(f"Embedding Error: {e}")
        # 続行する

    # 審査プロンプト
    personas = {
        "logic": "あなたは「名詞アンカー理論」を提唱するお笑い評論家です。",
        "standard": "あなたは関西出身の標準的なお笑い審査員です。",
        "strict": "あなたは毒舌で知られる激辛審査員です。",
        "gal": "あなたはテンションの高いギャル審査員です。",
        "chuuni": "あなたは「闇の炎」に魅入られた厨二病審査員です。"
    }
    personality_prompt = personas.get(req.personality, personas["logic"])

    feedback_text = ""
    if req.feedback_logs:
        logs = "\n".join(req.feedback_logs[:5])
        feedback_text = f"【ユーザーの好み】\n{logs}"

    prompt = f"""
    {personality_prompt}
    {feedback_text}

    以下のお題と回答（名詞）を、「面白さの4次元評価モデル」に基づいて審査してください。

    [お題]: {req.topic}
    [回答]: {req.answer}
    [AI分析]: 類似度 {similarity:.4f} ({distance_eval})

    # 評価基準 (0-5)
    1. 言語的距離(linguistic): 言葉の硬さ。
    2. 認知的距離(cognitive): 意味の距離。
    3. 情動的距離(emotional): ギャップ。
    4. 視点(focus): 着眼点。
    5. 新規性(novelty): ユニークさ。

    # 出力ルール
    - JSONのみ出力
    - commentは審査員のキャラになりきって15文字程度でツッコミ
    
    出力JSON: {{
        "comment": "...",
        "reasoning": "...",
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
        json_text = clean_json_text(response.text)
        result = json.loads(json_text)
        
        radar = result.get("radar", {})
        # キー補完
        for k in ["linguistic", "cognitive", "emotional", "focus", "novelty"]:
            if k not in radar: radar[k] = 2
            
        if "cognitive" in radar:
            radar["cognitive"] = max(0, min(5, round(radar["cognitive"] * multiplier)))
        
        final_score = calculate_overall_score(radar)
        
        return {
            "score": final_score,
            "comment": result.get("comment", "ノーコメント"),
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
            "comment": "AIの脳がショートしました...",
            "reasoning": "通信エラーまたは解析エラー",
            "distance": similarity,
            "ai_example": ai_example,
            "radar": {"linguistic":2,"cognitive":2,"emotional":2,"focus":2,"novelty":2}
        }

if __name__ == "__main__":
    import uvicorn
    # 本番運用時はホストとポートを環境に合わせて調整
    uvicorn.run(app, host="0.0.0.0", port=8000)