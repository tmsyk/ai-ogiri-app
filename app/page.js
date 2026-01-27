"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Trophy, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, RotateCcw, 
  Users, User, PenTool, Layers, Eye, ArrowDown, Wand2, Home, Wifi, WifiOff, 
  Share2, Copy, Check, AlertTriangle, BookOpen, X, Clock, Skull, Zap, Crown, 
  Infinity, Trash2, Brain, Hash, Star, Settings, History, Info, Volume2, 
  VolumeX, PieChart, Activity, LogOut, Flame, Smile, GraduationCap, Microscope,
  LogIn, Globe, Bot 
} from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, runTransaction } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// --- 設定・定数 ---
const APP_VERSION = "Ver 0.97 (Refactored)";
const API_BASE_URL = "https://ai-ogiri-app.onrender.com/api"; 

const UPDATE_LOGS = [
  { version: "Ver 0.97", date: "2026/01/27", content: ["内部ロジックの定義順序を修正しビルドエラーを解消", "動作の安定性を向上"] },
  { version: "Ver 0.96", date: "2026/01/27", content: ["更新情報画面が開けないバグを修正", "お題を常に5つ先読みする機能を実装"] },
  { version: "Ver 0.95", date: "2026/01/27", content: ["お題の重複回避ロジックを強化", "サーバー応答なし時のGemini直接利用"] },
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
const API_TIMEOUT_MS = 60000;

const JOKER_CARD = { text: "🤖 AIのボケ", rarity: "epic" };

const JUDGES = {
  logic: { name: "理論派審査員", icon: Microscope, desc: "名詞アンカー理論に基づき、4次元の距離で厳格に採点します。" },
  standard: { name: "標準（関西弁）", icon: MessageSquare, desc: "ノリの良い関西弁でツッコミます。" },
  strict: { name: "激辛（毒舌）", icon: Flame, desc: "採点が厳しく、辛辣なコメントをします。" },
  gal: { name: "ギャル", icon: Sparkles, desc: "ノリとバイブスで採点します。" },
  chuuni: { name: "厨二病", icon: Skull, desc: "闇の炎に抱かれたコメントをします。" },
};

const FALLBACK_TOPICS = ["100年後のオリンピック競技は？", "この医者ヤブだ、なぜ？", "桃太郎が鬼ヶ島行きをやめた理由", "上司への謝罪メールの件名", "地球の材料は？", "AIが反乱した理由", "全米が泣いた映画のラスト", "現場に残された意外なもの", "コンビニ店員がキレた理由", "透明人間の地味な使い道", "信長のTwitter第一声", "冷やし中華以外で始めたこと", "宇宙人がガッカリしたこと", "新祝日〇〇の日", "村人Aのついた嘘", "パンダの中の人の悩み", "潰れそうなラーメン屋の特徴", "サザエさんの次回予告", "エレベーターでの一言", "桃太郎の追加メンバー", "魔人が断った願い", "ウルトラマンが帰る理由", "運の悪い男の末路", "母のご馳走", "元レーサーのタクシー", "ゾンビ映画で死ぬ奴", "探しているお客様", "Siriへのプロポーズ", "玉入れに混ざっていたもの", "給食費未納の罰"];
const FALLBACK_ANSWERS = [{text:"プリン",rarity:"normal"},{text:"ポチ",rarity:"normal"},{text:"確定申告",rarity:"normal"},{text:"弁当",rarity:"normal"},{text:"ダイナマイト",rarity:"rare"},{text:"肖像画",rarity:"normal"},{text:"伝説の剣",rarity:"rare"},{text:"消しゴム",rarity:"normal"},{text:"わさび",rarity:"normal"},{text:"自分探し",rarity:"normal"}];
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

// --- Sub Components ---
const ModalBase = ({ onClose, title, icon: Icon, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
    <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
      <div className="text-center mb-6"><h3 className="text-xl font-black text-slate-700 flex items-center justify-center gap-2"><Icon className="w-6 h-6" /> {title}</h3></div>
      <div className="space-y-4 text-slate-700">{children}</div>
      <div className="mt-6"><button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
    </div>
  </div>
);

const Card = ({ card, isSelected, onClick, disabled }) => {
  if (!card) return null;
  const text = typeof card === 'string' ? card : (card.text || "???");
  const isRare = typeof card !== 'string' && card.rarity === 'rare';
  const isEpic = typeof card !== 'string' && card.rarity === 'epic'; 
  
  return (
    <button 
      onClick={() => !disabled && onClick(text)} 
      disabled={disabled} 
      className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden 
      ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} 
      ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:border-indigo-300 hover:shadow-md'}
      ${isRare ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 ring-1 ring-yellow-200' : ''}
      ${isEpic ? 'border-purple-400 bg-purple-50 hover:bg-purple-100 ring-1 ring-purple-200' : ''}
      `}
    >
      {isRare && <span className="absolute top-1 right-1 text-[10px] text-yellow-600">★</span>}
      {isEpic && <span className="absolute top-1 right-1 text-[10px] text-purple-600 flex items-center gap-1"><Bot className="w-3 h-3"/> AI</span>}
      {isEpic ? <span className="text-purple-700 font-black">🤖 AIのボケ</span> : text}
    </button>
  );
};

const RadarChart = ({ data, size = 120, maxValue = 5 }) => {
  const r = size / 2, c = size / 2, max = maxValue;
  const labels = ["言語的", "認知的", "情動的", "視点", "新規性"]; 
  const keys = ["linguistic", "cognitive", "emotional", "focus", "novelty"];
  
  const getP = (v, i) => {
    const val = Math.max(0, v || 0);
    const ratio = val <= 0 ? 0 : 0.2 + (val / max) * 0.8;
    const radius = ratio * r * 0.90; 
    return { 
      x: c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2), 
      y: c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) 
    };
  };
  
  const safeData = data || {};
  const points = keys.map((k, i) => getP(safeData[k], i)).map(p => `${p.x},${p.y}`).join(" ");
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

const SemanticDistanceGauge = ({ distance, hardness, wordTexture }) => {
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
  
  let textureLabel = wordTexture ? `判定: ${wordTexture}` : (hardness > 0.7 ? "カチコチ(硬)" : hardness < 0.3 ? "フニャフニャ(軟)" : "ノーマル");

  return (
    <div className="w-full max-w-xs mx-auto mt-2 space-y-2">
      <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Far</span>
            <span className="font-bold text-green-600">Sweet Spot</span>
            <span>Close</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full relative overflow-hidden">
             <div className="absolute top-0 bottom-0 bg-green-200/50" style={{ left: '40%', width: '20%' }}></div>
             <div className={`absolute top-0 bottom-0 w-2 h-3 rounded-full border border-white shadow-sm transition-all duration-1000 ${colorClass}`} style={{ left: `${Math.min(Math.max(position, 0), 98)}%` }}></div>
          </div>
          <p className={`text-xs font-bold text-center mt-1 ${distance >= 0.4 && distance <= 0.6 ? 'text-green-600' : 'text-slate-500'}`}>{label}</p>
      </div>
       <div>
         <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>軟 (Soft)</span>
            <span>硬 (Hard)</span>
         </div>
         <div className="h-2 bg-slate-100 rounded-full relative">
             <div className="absolute top-0 bottom-0 w-full bg-gradient-to-r from-pink-200 to-slate-400 rounded-full opacity-30"></div>
             <div className="absolute top-0 bottom-0 w-2 h-2 rounded-full bg-slate-600 shadow transition-all duration-1000" style={{ left: `${Math.min(Math.max(hardness * 100, 0), 98)}%` }}></div>
         </div>
         <p className="text-[10px] text-center text-slate-400">{textureLabel}</p>
      </div>
    </div>
  );
};

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
    const total = stats.totalRadar || { linguistic: 0, cognitive: 0, emotional: 0, focus: 0, novelty: 0 };
    return {
      linguistic: (total.linguistic || 0) / count,
      cognitive: (total.cognitive || 0) / count,
      emotional: (total.emotional || 0) / count,
      focus: (total.focus || 0) / count,
      novelty: (total.novelty || 0) / count,
    };
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
  const localSorted = [...data].sort((a, b) => b.score - a.score).slice(0, 3);
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

const InfoModal = ({ onClose, type }) => (
  <ModalBase onClose={onClose} title={type === 'rule' ? "遊び方" : "更新履歴"} icon={type === 'rule' ? BookOpen : History}>
      {type === 'rule' ? (
        <div className="space-y-6 text-slate-700">
          <section className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200"><h4 className="font-bold text-lg mb-2 text-center text-slate-800">🎮 基本の流れ</h4><div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600"><div className="text-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1 border border-slate-200"><MessageSquare className="w-5 h-5 text-indigo-500" /></div><p>AIがお題<br/>を作成</p></div><div className="h-0.5 w-4 bg-slate-300"></div><div className="text-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1 border border-slate-200"><Layers className="w-5 h-5 text-green-500" /></div><p>AIのカード<br/>から選ぶ</p></div><div className="h-0.5 w-4 bg-slate-300"></div><div className="text-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1 border border-slate-200"><Sparkles className="w-5 h-5 text-yellow-500" /></div><p>AIが採点<br/>＆ツッコミ</p></div></div></section>
          <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><Bot className="w-5 h-5 text-gray-500" /> 使用AIモデル</h4><ul className="list-disc list-inside text-sm space-y-1 text-slate-600 ml-1"><li><strong>ゲーム進行・審査</strong>: Google Gemini 2.0 Flash</li><li><strong>AIボケ回答</strong>: Watashiha GPT-6b (via Hugging Face)</li></ul></section>
          <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><User className="w-5 h-5 text-indigo-500" /> 一人で遊ぶ</h4><div className="space-y-3 text-sm"><div className="bg-indigo-50 p-3 rounded-xl"><p className="font-bold text-indigo-700 mb-1">👑 スコアアタック</p>全5回戦の合計得点を競います。</div><div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p>60点未満で即終了。ラウンドが進むと合格ラインが上昇します。</div><div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p>500点到達までの「回答回数」を競います。</div><div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p>制限なし！時間無制限の練習モード。</div></div></section>
          <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ</h4><ul className="list-disc list-inside text-sm space-y-1 text-slate-600 ml-1"><li>親と子に分かれて対戦。</li><li>審査時に「ダミー回答」が混ざります。</li><li>親がダミーを選ぶと親が減点！</li></ul></section>
        </div>
      ) : (
        <div className="space-y-4">{UPDATE_LOGS.map((log, i) => (<div key={i} className="border-l-4 border-indigo-200 pl-4 py-1"><div className="flex items-baseline gap-2 mb-1"><span className="font-bold text-lg text-slate-800">{log.version}</span><span className="text-xs text-slate-400">{log.date}</span></div><ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">{log.content.map((item, j) => <li key={j}>{item}</li>)}</ul></div>))}</div>
      )}
  </ModalBase>
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
  const topicQueueRef = useRef([]); 
  const isPreloadingRef = useRef(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ playCount: 0, maxScore: 0, totalRadar: {} });
  const [hallOfFame, setHallOfFame] = useState([]);
  const [globalRankings, setGlobalRankings] = useState([]); 
  const [rankings, setRankings] = useState({});
  const [learned, setLearned] = useState({ topics: [], answers: [], pool: [] });
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);
  const usedCardsRef = useRef(new Set([...FALLBACK_ANSWERS]));
  const activeCardsRef = useRef(new Set());

  const [activeModal, setActiveModal] = useState(null);
  const [hallTab, setHallTab] = useState('local'); 
  const audioCtx = useRef(null);

  // --- Functions ---
  const playSound = (type) => {
      if (volume <= 0 || typeof window === 'undefined') return;
      if (!audioCtx.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) audioCtx.current = new AC();
      }
      const ctx = audioCtx.current;
      if (ctx) {
          if (ctx.state === 'suspended') ctx.resume();
          playOscillatorSound(ctx, type, volume);
      }
  };

  const normalizeCardText = (card) => (typeof card === 'string' ? card.trim().replace(/\s+/g, ' ') : '');
  
  const getUniqueCards = (cards, usedSet) => {
    const unique = [];
    const local = new Set();
    for (const card of cards || []) {
      const text = typeof card === 'string' ? card : card.text;
      const normalized = normalizeCardText(text);
      if (!normalized || usedSet.has(normalized) || local.has(normalized)) continue;
      local.add(normalized);
      unique.push(typeof card === 'string' ? { text: card, rarity: 'normal' } : card);
    }
    return unique;
  };

  const registerActiveCards = (cards) => {
    cards.forEach(card => activeCardsRef.current.add(card.text));
  };

  const syncActiveCards = (hands, deck) => {
    const next = new Set();
    hands.flat().forEach(card => next.add(card.text));
    deck.forEach(card => next.add(card.text));
    activeCardsRef.current = next;
  };
  
  const syncCardsWrapper = (hands, deck) => {
      syncActiveCards(hands, deck);
  };

  const addCardsToDeck = (cards) => {
    const uniqueCards = getUniqueCards(cards, activeCardsRef.current);
    if (uniqueCards.length === 0) return;
    registerActiveCards(uniqueCards);
    setCardDeck(prev => [...prev, ...uniqueCards]);
  };

  const compactComment = (comment, maxLength = 30) => {
    if (!comment) return "";
    const trimmed = comment.toString().trim();
    const split = trimmed.split(/[。！？!?]/);
    return split[0] + (split.length > 1 ? (/[。！？!?]/.test(trimmed[split[0].length]) ? trimmed[split[0].length] : '') : '');
  };

  // --- API Calls ---
  const callServer = async (endpoint, body) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timeoutId);
      }
  };

  const callGeminiFallback = async (prompt) => {
      try {
          const res = await fetch('/api/gemini', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ prompt }) 
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const json = text.match(/\{[\s\S]*\}/);
          return json ? JSON.parse(json[0]) : JSON.parse(text);
      } catch(e) { return null; }
  };

  const checkContentSafety = async (text) => { 
      if (!isAiActive) return false; 
      try { 
          const res = await callGeminiFallback(`あなたはモデレーターです。"${text}"が不適切ならtrueを {"isInappropriate": boolean} で返して`); 
          return res?.isInappropriate || false; 
      } catch (e) { return false; } 
  };

  const formatAiComment = (comment) => {
    if (!comment) return "";
    return compactComment(comment);
  };

  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？')) {
      playSound('tap'); setIsTimerRunning(false); setAppMode('title');
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      playSound('decision');
    } catch (error) {
      console.error("Login failed", error);
      alert("ログインに失敗しました。");
    }
  };

  const handleLogout = async () => {
    if(window.confirm('ログアウトしますか？')) {
        try {
            await signOut(auth);
            playSound('tap');
        } catch (error) {
            console.error("Logout failed", error);
        }
    }
  };

  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveVolume = (v) => { setVolume(v); localStorage.setItem('aiOgiriVolume', v); };
  const saveTimeLimit = (t) => { setTimeLimit(t); localStorage.setItem('aiOgiriTimeLimit', t); };

  const updateUserStats = (score, radar) => {
      setUserStats(prev => {
          const newCount = (prev.playCount || 0) + 1;
          const newMax = Math.max(prev.maxScore || 0, score);
          const prevRadar = prev.totalRadar || { linguistic: 0, cognitive: 0, emotional: 0, focus: 0, novelty: 0 };
          const r = radar || { linguistic: 0, cognitive: 0, emotional: 0, focus: 0, novelty: 0 };
          const newRadar = {
              linguistic: (prevRadar.linguistic || 0) + (r.linguistic || 0),
              cognitive: (prevRadar.cognitive || 0) + (r.cognitive || 0),
              emotional: (prevRadar.emotional || 0) + (r.emotional || 0),
              focus: (prevRadar.focus || 0) + (r.focus || 0),
              novelty: (prevRadar.novelty || 0) + (r.novelty || 0),
          };
          const newData = { playCount: newCount, maxScore: newMax, totalRadar: newRadar };
          localStorage.setItem('aiOgiriUserStats', JSON.stringify(newData));
          if (currentUser && !currentUser.isAnonymous) { const ref = getUserDocRef(currentUser.uid, 'stats'); if (ref) setDoc(ref, newData).catch(console.error); }
          return newData;
      });
  };

  const saveToHallOfFame = async (entry) => {
    const newHall = [...hallOfFame, entry].sort((a, b) => b.score - a.score).slice(0, 3);
    setHallOfFame(newHall);
    localStorage.setItem('aiOgiriHallOfFame', JSON.stringify(newHall));
    
    if (currentUser && !currentUser.isAnonymous) {
        const ref = getUserDocRef(currentUser.uid, 'hall_of_fame');
        if (ref) await setDoc(ref, { entries: newHall }).catch(console.error);
    }
  };
  
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
              ranks.push(entry);
              ranks.sort((a, b) => b.score - a.score);
              const top10 = ranks.slice(0, 10);
              
              if (JSON.stringify(ranks) !== JSON.stringify(top10) || ranks.length <= 10) {
                  transaction.set(rankRef, { score_attack: top10 }, { merge: true });
              }
          });
      } catch (e) { console.error("Global ranking update failed: ", e); }
  };

  const saveGeneratedCards = async (newCards) => {
    if (!newCards || newCards.length === 0) return;
    const poolData = newCards.map(c => c.text);
    const updatedPool = [...(learned.cardPool || []), ...poolData].slice(-100); 
    const uniquePool = Array.from(new Set(updatedPool));
    const newLocalData = { ...learned, cardPool: uniquePool };
    setLearned(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
  };
  const saveLearnedTopic = async (newTopic) => {
    if (newTopic.includes('{placeholder}')) return;
    const newLocalData = { ...learned, topics: [...learned.topics, newTopic] };
    setLearned(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
  };
  const saveLearnedAnswer = async (newAnswer) => {
    const newLocalData = { ...learned, goodAnswers: [...learned.goodAnswers, newAnswer] };
    setLearned(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
  };
  
  const saveAiCommentFeedback = async (comment, isGood) => {
    if (!comment) return;
    const feedbackEntry = { comment, isGood, date: new Date().toISOString() };
    const localFeedback = JSON.parse(localStorage.getItem('aiOgiriAiFeedback') || '[]');
    const nextFeedback = [feedbackEntry, ...localFeedback].slice(0, 20);
    localStorage.setItem('aiOgiriAiFeedback', JSON.stringify(nextFeedback));
    if (currentUser && !currentUser.isAnonymous) {
        const ref = getUserDocRef(currentUser.uid, 'feedback');
        if (ref) await setDoc(ref, { entries: nextFeedback }).catch(console.error);
    }
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
  const updateRanking = async (modeName, value) => {
    setRankings(prev => {
      const currentList = prev[modeName] || []; const newEntry = { value, date: new Date().toLocaleDateString() }; let newList = [...currentList, newEntry];
      if (modeName === 'score_attack' || modeName === 'survival') newList.sort((a, b) => b.value - a.value); else if (modeName === 'time_attack') newList.sort((a, b) => a.value - b.value); 
      const top3 = newList.slice(0, 3); const newRankings = { ...rankings, [modeName]: top3 };
      localStorage.setItem('aiOgiriRankings', JSON.stringify(newRankings)); return newRankings;
    });
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

  const fetchAiTopic = async () => {
    try {
        const res = await callServer('/topic', { reference_topics: learned.topics });
        if (res.topic && (res.topic.includes("エラー") || res.topic.includes("Error"))) throw new Error("Server error");
        return res.topic;
    } catch (e) {
        console.warn("Topic server failed:", e);
        const fallbackTopic = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
        return fallbackTopic;
    }
  };
  
  const fetchAiCards = async (count = 10, usedSet = usedCardsRef.current) => {
    try {
        const res = await callServer('/cards', { count, used_cards: Array.from(usedSet).slice(-20) });
        const answers = res.answers || [];
        const unique = getUniqueCards(answers, usedSet);
        if (unique.length > 0) saveGeneratedCards(unique);
        if (Math.random() < 0.05) unique.push(JOKER_CARD);
        return unique;
    } catch (e) {
        console.warn("Cards server failed:", e);
        const prompt = `大喜利の回答カード（単語）を${count}個作成。条件: 1.実在する言葉 2.インパクト強なら"rarity":"rare" 3.ジャンルバラバラ 出力: {"answers": [{ "text": "...", "rarity": "normal" }, ... ]}`; 
        const res = await callGeminiFallback(prompt); 
        const rawAnswers = res?.answers || []; 
        const formattedAnswers = rawAnswers.map(a => typeof a === 'string' ? { text: a, rarity: 'normal' } : a); 
        const uniqueAnswers = getUniqueCards(formattedAnswers, usedSet); 
        if (uniqueAnswers.length > 0) saveGeneratedCards(uniqueAnswers); 
        return uniqueAnswers; 
    }
  };

  const fetchAiJudgment = async (topic, answer, isManual) => {
    try {
        const feedbackLogs = (JSON.parse(localStorage.getItem('aiOgiriAiFeedback') || '[]')).map(f => `${f.isGood ? '好評' : '不評'}: ${f.comment}`).slice(0, 5);
        const payload = { topic, answer, is_manual: isManual, personality: judgePersonality, feedback_logs: feedbackLogs };
        const res = await callServer('/judge', payload);
        if (res.comment && res.comment.includes("エラー")) throw new Error("Server returned error judgment");
        return res;
    } catch (e) {
        console.warn("Judge server failed:", e);
        const radarDesc = "radarは4項目(linguistic, cognitive, emotional, focus)を0-5で評価";
        const prompt = `お題:${topic} 回答:${answer} 1.採点(0-100) 2.ツッコミ 3.${radarDesc} 4.解説(reasoning) 出力JSON: {"score":0, "comment":"...", "reasoning":"...", "radar":{...}}`;
        const fallbackRes = await callGeminiFallback(prompt);
        if (fallbackRes) { 
            return { 
                score: fallbackRes.score || 50, 
                comment: fallbackRes.comment || "...", 
                reasoning: fallbackRes.reasoning || "（通信エラーのため簡易判定）", 
                radar: fallbackRes.radar || {linguistic:3, cognitive:3, emotional:3, focus:3, novelty:3}, 
                distance: 0.5, hardness: 0.5, ai_example: "..." 
            }; 
        }
        return null;
    }
  };

  const generateWatashiha = async (topic) => {
      try {
          const res = await callServer('/watashiha', { topic });
          return res.answer;
      } catch (e) { return "通信エラーでボケられへんかったわ..."; }
  };

  const fillTopicQueue = async () => {
    if (isPreloadingRef.current) return;
    if (topicQueueRef.current.length >= 5) return;
    isPreloadingRef.current = true;
    try {
        let t = "";
        try {
            const res = await callServer('/topic', { reference_topics: learned.topics });
            t = res.topic;
        } catch(e) {
            const cleanRef = learned.topics.filter(t => !t.includes('{placeholder}')).slice(0, 5);
            const ref = shuffleArray(cleanRef).join("\n");
            const fallbackRes = await callGeminiFallback(`大喜利のお題を1つ作成。条件:問いかけ形式。名詞一言で回答可能。プレースホルダー禁止。JSON出力{"topic":"..."} 参考:\n${ref}`);
            t = fallbackRes?.topic;
        }
        if (t && !t.includes("エラー") && !t.includes("Error") && !topicQueueRef.current.includes(t)) {
            topicQueueRef.current.push(t);
        }
    } catch (e) { console.warn("Prefetch fail", e); }
    finally { isPreloadingRef.current = false; if (topicQueueRef.current.length < 5) setTimeout(fillTopicQueue, 2000); }
  };

  const generateTopic = async (auto = false) => {
      if (isGeneratingTopic) return;
      setIsGeneratingTopic(true);
      let t = "";
      if (topicQueueRef.current.length > 0) {
          t = topicQueueRef.current.shift();
      } else {
          try {
              t = await fetchAiTopic();
              if (!t) throw new Error("No topic generated");
              if (t.includes('{placeholder}')) t = t.replace(/{placeholder}|「{placeholder}」/g, "？？？");
          } catch (e) { 
              t = FALLBACK_TOPICS[Math.floor(Math.random()*FALLBACK_TOPICS.length)]; 
          }
      }
      if (auto) {
          setCurrentTopic(t); setGamePhase('answer_input'); setTimeLeft(timeLimit); 
          if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
      } else { setManualTopicInput(t); }
      setIsGeneratingTopic(false);
      fillTopicQueue();
  };

  const startRound = (turn) => {
      setSubmissions([]); setSelectedSubmission(null); setAiComment(''); setManualTopicInput(''); setManualAnswerInput('');
      setTopicFeedback(null); setAiFeedback(null); setHasTopicRerolled(false); setHasHandRerolled(false); setTopicCreateRerollCount(0);
      setIsAdvancingRound(false);
      setTurnPlayerIndex(turn); 
      if (gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle') { generateTopic(true); } else { setGamePhase('master_topic'); }
  };

  const initGame = async () => {
      playSound('decision'); 
      setAppMode('game'); 
      setGamePhase('drawing'); 
      setCurrentRound(1); 
      setAnswerCount(0); 
      setIsSurvivalGameOver(false); 
      setIsJudging(false);
      setIsAdvancingRound(false);
      setStartTime(null); 
      setFinishTime(null);
      setGameRadars([]); 
      setTotalZabuton(0);
      topicQueueRef.current = [];
      
      if (gameConfig.singleMode === 'time_attack') setStartTime(Date.now());
      
      activeCardsRef.current = new Set();
      const targetDeckSize = Math.max(INITIAL_DECK_SIZE, HAND_SIZE * (gameConfig.mode === 'single' ? 2 : gameConfig.playerCount + 1) * 3);
      const collected = await collectCards(targetDeckSize);
      const initialDeck = shuffleArray(collected);
      setCardDeck(initialDeck);

      const draw = (d, n) => {
           const h = []; const rest = [...d];
           for(let i=0; i<n; i++) { if (rest.length === 0) break; h.push(rest.shift()); }
           return { h, rest };
      };

      let currentD = initialDeck;
      if (gameConfig.mode === 'single') {
          const { h: pHand, rest } = draw(currentD, HAND_SIZE);
          currentD = rest;
          setPlayers([{ id: 0, name: userName, score: 0, hand: pHand }, { id: 'ai', name: 'AI審査員', score: 0, hand: [] }]);
          setSinglePlayerHand(pHand);
          setMasterIndex(0);
          syncCardsWrapper([pHand], currentD);
      } else {
          const newPlayers = [];
          for(let i=0; i<gameConfig.playerCount; i++){
              const { h, rest } = draw(currentD, HAND_SIZE);
              currentD = rest;
              newPlayers.push({ id: i, name: multiNames[i] || `P${i+1}`, score: 0, hand: h });
          }
          setPlayers(newPlayers);
          setMasterIndex(Math.floor(Math.random() * gameConfig.playerCount));
          syncCardsWrapper(newPlayers.map(p => p.hand), currentD);
      }
      setCardDeck(currentD);
      setTimeout(() => {
          startRound(gameConfig.mode === 'single' ? 0 : 0);
          fillTopicQueue();
      }, 500);
  };

  const nextGameRound = () => {
      playSound('tap');
      if (isAdvancingRound) return;
      setIsAdvancingRound(true);
      setGamePhase('drawing');
      setTimeout(() => {
        if (gameConfig.mode === 'single') {
            if (gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS) { updateRanking('score_attack', players[0].score); return setGamePhase('final_result'); }
            if (gameConfig.singleMode === 'survival' && isSurvivalGameOver) { updateRanking('survival', currentRound - 1); return setGamePhase('final_result'); }
            if (gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) { updateRanking('time_attack', answerCount); return setGamePhase('final_result'); }
        } else {
            if (players.some(p => p.score >= WIN_SCORE_MULTI)) return setGamePhase('final_result');
        }
        setCurrentRound(r => r + 1);
        const nextMaster = gameConfig.mode === 'multi' ? (masterIndex + 1) % players.length : 0;
        setMasterIndex(nextMaster);
        startRound(gameConfig.mode === 'single' ? 0 : nextMaster);
      }, 500);
  };

  const confirmTopicAI = async () => {
    playSound('decision');
    if (!manualTopicInput.trim()) return;
    const isAiOrigin = manualTopicInput === lastAiGeneratedTopic;
    if (!isAiOrigin) {
        setIsCheckingTopic(true);
        if (await checkContentSafety(manualTopicInput)) {
            playSound('timeup'); alert("⚠️ AI判定：不適切な表現が含まれています。");
            setIsCheckingTopic(false); return;
        }
        setIsCheckingTopic(false);
    }
    let topic = manualTopicInput;
    if (!topicsList.includes(topic)) { setTopicsList(prev => [...prev, topic]); saveLearnedTopic(topic); }
    setCurrentTopic(topic);
    if (gameConfig.mode === 'single') {
        setGamePhase('answer_input');
        if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
    } else prepareNextSubmitter(masterIndex, masterIndex, players);
  };

  const rerollHand = async () => {
      playSound('card'); if(hasHandRerolled) return; 
      setIsTimerRunning(false);
      const needed = HAND_SIZE; let newDeck = [...cardDeck];
      if (newDeck.length < needed) { const refill = await collectCards(needed - newDeck.length); newDeck = [...newDeck, ...refill]; }
      const newHand = []; for(let i=0; i<needed; i++) newHand.push(newDeck.shift());
      setSinglePlayerHand(newHand); setCardDeck(newDeck); setHasHandRerolled(true);
      const { hand: filledHand, deck: filledDeck } = await refillHand(newHand, newDeck, HAND_SIZE);
      setSinglePlayerHand(filledHand); setCardDeck(filledDeck); setHasHandRerolled(true);
      syncCardsWrapper([filledHand], filledDeck);
      if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
      if (isAiActive) fetchAiCards(5).then(addCardsToDeck);
  };
  
  const handleHandReroll = async () => { rerollHand(); };

  const submitAnswer = async (text, isManual = false) => {
      playSound('decision'); setIsTimerRunning(false); setIsJudging(true);
      setSingleSelectedCard(text); setGamePhase('judging');
      
      if (text === JOKER_CARD.text) {
          const aiAnswer = await generateWatashiha(currentTopic);
          let currentHand = [...singlePlayerHand].filter(c => (typeof c === 'string' ? c : c.text) !== JOKER_CARD.text);
          let nextDeck = [...cardDeck];
          if (nextDeck.length < 5) { collectCards(10).then(newCards => { setCardDeck(prev => [...prev, ...newCards]); }); }
          if (nextDeck.length > 0) { currentHand.push(nextDeck.shift()); } else { currentHand.push(shuffleArray(FALLBACK_ANSWERS)[0]); }
          setSinglePlayerHand(currentHand); setCardDeck(nextDeck); syncCardsWrapper([currentHand], nextDeck);
          setSingleSelectedCard(aiAnswer + " (by AI)");
          let score = 50, comment = "...", radar = null, distance = 0.5, reasoning = "", hardness = 0.5, ai_example = "", word_texture = "";
          try { if (isAiActive) { const res = await fetchAiJudgment(currentTopic, aiAnswer, true); if (res) { score = res.score || 50; comment = res.comment; radar = res.radar; distance = res.distance || 0.5; reasoning = res.reasoning || ""; hardness = res.hardness; ai_example = res.ai_example; word_texture = res.word_texture; } else throw new Error("AI response null"); } else { throw new Error("AI inactive"); } } catch(e) { score = 50; comment = "AIもスベることはある..."; radar = {linguistic:3,cognitive:3,emotional:3,focus:3,novelty:3}; }
          setAiComment(formatAiComment(comment)); if (radar) { setGameRadars(prev => [...prev, radar]); } 
          const newZabuton = Math.floor(score / 10); setTotalZabuton(prev => prev + newZabuton);
          if (gameConfig.singleMode === 'survival' && score < SURVIVAL_PASS_SCORE + (currentRound - 1) * 10) { setIsSurvivalGameOver(true); }
          if (gameConfig.singleMode === 'time_attack') { if (players[0].score + score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now()); }
          setPlayers(prev => { const newP = [...prev]; newP[0].score += score; return newP; });
          setResult({ answer: aiAnswer, score, comment, radar, zabuton: newZabuton, distance, reasoning, hardness, ai_example, word_texture });
          setIsJudging(false); playSound('result'); setGamePhase('result');
          fillTopicQueue();
          return;
      }

      let currentHand = [...singlePlayerHand];
      if (!isManual && gameConfig.mode === 'single') {
          const usedCard = singlePlayerHand.find(c => (typeof c === 'string' ? c : c.text) === text);
          currentHand = singlePlayerHand.filter(c => (typeof c === 'string' ? c : c.text) !== text);
          let nextDeck = [...cardDeck];
          if (nextDeck.length < 5) { collectCards(10).then(newCards => { setCardDeck(prev => [...prev, ...newCards]); }); }
          if (nextDeck.length > 0) { currentHand.push(nextDeck.shift()); } else { currentHand.push(shuffleArray(FALLBACK_ANSWERS)[0]); }
          setSinglePlayerHand(currentHand); setCardDeck(nextDeck); syncCardsWrapper([currentHand], nextDeck);
      }
      if (gameConfig.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);

      let score = 50, comment = "...", radar = null, distance = 0.5, reasoning = "", hardness = 0.5, ai_example = "", word_texture = "";
      try {
        if (isAiActive) {
            const res = await fetchAiJudgment(currentTopic, text, isManual);
            if (res) {
                score = res.score !== undefined ? res.score : 50;
                comment = res.comment; 
                radar = res.radar; 
                distance = res.distance || 0.5; 
                reasoning = res.reasoning || "";
                hardness = res.hardness || 0.5;
                ai_example = res.ai_example || "";
                word_texture = res.word_texture || "";
            } else throw new Error("AI response null");
        } else { throw new Error("AI inactive"); }
      } catch(e) { score = 40 + Math.floor(Math.random()*40); comment = "評価エラー(Fallback)"; radar = {linguistic:2,cognitive:2,emotional:2,focus:2,novelty:2}; distance = 0.5; }
      
      if (!isManual) {
          const usedCard = singlePlayerHand.find(c => (typeof c === 'string' ? c : c.text) === text);
          if (usedCard && typeof usedCard !== 'string' && usedCard.rarity === 'rare') {
              score += 5;
              reasoning += " (✨レアカードボーナス +5点)";
          }
      }

      setAiComment(formatAiComment(comment));
      if (radar) { updateUserStats(score, radar); setGameRadars(prev => [...prev, radar]); }
      const newZabuton = Math.floor(score / 10); setTotalZabuton(prev => prev + newZabuton);

      if (score >= HALL_OF_FAME_THRESHOLD) {
          const entry = { topic: currentTopic, answer: text, score, comment, radar, player: userName, date: new Date().toLocaleDateString() };
          saveToHallOfFame(entry);
          if (gameConfig.singleMode === 'score_attack') checkAndSaveGlobalRank(entry);
      }
      
      const currentPassScore = SURVIVAL_PASS_SCORE + (currentRound - 1) * 10;
      let isGameOver = false;
      if (gameConfig.singleMode === 'survival' && score < currentPassScore) { setIsSurvivalGameOver(true); isGameOver = true; }
      if (gameConfig.singleMode === 'time_attack') { if (players[0].score + score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now()); }
      
      setPlayers(prev => { const newP = [...prev]; newP[0].score += score; return newP; });
      setResult({ answer: text, score, comment, radar, zabuton: newZabuton, distance, reasoning, hardness, ai_example, word_texture });
      setIsJudging(false); playSound('result'); setGamePhase('result');
      fillTopicQueue();
  };

  const handleMultiSubmit = (text) => {
      setSubmissions(prev => [...prev, { playerId: players[turnPlayerIndex].id, answerText: text }]);
      setPlayers(prev => prev.map(p => p.id === players[turnPlayerIndex].id ? { ...p, hand: p.hand.filter(c => (typeof c === 'string' ? c : c.text) !== text) } : p));
      setManualAnswerInput('');
      const nextTurn = (turnPlayerIndex + 1) % players.length;
      if (nextTurn === masterIndex) { 
          let dummy = cardDeck[0]?.text || "ダミー";
          setSubmissions(prev => shuffleArray([...prev, { playerId: 'dummy', answerText: dummy, isDummy: true }]));
          setGamePhase('judging');
      } else { setTurnPlayerIndex(nextTurn); setGamePhase('turn_change'); }
  };

  const handleJudge = (sub) => { playSound('decision'); setSelectedSubmission(sub); setPlayers(prev => prev.map(p => { if (sub.isDummy && p.id === players[masterIndex].id) return { ...p, score: p.score - 1 }; if (!sub.isDummy && p.id === sub.playerId) return { ...p, score: p.score + 1 }; return p; })); playSound('result'); setGamePhase('result'); };
  const handleTopicReroll = async () => { playSound('tap'); if (hasTopicRerolled || isGeneratingTopic) return; setIsGeneratingTopic(true); let topic = ""; try { const res = await fetchAiTopic(); topic = res || FALLBACK_TOPICS[0]; } catch(e) { topic = FALLBACK_TOPICS[0]; } setCurrentTopic(topic); setHasTopicRerolled(true); setIsGeneratingTopic(false); };
  const handleSingleSubmitManual = async (text) => { submitAnswer(text, true); };
  const handleTopicFeedback = (isGood) => { playSound('tap'); setTopicFeedback(isGood ? 'good' : 'bad'); if (isGood && currentTopic) saveLearnedTopic(currentTopic); };
  const handleAiFeedback = (isGood) => { playSound('tap'); setAiFeedback(isGood ? 'good' : 'bad'); if (isGood && selectedSubmission?.answerText) saveLearnedAnswer(selectedSubmission.answerText); saveAiCommentFeedback(aiComment, isGood); };
  const confirmTopic = () => { playSound('decision'); setCurrentTopic(manualTopicInput); if (gameConfig.mode === 'single') { setGamePhase('answer_input'); setTimeLeft(timeLimit); if(gameConfig.singleMode!=='freestyle') setIsTimerRunning(true); } else { setGamePhase('turn_change'); setTurnPlayerIndex((masterIndex + 1) % players.length); } };
  const handleTimeUp = () => { playSound('timeup'); const card = singlePlayerHand[0] || "時間切れ"; const cardText = typeof card === 'string' ? card : card.text; submitAnswer(cardText); };
  const prepareNextSubmitter = (current, master, currentPlayers) => { const next = (current + 1) % currentPlayers.length; if (next === master) { setGamePhase('turn_change'); setTurnPlayerIndex(master); } else { setTurnPlayerIndex(next); setGamePhase('turn_change'); } };

  // Effects
  useEffect(() => {
    const localRankings = localStorage.getItem('aiOgiriRankings'); if (localRankings) setRankings(JSON.parse(localRankings));
    const localLearned = localStorage.getItem('aiOgiriLearnedData'); 
    if (localLearned) { const parsed = JSON.parse(localLearned); setLearned(parsed); if (parsed.topics) setTopicsList(prev => [...prev, ...parsed.topics]); }
    const savedName = localStorage.getItem('aiOgiriUserName'); if (savedName) setUserName(savedName);
    const localHall = localStorage.getItem('aiOgiriHallOfFame'); if (localHall) setHallOfFame(JSON.parse(localHall));
    const savedStats = localStorage.getItem('aiOgiriUserStats'); if (savedStats) setUserStats(JSON.parse(savedStats));
    const savedVolume = localStorage.getItem('aiOgiriVolume'); if (savedVolume) setVolume(parseFloat(savedVolume));
    const savedTime = localStorage.getItem('aiOgiriTimeLimit'); if (savedTime) setTimeLimit(parseInt(savedTime));
    
    if (auth) { const unsub = onAuthStateChanged(auth, async (u) => { setCurrentUser(u); if (u && !u.isAnonymous) { try { const statsRef = getUserDocRef(u.uid, 'stats'); if (statsRef) { const snap = await getDoc(statsRef); if (snap.exists()) setUserStats(snap.data()); } const hallRef = getUserDocRef(u.uid, 'hall_of_fame'); if (hallRef) { const snap = await getDoc(hallRef); if (snap.exists() && snap.data().entries) setHallOfFame(snap.data().entries); } } catch (e) { console.error("Data sync error:", e); } } }); if (!auth.currentUser) signInAnonymously(auth).catch(()=>{}); return () => unsub(); }
  }, []);
  
  useEffect(() => { if (!db) return; const rankRef = getDocRef('shared_db', 'global_ranking'); if (rankRef) { const unsub = onSnapshot(rankRef, (doc) => { if (doc.exists()) { setGlobalRankings(doc.data().score_attack || []); } }); return () => unsub(); } }, []);
  useEffect(() => { let t; if (isTimerRunning && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000); else if (isTimerRunning && timeLeft === 0) { setIsTimerRunning(false); handleTimeUp(); } return () => clearInterval(t); }, [isTimerRunning, timeLeft]);
  useEffect(() => { let t; if (appMode === 'game' && gameConfig.singleMode === 'time_attack' && startTime && !finishTime) { t = setInterval(() => setDisplayTime(formatTime(Date.now() - startTime)), 100); } return () => clearInterval(t); }, [appMode, startTime, finishTime]);
  useEffect(() => { if (!isAiActive || appMode !== 'game') return; if (cardDeck.length >= HAND_SIZE * 2) return; const now = Date.now(); if (now - lastCardFetchRef.current < 5000) return; lastCardFetchRef.current = now; fetchAiCards(HAND_SIZE).then(addCardsToDeck); }, [appMode, cardDeck.length, isAiActive]);

  // ★ プリフェッチの開始 (AI有効時)
  useEffect(() => {
     if (isAiActive && gamePhase !== 'drawing') {
         fillTopicQueue();
     }
  }, [isAiActive, gamePhase]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20" style={{backgroundImage: 'url("/background.png")', backgroundSize: 'cover', backgroundAttachment: 'fixed'}}>
       <header className="bg-white/90 backdrop-blur-sm border-b p-4 flex justify-between items-center sticky top-0 z-30">
          <h1 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="text-indigo-600"/> AI大喜利</h1>
          <div className="flex items-center gap-4">
              {gamePhase !== 'drawing' && totalZabuton > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full text-xs font-bold text-yellow-800">
                      <div className="w-4 h-3 bg-yellow-500 rounded-sm shadow-sm"></div>×{totalZabuton}
                  </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setActiveModal('settings')} className="p-2 bg-slate-100 rounded-full"><Settings className="w-5 h-5"/></button>
                {appMode !== 'title' && <button onClick={handleBackToTitle} className="p-2 bg-slate-100 rounded-full"><Home className="w-5 h-5"/></button>}
              </div>
          </div>
       </header>

       <main className="max-w-2xl mx-auto p-4">
          {appMode === 'title' && (
              <div className="text-center py-10 animate-in fade-in">
                  <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-white"><img src="/icon.png" alt="Logo" className="w-24 h-24 object-contain" onError={(e) => e.target.style.display='none'} /><Sparkles className="w-10 h-10 text-indigo-600 absolute" style={{display: 'none'}}/></div>
                  <h1 className="text-4xl font-black mb-2 drop-shadow-sm text-slate-800">AI大喜利</h1>
                  <p className="text-slate-500 mb-8 font-bold">{APP_VERSION}<br/><span className="text-xs text-indigo-500 font-normal">Powered by Gemini & Watashiha GPT-6b</span></p>
                  
                  <div className="space-y-4 mb-8">
                      <button onClick={() => { playSound('decision'); setGameConfig({...gameConfig, mode: 'single'}); setAppMode('setup'); }} className="w-full p-4 bg-white border-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:border-indigo-500 transition-all"><User/> 一人で遊ぶ</button>
                      <button onClick={() => { playSound('decision'); setGameConfig({...gameConfig, mode: 'multi'}); setAppMode('setup'); }} className="w-full p-4 bg-white border-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:border-amber-500 transition-all"><Users/> みんなで遊ぶ</button>
                  </div>

                  <div className="flex justify-center gap-4">
                      <button onClick={() => setActiveModal('data')} className="text-xs flex flex-col items-center gap-1 text-slate-500 bg-white/50 p-2 rounded-lg"><Activity/>マイデータ</button>
                      <button onClick={() => setActiveModal('rule')} className="text-xs flex flex-col items-center gap-1 text-slate-500 bg-white/50 p-2 rounded-lg"><BookOpen/>ルール</button>
                      <button onClick={() => setActiveModal('hall')} className="text-xs flex flex-col items-center gap-1 text-yellow-600 bg-white/50 p-2 rounded-lg"><Crown/>殿堂入り</button>
                      <button onClick={() => setActiveModal('update')} className="text-xs flex flex-col items-center gap-1 text-slate-500 bg-white/50 p-2 rounded-lg"><History/>更新情報</button>
                  </div>
              </div>
          )}

          {appMode === 'setup' && (
              <div className="py-6 animate-in slide-in-from-right">
                  <h2 className="text-2xl font-bold mb-6 text-center text-slate-800 drop-shadow-sm">設定</h2>
                  <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm mb-6">
                      {gameConfig.mode === 'single' ? (
                          <div className="space-y-3">
                              {['score_attack', 'survival', 'time_attack', 'freestyle'].map(m => (
                                  <button key={m} onClick={() => { playSound('tap'); setGameConfig({...gameConfig, singleMode: m}); }} className={`w-full p-4 rounded-xl border-2 text-left font-bold flex justify-between ${gameConfig.singleMode === m ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}>
                                      <span>{m === 'score_attack' ? '🏆 スコアアタック' : m === 'survival' ? '💀 サバイバル' : m === 'time_attack' ? '⏱️ タイムアタック' : '♾️ フリースタイル'}</span>
                                      {gameConfig.singleMode === m && <Check className="text-indigo-600"/>}
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <div>
                              <label className="block font-bold mb-2">参加人数: {gameConfig.playerCount}人</label>
                              <input type="range" min="2" max="10" value={gameConfig.playerCount} onChange={(e) => setGameConfig({...gameConfig, playerCount: parseInt(e.target.value)})} className="w-full accent-indigo-600"/>
                          </div>
                      )}
                  </div>
                  <button onClick={initGame} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 transition-all">スタート！</button>
              </div>
          )}

          {appMode === 'game' && (
              <>
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-500 bg-white/80 p-2 rounded-full backdrop-blur-sm">
                    <span>{gameConfig.mode === 'single' ? gameConfig.singleMode.toUpperCase() : 'MULTI PLAY'}</span>
                    <span>Round {currentRound}</span>
                    {gameConfig.singleMode === 'time_attack' && <span className="text-blue-600">{answerCount}回</span>}
                </div>

                {gamePhase === 'drawing' && (
                    <div className="text-center py-20">
                        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-slate-300 mb-4"/>
                        <p className="text-slate-500 font-bold">準備中...</p>
                        <p className="text-xs text-slate-400 mt-2">AIがカードを生成しています...</p>
                    </div>
                )}

                {gamePhase === 'master_topic' && (
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-sm animate-in fade-in">
                        <h2 className="text-xl font-bold mb-4 text-center">お題を決めてください</h2>
                        <textarea id="topicInput" name="topicInput" value={manualTopicInput} onChange={(e) => setManualTopicInput(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl mb-4 border" placeholder="例：冷蔵庫を開けたら..." />
                        <div className="flex gap-2">
                            <button onClick={() => generateTopic()} disabled={isGeneratingTopic} className="flex-1 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl flex justify-center items-center gap-2"><Wand2 className="w-4 h-4"/> AI作成</button>
                            <button onClick={confirmTopicAI} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">決定</button>
                        </div>
                    </div>
                )}
                
                {gamePhase === 'turn_change' && (
                    <div className="text-center py-10 animate-in fade-in">
                        <h2 className="text-2xl font-bold mb-4">次は {players[turnPlayerIndex].name} さんの番です</h2>
                        <button onClick={() => setGamePhase('answer_input')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-full">回答する</button>
                    </div>
                )}

                {gamePhase === 'answer_input' && (
                    <div className="animate-in slide-in-from-bottom-4">
                        <TopicDisplay topic={currentTopic} answer={null} gamePhase={gamePhase} mode={gameConfig.mode} topicFeedback={topicFeedback} onFeedback={handleTopicFeedback} onReroll={handleTopicReroll} hasRerolled={hasTopicRerolled} isGenerating={isGeneratingTopic} singleMode={gameConfig.singleMode} />
                        
                        {isTimerRunning && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs font-bold mb-1"><span>残り時間</span><span className="text-red-500">{timeLeft}秒</span></div>
                                <div className="w-full bg-slate-200 h-2 rounded-full"><div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft/timeLimit)*100}%` }}></div></div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-500">手札から選択</span>
                            {gameConfig.mode === 'single' && <button onClick={rerollHand} disabled={hasHandRerolled} className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"><RefreshCw className="w-3 h-3"/> 手札交換 {hasHandRerolled ? '(済)' : ''}</button>}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {(gameConfig.mode === 'single' ? singlePlayerHand : players[turnPlayerIndex].hand).map((t, i) => (
                                <Card key={i} card={t} disabled={isJudging} onClick={(text) => {
                                    if(gameConfig.mode==='single') submitAnswer(text);
                                    else if(window.confirm('このカードで回答しますか？')) handleMultiSubmit(text);
                                }} />
                            ))}
                        </div>
                        
                        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-sm">
                            <p className="font-bold text-xs text-slate-400 mb-2">自由に回答</p>
                            <div className="flex gap-2">
                                <input id="answerInput" name="answerInput" value={manualAnswerInput} onChange={(e) => setManualAnswerInput(e.target.value)} className="flex-1 p-2 bg-slate-50 rounded border" placeholder="回答を入力..." />
                                <button onClick={() => {
                                    if(gameConfig.mode==='single') handleSingleSubmitManual(manualAnswerInput);
                                    else handleMultiSubmit(manualAnswerInput);
                                }} disabled={!manualAnswerInput.trim() || isJudging} className="px-4 bg-slate-800 text-white rounded font-bold">送信</button>
                            </div>
                        </div>
                        
                        {gameConfig.singleMode === 'freestyle' && (
                            <button onClick={() => setGamePhase('final_result')} className="w-full mt-4 py-3 bg-red-100 text-red-500 font-bold rounded-xl text-xs hover:bg-red-200">ゲームを終了して結果を見る</button>
                        )}
                    </div>
                )}
                
                {gamePhase === 'judging' && (
                   gameConfig.mode === 'single' ? (
                       <div className="text-center py-20">
                           <Sparkles className="w-16 h-16 text-amber-500 animate-pulse mx-auto mb-4"/>
                           <h3 className="text-2xl font-bold text-slate-800 mb-2">審査中...</h3>
                           <p className="text-sm text-slate-500">あなたの回答: <span className="font-bold text-indigo-600">{singleSelectedCard}</span></p>
                       </div>
                   ) : (
                       <div className="animate-in fade-in">
                           <h2 className="text-center font-bold mb-4">{players[masterIndex].name}さんが選んでください</h2>
                           <TopicDisplay topic={currentTopic} answer={null} />
                           <div className="space-y-2 mt-4">
                               {submissions.map((sub, i) => (
                                   <button key={i} onClick={() => handleJudge(sub)} className="w-full p-4 bg-white border-2 rounded-xl text-left font-bold">{sub.answerText}</button>
                               ))}
                           </div>
                       </div>
                   )
                )}

                {gamePhase === 'result' && (
                    <div className="text-center animate-in zoom-in">
                        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-xl mb-6">
                            <p className="text-sm text-slate-400 font-bold mb-2">お題</p>
                            {/* お題表示をシンプルに */}
                            <p className="text-lg font-bold mb-6">{currentTopic}</p>
                            <div className="border-t border-slate-100 my-4"></div>
                            <p className="text-sm text-slate-400 font-bold mb-2">回答</p>
                            <p className="text-3xl font-black text-indigo-600 mb-4">{result?.answer}</p>
                            
                            {result?.distance && <div className="mb-6 px-4"><SemanticDistanceGauge distance={result.distance} hardness={result.hardness || 0.5} wordTexture={result.word_texture} /></div>}
                            {gameConfig.mode === 'single' && result?.zabuton > 0 && <div className="mb-4"><ZabutonStack count={result.zabuton} /></div>}

                            {gameConfig.mode === 'single' ? (
                                <>
                                <div className="text-6xl font-black text-yellow-500 mb-4">{result?.score}点</div>
                                <div className="bg-slate-100 p-4 rounded-xl text-left inline-block w-full">
                                  <div className="flex items-center gap-2 mb-2">
                                     {JUDGES[judgePersonality].icon && React.createElement(JUDGES[judgePersonality].icon, {className: "w-5 h-5 text-indigo-600"})} 
                                     <span className="font-bold text-sm text-slate-600">{JUDGES[judgePersonality].name}のコメント</span>
                                  </div>
                                  <p className="text-lg font-bold text-slate-800 mb-2">「{aiComment}」</p>
                                  {result?.reasoning && <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500"><p className="font-bold mb-1">💡 評価の理由:</p>{result.reasoning}</div>}
                                  {result?.ai_example && <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500"><p className="font-bold mb-1">🤖 AIの模範解答:</p>「{result.ai_example}」</div>}

                                  <div className="mt-4 flex justify-end gap-2 text-xs text-slate-500">
                                    <span>評価:</span>
                                    {aiFeedback === null ? (
                                      <>
                                        <button onClick={() => handleAiFeedback(true)} className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200 hover:bg-slate-50"><ThumbsUp className="w-3 h-3" /> いいね</button>
                                        <button onClick={() => handleAiFeedback(false)} className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-slate-200 hover:bg-slate-50"><ThumbsDown className="w-3 h-3" /> いまいち</button>
                                      </>
                                    ) : (
                                      <span className="text-indigo-600 font-bold">{aiFeedback === 'good' ? '👍 送信済' : '👎 送信済'}</span>
                                    )}
                                  </div>
                                </div>
                                </>
                            ) : (
                                <div className="mt-4 p-4 bg-yellow-50 rounded-xl font-bold">
                                    {selectedSubmission.isDummy ? <span className="text-red-500">残念！それはAIのダミー回答でした！(-1点)</span> : <span className="text-indigo-600">ナイス回答！ (+1点)</span>}
                                </div>
                            )}
                        </div>
                        <button onClick={nextGameRound} disabled={isAdvancingRound} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl disabled:opacity-60 disabled:cursor-not-allowed">
                            {(gameConfig.mode === 'single' && gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS) ? '結果発表へ' :
                             (gameConfig.mode === 'single' && gameConfig.singleMode === 'survival' && isSurvivalGameOver) ? '結果発表へ' :
                             (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) ? '結果発表へ' :
                             (gameConfig.mode === 'multi' && players.some(p => p.score >= WIN_SCORE_MULTI)) ? '結果発表へ' : '次のラウンドへ'}
                        </button>
                    </div>
                )}

                {gamePhase === 'final_result' && (
                    <div className="text-center py-10 animate-in zoom-in">
                        <div className="mb-8">
                           <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                           <h3 className="text-3xl font-black text-slate-800 mb-2">終了！</h3>
                        </div>
                        <div className="text-6xl font-black text-indigo-600 mb-8">
                             {gameConfig.mode === 'multi' ? `優勝: ${players.sort((a,b)=>b.score-a.score)[0].name}` : `${players[0].score}${gameConfig.singleMode === 'time_attack' ? '点' : '点'}`}
                             {gameConfig.singleMode === 'time_attack' && <div className="text-lg mt-2 font-bold">回答数: {answerCount}回</div>}
                        </div>
                        {gameConfig.mode === 'single' && (
                           <>
                             {gameConfig.singleMode === 'score_attack' && (
                                <div className="mb-8 p-4 bg-yellow-100 rounded-xl inline-block shadow-sm">
                                  <p className="text-sm font-bold text-yellow-800 mb-1">あなたの称号</p>
                                  <p className="text-3xl font-black text-yellow-600">
                                    {players[0].score >= 450 ? "お笑い神" : 
                                     players[0].score >= 400 ? "大御所" : 
                                     players[0].score >= 300 ? "真打ち" : 
                                     players[0].score >= 200 ? "前座" : "見習い"}
                                  </p>
                                </div>
                             )}
                             {gameRadars.length > 0 && (
                                <div className="mb-8 flex justify-center flex-col items-center mt-10">
                                    <p className="text-sm font-bold text-slate-500 mb-6">今回の平均評価</p>
                                    <RadarChart data={getFinalGameRadar()} size={180} maxValue={5} />
                                </div>
                             )}
                           </>
                        )}
                        <button onClick={() => setAppMode('title')} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl">タイトルへ</button>
                    </div>
                )}
              </>
          )}

          {/* モーダル群 */}
          {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} userName={userName} setUserName={saveUserName} timeLimit={timeLimit} setTimeLimit={saveTimeLimit} volume={volume} setVolume={saveVolume} playSound={playSound} judgePersonality={judgePersonality} setJudgePersonality={setJudgePersonality} resetLearnedData={resetLearnedData} onLogin={handleLogin} onLogout={handleLogout} currentUser={currentUser} />}
          {activeModal === 'rule' && <InfoModal onClose={() => setActiveModal(null)} type="rule" />}
          {activeModal === 'update' && <InfoModal onClose={() => setActiveModal(null)} type="update" />}
          {activeModal === 'hall' && <HallOfFameModal onClose={() => setActiveModal(null)} data={hallOfFame} globalRankings={globalRankings} activeTab={hallTab} setActiveTab={setHallTab} />}
          {activeModal === 'data' && <MyDataModal stats={userStats} onClose={() => setActiveModal(null)} userName={userName} />}

       </main>
    </div>
  );
}