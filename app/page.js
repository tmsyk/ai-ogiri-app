"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, RotateCcw, Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, Infinity, Trash2, Brain } from 'lucide-react';
// Firebaseの機能をインポート
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- ★重要★ Firebase設定 ---------------------------------------
// 手順1でコピーした内容に書き換えてください
const userFirebaseConfig = {
 apiKey: "AIzaSyADNa2ix6NWLt-EEtIbDVTs6qsXsnubn8Y",
  authDomain: "ai-ogiri-app-2026-tmsyk.firebaseapp.com",
  projectId: "ai-ogiri-app-2026-tmsyk",
  storageBucket: "ai-ogiri-app-2026-tmsyk.firebasestorage.app",
  messagingSenderId: "9612204174",
  appId: "1:9612204174:web:7f1d36e12cd2d673da11df",
  measurementId: "G-LW7C3ZSNKD"
};
// ---------------------------------------------------------------

// Firebase初期化ロジック
let app, auth, db;
try {
  // Canvas環境かVercel環境かを判定してConfigを使い分ける
  const config = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : userFirebaseConfig;
  
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error:", e);
}

// コレクションパス取得ヘルパー（環境によるパスの違いを吸収）
const getCollectionRef = (collectionName) => {
  if (typeof __app_id !== 'undefined') {
    // Canvas環境用
    return collection(db, 'artifacts', __app_id, 'public', 'data', collectionName);
  } else {
    // Vercel(本番)環境用：ルートに作る
    return collection(db, collectionName);
  }
};

const getDocRef = (collectionName, docId) => {
    if (typeof __app_id !== 'undefined') {
        return doc(db, 'artifacts', __app_id, 'public', 'data', collectionName, docId);
    } else {
        return doc(db, collectionName, docId);
    }
};


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

// --- 定数 ---
const TOTAL_ROUNDS_SCORE_ATTACK = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;

// --- ユーティリティ ---
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const formatTime = (ms) => {
  if (!ms) return "--:--";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

// --- メインコンポーネント ---
export default function AiOgiriApp() {
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({
    mode: 'single',
    singleMode: 'score_attack',
    playerCount: 3,
  });

  const [isAiActive, setIsAiActive] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [isCheckingTopic, setIsCheckingTopic] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  const [aiFeedback, setAiFeedback] = useState(null);

  // Firestoreから取得する共有データ
  const [learnedData, setLearnedData] = useState({
    topics: [],
    goodAnswers: []
  });

  const [rankings, setRankings] = useState({
    score_attack: [],
    survival: [],
    time_attack: []
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [cardDeck, setCardDeck] = useState([]);
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);
  const usedCardsRef = useRef(new Set([...FALLBACK_ANSWERS]));

  const [players, setPlayers] = useState([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState('drawing');
  const [currentRound, setCurrentRound] = useState(1);
  
  const [startTime, setStartTime] = useState(null);
  const [finishTime, setFinishTime] = useState(null);
  const [displayTime, setDisplayTime] = useState("00:00");
  const [isSurvivalGameOver, setIsSurvivalGameOver] = useState(false);
  
  const [currentTopic, setCurrentTopic] = useState('');
  const [manualTopicInput, setManualTopicInput] = useState('');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [manualAnswerInput, setManualAnswerInput] = useState('');
  
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [aiComment, setAiComment] = useState('');
  
  const [singlePlayerHand, setSinglePlayerHand] = useState([]);
  const [singleSelectedCard, setSingleSelectedCard] = useState(null);

  // --- Firebase Auth & Firestore同期 ---
  
  useEffect(() => {
    // 1. 匿名認証
    const initAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Auth Error", error);
        }
    };
    initAuth();
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // 2. 学習データのリアルタイム同期
    const learnedDocRef = getDocRef('shared_db', 'learned_data');
    const unsubLearned = onSnapshot(learnedDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setLearnedData({
                topics: data.topics || [],
                goodAnswers: data.goodAnswers || []
            });
            // 学習したお題を候補に追加
            if (data.topics && data.topics.length > 0) {
                setTopicsList(prev => {
                    const merged = [...FALLBACK_TOPICS, ...data.topics];
                    return Array.from(new Set(merged));
                });
            }
        } else {
            // 初回作成
            setDoc(learnedDocRef, { topics: [], goodAnswers: [] });
        }
    });

    // 3. ランキングのリアルタイム同期
    const rankingDocRef = getDocRef('shared_db', 'rankings');
    const unsubRankings = onSnapshot(rankingDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setRankings(docSnap.data());
        } else {
            setDoc(rankingDocRef, { score_attack: [], survival: [], time_attack: [] });
        }
    });

    return () => {
        unsubLearned();
        unsubRankings();
    };
  }, [currentUser]);

  // --- データの保存処理 (Firestore) ---

  const saveLearnedTopic = async (newTopic) => {
    if (!currentUser) return;
    const docRef = getDocRef('shared_db', 'learned_data');
    try {
        await updateDoc(docRef, {
            topics: arrayUnion(newTopic)
        });
    } catch (e) { console.error(e); }
  };

  const saveLearnedAnswer = async (newAnswer) => {
    if (!currentUser) return;
    const docRef = getDocRef('shared_db', 'learned_data');
    try {
        await updateDoc(docRef, {
            goodAnswers: arrayUnion(newAnswer)
        });
    } catch (e) { console.error(e); }
  };

  const updateRanking = async (mode, value) => {
    if (!currentUser) return;
    const docRef = getDocRef('shared_db', 'rankings');
    
    // 現在のランキングを取得して更新（トランザクションではない簡易実装）
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentData = docSnap.data();
            const currentList = currentData[mode] || [];
            const newEntry = { value, date: new Date().toLocaleDateString() };
            let newList = [...currentList, newEntry];

            // ソート
            if (mode === 'score_attack' || mode === 'survival') {
                newList.sort((a, b) => b.value - a.value);
            } else if (mode === 'time_attack') {
                newList.sort((a, b) => a.value - b.value);
            }

            // Top3のみ保存
            const top3 = newList.slice(0, 3);
            
            await updateDoc(docRef, {
                [mode]: top3
            });
        }
    } catch (e) { console.error(e); }
  };

  // --- タイマー ---
  useEffect(() => {
    let interval;
    if (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack' && appMode === 'game' && startTime && !finishTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = now - startTime;
        setDisplayTime(formatTime(diff));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameConfig, appMode, startTime, finishTime]);

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
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini API Error:", error);
      return null;
    }
  };

  const checkContentSafety = async (text) => {
    if (!isAiActive) return false;
    const prompt = `
      あなたはコンテンツの安全性を監視する厳格なモデレーターです。
      以下のテキストが、公序良俗に反する言葉、差別用語、性的な表現、暴力的な表現、犯罪を助長する表現、他人を不快にする誹謗中傷を含んでいるか、非常に厳しく判定してください。
      判定結果: 不適切な要素が少しでも含まれていれば true、問題なければ false を返してください。
      テキスト: "${text}"
      出力はJSON形式で {"isInappropriate": trueまたはfalse} としてください。
    `;
    const result = await callGemini(prompt, "あなたは厳格なコンテンツモデレーターです。");
    if (result === null) return true;
    return result?.isInappropriate || false;
  };

  const fetchAiTopic = async () => {
    // 学習データから参考お題を抽出
    const referenceTopics = shuffleArray(learnedData.topics).slice(0, 3).join("\n");
    const referenceText = referenceTopics ? `参考にすべき過去の良質なお題例(ユーザー作成):\n${referenceTopics}` : "";
    const prompt = `
      大喜利のお題を1つ作成してください。
      【重要条件】
      1. プレイヤーは「名詞」や「短いフレーズ」が書かれたカードを出して回答します。
      2. 文脈として自然で、日本語として違和感のない穴埋め文章にしてください。
      3. 回答が入るべき箇所を必ず「{placeholder}」という文字列にすること。
      4. 出力はJSON形式で {"topic": "作成したお題"} とすること。
      ${referenceText}
      例: "冷蔵庫を開けたら、なぜか {placeholder} が冷やされていた。"
    `;
    const result = await callGemini(prompt, "あなたは大喜利の司会者です。");
    return result?.topic || null;
  };

  const fetchAiCards = async (count = 10) => {
    // 学習データから参考回答を抽出
    const referenceAnswers = shuffleArray(learnedData.goodAnswers).slice(0, 5).join(", ");
    const referenceText = referenceAnswers ? `ユーザーが高得点を出した回答の傾向（参考）: ${referenceAnswers}` : "";
    const prompt = `
      大喜利の回答カード（手札）として使える、単語や短いフレーズを${count}個生成してください。
      条件:
      1. シュール、面白い、少し自虐的、または全く無関係な名詞など、バラエティ豊かにすること。
      2. 毎回必ず違う種類の単語を選ぶこと。
      3. 基本的に「体言止め」できる名詞や名詞句にすること。
      4. 出力はJSON形式で {"answers": ["回答1", "回答2", ...]} とすること。
      ${referenceText}
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
      1. まず回答内容を厳しくチェックしてください。不適切な言葉が含まれている場合は「不適切」と判定してください。
      2. 不適切な場合は、isInappropriate を true にしてください。
      3. 不適切でない場合は、面白さ、意外性、文脈のマッチ度を基準に0〜100点で採点してください。
      4. バラエティ番組の司会者のような、気が利いたツッコミや笑えるコメント（50文字以内）を付けてください。
      出力はJSON形式で {"score": 点数, "comment": "コメント", "isInappropriate": bool} とすること。
    `;
    const result = await callGemini(prompt, "あなたはお笑いセンス抜群の大喜利審査員ですが、コンプライアンスには非常に厳しい一面も持っています。");
    return result || null;
  };

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
    setCurrentRound(1);
    setIsSurvivalGameOver(false);
    setStartTime(null);
    setFinishTime(null);
    setDisplayTime("00:00");
    setAiFeedback(null);

    if (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack') {
        setStartTime(Date.now());
    }

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
    setAiFeedback(null);

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

    const isAutoTopicMode = gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle';

    if (isAutoTopicMode) {
        let nextTopic = "";
        if (isAiActive) {
            try {
                const fetchedTopic = await fetchAiTopic();
                nextTopic = fetchedTopic || "";
            } catch (e) { console.error(e); }
        }
        if (!nextTopic) {
            nextTopic = topicsList[Math.floor(Math.random() * topicsList.length)];
        }
        if (!nextTopic.includes('{placeholder}')) nextTopic += " {placeholder}";
        setCurrentTopic(nextTopic);
        setGamePhase('answer_input');
    } else {
        setTimeout(() => setGamePhase('master_topic'), 800);
    }
  };

  const nextRound = () => {
    if (gameConfig.mode === 'single') {
        if (gameConfig.singleMode === 'score_attack') {
            if (currentRound >= TOTAL_ROUNDS_SCORE_ATTACK) {
                updateRanking('score_attack', players[0].score);
                setGamePhase('final_result');
                return;
            }
        } else if (gameConfig.singleMode === 'survival') {
            if (isSurvivalGameOver) {
                const wins = currentRound - 1;
                updateRanking('survival', wins);
                setGamePhase('final_result');
                return;
            }
        } else if (gameConfig.singleMode === 'time_attack') {
            if (finishTime) {
                const timeScore = finishTime - startTime;
                updateRanking('time_attack', timeScore);
                setGamePhase('final_result');
                return;
            }
        }
        setCurrentRound(prev => prev + 1);
        startRoundProcess(players, 0);
    } else {
      if (selectedSubmission.isDummy) {
         startRoundProcess(players, masterIndex);
      } else {
         const winnerIndex = players.findIndex(p => p.id === selectedSubmission.playerId);
         startRoundProcess(players, winnerIndex);
      }
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

  const handleAiFeedback = (isGood) => {
    setAiFeedback(isGood ? 'good' : 'bad');
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

  const confirmTopic = async () => {
    if (!manualTopicInput.trim()) return;
    setIsCheckingTopic(true);
    const isUnsafe = await checkContentSafety(manualTopicInput);
    if (isUnsafe) {
        alert("⚠️ AI判定：お題に不適切な表現が含まれているため、使用できません。");
        setIsCheckingTopic(false);
        return;
    }
    let finalTopic = manualTopicInput.replace(/___+/g, "{placeholder}").replace(/＿{3,}/g, "{placeholder}");
    if (!finalTopic.includes('{placeholder}')) finalTopic += " {placeholder}";
    
    // 【学習】新しいお題ならFirestoreへ保存
    if (!topicsList.includes(finalTopic)) {
      setTopicsList(prev => [...prev, finalTopic]);
      saveLearnedTopic(finalTopic);
    }

    setCurrentTopic(finalTopic);
    setIsCheckingTopic(false);
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

  const startJudging = () => {
    let dummyCard = "";
    let newDeck = [...cardDeck];
    if (newDeck.length > 0) {
      const idx = Math.floor(Math.random() * newDeck.length);
      dummyCard = newDeck[idx];
      newDeck.splice(idx, 1);
    } else {
      dummyCard = FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)];
    }
    setCardDeck(newDeck);
    setSubmissions(prev => [...prev, { playerId: 'dummy', answerText: dummyCard, isDummy: true }]);
    setGamePhase('judging');
  };

  const handleSingleSubmit = async (answerText) => {
    if (!answerText) return;
    setIsJudging(true);
    const result = await fetchAiJudgment(currentTopic, answerText);
    if (result && result.isInappropriate) {
        alert("⚠️ AI判定：不適切な表現が含まれているため、回答できません。");
        setIsJudging(false);
        return;
    }
    setSingleSelectedCard(answerText);
    setGamePhase('judging');
    
    let earnedScore = 0;
    if (result) {
      setAiComment(result.comment);
      earnedScore = result.score;
      
      // 【学習】80点以上ならFirestoreへ保存
      if (earnedScore >= HIGH_SCORE_THRESHOLD) {
        saveLearnedAnswer(answerText);
      }
    } else {
      earnedScore = Math.floor(Math.random() * 40) + 40;
      setAiComment(FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]);
    }

    setPlayers(prev => {
         const newPlayers = [...prev];
         const currentTotal = newPlayers[0].score + earnedScore;
         newPlayers[0].score = currentTotal;
         
         if (gameConfig.singleMode === 'survival' && earnedScore < SURVIVAL_PASS_SCORE) {
             setIsSurvivalGameOver(true);
         }
         if (gameConfig.singleMode === 'time_attack' && currentTotal >= TIME_ATTACK_GOAL_SCORE) {
             setFinishTime(Date.now());
         }
         return newPlayers;
    });
    setSelectedSubmission({ answerText: answerText, score: earnedScore });

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
    let updatedPlayers = [...players];
    if (submission.isDummy) {
      updatedPlayers = updatedPlayers.map(p => p.id === players[masterIndex].id ? { ...p, score: p.score - 1 } : p);
    } else {
      const winnerId = submission.playerId;
      updatedPlayers = updatedPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + 1 } : p);
    }
    setPlayers(updatedPlayers);
    setGamePhase('result');
  };

  // --- UIコンポーネント ---
  const RankingList = ({ mode, data, unit }) => (
    <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200">
      <div className="flex items-center gap-2 mb-3 font-bold text-slate-600"><Crown className="w-4 h-4 text-yellow-500" /><span>歴代トップ3</span></div>
      {data && data.length > 0 ? (
        <ul className="space-y-2 text-sm">{data.map((rank, i) => (<li key={i} className="flex justify-between items-center border-b border-slate-100 last:border-0 pb-1"><span className="font-bold text-slate-500 w-6">#{i+1}</span><span className="font-bold text-indigo-700">{mode === 'time_attack' ? formatTime(rank.value) : rank.value}<span className="text-xs text-slate-400 font-normal ml-1">{unit}</span></span><span className="text-xs text-slate-400">{rank.date}</span></li>))}</ul>
      ) : (<p className="text-xs text-slate-400 text-center py-2">記録はまだありません</p>)}
    </div>
  );

  const RuleModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl relative">
        <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6"><h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2"><BookOpen className="w-6 h-6" /> 遊び方・ルール</h3></div>
        <div className="space-y-6 text-slate-700">
          <section>
            <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> 一人で遊ぶ</h4>
            <div className="space-y-4">
                <div className="bg-indigo-50 p-3 rounded-xl"><p className="font-bold text-indigo-700 mb-1">👑 スコアアタック</p><p className="text-sm">全{TOTAL_ROUNDS_SCORE_ATTACK}回戦の合計得点を競います。大喜利神を目指そう！</p></div>
                <div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p><p className="text-sm">AI審査員から<span className="font-bold">{SURVIVAL_PASS_SCORE}点未満</span>を取ったら即終了。何連勝できるか挑戦！</p></div>
                <div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p><p className="text-sm">合計<span className="font-bold">{TIME_ATTACK_GOAL_SCORE}点</span>に到達するまでの速さを競います。</p></div>
                <div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p><p className="text-sm">お題を自分で書くかAIに任せるか自由！ 心ゆくまで楽しめます。</p></div>
            </div>
          </section>
          <section>
            <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ（2人～）</h4>
            <ul className="list-disc list-inside text-sm space-y-1 bg-amber-50 p-3 rounded-xl"><li>1人が「親」、残りが「子（回答者）」になります。</li><li>スマホを回して、親はお題を決め、子は回答します。</li><li>全員回答後、親が一番面白い回答を選びます。</li><li><span className="font-bold text-red-500">注意！</span> 審査時にAIが作った<span className="font-bold">「ダミー回答」</span>が1つ混ざります。</li><li>親がダミーを選ぶと<span className="font-bold">親が-1点</span>！ 子を選ぶと<span className="font-bold">その子が+1点</span>です。</li></ul>
          </section>
          
          <div className="pt-4 border-t border-slate-200">
             <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded"><Brain className="w-4 h-4 text-indigo-500" /><span><span className="font-bold">AI学習機能:</span> あなたが作ったお題や、80点以上の面白い回答はクラウドに保存され、全ユーザーのAIが参考にします。</span></div>
          </div>
        </div>
        <div className="mt-8 text-center"><button onClick={() => setShowRules(false)} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700 transition-colors">閉じる</button></div>
      </div>
    </div>
  );

  const Card = ({ text, isSelected, onClick, disabled }) => (
    <button onClick={() => !disabled && onClick(text)} disabled={disabled} className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden text-slate-800 ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}>{text}</button>
  );

  const TopicDisplay = ({ topic, answer }) => (
    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-6 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
      <MessageSquare className="absolute top-[-10px] right-[-10px] w-32 h-32 text-white/5" />
      <h3 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">お題</h3>
      <p className="text-xl md:text-2xl font-bold leading-relaxed relative z-10">{topic.split('{placeholder}').map((part, i, arr) => (<React.Fragment key={i}>{part}{i < arr.length - 1 && (<span className="inline-block bg-white/20 text-indigo-200 px-2 py-1 rounded mx-1 border-b-2 border-indigo-400 min-w-[80px] text-center">{answer || '？？？'}</span>)}</React.Fragment>))}</p>
    </div>
  );

  if (appMode === 'title') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 text-slate-900">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6"><Sparkles className="w-10 h-10 text-indigo-600" /></div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">AI大喜利</h1>
        <p className="text-slate-500 mb-8">無限の世界観メーカー<br/><span className="text-xs text-indigo-500">Powered by Gemini</span></p>
        <div className="grid gap-4 w-full max-w-md mb-8">
          <button onClick={() => { setGameConfig({ mode: 'single', singleMode: 'score_attack', playerCount: 1 }); setAppMode('setup'); }} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all group text-left">
            <div className="bg-indigo-50 p-3 rounded-full group-hover:bg-indigo-100"><User className="w-6 h-6 text-indigo-600" /></div>
            <div><div className="font-bold text-slate-900">一人で遊ぶ</div><div className="text-xs text-slate-500">4つのモードでAIに挑戦</div></div>
          </button>
          <button onClick={() => { setGameConfig({ mode: 'multi', playerCount: 3 }); setAppMode('setup'); }} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all group text-left">
            <div className="bg-amber-50 p-3 rounded-full group-hover:bg-amber-100"><Users className="w-6 h-6 text-amber-600" /></div>
            <div><div className="font-bold text-slate-900">みんなで遊ぶ</div><div className="text-xs text-slate-500">スマホ1台を回して対戦</div></div>
          </button>
        </div>
        <button onClick={() => setShowRules(true)} className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white transition-colors"><BookOpen className="w-4 h-4" /> 遊び方・ルールを見る</button>
        {showRules && <RuleModal />}
      </div>
    );
  }

  if (appMode === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in slide-in-from-right duration-300 text-slate-900">
        <h2 className="text-2xl font-bold mb-8">ゲーム設定</h2>
        <div className="w-full max-w-md space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          {gameConfig.mode === 'single' ? (
            <div>
                <p className="mb-4 font-bold text-slate-700">ゲームモード選択</p>
                <div className="space-y-3">
                    <button onClick={() => setGameConfig(prev => ({...prev, singleMode: 'score_attack'}))} className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${gameConfig.singleMode === 'score_attack' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 shadow-md' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${gameConfig.singleMode === 'score_attack' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Trophy className="w-5 h-5"/></div><div><div className={`font-bold ${gameConfig.singleMode === 'score_attack' ? 'text-indigo-900' : 'text-slate-900'}`}>スコアアタック</div><div className="text-xs text-slate-500">全{TOTAL_ROUNDS_SCORE_ATTACK}問の合計得点を競う</div></div></div>{gameConfig.singleMode === 'score_attack' && <Check className="w-6 h-6 text-indigo-600" />}</button>
                    <button onClick={() => setGameConfig(prev => ({...prev, singleMode: 'survival'}))} className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${gameConfig.singleMode === 'survival' ? 'border-red-600 bg-red-50 ring-2 ring-red-200 shadow-md' : 'border-slate-200 hover:border-red-300 bg-white'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${gameConfig.singleMode === 'survival' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Skull className="w-5 h-5"/></div><div><div className={`font-bold ${gameConfig.singleMode === 'survival' ? 'text-red-900' : 'text-slate-900'}`}>サバイバル</div><div className="text-xs text-slate-500">{SURVIVAL_PASS_SCORE}点未満で即終了。連勝を目指せ</div></div></div>{gameConfig.singleMode === 'survival' && <Check className="w-6 h-6 text-red-600" />}</button>
                    <button onClick={() => setGameConfig(prev => ({...prev, singleMode: 'time_attack'}))} className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${gameConfig.singleMode === 'time_attack' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 shadow-md' : 'border-slate-200 hover:border-blue-300 bg-white'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${gameConfig.singleMode === 'time_attack' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Clock className="w-5 h-5"/></div><div><div className={`font-bold ${gameConfig.singleMode === 'time_attack' ? 'text-blue-900' : 'text-slate-900'}`}>タイムアタック</div><div className="text-xs text-slate-500">合計{TIME_ATTACK_GOAL_SCORE}点到達までのタイムを競う</div></div></div>{gameConfig.singleMode === 'time_attack' && <Check className="w-6 h-6 text-blue-600" />}</button>
                    <button onClick={() => setGameConfig(prev => ({...prev, singleMode: 'freestyle'}))} className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${gameConfig.singleMode === 'freestyle' ? 'border-green-600 bg-green-50 ring-2 ring-green-200 shadow-md' : 'border-slate-200 hover:border-green-300 bg-white'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${gameConfig.singleMode === 'freestyle' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Infinity className="w-5 h-5"/></div><div><div className={`font-bold ${gameConfig.singleMode === 'freestyle' ? 'text-green-900' : 'text-slate-900'}`}>フリースタイル</div><div className="text-xs text-slate-500">お題作成から楽しむ無限モード</div></div></div>{gameConfig.singleMode === 'freestyle' && <Check className="w-6 h-6 text-green-600" />}</button>
                </div>
            </div>
          ) : (
            <>
            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500"><p className="mb-2 font-bold text-slate-700">マルチプレイのルール</p><ul className="list-disc list-inside space-y-1"><li>親と子に分かれて対戦します。</li><li>審査時に「ダミー回答」が混ざります。</li><li>親がダミーを選ぶと親が減点されます。</li></ul></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">参加人数: {gameConfig.playerCount}人</label><input type="range" min="2" max="10" value={gameConfig.playerCount} onChange={(e) => setGameConfig(prev => ({ ...prev, playerCount: parseInt(e.target.value) }))} className="w-full accent-indigo-600" /></div>
            </>
          )}
          <div className="pt-4 flex gap-3"><button onClick={() => setAppMode('title')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">戻る</button><button onClick={initGame} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">スタート</button></div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'final_result') {
    const player = players[0];
    let resultTitle = "";
    let resultMain = "";
    let resultSub = "";
    let rank = "";
    let rankingList = null;

    if (gameConfig.singleMode === 'score_attack') {
        resultTitle = `全${TOTAL_ROUNDS_SCORE_ATTACK}回戦 終了！`;
        resultMain = `${player.score}点`;
        if (player.score >= 450) rank = "お笑い神";
        else if (player.score >= 400) rank = "大御所";
        else if (player.score >= 300) rank = "真打ち";
        else if (player.score >= 200) rank = "二ツ目";
        else rank = "見習い芸人";
        resultSub = `あなたの称号：${rank}`;
        rankingList = <RankingList mode="score_attack" data={rankings.score_attack} unit="点" />;
    } else if (gameConfig.singleMode === 'survival') {
        resultTitle = "GAME OVER...";
        resultMain = `${currentRound - 1}連勝`;
        resultSub = `最終スコア: ${player.score}点`;
        rankingList = <RankingList mode="survival" data={rankings.survival} unit="連勝" />;
    } else if (gameConfig.singleMode === 'time_attack') {
        resultTitle = "GOAL!!";
        if (startTime && finishTime) {
            const diff = finishTime - startTime;
            resultMain = formatTime(diff);
        } else {
            resultMain = "--:--";
        }
        resultSub = `合計スコア: ${player.score}点`;
        rankingList = <RankingList mode="time_attack" data={rankings.time_attack} unit="" />;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500 text-slate-900">
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-lg border-4 border-white">{gameConfig.singleMode === 'survival' ? <Skull className="w-12 h-12 text-slate-700" /> : <Trophy className="w-12 h-12 text-yellow-600" />}</div>
        <h2 className="text-xl font-bold text-slate-500 mb-2">{resultTitle}</h2>
        <div className="text-6xl font-black text-indigo-600 mb-4">{resultMain}</div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm mb-4"><p className="text-xl font-bold text-slate-800">{resultSub}</p></div>
        <div className="w-full max-w-sm mb-8">{rankingList}</div>
        <button onClick={() => setAppMode('title')} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700 shadow-xl transition-all active:scale-95">タイトルへ戻る</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-900">
      <header className="bg-white border-b border-slate-200 py-3 px-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2"><MessageSquare className="text-indigo-600 w-5 h-5" /><h1 className="font-bold text-slate-800">AI大喜利</h1></div>
        <div className="flex gap-2 items-center">
           {gameConfig.mode === 'single' && (<div className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600 flex items-center gap-2">
             {gameConfig.singleMode === 'score_attack' && <span>Round {currentRound}/{TOTAL_ROUNDS_SCORE_ATTACK}</span>}
             {gameConfig.singleMode === 'survival' && <span className="text-red-600 flex items-center gap-1"><Skull className="w-3 h-3"/> {currentRound}連勝中</span>}
             {gameConfig.singleMode === 'time_attack' && <span className="text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3"/> {displayTime}</span>}
             {gameConfig.singleMode === 'freestyle' && <span className="text-green-600 flex items-center gap-1"><Infinity className="w-3 h-3"/> Round {currentRound}</span>}
           </div>)}
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
              <button onClick={() => turnPlayerIndex === masterIndex ? startJudging() : setGamePhase('answer_input')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transform transition active:scale-95">{turnPlayerIndex === masterIndex ? '審査を始める（ダミーが混ざります！）' : '回答する'}</button>
            </div>
          </div>
        )}

        {gamePhase === 'answer_input' && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <TopicDisplay topic={currentTopic} />
            <div className="mb-2"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">PLAYER</span><h3 className="text-lg font-bold text-slate-800 inline-block ml-2">{gameConfig.mode === 'single' ? 'あなたの回答' : `${players[turnPlayerIndex].name}の回答`}</h3></div>
            {gameConfig.singleMode === 'time_attack' && (<div className="mb-4 bg-blue-50 border border-blue-200 p-2 rounded-lg flex justify-between items-center text-sm text-blue-800 font-bold"><span>現在: {players[0]?.score || 0}点</span><span>目標: {TIME_ATTACK_GOAL_SCORE}点</span></div>)}
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
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100"><div className="bg-slate-900 p-6 text-white text-center"><p className="text-indigo-300 text-sm font-bold mb-2 opacity-75">お題</p><p className="text-lg font-medium opacity-90">{currentTopic.replace('{placeholder}', '___')}</p></div><div className="p-8 text-center bg-gradient-to-b from-white to-slate-50"><p className="text-sm text-slate-400 font-bold mb-2">ベストアンサー</p><p className="text-3xl md:text-4xl font-black text-indigo-600 leading-tight mb-4">{selectedSubmission?.answerText}</p>{gameConfig.mode === 'single' ? (<div className="bg-slate-100 p-4 rounded-xl text-left inline-block max-w-sm"><div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-amber-500" /><span className="text-xs font-bold text-slate-500">AIコメント</span></div><p className="text-slate-700">「{aiComment}」</p>
            {/* Feedback Buttons */}
            <div className="mt-3 pt-3 border-t border-slate-200"><p className="text-xs text-slate-400 font-bold mb-2 text-center">このツッコミは...</p>{aiFeedback === null ? (<div className="flex justify-center gap-4"><button onClick={() => handleAiFeedback(true)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"><ThumbsUp className="w-3 h-3" /> ナイス！</button><button onClick={() => handleAiFeedback(false)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"><ThumbsDown className="w-3 h-3" /> イマイチ</button></div>) : (<p className="text-xs text-center font-bold text-indigo-600 animate-in fade-in">{aiFeedback === 'good' ? 'ありがとうございます！😊' : '精進します...🙇'}</p>)}</div>
            {gameConfig.singleMode === 'survival' && isSurvivalGameOver && (<div className="mt-4 p-3 bg-red-100 text-red-700 font-bold rounded-lg animate-pulse">⚠️ {SURVIVAL_PASS_SCORE}点未満のため、ゲームオーバー！</div>)}
            {gameConfig.singleMode === 'time_attack' && finishTime && (<div className="mt-4 p-3 bg-blue-100 text-blue-700 font-bold rounded-lg animate-bounce">🎉 目標達成！ ゴール！</div>)}
            </div>) : (<div className="animate-bounce-in">
              {selectedSubmission.isDummy ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 inline-block"><div className="flex items-center gap-2 justify-center text-red-600 font-bold mb-2"><AlertTriangle className="w-6 h-6" /><span>残念！！</span></div><p className="text-slate-700">それは<span className="font-bold text-red-600">AIが作ったダミー回答</span>でした！</p><p className="text-sm text-slate-500 mt-1">見る目がない親は<span className="font-bold text-red-600 text-lg"> -1点 </span>です！</p></div>
              ) : (
                <><p className="text-sm text-slate-400">by</p><p className="text-xl font-bold text-slate-800">{players.find(p => p.id === selectedSubmission?.playerId)?.name}</p><div className="mt-4 inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">次回の親になります</div></>
              )}
            </div>)}
            <div className="mt-8"><button onClick={handleShare} className="flex items-center gap-2 mx-auto px-6 py-3 bg-indigo-50 text-indigo-700 rounded-full font-bold hover:bg-indigo-100 transition-all active:scale-95">{isCopied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}{isCopied ? 'コピーしました！' : '結果をシェアする'}</button></div>
            </div></div>
            {gameConfig.mode === 'multi' && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-20"><h3 className="text-sm font-bold text-slate-500 mb-3 px-2">現在のスコア</h3><div className="space-y-2">{[...players].sort((a,b) => b.score - a.score).map(p => (<div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl"><div className="flex items-center gap-2">{p.score > 0 && p.score === Math.max(...players.map(pl => pl.score)) && <Trophy className="w-4 h-4 text-yellow-500" />}<span className="font-bold text-slate-700">{p.name}</span></div><span className="font-mono font-bold text-indigo-600">{p.score} pt</span></div>))}</div></div>
            )}
            <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20"><button onClick={nextRound} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 hover:scale-105 transition-all shadow-xl"><RotateCcw className="w-5 h-5" />{(gameConfig.mode === 'single' && ((gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS_SCORE_ATTACK) || (gameConfig.singleMode === 'survival' && isSurvivalGameOver) || (gameConfig.singleMode === 'time_attack' && finishTime))) ? '結果発表へ' : '次のラウンドへ'}</button></div>
          </div>
        )}
      </main>
    </div>
  );
}