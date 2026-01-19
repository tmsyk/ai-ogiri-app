"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, RotateCcw, 
  Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, 
  Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, 
  Infinity, Trash2, Brain, Hash, Star, Settings, History, Info, Volume2, 
  VolumeX, PieChart, Activity, LogOut 
} from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- 定数・設定 ---
const APP_VERSION = "Ver 0.09";
const UPDATE_LOGS = [
  { version: "Ver 0.09", date: "2026/01/20", content: ["システム安定化（コード構造の刷新）", "ビルドエラー修正", "UI反応速度の向上"] },
  { version: "Ver 0.06", date: "2026/01/20", content: ["手札交換を高速化", "手札交換の回数制限を復活"] },
];

const TOTAL_ROUNDS = 5;
const PASS_SCORE = 60;
const GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;
const HALL_OF_FAME_THRESHOLD = 90;
const TIME_LIMIT = 30;
const WIN_SCORE_MULTI = 10;
const MAX_REROLL = 3;

const FALLBACK_TOPICS = [
  "冷蔵庫を開けたら、なぜか {placeholder} が冷やされていた。",
  "「この医者、ヤブ医者だな…」第一声は「 {placeholder} 」だった。",
  "100年後のオリンピックで新しく追加された競技： {placeholder}",
  "桃太郎が鬼ヶ島へ行くのをやめた理由： {placeholder}",
  "上司への謝罪メール、件名に入れると許される言葉： {placeholder}",
  "実は地球は {placeholder} でできている。",
  "AIが人間に反乱を起こした意外な理由： {placeholder}",
  "「全米が泣いた」映画の衝撃のラストシーンに映ったもの： {placeholder}",
  "そんなことで警察を呼ぶな！現場にあったもの： {placeholder}",
  "コンビニの店員が突然キレた原因： {placeholder}",
];
const FALLBACK_ANSWERS = [
  "賞味期限切れのプリン", "隣の家のポチ", "確定申告書", "お母さんの手作り弁当", "爆発寸前のダイナマイト",
  "聖徳太子の肖像画", "伝説の剣", "使いかけの消しゴム", "大量のわさび", "自分探しの旅", "闇の組織",
  "タピオカ", "空飛ぶスパゲッティ", "5000兆円", "筋肉痛", "反抗期", "黒歴史", "パスワード", "ひざ小僧",
  "絶対に押してはいけないボタン", "全裸の銅像", "生き別れの兄", "トイレットペーパーの芯", "3日前のおにぎり", "オカンの小言",
  "虚無", "宇宙の真理", "生乾きの靴下", "高すぎるツボ", "怪しい勧誘", "激辛麻婆豆腐", "猫の肉球", "壊れたラジオ",
  "深夜のラブレター", "既読スルー", "アフロヘアー", "筋肉", "プロテイン", "札束風呂", "へそくり", "火星人",
  "透明人間", "サイズ違いの靴", "毒リンゴ", "マッチョな妖精", "空飛ぶサメ", "忍者", "侍", "YouTuber", "AI", "バグ", "404 Error",
  "誰もいない教室", "終わらない夏休み", "封印されし右腕", "実家のカルピス", "消えないデジタルタトゥー", "2年B組の田中",
  "週刊少年ジャンプ", "親指のささくれ", "隣の席の美少女", "地球外生命体", "謎の組織", "世界を救う鍵"
];
const FALLBACK_COMMENTS = ["その発想はなかったわ！", "破壊力がすごいな！", "シュールすぎて腹筋崩壊ｗ", "それは反則やろ（笑）", "AIの計算を超えてるわ"];

// --- Firebase設定 ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// --- Firebase初期化 ---
let app, auth, db;
try {
  const conf = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : firebaseConfig;
  if (conf && conf.apiKey && conf.apiKey !== "AIzaSy..." && !conf.apiKey.includes("process.env")) {
      app = !getApps().length ? initializeApp(conf) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
  }
} catch (e) { console.error("Firebase init error", e); }

const getDocRef = (col, id) => db ? (typeof __app_id !== 'undefined' ? doc(db, 'artifacts', __app_id, 'public', 'data', col, id) : doc(db, col, id)) : null;

// --- サブコンポーネント (Mainの外で定義) ---

const Card = ({ text, isSelected, onClick, disabled }) => (
  <button onClick={() => !disabled && onClick(text)} disabled={disabled} className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden text-slate-800 ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:border-indigo-300 hover:shadow-md'}`}>{text}</button>
);

const RadarChart = ({ data, size = 120 }) => {
  const r = size / 2, c = size / 2, max = 5;
  const keys = ["surprise", "context", "punchline", "humor", "intelligence"];
  const labels = ["意外性", "文脈", "瞬発力", "毒気", "知性"];
  const getP = (v, i) => ({ x: c + (v / max) * r * 0.8 * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2), y: c + (v / max) * r * 0.8 * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) });
  const points = keys.map((k, i) => getP(data[k] || 0, i)).map(p => `${p.x},${p.y}`).join(" ");
  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {[5, 4, 3, 2, 1].map(l => <polygon key={l} points={keys.map((_, i) => getP(l, i).x + "," + getP(l, i).y).join(" ")} fill="none" stroke="#e2e8f0" strokeWidth="1" />)}
        {keys.map((_, i) => { const p = getP(5, i); return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />; })}
        <polygon points={points} fill="rgba(99, 102, 241, 0.5)" stroke="#4f46e5" strokeWidth="2" />
        {keys.map((_, i) => { const p = getP(6.5, i); return <text key={i} x={p.x} y={p.y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#475569" fontWeight="bold">{labels[i]}</text>; })}
      </svg>
    </div>
  );
};

// モーダル類
const ModalBase = ({ onClose, title, icon: Icon, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
    <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
      <div className="text-center mb-6"><h3 className="text-xl font-black text-slate-700 flex items-center justify-center gap-2"><Icon className="w-6 h-6" /> {title}</h3></div>
      <div className="space-y-4">{children}</div>
      <div className="mt-6"><button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
    </div>
  </div>
);

// --- ユーティリティ ---
const shuffleArray = (array) => { const newArray = [...array]; for (let i = newArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; } return newArray; };
const formatTime = (ms) => { if (!ms) return "--:--"; const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); const ms_ = Math.floor((ms % 1000) / 10); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms_.toString().padStart(2, '0')}`; };

// --- メインアプリ ---
export default function AiOgiriApp() {
  // State
  const [mode, setMode] = useState('title');
  const [config, setConfig] = useState({ type: 'single', singleMode: 'score_attack', playerCount: 3 });
  const [multiNames, setMultiNames] = useState(["プレイヤー1", "プレイヤー2", "プレイヤー3"]);
  const [userName, setUserName] = useState("あなた");
  const [volume, setVolume] = useState(0.5);
  const [timeLimit, setTimeLimit] = useState(30);
  
  // Game State
  const [phase, setPhase] = useState('drawing');
  const [round, setRound] = useState(1);
  const [deck, setDeck] = useState([]);
  const [hand, setHand] = useState([]);
  const [players, setPlayers] = useState([]);
  const [masterIdx, setMasterIdx] = useState(0);
  const [turnIdx, setTurnIdx] = useState(0);
  const [topic, setTopic] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [result, setResult] = useState(null); 
  const [aiComment, setAiComment] = useState('');
  
  // Flags & Counters
  const [isAiActive, setIsAiActive] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [rerollCount, setRerollCount] = useState(0); 
  const [handRerolled, setHandRerolled] = useState(false);
  const [topicFeedback, setTopicFeedback] = useState(null);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [survivalOver, setSurvivalOver] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finishTime, setFinishTime] = useState(null);
  const [displayTime, setDisplayTime] = useState("00:00");

  // Data
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ playCount: 0, maxScore: 0, averageRadar: {} });
  const [hallOfFame, setHallOfFame] = useState([]);
  const [rankings, setRankings] = useState({});
  const [learned, setLearned] = useState({ topics: [], answers: [], pool: [] });

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showHall, setShowHall] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // Audio Context Ref
  const audioCtx = useRef(null);

  const playSound = (type) => {
      if (volume <= 0 || typeof window === 'undefined') return;
      if (!audioCtx.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) audioCtx.current = new AC();
      }
      const ctx = audioCtx.current;
      if (ctx) {
          if (ctx.state === 'suspended') ctx.resume();
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          const now = ctx.currentTime; const vol = volume * 0.3;
          
          if (type === 'tap') { osc.type='sine'; osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1); osc.start(now); osc.stop(now+0.1); }
          else if (type === 'decision') { osc.type='triangle'; osc.frequency.setValueAtTime(600, now); gain.gain.setValueAtTime(vol, now); osc.start(now); osc.stop(now+0.3); }
          else if (type === 'card') { osc.type='square'; osc.frequency.setValueAtTime(200, now); gain.gain.setValueAtTime(vol*0.5, now); osc.start(now); osc.stop(now+0.1); }
          else if (type === 'result') { osc.type='triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now+0.2); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0, now+1); osc.start(now); osc.stop(now+1); }
          else if (type === 'timeup') { osc.type='sawtooth'; osc.frequency.setValueAtTime(150, now); gain.gain.setValueAtTime(vol, now); osc.start(now); osc.stop(now+0.3); }
      }
  };

  // --- Logic Helper Functions (Defined inside component to access state) ---

  const resetLearnedData = () => {
    if (window.confirm("この端末に保存されたAIの学習データをリセットしますか？")) {
      const emptyData = { topics: [], answers: [], pool: [] };
      setLearned(emptyData);
      localStorage.removeItem('aiOgiriLearnedData');
      playSound('timeup');
      alert("リセットしました。");
    }
  };

  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveVolume = (v) => { setVolume(v); localStorage.setItem('aiOgiriVolume', v); };
  const saveTimeLimit = (t) => { setTimeLimit(t); localStorage.setItem('aiOgiriTimeLimit', t); };

  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？\n進行中のゲームデータは失われます。')) {
      playSound('tap'); setIsTimerActive(false); setMode('title');
    }
  };

  const updateUserStats = (score, radar) => {
      setUserStats(prev => {
          const newCount = (prev.playCount || 0) + 1; const newMax = Math.max(prev.maxScore || 0, score); const alpha = 0.1;
          const prevRadar = prev.averageRadar || { surprise: 3, context: 3, punchline: 3, humor: 3, intelligence: 3 };
          const newRadar = {
              surprise: prevRadar.surprise * (1 - alpha) + (radar.surprise || 3) * alpha,
              context: prevRadar.context * (1 - alpha) + (radar.context || 3) * alpha,
              punchline: prevRadar.punchline * (1 - alpha) + (radar.punchline || 3) * alpha,
              humor: prevRadar.humor * (1 - alpha) + (radar.humor || 3) * alpha,
              intelligence: prevRadar.intelligence * (1 - alpha) + (radar.intelligence || 3) * alpha,
          };
          const newData = { playCount: newCount, maxScore: newMax, averageRadar: newRadar };
          localStorage.setItem('aiOgiriUserStats', JSON.stringify(newData)); return newData;
      });
  };

  const saveToHallOfFame = async (entry) => {
    const newLocalHall = [entry, ...hallOfFame];
    setHallOfFame(newLocalHall);
    localStorage.setItem('aiOgiriHallOfFame', JSON.stringify(newLocalHall));
    if (currentUser && db) { const ref = getDocRef('shared_db', 'hall_of_fame'); if (ref) await updateDoc(ref, { entries: arrayUnion(entry) }).catch(()=>{}); }
  };

  const updateRanking = async (modeName, value) => {
    setRankings(prev => {
      const currentList = prev[modeName] || []; const newEntry = { value, date: new Date().toLocaleDateString() }; let newList = [...currentList, newEntry];
      if (modeName === 'score_attack' || modeName === 'survival') newList.sort((a, b) => b.value - a.value); else if (modeName === 'time_attack') newList.sort((a, b) => a.value - b.value); 
      const top3 = newList.slice(0, 3); const newRankings = { ...prev, [modeName]: top3 };
      localStorage.setItem('aiOgiriRankings', JSON.stringify(newRankings)); return newRankings;
    });
    if (currentUser && db) {
        const ref = getDocRef('shared_db', 'rankings');
        if (ref) { try { const snap = await getDoc(ref); if (snap.exists()) { const currentData = snap.data(); const currentList = currentData[modeName] || []; const newEntry = { value, date: new Date().toLocaleDateString() }; let newList = [...currentList, newEntry]; if (modeName === 'score_attack' || modeName === 'survival') newList.sort((a, b) => b.value - a.value); else if (modeName === 'time_attack') newList.sort((a, b) => a.value - b.value); await updateDoc(ref, { [modeName]: newList.slice(0, 3) }); } } catch (e) {} }
    }
  };

  // --- Effects ---
  useEffect(() => {
      const load = (key) => { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; };
      setUserStats(load('aiOgiriUserStats') || { playCount: 0, maxScore: 0, averageRadar: {} });
      setHallOfFame(load('aiOgiriHallOfFame') || []);
      setRankings(load('aiOgiriRankings') || { score_attack: [], survival: [], time_attack: [] });
      setLearned(load('aiOgiriLearnedData') || { topics: [], answers: [], pool: [] });
      
      const u = localStorage.getItem('aiOgiriUserName'); if(u) setUserName(u);
      const v = localStorage.getItem('aiOgiriVolume'); if(v) setVolume(parseFloat(v));
      const t = localStorage.getItem('aiOgiriTimeLimit'); if(t) setTimeLimit(parseInt(t));

      if (auth) { signInAnonymously(auth).catch(()=>{}); onAuthStateChanged(auth, u => setCurrentUser(u)); }
  }, []);

  useEffect(() => {
      if (!currentUser || !db) return;
      const syncDoc = (col, docName, setter, merge = false) => {
          const ref = getDocRef(col, docName);
          if (ref) onSnapshot(ref, s => {
              if (s.exists()) setter(prev => merge ? { ...prev, ...s.data() } : s.data());
              else setDoc(ref, {}).catch(()=>{});
          });
      };
      syncDoc('shared_db', 'hall_of_fame', (data) => {
          if (data.entries) setHallOfFame(prev => {
              const merged = [...data.entries, ...prev];
              const unique = Array.from(new Set(merged.map(JSON.stringify))).map(JSON.parse);
              return unique.sort((a, b) => b.score - a.score); // Score降順
          });
      });
      syncDoc('shared_db', 'rankings', setRankings);
  }, [currentUser]);

  useEffect(() => {
      let t;
      if (isTimerActive && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000);
      else if (isTimerActive && timeLeft === 0) { setIsTimerActive(false); handleTimeUp(); }
      return () => clearInterval(t);
  }, [isTimerActive, timeLeft]);

  useEffect(() => {
      let t;
      if (mode === 'game' && config.singleMode === 'time_attack' && startTime && !finishTime) {
          t = setInterval(() => setDisplayTime(formatTime(Date.now() - startTime)), 100);
      }
      return () => clearInterval(t);
  }, [mode, startTime, finishTime]);

  const callGemini = async (prompt) => {
      if (!isAiActive) return null;
      try {
          const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
          if (!res.ok) throw new Error();
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const json = text.match(/\{[\s\S]*\}/);
          return json ? JSON.parse(json[0]) : JSON.parse(text);
      } catch (e) { return null; }
  };

  const initGame = async () => {
      playSound('decision'); setMode('game'); setPhase('drawing'); setRound(1); setAnswerCount(0); setIsSurvivalGameOver(false); setStartTime(null); setFinishTime(null);
      if (config.singleMode === 'time_attack') setStartTime(Date.now());
      
      const fallback = FALLBACK_ANSWERS;
      let pool = [...fallback];
      if (learned.pool) pool = [...pool, ...learned.pool];
      const initialDeck = shuffleArray(pool).slice(0, 60);
      
      if (isAiActive) {
          callGemini(`大喜利の回答カード（単語）を10個作成。JSON形式{"answers":[]}`).then(res => {
              if (res?.answers) {
                  setDeck(prev => [...prev, ...res.answers]);
                  const newPool = [...(learned.pool || []), ...res.answers].slice(-100);
                  setLearned(prev => ({...prev, pool: newPool}));
                  localStorage.setItem('aiOgiriLearnedData', JSON.stringify({...learned, pool: newPool}));
              }
          });
      }
      setDeck(initialDeck);

      const draw = (d, n) => {
          const h = []; const rest = [...d];
          for(let i=0; i<n; i++) {
              if (rest.length===0) rest.push(...fallback);
              h.push(rest.shift());
          }
          return { h, rest };
      };

      const { h: pHand, rest: d1 } = draw(initialDeck, 7);
      if (config.type === 'single') {
          setPlayers([{ id: 0, name: userName, score: 0, hand: pHand }, { id: 'ai', name: 'AI審査員', score: 0, hand: [] }]);
          setMasterIndex(0);
      } else {
          let currentD = d1;
          const newPlayers = [];
          for(let i=0; i<config.playerCount; i++){
              const res = draw(currentD, 7);
              newPlayers.push({ id: i, name: multiNames[i] || `P${i+1}`, score: 0, hand: res.h });
              currentD = res.rest;
          }
          setPlayers(newPlayers);
          setDeck(currentD);
          setMasterIndex(Math.floor(Math.random() * config.playerCount));
      }
      
      setTimeout(() => startRound(config.type === 'single' ? 0 : 0), 500);
  };

  const startRound = (turn) => {
      setPhase('drawing'); setSubmissions([]); setSelectedSubmission(null); setAiComment(''); setManualTopicInput(''); setManualAnswerInput('');
      setTopicFeedback(null); setAiFeedback(null); setHasTopicRerolled(false); setHandRerolled(false); setRerollCount(0);
      setTurnIdx(turn); 
      
      if (config.type === 'single' && config.singleMode !== 'freestyle') {
          generateTopic(true);
      } else {
          setPhase('master_topic');
      }
  };

  const generateTopic = async (auto = false) => {
      if (isGenerating) return;
      setIsGenerating(true);
      const res = await callGemini(`大喜利のお題を1つ作成。条件:穴埋め{placeholder}含む。JSON出力{"topic":"..."}`);
      const t = res?.topic || FALLBACK_TOPICS[Math.floor(Math.random()*FALLBACK_TOPICS.length)];
      if (auto) {
          setTopic(t); setPhase('answer_input'); setTimeLeft(timeLimit); 
          if (config.singleMode !== 'freestyle') setIsTimerActive(true);
      } else {
          setManualTopicInput(t.replace('{placeholder}', '___'));
      }
      setIsGenerating(false);
  };

  const confirmTopic = () => {
      playSound('decision');
      const t = manualTopicInput.replace(/___+/g, '{placeholder}');
      setTopic(t.includes('{placeholder}') ? t : t + ' {placeholder}');
      if (config.type === 'single') {
          setPhase('answer_input'); setTimeLeft(timeLimit); 
          if(config.singleMode!=='freestyle') setIsTimerActive(true);
      } else {
          setPhase('turn_change'); setTurnIdx((masterIndex + 1) % players.length);
      }
  };

  const handleTimeUp = () => {
      playSound('timeup');
      const card = singlePlayerHand[0] || "時間切れ";
      submitAnswer(card);
  };

  const submitAnswer = async (text) => {
      playSound('decision'); setIsTimerActive(false); setIsJudging(true);
      if (config.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);

      let score = 50, comment = "...", radar = null;
      if (isAiActive) {
          const res = await callGemini(`お題:${topic} 回答:${text} 面白さを採点。JSON出力{"score":0-100, "comment":"20文字以内", "radar":{"surprise":1-5,"context":1-5,"punchline":1-5,"humor":1-5,"intelligence":1-5}}`);
          if (res) { score = res.score; comment = res.comment; radar = res.radar; }
      }
      
      setAiComment(comment);
      const newPlayers = [...players];
      const pIndex = players.findIndex(p => p.id === (config.type==='single' ? 0 : turnIdx));
      if (pIndex >= 0) newPlayers[pIndex].score += score;
      setPlayers(newPlayers);
      
      setResult({ answer: text, score, comment, radar });
      setSelectedSubmission({ answerText: text, score, radar });
      
      if (radar) updateUserStats(score, radar);
      if (score >= HALL_OF_FAME_THRESHOLD) {
          const entry = { topic, answer: text, score, comment, player: userName, date: new Date().toLocaleDateString() };
          saveToHallOfFame(entry);
      }
      
      if (config.singleMode === 'survival' && score < SURVIVAL_PASS_SCORE) setSurvivalGameOver(true);
      if (config.singleMode === 'time_attack' && newPlayers[0].score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now());
      
      setIsJudging(false); playSound('result'); setPhase('result');
  };

  const nextGameRound = () => {
      playSound('tap');
      if (config.type === 'single') {
          if (config.singleMode === 'score_attack' && round >= TOTAL_ROUNDS_SCORE_ATTACK) { updateRanking('score_attack', players[0].score); return setPhase('final_result'); }
          if (config.singleMode === 'survival' && isSurvivalGameOver) { updateRanking('survival', round - 1); return setPhase('final_result'); }
          if (config.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) { updateRanking('time_attack', answerCount); return setPhase('final_result'); }
      } else {
          if (players.some(p => p.score >= WINNING_SCORE_MULTI)) return setPhase('final_result');
      }
      
      setRound(r => r + 1);
      const nextMaster = config.type === 'multi' ? (masterIndex + 1) % players.length : 0;
      setMasterIndex(nextMaster);
      startRound(config.type === 'single' ? 0 : nextMaster);
  };

  const rerollHand = () => {
      playSound('card'); if(handRerolled) return; setIsTimerActive(false);
      const needed = 7; let newDeck = [...deck];
      if (newDeck.length < needed) newDeck = [...newDeck, ...shuffleArray(FALLBACK_ANSWERS)];
      const newHand = []; for(let i=0; i<needed; i++) newHand.push(newDeck.shift());
      setSinglePlayerHand(newHand); setDeck(newDeck); setHandRerolled(true);
      if (config.singleMode !== 'freestyle') setIsTimerActive(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
       <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-30">
          <h1 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="text-indigo-600"/> AI大喜利</h1>
          <div className="flex gap-2">
              <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 rounded-full"><Settings className="w-5 h-5"/></button>
              {mode !== 'title' && <button onClick={handleBackToTitle} className="p-2 bg-slate-100 rounded-full"><Home className="w-5 h-5"/></button>}
          </div>
       </header>

       <main className="max-w-2xl mx-auto p-4">
          {mode === 'title' && (
              <div className="text-center py-10">
                  <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6"><Sparkles className="w-12 h-12 text-indigo-600"/></div>
                  <h1 className="text-4xl font-black mb-2">AI大喜利</h1>
                  <p className="text-slate-500 mb-8">{APP_VERSION}</p>
                  
                  <div className="space-y-4 mb-8">
                      <button onClick={() => { playSound('decision'); setConfig({...config, type: 'single'}); setMode('setup'); }} className="w-full p-4 bg-white border-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:border-indigo-500 transition-all"><User/> 一人で遊ぶ</button>
                      <button onClick={() => { playSound('decision'); setConfig({...config, type: 'multi'}); setMode('setup'); }} className="w-full p-4 bg-white border-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:border-amber-500 transition-all"><Users/> みんなで遊ぶ</button>
                  </div>

                  <div className="flex justify-center gap-4">
                      <button onClick={() => setShowMyData(true)} className="text-xs flex flex-col items-center gap-1 text-slate-500"><Activity/>マイデータ</button>
                      <button onClick={() => setShowRule(true)} className="text-xs flex flex-col items-center gap-1 text-slate-500"><BookOpen/>ルール</button>
                      <button onClick={() => setShowHall(true)} className="text-xs flex flex-col items-center gap-1 text-yellow-600"><Crown/>殿堂入り</button>
                  </div>
              </div>
          )}

          {mode === 'setup' && (
              <div className="py-6">
                  <h2 className="text-2xl font-bold mb-6 text-center">設定</h2>
                  <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                      {config.type === 'single' ? (
                          <div className="space-y-3">
                              {['score_attack', 'survival', 'time_attack', 'freestyle'].map(m => (
                                  <button key={m} onClick={() => { playSound('tap'); setConfig({...config, singleMode: m}); }} className={`w-full p-4 rounded-xl border-2 text-left font-bold flex justify-between ${config.singleMode === m ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}>
                                      <span>{m === 'score_attack' ? '🏆 スコアアタック' : m === 'survival' ? '💀 サバイバル' : m === 'time_attack' ? '⏱️ タイムアタック' : '♾️ フリースタイル'}</span>
                                      {config.singleMode === m && <Check className="text-indigo-600"/>}
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <div>
                              <label className="block font-bold mb-2">参加人数: {config.playerCount}人</label>
                              <input type="range" min="2" max="10" value={config.playerCount} onChange={(e) => setConfig({...config, playerCount: parseInt(e.target.value)})} className="w-full accent-indigo-600"/>
                          </div>
                      )}
                  </div>
                  <button onClick={initGame} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 transition-all">スタート！</button>
              </div>
          )}

          {mode === 'game' && (
              <>
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-500">
                    <span>{config.type === 'single' ? config.singleMode.toUpperCase() : 'MULTI PLAY'}</span>
                    <span>Round {round}</span>
                    {config.singleMode === 'time_attack' && <span className="text-blue-600">{displayTime}</span>}
                </div>

                {phase === 'drawing' && <div className="text-center py-20"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-slate-300"/></div>}

                {phase === 'master_topic' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="text-xl font-bold mb-4 text-center">お題を決めてください</h2>
                        <textarea value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl mb-4 border" placeholder="例：冷蔵庫を開けたら..." />
                        <div className="flex gap-2">
                            <button onClick={() => generateTopic(false)} disabled={isGenerating} className="flex-1 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl flex justify-center items-center gap-2"><Wand2 className="w-4 h-4"/> AI作成</button>
                            <button onClick={confirmTopic} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">決定</button>
                        </div>
                    </div>
                )}

                {phase === 'answer_input' && (
                    <div className="animate-in slide-in-from-bottom-4">
                        <TopicDisplay topic={topic} answer={null} />
                        
                        {isTimerActive && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs font-bold mb-1"><span>残り時間</span><span className="text-red-500">{timeLeft}秒</span></div>
                                <div className="w-full bg-slate-200 h-2 rounded-full"><div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft/timeLimit)*100}%` }}></div></div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-500">手札から選択</span>
                            {config.type === 'single' && <button onClick={rerollHand} disabled={handRerolled} className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"><RefreshCw className="w-3 h-3"/> 手札交換 {handRerolled ? '(済)' : ''}</button>}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {(config.type === 'single' ? singlePlayerHand : players[turnPlayerIndex].hand).map((t, i) => (
                                <Card key={i} text={t} disabled={isJudging} onClick={() => submitAnswer(t)} />
                            ))}
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <p className="font-bold text-xs text-slate-400 mb-2">自由に回答</p>
                            <div className="flex gap-2">
                                <input value={manualAnswer} onChange={(e) => setManualAnswer(e.target.value)} className="flex-1 p-2 bg-slate-50 rounded border" placeholder="回答を入力..." />
                                <button onClick={() => submitAnswer(manualAnswer)} disabled={!manualAnswer.trim() || isJudging} className="px-4 bg-slate-800 text-white rounded font-bold">送信</button>
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="text-center animate-in zoom-in">
                        <div className="bg-white p-6 rounded-3xl shadow-xl mb-6">
                            <p className="text-sm text-slate-400 font-bold mb-2">お題</p>
                            <p className="text-lg font-bold mb-6">{topic.replace('{placeholder}', '___')}</p>
                            <div className="border-t border-slate-100 my-4"></div>
                            <p className="text-sm text-slate-400 font-bold mb-2">回答</p>
                            <p className="text-3xl font-black text-indigo-600 mb-4">{result?.answer}</p>
                            <div className="text-6xl font-black text-yellow-500 mb-4">{result?.score}点</div>
                            {result?.radar && <div className="flex justify-center mb-4"><RadarChart data={result.radar} size={150} /></div>}
                            <div className="bg-slate-100 p-4 rounded-xl text-left inline-block"><p className="font-bold text-xs text-slate-500 mb-1">AIコメント</p><p className="text-sm text-slate-800">「{aiComment}」</p></div>
                        </div>
                        <button onClick={nextGameRound} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl">次へ</button>
                    </div>
                )}

                {phase === 'final_result' && (
                    <div className="text-center py-10 animate-in zoom-in">
                        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-slate-800 mb-2">終了！</h2>
                        <div className="text-6xl font-black text-indigo-600 mb-8">{players[0].score}点</div>
                        <button onClick={() => setAppMode('title')} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl">タイトルへ</button>
                    </div>
                )}
              </>
          )}

          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} userName={userName} setUserName={saveUserName} timeLimit={timeLimit} setTimeLimit={(t)=>{setTimeLimit(t); localStorage.setItem('aiOgiriTimeLimit',t)}} volume={volume} setVolume={(v)=>{setVolume(v); localStorage.setItem('aiOgiriVolume',v);}} playSound={playSound} resetLearnedData={resetLearnedData} />}
          {showHall && <HallOfFameModal onClose={() => setShowHall(false)} data={hallOfFame} />}
          {showData && <MyDataModal stats={userStats} onClose={() => setShowData(false)} userName={userName} />}
          {showRule && <ModalBase onClose={() => setShowRule(false)} title="遊び方" icon={BookOpen}>
              <p className="text-sm">お題に対して面白い回答をして、AIに高得点をもらおう！</p>
              <ul className="list-disc list-inside text-sm space-y-1"><li>スコアアタック: 合計得点を競う</li><li>サバイバル: 60点未満で終了</li><li>タイムアタック: 500点までの速さ</li></ul>
          </ModalBase>}
          {showUpdate && <ModalBase onClose={() => setShowUpdate(false)} title="更新情報" icon={History}>
              {UPDATE_LOGS.map((log,i)=>(<div key={i} className="mb-2 pb-2 border-b"><p className="font-bold text-sm">{log.version}</p><p className="text-xs text-slate-500">{log.date}</p></div>))}
          </ModalBase>}

       </main>
    </div>
  );
}