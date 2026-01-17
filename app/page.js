"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, RotateCcw, Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, Infinity, Trash2, Brain } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- ★重要★ Firebase設定 ---------------------------------------
// 手順1でコピーした内容に、以下の { ... } の中身を書き換えてください
const userFirebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
// ---------------------------------------------------------------

// Firebase初期化（エラーガード付き）
let app, auth, db;
try {
  const config = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : userFirebaseConfig;
  if (config && config.apiKey && config.apiKey !== "AIzaSy...") {
      if (!getApps().length) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      auth = getAuth(app);
      db = getFirestore(app);
  } else {
      console.log("Running in offline mode (Firebase config missing)");
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// ドキュメント参照ヘルパー
const getDocRef = (collectionName, docId) => {
    if (!db) return null;
    try {
        if (typeof __app_id !== 'undefined') {
            return doc(db, 'artifacts', __app_id, 'public', 'data', collectionName, docId);
        } else {
            return doc(db, collectionName, docId);
        }
    } catch (e) { return null; }
};

// --- フォールバックデータ ---
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
];

const TOTAL_ROUNDS_SCORE_ATTACK = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;

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

export default function AiOgiriApp() {
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({ mode: 'single', singleMode: 'score_attack', playerCount: 3 });
  const [isAiActive, setIsAiActive] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [isCheckingTopic, setIsCheckingTopic] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);

  const [learnedData, setLearnedData] = useState({ topics: [], goodAnswers: [] });
  const [rankings, setRankings] = useState({ score_attack: [], survival: [], time_attack: [] });

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
  const [lastAiGeneratedTopic, setLastAiGeneratedTopic] = useState('');

  // --- トップへ戻る処理 ---
  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？\n進行中のゲームデータは失われます。')) setAppMode('title');
  };

  // --- データのロード (Firebase優先、なければLocal) ---
  useEffect(() => {
    // オフライン用のロード
    const localRankings = localStorage.getItem('aiOgiriRankings');
    if (localRankings) setRankings(JSON.parse(localRankings));
    
    const localLearned = localStorage.getItem('aiOgiriLearnedData');
    if (localLearned) {
      const parsed = JSON.parse(localLearned);
      setLearnedData(parsed);
      if (parsed.topics) setTopicsList(prev => [...prev, ...parsed.topics]);
    }

    if (auth) {
      signInAnonymously(auth).catch(e => console.log("Auth skipped (offline)"));
      onAuthStateChanged(auth, (user) => setCurrentUser(user));
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !db) return;

    // Firebase同期
    const learnedDocRef = getDocRef('shared_db', 'learned_data');
    if (learnedDocRef) {
        const unsubLearned = onSnapshot(learnedDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setLearnedData({ topics: data.topics || [], goodAnswers: data.goodAnswers || [] });
                if (data.topics && data.topics.length > 0) {
                    setTopicsList(prev => Array.from(new Set([...FALLBACK_TOPICS, ...data.topics])));
                }
            } else {
                setDoc(learnedDocRef, { topics: [], goodAnswers: [] }).catch(() => {});
            }
        }, () => {});

        const rankingDocRef = getDocRef('shared_db', 'rankings');
        const unsubRankings = onSnapshot(rankingDocRef, (docSnap) => {
            if (docSnap.exists()) setRankings(docSnap.data());
            else setDoc(rankingDocRef, { score_attack: [], survival: [], time_attack: [] }).catch(() => {});
        }, () => {});

        return () => { unsubLearned(); unsubRankings(); };
    }
  }, [currentUser]);

  // --- 保存関数 (Local + Firebase) ---
  const saveLearnedTopic = async (newTopic) => {
    const newLocalData = { ...learnedData, topics: [...learnedData.topics, newTopic] };
    setLearnedData(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    
    if (currentUser && db) {
        const docRef = getDocRef('shared_db', 'learned_data');
        if (docRef) await updateDoc(docRef, { topics: arrayUnion(newTopic) }).catch(() => {});
    }
  };

  const saveLearnedAnswer = async (newAnswer) => {
    const newLocalData = { ...learnedData, goodAnswers: [...learnedData.goodAnswers, newAnswer] };
    setLearnedData(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));

    if (currentUser && db) {
        const docRef = getDocRef('shared_db', 'learned_data');
        if (docRef) await updateDoc(docRef, { goodAnswers: arrayUnion(newAnswer) }).catch(() => {});
    }
  };

  const resetLearnedData = () => {
    if (window.confirm("この端末に保存されたAIの学習データをリセットしますか？\n（共有データベースは消えません）")) {
      const emptyData = { topics: [], goodAnswers: [] };
      setLearnedData(emptyData);
      localStorage.removeItem('aiOgiriLearnedData');
      setTopicsList([...FALLBACK_TOPICS]);
      alert("リセットしました。");
    }
  };

  const updateRanking = async (mode, value) => {
    setRankings(prev => {
      const currentList = prev[mode] || [];
      const newEntry = { value, date: new Date().toLocaleDateString() };
      let newList = [...currentList, newEntry];
      if (mode === 'score_attack' || mode === 'survival') newList.sort((a, b) => b.value - a.value);
      else if (mode === 'time_attack') newList.sort((a, b) => a.value - b.value);
      const top3 = newList.slice(0, 3);
      const newRankings = { ...prev, [mode]: top3 };
      localStorage.setItem('aiOgiriRankings', JSON.stringify(newRankings));
      return newRankings;
    });

    if (currentUser && db) {
        const docRef = getDocRef('shared_db', 'rankings');
        if (docRef) {
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const currentData = docSnap.data();
                    const currentList = currentData[mode] || [];
                    const newEntry = { value, date: new Date().toLocaleDateString() };
                    let newList = [...currentList, newEntry];
                    if (mode === 'score_attack' || mode === 'survival') newList.sort((a, b) => b.value - a.value);
                    else if (mode === 'time_attack') newList.sort((a, b) => a.value - b.value);
                    await updateDoc(docRef, { [mode]: newList.slice(0, 3) });
                }
            } catch (e) {}
        }
    }
  };

  // --- API ---
  const callGemini = async (prompt, systemInstruction = "") => {
    if (!isAiActive) return null;
    try {
      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction }),
      });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) setIsAiActive(false);
        throw new Error(`API Error: ${response.status}`);
      }
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (error) { return null; }
  };

  const checkContentSafety = async (text) => {
    if (!isAiActive) return false;
    const prompt = `あなたは厳格なモデレーターです。テキスト: "${text}" が不適切ならtrue、適切ならfalseを {"isInappropriate": boolean} で返してください。`;
    try {
        const result = await callGemini(prompt, "あなたは厳格なコンテンツモデレーターです。");
        if (result === null) return true;
        return result?.isInappropriate || false;
    } catch (e) { return false; }
  };

  const fetchAiTopic = async () => {
    const referenceTopics = shuffleArray(learnedData.topics).slice(0, 3).join("\n");
    const prompt = `大喜利のお題を1つ作成してください。条件: {placeholder}を含めること。出力: {"topic": "..."}\n参考:\n${referenceTopics}`;
    return (await callGemini(prompt, "あなたは大喜利の司会者です。"))?.topic || null;
  };

  const fetchAiCards = async (count = 10) => {
    const referenceAnswers = shuffleArray(learnedData.goodAnswers).slice(0, 5).join(", ");
    const prompt = `大喜利の回答カード（単語・短いフレーズ）を${count}個作成してください。出力: {"answers": ["...", ...] }\n参考傾向: ${referenceAnswers}`;
    return (await callGemini(prompt, "あなたは構成作家です。"))?.answers || null;
  };

  const fetchAiJudgment = async (topic, answer, isManual) => {
    let prompt = "";
    if (isManual) {
        prompt = `
          お題: ${topic} 回答: ${answer}
          1. 厳格な不適切チェック(NGならisInappropriate:true)
          2. 面白さを0-100点で採点
          3. 20文字以内の気の利いた一言ツッコミ
          出力: {"score": 数値, "comment": "...", "isInappropriate": bool}
        `;
    } else {
        prompt = `
          お題: ${topic} 回答: ${answer}
          1. 不適切チェックは不要(isInappropriate: false)
          2. 面白さを0-100点で採点
          3. 20文字以内の気の利いた一言ツッコミ
          出力: {"score": 数値, "comment": "...", "isInappropriate": false}
        `;
    }
    return await callGemini(prompt, "あなたはお笑いセンス抜群の審査員です。");
  };

  // --- ゲーム進行 ---
  const addCardsToDeck = (newCards) => {
    const uniqueNewCards = newCards.filter(card => {
      if (usedCardsRef.current.has(card)) return false;
      usedCardsRef.current.add(card);
      return true;
    });
    if (uniqueNewCards.length > 0) setCardDeck(prev => [...prev, ...uniqueNewCards]);
  };

  useEffect(() => {
    // 初回ロード時に12枚ではなく8枚にして負担軽減
    if (isAiActive && cardDeck.length === 0) {
        setCardDeck(shuffleArray([...FALLBACK_ANSWERS]));
        fetchAiCards(8).then(aiCards => { if (aiCards) addCardsToDeck(aiCards); });
    }
  }, []);

  useEffect(() => {
    // 補充も10枚ではなく5枚ずつにしてこまめに
    if (isAiActive && cardDeck.length < 15 && cardDeck.length > 0) {
      fetchAiCards(5).then(newCards => { if (newCards) addCardsToDeck(newCards); });
    }
  }, [cardDeck.length, isAiActive]);

  useEffect(() => {
    let interval;
    if (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack' && appMode === 'game' && startTime && !finishTime) {
      interval = setInterval(() => {
        const diff = Date.now() - startTime;
        setDisplayTime(formatTime(diff));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameConfig, appMode, startTime, finishTime]);

  const initGame = async () => {
    setAppMode('game'); setGamePhase('drawing'); setCurrentRound(1);
    setIsSurvivalGameOver(false); setStartTime(null); setFinishTime(null); setDisplayTime("00:00");
    setAiFeedback(null);

    if (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack') setStartTime(Date.now());

    let initialDeck = [];
    if (isAiActive) {
      try {
        // スタート時は8枚だけ頑張って作る
        const aiCards = await fetchAiCards(8);
        if (aiCards && aiCards.length > 0) {
          initialDeck = aiCards;
          aiCards.forEach(c => usedCardsRef.current.add(c));
        }
      } catch (e) {}
    }
    if (initialDeck.length === 0) initialDeck = shuffleArray([...FALLBACK_ANSWERS]);
    setCardDeck(initialDeck);

    // 手札配布
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

    let currentDeck = [...initialDeck];
    let initialPlayers = [];
    if (gameConfig.mode === 'single') {
        const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
        currentDeck = remainingDeck;
        initialPlayers = [{ id: 0, name: 'あなた', score: 0, hand }, { id: 'ai', name: 'AI審査員', score: 0, hand: [] }];
    } else {
        for (let i = 0; i < gameConfig.playerCount; i++) {
            const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
            currentDeck = remainingDeck;
            initialPlayers.push({ id: i, name: `プレイヤー${i+1}`, score: 0, hand });
        }
    }
    setCardDeck(currentDeck);
    setPlayers(initialPlayers);
    setMasterIndex(0);
    setSubmissions([]);
    setTimeout(() => startRoundProcess(initialPlayers, 0), 500);
  };

  const startRoundProcess = async (currentPlayers, nextMasterIdx) => {
    setSubmissions([]); setSelectedSubmission(null); setAiComment('');
    setManualTopicInput(''); setManualAnswerInput(''); setAiFeedback(null);
    setMasterIndex(nextMasterIdx); setGamePhase('drawing');

    // 手札補充処理
    const drawCards = (deck, count) => {
        const needed = Math.max(0, count);
        if (needed === 0) return { hand: [], remainingDeck: deck };
        let currentDeck = [...deck];
        if (currentDeck.length < needed) {
            const fallback = shuffleArray([...FALLBACK_ANSWERS]);
            currentDeck = [...currentDeck, ...fallback]; 
        }
        const hand = [];
        for(let i=0; i<needed; i++) {
            const idx = Math.floor(Math.random() * currentDeck.length);
            hand.push(currentDeck[idx]);
            currentDeck.splice(idx, 1);
        }
        return { hand, remainingDeck: currentDeck };
    };

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

    // お題決定
    const isAutoTopicMode = gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle';
    if (isAutoTopicMode) {
        let nextTopic = "";
        if (isAiActive) nextTopic = await fetchAiTopic() || "";
        if (!nextTopic) nextTopic = topicsList[Math.floor(Math.random() * topicsList.length)];
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
                updateRanking('survival', currentRound - 1);
                setGamePhase('final_result');
                return;
            }
        } else if (gameConfig.singleMode === 'time_attack') {
            if (finishTime) {
                updateRanking('time_attack', finishTime - startTime);
                setGamePhase('final_result');
                return;
            }
        }
        setCurrentRound(prev => prev + 1);
        startRoundProcess(players, 0);
    } else {
        if (selectedSubmission.isDummy) startRoundProcess(players, masterIndex);
        else startRoundProcess(players, players.findIndex(p => p.id === selectedSubmission.playerId));
    }
  };

  const handleShare = () => {
    const text = `【AI大喜利】\nお題：${currentTopic.replace('{placeholder}', '___')}\n回答：${selectedSubmission?.answerText}\n#AI大喜利`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
  };

  const handleAiFeedback = (isGood) => setAiFeedback(isGood ? 'good' : 'bad');

  // --- イベントハンドラ ---
  const generateAiTopic = async () => {
    if (isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    let topic = await fetchAiTopic();
    if (!topic) topic = topicsList[Math.floor(Math.random() * topicsList.length)];
    const displayTopic = topic.replace(/\{placeholder\}/g, "___");
    setManualTopicInput(displayTopic);
    setLastAiGeneratedTopic(displayTopic);
    setIsGeneratingTopic(false);
  };

  const confirmTopic = async () => {
    if (!manualTopicInput.trim()) return;
    
    const isAiOrigin = manualTopicInput === lastAiGeneratedTopic;

    if (!isAiOrigin) {
        setIsCheckingTopic(true);
        if (await checkContentSafety(manualTopicInput)) {
            alert("⚠️ AI判定：不適切な表現が含まれています。");
            setIsCheckingTopic(false);
            return;
        }
        setIsCheckingTopic(false);
    }

    let topic = manualTopicInput.replace(/___+/g, "{placeholder}").replace(/＿{3,}/g, "{placeholder}");
    if (!topic.includes('{placeholder}')) topic += " {placeholder}";
    
    if (!topicsList.includes(topic)) {
        setTopicsList(prev => [...prev, topic]);
        saveLearnedTopic(topic);
    }
    setCurrentTopic(topic);
    if (gameConfig.mode === 'single') setGamePhase('answer_input');
    else prepareNextSubmitter(masterIndex, masterIndex, players);
  };

  const prepareNextSubmitter = (current, master, currentPlayers) => {
    const next = (current + 1) % currentPlayers.length;
    if (next === master) { setGamePhase('turn_change'); setTurnPlayerIndex(master); }
    else { setTurnPlayerIndex(next); setGamePhase('turn_change'); }
  };

  const startJudging = () => {
    let dummy = "";
    let deck = [...cardDeck];
    if (deck.length > 0) {
        const idx = Math.floor(Math.random() * deck.length);
        dummy = deck[idx];
        deck.splice(idx, 1);
    } else {
        dummy = FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)];
    }
    setCardDeck(deck);
    setSubmissions(prev => [...prev, { playerId: 'dummy', answerText: dummy, isDummy: true }]);
    setGamePhase('judging');
  };

  const handleSingleSubmit = async (text, isManual = false) => {
    if (!text) return;
    setIsJudging(true);
    
    const result = await fetchAiJudgment(currentTopic, text, isManual);
    
    if (result && result.isInappropriate) {
        alert("⚠️ AI判定：不適切な表現が含まれています。");
        setIsJudging(false);
        return;
    }
    setSingleSelectedCard(text);
    setGamePhase('judging');
    let score = 0;
    if (result) {
        setAiComment(result.comment);
        score = result.score;
        if (score >= HIGH_SCORE_THRESHOLD) saveLearnedAnswer(text);
    } else {
        score = Math.floor(Math.random() * 40) + 40;
        setAiComment(FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]);
    }
    setPlayers(prev => {
        const newP = [...prev];
        newP[0].score += score;
        if (gameConfig.singleMode === 'survival' && score < SURVIVAL_PASS_SCORE) setIsSurvivalGameOver(true);
        if (gameConfig.singleMode === 'time_attack' && newP[0].score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now());
        return newP;
    });
    setSelectedSubmission({ answerText: text, score });
    setIsJudging(false);
    setGamePhase('result');
  };

  const handleMultiSubmit = (text) => {
    setSubmissions(prev => [...prev, { playerId: players[turnPlayerIndex].id, answerText: text }]);
    setPlayers(prev => prev.map(p => p.id === players[turnPlayerIndex].id ? { ...p, hand: p.hand.filter(c => c !== text) } : p));
    setManualAnswerInput('');
    prepareNextSubmitter(turnPlayerIndex, masterIndex, players);
  };

  const handleJudge = (submission) => {
    setSelectedSubmission(submission);
    setPlayers(prev => prev.map(p => {
        if (submission.isDummy) return p.id === players[masterIndex].id ? { ...p, score: p.score - 1 } : p;
        return p.id === submission.playerId ? { ...p, score: p.score + 1 } : p;
    }));
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
                <div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p><p className="text-sm">{SURVIVAL_PASS_SCORE}点未満で即終了。何連勝できるか挑戦！</p></div>
                <div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p><p className="text-sm">合計{TIME_ATTACK_GOAL_SCORE}点到達までのタイムを競います。</p></div>
                <div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p><p className="text-sm">お題を自分で書くかAIに任せるか自由！ 心ゆくまで楽しめます。</p></div>
            </div>
          </section>
          <section>
            <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ（2人～）</h4>
            <ul className="list-disc list-inside text-sm space-y-1 bg-amber-50 p-3 rounded-xl"><li>1人が「親」、残りが「子」になります。</li><li>全員回答後、親が一番面白い回答を選びます。</li><li>AIが作った「ダミー回答」が混ざります。親がダミーを選ぶと減点！</li></ul>
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
                    {['score_attack', 'survival', 'time_attack', 'freestyle'].map(mode => (
                        <button key={mode} onClick={() => setGameConfig(prev => ({...prev, singleMode: mode}))} className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${gameConfig.singleMode === mode ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 shadow-md' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${gameConfig.singleMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {mode === 'score_attack' && <Trophy className="w-5 h-5"/>}
                                    {mode === 'survival' && <Skull className="w-5 h-5"/>}
                                    {mode === 'time_attack' && <Clock className="w-5 h-5"/>}
                                    {mode === 'freestyle' && <Infinity className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <div className={`font-bold ${gameConfig.singleMode === mode ? 'text-indigo-900' : 'text-slate-900'}`}>
                                        {mode === 'score_attack' && 'スコアアタック'}
                                        {mode === 'survival' && 'サバイバル'}
                                        {mode === 'time_attack' && 'タイムアタック'}
                                        {mode === 'freestyle' && 'フリースタイル'}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {mode === 'score_attack' && `全${TOTAL_ROUNDS_SCORE_ATTACK}問の合計得点を競う`}
                                        {mode === 'survival' && `${SURVIVAL_PASS_SCORE}点未満で即終了`}
                                        {mode === 'time_attack' && `合計${TIME_ATTACK_GOAL_SCORE}点到達までのタイム`}
                                        {mode === 'freestyle' && 'お題作成から楽しむ無限モード'}
                                    </div>
                                </div>
                            </div>
                            {gameConfig.singleMode === mode && <Check className="w-6 h-6 text-indigo-600" />}
                        </button>
                    ))}
                </div>
                <div className="mt-6 text-center">
                   <button onClick={resetLearnedData} className="text-xs text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto underline decoration-dotted"><Trash2 className="w-3 h-3" />AIの学習データをリセット</button>
                </div>
            </div>
          ) : (
            <div>
              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500 mb-6"><p className="mb-2 font-bold text-slate-700">マルチプレイのルール</p><ul className="list-disc list-inside space-y-1"><li>親と子に分かれて対戦します。</li><li>審査時に「ダミー回答」が混ざります。</li><li>親がダミーを選ぶと親が減点されます。</li></ul></div>
              <label className="block text-sm font-bold text-slate-700 mb-2">参加人数: {gameConfig.playerCount}人</label><input type="range" min="2" max="10" value={gameConfig.playerCount} onChange={(e) => setGameConfig(prev => ({ ...prev, playerCount: parseInt(e.target.value) }))} className="w-full accent-indigo-600" />
            </div>
          )}
          <div className="pt-4 flex gap-3"><button onClick={() => setAppMode('title')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">戻る</button><button onClick={initGame} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">スタート</button></div>
        </div>
      </div>
    );
  }

  // 結果画面・ゲーム画面は省略せず記述
  if (gamePhase === 'final_result') {
    const player = players[0];
    let resultTitle = "", resultMain = "", resultSub = "", rankingList = null;

    if (gameConfig.singleMode === 'score_attack') {
        resultTitle = `全${TOTAL_ROUNDS_SCORE_ATTACK}回戦 終了！`;
        resultMain = `${player.score}点`;
        let rank = player.score >= 450 ? "お笑い神" : player.score >= 400 ? "大御所" : player.score >= 300 ? "真打ち" : "見習い";
        resultSub = `称号：${rank}`;
        rankingList = <RankingList mode="score_attack" data={rankings.score_attack} unit="点" />;
    } else if (gameConfig.singleMode === 'survival') {
        resultTitle = "GAME OVER...";
        resultMain = `${currentRound - 1}連勝`;
        resultSub = `スコア: ${player.score}点`;
        rankingList = <RankingList mode="survival" data={rankings.survival} unit="連勝" />;
    } else if (gameConfig.singleMode === 'time_attack') {
        resultTitle = "GOAL!!";
        resultMain = (startTime && finishTime) ? formatTime(finishTime - startTime) : "--:--";
        resultSub = `スコア: ${player.score}点`;
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
           {gameConfig.mode === 'single' && (<div className="text-xs font-bold bg-slate-1