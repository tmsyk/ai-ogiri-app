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

// --- 設定・定数 ---
const APP_VERSION = "Ver 0.45";
const UPDATE_LOGS = [
  { version: "Ver 0.45", date: "2026/01/26", content: ["お題作成画面のAIボタン不具合を修正", "レーダーチャートの0点位置を調整し視認性向上"] },
  { version: "Ver 0.44", date: "2026/01/25", content: ["採点基準を厳正化（0-5点評価）", "レーダーチャートのメリハリを調整"] },
  { version: "Ver 0.43", date: "2026/01/25", content: ["スコア計算をレーダーチャート評価連動に変更", "グラフ表示位置のレイアウト調整"] },
];

const TOTAL_ROUNDS = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
const HIGH_SCORE_THRESHOLD = 80;
const HALL_OF_FAME_THRESHOLD = 90;
const TIME_LIMIT = 30;
const WIN_SCORE_MULTI = 10;
const HAND_SIZE = 6;
const INITIAL_DECK_SIZE = 60; 
const RADAR_MAX_PER_ANSWER = 5;
const MAX_REROLL = 3;
const API_TIMEOUT_MS = 15000; // APIタイムアウト時間

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
  "賞味期限切れのプリン", "隣の家のポチ", "確定申告書", "お母さんの手作り弁当", "爆発寸前のダイナマイト",
  "聖徳太子の肖像画", "伝説の剣", "使いかけの消しゴム", "大量のわさび", "自分探しの旅", "闇の組織",
  "タピオカ", "空飛ぶスパゲッティ", "5000兆円", "筋肉痛", "反抗期", "黒歴史", "パスワード", "ひざ小僧",
  "絶対に押してはいけないボタン", "全裸の銅像", "生き別れの兄", "トイレットペーパーの芯", "3日前のおにぎり", "オカンの小言",
  "虚無", "宇宙の真理", "生乾きの靴下", "高すぎるツボ", "怪しい勧誘", "激辛麻婆豆腐", "猫の肉球", "壊れたラジオ",
  "深夜のラブレター", "既読スルー", "アフロヘアー", "筋肉", "プロテイン", "札束風呂", "へそくり", "火星人",
  "透明人間", "サイズ違いの靴", "毒リンゴ", "マッチョな妖精", "空飛ぶサメ", "忍者", "侍", "YouTuber", "AI", "バグ", "404 Error"
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

const Card = ({ text, isSelected, onClick, disabled }) => (
  <button onClick={() => !disabled && onClick(text)} disabled={disabled} className={`relative p-3 rounded-xl transition-all duration-200 border-2 shadow-sm flex items-center justify-center text-center h-24 w-full text-sm font-bold leading-snug break-words overflow-hidden text-slate-800 ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 transform scale-105 shadow-xl ring-2 ring-indigo-300' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:border-indigo-300 hover:shadow-md'}`}>{text}</button>
);

const RadarChart = ({ data, size = 120, maxValue = 5 }) => {
  const c = size / 2;
  // 文字被りを防ぐため、半径を少し小さく設定
  const r = (size / 2) * 0.75;
  const max = maxValue;
  const labels = ["意外性", "文脈", "瞬発力", "毒気", "知性"]; 
  const keys = ["surprise", "context", "punchline", "humor", "intelligence"];
  
  // 視認性向上のための補正
  const getP = (v, i) => {
    const val = Math.max(0, v);
    // 修正: 0点を20%の位置にオフセット。5点を100%の位置にする線形補間
    // ratio = 0.2 + (val / max) * 0.8
    // これにより、0点でも少し広がり、各項目の差（凹凸）がわかりやすくなる
    const ratio = 0.2 + (val / max) * 0.8;
    const radius = ratio * r * 0.90; 
    return { 
      x: c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2), 
      y: c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) 
    };
  };
  
  const points = keys.map((k, i) => getP(data[k] || 0, i)).map(p => `${p.x},${p.y}`).join(" ");
  const bgLevels = [5, 4, 3, 2, 1];

  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景グリッド */}
        {bgLevels.map(l => (
          <polygon key={l} points={keys.map((_, i) => {
             // グリッドは線形に描画（背景は0が中心）
             // ユーザー要望に合わせて背景も0=20%にする場合はここも getP と同じロジックにするが、
             // 通常グリッドは等間隔のほうが値が読みやすいため、グリッドは0.2刻みで描画しつつ、
             // データのプロットだけを底上げするのが一般的。
             // ここではデータの見え方に合わせ、グリッドも同じ比率で歪ませる（0=20%位置）
             const val = l;
             const ratio = 0.2 + (val / max) * 0.8;
             const radius = ratio * r * 0.90;
             return (c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2)) + "," + (c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2));
          }).join(" ")} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {/* 軸線 */}
        {keys.map((_, i) => { 
           // 軸は中心(20%地点ではなく本当の中心)から引く
           const radius = r * 0.90; // 最大(100%地点)
           const x = c + radius * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2);
           const y = c + radius * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2);
           return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />; 
        })}
        <polygon points={points} fill="rgba(99, 102, 241, 0.5)" stroke="#4f46e5" strokeWidth="2" />
        {/* ラベル位置 */}
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

const SettingsModal = ({ onClose, userName, setUserName, timeLimit, setTimeLimit, volume, setVolume, playSound, resetLearnedData }) => (
  <ModalBase onClose={onClose} title="設定" icon={Settings}>
      <div><label className="block text-sm font-bold text-slate-700 mb-2">プレイヤー名</label><div className="relative"><input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold" /><User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" /></div></div>
      <div><label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">{volume === 0 ? <VolumeX className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>} 音量: {Math.round(volume * 100)}%</label><input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); playSound('tap', v); }} className="w-full accent-indigo-600" /></div>
      <div><label className="block text-xs font-bold text-slate-500 mb-2">制限時間: {timeLimit}秒</label><input type="range" min="10" max="60" step="5" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} className="w-full accent-indigo-600" /></div>
      <div className="pt-4 border-t border-slate-100"><button onClick={resetLearnedData} className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 transition-colors"><Trash2 className="w-3 h-3" /> 学習データの削除</button></div>
  </ModalBase>
);

const MyDataModal = ({ stats, onClose, userName }) => {
  const getTotalAverage = () => {
    const count = stats.playCount || 1;
    const total = stats.totalRadar || stats.averageRadar || { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 };
    if (stats.totalRadar) {
        return {
          surprise: total.surprise / count,
          context: total.context / count,
          punchline: total.punchline / count,
          humor: total.humor / count,
          intelligence: total.intelligence / count,
        };
    }
    return total;
  };

  return (
    <ModalBase onClose={onClose} title="マイデータ" icon={Activity}>
        <p className="text-sm text-center text-slate-500 font-bold mb-4">{userName} さんの戦績</p>
        <div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">通算回答数</p><p className="text-2xl font-black text-slate-700">{stats.playCount || 0}回</p></div><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">最高スコア</p><p className="text-2xl font-black text-yellow-500">{stats.maxScore || 0}点</p></div></div>
        <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col items-center pt-10"><p className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> あなたの芸風分析（平均）</p>{stats.playCount > 0 ? ( <RadarChart data={getTotalAverage()} size={200} maxValue={5} /> ) : ( <p className="text-xs text-slate-400 py-8">まだデータがありません</p> )}</div>
    </ModalBase>
  );
};

const HallOfFameModal = ({ onClose, data }) => {
  const sortedData = [...data].sort((a, b) => b.score - a.score).slice(0, 20);
  return (
    <ModalBase onClose={onClose} title="殿堂入りボケ" icon={Crown}>
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
          <section className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
             <h4 className="font-bold text-lg mb-2 text-center text-slate-800">🎮 基本の流れ</h4>
             <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
               <div className="text-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1 border border-slate-200"><MessageSquare className="w-5 h-5 text-indigo-500" /></div><p>AIがお題<br/>を作成</p></div><div className="h-0.5 w-4 bg-slate-300"></div>
               <div className="text-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1 border border-slate-200"><Layers className="w-5 h-5 text-green-500" /></div><p>AIのカード<br/>から選ぶ</p></div><div className="h-0.5 w-4 bg-slate-300"></div>
               <div className="text-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1 border border-slate-200"><Sparkles className="w-5 h-5 text-yellow-500" /></div><p>AIが採点<br/>＆ツッコミ</p></div>
             </div>
          </section>
          <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><User className="w-5 h-5 text-indigo-500" /> 一人で遊ぶ</h4><div className="space-y-3 text-sm"><div className="bg-indigo-50 p-3 rounded-xl"><p className="font-bold text-indigo-700 mb-1">👑 スコアアタック</p>全5回戦の合計得点を競います。</div><div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p>60点未満で即終了。</div><div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p>500点到達までの「回答回数」を競います。</div><div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p>制限なし！時間無制限の練習モード。</div></div></section>
          <section><h4 className="font-bold text-lg mb-2 flex items-center gap-2 border-b pb-1"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ</h4><ul className="list-disc list-inside text-sm space-y-1 text-slate-600 ml-1"><li>親と子に分かれて対戦。</li><li>審査時に「ダミー回答」が混ざります。</li><li>親がダミーを選ぶと親が減点！</li></ul></section>
        </div>
      ) : (
        <div className="space-y-4">
            {UPDATE_LOGS.map((log, i) => (
              <div key={i} className="border-l-4 border-indigo-200 pl-4 py-1">
                <div className="flex items-baseline gap-2 mb-1"><span className="font-bold text-lg text-slate-800">{log.version}</span><span className="text-xs text-slate-400">{log.date}</span></div>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">{log.content.map((item, j) => <li key={j}>{item}</li>)}</ul>
              </div>
            ))}
        </div>
      )}
  </ModalBase>
);

// --- メインアプリ ---
export default function AiOgiriApp() {
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({ mode: 'single', singleMode: 'score_attack', playerCount: 3 });
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

  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ playCount: 0, maxScore: 0, totalRadar: {} });
  const [hallOfFame, setHallOfFame] = useState([]);
  const [rankings, setRankings] = useState({});
  const [learned, setLearned] = useState({ topics: [], answers: [], pool: [] });
  const [topicsList, setTopicsList] = useState([...FALLBACK_TOPICS]);
  const usedCardsRef = useRef(new Set([...FALLBACK_ANSWERS]));
  const activeCardsRef = useRef(new Set());

  const [activeModal, setActiveModal] = useState(null);
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
          playOscillatorSound(ctx, type, volume);
      }
  };

  const normalizeCardText = (card) => (typeof card === 'string' ? card.trim().replace(/\s+/g, ' ') : '');
  const getUniqueCards = (cards, usedSet) => {
    const unique = [];
    const local = new Set();
    for (const card of cards || []) {
      const normalized = normalizeCardText(card);
      if (!normalized || usedSet.has(normalized) || local.has(normalized)) continue;
      local.add(normalized);
      unique.push(normalized);
    }
    return unique;
  };
  const registerActiveCards = (cards) => {
    cards.forEach(card => activeCardsRef.current.add(card));
  };
  const syncActiveCards = (hands, deck) => {
    const next = new Set();
    hands.flat().forEach(card => next.add(card));
    deck.forEach(card => next.add(card));
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
  const isTopicClear = (topic) => {
    if (!topic) return false;
    // 穴埋め記号が含まれていたらNG
    if (topic.includes('{placeholder}')) return false;
    return true;
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

  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveVolume = (v) => { setVolume(v); localStorage.setItem('aiOgiriVolume', v); };
  const saveTimeLimit = (t) => { setTimeLimit(t); localStorage.setItem('aiOgiriTimeLimit', t); };

  const updateUserStats = (score, radar) => {
      setUserStats(prev => {
          const newCount = (prev.playCount || 0) + 1;
          const newMax = Math.max(prev.maxScore || 0, score);
          const prevRadar = prev.totalRadar || prev.averageRadar || { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 };
          const r = radar || { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 };
          const newRadar = {
              surprise: (prevRadar.surprise || 0) + (r.surprise || 0),
              context: (prevRadar.context || 0) + (r.context || 0),
              punchline: (prevRadar.punchline || 0) + (r.punchline || 0),
              humor: (prevRadar.humor || 0) + (r.humor || 0),
              intelligence: (prevRadar.intelligence || 0) + (r.intelligence || 0),
          };
          const newData = { playCount: newCount, maxScore: newMax, totalRadar: newRadar };
          localStorage.setItem('aiOgiriUserStats', JSON.stringify(newData));
          return newData;
      });
  };

  const saveGeneratedCards = async (newCards) => {
    if (!newCards || newCards.length === 0) return;
    const updatedPool = [...(learned.cardPool || []), ...newCards].slice(-100); 
    const uniquePool = Array.from(new Set(updatedPool));
    const newLocalData = { ...learned, cardPool: uniquePool };
    setLearned(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    if (currentUser && db) { const ref = getDocRef('shared_db', 'learned_data'); if (ref) try { await updateDoc(ref, { cardPool: arrayUnion(...newCards) }); } catch (e) {} }
  };
  const saveToHallOfFame = async (entry) => {
    const newLocalHall = [entry, ...hallOfFame];
    setHallOfFame(newLocalHall);
    localStorage.setItem('aiOgiriHallOfFame', JSON.stringify(newLocalHall));
    if (currentUser && db) { const ref = getDocRef('shared_db', 'hall_of_fame'); if (ref) await updateDoc(ref, { entries: arrayUnion(entry) }).catch(()=>{}); }
  };
  const saveLearnedTopic = async (newTopic) => {
    // 穴埋め形式は保存しない
    if (newTopic.includes('{placeholder}')) return;
    
    const newLocalData = { ...learned, topics: [...learned.topics, newTopic] };
    setLearned(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    if (currentUser && db) { const ref = getDocRef('shared_db', 'learned_data'); if (ref) await updateDoc(ref, { topics: arrayUnion(newTopic) }).catch(()=>{}); }
  };
  const saveLearnedAnswer = async (newAnswer) => {
    const newLocalData = { ...learned, goodAnswers: [...learned.goodAnswers, newAnswer] };
    setLearned(newLocalData);
    localStorage.setItem('aiOgiriLearnedData', JSON.stringify(newLocalData));
    if (currentUser && db) { const ref = getDocRef('shared_db', 'learned_data'); if (ref) await updateDoc(ref, { goodAnswers: arrayUnion(newAnswer) }).catch(()=>{}); }
  };
  const saveAiCommentFeedback = async (comment, isGood) => {
    if (!comment) return;
    const feedbackEntry = { comment, isGood, date: new Date().toISOString() };
    const localFeedback = JSON.parse(localStorage.getItem('aiOgiriAiFeedback') || '[]');
    const nextFeedback = [feedbackEntry, ...localFeedback].slice(0, 50);
    localStorage.setItem('aiOgiriAiFeedback', JSON.stringify(nextFeedback));
    if (currentUser && db) {
      const ref = getDocRef('shared_db', 'learned_data');
      if (ref) await updateDoc(ref, { aiCommentFeedback: arrayUnion(feedbackEntry) }).catch(()=>{});
    }
  };
  const resetLearnedData = () => {
    if (window.confirm("この端末に保存されたAIの学習データをリセットしますか？")) {
      const emptyData = { topics: [], answers: [], pool: [] };
      setLearned(emptyData);
      localStorage.removeItem('aiOgiriLearnedData');
      setTopicsList([...FALLBACK_TOPICS]);
      playSound('timeup');
      alert("リセットしました。");
    }
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
  
  // 修正：平均値を算出する関数
  const getFinalGameRadar = () => {
      if (gameRadars.length === 0) return { surprise: 3, context: 3, punchline: 3, humor: 3, intelligence: 3 };
      const sum = gameRadars.reduce((acc, curr) => ({
          surprise: acc.surprise + (curr.surprise || 0),
          context: acc.context + (curr.context || 0),
          punchline: acc.punchline + (curr.punchline || 0),
          humor: acc.humor + (curr.humor || 0),
          intelligence: acc.intelligence + (curr.intelligence || 0),
       }), { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 });
      
      const count = gameRadars.length;
      return {
          surprise: sum.surprise / count,
          context: sum.context / count,
          punchline: sum.punchline / count,
          humor: sum.humor / count,
          intelligence: sum.intelligence / count,
      };
  };

  // --- Effects ---
  useEffect(() => {
    const localRankings = localStorage.getItem('aiOgiriRankings'); if (localRankings) setRankings(JSON.parse(localRankings));
    const localLearned = localStorage.getItem('aiOgiriLearnedData'); 
    if (localLearned) { 
        const parsed = JSON.parse(localLearned); 
        const cleanTopics = (parsed.topics || []).filter(t => !t.includes('{placeholder}'));
        const cleanPool = (parsed.cardPool || []).filter(c => typeof c === 'string' && c.length < 20); 
        setLearned({...parsed, topics: cleanTopics, cardPool: cleanPool}); 
        if (cleanTopics.length > 0) setTopicsList(prev => [...prev, ...cleanTopics]);
        if (cleanPool.length > 0) {
            cleanPool.forEach(c => usedCardsRef.current.add(c));
        }
    }
    const savedName = localStorage.getItem('aiOgiriUserName'); if (savedName) setUserName(savedName);
    const localHall = localStorage.getItem('aiOgiriHallOfFame'); if (localHall) setHallOfFame(JSON.parse(localHall));
    
    const savedStats = localStorage.getItem('aiOgiriUserStats');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      if (!parsed.totalRadar && parsed.averageRadar && parsed.playCount) {
        parsed.totalRadar = {
          surprise: (parsed.averageRadar.surprise || 0) * parsed.playCount,
          context: (parsed.averageRadar.context || 0) * parsed.playCount,
          punchline: (parsed.averageRadar.punchline || 0) * parsed.playCount,
          humor: (parsed.averageRadar.humor || 0) * parsed.playCount,
          intelligence: (parsed.averageRadar.intelligence || 0) * parsed.playCount,
        };
      }
      if (parsed.totalRadar || parsed.averageRadar) setUserStats(parsed);
    }
    const savedVolume = localStorage.getItem('aiOgiriVolume'); if (savedVolume) setVolume(parseFloat(savedVolume));
    const savedTime = localStorage.getItem('aiOgiriTimeLimit'); if (savedTime) setTimeLimit(parseInt(savedTime));
    if (auth) { signInAnonymously(auth).catch(()=>{}); onAuthStateChanged(auth, u => setCurrentUser(u)); }
  }, []);

  useEffect(() => {
    if (!currentUser || !db) return;
    const learnedDocRef = getDocRef('shared_db', 'learned_data');
    if (learnedDocRef) onSnapshot(learnedDocRef, (docSnap) => { if (docSnap.exists()) { const data = docSnap.data(); setLearned(prev => ({ ...prev, topics: data.topics || [], goodAnswers: data.goodAnswers || [], cardPool: data.cardPool || [] })); if (data.topics) setTopicsList(prev => Array.from(new Set([...FALLBACK_TOPICS, ...data.topics]))); } else { setDoc(learnedDocRef, { topics: [], goodAnswers: [], cardPool: [] }).catch(() => {}); } });
    const hallDocRef = getDocRef('shared_db', 'hall_of_fame');
    if (hallDocRef) onSnapshot(hallDocRef, (docSnap) => { if (docSnap.exists()) { const data = docSnap.data(); if (data.entries) setHallOfFame(prev => { const merged = [...data.entries, ...prev]; const unique = Array.from(new Set(merged.map(JSON.stringify))).map(JSON.parse); return unique.sort((a, b) => b.score - a.score); }); } else { setDoc(hallDocRef, { entries: [] }).catch(() => {}); } });
    const rankingDocRef = getDocRef('shared_db', 'rankings');
    if (rankingDocRef) onSnapshot(rankingDocRef, (docSnap) => { if (docSnap.exists()) setRankings(docSnap.data()); });
  }, [currentUser]);

  useEffect(() => {
      let t;
      if (isTimerRunning && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000);
      else if (isTimerRunning && timeLeft === 0) { setIsTimerRunning(false); handleTimeUp(); }
      return () => clearInterval(t);
  }, [isTimerRunning, timeLeft]);

  useEffect(() => {
      let t;
      if (appMode === 'game' && gameConfig.singleMode === 'time_attack' && startTime && !finishTime) {
          t = setInterval(() => setDisplayTime(formatTime(Date.now() - startTime)), 100);
      }
      return () => clearInterval(t);
  }, [appMode, startTime, finishTime]);

  useEffect(() => {
      if (!isAiActive || appMode !== 'game') return;
      if (cardDeck.length >= HAND_SIZE * 2) return;
      const now = Date.now();
      if (now - lastCardFetchRef.current < 5000) return;
      lastCardFetchRef.current = now;
      fetchAiCards(HAND_SIZE).then(addCardsToDeck);
  }, [appMode, cardDeck.length, isAiActive]);

  const callGemini = async (prompt) => {
      // タイムアウト設定付きのFetch
      if (!isAiActive) return null;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      try {
          const res = await fetch('/api/gemini', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ prompt }),
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error();
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const json = text.match(/\{[\s\S]*\}/);
          return json ? JSON.parse(json[0]) : JSON.parse(text);
      } catch (e) { 
          clearTimeout(timeoutId);
          console.log("API Error or Timeout:", e);
          return null; 
      }
  };
  const checkContentSafety = async (text) => { if (!isAiActive) return false; try { const res = await callGemini(`あなたはモデレーターです。"${text}"が不適切ならtrueを {"isInappropriate": boolean} で返して`); return res?.isInappropriate || false; } catch (e) { return false; } };
  const fetchAiTopic = async () => {
    // 穴埋めではない参考トピックのみを使用
    const cleanRef = learned.topics.filter(t => !t.includes('{placeholder}')).slice(0, 5);
    const ref = shuffleArray(cleanRef).join("\n");
    return (await callGemini(`大喜利のお題を1つ作成。
    条件:
    1. 「〜とは？」「〜は？」などの問いかけ形式。
    2. 回答者が一言(名詞)でボケられるような内容。
    3. 穴埋め形式（_____や{placeholder}）は絶対禁止。
    出力: {"topic": "..."}
    参考(これらのような形式で):
    ${ref}`))?.topic || null;
  };
  const fetchAiCards = async (count = 10, usedSet = usedCardsRef.current) => {
    const prompt = `
    大喜利の回答カード（単語・短いフレーズ）を${count}個作成。
    条件:
    1. 世の中に実在する言葉、名詞、慣用句を選ぶこと。
    2. 架空の長すぎる造語（例：〇〇の〇〇な〇〇）は禁止。
    3. シンプルだが、お題と組み合わせると面白くなる言葉。
    4. ジャンルはバラバラに（食べ物、人物、場所、道具、抽象概念など）。
    出力: {"answers": ["...", ...]}`;
    const res = await callGemini(prompt);
    const uniqueAnswers = getUniqueCards(res?.answers, usedSet);
    if (uniqueAnswers.length > 0) saveGeneratedCards(uniqueAnswers);
    return uniqueAnswers;
  };
  const fetchAiJudgment = async (topic, answer, isManual) => {
    const radarDesc = "radarは5項目(surprise:意外性, context:文脈, punchline:瞬発力, humor:毒気, intelligence:知性)を0-5で厳正に評価（3が標準）";
    const p = isManual
      ? `あなたはプロのお笑い審査員です。以下のお題と回答に対し、厳正な審査を行ってください。
お題: ${topic}
回答: ${answer}

重要ルール:
1. 回答が成立していない場合は低い点数をつけて構いませんが、エラーメッセージではなくツッコミを入れてください。
2. 採点は甘くせず、面白さをシビアに評価してください（基準は5段階評価の3）。
3. ツッコミは15文字程度の短い一言で。
4. ${radarDesc}

出力JSON形式: {"score":0, "comment":"...", "isInappropriate": false, "radar":{"surprise":3,"context":3,"punchline":3,"humor":3,"intelligence":3}}`
      : `お題:${topic} 回答:${answer} 1.不適切チェック不要 2.${radarDesc} 3.採点 レーダーチャートの合計(0-25)に基づいて算出されるため、各項目を0-5で厳正に評価。 4.鋭いツッコミ、または気の利いた一言(10〜20文字程度) 出力:{"score":0,"comment":"...","isInappropriate":false,"radar":{"surprise":3,"context":3,"punchline":3,"humor":3,"intelligence":3}}`;
    return await callGemini(p);
  };

  const collectCards = async (count) => {
    const collected = [];
    let remaining = count;
    const usedSet = activeCardsRef.current;

    // AIから補充
    if (isAiActive && remaining > 0) {
      const aiCards = await fetchAiCards(Math.max(remaining, HAND_SIZE), usedSet);
      if (aiCards.length > 0) {
        registerActiveCards(aiCards);
        collected.push(...aiCards);
        remaining -= aiCards.length;
      }
    }
    // プールから補充
    if (remaining > 0 && learned.cardPool?.length > 0) {
      const poolCards = getUniqueCards(learned.cardPool, usedSet).slice(0, remaining);
      if (poolCards.length > 0) {
        registerActiveCards(poolCards);
        collected.push(...poolCards);
        remaining -= poolCards.length;
      }
    }
    // フォールバックから補充
    if (remaining > 0) {
      const fallbackCards = getUniqueCards(FALLBACK_ANSWERS, usedSet).slice(0, remaining);
      if (fallbackCards.length > 0) {
        registerActiveCards(fallbackCards);
        collected.push(...fallbackCards);
      }
    }
    // 最終手段（既出リセット）
    if (remaining > 0) {
      const resetCards = getUniqueCards(FALLBACK_ANSWERS, new Set());
      collected.push(...resetCards.slice(0, remaining));
    }

    return collected;
  };

  const refillHand = async (hand, deck, desiredSize = HAND_SIZE) => {
    let nextHand = [...hand];
    let nextDeck = [...deck];
    
    while (nextHand.length < desiredSize) {
      if (nextDeck.length === 0) {
        // 山札が尽きたら補充
        const refill = await collectCards(Math.max(desiredSize - nextHand.length, 5));
        if (refill.length === 0) break; 
        nextDeck = [...nextDeck, ...refill];
      }
      
      const drawCard = nextDeck.shift();
      if (!drawCard) break;
      
      // 手札に重複がなければ追加
      if (!nextHand.includes(drawCard)) {
          nextHand.push(drawCard);
      }
    }
    return { hand: nextHand, deck: nextDeck };
  };

  // --- Game Control ---
  const initGame = async () => {
      playSound('decision'); setAppMode('game'); setGamePhase('drawing'); setCurrentRound(1); setAnswerCount(0); setIsSurvivalGameOver(false); setStartTime(null); setFinishTime(null);
      setGameRadars([]); 
      if (gameConfig.singleMode === 'time_attack') setStartTime(Date.now());
      
      activeCardsRef.current = new Set();
      // 初期デッキ作成（重複なし・十分な量）
      const targetDeckSize = Math.max(INITIAL_DECK_SIZE, HAND_SIZE * (gameConfig.mode === 'single' ? 2 : gameConfig.playerCount + 1) * 3);
      const collected = await collectCards(targetDeckSize);
      const initialDeck = shuffleArray(collected);
      
      setCardDeck(initialDeck);

      // デッキからカードを引く関数
      const draw = (d, n) => {
           const h = []; 
           const rest = [...d];
           for(let i=0; i<n; i++) {
              if (rest.length === 0) break;
               h.push(rest.shift());
           }
           return { h, rest };
      };

      // プレイヤーに配布
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
      setTimeout(() => startRound(gameConfig.mode === 'single' ? 0 : 0), 500);
  };

  const startRound = (turn) => {
      setSubmissions([]); setSelectedSubmission(null); setAiComment(''); setManualTopicInput(''); setManualAnswerInput('');
      setTopicFeedback(null); setAiFeedback(null); setHasTopicRerolled(false); setHasHandRerolled(false); setTopicCreateRerollCount(0);
      setIsAdvancingRound(false);
      setTurnPlayerIndex(turn); 
      
      if (gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle') {
          generateTopic(true);
      } else {
          setGamePhase('master_topic');
      }
  };

  const generateTopic = async (auto = false) => {
      if (isGeneratingTopic) return;
      setIsGeneratingTopic(true);
      
      let t = "";
      try {
          const res = await callGemini(`大喜利のお題を1つ作成。条件:問いかけ形式（「〜とは？」「〜は？」）。回答は名詞一言。プレースホルダーは禁止。JSON出力{"topic":"..."}`);
          t = res?.topic || FALLBACK_TOPICS[Math.floor(Math.random()*FALLBACK_TOPICS.length)];
          
          // 万が一 {placeholder} が入っていたら除去
          if (t.includes('{placeholder}')) {
              t = t.replace(/{placeholder}|「{placeholder}」/g, "？？？");
          }
      } catch (e) {
          t = FALLBACK_TOPICS[Math.floor(Math.random()*FALLBACK_TOPICS.length)];
      }

      if (auto) {
          setCurrentTopic(t); setGamePhase('answer_input'); setTimeLeft(timeLimit); 
          if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
      } else {
          setManualTopicInput(t);
      }
      setIsGeneratingTopic(false);
  };

  const confirmTopic = () => {
      playSound('decision');
      const t = manualTopicInput;
      setCurrentTopic(t);
      if (gameConfig.mode === 'single') {
          setGamePhase('answer_input'); setTimeLeft(timeLimit); 
          if(gameConfig.singleMode!=='freestyle') setIsTimerRunning(true);
      } else {
          setGamePhase('turn_change'); setTurnPlayerIndex((masterIndex + 1) % players.length);
      }
  };

  const handleTimeUp = () => {
      playSound('timeup');
      const card = singlePlayerHand[0] || "時間切れ";
      submitAnswer(card);
  };

  const submitAnswer = async (text, isManual = false) => {
      playSound('decision'); setIsTimerRunning(false); setIsJudging(true);
      setSingleSelectedCard(text);
      setGamePhase('judging');
      
      // 手札の消費と補充 (シングルプレイかつカード選択時のみ)
      if (!isManual && gameConfig.mode === 'single') {
          // 使ったカードを手札から消す
          const currentHand = singlePlayerHand.filter(c => c !== text);
          
          let nextDeck = [...cardDeck];
          
          // 山札が足りなければ補充（非同期）
          if (nextDeck.length < 5) {
             collectCards(10).then(newCards => {
                 setCardDeck(prev => [...prev, ...newCards]);
             });
          }

          // 山札から1枚引く
          if (nextDeck.length > 0) {
              const drawCard = nextDeck.shift();
              currentHand.push(drawCard);
          } else {
               const fallback = shuffleArray(FALLBACK_ANSWERS)[0];
               currentHand.push(fallback);
          }

          setSinglePlayerHand(currentHand);
          setCardDeck(nextDeck);
          syncCardsWrapper([currentHand], nextDeck);
      }

      if (gameConfig.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);

      let score = 50, comment = "...", radar = null;
      
      try {
        if (isAiActive) {
            const res = await fetchAiJudgment(currentTopic, text, isManual);
            if (res) {
                // レーダーチャートの合計値からスコアを算出（各5点満点×5項目＝25点満点 → ×4で100点満点）
                const totalRadarScore = 
                    (res.radar.surprise || 0) + 
                    (res.radar.context || 0) + 
                    (res.radar.punchline || 0) + 
                    (res.radar.humor || 0) + 
                    (res.radar.intelligence || 0);
                score = totalRadarScore * 4;
                comment = res.comment; 
                radar = res.radar; 
            }
            else throw new Error("AI response null");
        } else { throw new Error("AI inactive"); }
      } catch(e) {
          // Fallback logic
          score = Math.floor(Math.random() * 40) + 40;
          comment = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
      }
      
      setAiComment(formatAiComment(comment));
      
      if (radar) {
          updateUserStats(score, radar);
          setGameRadars(prev => [...prev, radar]);
      }

      if (score >= HALL_OF_FAME_THRESHOLD) {
          const entry = { topic: currentTopic, answer: text, score, comment, player: userName, date: new Date().toLocaleDateString() };
          saveToHallOfFame(entry);
      }
      
      let isGameOver = false;
      if (gameConfig.singleMode === 'survival' && score < SURVIVAL_PASS_SCORE) {
          setIsSurvivalGameOver(true);
          isGameOver = true;
      }
      if (gameConfig.singleMode === 'time_attack') {
           if (players[0].score + score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now());
      }
      
      setPlayers(prev => {
          const newPlayers = [...prev];
          const pIndex = prev.findIndex(p => p.id === (gameConfig.mode==='single' ? 0 : turnPlayerIndex));
          if (pIndex >= 0) newPlayers[pIndex].score += score;
          return newPlayers;
      });
      
      setResult({ answer: text, score, comment, radar });
      setSelectedSubmission({ answerText: text, score, radar });
      
      setIsJudging(false); playSound('result'); setGamePhase('result');
  };

  const nextGameRound = () => {
      playSound('tap');
      if (isAdvancingRound) return;
      setIsAdvancingRound(true);
      
      // 即座に準備中へ
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

  const rerollHand = async () => {
      playSound('card'); 
      if(hasHandRerolled) return; 
      
      setIsTimerRunning(false);
      const needed = HAND_SIZE; let newDeck = [...cardDeck];
      if (newDeck.length < needed) {
          const refill = await collectCards(needed - newDeck.length);
          newDeck = [...newDeck, ...refill];
      }
      const newHand = []; for(let i=0; i<needed; i++) newHand.push(newDeck.shift());
      setSinglePlayerHand(newHand); setCardDeck(newDeck); setHasHandRerolled(true);
      const { hand: filledHand, deck: filledDeck } = await refillHand(newHand, newDeck, HAND_SIZE);
      setSinglePlayerHand(filledHand); setCardDeck(filledDeck); setHasHandRerolled(true);
      syncCardsWrapper([filledHand], filledDeck);
      if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
      if (isAiActive) fetchAiCards(5).then(addCardsToDeck);
  };
  
  const handleMultiSubmit = (text) => {
      setSubmissions(prev => [...prev, { playerId: players[turnPlayerIndex].id, answerText: text }]);
      setPlayers(prev => prev.map(p => p.id === players[turnPlayerIndex].id ? { ...p, hand: p.hand.filter(c => c !== text) } : p));
      setManualAnswerInput('');
      const nextTurn = (turnPlayerIndex + 1) % players.length;
      if (nextTurn === masterIndex) { 
          let dummy = cardDeck[0] || "ダミー";
          setSubmissions(prev => shuffleArray([...prev, { playerId: 'dummy', answerText: dummy, isDummy: true }]));
          setGamePhase('judging');
      } else {
          setTurnPlayerIndex(nextTurn); setGamePhase('turn_change');
      }
  };
  
  const handleJudge = (sub) => {
      playSound('decision'); setSelectedSubmission(sub);
      setPlayers(prev => prev.map(p => {
          if (sub.isDummy && p.id === players[masterIndex].id) return { ...p, score: p.score - 1 };
          if (!sub.isDummy && p.id === sub.playerId) return { ...p, score: p.score + 1 };
          return p;
      }));
      playSound('result'); setGamePhase('result');
  };

  const handleTopicReroll = async () => {
    playSound('tap');
    if (hasTopicRerolled || isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    let topic = "";
    try {
        const res = await fetchAiTopic();
        topic = res || FALLBACK_TOPICS[0];
    } catch(e) {
        topic = FALLBACK_TOPICS[0];
    }
    setCurrentTopic(topic);
    setHasTopicRerolled(true);
    setIsGeneratingTopic(false);
  };

  const handleHandReroll = async () => {
    playSound('card');
    if (hasHandRerolled || isRerollingHand) return;
    setIsRerollingHand(true);
    setIsTimerRunning(false);

    const currentHandSize = singlePlayerHand.length;
    let currentDeck = [...cardDeck];
    
    if (currentDeck.length < currentHandSize) {
        currentDeck = [...currentDeck, ...shuffleArray(FALLBACK_ANSWERS)];
    }
    const draw = (d, n) => {
          const h = []; const rest = [...d];
          for(let i=0; i<n; i++) {
              if (rest.length===0) break;
              h.push(rest.shift());
          }
          return { h, rest };
    };
    const { h: newHand, rest: remainingDeck } = draw(currentDeck, currentHandSize);
    setSinglePlayerHand(newHand);
    setCardDeck(remainingDeck);
    
    setHasHandRerolled(true);
    setIsRerollingHand(false);
    
    if (gameConfig.singleMode !== 'freestyle') setIsTimerRunning(true);
    if (isAiActive) fetchAiCards(10).then(addCardsToDeck);
  };

  const confirmTopicAI = async () => {
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
    let topic = manualTopicInput;
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

  const handleSingleSubmitManual = async (text) => {
    // 自由回答用だが、submitAnswerに統合するためラッパーとして機能
    submitAnswer(text, true);
  };

  const handleTopicFeedback = (isGood) => {
    playSound('tap');
    setTopicFeedback(isGood ? 'good' : 'bad');
    if (isGood && currentTopic) saveLearnedTopic(currentTopic);
  };
  const handleAiFeedback = (isGood) => {
    playSound('tap');
    setAiFeedback(isGood ? 'good' : 'bad');
    if (isGood && selectedSubmission?.answerText) saveLearnedAnswer(selectedSubmission.answerText);
    saveAiCommentFeedback(aiComment, isGood);
  };
  const handleShare = () => {
    const text = `【AI大喜利】\nお題：${currentTopic}\n回答：${selectedSubmission?.answerText}\n#AI大喜利`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
  };

  const prepareNextSubmitter = (current, master, currentPlayers) => {
    const next = (current + 1) % currentPlayers.length;
    if (next === master) { setGamePhase('turn_change'); setTurnPlayerIndex(master); }
    else { setTurnPlayerIndex(next); setGamePhase('turn_change'); }
  };

  // --- Render (View) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
       <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-30">
          <h1 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="text-indigo-600"/> AI大喜利</h1>
          <div className="flex gap-2">
              <button onClick={() => setActiveModal('settings')} className="p-2 bg-slate-100 rounded-full"><Settings className="w-5 h-5"/></button>
              {appMode !== 'title' && <button onClick={handleBackToTitle} className="p-2 bg-slate-100 rounded-full"><Home className="w-5 h-5"/></button>}
          </div>
       </header>

       <main className="max-w-2xl mx-auto p-4">
          {appMode === 'title' && (
              <div className="text-center py-10 animate-in fade-in">
                  <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6"><Sparkles className="w-12 h-12 text-indigo-600"/></div>
                  <h1 className="text-4xl font-black mb-2">AI大喜利</h1>
                  <p className="text-slate-500 mb-8">{APP_VERSION}<br/><span className="text-xs text-indigo-500">Powered by Gemini</span></p>
                  
                  <div className="space-y-4 mb-8">
                      <button onClick={() => { playSound('decision'); setGameConfig({...gameConfig, mode: 'single'}); setAppMode('setup'); }} className="w-full p-4 bg-white border-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:border-indigo-500 transition-all"><User/> 一人で遊ぶ</button>
                      <button onClick={() => { playSound('decision'); setGameConfig({...gameConfig, mode: 'multi'}); setAppMode('setup'); }} className="w-full p-4 bg-white border-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:border-amber-500 transition-all"><Users/> みんなで遊ぶ</button>
                  </div>

                  <div className="flex justify-center gap-4">
                      <button onClick={() => setActiveModal('data')} className="text-xs flex flex-col items-center gap-1 text-slate-500"><Activity/>マイデータ</button>
                      <button onClick={() => setActiveModal('rule')} className="text-xs flex flex-col items-center gap-1 text-slate-500"><BookOpen/>ルール</button>
                      <button onClick={() => setActiveModal('hall')} className="text-xs flex flex-col items-center gap-1 text-yellow-600"><Crown/>殿堂入り</button>
                      <button onClick={() => setActiveModal('update')} className="text-xs flex flex-col items-center gap-1 text-slate-500"><History/>更新情報</button>
                  </div>
              </div>
          )}

          {appMode === 'setup' && (
              <div className="py-6 animate-in slide-in-from-right">
                  <h2 className="text-2xl font-bold mb-6 text-center">設定</h2>
                  <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
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
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-500">
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm animate-in fade-in">
                        <h2 className="text-xl font-bold mb-4 text-center">お題を決めてください</h2>
                        <textarea value={manualTopicInput} onChange={(e) => setManualTopicInput(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl mb-4 border" placeholder="例：冷蔵庫を開けたら..." />
                        <div className="flex gap-2">
                            <button onClick={() => generateAiTopic()} disabled={isGeneratingTopic} className="flex-1 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl flex justify-center items-center gap-2"><Wand2 className="w-4 h-4"/> AI作成</button>
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
                                <Card key={i} text={t} disabled={isJudging} onClick={() => {
                                    if(gameConfig.mode==='single') submitAnswer(t);
                                    else if(window.confirm('このカードで回答しますか？')) handleMultiSubmit(t);
                                }} />
                            ))}
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <p className="font-bold text-xs text-slate-400 mb-2">自由に回答</p>
                            <div className="flex gap-2">
                                <input value={manualAnswerInput} onChange={(e) => setManualAnswerInput(e.target.value)} className="flex-1 p-2 bg-slate-50 rounded border" placeholder="回答を入力..." />
                                <button onClick={() => {
                                    if(gameConfig.mode==='single') handleSingleSubmitManual(manualAnswerInput);
                                    else handleMultiSubmit(manualAnswerInput);
                                }} disabled={!manualAnswerInput.trim() || isJudging} className="px-4 bg-slate-800 text-white rounded font-bold">送信</button>
                            </div>
                        </div>
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
                        <div className="bg-white p-6 rounded-3xl shadow-xl mb-6">
                            <p className="text-sm text-slate-400 font-bold mb-2">お題</p>
                            {/* お題表示をシンプルに */}
                            <p className="text-lg font-bold mb-6">{currentTopic}</p>
                            <div className="border-t border-slate-100 my-4"></div>
                            <p className="text-sm text-slate-400 font-bold mb-2">回答</p>
                            <p className="text-3xl font-black text-indigo-600 mb-4">{result?.answer}</p>
                            
                            {gameConfig.mode === 'single' ? (
                                <>
                                <div className="text-6xl font-black text-yellow-500 mb-4">{result?.score}点</div>
                                <div className="bg-slate-100 p-4 rounded-xl text-left inline-block">
                                  <p className="font-bold text-xs text-slate-500 mb-1">AIコメント</p>
                                  <p className="text-sm text-slate-800">{aiComment}</p>
                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
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
                            {/* 次へボタンの表示制御（勝利判定など） */}
                            {(gameConfig.mode === 'single' && gameConfig.singleMode === 'score_attack' && currentRound >= TOTAL_ROUNDS) ? '結果発表へ' :
                             (gameConfig.mode === 'single' && gameConfig.singleMode === 'survival' && isSurvivalGameOver) ? '結果発表へ' :
                             (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) ? '結果発表へ' :
                             (gameConfig.mode === 'multi' && players.some(p => p.score >= WIN_SCORE_MULTI)) ? '結果発表へ' : '次のラウンドへ'}
                        </button>
                    </div>
                )}

                {gamePhase === 'final_result' && (
                    <div className="text-center py-10 animate-in zoom-in">
                        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-slate-800 mb-2">終了！</h2>
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
          {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} userName={userName} setUserName={saveUserName} timeLimit={timeLimit} setTimeLimit={saveTimeLimit} volume={volume} setVolume={saveVolume} playSound={playSound} resetLearnedData={resetLearnedData} />}
          {activeModal === 'rule' && <InfoModal onClose={() => setActiveModal(null)} type="rule" />}
          {activeModal === 'update' && <InfoModal onClose={() => setActiveModal(null)} type="update" />}
          {activeModal === 'hall' && <HallOfFameModal onClose={() => setActiveModal(null)} data={hallOfFame} />}
          {activeModal === 'data' && <MyDataModal stats={userStats} onClose={() => setActiveModal(null)} userName={userName} />}

       </main>
    </div>
  );
}