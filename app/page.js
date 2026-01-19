"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, RotateCcw, Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, Infinity, Trash2, Brain, Hash, Star, Settings, History, Info, Volume2, VolumeX, PieChart, Activity } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- バージョン情報 ---
const APP_VERSION = "Ver 0.04";
const UPDATE_LOGS = [
  { version: "Ver 0.04", date: "2026/01/19", content: ["マルチプレイ：全員の名前設定、10点先取ルール、親ランダム決定を追加", "フリースタイル：時間制限を撤廃", "殿堂入り：高得点順に上位20件のみ表示", "お題作成：AI提案回数を制限"] },
  { version: "Ver 0.03", date: "2026/01/18", content: ["5つの評価軸（レーダーチャート）を実装", "マイデータ画面の追加", "AI採点ロジックの高度化"] },
  { version: "Ver 0.02", date: "2026/01/18", content: ["効果音(SE)の実装", "設定画面（時間・音量）の追加", "回答カードのリフレッシュロジック改善", "連打防止・タイマー制御の強化"] },
];

// --- Firebase設定 ---
const userFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "...",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "..."
};

// --- Firebase初期化 ---
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
        if (typeof __app_id !== 'undefined') {
            return doc(db, 'artifacts', __app_id, 'public', 'data', collectionName, docId);
        } else {
            return doc(db, collectionName, docId);
        }
    } catch (e) { return null; }
};

// --- Web Audio API (SE) ---
const playSynthSound = (type, volume) => {
  if (typeof window === 'undefined' || volume <= 0) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const vol = volume * 0.3;

    if (type === 'tap') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'decision') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'card') {
      osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'result') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1); osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(vol, now + 0.4); gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      osc.start(now); osc.stop(now + 1.0);
    } else if (type === 'timeup') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  } catch (e) {}
};

// --- 定数・フォールバック ---
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
  "透明人間", "サイズ違いの靴", "毒リンゴ", "マッチョな妖精", "空飛ぶサメ", "忍者", "侍", "YouTuber", "AI", "バグ", "404 Error"
];
const FALLBACK_COMMENTS = ["その発想はなかったわ！", "破壊力がすごいな！", "シュールすぎて腹筋崩壊ｗ", "それは反則やろ（笑）", "AIの計算を超えてるわ"];

const TOTAL_ROUNDS_SCORE_ATTACK = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;
const HALL_OF_FAME_THRESHOLD = 90;
const TIME_LIMIT_SECONDS = 30;
const WINNING_SCORE_MULTI = 10; // マルチプレイの勝利点
const MAX_REROLL_COUNT = 3; // AIお題作成のリロール上限

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

// --- サブコンポーネント ---

const RadarChart = ({ data, size = 120 }) => {
  const radius = size / 2;
  const center = size / 2;
  const maxVal = 5;
  const labels = ["意外性", "文脈", "瞬発力", "毒気", "知性"];
  const keys = ["surprise", "context", "punchline", "humor", "intelligence"];
  const getPoint = (value, index, total) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / maxVal) * radius * 0.8;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  const points = keys.map((key, i) => getPoint(data[key] || 0, i, 5));
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(" ");
  const bgLevels = [5, 4, 3, 2, 1];

  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {bgLevels.map(level => {
           const bgPoints = keys.map((_, i) => getPoint(level, i, 5)).map(p => `${p.x},${p.y}`).join(" ");
           return <polygon key={level} points={bgPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {keys.map((_, i) => {
            const p = getPoint(5, i, 5);
            return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        <polygon points={pointsStr} fill="rgba(99, 102, 241, 0.5)" stroke="#4f46e5" strokeWidth="2" />
        {keys.map((_, i) => {
            const p = getPoint(6.5, i, 5);
            return ( <text key={i} x={p.x} y={p.y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#475569" fontWeight="bold">{labels[i]}</text> );
        })}
      </svg>
    </div>
  );
};

const MyDataModal = ({ stats, onClose, userName }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2"><Activity className="w-8 h-8" /> マイデータ</h3>
            <p className="text-sm text-slate-500 font-bold mt-1">{userName} さんの戦績</p>
        </div>
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">通算回答数</p><p className="text-2xl font-black text-slate-700">{stats.playCount || 0}回</p></div>
                <div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">最高スコア</p><p className="text-2xl font-black text-yellow-500">{stats.maxScore || 0}点</p></div>
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col items-center">
                <p className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> あなたの芸風分析</p>
                {stats.playCount > 0 ? ( <RadarChart data={stats.averageRadar || { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 }} size={200} /> ) : ( <p className="text-xs text-slate-400 py-8">まだデータがありません</p> )}
                <p className="text-xs text-center text-indigo-400 mt-4">※AI審査員の評価傾向を表示しています</p>
            </div>
        </div>
        <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
      </div>
    </div>
);

const Card = ({ text, isSelected, onClick, disabled }) => (
  <button onClick={() => !disabled && onClick(text)} disabled={disabled} className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden text-slate-800 ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}>{text}</button>
);

const TopicDisplay = ({ topic, answer, gamePhase, mode, topicFeedback, onFeedback, onReroll, hasRerolled, isGenerating, singleMode }) => (
  <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-6 relative overflow-hidden min-h-[140px] flex flex-col justify-center transition-all duration-300">
    <div className="absolute top-2 right-2 flex gap-2 z-20">
       {gamePhase === 'answer_input' && mode === 'single' && (
           <div className="flex gap-2">
               {topicFeedback === null ? (
                  <button onClick={() => onFeedback(true)} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-yellow-400/80 hover:text-yellow-900 text-white transition-all backdrop-blur-sm border border-white/20"><Star className="w-3 h-3" /> 良問</button>
               ) : ( <span className="text-[10px] px-2 py-1 rounded bg-yellow-400 text-yellow-900 flex items-center gap-1 font-bold animate-in zoom-in"><Check className="w-3 h-3" /> 評価済</span> )}
               {singleMode !== 'freestyle' && (
                   <button onClick={onReroll} disabled={hasRerolled || isGenerating} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded backdrop-blur-sm border border-white/20 transition-all ${hasRerolled ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed' : 'bg-white/10 hover:bg-white/30 text-white'}`}><RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />{hasRerolled ? '変更済' : 'お題変更'}</button>
               )}
           </div>
       )}
    </div>
    <MessageSquare className="absolute top-[-10px] right-[-10px] w-32 h-32 text-white/5" />
    <h3 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">お題</h3>
    <p className="text-xl md:text-2xl font-bold leading-relaxed relative z-10">{topic.split('{placeholder}').map((part, i, arr) => (<React.Fragment key={i}>{part}{i < arr.length - 1 && (<span className="inline-block bg-white/20 text-indigo-200 px-2 py-1 rounded mx-1 border-b-2 border-indigo-400 min-w-[80px] text-center">{answer || '？？？'}</span>)}</React.Fragment>))}</p>
  </div>
);

const RankingList = ({ mode, data, unit }) => (
  <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200">
    <div className="flex items-center gap-2 mb-3 font-bold text-slate-600"><Crown className="w-4 h-4 text-yellow-500" /><span>歴代トップ3</span></div>
    {data && data.length > 0 ? (
      <ul className="space-y-2 text-sm">{data.map((rank, i) => (<li key={i} className="flex justify-between items-center border-b border-slate-100 last:border-0 pb-1"><span className="font-bold text-slate-500 w-6">#{i+1}</span><span className="font-bold text-indigo-700">{mode === 'time_attack' ? formatTime(rank.value) : rank.value}<span className="text-xs text-slate-400 font-normal ml-1">{unit}</span></span><span className="text-xs text-slate-400">{rank.date}</span></li>))}</ul>
    ) : (<p className="text-xs text-slate-400 text-center py-2">記録はまだありません</p>)}
  </div>
);

const HallOfFameModal = ({ onClose, data }) => {
  // スコア順にソートしてトップ20のみ表示
  const sortedData = [...data].sort((a, b) => b.score - a.score).slice(0, 20);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-yellow-600 flex items-center justify-center gap-2"><Crown className="w-8 h-8" /> 殿堂入りボケ</h3>
            <p className="text-xs text-slate-400 mt-1">90点以上の爆笑回答ギャラリー (Top 20)</p>
        </div>
        <div className="space-y-4">
            {(!sortedData || sortedData.length === 0) ? (
                <p className="text-center text-slate-400 py-10">まだ殿堂入りはありません。<br/>90点以上を目指そう！</p>
            ) : (
                sortedData.map((item, i) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm relative">
                         {i < 3 && <div className="absolute top-2 right-2 text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>}
                        <div className="text-xs text-slate-500 mb-1 flex justify-between">
                            <span>{item.date} by {item.player}</span>
                            <span className="font-bold text-yellow-700 text-lg">{item.score}点</span>
                        </div>
                        <p className="font-bold text-slate-700 text-sm mb-2">お題: {item.topic}</p>
                        <p className="text-xl font-black text-indigo-700 mb-2">"{item.answer}"</p>
                        <div className="bg-white/60 p-2 rounded text-xs text-slate-600 italic">AI: {item.comment}</div>
                    </div>
                ))
            )}
        </div>
        <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
      </div>
    </div>
  );
};

const InfoModal = ({ onClose, type }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
    <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
      {type === 'rule' && (
        <div className="space-y-6 text-slate-700">
          <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2 mb-4"><BookOpen className="w-6 h-6" /> 遊び方</h3>
          <section>
             <h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><User className="w-5 h-5 text-indigo-500" /> 一人で遊ぶ</h4>
             <div className="space-y-3 text-sm">
                <div className="bg-indigo-50 p-3 rounded-xl"><p className="font-bold text-indigo-700 mb-1">👑 スコアアタック</p>全5回戦の合計得点を競います。</div>
                <div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p>60点未満で即終了。</div>
                <div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p>500点到達までの手数を競います。</div>
                <div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p>制限なし！お題も自作OKの練習モード。<span className="text-red-500 font-bold">※時間制限なし</span></div>
             </div>
          </section>
          <section>
             <h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ（2人～）</h4>
             <ul className="list-disc list-inside text-sm space-y-1 text-slate-600 ml-1">
              <li>1人が「親」、残りが「子」になります（親はランダム）。</li>
              <li>スマホを回して回答し、親が一番面白いものを選びます。</li>
              <li>審査時に<span className="font-bold text-red-500">「AIのダミー回答」</span>が1つ混ざります。</li>
              <li>親がダミーを選ぶと<span className="font-bold">親が-1点</span>！ 見抜ければ得点なし。</li>
              <li>子が選ばれると<span className="font-bold">その子に+1点</span>で次の親になります。</li>
              <li><span className="font-bold text-indigo-600">10点先取</span>した人が優勝です！</li>
            </ul>
          </section>
        </div>
      )}
      {type === 'update' && (
        <div className="space-y-6 text-slate-700">
          <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2 mb-4"><History className="w-6 h-6" /> 更新履歴</h3>
          <div className="space-y-4">
            {UPDATE_LOGS.map((log, i) => (
              <div key={i} className="border-l-4 border-indigo-200 pl-4 py-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-lg text-slate-800">{log.version}</span>
                  <span className="text-xs text-slate-400">{log.date}</span>
                </div>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                  {log.content.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
    </div>
  </div>
);

// --- メインコンポーネント ---
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
  const [aiFeedback, setAiFeedback] = useState(null);
  const [topicFeedback, setTopicFeedback] = useState(null);
  const [userName, setUserName] = useState("あなた");

  const [hasTopicRerolled, setHasTopicRerolled] = useState(false);
  const [hasHandRerolled, setHasHandRerolled] = useState(false);
  const [isRerollingHand, setIsRerollingHand] = useState(false);
  
  // お題作成リロール回数
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

  const playSound = (type) => { playSynthSound(type, volume); };

  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？\n進行中のゲームデータは失われます。')) {
      playSound('tap');
      setIsTimerRunning(false);
      setAppMode('title');
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
    const savedVolume = localStorage.getItem('aiOgiriVolume');
    if (savedVolume) setVolume(parseFloat(savedVolume));
    const savedTime = localStorage.getItem('aiOgiriTimeLimit');
    if (savedTime) setTimeLimit(parseInt(savedTime));

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
        } else { setDoc(learnedDocRef, { topics: [], goodAnswers: [], cardPool: [] }).catch(() => {}); }
    });
    const hallDocRef = getDocRef('shared_db', 'hall_of_fame');
    if (hallDocRef) onSnapshot(hallDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.entries) setHallOfFame(prev => {
                const merged = [...data.entries, ...prev];
                const unique = Array.from(new Set(merged.map(e => JSON.stringify(e)))).map(e => JSON.parse(e));
                return unique.sort((a,b) => new Date(b.date) - new Date(a.date));
            });
        } else { setDoc(hallDocRef, { entries: [] }).catch(() => {}); }
    });
    const rankingDocRef = getDocRef('shared_db', 'rankings');
    if (rankingDocRef) onSnapshot(rankingDocRef, (docSnap) => { if (docSnap.exists()) setRankings(docSnap.data()); });
  }, [currentUser]);

  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveVolume = (vol) => { setVolume(vol); localStorage.setItem('aiOgiriVolume', vol); };
  const saveTimeLimit = (time) => { setTimeLimit(time); localStorage.setItem('aiOgiriTimeLimit', time); };
  const updateUserStats = (score, radar) => {
      setUserStats(prev => {
          const newCount = prev.playCount + 1;
          const newMax = Math.max(prev.maxScore, score);
          const alpha = 0.1;
          const newRadar = {
              surprise: prev.averageRadar.surprise * (1 - alpha) + (radar.surprise || 3) * alpha,
              context: prev.averageRadar.context * (1 - alpha) + (radar.context || 3) * alpha,
              punchline: prev.averageRadar.punchline * (1 - alpha) + (radar.punchline || 3) * alpha,
              humor: prev.averageRadar.humor * (1 - alpha) + (radar.humor || 3) * alpha,
              intelligence: prev.averageRadar.intelligence * (1 - alpha) + (radar.intelligence || 3) * alpha,
          };
          const newData = { playCount: newCount, maxScore: newMax, averageRadar: newRadar };
          localStorage.setItem('aiOgiriUserStats', JSON.stringify(newData));
          return newData;
      });
  };
  const saveGeneratedCards = async (newCards) => {
    if (!newCards || newCards.length === 0) return;
    const updatedPool = [...(learnedData.cardPool || []), ...newCards];
    const uniquePool = Array.from(new Set(updatedPool));
    const newLocalData = { ...learnedData, cardPool: uniquePool };
    setLearnedData(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    if (currentUser && db) { const docRef = getDocRef('shared_db', 'learned_data'); if (docRef) { try { await updateDoc(docRef, { cardPool: arrayUnion(...newCards) }); } catch (e) {} } }
  };
  const saveToHallOfFame = async (entry) => {
    const newLocalHall = [entry, ...hallOfFame];
    setHallOfFame(newLocalHall);
    localStorage.setItem('aiOgiriHallOfFame', JSON.stringify(newLocalHall));
    if (currentUser && db) { const docRef = getDocRef('shared_db', 'hall_of_fame'); if (docRef) await updateDoc(docRef, { entries: arrayUnion(entry) }).catch(() => {}); }
  };
  const saveLearnedTopic = async (newTopic) => {
    const newLocalData = { ...learnedData, topics: [...learnedData.topics, newTopic] };
    setLearnedData(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    if (currentUser && db) { const docRef = getDocRef('shared_db', 'learned_data'); if (docRef) await updateDoc(docRef, { topics: arrayUnion(newTopic) }).catch(() => {}); }
  };
  const saveLearnedAnswer = async (newAnswer) => {
    const newLocalData = { ...learnedData, goodAnswers: [...learnedData.goodAnswers, newAnswer] };
    setLearnedData(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    if (currentUser && db) { const docRef = getDocRef('shared_db', 'learned_data'); if (docRef) await updateDoc(docRef, { goodAnswers: arrayUnion(newAnswer) }).catch(() => {}); }
  };
  const resetLearnedData = () => {
    if (window.confirm("この端末に保存されたAIの学習データをリセットしますか？")) {
      const emptyData = { topics: [], goodAnswers: [], cardPool: [] };
      setLearnedData(emptyData);
      localStorage.removeItem('aiOgiriLearnedData');
      setTopicsList([...FALLBACK_TOPICS]);
      playSound('timeup');
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
        if (docRef) { try { const docSnap = await getDoc(docRef); if (docSnap.exists()) { const currentData = docSnap.data(); const currentList = currentData[mode] || []; const newEntry = { value, date: new Date().toLocaleDateString() }; let newList = [...currentList, newEntry]; if (mode === 'score_attack' || mode === 'survival') newList.sort((a, b) => b.value - a.value); else if (mode === 'time_attack') newList.sort((a, b) => a.value - b.value); await updateDoc(docRef, { [mode]: newList.slice(0, 3) }); } } catch (e) {} }
    }
  };

  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      setIsTimerRunning(false); handleTimeUp();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

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

  const callGemini = async (prompt, systemInstruction = "") => {
    if (!isAiActive) return null;
    try {
      const response = await fetch('/api/gemini', {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    try { const result = await callGemini(prompt, "あなたは厳格なコンテンツモデレーターです。"); if (result === null) return true; return result?.isInappropriate || false; } catch (e) { return false; }
  };
  const fetchAiTopic = async () => {
    const referenceTopics = shuffleArray(learnedData.topics).slice(0, 3).join("\n");
    const referenceText = referenceTopics ? `参考にすべき過去の良質なお題例(ユーザー作成):\n${referenceTopics}` : "";
    const prompt = `大喜利のお題を1つ作成してください。【重要】1.問いは一つに絞る。2.回答は「名詞」カードで行う。3.穴埋め{placeholder}は文末付近に配置。出力: {"topic": "..."} ${referenceText}`;
    return (await callGemini(prompt, "あなたは大喜利の司会者です。問いを一つに絞り、名詞で答えさせるプロフェッショナルです。"))?.topic || null;
  };
  const fetchAiCards = async (count = 10) => {
    const referenceAnswers = shuffleArray(learnedData.goodAnswers).slice(0, 5).join(", ");
    const referenceText = referenceAnswers ? `ユーザーが好む回答の傾向（参考）: ${referenceAnswers}` : "";
    const prompt = `大喜利の回答カード（単語・短いフレーズ）を${count}個作成してください。条件: 1.名詞または体言止め。2.具体的で情景が浮かぶ言葉。出力: {"answers": ["...", ...] } ${referenceText}`;
    const result = await callGemini(prompt, "あなたは構成作家です。具体的なモノの名前を挙げるのが得意です。");
    if (result?.answers) saveGeneratedCards(result.answers);
    return result?.answers || null;
  };
  const fetchAiJudgment = async (topic, answer, isManual) => {
    let prompt = isManual ? 
        `お題: ${topic} 回答: ${answer} 1.不適切チェック(NGならisInappropriate:true) 2.5項目(意外性,文脈,瞬発力,毒気,知性)を1-5点で評価 3.採点(0-100) 4.20文字以内のツッコミ 出力: {"score": 数値, "comment": "...", "isInappropriate": bool, "radar": {...}}` :
        `お題: ${topic} 回答: ${answer} 1.不適切チェック不要 2.5項目(意外性,文脈,瞬発力,毒気,知性)を1-5点で評価 3.採点(0-100) 4.20文字以内のツッコミ 出力: {"score": 数値, "comment": "...", "isInappropriate": false, "radar": {...}}`;
    return await callGemini(prompt, "あなたはお笑いセンス抜群の審査員です。");
  };

  const addCardsToDeck = (newCards) => {
    const uniqueNewCards = newCards.filter(card => {
      if (usedCardsRef.current.has(card)) return false;
      usedCardsRef.current.add(card);
      return true;
    });
    if (uniqueNewCards.length > 0) setCardDeck(prev => [...prev, ...uniqueNewCards]);
  };
  useEffect(() => {
    if (isAiActive && cardDeck.length === 0) {
        let baseCards = [...FALLBACK_ANSWERS];
        if (learnedData.cardPool && learnedData.cardPool.length > 0) {
            const poolSamples = shuffleArray(learnedData.cardPool).slice(0, 50);
            baseCards = [...baseCards, ...poolSamples];
        }
        setCardDeck(shuffleArray(baseCards));
        fetchAiCards(8).then(aiCards => { if (aiCards) addCardsToDeck(aiCards); });
    }
  }, [learnedData.cardPool]);
  useEffect(() => {
    if (isAiActive && cardDeck.length < 20 && cardDeck.length > 0) {
      fetchAiCards(10).then(newCards => { if (newCards) addCardsToDeck(newCards); });
    }
  }, [cardDeck.length, isAiActive]);

  const initGame = async () => {
    playSound('decision');
    setAppMode('game'); setGamePhase('drawing'); setCurrentRound(1);
    setIsSurvivalGameOver(false); setAnswerCount(0);
    setAiFeedback(null); setTopicFeedback(null);
    setStartTime(null); setFinishTime(null); setDisplayTime("00:00");
    setTopicCreateRerollCount(0); // リロールカウントリセット

    if (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack') setStartTime(Date.now());

    let initialDeck = [];
    let poolCards = [...FALLBACK_ANSWERS];
    if (learnedData.cardPool && learnedData.cardPool.length > 0) poolCards = [...poolCards, ...learnedData.cardPool];
    initialDeck = shuffleArray(poolCards).slice(0, 50);

    if (isAiActive) {
      try {
        const aiCards = await fetchAiCards(8);
        if (aiCards && aiCards.length > 0) {
          initialDeck = [...initialDeck, ...aiCards];
          aiCards.forEach(c => usedCardsRef.current.add(c));
        }
      } catch (e) {}
    }
    setCardDeck(Array.from(new Set(initialDeck)));

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
        initialPlayers = [{ id: 0, name: userName, score: 0, hand }, { id: 'ai', name: 'AI審査員', score: 0, hand: [] }];
    } else {
        // --- マルチプレイ初期化 ---
        // ランダムで親を決める
        const initialMaster = Math.floor(Math.random() * gameConfig.playerCount);
        setMasterIndex(initialMaster);

        for (let i = 0; i < gameConfig.playerCount; i++) {
            const { hand, remainingDeck } = drawInitialHand(currentDeck, 7);
            currentDeck = remainingDeck;
            // 設定した名前を使用（なければデフォルト）
            const pName = multiPlayerNames[i] || `プレイヤー${i+1}`;
            initialPlayers.push({ id: i, name: pName, score: 0, hand });
        }
    }
    setCardDeck(currentDeck);
    setPlayers(initialPlayers);
    // シングルなら0、マルチならランダム親
    if (gameConfig.mode === 'single') setMasterIndex(0); 
    setSubmissions([]);
    setTimeout(() => startRoundProcess(initialPlayers, (gameConfig.mode === 'single' ? 0 : masterIndex)), 500);
  };

  const startRoundProcess = async (currentPlayers, nextMasterIdx) => {
    setSubmissions([]); setSelectedSubmission(null); setAiComment('');
    setManualTopicInput(''); setManualAnswerInput(''); setAiFeedback(null);
    setTopicFeedback(null);
    setMasterIndex(nextMasterIdx); setGamePhase('drawing');
    setHasTopicRerolled(false); setHasHandRerolled(false);
    setTopicCreateRerollCount(0); // ターンごとにもリセット（もし手動作成に戻った場合用）
    setTimeLeft(timeLimit); setIsTimerRunning(false);

    const drawCards = (deck, count) => {
        const needed = Math.max(0, count);
        if (needed === 0) return { hand: [], remainingDeck: deck };
        let currentDeck = [...deck];
        if (currentDeck.length < needed) {
            let pool = [...FALLBACK_ANSWERS];
            if (learnedData.cardPool?.length > 0) pool = [...pool, ...learnedData.cardPool];
            currentDeck = [...currentDeck, ...shuffleArray(pool)];
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
        setIsTimerRunning(true);
    } else {
        setTimeout(() => setGamePhase('master_topic'), 800);
    }
  };

  const nextRound = () => {
    if (gameConfig.mode === 'single') {
        if (gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS_SCORE_ATTACK) return setGamePhase('final_result');
        if (gameConfig.singleMode === 'survival' && isSurvivalGameOver) return setGamePhase('final_result');
        if (gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) return setGamePhase('final_result');
        
        setCurrentRound(prev => prev + 1);
        startRoundProcess(players, 0);
    } else {
        // マルチプレイ勝利判定 (10点先取)
        const winner = players.find(p => p.score >= WINNING_SCORE_MULTI);
        if (winner) {
            return setGamePhase('final_result');
        }

        if (selectedSubmission.isDummy) startRoundProcess(players, masterIndex);
        else startRoundProcess(players, players.findIndex(p => p.id === selectedSubmission.playerId));
    }
  };

  const handleTopicReroll = async () => {
    playSound('tap');
    if (hasTopicRerolled || isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    let topic = await fetchAiTopic();
    if (!topic) topic = topicsList[Math.floor(Math.random() * topicsList.length)];
    let finalTopic = topic.replace(/___+/g, "{placeholder}").replace(/＿{3,}/g, "{placeholder}");
    if (!finalTopic.includes('{placeholder}')) finalTopic += " {placeholder}";
    setCurrentTopic(finalTopic);
    setHasTopicRerolled(true);
    setIsGeneratingTopic(false);
  };

  const handleHandReroll = async () => {
    playSound('card');
    if (hasHandRerolled || isRerollingHand) return;
    setIsRerollingHand(true);
    // 手札交換中はタイマーストップ
    setIsTimerRunning(false);

    const currentHandSize = singlePlayerHand.length;
    let currentDeck = [...cardDeck];
    let pool = [...FALLBACK_ANSWERS];
    if (learnedData.goodAnswers?.length > 0) pool = [...pool, ...learnedData.goodAnswers];
    if (learnedData.cardPool?.length > 0) pool = [...pool, ...learnedData.cardPool];
    
    if (currentDeck.length < currentHandSize) {
        if (isAiActive) {
            const newCards = await fetchAiCards(8);
            if (newCards) { addCardsToDeck(newCards); currentDeck = [...currentDeck, ...newCards]; }
        }
        if (currentDeck.length < currentHandSize) currentDeck = [...currentDeck, ...shuffleArray(pool)];
    }
    const { hand: newHand, remainingDeck } = drawCards(currentDeck, currentHandSize);
    setSinglePlayerHand(newHand);
    setCardDeck(remainingDeck);
    setHasHandRerolled(true);
    setIsRerollingHand(false);
    // 再開
    if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
  };

  const generateAiTopic = async () => {
    playSound('tap');
    if (isGeneratingTopic) return;
    // --- 制限チェック ---
    if (topicCreateRerollCount >= MAX_REROLL_COUNT) {
        alert("AI提案は1ターンにつき3回までです！");
        return;
    }
    
    setIsGeneratingTopic(true);
    let topic = await fetchAiTopic();
    if (!topic) topic = topicsList[Math.floor(Math.random() * topicsList.length)];
    const displayTopic = topic.replace(/\{placeholder\}/g, "___");
    setManualTopicInput(displayTopic);
    setLastAiGeneratedTopic(displayTopic);
    
    setTopicCreateRerollCount(prev => prev + 1); // カウントアップ

    setIsGeneratingTopic(false);
  };

  const confirmTopic = async () => {
    playSound('decision');
    if (!manualTopicInput.trim()) return;
    const isAiOrigin = manualTopicInput === lastAiGeneratedTopic;
    if (!isAiOrigin) {
        setIsCheckingTopic(true);
        if (await checkContentSafety(manualTopicInput)) {
            playSound('timeup');
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
    if (gameConfig.mode === 'single') {
        setGamePhase('answer_input');
        if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
    } else prepareNextSubmitter(masterIndex, masterIndex, players);
  };

  const handleTimeUp = () => {
      playSound('timeup');
      const randomCard = singlePlayerHand[Math.floor(Math.random() * singlePlayerHand.length)] || "時間切れ...";
      alert("⏰ 時間切れ！勝手に回答します！");
      handleSingleSubmit(randomCard, false);
  };

  const handleSingleSubmit = async (text, isManual = false) => {
    if (!text) return;
    setIsTimerRunning(false);
    setIsJudging(true);
    if (gameConfig.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);

    const result = await fetchAiJudgment(currentTopic, text, isManual);
    if (result && result.isInappropriate) {
        playSound('timeup');
        alert("⚠️ AI判定：不適切な表現が含まれています。");
        setIsJudging(false);
        if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
        return;
    }
    setSingleSelectedCard(text);
    setGamePhase('judging');
    let score = 0;
    if (result) {
        setAiComment(result.comment);
        score = result.score;
        if (score >= HALL_OF_FAME_THRESHOLD) {
            saveToHallOfFame({
                topic: currentTopic.replace('{placeholder}', '___'),
                answer: text,
                score: score,
                comment: result.comment,
                radar: result.radar,
                player: userName,
                date: new Date().toLocaleDateString()
            });
            saveLearnedAnswer(text);
        } else if (score >= HIGH_SCORE_THRESHOLD) {
            saveLearnedAnswer(text);
        }
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
    setSelectedSubmission({ answerText: text, score, radar: result?.radar });
    playSound('result');
    setIsJudging(false);
    setGamePhase('result');
  };

  // --- 他のハンドラ ---
  const handleTopicFeedback = (isGood) => {
    playSound('tap');
    setTopicFeedback(isGood ? 'good' : 'bad');
    if (isGood && currentTopic) saveLearnedTopic(currentTopic);
  };
  const handleAiFeedback = (isGood) => {
    playSound('tap');
    setAiFeedback(isGood ? 'good' : 'bad');
    if (isGood && selectedSubmission?.answerText) saveLearnedAnswer(selectedSubmission.answerText);
  };
  const handleShare = () => {
    const text = `【AI大喜利】\nお題：${currentTopic.replace('{placeholder}', '___')}\n回答：${selectedSubmission?.answerText}\n#AI大喜利`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
  };
  const handleJudge = (submission) => {
    playSound('decision');
    setSelectedSubmission(submission);
    setPlayers(prev => prev.map(p => {
        if (submission.isDummy) return p.id === players[masterIndex].id ? { ...p, score: p.score - 1 } : p;
        return p.id === submission.playerId ? { ...p, score: p.score + 1 } : p;
    }));
    playSound('result');
    setGamePhase('result');
  };

  // --- UIコンポーネント (Propsなど必要なものを渡す) ---

  if (appMode === 'title') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 text-slate-900">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6"><Sparkles className="w-10 h-10 text-indigo-600" /></div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">AI大喜利</h1>
        <p className="text-slate-500 mb-8">{APP_VERSION}<br/><span className="text-xs text-indigo-500">Powered by Gemini</span></p>
        <button onClick={() => { playSound('tap'); setModalType('update'); }} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-6 px-3 py-1 rounded-full border border-slate-200 hover:bg-white transition-colors"><History className="w-3 h-3" /> 更新情報</button>
        <div className="grid gap-4 w-full max-w-md mb-8">
          <button onClick={() => { playSound('decision'); setGameConfig({ mode: 'single', singleMode: 'score_attack', playerCount: 1 }); setAppMode('setup'); }} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all group text-left"><div className="bg-indigo-50 p-3 rounded-full group-hover:bg-indigo-100"><User className="w-6 h-6 text-indigo-600" /></div><div><div className="font-bold text-slate-900">一人で遊ぶ</div><div className="text-xs text-slate-500">4つのモードでAIに挑戦</div></div></button>
          <button onClick={() => { playSound('decision'); setGameConfig({ mode: 'multi', playerCount: 3 }); setAppMode('setup'); }} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all group text-left"><div className="bg-amber-50 p-3 rounded-full group-hover:bg-amber-100"><Users className="w-6 h-6 text-amber-600" /></div><div><div className="font-bold text-slate-900">みんなで遊ぶ</div><div className="text-xs text-slate-500">スマホ1台を回して対戦</div></div></button>
        </div>
        <div className="flex gap-4">
            <button onClick={() => { playSound('tap'); setShowMyData(true); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-colors"><Activity className="w-4 h-4" /> マイデータ</button>
            <button onClick={() => { playSound('tap'); setModalType('rule'); }} className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white transition-colors"><BookOpen className="w-4 h-4" /> ルール</button>
            <button onClick={() => { playSound('tap'); setShowHallOfFame(true); }} className="text-sm font-bold text-yellow-600 hover:text-yellow-700 flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 hover:bg-yellow-100 transition-colors"><Crown className="w-4 h-4" /> 殿堂入り</button>
        </div>
        {modalType && <InfoModal onClose={() => setModalType(null)} type={modalType} />}
        {showHallOfFame && <HallOfFameModal onClose={() => setShowHallOfFame(false)} data={hallOfFame} />}
        {showMyData && <MyDataModal stats={userStats} onClose={() => setShowMyData(false)} userName={userName} />}
      </div>
    );
  }

  if (appMode === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in slide-in-from-right duration-300 text-slate-900">
        <h2 className="text-2xl font-bold mb-8">ゲーム設定</h2>
        <div className="w-full max-w-md space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="mb-4">
             <label className="block text-sm font-bold text-slate-700 mb-2">プレイヤー名</label>
             <div className="relative"><input type="text" value={userName} onChange={(e) => saveUserName(e.target.value)} className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold" /><User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-2">制限時間: {timeLimit}秒</label><input type="range" min="10" max="60" step="5" value={timeLimit} onChange={(e) => saveTimeLimit(parseInt(e.target.value))} className="w-full accent-indigo-600" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">{volume === 0 ? <VolumeX className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>} 音量: {Math.round(volume * 100)}%</label><input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); saveVolume(v); playSynthSound('tap', v); }} className="w-full accent-indigo-600" /></div>
          </div>

          {gameConfig.mode === 'single' ? (
            <div>
                <p className="mb-4 font-bold text-slate-700">ゲームモード選択</p>
                <div className="space-y-3">
                    {['score_attack', 'survival', 'time_attack', 'freestyle'].map(mode => (
                        <button key={mode} onClick={() => { playSound('tap'); setGameConfig(prev => ({...prev, singleMode: mode})); }} className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${gameConfig.singleMode === mode ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 shadow-md' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${gameConfig.singleMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{mode === 'score_attack' && <Trophy className="w-5 h-5"/>}{mode === 'survival' && <Skull className="w-5 h-5"/>}{mode === 'time_attack' && <Clock className="w-5 h-5"/>}{mode === 'freestyle' && <Infinity className="w-5 h-5"/>}</div>
                                <div><div className={`font-bold ${gameConfig.singleMode === mode ? 'text-indigo-900' : 'text-slate-900'}`}>{mode === 'score_attack' ? 'スコアアタック' : mode === 'survival' ? 'サバイバル' : mode === 'time_attack' ? 'タイムアタック' : 'フリースタイル'}</div><div className="text-xs text-slate-500">{mode === 'score_attack' ? '全5問の合計得点を競う' : mode === 'survival' ? '60点未満で即終了' : mode === 'time_attack' ? '500点到達までの回答数' : 'お題作成から楽しむ無限モード'}</div></div>
                            </div>
                            {gameConfig.singleMode === mode && <Check className="w-6 h-6 text-indigo-600" />}
                        </button>
                    ))}
                </div>
                <div className="mt-6 text-center"><button onClick={resetLearnedData} className="text-xs text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto underline decoration-dotted"><Trash2 className="w-3 h-3" />AIの学習データをリセット</button></div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">参加人数: {gameConfig.playerCount}人</label>
              <input type="range" min="2" max="10" value={gameConfig.playerCount} onChange={(e) => { const cnt = parseInt(e.target.value); setGameConfig(prev => ({ ...prev, playerCount: cnt })); setMultiPlayerNames(prev => { const arr = [...prev]; while(arr.length < cnt) arr.push(`プレイヤー${arr.length+1}`); return arr.slice(0, cnt); }); }} className="w-full accent-indigo-600 mb-4" />
              
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                 {multiPlayerNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                       <span className="text-xs text-slate-500 w-6">P{idx+1}</span>
                       <input type="text" value={name} onChange={(e) => { const newNames = [...multiPlayerNames]; newNames[idx] = e.target.value; setMultiPlayerNames(newNames); }} className="flex-1 p-2 border border-slate-200 rounded text-sm" />
                    </div>
                 ))}
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500"><p className="mb-2 font-bold text-slate-700">マルチプレイのルール</p><ul className="list-disc list-inside space-y-1"><li>10点先取で優勝！</li><li>親はランダムで決まります。</li><li>ダミー回答を親が選ぶと親は-1点。</li></ul></div>
            </div>
          )}
          <div className="pt-4 flex gap-3"><button onClick={() => { playSound('tap'); setAppMode('title'); }} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">戻る</button><button onClick={initGame} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">スタート</button></div>
        </div>
      </div>
    );
  }

  // --- Result ---
  if (gamePhase === 'final_result') {
      const isMulti = gameConfig.mode === 'multi';
      // マルチなら勝者、シングルなら戦績
      let title = "", main = "", sub = "";
      
      if (isMulti) {
          // 勝者判定
          const winner = players.find(p => p.score >= WINNING_SCORE_MULTI);
          title = "🏆 優勝決定！";
          main = winner ? winner.name : "???";
          sub = `スコア: ${winner ? winner.score : 0}点`;
      } else {
          // シングル
          if (gameConfig.singleMode === 'score_attack') {
            title = `全${TOTAL_ROUNDS_SCORE_ATTACK}回戦 終了！`; main = `${players[0].score}点`;
            let rank = players[0].score >= 450 ? "お笑い神" : players[0].score >= 400 ? "大御所" : players[0].score >= 300 ? "真打ち" : "見習い";
            sub = `称号：${rank}`;
          } else if (gameConfig.singleMode === 'survival') {
            title = "GAME OVER..."; main = `${currentRound - 1}連勝`; sub = `スコア: ${players[0].score}点`;
          } else if (gameConfig.singleMode === 'time_attack') {
            title = "GOAL!!"; main = (startTime && finishTime) ? formatTime(finishTime - startTime) : "--:--"; sub = `合計スコア: ${players[0].score}点`;
          }
      }

      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500 text-slate-900">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-lg border-4 border-white">{gameConfig.singleMode === 'survival' ? <Skull className="w-12 h-12 text-slate-700" /> : <Trophy className="w-12 h-12 text-yellow-600" />}</div>
            <h2 className="text-xl font-bold text-slate-500 mb-2">{title}</h2>
            <div className="text-6xl font-black text-indigo-600 mb-4">{main}</div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm mb-4"><p className="text-xl font-bold text-slate-800">{sub}</p></div>
            
            {/* マルチのリザルト一覧 */}
            {isMulti && (
                <div className="w-full max-w-sm mb-8 bg-white rounded-xl shadow p-4">
                    <h3 className="font-bold text-slate-600 mb-2 border-b pb-2">最終結果</h3>
                    {players.sort((a,b)=>b.score-a.score).map((p,i)=>(
                        <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                            <span>#{i+1} {p.name}</span>
                            <span className="font-bold">{p.score}点</span>
                        </div>
                    ))}
                </div>
            )}

            {!isMulti && <div className="w-full max-w-sm mb-8"><RankingList mode={gameConfig.singleMode} data={rankings[gameConfig.singleMode]} unit={gameConfig.singleMode==='time_attack'?'':'点'} /></div>}
            
            <button onClick={() => { playSound('tap'); setAppMode('title'); }} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700 shadow-xl transition-all active:scale-95">タイトルへ戻る</button>
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
             {gameConfig.singleMode === 'survival' && <span className="text-red-600 flex items-center gap-1"><Skull className="w-3 h-3"/> {currentRound}連勝</span>}
             {gameConfig.singleMode === 'time_attack' && <span className="text-blue-600 flex items-center gap-1"><Hash className="w-3 h-3"/> {answerCount}回目</span>}
             {gameConfig.singleMode === 'freestyle' && <span className="text-green-600 flex items-center gap-1"><Infinity className="w-3 h-3"/> Round {currentRound}</span>}
           </div>)}
           <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${isAiActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{isAiActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{isAiActive ? 'ON' : 'OFF'}</div>
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
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2 font-bold text-slate-600 text-sm"><PenTool className="w-4 h-4" />お題を作成・編集</div>
              {/* AI作成ボタン（回数制限付き） */}
              {isAiActive && (<button onClick={generateAiTopic} disabled={isGeneratingTopic || topicCreateRerollCount >= MAX_REROLL_COUNT} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"><Wand2 className={`w-3 h-3 ${isGeneratingTopic ? 'animate-spin' : ''}`} />{isGeneratingTopic ? '生成中...' : `AIで作成 (${MAX_REROLL_COUNT - topicCreateRerollCount})`}</button>)}</div>
              <div className="relative">
                {isGeneratingTopic && (<div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" /></div>)}
                <textarea value={manualTopicInput} onChange={(e) => setManualTopicInput(e.target.value)} placeholder="例：冷蔵庫を開けたら、なぜか ___ が冷やされていた。" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none min-h-[120px] mb-4 text-base leading-relaxed text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mb-4 border border-slate-100"><p className="font-bold mb-1 text-slate-600">💡 ヒント</p><span className="font-bold font-mono">___</span> (アンダーバー3つ) の部分に、みんなが回答カード（名詞）を出します。</div>
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
            <TopicDisplay topic={currentTopic} answer={null} gamePhase={gamePhase} mode={gameConfig.mode} topicFeedback={topicFeedback} onFeedback={handleTopicFeedback} onReroll={handleTopicReroll} hasRerolled={hasTopicRerolled} isGenerating={isGeneratingTopic} singleMode={gameConfig.singleMode} />
            <div className="mb-2"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">PLAYER</span><h3 className="text-lg font-bold text-slate-800 inline-block ml-2">{gameConfig.mode === 'single' ? 'あなたの回答' : `${players[turnPlayerIndex].name}の回答`}</h3></div>
            {/* タイマーバー (フリースタイル以外) */}
            {isAiActive && gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle' && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>残り時間</span><span className={`${timeLeft <= 5 ? 'text-red-600 animate-pulse' : ''}`}>{timeLeft}秒</span></div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / timeLimit) * 100}%` }}></div></div>
                </div>
            )}
            <div className="mb-6"><div className="flex justify-between items-end mb-2"><p className="text-xs text-slate-400 font-bold flex items-center gap-1"><Layers className="w-3 h-3" />手札から選んで回答</p>{gameConfig.mode === 'single' && (<button onClick={handleHandReroll} disabled={hasHandRerolled || isRerollingHand || isJudging} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-bold border border-indigo-200 ${hasHandRerolled ? 'opacity-50 cursor-not-allowed' : ''}`}><RefreshCw className={`w-3 h-3 ${isRerollingHand ? 'animate-spin' : ''}`} />{hasHandRerolled ? '交換済み' : '手札全交換 (1回)'}</button>)}</div><div className="grid grid-cols-2 gap-3">{(gameConfig.mode === 'single' ? singlePlayerHand : players[turnPlayerIndex].hand).map((card, idx) => (<Card key={idx} text={card} disabled={isJudging} onClick={() => { if (gameConfig.mode === 'single') handleSingleSubmit(card, false); else { if (window.confirm(`「${card}」で回答しますか？`)) handleMultiSubmit(card); }}} />))}</div></div>
            <div className="flex items-center gap-4 text-slate-300 mb-6"><div className="h-px bg-slate-200 flex-1"></div><ArrowDown className="w-4 h-4 text-slate-300" /><div className="h-px bg-slate-200 flex-1"></div></div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-10"><div className="flex items-center justify-between mb-2"><p className="text-xs text-slate-400 font-bold flex items-center gap-1"><PenTool className="w-3 h-3" />自由に回答</p></div><div className="relative"><textarea value={manualAnswerInput} onChange={(e) => setManualAnswerInput(e.target.value)} placeholder="ここに面白い回答を入力..." className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none min-h-[80px] mb-3 text-lg text-slate-900 placeholder:text-slate-400" /></div><button onClick={() => { if (!manualAnswerInput.trim()) return; if (gameConfig.mode === 'single') handleSingleSubmit(manualAnswerInput, true); else handleMultiSubmit(manualAnswerInput); }} disabled={!manualAnswerInput.trim() || isJudging} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95">{isJudging ? 'AIが審査中...' : '送信する'}</button></div>
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
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100"><div className="bg-slate-900 p-6 text-white text-center"><p className="text-indigo-300 text-sm font-bold mb-2 opacity-75">お題</p><p className="text-lg font-medium opacity-90">{currentTopic.replace('{placeholder}', '___')}</p></div><div className="p-8 text-center bg-gradient-to-b from-white to-slate-50"><p className="text-sm text-slate-400 font-bold mb-2">ベストアンサー</p><p className="text-3xl md:text-4xl font-black text-indigo-600 leading-tight mb-6">{selectedSubmission?.answerText}</p>{gameConfig.mode === 'single' ? (<><div className="bg-slate-100 p-4 rounded-xl text-left inline-block max-w-sm"><div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-amber-500" /><span className="text-xs font-bold text-slate-500">AIコメント</span></div><p className="text-slate-700">「{aiComment}」</p></div><div className="mt-3 pt-3 border-t border-slate-200"><p className="text-xs text-slate-400 font-bold mb-2 text-center">このツッコミは...</p>{aiFeedback === null ? (<div className="flex justify-center gap-4"><button onClick={() => handleAiFeedback(true)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"><ThumbsUp className="w-3 h-3" /> ナイス！</button><button onClick={() => handleAiFeedback(false)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"><ThumbsDown className="w-3 h-3" /> イマイチ</button></div>) : (<p className="text-xs text-center font-bold text-indigo-600 animate-in fade-in">{aiFeedback === 'good' ? 'ありがとうございます！😊' : '精進します...🙇'}</p>)}</div>{gameConfig.singleMode === 'survival' && isSurvivalGameOver && (<div className="mt-4 p-3 bg-red-100 text-red-700 font-bold rounded-lg animate-pulse">⚠️ {SURVIVAL_PASS_SCORE}点未満のため、ゲームオーバー！</div>)}{gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE && (<div className="mt-4 p-3 bg-blue-100 text-blue-700 font-bold rounded-lg animate-bounce">🎉 目標達成！ ゴール！</div>)}{selectedSubmission.score >= HALL_OF_FAME_THRESHOLD && (<div className="mt-4 p-3 bg-yellow-100 text-yellow-800 font-bold rounded-lg animate-bounce flex items-center justify-center gap-2"><Crown className="w-5 h-5"/> 殿堂入り！</div>)}</>) : (<div className="animate-bounce-in">{selectedSubmission.isDummy ? (<div className="bg-red-50 p-4 rounded-xl border border-red-200 inline-block"><div className="flex items-center gap-2 justify-center text-red-600 font-bold mb-2"><AlertTriangle className="w-6 h-6" /><span>残念！！</span></div><p className="text-slate-700">それは<span className="font-bold text-red-600">AIが作ったダミー回答</span>でした！</p><p className="text-sm text-slate-500 mt-1">見る目がない親は<span className="font-bold text-red-600 text-lg"> -1点 </span>です！</p></div>) : (<><p className="text-sm text-slate-400">by</p><p className="text-xl font-bold text-slate-800">{players.find(p => p.id === selectedSubmission?.playerId)?.name}</p><div className="mt-4 inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">次回の親になります</div></>) }</div>)}<div className="mt-8"><button onClick={handleShare} className="flex items-center gap-2 mx-auto px-6 py-3 bg-indigo-50 text-indigo-700 rounded-full font-bold hover:bg-indigo-100 transition-all active:scale-95">{isCopied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}{isCopied ? 'コピーしました！' : '結果をシェアする'}</button></div></div></div>
            {gameConfig.mode === 'multi' && (<div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-20"><h3 className="text-sm font-bold text-slate-500 mb-3 px-2">現在のスコア (10点先取)</h3><div className="space-y-2">{[...players].sort((a,b) => b.score - a.score).map(p => (<div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl"><div className="flex items-center gap-2">{p.score >= 10 && <Trophy className="w-4 h-4 text-yellow-500" />}<span className="font-bold text-slate-700">{p.name}</span></div><span className="font-mono font-bold text-indigo-600">{p.score} pt</span></div>))}</div></div>)}
            <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20"><button onClick={nextRound} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 hover:scale-105 transition-all shadow-xl"><RotateCcw className="w-5 h-5" />{(gameConfig.mode === 'single' && ((gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS_SCORE_ATTACK) || (gameConfig.singleMode === 'survival' && isSurvivalGameOver) || (gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE))) ? '結果発表へ' : '次のラウンドへ'}</button></div>
          </div>
        )}
      </main>
    </div>
  );
}