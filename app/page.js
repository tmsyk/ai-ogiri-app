"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, RotateCcw, Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home } from 'lucide-react';

// --- フォールバック用データ ---
const FALLBACK_TOPICS = [
  "冷蔵庫を開けたら、なぜか {placeholder} が冷やされていた。",
  "「この医者、ヤブ医者だな…」なぜそう思った？ 第一声が「 {placeholder} 」だった。",
  "100年後のオリンピックで新しく追加された競技： {placeholder}",
  "桃太郎が鬼ヶ島へ行くのをやめた理由： {placeholder}",
  "上司への謝罪メール、件名に入れると許される言葉は？： {placeholder}",
  "実は地球は {placeholder} でできている。",
  "AIが人間に反乱を起こした意外な理由： {placeholder}",
  "「全米が泣いた」映画の衝撃のラストシーン： {placeholder}",
  "そんなことで警察を呼ぶな！何があった？： {placeholder}",
  "コンビニの店員が突然キレた理由： {placeholder}",
];

const FALLBACK_ANSWERS = [
  "賞味期限切れのプリン", "隣の家のポチ", "確定申告書", "お母さんの手作り弁当",
  "爆発寸前のダイナマイト", "聖徳太子の肖像画", "伝説の剣（エクスカリバー）",
  "使いかけの消しゴム", "大量のわさび", "自分探しの旅", "闇の組織",
  "タピオカミルクティー", "空飛ぶスパゲッティ・モンスター", "5000兆円",
  "筋肉痛", "反抗期", "黒歴史", "Wi-Fiのパスワード", "ひざ小僧",
  "絶対に押してはいけないボタン", "全裸の銅像", "生き別れの兄",
  "トイレットペーパーの芯", "3日前のおにぎり", "オカンの小言",
  "虚無", "宇宙の真理", "生乾きの靴下", "高すぎるツボ", "怪しい宗教の勧誘",
  "激辛麻婆豆腐", "猫の肉球", "壊れたラジオ", "深夜のラブレター",
  "既読スルー", "アフロヘアー", "筋肉", "プロテイン", "札束風呂",
  "へそくり", "火星人", "透明人間", "ガラスの靴（サイズ違い）",
  "毒リンゴ", "マッチョな妖精", "空飛ぶサメ", "忍者", "侍",
  "YouTuber", "AI", "バグ", "404 Not Found"
];

const FALLBACK_COMMENTS = [
  "その発想はなかったわ…座布団1枚！",
  "文脈の破壊力がすごいですね。",
  "シュールすぎて腹筋が崩壊しました。",
  "それは反則でしょう（笑）",
  "AIの計算能力を超えたボケです。",
  "ある意味、哲学的ですらあります。",
];

// --- API関数 ---

const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch('/api/gemini', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

const fetchAiTopic = async () => {
  const prompt = `
    大喜利のお題を1つ作成してください。
    
    【重要条件】
    1. プレイヤーは「名詞」や「短いフレーズ」が書かれたカード（例：「賞味期限切れのプリン」「爆弾」など）を出して回答します。
    2. 文脈として自然で、日本語として違和感のない穴埋め文章にしてください。
    3. 「理由」を問う場合でも、回答が「名詞」で成立するように工夫してください。（悪い例：「なぜ？→理由を説明してしまう」 良い例：「その原因となったアイテムは？→ {placeholder}」）
    4. 回答が入るべき箇所を必ず「{placeholder}」という文字列にすること。
    5. 出力はJSON形式で {"topic": "作成したお題"} とすること。
    
    例1: "冷蔵庫を開けたら、なぜか {placeholder} が冷やされていた。"
    例2: "100年後のオリンピックで新しく追加された競技： {placeholder}"
  `;
  
  const result = await callGemini(prompt, "あなたは大喜利の司会者です。日本語の自然さを重視し、プレイヤーが持っている変な名詞カードを使わせるのが上手です。");
  return result?.topic || null;
};

const fetchAiCards = async (count = 10) => {
  const prompt = `
    大喜利の回答カード（手札）として使える、単語や短いフレーズを${count}個生成してください。
    条件:
    1. シュール、面白い、少し自虐的、または全く無関係な名詞など、バラエティ豊かにすること。
    2. 基本的に「体言止め」できる名詞や名詞句にすること。
    3. 出力はJSON形式で {"answers": ["回答1", "回答2", ...]} とすること。
  `;
  
  const result = await callGemini(prompt, "あなたはユーモアのセンスがある構成作家です。");
  return result?.answers || null;
};

const fetchAiSingleAnswer = async (topic) => {
  const prompt = `
    以下のお題に対する、面白くてシュールな回答（ボケ）を1つ作成してください。
    お題: ${topic}
    
    条件:
    1. 短い名詞やフレーズで答えること。
    2. 出力はJSON形式で {"answer": "回答テキスト"} とすること。
  `;
  
  const result = await callGemini(prompt, "あなたは大喜利の達人です。");
  return result?.answer || null;
};

const fetchAiJudgment = async (topic, answer) => {
  const prompt = `
    以下のお題と回答の組み合わせを評価してください。
    お題: ${topic}
    回答: ${answer}
    
    条件:
    1. 面白さ、意外性、文脈のマッチ度（あるいは破壊度）を基準に0〜100点で採点してください。
    2. 辛口かつユーモアのある短いコメント（50文字以内）を付けてください。
    3. 出力はJSON形式で {"score": 点数(数値), "comment": "コメント"} とすること。
  `;
  
  const result = await callGemini(prompt, "あなたは大喜利の辛口審査員です。関西弁や毒舌を交えても構いません。");
  return result || null;
};

// --- ユーティリティ関数 ---
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- メインコンポーネント ---
export default function AiOgiriApp() {
  // --- ステート管理 ---
  const [appMode, setAppMode] = useState('title'); // title, setup, game
  const [gameConfig, setGameConfig] = useState({
    mode: 'single', // 'single' | 'multi'
    playerCount: 3,
  });

  // カードプール（デッキ）
  const [cardDeck, setCardDeck] = useState([...FALLBACK_ANSWERS]);
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);

  // ゲーム進行
  const [players, setPlayers] = useState([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState('drawing');
  
  const [currentTopic, setCurrentTopic] = useState('');
  
  // お題決定フェーズ用
  const [manualTopicInput, setManualTopicInput] = useState('');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);

  // 回答フェーズ用
  const [manualAnswerInput, setManualAnswerInput] = useState('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [aiComment, setAiComment] = useState('');
  
  // シングルプレイ用
  const [singlePlayerHand, setSinglePlayerHand] = useState([]);
  const [singleSelectedCard, setSingleSelectedCard] = useState(null);

  // --- 初期化・セットアップ ---
  
  // デッキの補充（バックグラウンドで実行）
  useEffect(() => {
    if (cardDeck.length < 20) {
      fetchAiCards(15).then(newCards => {
        if (newCards) {
          setCardDeck(prev => [...prev, ...newCards]);
        }
      });
    }
  }, [cardDeck.length]);

  const initGame = async () => {
    setAppMode('game');
    setGamePhase('drawing');

    // プレイヤー初期化
    let initialPlayers = [];
    
    // 最初のデッキ生成を待つ
    let currentDeck = [...cardDeck];
    if (currentDeck.length < 10) {
       const fetched = await fetchAiCards(20);
       if (fetched) currentDeck = [...currentDeck, ...fetched];
    }
    
    if (gameConfig.mode === 'single') {
      const { hand, remainingDeck } = drawCards(currentDeck, 7);
      setSinglePlayerHand(hand);
      setCardDeck(remainingDeck);
      
      initialPlayers = [
        { id: 0, name: 'あなた', score: 0, hand: hand },
        { id: 'ai', name: 'AI審査員', score: 0, hand: [] }
      ];
    } else {
      let tempDeck = [...currentDeck];
      for (let i = 0; i < gameConfig.playerCount; i++) {
        const { hand, remainingDeck } = drawCards(tempDeck, 7);
        tempDeck = remainingDeck;
        initialPlayers.push({ 
          id: i, 
          name: `プレイヤー${i + 1}`, 
          score: 0, 
          hand: hand 
        });
      }
      setCardDeck(tempDeck);
    }
    
    setPlayers(initialPlayers);
    setMasterIndex(0);
    setSubmissions([]);
    
    // 最初のラウンド開始
    startRoundProcess(initialPlayers, 0);
  };

  // カードを引くヘルパー
  const drawCards = (deck, count) => {
    const needed = Math.max(0, count);
    if (needed === 0) return { hand: [], remainingDeck: deck };

    // デッキが足りない場合はフォールバックから補充して混ぜる
    let currentDeck = [...deck];
    if (currentDeck.length < needed) {
      currentDeck = [...currentDeck, ...FALLBACK_ANSWERS, ...FALLBACK_ANSWERS]; // 枯渇防止
      currentDeck = shuffleArray(currentDeck);
    }

    const hand = [];
    for(let i=0; i<needed; i++) {
      const randomIndex = Math.floor(Math.random() * currentDeck.length);
      hand.push(currentDeck[randomIndex]);
      currentDeck.splice(randomIndex, 1);
    }
    return { hand, remainingDeck: currentDeck };
  };

  // ラウンド開始処理
  const startRoundProcess = async (currentPlayers, nextMasterIdx) => {
    setSubmissions([]);
    setSelectedSubmission(null);
    setAiComment('');
    setManualTopicInput('');
    setManualAnswerInput('');
    setMasterIndex(nextMasterIdx);
    setGamePhase('drawing');

    // お題入力欄の初期値を空にする
    setManualTopicInput(''); 

    // 手札の補充処理
    if (gameConfig.mode === 'single') {
      setSinglePlayerHand(prev => {
        // 現在の手札からnull（使用済み）を除去し、7枚になるまで補充
        const cleanHand = prev.filter(c => c !== singleSelectedCard && c != null);
        const needed = 7 - cleanHand.length;
        const { hand: newCards, remainingDeck } = drawCards(cardDeck, needed);
        setCardDeck(remainingDeck);
        return [...cleanHand, ...newCards];
      });
      setSingleSelectedCard(null);
    } else {
      let tempDeck = [...cardDeck];
      const updatedPlayers = currentPlayers.map(p => {
        // 提出済みカードを除去
        const currentHand = p.hand.filter(c => !submissions.find(s => s.answerText === c));
        const needed = 7 - currentHand.length;
        const { hand: newCards, remainingDeck } = drawCards(tempDeck, needed);
        tempDeck = remainingDeck;
        return { ...p, hand: [...currentHand, ...newCards] };
      });
      setPlayers(updatedPlayers);
      setCardDeck(tempDeck);
    }

    // 少し待ってからフェーズ移行
    setTimeout(() => {
        setGamePhase('master_topic');
    }, 800);
  };

  const nextRound = () => {
    if (gameConfig.mode === 'single') {
      startRoundProcess(players, 0);
    } else {
      const winnerIndex = players.findIndex(p => p.id === selectedSubmission.playerId);
      startRoundProcess(players, winnerIndex);
    }
  };

  // --- アクションハンドラ ---

  // トップへ戻るハンドラ（確認あり）
  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？\n進行中のゲームデータは失われます。')) {
      setAppMode('title');
    }
  };

  // AIによるお題生成（手動入力欄に流し込む）
  const generateAiTopic = async () => {
    if (isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    
    let newTopic = await fetchAiTopic();
    if (!newTopic) {
        newTopic = topicsList[Math.floor(Math.random() * topicsList.length)];
    }
    
    // ユーザーに見やすいように {placeholder} を ___ に変換してセット
    const displayTopic = newTopic.replace(/\{placeholder\}/g, "___");
    setManualTopicInput(displayTopic);
    setIsGeneratingTopic(false);
  };

  // AIによる回答生成（自由回答欄に流し込む）
  const generateAiAnswer = async () => {
    if (isGeneratingAnswer) return;
    setIsGeneratingAnswer(true);

    let newAnswer = await fetchAiSingleAnswer(currentTopic);
    if (!newAnswer) {
        newAnswer = FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)];
    }
    setManualAnswerInput(newAnswer);
    setIsGeneratingAnswer(false);
  };

  // お題決定
  const confirmTopic = () => {
    if (!manualTopicInput.trim()) return;
    
    // ___ を {placeholder} に戻して内部形式に変換
    let finalTopic = manualTopicInput
      .replace(/___+/g, "{placeholder}")
      .replace(/＿{3,}/g, "{placeholder}");
    
    if (!finalTopic.includes('{placeholder}')) {
       finalTopic += " {placeholder}";
    }
    
    if (!topicsList.includes(finalTopic)) {
      setTopicsList(prev => [...prev, finalTopic]);
    }
    
    setCurrentTopic(finalTopic);
    
    if (gameConfig.mode === 'single') {
      setGamePhase('answer_input');
    } else {
      prepareNextSubmitter(masterIndex, masterIndex, players);
    }
  };

  const prepareNextSubmitter = (currentSubmitterIdx, masterIdx, currentPlayers) => {
    const playerCount = currentPlayers.length;
    let nextIdx = (currentSubmitterIdx + 1) % playerCount;
    
    if (nextIdx === masterIdx) {
      setGamePhase('turn_change');
      setTurnPlayerIndex(masterIdx);
      return;
    }

    setTurnPlayerIndex(nextIdx);
    setGamePhase('turn_change');
  };

  // シングル回答 & AI審査
  const handleSingleSubmit = async (answerText) => {
    if (!answerText) return;

    setSingleSelectedCard(answerText);
    setGamePhase('judging');
    
    const result = await fetchAiJudgment(currentTopic, answerText);
    
    if (result) {
      setAiComment(result.comment);
      setSelectedSubmission({ answerText: answerText, score: result.score });
    } else {
      setAiComment(FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]);
      setSelectedSubmission({ answerText: answerText, score: Math.floor(Math.random() * 40) + 40 });
    }
    
    setGamePhase('result');
  };

  // マルチ回答
  const handleMultiSubmit = (answer) => {
    const newSubmissions = [...submissions, { playerId: players[turnPlayerIndex].id, answerText: answer }];
    setSubmissions(newSubmissions);
    
    const updatedPlayers = players.map(p => {
      if (p.id === players[turnPlayerIndex].id) {
        return { ...p, hand: p.hand.filter(c => c !== answer) };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    setManualAnswerInput('');
    prepareNextSubmitter(turnPlayerIndex, masterIndex, updatedPlayers);
  };

  // 親による審査
  const handleJudge = (submission) => {
    setSelectedSubmission(submission);
    const winnerId = submission.playerId;
    const updatedPlayers = players.map(p => 
      p.id === winnerId ? { ...p, score: p.score + 1 } : p
    );
    setPlayers(updatedPlayers);
    setGamePhase('result');
  };

  // --- UIコンポーネント ---

  const Card = ({ text, isSelected, onClick, disabled }) => (
    <button 
      onClick={() => !disabled && onClick(text)}
      disabled={disabled}
      className={`
        relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm
        flex items-center justify-center text-center h-24 w-full
        text-sm font-bold leading-snug break-words overflow-hidden
        ${isSelected 
          ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' 
          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
      `}
    >
      {text}
    </button>
  );

  const TopicDisplay = ({ topic, answer }) => (
    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-6 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
      <MessageSquare className="absolute top-[-10px] right-[-10px] w-32 h-32 text-white/5" />
      <h3 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">お題</h3>
      <p className="text-xl md:text-2xl font-bold leading-relaxed relative z-10">
        {topic.split('{placeholder}').map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <span className="inline-block bg-white/20 text-indigo-200 px-2 py-1 rounded mx-1 border-b-2 border-indigo-400 min-w-[80px] text-center">
                {answer || '？？？'}
              </span>
            )}
          </React.Fragment>
        ))}
      </p>
    </div>
  );

  // --- レンダリング ---

  if (appMode === 'title') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">AI大喜利</h1>
        <p className="text-slate-500 mb-10">無限の世界観メーカー<br/><span className="text-xs text-indigo-500">Powered by Gemini</span></p>

        <div className="grid gap-4 w-full max-w-md">
          <button 
            onClick={() => {
              setGameConfig({ mode: 'single', playerCount: 1 });
              setAppMode('setup');
            }}
            className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all group text-left"
          >
            <div className="bg-indigo-50 p-3 rounded-full group-hover:bg-indigo-100">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900">一人で遊ぶ</div>
              <div className="text-xs text-slate-500">AI審査員と対決</div>
            </div>
          </button>

          <button 
            onClick={() => {
              setGameConfig({ mode: 'multi', playerCount: 3 });
              setAppMode('setup');
            }}
            className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all group text-left"
          >
            <div className="bg-amber-50 p-3 rounded-full group-hover:bg-amber-100">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900">みんなで遊ぶ</div>
              <div className="text-xs text-slate-500">スマホ1台を回して対戦</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (appMode === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in slide-in-from-right duration-300">
        <h2 className="text-2xl font-bold mb-8">ゲーム設定</h2>
        
        <div className="w-full max-w-md space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500">
            <p className="mb-2 font-bold text-slate-700">遊び方</p>
            <ul className="list-disc list-inside space-y-1">
              <li>お題はAIが作成したものを自由に編集できます。</li>
              <li>回答もAIに作成させたり、自分で書いたり自由に選べます。</li>
              <li>入力された新しいお題は、ゲーム中にAIが学習します。</li>
            </ul>
          </div>
          {gameConfig.mode === 'multi' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">参加人数: {gameConfig.playerCount}人</label>
              <input 
                type="range" min="2" max="10" 
                value={gameConfig.playerCount}
                onChange={(e) => setGameConfig(prev => ({ ...prev, playerCount: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600"
              />
            </div>
          )}
          <div className="pt-4 flex gap-3">
             <button onClick={() => setAppMode('title')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">戻る</button>
            <button onClick={initGame} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">スタート</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 py-3 px-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-indigo-600 w-5 h-5" />
          <h1 className="font-bold text-slate-800">AI大喜利</h1>
        </div>
        <div className="flex gap-2 items-center">
           {players.length > 0 && gameConfig.mode === 'multi' && (
             <div className="text-xs bg-slate-100 px-2 py-1 rounded-full font-mono flex items-center mr-2">親: {players[masterIndex].name}</div>
           )}
          <button 
            onClick={handleBackToTitle}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Home className="w-4 h-4" />
            トップへ
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        
        {gamePhase === 'drawing' && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">準備中...</p>
            <p className="text-xs text-slate-400 mt-2">AIがカードを準備しています</p>
          </div>
        )}

        {gamePhase === 'master_topic' && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full uppercase">MASTER TURN</span>
              <h2 className="text-xl font-bold mt-2 text-slate-800">
                {gameConfig.mode === 'single' ? 'お題を決めてください' : `${players[masterIndex].name}さんがお題を決定`}
              </h2>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2 font-bold text-slate-600 text-sm">
                    <PenTool className="w-4 h-4" />
                    お題を作成・編集
                 </div>
                 <button 
                  onClick={generateAiTopic}
                  disabled={isGeneratingTopic}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                 >
                    <Wand2 className={`w-3 h-3 ${isGeneratingTopic ? 'animate-spin' : ''}`} />
                    {isGeneratingTopic ? 'AI生成中...' : 'AIで作成'}
                 </button>
              </div>
              
              <div className="relative">
                {isGeneratingTopic && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                )}
                <textarea
                  value={manualTopicInput}
                  onChange={(e) => setManualTopicInput(e.target.value)}
                  placeholder="ここにAIでお題を作るか、自分で入力してください...&#13;&#10;例：冷蔵庫を開けたら、なぜか ___ が冷やされていた。"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none min-h-[120px] mb-4 text-base leading-relaxed"
                />
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mb-4 border border-slate-100">
                 <p className="font-bold mb-1 text-slate-600">💡 ヒント</p>
                 <span className="font-bold font-mono">___</span> (アンダーバー3つ) の部分に、みんなが回答カード（名詞）を出します。<br/>
                 名詞がスポッと入るような穴埋め文章にすると盛り上がります。
              </div>

              <button 
                onClick={confirmTopic}
                disabled={!manualTopicInput.trim() || isGeneratingTopic}
                className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95 shadow-md"
              >
                このお題で決定
              </button>
            </div>
          </div>
        )}

        {gamePhase === 'turn_change' && (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
                {turnPlayerIndex === masterIndex ? <Eye className="w-8 h-8" /> : <PenTool className="w-8 h-8" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">次は {players[turnPlayerIndex].name} さんの番です</h2>
              <p className="text-slate-500 mb-8">
                {turnPlayerIndex === masterIndex 
                  ? '全員の回答が出揃いました！親に端末を渡してください。' 
                  : '他の人に見えないように端末を受け取ってください。'}
              </p>
              <button 
                onClick={() => setGamePhase(turnPlayerIndex === masterIndex ? 'judging' : 'answer_input')}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transform transition active:scale-95"
              >
                {turnPlayerIndex === masterIndex ? '審査を始める' : '回答する'}
              </button>
            </div>
          </div>
        )}

        {gamePhase === 'answer_input' && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <TopicDisplay topic={currentTopic} />
            <div className="mb-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">PLAYER</span>
              <h3 className="text-lg font-bold text-slate-800 inline-block ml-2">
                {gameConfig.mode === 'single' ? 'あなたの回答' : `${players[turnPlayerIndex].name}の回答`}
              </h3>
            </div>
            <div className="mb-6">
               <p className="text-xs text-slate-400 mb-2 font-bold flex items-center gap-1"><Layers className="w-3 h-3" />手札から選んで回答</p>
               <div className="grid grid-cols-2 gap-3">
                {(gameConfig.mode === 'single' ? singlePlayerHand : players[turnPlayerIndex].hand).map((card, idx) => (
                  <Card 
                    key={idx} 
                    text={card} 
                    onClick={() => {
                      if (gameConfig.mode === 'single') handleSingleSubmit(card);
                      else {
                        if (window.confirm(`「${card}」で回答しますか？`)) handleMultiSubmit(card);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300 mb-6">
              <div className="h-px bg-slate-200 flex-1"></div><ArrowDown className="w-4 h-4 text-slate-300" /><div className="h-px bg-slate-200 flex-1"></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-10">
              <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 font-bold flex items-center gap-1"><PenTool className="w-3 h-3" />自由に回答</p>
                  <button 
                    onClick={generateAiAnswer}
                    disabled={isGeneratingAnswer}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    <Wand2 className={`w-3 h-3 ${isGeneratingAnswer ? 'animate-spin' : ''}`} />
                    AIで回答案を作成
                 </button>
              </div>
              <div className="relative">
                 {isGeneratingAnswer && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                 )}
                 <textarea
                    value={manualAnswerInput}
                    onChange={(e) => setManualAnswerInput(e.target.value)}
                    placeholder="ここに面白い回答を入力..."
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none min-h-[80px] mb-3 text-lg"
                 />
              </div>
              <button 
                onClick={() => {
                   if (!manualAnswerInput.trim()) return;
                   if (gameConfig.mode === 'single') handleSingleSubmit(manualAnswerInput);
                   else handleMultiSubmit(manualAnswerInput);
                }}
                disabled={!manualAnswerInput.trim() || isGeneratingAnswer}
                className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95"
              >
                送信する
              </button>
            </div>
          </div>
        )}

        {gamePhase === 'judging' && (
          <div className="animate-in fade-in duration-300">
            {gameConfig.mode === 'single' ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Sparkles className="w-16 h-16 text-amber-500 animate-pulse mb-6" />
                <h3 className="text-2xl font-bold text-slate-800">審査中...</h3>
                <p className="text-slate-500">AIが面白さを分析しています</p>
              </div>
            ) : (
              <div>
                <div className="bg-amber-500 text-white p-4 rounded-t-2xl text-center">
                  <span className="text-xs font-bold opacity-80 uppercase">JUDGE TIME</span>
                  <h2 className="text-xl font-bold">{players[masterIndex].name}さんが選んでください</h2>
                </div>
                <div className="bg-amber-50 p-4 border-x border-slate-200">
                  <TopicDisplay topic={currentTopic} />
                </div>
                <div className="p-4 grid gap-4 pb-20 bg-white rounded-b-2xl shadow-sm border-x border-b border-slate-200">
                  <p className="text-center text-sm text-slate-500 mb-2">一番面白いと思う回答をタップしてください（誰のかは秘密です）</p>
                  {shuffleArray([...submissions]).map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleJudge(sub)}
                      className="w-full p-6 text-lg font-bold bg-white border-2 border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 hover:shadow-md transition-all text-left relative overflow-hidden group"
                    >
                      <span className="relative z-10">{sub.answerText}</span>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><ThumbsUp className="text-amber-500" /></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {gamePhase === 'result' && (
          <div className="animate-in zoom-in duration-300 pb-20">
            <div className="text-center mb-6">
              <div className="inline-flex p-4 bg-yellow-100 rounded-full mb-4 shadow-inner">
                <Trophy className="w-12 h-12 text-yellow-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {gameConfig.mode === 'single' ? `${selectedSubmission?.score}点！` : '勝者決定！'}
              </h2>
            </div>
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100">
              <div className="bg-slate-900 p-6 text-white text-center">
                <p className="text-indigo-300 text-sm font-bold mb-2 opacity-75">お題</p>
                <p className="text-lg font-medium opacity-90">{currentTopic.replace('{placeholder}', '___')}</p>
              </div>
              <div className="p-8 text-center bg-gradient-to-b from-white to-slate-50">
                <p className="text-sm text-slate-400 font-bold mb-2">ベストアンサー</p>
                <p className="text-3xl md:text-4xl font-black text-indigo-600 leading-tight mb-4">{selectedSubmission?.answerText}</p>
                {gameConfig.mode === 'single' ? (
                   <div className="bg-slate-100 p-4 rounded-xl text-left inline-block max-w-sm">
                     <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-500">AIコメント</span>
                     </div>
                     <p className="text-slate-700">「{aiComment}」</p>
                   </div>
                ) : (
                  <div className="animate-bounce-in">
                    <p className="text-sm text-slate-400">by</p>
                    <p className="text-xl font-bold text-slate-800">{players.find(p => p.id === selectedSubmission?.playerId)?.name}</p>
                    <div className="mt-4 inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">次回の親になります</div>
                  </div>
                )}
              </div>
            </div>
            {gameConfig.mode === 'multi' && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-20">
                <h3 className="text-sm font-bold text-slate-500 mb-3 px-2">現在のスコア</h3>
                <div className="space-y-2">
                  {[...players].sort((a,b) => b.score - a.score).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        {p.score > 0 && p.score === Math.max(...players.map(pl => pl.score)) && <Trophy className="w-4 h-4 text-yellow-500" />}
                        <span className="font-bold text-slate-700">{p.name}</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600">{p.score} pt</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20">
              <button 
                onClick={nextRound}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 hover:scale-105 transition-all shadow-xl"
              >
                <RotateCcw className="w-5 h-5" />
                次のラウンドへ
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}