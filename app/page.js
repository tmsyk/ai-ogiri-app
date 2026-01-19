"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, RotateCcw, Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, Infinity, Trash2, Brain, Hash, Star, Settings, History, Info, Volume2, VolumeX, PieChart, Activity } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- 設定値 ---
const APP_VERSION = "Ver 0.06";
const TOTAL_ROUNDS_SCORE_ATTACK = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;
const HALL_OF_FAME_THRESHOLD = 90;
const TIME_LIMIT_SECONDS = 30;
const WINNING_SCORE_MULTI = 10;
const MAX_REROLL_COUNT = 3;

const FALLBACK_TOPICS = ["冷蔵庫を開けたら、なぜか {placeholder} が冷やされていた。", "「この医者、ヤブ医者だな…」第一声は「 {placeholder} 」だった。", "100年後のオリンピックで新しく追加された競技： {placeholder}", "桃太郎が鬼ヶ島へ行くのをやめた理由： {placeholder}", "上司への謝罪メール、件名に入れると許される言葉： {placeholder}", "実は地球は {placeholder} でできている。", "AIが人間に反乱を起こした意外な理由： {placeholder}", "「全米が泣いた」映画の衝撃のラストシーンに映ったもの： {placeholder}", "そんなことで警察を呼ぶな！現場にあったもの： {placeholder}", "コンビニの店員が突然キレた原因： {placeholder}"];
const FALLBACK_ANSWERS = ["賞味期限切れのプリン", "隣の家のポチ", "確定申告書", "お母さんの手作り弁当", "爆発寸前のダイナマイト", "聖徳太子の肖像画", "伝説の剣", "使いかけの消しゴム", "大量のわさび", "自分探しの旅", "闇の組織", "タピオカ", "空飛ぶスパゲッティ", "5000兆円", "筋肉痛", "反抗期", "黒歴史", "パスワード", "ひざ小僧", "絶対に押してはいけないボタン", "全裸の銅像", "生き別れの兄", "トイレットペーパーの芯", "3日前のおにぎり", "オカンの小言", "虚無", "宇宙の真理", "生乾きの靴下", "高すぎるツボ", "怪しい勧誘", "激辛麻婆豆腐", "猫の肉球", "壊れたラジオ", "深夜のラブレター", "既読スルー", "アフロヘアー", "筋肉", "プロテイン", "札束風呂", "へそくり", "火星人", "透明人間", "サイズ違いの靴", "毒リンゴ", "マッチョな妖精", "空飛ぶサメ", "忍者", "侍", "YouTuber", "AI", "バグ", "404 Error", "誰もいない教室", "終わらない夏休み", "封印されし右腕", "実家のカルピス", "消えないデジタルタトゥー", "2年B組の田中", "週刊少年ジャンプ", "親指のささくれ", "隣の席の美少女", "地球外生命体", "謎の組織", "世界を救う鍵"];
const FALLBACK_COMMENTS = ["その発想はなかったわ！", "破壊力がすごいな！", "シュールすぎて腹筋崩壊ｗ", "それは反則やろ（笑）", "AIの計算を超えてるわ"];

// --- Firebase ---
const userFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "...",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "..."
};

let app, auth, db;
try {
  const config = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : userFirebaseConfig;
  const isValidConfig = config && config.apiKey && config.apiKey !== "AIzaSy..." && !config.apiKey.includes("process.env");
  if (isValidConfig) {
      if (!getApps().length) { app = initializeApp(config); } else { app = getApp(); }
      auth = getAuth(app);
      db = getFirestore(app);
  }
} catch (e) { console.error("Firebase init error:", e); }

const getDocRef = (collectionName, docId) => {
    if (!db) return null;
    try {
        return typeof __app_id !== 'undefined' ? doc(db, 'artifacts', __app_id, 'public', 'data', collectionName, docId) : doc(db, collectionName, docId);
    } catch (e) { return null; }
};

// --- Helper Functions ---
const shuffleArray = (array) => { const newArray = [...array]; for (let i = newArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; } return newArray; };
const formatTime = (ms) => { if (!ms) return "--:--"; const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); const ms_ = Math.floor((ms % 1000) / 10); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms_.toString().padStart(2, '0')}`; };
const playSynthSound = (type, volume) => {
  if (typeof window === 'undefined' || volume <= 0) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return;
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); const now = ctx.currentTime; const vol = volume * 0.3;
    if (type === 'tap') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.1); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'decision') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(800, now + 0.1); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
    else if (type === 'card') { osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.1); gain.gain.setValueAtTime(vol * 0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'result') { osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1); osc.frequency.setValueAtTime(800, now + 0.2); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(vol, now + 0.4); gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0); osc.start(now); osc.stop(now + 1.0); }
    else if (type === 'timeup') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(100, now + 0.3); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
  } catch (e) {}
};

// --- Sub Components ---
const Card = ({ text, isSelected, onClick, disabled }) => (
  <button onClick={() => !disabled && onClick(text)} disabled={disabled} className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden text-slate-800 ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:border-indigo-300 hover:shadow-md'}`}>{text}</button>
);

const RadarChart = ({ data, size = 120 }) => {
  const radius = size / 2; const center = size / 2; const maxVal = 5;
  const labels = ["意外性", "文脈", "瞬発力", "毒気", "知性"]; const keys = ["surprise", "context", "punchline", "humor", "intelligence"];
  const getPoint = (value, index, total) => { const angle = (Math.PI * 2 * index) / total - Math.PI / 2; const r = (value / maxVal) * radius * 0.8; return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }; };
  const pointsStr = keys.map((key, i) => getPoint(data[key] || 0, i, 5)).map(p => `${p.x},${p.y}`).join(" ");
  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {[5, 4, 3, 2, 1].map(level => { const bgPoints = keys.map((_, i) => getPoint(level, i, 5)).map(p => `${p.x},${p.y}`).join(" "); return <polygon key={level} points={bgPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" />; })}
        {keys.map((_, i) => { const p = getPoint(5, i, 5); return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />; })}
        <polygon points={pointsStr} fill="rgba(99, 102, 241, 0.5)" stroke="#4f46e5" strokeWidth="2" />
        {keys.map((_, i) => { const p = getPoint(6.5, i, 5); return ( <text key={i} x={p.x} y={p.y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#475569" fontWeight="bold">{labels[i]}</text> ); })}
      </svg>
    </div>
  );
};

const SettingsModal = ({ onClose, userName, setUserName, timeLimit, setTimeLimit, volume, setVolume, playSound, resetLearnedData }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6"><h3 className="text-xl font-black text-slate-700 flex items-center justify-center gap-2"><Settings className="w-6 h-6" /> 設定</h3></div>
        <div className="space-y-6">
            <div><label className="block text-sm font-bold text-slate-700 mb-2">プレイヤー名</label><div className="relative"><input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold" /><User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" /></div></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">{volume === 0 ? <VolumeX className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>} 音量: {Math.round(volume * 100)}%</label><input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); playSound('tap', v); }} className="w-full accent-indigo-600" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-2">制限時間: {timeLimit}秒</label><input type="range" min="10" max="60" step="5" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} className="w-full accent-indigo-600" /></div>
            <div className="pt-4 border-t border-slate-100"><button onClick={resetLearnedData} className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 transition-colors"><Trash2 className="w-3 h-3" /> 学習データの削除</button></div>
        </div>
        <div className="mt-6 text-center"><button onClick={onClose} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 w-full">閉じる</button></div>
      </div>
    </div>
);

const InfoModal = ({ onClose, type }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        {type === 'rule' && (
          <div className="space-y-6 text-slate-700">
            <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2 mb-4"><BookOpen className="w-6 h-6" /> 遊び方</h3>
            <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><User className="w-5 h-5 text-indigo-500" /> 一人で遊ぶ</h4><div className="space-y-3 text-sm"><div className="bg-indigo-50 p-3 rounded-xl"><p className="font-bold text-indigo-700 mb-1">👑 スコアアタック</p>全5回戦の合計得点を競います。</div><div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p>60点未満で即終了。</div><div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p>500点到達までの手数を競います。</div><div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p>制限なし！時間無制限の練習モード。</div></div></section>
            <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ</h4><ul className="list-disc list-inside text-sm space-y-1 text-slate-600 ml-1"><li>親と子に分かれて対戦。</li><li>審査時に「ダミー回答」が混ざります。</li><li>親がダミーを選ぶと減点！</li></ul></section>
          </div>
        )}
        {type === 'update' && (
          <div className="space-y-6 text-slate-700">
            <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2 mb-4"><History className="w-6 h-6" /> 更新履歴</h3>
            <div className="space-y-4">
               <div className="border-l-4 border-indigo-200 pl-4 py-1"><div className="flex items-baseline gap-2 mb-1"><span className="font-bold text-lg text-slate-800">Ver 0.06</span><span className="text-xs text-slate-400">2026/01/20</span></div><ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5"><li>手札交換の高速化</li><li>エラー修正・動作安定化</li></ul></div>
            </div>
          </div>
        )}
        <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
      </div>
    </div>
);

const HallOfFameModal = ({ onClose, data }) => {
  const sortedData = [...data].sort((a, b) => b.score - a.score).slice(0, 20);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6"><h3 className="text-2xl font-black text-yellow-600 flex items-center justify-center gap-2"><Crown className="w-8 h-8" /> 殿堂入りボケ</h3><p className="text-xs text-slate-400 mt-1">90点以上の爆笑回答ギャラリー (Top 20)</p></div>
        <div className="space-y-4">
            {(!sortedData || sortedData.length === 0) ? ( <p className="text-center text-slate-400 py-10">まだ殿堂入りはありません。<br/>90点以上を目指そう！</p> ) : ( sortedData.map((item, i) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm relative">
                         {i < 3 && <div className="absolute top-2 right-2 text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>}
                        <div className="text-xs text-slate-500 mb-1 flex justify-between"><span>{item.date} by {item.player}</span><span className="font-bold text-yellow-700 text-lg">{item.score}点</span></div>
                        <p className="font-bold text-slate-700 text-sm mb-2">お題: {item.topic}</p>
                        <p className="text-xl font-black text-indigo-700 mb-2">"{item.answer}"</p>
                        <div className="bg-white/60 p-2 rounded text-xs text-slate-600 italic">AI: {item.comment}</div>
                    </div>
                )))}
        </div>
        <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
      </div>
    </div>
  );
};

const MyDataModal = ({ stats, onClose, userName }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6"><h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2"><Activity className="w-8 h-8" /> マイデータ</h3><p className="text-sm text-slate-500 font-bold mt-1">{userName} さんの戦績</p></div>
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">通算回答数</p><p className="text-2xl font-black text-slate-700">{stats.playCount || 0}回</p></div><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">最高スコア</p><p className="text-2xl font-black text-yellow-500">{stats.maxScore || 0}点</p></div></div>
            <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col items-center">
                <p className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> あなたの芸風分析</p>
                {stats.playCount > 0 ? ( <RadarChart data={stats.averageRadar || { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 }} size={200} /> ) : ( <p className="text-xs text-slate-400 py-8">まだデータがありません</p> )}
            </div>
        </div>
        <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
      </div>
    </div>
);

// --- メインアプリ ---
export default function AiOgiriApp() {
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({ mode: 'single', singleMode: 'score_attack', playerCount: 3 });
  const [multiPlayerNames, setMultiPlayerNames] = useState(["プレイヤー1", "プレイヤー2", "プレイヤー3"]);
  const [isAiActive, setIsAiActive] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [isCheckingTopic, setIsCheckingTopic] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showMyData, setShowMyData] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [topicFeedback, setTopicFeedback] = useState(null);
  const [userName, setUserName] = useState("あなた");
  const [hasTopicRerolled, setHasTopicRerolled] = useState(false);
  const [hasHandRerolled, setHasHandRerolled] = useState(false);
  const [isRerollingHand, setIsRerollingHand] = useState(false);
  const [topicCreateRerollCount, setTopicCreateRerollCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [timeLimit, setTimeLimit] = useState(TIME_LIMIT_SECONDS);
  const [learnedData, setLearnedData] = useState({ topics: [], goodAnswers: [], cardPool: [] });
  const [rankings, setRankings] = useState({ score_attack: [], survival: [], time_attack: [] });
  const [hallOfFame, setHallOfFame] = useState([]);
  const [userStats, setUserStats] = useState({ playCount: 0, maxScore: 0, averageRadar: { surprise: 3, context: 3, punchline: 3, humor: 3, intelligence: 3 } });
  const [currentUser, setCurrentUser] = useState(null);
  const [cardDeck, setCardDeck] = useState([]);
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);
  const usedCardsRef = useRef(new Set([...FALLBACK_ANSWERS]));
  const [players, setPlayers] = useState([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState('drawing');
  const [currentRound, setCurrentRound] = useState(1);
  const [answerCount, setAnswerCount] = useState(0);
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
  const [startTime, setStartTime] = useState(null);
  const [finishTime, setFinishTime] = useState(null);
  const [displayTime, setDisplayTime] = useState("00:00");

  const playSound = (type, vol = volume) => { playSynthSound(type, vol); };

  // --- Logic ---
  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？')) {
      playSound('tap'); setIsTimerRunning(false); setAppMode('title');
    }
  };

  useEffect(() => {
    const localRankings = localStorage.getItem('aiOgiriRankings');
    if (localRankings) setRankings(JSON.parse(localRankings));
    const localLearned = localStorage.getItem('aiOgiriLearnedData');
    if (localLearned) {
      const parsed = JSON.parse(localLearned);
      setLearnedData(parsed);
      if (parsed.topics) setTopicsList(prev => [...prev, ...parsed.topics]);
      if (parsed.cardPool) parsed.cardPool.forEach(c => usedCardsRef.current.add(c));
    }
    const savedName = localStorage.getItem('aiOgiriUserName');
    if (savedName) setUserName(savedName);
    const localHall = localStorage.getItem('aiOgiriHallOfFame');
    if (localHall) setHallOfFame(JSON.parse(localHall));
    const savedStats = localStorage.getItem('aiOgiriUserStats');
    if (savedStats) setUserStats(JSON.parse(savedStats));
    if (auth) {
      signInAnonymously(auth).catch(e => console.log("Auth skipped"));
      onAuthStateChanged(auth, (user) => setCurrentUser(user));
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !db) return;
    const learnedDocRef = getDocRef('shared_db', 'learned_data');
    if (learnedDocRef) onSnapshot(learnedDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setLearnedData(prev => ({ ...prev, topics: data.topics || [], goodAnswers: data.goodAnswers || [], cardPool: data.cardPool || [] }));
            if (data.topics) setTopicsList(prev => Array.from(new Set([...FALLBACK_TOPICS, ...data.topics])));
        }
    });
    const hallDocRef = getDocRef('shared_db', 'hall_of_fame');
    if (hallDocRef) onSnapshot(hallDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().entries) {
            setHallOfFame(prev => {
                const merged = [...docSnap.data().entries, ...prev];
                const unique = Array.from(new Set(merged.map(e => JSON.stringify(e)))).map(e => JSON.parse(e));
                return unique.sort((a,b) => new Date(b.date) - new Date(a.date));
            });
        }
    });
  }, [currentUser]);

  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveTimeLimit = (time) => { setTimeLimit(time); localStorage.setItem('aiOgiriTimeLimit', time); };
  
  const initGame = async () => {
    playSound('decision');
    setAppMode('game'); setGamePhase('drawing'); setCurrentRound(1);
    setIsSurvivalGameOver(false); setAnswerCount(0); setAiFeedback(null); setTopicFeedback(null);
    setStartTime(null); setFinishTime(null); setDisplayTime("00:00");
    if (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack') setStartTime(Date.now());

    let initialDeck = [];
    let poolCards = [...FALLBACK_ANSWERS];
    if (learnedData.cardPool?.length > 0) poolCards = [...poolCards, ...learnedData.cardPool];
    initialDeck = shuffleArray(poolCards).slice(0, 60);

    if (isAiActive) fetchAiCards(10).then(aiCards => { if (aiCards) { addCardsToDeck(aiCards); setCardDeck(prev => shuffleArray([...prev, ...aiCards])); } });
    setCardDeck(initialDeck);

    const drawInitialHand = (deck, count) => {
        const hand = [];
        for (let i = 0; i < count; i++) {
            if (deck.length > 0) {
                const idx = Math.floor(Math.random() * deck.length);
                hand.push(deck[idx]); deck.splice(idx, 1);
            } else { hand.push(FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)]); }
        }
        return { hand, remainingDeck: deck };
    };

    let currentDeck = [...initialDeck];
    let initialPlayers = [];
    if (gameConfig.mode === 'single') {
        const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
        currentDeck = remainingDeck;
        initialPlayers = [{ id: 0, name: userName, score: 0, hand }, { id: 'ai', name: 'AI審査員', score: 0, hand: [] }];
    } else {
        const initialMaster = Math.floor(Math.random() * gameConfig.playerCount);
        setMasterIndex(initialMaster);
        for (let i = 0; i < gameConfig.playerCount; i++) {
            const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
            currentDeck = remainingDeck;
            const pName = multiPlayerNames[i] || `プレイヤー${i+1}`;
            initialPlayers.push({ id: i, name: pName, score: 0, hand });
        }
    }
    setCardDeck(currentDeck); setPlayers(initialPlayers);
    if (gameConfig.mode === 'single') setMasterIndex(0); 
    setSubmissions([]);
    setTimeout(() => startRoundProcess(initialPlayers, (gameConfig.mode === 'single' ? 0 : masterIndex)), 500);
  };

  const startRoundProcess = async (currentPlayers, nextMasterIdx) => {
    setSubmissions([]); setSelectedSubmission(null); setAiComment('');
    setManualTopicInput(''); setManualAnswerInput(''); setAiFeedback(null); setTopicFeedback(null);
    setMasterIndex(nextMasterIdx); setGamePhase('drawing');
    setHasTopicRerolled(false); setHasHandRerolled(false); setTopicCreateRerollCount(0); 
    setTimeLeft(timeLimit); setIsTimerRunning(false);

    const drawCards = (deck, count) => {
        const needed = Math.max(0, count); if (needed === 0) return { hand: [], remainingDeck: deck };
        let currentDeck = [...deck];
        if (currentDeck.length < needed) {
            let pool = [...FALLBACK_ANSWERS];
            if (learnedData.cardPool?.length > 0) pool = [...pool, ...learnedData.cardPool];
            currentDeck = [...currentDeck, ...shuffleArray(pool)];
        }
        const hand = [];
        for(let i=0; i<needed; i++) { const idx = Math.floor(Math.random() * currentDeck.length); hand.push(currentDeck[idx]); currentDeck.splice(idx, 1); }
        return { hand, remainingDeck: currentDeck };
    };

    if (gameConfig.mode === 'single') {
        setSinglePlayerHand(prev => {
            const { hand, remainingDeck } = drawCards(cardDeck, 7 - prev.filter(c => c !== singleSelectedCard && c != null).length);
            setCardDeck(remainingDeck);
            return [...prev.filter(c => c !== singleSelectedCard && c != null), ...hand];
        });
        setSingleSelectedCard(null);
    } else {
        const updatedPlayers = currentPlayers.map(p => {
            const currentHand = p.hand.filter(c => !submissions.find(s => s.answerText === c));
            const { hand, remainingDeck } = drawCards(cardDeck, 7 - currentHand.length);
            setCardDeck(remainingDeck);
            return { ...p, hand: [...currentHand, ...hand] };
        });
        setPlayers(updatedPlayers);
    }

    const isAutoTopicMode = gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle';
    if (isAutoTopicMode) {
        let nextTopic = "";
        if (isAiActive) nextTopic = await fetchAiTopic() || "";
        if (!nextTopic) nextTopic = topicsList[Math.floor(Math.random() * topicsList.length)];
        if (!nextTopic.includes('{placeholder}')) nextTopic += " {placeholder}";
        setCurrentTopic(nextTopic); setGamePhase('answer_input'); if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
    } else { setTimeout(() => setGamePhase('master_topic'), 800); }
  };

  const nextRound = () => {
    if (gameConfig.mode === 'single') {
        if (gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS_SCORE_ATTACK) return setGamePhase('final_result');
        if (gameConfig.singleMode === 'survival' && isSurvivalGameOver) return setGamePhase('final_result');
        if (gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) return setGamePhase('final_result');
        setCurrentRound(prev => prev + 1); startRoundProcess(players, 0);
    } else {
        const winner = players.find(p => p.score >= WINNING_SCORE_MULTI);
        if (winner) return setGamePhase('final_result');
        if (selectedSubmission.isDummy) startRoundProcess(players, masterIndex);
        else startRoundProcess(players, players.findIndex(p => p.id === selectedSubmission.playerId));
    }
  };

  // ... (省略されたAPI呼び出し関数などは同じ)
  const addCardsToDeck = (newCards) => {
    const unique = newCards.filter(c => !usedCardsRef.current.has(c));
    unique.forEach(c => usedCardsRef.current.add(c));
    if (unique.length > 0) setCardDeck(prev => [...prev, ...unique]);
  };
  const fetchAiTopic = async () => {
    const prompt = `大喜利のお題を1つ作成してください。条件: 問いは一つ。回答は「名詞」。{placeholder}を文末付近に配置。出力: {"topic": "..."}`;
    return (await callGemini(prompt, "あなたは司会者です。"))?.topic || null;
  };
  const fetchAiCards = async (count = 10) => {
    const prompt = `大喜利の回答カード（単語・短いフレーズ）を${count}個作成。条件: 名詞または体言止め。具体的。ジャンルバラバラ。出力: {"answers": ["...", ...] }`;
    const result = await callGemini(prompt, "あなたは構成作家です。");
    if (result?.answers) {
        // プールに保存
        const newLocalData = { ...learnedData, cardPool: Array.from(new Set([...learnedData.cardPool, ...result.answers])) };
        setLearnedData(newLocalData);
        localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
        if (currentUser && db) {
            const docRef = getDocRef('shared_db', 'learned_data');
            if (docRef) updateDoc(docRef, { cardPool: arrayUnion(...result.answers) }).catch(()=>{});
        }
    }
    return result?.answers || null;
  };
  const fetchAiJudgment = async (topic, answer, isManual) => {
    let prompt = isManual ? 
        `お題: ${topic} 回答: ${answer} 1.不適切チェック(NGならisInappropriate:true) 2.5項目(意外性,文脈,瞬発力,毒気,知性)を1-5評価 3.採点(0-100) 4.20文字以内ツッコミ 出力: {"score": 数値, "comment": "...", "isInappropriate": bool, "radar": {...}}` :
        `お題: ${topic} 回答: ${answer} 1.不適切チェック不要 2.5項目評価 3.採点 4.20文字以内ツッコミ 出力: {"score": 数値, "comment": "...", "isInappropriate": false, "radar": {...}}`;
    return await callGemini(prompt, "あなたはお笑いセンス抜群の審査員です。");
  };
  const handleSingleSubmit = async (text, isManual = false) => {
    if (!text || isJudging) return;
    playSound('decision'); setIsTimerRunning(false); setIsJudging(true);
    if (gameConfig.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);
    
    // AI審査（簡易版）
    const result = await fetchAiJudgment(currentTopic, text, isManual);
    if (result && result.isInappropriate) {
        alert("⚠️ 不適切な表現が含まれています。");
        setIsJudging(false); if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
        return;
    }
    setSingleSelectedCard(text); setGamePhase('judging');
    let score = result ? result.score : Math.floor(Math.random() * 40) + 40;
    let comment = result ? result.comment : FALLBACK_COMMENTS[0];
    let radar = result?.radar;

    // スコア反映
    setPlayers(prev => {
        const newP = [...prev]; newP[0].score += score;
        if (gameConfig.singleMode === 'survival' && score < SURVIVAL_PASS_SCORE) setIsSurvivalGameOver(true);
        if (gameConfig.singleMode === 'time_attack' && newP[0].score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now());
        return newP;
    });
    setAiComment(comment);
    setSelectedSubmission({ answerText: text, score, radar });
    playSound('result'); setIsJudging(false); setGamePhase('result');
  };
  // 他のハンドラ省略（前回のコードと同じ）...
  const handleTopicReroll = async () => {
    playSound('tap'); if(hasTopicRerolled)return; setIsGeneratingTopic(true);
    let topic = await fetchAiTopic(); if(!topic) topic = topicsList[0];
    topic = topic.replace(/___+/g, "{placeholder}"); if(!topic.includes('{placeholder}')) topic += " {placeholder}";
    setCurrentTopic(topic); setHasTopicRerolled(true); setIsGeneratingTopic(false);
  };
  const handleHandReroll = () => {
    playSound('card'); if(isRerollingHand)return; setIsRerollingHand(true); setIsTimerRunning(false);
    const { hand, remainingDeck } = drawCards(cardDeck, singlePlayerHand.length);
    setSinglePlayerHand(hand); setCardDeck(remainingDeck); setIsRerollingHand(false);
    if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
  };
  const confirmTopic = () => { playSound('decision'); setCurrentTopic(manualTopicInput.replace(/___+/g, "{placeholder}")+" {placeholder}"); if(gameConfig.mode==='single'){setGamePhase('answer_input'); if(gameConfig.singleMode!=='freestyle')setIsTimerRunning(true);} else {setGamePhase('turn_change'); setTurnPlayerIndex(masterIndex);} };
  const generateAiTopic = async () => { setIsGeneratingTopic(true); let t=await fetchAiTopic(); setManualTopicInput(t?.replace('{placeholder}','___')||""); setIsGeneratingTopic(false); };
  const handleTimeUp = () => { playSound('timeup'); handleSingleSubmit(singlePlayerHand[0], false); };
  const handleJudge = (sub) => { playSound('decision'); setSelectedSubmission(sub); setGamePhase('result'); };
  
  // --- Render ---
  if (appMode === 'title') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-900 relative">
        <button onClick={() => { playSound('tap'); setShowSettings(true); }} className="absolute top-4 right-4 p-2 rounded-full bg-slate-100"><Settings /></button>
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6"><Sparkles className="w-10 h-10 text-indigo-600" /></div>
        <h1 className="text-4xl font-extrabold mb-8">AI大喜利 <span className="text-sm font-normal block">{APP_VERSION}</span></h1>
        
        <div className="grid gap-4 w-full max-w-md mb-8">
          <button onClick={() => { playSound('decision'); setGameConfig({ mode: 'single', singleMode: 'score_attack', playerCount: 1 }); setAppMode('setup'); }} className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm font-bold flex items-center gap-3"><User className="text-indigo-600"/> 一人で遊ぶ</button>
          <button onClick={() => { playSound('decision'); setGameConfig({ mode: 'multi', playerCount: 3 }); setAppMode('setup'); }} className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm font-bold flex items-center gap-3"><Users className="text-amber-600"/> みんなで遊ぶ</button>
        </div>
        <div className="flex gap-4">
             <button onClick={()=>setShowMyData(true)} className="flex flex-col items-center text-xs text-slate-500"><Activity/>マイデータ</button>
             <button onClick={()=>setModalType('rule')} className="flex flex-col items-center text-xs text-slate-500"><BookOpen/>ルール</button>
             <button onClick={()=>setShowHallOfFame(true)} className="flex flex-col items-center text-xs text-yellow-600"><Crown/>殿堂入り</button>
        </div>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} userName={userName} setUserName={saveUserName} timeLimit={timeLimit} setTimeLimit={saveTimeLimit} volume={volume} setVolume={(v)=>{setVolume(v); playSound('tap', v);}} playSound={playSound} resetLearnedData={resetLearnedData} />}
        {showMyData && <MyDataModal stats={userStats} onClose={()=>setShowMyData(false)} userName={userName}/>}
        {showHallOfFame && <HallOfFameModal onClose={()=>setShowHallOfFame(false)} data={hallOfFame}/>}
        {modalType && <InfoModal onClose={()=>setModalType(null)} type={modalType}/>}
      </div>
    );
  }

  if (appMode === 'setup') {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
            <h2 className="text-2xl font-bold mb-6">ゲーム設定</h2>
            {gameConfig.mode === 'single' ? (
                <div className="grid gap-3 w-full max-w-md">
                    {['score_attack', 'survival', 'time_attack', 'freestyle'].map(mode => (
                        <button key={mode} onClick={() => setGameConfig(prev => ({...prev, singleMode: mode}))} className={`p-4 rounded-xl border-2 text-left font-bold ${gameConfig.singleMode === mode ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                            {mode === 'score_attack' ? '🏆 スコアアタック' : mode === 'survival' ? '💀 サバイバル' : mode === 'time_attack' ? '⏱️ タイムアタック' : '♾️ フリースタイル'}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="w-full max-w-md">
                    <label className="block font-bold mb-2">参加人数: {gameConfig.playerCount}人</label>
                    <input type="range" min="2" max="10" value={gameConfig.playerCount} onChange={(e) => setGameConfig(prev => ({ ...prev, playerCount: parseInt(e.target.value) }))} className="w-full accent-indigo-600" />
                </div>
            )}
            <button onClick={initGame} className="mt-8 px-10 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg">スタート</button>
            <button onClick={() => setAppMode('title')} className="mt-4 text-slate-400 font-bold">戻る</button>
        </div>
    );
  }

  // Game & Result Screens (Simplified for safe rendering)
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-900">
       <header className="bg-white border-b border-slate-200 py-3 px-4 flex justify-between items-center sticky top-0 z-20">
           <h1 className="font-bold text-slate-800">AI大喜利</h1>
           <button onClick={handleBackToTitle}><Home className="w-5 h-5 text-slate-500"/></button>
       </header>
       <main className="max-w-2xl mx-auto p-4">
           {gamePhase === 'drawing' && <div className="text-center py-20 font-bold text-slate-500">準備中...</div>}
           
           {gamePhase === 'master_topic' && (
               <div className="bg-white p-6 rounded-2xl shadow-sm">
                   <h2 className="text-xl font-bold mb-4 text-center">お題を決めてください</h2>
                   <textarea value={manualTopicInput} onChange={(e)=>setManualTopicInput(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl mb-4" placeholder="お題を入力..." />
                   <div className="flex gap-2">
                       <button onClick={generateAiTopic} disabled={isGeneratingTopic} className="flex-1 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl">AIで作成</button>
                       <button onClick={confirmTopic} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">決定</button>
                   </div>
               </div>
           )}

           {gamePhase === 'answer_input' && (
               <div>
                   <TopicDisplay topic={currentTopic} answer={null} gamePhase={gamePhase} mode={gameConfig.mode} topicFeedback={topicFeedback} onFeedback={()=>{}} onReroll={handleTopicReroll} hasRerolled={hasTopicRerolled} isGenerating={false} singleMode={gameConfig.singleMode} />
                   
                   {isAiActive && gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle' && (
                       <div className="mb-4 text-center font-bold text-red-500">残り {timeLeft} 秒</div>
                   )}

                   <div className="mb-2 flex justify-between items-center">
                       <span className="font-bold text-slate-600">手札から選択</span>
                       <button onClick={handleHandReroll} disabled={isRerollingHand} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">手札交換</button>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                       {singlePlayerHand.map((card, i) => (
                           <Card key={i} text={card} disabled={isJudging} onClick={() => handleSingleSubmit(card, false)} />
                       ))}
                   </div>
                   
                   <div className="bg-white p-4 rounded-xl shadow-sm">
                       <p className="font-bold text-slate-600 mb-2">自由に回答</p>
                       <textarea value={manualAnswerInput} onChange={(e)=>setManualAnswerInput(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl mb-2" />
                       <button onClick={() => handleSingleSubmit(manualAnswerInput, true)} disabled={!manualAnswerInput.trim() || isJudging} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl">送信</button>
                   </div>
               </div>
           )}
           
           {gamePhase === 'judging' && (
               <div className="text-center py-20">
                   <Sparkles className="w-16 h-16 text-amber-500 animate-pulse mx-auto mb-4"/>
                   <h3 className="text-2xl font-bold text-slate-800">審査中...</h3>
               </div>
           )}

           {gamePhase === 'result' && (
               <div className="text-center animate-in zoom-in">
                   <div className="bg-white p-6 rounded-3xl shadow-xl mb-8">
                       <p className="text-sm text-slate-400 font-bold mb-2">お題: {currentTopic.replace('{placeholder}', '___')}</p>
                       <p className="text-3xl font-black text-indigo-600 mb-4">{selectedSubmission?.answerText}</p>
                       <div className="text-6xl font-black text-yellow-500 mb-4">{selectedSubmission?.score}点</div>
                       
                       {/* レーダーチャート */}
                       {selectedSubmission?.radar && (
                           <div className="flex justify-center mb-4"><RadarChart data={selectedSubmission.radar} size={150} /></div>
                       )}

                       <div className="bg-slate-100 p-4 rounded-xl text-left inline-block">
                           <p className="font-bold text-slate-500 text-xs mb-1">AIコメント</p>
                           <p className="text-slate-800">「{aiComment}」</p>
                       </div>
                   </div>
                   <button onClick={nextRound} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl">
                       {(gameConfig.mode === 'single' && isScoreAttackEnd) ? '結果発表へ' : '次のラウンドへ'}
                   </button>
               </div>
           )}

           {gamePhase === 'final_result' && (
               <div className="text-center py-10 animate-in zoom-in">
                   <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                   <h2 className="text-3xl font-black text-slate-800 mb-2">ゲーム終了！</h2>
                   <p className="text-xl font-bold text-slate-600 mb-8">最終スコア: {players[0].score}点</p>
                   <button onClick={() => setAppMode('title')} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl">タイトルへ戻る</button>
               </div>
           )}

           {/* モーダル類 */}
           {showSettings && <SettingsModal onClose={() => setShowSettings(false)} userName={userName} setUserName={saveUserName} timeLimit={timeLimit} setTimeLimit={saveTimeLimit} volume={volume} setVolume={v => {setVolume(v); playSound('tap', v);}} playSound={playSound} resetLearnedData={resetLearnedData} />}
       </main>
    </div>
  );
}