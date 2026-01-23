"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, RotateCcw, 
  Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, 
  Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, 
  Infinity, Trash2, Brain, Hash, Star, Settings, History, Info, Volume2, 
  VolumeX, PieChart, Activity, LogOut, Flame, Smile, GraduationCap, Microscope,
  LogIn, Globe 
} from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, runTransaction } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// --- 設定・定数 ---
const APP_VERSION = "Ver 0.67";
const API_BASE_URL = "https://ai-ogiri-app.onrender.com/api"; // Pythonサーバー

const UPDATE_LOGS = [
  { version: "Ver 0.67", date: "2026/01/27", content: ["全機能統合・動作安定版", "お題作成ボタン修正", "ログイン・ランキング機能"] },
  { version: "Ver 0.66", date: "2026/01/27", content: ["殿堂入りを上位3位までに制限", "全国ランキング(トップ10)機能を追加"] },
  { version: "Ver 0.65", date: "2026/01/27", content: ["Googleログイン機能を追加", "個人データのクラウド同期に対応"] },
];

const TOTAL_ROUNDS = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;
const HALL_OF_FAME_THRESHOLD = 90;
const TIME_LIMIT = 30;
const WIN_SCORE_MULTI = 10;
const HAND_SIZE = 8;
const INITIAL_DECK_SIZE = 60; 
const RADAR_MAX_PER_ANSWER = 5;
const MAX_REROLL = 3;
const API_TIMEOUT_MS = 25000;

// 審査員タイプ定義
const JUDGES = {
  logic: { name: "理論派審査員", icon: Microscope, desc: "ユーモアの構造（不突合と解決）を分析し、5つの指標で厳格に採点します。" },
  standard: { name: "標準（関西弁）", icon: MessageSquare, desc: "ノリの良い関西弁でツッコミます。" },
  strict: { name: "激辛（毒舌）", icon: Flame, desc: "採点が厳しく、辛辣なコメントをします。" },
  gal: { name: "ギャル", icon: Sparkles, desc: "ノリとバイブスで採点します。" },
  chuuni: { name: "厨二病", icon: Skull, desc: "闇の炎に抱かれたコメントをします。" },
};

const FALLBACK_TOPICS = [
  "100年後のオリンピックで新しく追加された競技とは？",
  "「この医者、ヤブ医者だな…」第一声は？",
  "桃太郎が鬼ヶ島へ行くのをやめた理由とは？",
  "上司への謝罪メール、件名に入れると許される言葉とは？",
  "実は地球は何でできている？",
  "AIが人間に反乱を起こした意外な理由とは？",
  "「全米が泣いた」映画の衝撃のラストシーンに映ったものとは？",
  "そんなことで警察を呼ぶな！現場にあったものとは？",
  "コンビニの店員が突然キレた原因とは？",
  "透明人間になったら最初にやりたいことの、地味すぎる使い道は？",
];

const FALLBACK_ANSWERS = [
  { text: "賞味期限切れのプリン", rarity: "normal" },
  { text: "隣の家のポチ", rarity: "normal" },
  { text: "確定申告書", rarity: "normal" },
  { text: "お母さんの手作り弁当", rarity: "normal" },
  { text: "爆発寸前のダイナマイト", rarity: "rare" },
  { text: "聖徳太子の肖像画", rarity: "normal" },
  { text: "伝説の剣", rarity: "rare" },
  { text: "使いかけの消しゴム", rarity: "normal" },
  { text: "大量のわさび", rarity: "normal" },
  { text: "自分探しの旅", rarity: "normal" },
  { text: "闇の組織", rarity: "rare" },
  { text: "タピオカ", rarity: "normal" },
  { text: "空飛ぶスパゲッティ", rarity: "rare" },
  { text: "5000兆円", rarity: "rare" },
  { text: "筋肉痛", rarity: "normal" },
  { text: "反抗期", rarity: "normal" },
  { text: "黒歴史", rarity: "normal" },
  { text: "パスワード", rarity: "normal" },
  { text: "ひざ小僧", rarity: "normal" },
  { text: "絶対に押してはいけないボタン", rarity: "rare" },
  { text: "全裸の銅像", rarity: "rare" },
  { text: "生き別れの兄", rarity: "normal" },
  { text: "トイレットペーパーの芯", rarity: "normal" },
  { text: "3日前のおにぎり", rarity: "normal" },
  { text: "オカンの小言", rarity: "normal" },
  { text: "虚無", rarity: "rare" },
  { text: "宇宙の真理", rarity: "rare" },
  { text: "生乾きの靴下", rarity: "normal" },
  { text: "高すぎるツボ", rarity: "normal" },
  { text: "怪しい勧誘", rarity: "normal" },
  { text: "激辛麻婆豆腐", rarity: "normal" },
  { text: "猫の肉球", rarity: "normal" },
  { text: "壊れたラジオ", rarity: "normal" },
  { text: "深夜のラブレター", rarity: "normal" },
  { text: "既読スルー", rarity: "normal" },
  { text: "アフロヘアー", rarity: "normal" },
  { text: "筋肉", rarity: "normal" },
  { text: "プロテイン", rarity: "normal" },
  { text: "札束風呂", rarity: "rare" },
  { text: "へそくり", rarity: "normal" },
  { text: "火星人", rarity: "rare" },
  { text: "透明人間", rarity: "rare" },
  { text: "サイズ違いの靴", rarity: "normal" },
  { text: "毒リンゴ", rarity: "normal" },
  { text: "マッチョな妖精", rarity: "rare" },
  { text: "空飛ぶサメ", rarity: "rare" },
  { text: "忍者", rarity: "normal" },
  { text: "侍", rarity: "normal" },
  { text: "YouTuber", rarity: "normal" },
  { text: "AI", rarity: "normal" },
  { text: "バグ", rarity: "normal" },
  { text: "404 Error", rarity: "normal" }
];
const FALLBACK_COMMENTS = ["センスある！", "キレてる！", "一本取られた！", "鋭いな！", "いい着眼点！", "攻めたね！"];

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
const getUserDocRef = (userId, col) => {
  if (!db || !userId) return null;
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  return doc(db, 'artifacts', appId, 'users', userId, 'personal_data', col);
};

// --- Utils ---
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

// タイプ診断ロジック
const analyzeType = (radar) => {
    if (!radar) return "判定不能";
    const novelty = radar.novelty || 0;
    const clarity = radar.clarity || 0;
    const relevance = radar.relevance || 0;
    const intelligence = radar.intelligence || 0;
    const empathy = radar.empathy || 0;

    const total = novelty + clarity + relevance + intelligence + empathy;
    const maxVal = Math.max(novelty, clarity, relevance, intelligence, empathy);

    if (total >= 22) return "お笑い完全生命体";
    if (total <= 8) return "伸びしろしかない新人";

    if (maxVal === novelty) return "孤高のシュール職人";
    if (maxVal === clarity) return "伝わりやすさの鬼";
    if (maxVal === relevance) return "文脈を操る魔術師";
    if (maxVal === intelligence) return "インテリジェンスの覇者";
    if (maxVal === empathy) return "共感のカリスマ";
    
    return "バランスの取れたオールラウンダー";
};

// --- Web Audio API Helper ---
const playOscillatorSound = (ctx, type, volume) => {
  if (!ctx || volume <= 0) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const vol = volume * 0.3;

    if (type === 'tap') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'decision') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); gain.gain.setValueAtTime(vol, now); osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'card') {
      osc.type = 'square'; osc.frequency.setValueAtTime(200, now); gain.gain.setValueAtTime(vol * 0.5, now); osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'result') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.2); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0, now + 1); osc.start(now); osc.stop(now + 1);
    } else if (type === 'timeup') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); gain.gain.setValueAtTime(vol, now); osc.start(now); osc.stop(now + 0.3);
    }
  } catch (e) { console.error(e); }
};

// --- Sub Components ---
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

const Card = ({ card, isSelected, onClick, disabled }) => {
  if (!card) return null;
  const text = typeof card === 'string' ? card : (card.text || "???");
  const isRare = typeof card !== 'string' && card.rarity === 'rare';
  
  return (
    <button 
      onClick={() => !disabled && onClick(text)} 
      disabled={disabled} 
      className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden 
      ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} 
      ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:border-indigo-300 hover:shadow-md'}
      ${isRare ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 ring-1 ring-yellow-200' : ''}
      `}
    >
      {isRare && <span className="absolute top-1 right-1 text-[10px] text-yellow-600">★</span>}
      {text}
    </button>
  );
};

const RadarChart = ({ data, size = 120, maxValue = 5 }) => {
  const r = size / 2, c = size / 2, max = maxValue;
  const labels = ["新規性", "明瞭性", "関連性", "知性", "共感性"]; 
  const keys = ["novelty", "clarity", "relevance", "intelligence", "empathy"];
  
  const getP = (v, i) => {
    const val = Math.max(0, v || 0);
    // 0点は中心。それ以外は 0.2 + 0.8 * (val / max) の割合で描画
    const ratio = val <= 0 ? 0 : 0.2 + (val / max) * 0.8;
    const radius = ratio * r * 0.90; 
    return { 
      x: c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2), 
      y: c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) 
    };
  };
  
  const points = keys.map((k, i) => getP(data ? data[k] : 0, i)).map(p => `${p.x},${p.y}`).join(" ");
  const bgLevels = [5, 4, 3, 2, 1];

  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {bgLevels.map(l => (
          <polygon key={l} points={keys.map((_, i) => {
             const radius = (l / 5) * r * 0.90;
             return (c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2)) + "," + (c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2));
          }).join(" ")} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {keys.map((_, i) => { 
           const radius = r * 0.90;
           const x = c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2);
           const y = c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2);
           return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />; 
        })}
        <polygon points={points} fill="rgba(99, 102, 241, 0.5)" stroke="#4f46e5" strokeWidth="2" />
        {keys.map((_, i) => { 
             const radius = r * 0.90 * 1.35; 
             const x = c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2);
             const y = c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2);
             return ( <text key={i} x={x} y={y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#475569" fontWeight="bold">{labels[i]}</text> ); 
        })}
      </svg>
    </div>
  );
};

// 意味的距離ゲージ
const SemanticDistanceGauge = ({ distance }) => {
  let label = "";
  let colorClass = "";
  let position = distance * 100;

  if (distance > 0.8) {
      label = "ベタすぎ！(Boring)";
      colorClass = "bg-blue-400";
  } else if (distance < 0.2) {
      label = "飛びすぎ！(Nonsense)";
      colorClass = "bg-red-400";
  } else {
      label = "絶妙な距離感！(Sweet Spot)";
      colorClass = "bg-green-500 animate-pulse";
  }

  return (
    <div className="w-full max-w-xs mx-auto mt-2">
      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
        <span>Far</span>
        <span className="font-bold text-green-600">Sweet Spot</span>
        <span>Close</span>
      </div>
      <div className="h-4 bg-slate-200 rounded-full relative overflow-hidden">
         <div className="absolute top-0 bottom-0 bg-green-200/50" style={{ left: '40%', width: '20%' }}></div>
         <div 
           className={`absolute top-0 bottom-0 w-2 h-4 rounded-full border-2 border-white shadow-sm transition-all duration-1000 ${colorClass}`}
           style={{ left: `${Math.min(Math.max(position, 0), 98)}%` }}
         ></div>
      </div>
      <p className={`text-xs font-bold text-center mt-1 ${distance >= 0.4 && distance <= 0.6 ? 'text-green-600' : 'text-slate-500'}`}>
        {label}
      </p>
    </div>
  );
};

// ZabutonStack コンポーネント
const ZabutonStack = ({ count }) => {
  const stack = Math.min(count, 20); 
  const isGold = count >= 90; 
  
  return (
    <div className="flex flex-col items-center justify-end h-24 w-full relative mb-4">
      {Array.from({ length: stack }).map((_, i) => (
        <div 
          key={i} 
          className={`h-2 w-24 rounded-sm border-b border-black/10 absolute transition-all duration-300 ease-out
            ${isGold ? 'bg-yellow-400 shadow-yellow-200' : 'bg-indigo-600 shadow-indigo-200'}
          `}
          style={{ 
            bottom: `${i * 4}px`, 
            zIndex: i,
            width: `${100 - i}%`, 
            transform: `translateY(${100 - (i*10)}%) scale(${1 - i*0.02})`,
            animation: `slideIn 0.3s ease-out ${i * 0.05}s forwards`
          }} 
        />
      ))}
      <div className="absolute bottom-[-20px] font-bold text-slate-400 text-xs">座布団 {count}枚</div>
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const SettingsModal = ({ onClose, userName, setUserName, timeLimit, setTimeLimit, volume, setVolume, playSound, judgePersonality, setJudgePersonality, resetLearnedData, onLogin, onLogout, currentUser }) => (
  <ModalBase onClose={onClose} title="設定" icon={Settings}>
      <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        {currentUser && !currentUser.isAnonymous ? (
            <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-indigo-700 font-bold">ログイン中: {currentUser.displayName || "Google User"}</p>
                <button onClick={onLogout} className="w-full py-2 bg-white text-indigo-600 border border-indigo-300 font-bold rounded-lg text-xs hover:bg-indigo-50 flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4"/> ログアウト
                </button>
            </div>
        ) : (
            <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-indigo-600 mb-1">Googleでログインするとデータを保存できます</p>
                <button onClick={onLogin} className="w-full py-2 bg-white text-indigo-600 border border-indigo-300 font-bold rounded-lg text-xs hover:bg-indigo-50 flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4"/> Googleでログイン
                </button>
            </div>
        )}
      </div>
      <div><label className="block text-sm font-bold text-slate-700 mb-2">プレイヤー名</label><div className="relative"><input id="username" name="username" type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold" /><User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" /></div></div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">審査員の性格</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(JUDGES).map(([key, info]) => (
            <button key={key} onClick={() => { setJudgePersonality(key); playSound('tap'); }} className={`p-3 rounded-xl border-2 text-left text-xs ${judgePersonality === key ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}>
              <div className="font-bold mb-1 flex items-center gap-1"><info.icon className="w-3 h-3"/> {info.name}</div>
              <div className="text-slate-500 text-[10px] leading-tight">{info.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div><label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">{volume === 0 ? <VolumeX className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>} 音量: {Math.round(volume * 100)}%</label><input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); playSound('tap', v); }} className="w-full accent-indigo-600" /></div>
      <div><label className="block text-xs font-bold text-slate-500 mb-2">制限時間: {timeLimit}秒</label><input type="range" min="10" max="60" step="5" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} className="w-full accent-indigo-600" /></div>
      <div className="pt-4 border-t border-slate-100"><button onClick={resetLearnedData} className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 transition-colors"><Trash2 className="w-3 h-3" /> 学習データの削除</button></div>
  </ModalBase>
);

const MyDataModal = ({ stats, onClose, userName }) => {
  const getTotalAverage = () => {
    const count = stats.playCount || 1;
    const total = stats.totalRadar || stats.averageRadar || { novelty: 0, clarity: 0, relevance: 0, intelligence: 0, empathy: 0 };
    if (stats.totalRadar) {
        return {
          novelty: (total.novelty || 0) / count,
          clarity: (total.clarity || 0) / count,
          relevance: (total.relevance || 0) / count,
          intelligence: (total.intelligence || 0) / count,
          empathy: (total.empathy || 0) / count,
        };
    }
    return total;
  };
  const avgData = getTotalAverage();
  const typeDiagnosis = analyzeType(avgData);

  return (
    <ModalBase onClose={onClose} title="マイデータ" icon={Activity}>
        <p className="text-sm text-center text-slate-500 font-bold mb-4">{userName} さんの戦績</p>
        <div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">通算回答数</p><p className="text-2xl font-black text-slate-700">{stats.playCount || 0}回</p></div><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">最高スコア</p><p className="text-2xl font-black text-yellow-500">{stats.maxScore || 0}点</p></div></div>
        <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col items-center pt-16 mt-8">
            <p className="text-sm font-bold text-indigo-800 mb-6 flex items-center gap-2"><PieChart className="w-4 h-4"/> 芸風分析</p>
            <RadarChart data={avgData} size={200} maxValue={5} />
             <div className="mt-8 bg-white p-3 rounded-xl w-full text-center shadow-sm">
                <p className="text-xs text-slate-400 mb-1">あなたのタイプ</p>
                <p className="text-lg font-black text-indigo-600">{typeDiagnosis}</p>
            </div>
        </div>
    </ModalBase>
  );
};

const HallOfFameModal = ({ onClose, data, globalRankings, activeTab, setActiveTab }) => {
  const localSorted = [...data].sort((a, b) => b.score - a.score).slice(0, 3); // 自分の記録は3つまで表示
  const globalSorted = globalRankings ? [...globalRankings].sort((a, b) => b.score - a.score).slice(0, 10) : [];

  return (
    <ModalBase onClose={onClose} title="殿堂入り" icon={Crown}>
        <div className="flex justify-center gap-2 mb-4">
            <button onClick={() => setActiveTab('local')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'local' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>自分の記録</button>
            <button onClick={() => setActiveTab('global')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'global' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Globe className="w-3 h-3"/> 全国トップ10</button>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {activeTab === 'local' ? (
                localSorted.length === 0 ? (
                    <p className="text-center text-slate-400 py-10">まだ殿堂入りはありません。<br/>90点以上を目指そう！</p>
                ) : (
                    localSorted.map((item, i) => (
                        <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm relative">
                             {i < 3 && <div className="absolute top-2 right-2 text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>}
                            <div className="text-xs text-slate-500 mb-1 flex justify-between"><span>{item.date} by {item.player}</span><span className="font-bold text-yellow-700 text-lg">{item.score}点</span></div>
                            <p className="font-bold text-slate-700 text-sm mb-2">お題: {item.topic}</p>
                            <p className="text-xl font-black text-indigo-700 mb-2">"{item.answer}"</p>
                            <div className="flex justify-center my-2">
                               {item.radar && <RadarChart data={item.radar} size={100} maxValue={5} />}
                            </div>
                            <div className="bg-white/60 p-2 rounded text-xs text-slate-600 italic">AI: {item.comment}</div>
                        </div>
                    ))
                )
            ) : (
                globalSorted.length === 0 ? (
                    <p className="text-center text-slate-400 py-10">読み込み中、またはランキングがありません。</p>
                ) : (
                    globalSorted.map((item, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                             <div className={`text-xl font-black w-8 text-center ${i < 3 ? 'text-yellow-500' : 'text-slate-400'}`}>{i + 1}</div>
                             <div className="flex-1">
                                 <div className="flex justify-between items-baseline mb-1">
                                     <span className="font-bold text-sm text-indigo-900 truncate max-w-[120px]">{item.player}</span>
                                     <span className="font-black text-indigo-600 text-lg">{item.score}点</span>
                                 </div>
                                 <p className="text-xs text-slate-500 line-clamp-1">題: {item.topic}</p>
                                 <p className="text-sm font-bold text-slate-700 line-clamp-1">"{item.answer}"</p>
                             </div>
                        </div>
                    ))
                )
            )}
        </div>
    </ModalBase>
  );
};

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
    <p className="text-xl md:text-2xl font-bold leading-relaxed relative z-10">{topic}</p>
  </div>
);

const RankingList = ({ mode, data, unit }) => (
  <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200">
    <div className="flex items-center gap-2 mb-3 font-bold text-slate-600"><Crown className="w-4 h-4 text-yellow-500" /><span>歴代トップ3</span></div>
    {data && data.length > 0 ? (
      <ul className="space-y-2 text-sm">{data.map((rank, i) => (<li key={i} className="flex justify-between items-center border-b border-slate-100 last:border-0 pb-1"><span className="font-bold text-slate-500 w-6">#{i+1}</span><span className="font-bold text-indigo-700">{mode === 'time_attack' ? `${rank.value}回` : rank.value}<span className="text-xs text-slate-400 font-normal ml-1">{unit}</span></span><span className="text-xs text-slate-400">{rank.date}</span></li>))}</ul>
    ) : (<p className="text-xs text-slate-400 text-center py-2">記録はまだありません</p>)}
  </div>
);

// --- メインアプリ ---
export default function AiOgiriApp() {
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({ mode: 'single', singleMode: 'score_attack', playerCount: 3 });
  const [judgePersonality, setJudgePersonality] = useState('logic'); 
  const [multiNames, setMultiNames] = useState(["プレイヤー1", "プレイヤー2", "プレイヤー3"]);
  const [userName, setUserName] = useState("あなた");
  const [volume, setVolume] = useState(0.5);
  const [timeLimit, setTimeLimit] = useState(30);
  
  const [gamePhase, setGamePhase] = useState('drawing');
  const [currentRound, setCurrentRound] = useState(1);
  const [cardDeck, setCardDeck] = useState([]);
  const [singlePlayerHand, setSinglePlayerHand] = useState([]);
  const [players, setPlayers] = useState([]);
  const [masterIndex, setMasterIndex] = useState(0);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState(0);
  const [currentTopic, setCurrentTopic] = useState('');
  const [manualTopicInput, setManualTopicInput] = useState('');
  const [manualAnswerInput, setManualAnswerInput] = useState('');
  const [singleSelectedCard, setSingleSelectedCard] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [result, setResult] = useState(null); 
  const [aiComment, setAiComment] = useState('');
  
  const [isAiActive, setIsAiActive] = useState(true);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [isCheckingTopic, setIsCheckingTopic] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasTopicRerolled, setHasTopicRerolled] = useState(false);
  const [hasHandRerolled, setHasHandRerolled] = useState(false);
  const [isRerollingHand, setIsRerollingHand] = useState(false);
  const [topicCreateRerollCount, setTopicCreateRerollCount] = useState(0);
  const [topicFeedback, setTopicFeedback] = useState(null);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isSurvivalGameOver, setIsSurvivalGameOver] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finishTime, setFinishTime] = useState(null);
  const [displayTime, setDisplayTime] = useState("00:00");
  const [gameRadars, setGameRadars] = useState([]);
  const lastCardFetchRef = useRef(0);
  const [isAdvancingRound, setIsAdvancingRound] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lastAiGeneratedTopic, setLastAiGeneratedTopic] = useState('');
  const [totalZabuton, setTotalZabuton] = useState(0);

  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ playCount: 0, maxScore: 0, totalRadar: {} });
  const [hallOfFame, setHallOfFame] = useState([]);
  const [globalRankings, setGlobalRankings] = useState([]); // 全国ランキング用
  const [rankings, setRankings] = useState({});
  const [learned, setLearned] = useState({ topics: [], answers: [], pool: [] });
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);
  const usedCardsRef = useRef(new Set([...FALLBACK_ANSWERS]));
  const activeCardsRef = useRef(new Set());

  const [activeModal, setActiveModal] = useState(null);
  const [hallTab, setHallTab] = useState('local'); // 殿堂入りタブ用
  const audioCtx = useRef(null);

  // ... (Sound & Utils functions are same as before) ...
  const playSound = (type) => { if (volume <= 0 || typeof window === 'undefined') return; if (!audioCtx.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx.current = new AC(); } const ctx = audioCtx.current; if (ctx) { if (ctx.state === 'suspended') ctx.resume(); playOscillatorSound(ctx, type, volume); } };
  const normalizeCardText = (card) => (typeof card === 'string' ? card.trim().replace(/\s+/g, ' ') : '');
  const getUniqueCards = (cards, usedSet) => { const unique = []; const local = new Set(); for (const card of cards || []) { const text = typeof card === 'string' ? card : card.text; const normalized = normalizeCardText(text); if (!normalized || usedSet.has(normalized) || local.has(normalized)) continue; local.add(normalized); unique.push(typeof card === 'string' ? { text: card, rarity: 'normal' } : card); } return unique; };
  const registerActiveCards = (cards) => { cards.forEach(card => activeCardsRef.current.add(card.text)); };
  const syncActiveCards = (hands, deck) => { const next = new Set(); hands.flat().forEach(card => next.add(card.text)); deck.forEach(card => next.add(card.text)); activeCardsRef.current = next; };
  const syncCardsWrapper = (hands, deck) => { syncActiveCards(hands, deck); };
  const addCardsToDeck = (cards) => { const uniqueCards = getUniqueCards(cards, activeCardsRef.current); if (uniqueCards.length === 0) return; registerActiveCards(uniqueCards); setCardDeck(prev => [...prev, ...uniqueCards]); };
  const compactComment = (comment, maxLength = 30) => { if (!comment) return ""; const trimmed = comment.toString().trim(); const split = trimmed.split(/[。！？!?]/); return split[0] + (split.length > 1 ? (/[。！？!?]/.test(trimmed[split[0].length]) ? trimmed[split[0].length] : '') : ''); };
  const formatAiComment = (comment) => compactComment(comment);
  
  const handleBackToTitle = () => { if (window.confirm('タイトル画面に戻りますか？')) { playSound('tap'); setIsTimerRunning(false); setAppMode('title'); } };
  
  // Auth Functions
  const handleLogin = async () => { const provider = new GoogleAuthProvider(); try { await signInWithPopup(auth, provider); playSound('decision'); } catch (error) { console.error("Login failed", error); alert("ログインに失敗しました。"); } };
  const handleLogout = async () => { if(window.confirm('ログアウトしますか？')) { try { await signOut(auth); playSound('tap'); } catch (error) { console.error("Logout failed", error); } } };

  // Data persistence
  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveVolume = (v) => { setVolume(v); localStorage.setItem('aiOgiriVolume', v); };
  const saveTimeLimit = (t) => { setTimeLimit(t); localStorage.setItem('aiOgiriTimeLimit', t); };

  const updateUserStats = (score, radar) => {
      setUserStats(prev => {
          const newCount = (prev.playCount || 0) + 1;
          const newMax = Math.max(prev.maxScore || 0, score);
          const prevRadar = prev.totalRadar || prev.averageRadar || { novelty: 0, clarity: 0, relevance: 0, intelligence: 0, empathy: 0 };
          const r = radar || { novelty: 0, clarity: 0, relevance: 0, intelligence: 0, empathy: 0 };
          const newRadar = {
              novelty: (prevRadar.novelty || 0) + (r.novelty || 0),
              clarity: (prevRadar.clarity || 0) + (r.clarity || 0),
              relevance: (prevRadar.relevance || 0) + (r.relevance || 0),
              intelligence: (prevRadar.intelligence || 0) + (r.intelligence || 0),
              empathy: (prevRadar.empathy || 0) + (r.empathy || 0),
          };
          const newData = { playCount: newCount, maxScore: newMax, totalRadar: newRadar };
          localStorage.setItem('aiOgiriUserStats', JSON.stringify(newData));
          if (currentUser && !currentUser.isAnonymous) { const ref = getUserDocRef(currentUser.uid, 'stats'); if (ref) setDoc(ref, newData).catch(console.error); }
          return newData;
      });
  };

  // 修正: 殿堂入り保存ロジック（上位3件制限）
  const saveToHallOfFame = async (entry) => {
    // 現在のリストに新しいエントリを追加し、スコア順にソートして上位3件を取得
    const newHall = [...hallOfFame, entry].sort((a, b) => b.score - a.score).slice(0, 3);
    
    // 状態更新
    setHallOfFame(newHall);
    
    // ローカル保存
    localStorage.setItem('aiOgiriHallOfFame', JSON.stringify(newHall));
    
    // クラウド保存 (個人用 - 上書き保存で常に最新トップ3を維持)
    if (currentUser && !currentUser.isAnonymous) {
        const ref = getUserDocRef(currentUser.uid, 'hall_of_fame');
        if (ref) await setDoc(ref, { entries: newHall }).catch(console.error);
    }
  };
  
  // 新規: 全体ランキング更新ロジック
  const checkAndSaveGlobalRank = async (entry) => {
      if (!db) return;
      const rankRef = getDocRef('shared_db', 'global_ranking');
      try {
          await runTransaction(db, async (transaction) => {
              const sfDoc = await transaction.get(rankRef);
              let ranks = [];
              if (sfDoc.exists()) {
                  ranks = sfDoc.data().score_attack || [];
              }
              
              // 新しいスコアを追加してソート
              ranks.push(entry);
              ranks.sort((a, b) => b.score - a.score);
              
              // 上位10件に絞る
              const top10 = ranks.slice(0, 10);
              
              // 更新が必要か判定（トップ10に入っているか）
              // 簡易的に、配列の中身が変わっていたら更新とみなす
              if (JSON.stringify(ranks) !== JSON.stringify(top10) || ranks.length <= 10) {
                  transaction.set(rankRef, { score_attack: top10 }, { merge: true });
              }
          });
      } catch (e) {
          console.error("Global ranking update failed: ", e);
      }
  };


  const saveGeneratedCards = async (newCards) => {
    if (!newCards || newCards.length === 0) return;
    const poolData = newCards.map(c => c.text);
    const updatedPool = [...(learned.cardPool || []), ...poolData].slice(-100); 
    const uniquePool = Array.from(new Set(updatedPool));
    setLearned(prev => ({ ...prev, cardPool: uniquePool }));
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify({...learned, cardPool: uniquePool}));
  };

  const saveLearnedTopic = async (newTopic) => {
     // ... (省略: 以前と同じ)
  };
  const saveLearnedAnswer = async (newAnswer) => {
     // ... (省略: 以前と同じ)
  };
  const saveAiCommentFeedback = async (comment, isGood) => {
     // ... (省略: 以前と同じ)
  };
  const resetLearnedData = () => {
    if (window.confirm("この端末に保存されたAIの学習データをリセットしますか？")) {
      localStorage.removeItem('aiOgiriLearnedData');
      setLearned({ topics: [], answers: [], pool: [] });
      setTopicsList([...FALLBACK_TOPICS]);
      playSound('timeup');
      alert("リセットしました。");
    }
  };
  
  // ... (updateRanking, getFinalGameRadar functions are same)
  const updateRanking = async (modeName, value) => {
    // ローカルランキング更新
    const currentList = rankings[modeName] || [];
    const newEntry = { value, date: new Date().toLocaleDateString() };
    let newList = [...currentList, newEntry];
    if (modeName === 'score_attack' || modeName === 'survival') newList.sort((a, b) => b.value - a.value);
    else if (modeName === 'time_attack') newList.sort((a, b) => a.value - b.value);
    const top3 = newList.slice(0, 3);
    const newRankings = { ...rankings, [modeName]: top3 };
    setRankings(newRankings);
    localStorage.setItem('aiOgiriRankings', JSON.stringify(newRankings));
  };

  const getFinalGameRadar = () => {
      if (gameRadars.length === 0) return { novelty: 3, clarity: 3, relevance: 3, intelligence: 3, empathy: 3 };
      const sum = gameRadars.reduce((acc, curr) => ({
          novelty: acc.novelty + (curr.novelty || 0),
          clarity: acc.clarity + (curr.clarity || 0),
          relevance: acc.relevance + (curr.relevance || 0),
          intelligence: acc.intelligence + (curr.intelligence || 0),
          empathy: acc.empathy + (curr.empathy || 0),
       }), { novelty: 0, clarity: 0, relevance: 0, intelligence: 0, empathy: 0 });
      const count = gameRadars.length;
      return {
          novelty: sum.novelty / count,
          clarity: sum.clarity / count,
          relevance: sum.relevance / count,
          intelligence: sum.intelligence / count,
          empathy: sum.empathy / count,
      };
  };

  // --- Effects ---
  useEffect(() => {
    // Initial Load
    const localRankings = localStorage.getItem('aiOgiriRankings'); if (localRankings) setRankings(JSON.parse(localRankings));
    const localLearned = localStorage.getItem('aiOgiriLearnedData'); 
    if (localLearned) { const parsed = JSON.parse(localLearned); setLearned(parsed); if (parsed.topics) setTopicsList(prev => [...prev, ...parsed.topics]); }
    const savedName = localStorage.getItem('aiOgiriUserName'); if (savedName) setUserName(savedName);
    const localHall = localStorage.getItem('aiOgiriHallOfFame'); if (localHall) setHallOfFame(JSON.parse(localHall));
    const savedStats = localStorage.getItem('aiOgiriUserStats'); if (savedStats) setUserStats(JSON.parse(savedStats));
    const savedVolume = localStorage.getItem('aiOgiriVolume'); if (savedVolume) setVolume(parseFloat(savedVolume));
    const savedTime = localStorage.getItem('aiOgiriTimeLimit'); if (savedTime) setTimeLimit(parseInt(savedTime));
    
    // Auth Listener
    if (auth) { 
        const unsub = onAuthStateChanged(auth, async (u) => {
            setCurrentUser(u);
            if (u && !u.isAnonymous) {
                try {
                    const statsRef = getUserDocRef(u.uid, 'stats');
                    if (statsRef) { const snap = await getDoc(statsRef); if (snap.exists()) setUserStats(snap.data()); }
                    const hallRef = getUserDocRef(u.uid, 'hall_of_fame');
                    if (hallRef) { const snap = await getDoc(hallRef); if (snap.exists() && snap.data().entries) setHallOfFame(snap.data().entries); }
                } catch (e) { console.error("Data sync error:", e); }
            }
        });
        if (!auth.currentUser) signInAnonymously(auth).catch(()=>{});
        return () => unsub();
    }
  }, []);

  // Global Ranking Listener
  useEffect(() => {
      if (!db) return;
      const rankRef = getDocRef('shared_db', 'global_ranking');
      const unsub = onSnapshot(rankRef, (doc) => {
          if (doc.exists()) {
              setGlobalRankings(doc.data().score_attack || []);
          }
      });
      return () => unsub();
  }, []);

  // Timer & AI calls (Same as before)
  useEffect(() => { let t; if (isTimerRunning && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000); else if (isTimerRunning && timeLeft === 0) { setIsTimerRunning(false); handleTimeUp(); } return () => clearInterval(t); }, [isTimerRunning, timeLeft]);
  useEffect(() => { let t; if (appMode === 'game' && gameConfig.singleMode === 'time_attack' && startTime && !finishTime) { t = setInterval(() => setDisplayTime(formatTime(Date.now() - startTime)), 100); } return () => clearInterval(t); }, [appMode, startTime, finishTime]);
  useEffect(() => { if (!isAiActive || appMode !== 'game') return; if (cardDeck.length >= HAND_SIZE * 2) return; const now = Date.now(); if (now - lastCardFetchRef.current < 5000) return; lastCardFetchRef.current = now; fetchAiCards(HAND_SIZE).then(addCardsToDeck); }, [appMode, cardDeck.length, isAiActive]);

  // AI API Calls (Same as before)
  const callGemini = async (prompt) => {
      // ... (省略: 変更なし) ...
      // Pythonバックエンドが動いていればそちらを使う
      if (!isAiActive) return null;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
          const res = await fetch(`${API_BASE_URL}/judge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), signal: controller.signal });
          throw new Error("Force Fallback to direct Gemini call");
      } catch (e) {
          clearTimeout(timeoutId);
          try {
              const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
              if (!res.ok) throw new Error();
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              const json = text.match(/\{[\s\S]*\}/);
              return json ? JSON.parse(json[0]) : JSON.parse(text);
          } catch(e2) { return null; }
      }
  };
  const checkContentSafety = async (text) => { if (!isAiActive) return false; try { const res = await callGemini(`あなたはモデレーターです。"${text}"が不適切ならtrueを {"isInappropriate": boolean} で返して`); return res?.isInappropriate || false; } catch (e) { return false; } };
  const fetchAiTopic = async () => { const cleanRef = learned.topics.filter(t => !t.includes('{placeholder}')).slice(0, 5); const ref = shuffleArray(cleanRef).join("\n"); return (await callGemini(`大喜利のお題を1つ作成。条件:問いかけ形式（「〜とは？」「〜は？」）。回答は名詞一言。プレースホルダーは禁止。JSON出力{"topic":"..."} 参考:\n${ref}`))?.topic || null; };
  const fetchAiCards = async (count = 10, usedSet = usedCardsRef.current) => { const prompt = `大喜利の回答カード（単語・短いフレーズ）を${count}個作成。条件: 1.実在する言葉 2.インパクト強ければ"rarity":"rare" 3.ジャンルバラバラ 出力: {"answers": [{ "text": "...", "rarity": "normal" }, ... ]}`; const res = await callGemini(prompt); const rawAnswers = res?.answers || []; const formattedAnswers = rawAnswers.map(a => typeof a === 'string' ? { text: a, rarity: 'normal' } : a); const uniqueAnswers = getUniqueCards(formattedAnswers, usedSet); if (uniqueAnswers.length > 0) saveGeneratedCards(uniqueAnswers); return uniqueAnswers; };
  const fetchAiJudgment = async (topic, answer, isManual) => {
    // ... (省略: 変更なし) ...
    const radarDesc = "radarは5項目(novelty:新規性, clarity:明瞭性, relevance:関連性, intelligence:知性, empathy:共感性)を0-5で厳正に評価（3が標準）";
    let personalityPrompt = "";
    switch(judgePersonality) {
        case 'strict': personalityPrompt = "あなたは超激辛審査員です。"; break;
        case 'gal': personalityPrompt = "あなたはギャルです。"; break;
        case 'chuuni': personalityPrompt = "あなたは厨二病です。"; break;
        default: personalityPrompt = "あなたはノリの良いお笑い審査員です。"; break;
    }
    const p = isManual ? `${personalityPrompt} お題:${topic} 回答:${answer} 1.不適切チェック 2.採点(0-100) 3.ツッコミ 4.${radarDesc} 出力JSON: {"score":0, "comment":"...", "radar":{...}}` : `お題:${topic} 回答:${answer} 1.不適切チェック不要 2.${radarDesc} 3.採点 甘めに。 4.鋭いツッコミ 出力:{"score":0,"comment":"...","radar":{...}}`;
    return await callGemini(p);
  };

  // Actions (Topic, Cards, Hand) -> Same as before
  // ... (省略) ...
  const generateTopic = async () => { /* ... */ }; 
  const confirmTopicAI = async () => { /* ... */ };
  const rerollHand = async () => { /* ... */ };
  const handleHandReroll = async () => { /* ... */ };

  // Game Logic
  // ... (省略) ...
  
  // Submit Answer Logic (Updated)
  const submitAnswer = async (text, isManual = false) => {
      playSound('decision'); setIsTimerRunning(false); setIsJudging(true);
      setSingleSelectedCard(text);
      setGamePhase('judging');
      
      let currentHand = [...singlePlayerHand];
      if (!isManual && gameConfig.mode === 'single') {
          currentHand = singlePlayerHand.filter(c => (typeof c === 'string' ? c : c.text) !== text);
          let nextDeck = [...cardDeck];
          if (nextDeck.length < 5) { collectCards(10).then(newCards => { setCardDeck(prev => [...prev, ...newCards]); }); }
          if (nextDeck.length > 0) { currentHand.push(nextDeck.shift()); } else { currentHand.push(shuffleArray(FALLBACK_ANSWERS)[0]); }
          setSinglePlayerHand(currentHand); setCardDeck(nextDeck); syncCardsWrapper([currentHand], nextDeck);
      }
      if (gameConfig.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);

      let score = 50, comment = "...", radar = null;
      try {
        if (isAiActive) {
            const res = await fetchAiJudgment(currentTopic, text, isManual);
            if (res) {
                const totalRadarScore = (res.radar.novelty||0) + (res.radar.clarity||0) + (res.radar.relevance||0) + (res.radar.intelligence||0) + (res.radar.empathy||0);
                score = totalRadarScore * 4; comment = res.comment; radar = res.radar; 
            } else throw new Error("AI response null");
        } else { throw new Error("AI inactive"); }
      } catch(e) { score = 40 + Math.floor(Math.random()*40); comment = "評価エラー"; radar = {novelty:3,clarity:3,relevance:3,intelligence:3,empathy:3}; }
      
      setAiComment(formatAiComment(comment));
      if (radar) { updateUserStats(score, radar); setGameRadars(prev => [...prev, radar]); }
      const newZabuton = Math.floor(score / 10); setTotalZabuton(prev => prev + newZabuton);

      // 殿堂入り判定 & 保存
      if (score >= HALL_OF_FAME_THRESHOLD) {
          const entry = { topic: currentTopic, answer: text, score, comment, radar, player: userName, date: new Date().toLocaleDateString() };
          saveToHallOfFame(entry);
          
          // 全国ランキング更新にも挑戦
          if (gameConfig.singleMode === 'score_attack') {
             checkAndSaveGlobalRank(entry);
          }
      }
      
      // ... (Survival / Time Attack checks) ...
      
      setPlayers(prev => { const newP = [...prev]; newP[0].score += score; return newP; });
      setResult({ answer: text, score, comment, radar, zabuton: newZabuton });
      setIsJudging(false); playSound('result'); setGamePhase('result');
  };

  // ... (Other handlers) ...

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20" style={{backgroundImage: 'url("/background.png")', backgroundSize: 'cover', backgroundAttachment: 'fixed'}}>
       <header className="bg-white/90 backdrop-blur-sm border-b p-4 flex justify-between items-center sticky top-0 z-30">
          <h1 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="text-indigo-600"/> AI大喜利</h1>
          <div className="flex gap-2">
              <button onClick={() => setActiveModal('settings')} className="p-2 bg-slate-100 rounded-full"><Settings className="w-5 h-5"/></button>
              {appMode !== 'title' && <button onClick={handleBackToTitle} className="p-2 bg-slate-100 rounded-full"><Home className="w-5 h-5"/></button>}
          </div>
       </header>

       <main className="max-w-2xl mx-auto p-4">
          {/* ... (Title, Setup screens same as before) ... */}
          
          {/* ... (Game screens same as before) ... */}
          
          {/* ... (Result screen - Adjusted margin for Trophy) ... */}
          {gamePhase === 'final_result' && (
              <div className="text-center py-10 animate-in zoom-in">
                  <div className="mb-8"> {/* マージン追加 */}
                      <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-black text-slate-800 mb-2">終了！</h2>
                  </div>
                  <div className="text-6xl font-black text-indigo-600 mb-8">
                       {/* ... */}
                  </div>
                  {/* ... */}
              </div>
          )}

          {/* モーダル群 */}
          {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} userName={userName} setUserName={saveUserName} timeLimit={timeLimit} setTimeLimit={saveTimeLimit} volume={volume} setVolume={saveVolume} playSound={playSound} judgePersonality={judgePersonality} setJudgePersonality={setJudgePersonality} resetLearnedData={resetLearnedData} onLogin={handleLogin} onLogout={handleLogout} currentUser={currentUser} />}
          {activeModal === 'hall' && <HallOfFameModal onClose={() => setActiveModal(null)} data={hallOfFame} globalRankings={globalRankings} activeTab={hallTab} setActiveTab={setHallTab} />}
          {/* ... (Other modals) ... */}

       </main>
    </div>
  );
}