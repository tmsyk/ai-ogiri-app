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

# --- スコア計算ロジック（中立版） ---
def calculate_overall_score(radar, distance_multiplier=1.0):
    """
    6次元モデルに基づく総合点計算（中立採点）。
    resonanceはカードプレイで低くなりがちなので、他の5次元より軽めのウェイト。
    AIが「3」をつけた場合に50点前後が出るように調整。
    """
    # 主要5次元 + resonanceは0.7倍のウェイト（カードプレイで低くなりがちなため）
    main_keys = ['linguistic', 'cognitive', 'emotional', 'focus', 'novelty']
    main_values = [radar.get(k, 2) for k in main_keys]
    resonance_val = radar.get('resonance', 2)
    # 重み付けした全値（resonanceは0.7倍）
    values = main_values + [resonance_val * 0.7]

    # 1. 突出度 (Peak): 最も高い要素を評価
    max_val = max(values)
    
    # 2. 平均点 (Average)
    avg_val = sum(values) / len(values)

    # 3. 基礎スコア計算（中立基準: 全部3 → 50点）
    power = (max_val * 0.5) + (avg_val * 0.5)
    raw_score = (power * 18) - 4

    # 4. コンボボーナス（尖った回答への報酬）
    bonus = 0
    high_count = sum(1 for v in values if v >= 4)
    if high_count >= 1: bonus += 3
    if high_count >= 2: bonus += 4
    if high_count >= 3: bonus += 5

    # 5. 意味的距離によるスコア補正
    adjusted = (raw_score + bonus) * distance_multiplier

    # 6. 低評価ペナルティ（全部2以下なら厳しくする）
    if max_val <= 2:
        adjusted = adjusted * 0.8

    final_score = int(adjusted)
    
    # 範囲制限
    return min(100, max(5, final_score))

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
    used_topics: list[str] = []

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
    """意味的距離に基づくスコア倍率。Sweet Spotから離れるほどペナルティ。"""
    if 0.35 <= similarity <= 0.65: return 1.15  # Sweet Spot: ボーナス
    elif 0.25 <= similarity < 0.35 or 0.65 < similarity <= 0.75: return 1.0  # Normal: 等倍
    elif 0.15 <= similarity < 0.25 or 0.75 < similarity <= 0.85: return 0.85  # やや外れ: 軽いペナルティ
    else: return 0.7  # Too Close / Too Far: 強めのペナルティ

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
    
    avoid_text = ""
    if req.used_topics:
        avoid_sample = "\n".join(req.used_topics[-15:])
        avoid_text = f"※以下のお題はすでに使用済みです。これらとは全く異なるお題を作ってください。似たものも不可です:\n{avoid_sample}"
    
    prompt = f"""
    大喜利のお題を１つ作成してください。
    条件: 問いかけ形式（「〜とは？」「〜は？」）。回答は名詞一言でボケられるもの。
    {ref_text}
    {avoid_text}
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
    条件: 1.実在する言葉 2.ジャンルバラバラ 3.既出避け: {', '.join(req.used_cards[-20:])}
    出力JSON: {{"answers": [{{ "text": "..." }}, ... ]}}
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
        "strict": "あなたは激辛審査員です。つまらなければ容赦なく低評価してください。",
        "gal": "あなたはギャル審査員です。",
        "chuuni": "あなたは厨二病審査員です。"
    }
    personality_prompt = personas.get(req.personality, personas["logic"])

    feedback_text = ""
    if req.feedback_logs:
        logs = "\n".join(req.feedback_logs[:5])
        feedback_text = f"[ユーザーの好み]\n{logs}"

    radar_desc = """
    以下の6つの次元(0-5点)で評価してください。各項目は独立して評価し、妥当な点数をつけてください。
    1. linguistic (言語的距離): 言葉の硬度と格式のギャップ。日常語と専門語の落差。
    2. cognitive (認知的距離): カテゴリーの飛躍。お題と回答のジャンルがどれだけ離れているか。
    3. emotional (情動的距離): 聖と俗のギャップ。真面目な場面に俗な回答、またはその逆。
    4. focus (視点・解像度): 具体と抽象のズレ。独自の切り口で捉えているか。
    5. novelty (新規性): アイデアの斬新さ。ありきたりでなく、意外性があるか。
    6. resonance (共感度): 「あるある」「わかる」と思わせる共感力。日常の経験に響くか。
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
    - **中立な採点**: 平均的な回答は3点（50点前後）、優れた回答は4-5点、つまらない回答は1-2点としてください。
    - **お題との関連性**: ランダムな単語ではなく、お題に対して「意外な角度」から刺さっているものを高く評価してください。
    - **シュールさの評価**: 論理的に意味不明でも、視覚的インパクトや独自のセンスがあれば「cognitive」や「novelty」を高く評価してください。ただし、ただの無関係な単語は低く評価してください。
    - **共感の評価**: 「わかる！」「そういうのあるある」と思わせる回答は「resonance」を高くしてください。
    
    出力JSON: {{
        "comment": "15文字程度の鋭いツッコミ",
        "reasoning": "解説",
        "hardness": 0.5,
        "word_texture": "硬/軟/外",
        "radar": {{"linguistic":3, "cognitive":3, "emotional":3, "focus":3, "novelty":3, "resonance":3}}
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
        for key in ["linguistic", "cognitive", "emotional", "focus", "novelty", "resonance"]:
            if key not in radar: radar[key] = 2
            
        # スコア計算（距離倍率を渡す）
        final_score = calculate_overall_score(radar, multiplier)
        
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
            "score": 40, 
            "comment": "採点不能...",
            "reasoning": "通信エラーが発生しました。",
            "distance": similarity,
            "ai_example": ai_example,
            "radar": {"linguistic":2,"cognitive":2,"emotional":2,"focus":2,"novelty":2,"resonance":2}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)