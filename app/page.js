"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, RotateCcw, Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, Share2, Copy, Check } from 'lucide-react';

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
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({
    mode: 'single', // 'single' | 'multi'
    playerCount: 3,
  });

  const [isAiActive, setIsAiActive] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isJudging, setIsJudging] = useState(false); // 審査中フラグ
  const [isCheckingTopic, setIsCheckingTopic] = useState(false); // お題チェック中フラグ

  const [cardDeck, setCardDeck] = useState([]);
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);
  const usedCardsRef = useRef(new Set([...FALLBACK_ANSWERS]));

  const [players, setPlayers] = useState([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState('drawing');
  
  const [currentTopic, setCurrentTopic] = useState('');
  const [manualTopicInput, setManualTopicInput] = useState('');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [manualAnswerInput, setManualAnswerInput] = useState('');
  
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [aiComment, setAiComment] = useState('');
  
  const [singlePlayerHand, setSinglePlayerHand] = useState([]);
  const [singleSelectedCard, setSingleSelectedCard] = useState(null);

  // --- API関数 ---
  const callGemini = async (prompt, systemInstruction = "") => {
    if (!isAiActive) return null;

    try {
      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          console.warn("API limit reached or server error. Switching to offline mode.");
          setIsAiActive(false);
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) return null;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      return null;
    }
  };

  const fetchAiTopic = async () => {
    const prompt = `
      大喜利のお題を1つ作成してください。
      【重要条件】
      1. プレイヤーは「名詞」や「短いフレーズ」が書かれたカードを出して回答します。
      2. 文脈として自然で、日本語として違和感のない穴埋め文章にしてください。
      3. 回答が入るべき箇所を必ず「{placeholder}」という文字列にすること。
      4. 出力はJSON形式で {"topic": "作成したお題"} とすること。
      例: "冷蔵庫を開けたら、なぜか {placeholder} が冷やされていた。"
    `;
    const result = await callGemini(prompt, "あなたは大喜利の司会者です。");
    return result?.topic || null;
  };

  // 新規追加: コンテンツの安全性チェック関数
  const checkContentSafety = async (text) => {
    // AIが無効な場合はチェックをスキップして通す（あるいは厳格にするなら弾く）
    if (!isAiActive) return false;

    const prompt = `
      以下のテキストが、公序良俗に反する言葉、差別用語、過度な下ネタ、暴力的な表現、他人を不快にする誹謗中傷を含んでいるか判定してください。
      大喜利のお題として許容できる範囲のユーモアならfalse、明らかに悪意がある・不快なものはtrueとしてください。
      
      テキスト: "${text}"
      
      出力はJSON形式で {"isInappropriate": trueまたはfalse} としてください。
    `;
    
    const result = await callGemini(prompt, "あなたはコンテンツの安全性を判定するAIモデレーターです。");
    return result?.isInappropriate || false;
  };

  const fetchAiCards = async (count = 10) => {
    const prompt = `
      大喜利の回答カード（手札）として使える、単語や短いフレーズを${count}個生成してください。
      条件:
      1. シュール、面白い、少し自虐的、または全く無関係な名詞など、バラエティ豊かにすること。
      2. 毎回必ず違う種類の単語を選ぶこと。既存のありふれた回答は避けること。
      3. 基本的に「体言止め」できる名詞や名詞句にすること。
      4. 出力はJSON形式で {"answers": ["回答1", "回答2", ...]} とすること。
    `;
    const result = await callGemini(prompt, "あなたはユーモアのセンスがある構成作家です。");
    return result?.answers || null;
  };

  const fetchAiJudgment = async (topic, answer) => {
    const prompt = `
      以下のお題と回答の組み合わせを評価してください。
      お題: ${topic}
      回答: ${answer}
      
      条件:
      1. まず回答内容を厳しくチェックしてください。**公序良俗に反する言葉、差別用語、過度な下ネタ、暴力的な表現、他人を不快にする誹謗中傷**が含まれている場合は、面白さに関わらず「不適切」と判定してください。
      2. 不適切な場合は、isInappropriate を true にしてください。
      
      3. 不適切でない場合は、面白さ、意外性、文脈のマッチ度を基準に0〜100点で採点してください。
      4. バラエティ番組の司会者のような、気が利いたツッコミや笑えるコメント（50文字以内）を付けてください。
      
      出力はJSON形式で以下のようにしてください。
      {"score": 点数(数値), "comment": "コメント", "isInappropriate": trueまたはfalse}
    `;
    
    const result = await callGemini(prompt, "あなたはお笑いセンス抜群の大喜利審査員ですが、コンプライアンスには非常に厳しい一面も持っています。");
    return result || null;
  };

  // --- デッキ管理 ---
  const addCardsToDeck = (newCards) => {
    const uniqueNewCards = newCards.filter(card => {
      if (usedCardsRef.current.has(card)) return false;
      usedCardsRef.current.add(card);
      return true;
    });
    if (uniqueNewCards.length > 0) {
      setCardDeck(prev => [...prev, ...uniqueNewCards]);
    }
  };

  useEffect(() => {
    if (isAiActive && cardDeck.length === 0) {
        setCardDeck(shuffleArray([...FALLBACK_ANSWERS]));
        fetchAiCards(12).then(aiCards => {
            if (aiCards) addCardsToDeck(aiCards);
        });
    }
  }, []);

  useEffect(() => {
    if (isAiActive && cardDeck.length < 15 && cardDeck.length > 0) {
      fetchAiCards(10).then(newCards => {
        if (newCards) addCardsToDeck(newCards);
      });
    }
  }, [cardDeck.length, isAiActive]);

  // --- ゲームロジック ---
  const initGame = async () => {
    setAppMode('game');
    setGamePhase('drawing');

    let initialDeck = [];
    if (isAiActive) {
      try {
        const aiCards = await fetchAiCards(12);
        if (aiCards && aiCards.length > 0) {
          initialDeck = aiCards;
          aiCards.forEach(c => usedCardsRef.current.add(c));
        }
      } catch (e) {
        console.error("Initial card generation failed");
      }
    }

    if (initialDeck.length === 0) {
      initialDeck = shuffleArray([...FALLBACK_ANSWERS]);
    }
    setCardDeck(initialDeck);

    let initialPlayers = [];
    let currentDeck = [...initialDeck];

    const drawInitialHand = (deck, count) => {
        const hand = [];
        for (let i = 0; i < count; i++) {
            if (deck.length > 0) {
                const idx = Math.floor(Math.random() * deck.length);
                hand.push(deck[idx]);
                deck.splice(idx, 1);
            } else {
                hand.push(FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)]);
            }
        }
        return { hand, remainingDeck: deck };
    };
    
    if (gameConfig.mode === 'single') {
      const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
      setSinglePlayerHand(hand);
      currentDeck = remainingDeck;
      initialPlayers = [
        { id: 0, name: 'あなた', score: 0, hand: hand },
        { id: 'ai', name: 'AI審査員', score: 0, hand: [] }
      ];
    } else {
      for (let i = 0; i < gameConfig.playerCount; i++) {
        const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
        currentDeck = remainingDeck;
        initialPlayers.push({ id: i, name: `プレイヤー${i + 1}`, score: 0, hand: hand });
      }
    }
    
    setCardDeck(currentDeck);
    setPlayers(initialPlayers);
    setMasterIndex(0);
    setSubmissions([]);
    
    setTimeout(() => startRoundProcess(initialPlayers, 0), 500);
  };

  const drawCards = (deck, count) => {
    const needed = Math.max(0, count);
    if (needed === 0) return { hand: [], remainingDeck: deck };

    let currentDeck = [...deck];
    if (currentDeck.length < needed) {
      const fallback = shuffleArray([...FALLBACK_ANSWERS]);
      const uniqueFallback = fallback.filter(c => !currentDeck.includes(c)); 
      currentDeck = [...currentDeck, ...uniqueFallback];
      if (currentDeck.length < needed) currentDeck = [...currentDeck, ...FALLBACK_ANSWERS];
    }

    const hand = [];
    for(let i=0; i<needed; i++) {
      const randomIndex = Math.floor(Math.random() * currentDeck.length);
      hand.push(currentDeck[randomIndex]);
      currentDeck.splice(randomIndex, 1);
    }
    return { hand, remainingDeck: currentDeck };
  };

  const startRoundProcess = async (currentPlayers, nextMasterIdx) => {
    setSubmissions([]);
    setSelectedSubmission(null);
    setAiComment('');
    setManualTopicInput('');
    setManualAnswerInput('');
    setMasterIndex(nextMasterIdx);
    setGamePhase('drawing');
    setManualTopicInput(''); 

    if (gameConfig.mode === 'single') {
      setSinglePlayerHand(prev => {
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
        const currentHand = p.hand.filter(c => !submissions.find(s => s.answerText === c));
        const needed = 7 - currentHand.length;
        const { hand: newCards, remainingDeck } = drawCards(tempDeck, needed);
        tempDeck = remainingDeck;
        return { ...p, hand: [...currentHand, ...newCards] };
      });
      setPlayers(updatedPlayers);
      setCardDeck(tempDeck);
    }
    setTimeout(() => setGamePhase('master_topic'), 800);
  };

  const nextRound = () => {
    if (gameConfig.mode === 'single') {
      startRoundProcess(players, 0);
    } else {
      const winnerIndex = players.findIndex(p => p.id === selectedSubmission.playerId);
      startRoundProcess(players, winnerIndex);
    }
  };

  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？\n進行中のゲームデータは失われます。')) setAppMode('title');
  };

  const handleShare = () => {
    const topicText = currentTopic.replace('{placeholder}', '___');
    const answerText = selectedSubmission?.answerText || '';
    const shareText = `【AI大喜利】\nお題：${topicText}\n回答：${answerText}\n\n#AI大喜利 #Gemini`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }
  };

  const generateAiTopic = async () => {
    if (isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    let newTopic = await fetchAiTopic();
    if (!newTopic) newTopic = topicsList[Math.floor(Math.random() * topicsList.length)];
    const displayTopic = newTopic.replace(/\{placeholder\}/g, "___");
    setManualTopicInput(displayTopic);
    setIsGeneratingTopic(false);
  };

  // お題決定処理（安全性チェック追加）
  const confirmTopic = async () => {
    if (!manualTopicInput.trim()) return;
    
    setIsCheckingTopic(true); // チェック開始

    // 安全性チェック
    const isUnsafe = await checkContentSafety(manualTopicInput);
    if (isUnsafe) {
        alert("⚠️ AI判定：お題に不適切な表現が含まれている可能性があります。\n\n表現を見直してください。");
        setIsCheckingTopic(false);
        return;
    }

    let finalTopic = manualTopicInput.replace(/___+/g, "{placeholder}").replace(/＿{3,}/g, "{placeholder}");
    if (!finalTopic.includes('{placeholder}')) finalTopic += " {placeholder}";
    if (!topicsList.includes(finalTopic)) setTopicsList(prev => [...prev, finalTopic]);
    setCurrentTopic(finalTopic);
    
    setIsCheckingTopic(false); // チェック終了

    if (gameConfig.mode === 'single') setGamePhase('answer_input');
    else prepareNextSubmitter(masterIndex, masterIndex, players);
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

  const handleSingleSubmit = async (answerText) => {
    if (!answerText) return;
    
    setIsJudging(true); // 審査中ローディング開始

    // AI審査呼び出し
    const result = await fetchAiJudgment(currentTopic, answerText);
    
    // 不適切判定ならアラートを出して中断
    if (result && result.isInappropriate) {
        alert("⚠️ AI判定：不適切な表現が含まれているため、回答できません。\n\n別の回答を選んでください。");
        setIsJudging(false);
        return; // ここで処理を終了（手札も減らない）
    }

    setSingleSelectedCard(answerText);
    setGamePhase('judging'); // 演出画面へ
    
    if (result) {
      setAiComment(result.comment);
      setSelectedSubmission({ answerText: answerText, score: result.score });
    } else {
      setAiComment(FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]);
      setSelectedSubmission({ answerText: answerText, score: Math.floor(Math.random() * 40) + 40 });
    }
    setIsJudging(false);
    setGamePhase('result');
  };

  const handleMultiSubmit = async (answer) => {
    const newSubmissions = [...submissions, { playerId: players[turnPlayerIndex].id, answerText: answer }];
    setSubmissions(newSubmissions);
    const updatedPlayers = players.map(p => {
      if (p.id === players[turnPlayerIndex].id) return { ...p, hand: p.hand.filter(c => c !== answer) };
      return p;
    });
    setPlayers(updatedPlayers);
    setManualAnswerInput('');
    prepareNextSubmitter(turnPlayerIndex, masterIndex, updatedPlayers);
  };

  const handleJudge = (submission) => {
    setSelectedSubmission(submission);
    const winnerId = submission.playerId;
    const updatedPlayers = players.map(p => 
      p.id === winnerId ? { ...p, score: p.score + 1 } : p
    );
    setPlayers(updatedPlayers);
    setGamePhase('result');
  };

  // --- UI ---
  const Card = ({ text, isSelected, onClick, disabled }) => (
    <button 
      onClick={() => !disabled && onClick(text)}
      disabled={disabled}
      className={`
        relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm
        flex items-center justify-center text-center h-24 w-full
        text-sm font-bold leading-snug break-words overflow-hidden text-slate-800
        ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'}
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
            {part}{i < arr.length - 1 && (<span className="inline-block bg-white/20 text-indigo-200 px-2 py-1 rounded mx-1 border-b-2 border-indigo-400 min-w-[80px] text-center">{answer || '？？？'}</span>)}
          </React.Fragment>
        ))}
      </p>
    </div>
  );

  if (appMode === 'title') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 text-slate-900">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6"><Sparkles className="w-10 h-10 text-indigo-600" /></div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">AI大喜利</h1>
        <p className="text-slate-500 mb-10">無限の世界観メーカー<br/><span className="text-xs text-indigo-500">Powered by Gemini</span></p>
        <div className="grid gap-4 w-full max-w-md">
          <button onClick={() => { setGameConfig({ mode: 'single', playerCount: 1 }); setAppMode('setup'); }} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all group text-left">
            <div className="bg-indigo-50 p-3 rounded-full group-hover:bg-indigo-100"><User className="w-6 h-6 text-indigo-600" /></div>
            <div><div className="font-bold text-slate-900">一人で遊ぶ</div><div className="text-xs text-slate-500">AI審査員と対決</div></div>
          </button>
          <button onClick={() => { setGameConfig({ mode: 'multi', playerCount: 3 }); setAppMode('setup'); }} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all group text-left">
            <div className="bg-amber-50 p-3 rounded-full group-hover:bg-amber-100"><Users className="w-6 h-6 text-amber-600" /></div>
            <div><div className="font-bold text-slate-900">みんなで遊ぶ</div><div className="text-xs text-slate-500">スマホ1台を回して対戦</div></div>
          </button>
        </div>
      </div>
    );
  }

  if (appMode === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in slide-in-from-right duration-300 text-slate-900">
        <h2 className="text-2xl font-bold mb-8">ゲーム設定</h2>
        <div className="w-full max-w-md space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500">
            <p className="mb-2 font-bold text-slate-700">遊び方</p>
            <ul className="list-disc list-inside space-y-1"><li>お題はAIが作成したものを自由に編集できます。</li><li>回答は配られた手札から選ぶか、自分で書くか選べます。</li><li>入力された新しいお題は、ゲーム中にAIが学習します。</li></ul>
          </div>
          {gameConfig.mode === 'multi' && (
            <div><label className="block text-sm font-bold text-slate-700 mb-2">参加人数: {gameConfig.playerCount}人</label><input type="range" min="2" max="10" value={gameConfig.playerCount} onChange={(e) => setGameConfig(prev => ({ ...prev, playerCount: parseInt(e.target.value) }))} className="w-full accent-indigo-600" /></div>
          )}
          <div className="pt-4 flex gap-3"><button onClick={() => setAppMode('title')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">戻る</button><button onClick={initGame} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">スタート</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-900">
      <header className="bg-white border-b border-slate-200 py-3 px-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2"><MessageSquare className="text-indigo-600 w-5 h-5" /><h1 className="font-bold text-slate-800">AI大喜利</h1></div>
        <div className="flex gap-2 items-center">
           <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${isAiActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{isAiActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{isAiActive ? 'AI稼働中' : 'AIお休み'}</div>
           {players.length > 0 && gameConfig.mode === 'multi' && (<div className="text-xs bg-slate-100 px-2 py-1 rounded-full font-mono flex items-center mr-2 text-slate-900">親: {players[masterIndex].name}</div>)}
          <button onClick={handleBackToTitle} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"><Home className="w-4 h-4" />トップへ</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {gamePhase === 'drawing' && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse"><RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-4" /><p className="text-slate-500 font-bold">準備中...</p><p className="text-xs text-slate-400 mt-2">AIがカードを生成しています...</p></div>
        )}

        {gamePhase === 'master_topic' && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-6">
            <div className="text-center"><span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full uppercase">MASTER TURN</span><h2 className="text-xl font-bold mt-2 text-slate-800">{gameConfig.mode === 'single' ? 'お題を決めてください' : `${players[masterIndex].name}さんがお題を決定`}</h2></div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2 font-bold text-slate-600 text-sm"><PenTool className="w-4 h-4" />お題を作成・編集</div>{isAiActive && (<button onClick={generateAiTopic} disabled={isGeneratingTopic} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"><Wand2 className={`w-3 h-3 ${isGeneratingTopic ? 'animate-spin' : ''}`} />{isGeneratingTopic ? 'AI生成中...' : 'AIで作成'}</button>)}</div>
              <div className="relative">
                {isGeneratingTopic && (<div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" /></div>)}
                <textarea value={manualTopicInput} onChange={(e) => setManualTopicInput(e.target.value)} placeholder="ここにAIでお題を作るか、自分で入力してください...&#13;&#10;例：冷蔵庫を開けたら、なぜか ___ が冷やされていた。" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none min-h-[120px] mb-4 text-base leading-relaxed text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mb-4 border border-slate-100"><p className="font-bold mb-1 text-slate-600">💡 ヒント</p><span className="font-bold font-mono">___</span> (アンダーバー3つ) の部分に、みんなが回答カード（名詞）を出します。<br/>名詞がスポッと入るような穴埋め文章にすると盛り上がります。</div>
              <button onClick={confirmTopic} disabled={!manualTopicInput.trim() || isGeneratingTopic || isCheckingTopic} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95 shadow-md">{isCheckingTopic ? 'AIチェック中...' : 'このお題で決定'}</button>
            </div>
          </div>
        )}

        {gamePhase === 'turn_change' && (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">{turnPlayerIndex === masterIndex ? <Eye className="w-8 h-8" /> : <PenTool className="w-8 h-8" />}</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">次は {players[turnPlayerIndex].name} さんの番です</h2>
              <p className="text-slate-500 mb-8">{turnPlayerIndex === masterIndex ? '全員の回答が出揃いました！親に端末を渡してください。' : '他の人に見えないように端末を受け取ってください。'}</p>
              <button onClick={() => setGamePhase(turnPlayerIndex === masterIndex ? 'judging' : 'answer_input')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transform transition active:scale-95">{turnPlayerIndex === masterIndex ? '審査を始める' : '回答する'}</button>
            </div>
          </div>
        )}

        {gamePhase === 'answer_input' && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <TopicDisplay topic={currentTopic} />
            <div className="mb-2"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">PLAYER</span><h3 className="text-lg font-bold text-slate-800 inline-block ml-2">{gameConfig.mode === 'single' ? 'あなたの回答' : `${players[turnPlayerIndex].name}の回答`}</h3></div>
            <div className="mb-6"><p className="text-xs text-slate-400 mb-2 font-bold flex items-center gap-1"><Layers className="w-3 h-3" />手札から選んで回答</p><div className="grid grid-cols-2 gap-3">{(gameConfig.mode === 'single' ? singlePlayerHand : players[turnPlayerIndex].hand).map((card, idx) => (<Card key={idx} text={card} onClick={() => { if (gameConfig.mode === 'single') handleSingleSubmit(card); else { if (window.confirm(`「${card}」で回答しますか？`)) handleMultiSubmit(card); }}} />))}</div></div>
            <div className="flex items-center gap-4 text-slate-300 mb-6"><div className="h-px bg-slate-200 flex-1"></div><ArrowDown className="w-4 h-4 text-slate-300" /><div className="h-px bg-slate-200 flex-1"></div></div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-10"><div className="flex items-center justify-between mb-2"><p className="text-xs text-slate-400 font-bold flex items-center gap-1"><PenTool className="w-3 h-3" />自由に回答</p></div><div className="relative"><textarea value={manualAnswerInput} onChange={(e) => setManualAnswerInput(e.target.value)} placeholder="ここに面白い回答を入力..." className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none min-h-[80px] mb-3 text-lg text-slate-900 placeholder:text-slate-400" /></div><button onClick={() => { if (!manualAnswerInput.trim()) return; if (gameConfig.mode === 'single') handleSingleSubmit(manualAnswerInput); else handleMultiSubmit(manualAnswerInput); }} disabled={!manualAnswerInput.trim() || isJudging} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95">{isJudging ? 'AIが審査中...' : '送信する'}</button></div>
          </div>
        )}

        {gamePhase === 'judging' && (
          <div className="animate-in fade-in duration-300">
            {gameConfig.mode === 'single' ? (
              <div className="flex flex-col items-center justify-center py-20 text-center"><Sparkles className="w-16 h-16 text-amber-500 animate-pulse mb-6" /><h3 className="text-2xl font-bold text-slate-800">審査中...</h3><p className="text-slate-500">{isAiActive ? 'AIが面白さを分析しています' : 'AIはお休み中...ランダムに採点します！'}</p></div>
            ) : (
              <div>
                <div className="bg-amber-500 text-white p-4 rounded-t-2xl text-center"><span className="text-xs font-bold opacity-80 uppercase">JUDGE TIME</span><h2 className="text-xl font-bold">{players[masterIndex].name}さんが選んでください</h2></div>
                <div className="bg-amber-50 p-4 border-x border-slate-200"><TopicDisplay topic={currentTopic} /></div>
                <div className="p-4 grid gap-4 pb-20 bg-white rounded-b-2xl shadow-sm border-x border-b border-slate-200"><p className="text-center text-sm text-slate-500 mb-2">一番面白いと思う回答をタップしてください（誰のかは秘密です）</p>{shuffleArray([...submissions]).map((sub, idx) => (<button key={idx} onClick={() => handleJudge(sub)} className="w-full p-6 text-lg font-bold bg-white border-2 border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 hover:shadow-md transition-all text-left relative overflow-hidden group text-slate-900"><span className="relative z-10">{sub.answerText}</span><div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><ThumbsUp className="text-amber-500" /></div></button>))}</div>
              </div>
            )}
          </div>
        )}

        {gamePhase === 'result' && (
          <div className="animate-in zoom-in duration-300 pb-20">
            <div className="text-center mb-6"><div className="inline-flex p-4 bg-yellow-100 rounded-full mb-4 shadow-inner"><Trophy className="w-12 h-12 text-yellow-600" /></div><h2 className="text-3xl font-extrabold text-slate-900">{gameConfig.mode === 'single' ? `${selectedSubmission?.score}点！` : '勝者決定！'}</h2></div>
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100"><div className="bg-slate-900 p-6 text-white text-center"><p className="text-indigo-300 text-sm font-bold mb-2 opacity-75">お題</p><p className="text-lg font-medium opacity-90">{currentTopic.replace('{placeholder}', '___')}</p></div><div className="p-8 text-center bg-gradient-to-b from-white to-slate-50"><p className="text-sm text-slate-400 font-bold mb-2">ベストアンサー</p><p className="text-3xl md:text-4xl font-black text-indigo-600 leading-tight mb-4">{selectedSubmission?.answerText}</p>{gameConfig.mode === 'single' ? (<div className="bg-slate-100 p-4 rounded-xl text-left inline-block max-w-sm"><div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-amber-500" /><span className="text-xs font-bold text-slate-500">AIコメント</span></div><p className="text-slate-700">「{aiComment}」</p></div>) : (<div className="animate-bounce-in"><p className="text-sm text-slate-400">by</p><p className="text-xl font-bold text-slate-800">{players.find(p => p.id === selectedSubmission?.playerId)?.name}</p><div className="mt-4 inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">次回の親になります</div></div>)}
            {/* シェアボタン */}
            <div className="mt-8">
               <button onClick={handleShare} className="flex items-center gap-2 mx-auto px-6 py-3 bg-indigo-50 text-indigo-700 rounded-full font-bold hover:bg-indigo-100 transition-all active:scale-95">
                 {isCopied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                 {isCopied ? 'コピーしました！' : '結果をシェアする'}
               </button>
            </div>
            </div></div>
            {gameConfig.mode === 'multi' && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-20"><h3 className="text-sm font-bold text-slate-500 mb-3 px-2">現在のスコア</h3><div className="space-y-2">{[...players].sort((a,b) => b.score - a.score).map(p => (<div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl"><div className="flex items-center gap-2">{p.score > 0 && p.score === Math.max(...players.map(pl => pl.score)) && <Trophy className="w-4 h-4 text-yellow-500" />}<span className="font-bold text-slate-700">{p.name}</span></div><span className="font-mono font-bold text-indigo-600">{p.score} pt</span></div>))}</div></div>
            )}
            <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20"><button onClick={nextRound} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 hover:scale-105 transition-all shadow-xl"><RotateCcw className="w-5 h-5" />次のラウンドへ</button></div>
          </div>
        )}
      </main>
    </div>
  );
}