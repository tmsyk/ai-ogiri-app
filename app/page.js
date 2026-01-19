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
const APP_VERSION = "Ver 0.10";
const UPDATE_LOGS = [
  { version: "Ver 0.10", date: "2026/01/21", content: ["システム全体のリファクタリング", "変数名の不整合バグを修正", "ゲーム開始処理の改善"] },
  { version: "Ver 0.09", date: "2026/01/20", content: ["UI反応速度の向上", "効果音処理の最適化"] },
];

const TOTAL_ROUNDS = 5;
const SURVIVAL_PASS_SCORE = 60;
const TIME_ATTACK_GOAL_SCORE = 500;
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
  const points = keys.map((key, i) => getPoint(data[key] || 0, i, 5));
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(" ");
  const bgLevels = [5, 4, 3, 2, 1];
  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {bgLevels.map(level => { const bgPoints = keys.map((_, i) => getPoint(level, i, 5)).map(p => `${p.x},${p.y}`).join(" "); return <polygon key={level} points={bgPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" />; })}
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

const MyDataModal = ({ stats, onClose, userName }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="text-center mb-6"><h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2"><Activity className="w-8 h-8" /> マイデータ</h3><p className="text-sm text-slate-500 font-bold mt-1">{userName} さんの戦績</p></div>
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">通算回答数</p><p className="text-2xl font-black text-slate-700">{stats.playCount || 0}回</p></div><div className="bg-slate-50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 font-bold mb-1">最高スコア</p><p className="text-2xl font-black text-yellow-500">{stats.maxScore || 0}点</p></div></div>
            <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col items-center"><p className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> あなたの芸風分析</p>{stats.playCount > 0 ? ( <RadarChart data={stats.averageRadar || { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 }} size={200} /> ) : ( <p className="text-xs text-slate-400 py-8">まだデータがありません</p> )}</div>
        </div>
        <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
      </div>
    </div>
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

const InfoModal = ({ onClose, type }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
    <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
      {type === 'rule' && (
        <div className="space-y-6 text-slate-700">
          <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2 mb-4"><BookOpen className="w-6 h-6" /> 遊び方</h3>
          <div className="space-y-8">
            <section>
                <h4 className="font-bold text-lg mb-3 flex items-center gap-2 border-b pb-1 text-slate-800"><User className="w-5 h-5 text-indigo-500" /> 一人で遊ぶ</h4>
                <div className="space-y-3">
                    <div className="bg-indigo-50 p-3 rounded-xl"><p className="font-bold text-indigo-700 mb-1">👑 スコアアタック</p><p className="text-sm text-slate-600">全5回戦の合計得点を競います。</p></div>
                    <div className="bg-red-50 p-3 rounded-xl"><p className="font-bold text-red-700 mb-1">💀 サバイバル</p><p className="text-sm text-slate-600">60点未満で即終了。連勝記録を目指します。</p></div>
                    <div className="bg-blue-50 p-3 rounded-xl"><p className="font-bold text-blue-700 mb-1">⏱️ タイムアタック</p><p className="text-sm text-slate-600">500点到達までの「回答回数」を競います。</p></div>
                    <div className="bg-green-50 p-3 rounded-xl"><p className="font-bold text-green-700 mb-1">♾️ フリースタイル</p><p className="text-sm text-slate-600">制限なしの練習モード。</p></div>
                </div>
            </section>
            <section>
                <h4 className="font-bold text-lg mb-3 flex items-center gap-2 border-b pb-1 text-slate-800"><Users className="w-5 h-5 text-amber-500" /> みんなで遊ぶ</h4>
                <div className="bg-amber-50 p-4 rounded-xl">
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-2">
                        <li>1人が親、他が子になりスマホを回して回答。</li>
                        <li>親が一番面白い回答を選びます。</li>
                        <li><span className="font-bold text-red-500">AIのダミー回答</span>が1つ混ざります。</li>
                        <li>親がダミーを選ぶと<span className="font-bold">親が-1点</span>！</li>
                        <li>10点先取で優勝！</li>
                    </ul>
                </div>
            </section>
          </div>
        </div>
      )}
      {type === 'update' && (
        <div className="space-y-6 text-slate-700">
          <h3 className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-2 mb-4"><History className="w-6 h-6" /> 更新履歴</h3>
          <div className="space-y-4">
            {UPDATE_LOGS.map((log, i) => (
              <div key={i} className="border-l-4 border-indigo-200 pl-4 py-1">
                <div className="flex items-baseline gap-2 mb-1"><span className="font-bold text-lg text-slate-800">{log.version}</span><span className="text-xs text-slate-400">{log.date}</span></div>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">{log.content.map((item, j) => <li key={j}>{item}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 text-center"><button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-700">閉じる</button></div>
    </div>
  </div>
);

// --- メインアプリ ---
export default function AiOgiriApp() {
  const [appMode, setAppMode] = useState('title');
  const [gameConfig, setGameConfig] = useState({ mode: 'single', singleMode: 'score_attack', playerCount: 3 });
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
  const [isCheckingTopic, setIsCheckingTopic] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [hasTopicRerolled, setHasTopicRerolled] = useState(false);
  const [hasHandRerolled, setHasHandRerolled] = useState(false);
  const [isRerollingHand, setIsRerollingHand] = useState(false);
  const [topicCreateRerollCount, setTopicCreateRerollCount] = useState(0);
  const [topicFeedback, setTopicFeedback] = useState(null);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [survivalOver, setSurvivalOver] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finishTime, setFinishTime] = useState(null);
  const [displayTime, setDisplayTime] = useState("00:00");
  const [gameRadars, setGameRadars] = useState([]); 
  const [isCopied, setIsCopied] = useState(false);
  const [lastAiGeneratedTopic, setLastAiGeneratedTopic] = useState('');
  const [singlePlayerHand, setSinglePlayerHand] = useState([]);
  const [singleSelectedCard, setSingleSelectedCard] = useState(null);

  // Data
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ playCount: 0, maxScore: 0, averageRadar: {} });
  const [hallOfFame, setHallOfFame] = useState([]);
  const [rankings, setRankings] = useState({});
  const [learned, setLearned] = useState({ topics: [], answers: [], pool: [] });

  // Modals
  const [activeModal, setActiveModal] = useState(null);

  // Audio Context
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

  // --- Logic Helpers ---
  const saveUserName = (name) => { setUserName(name); localStorage.setItem('aiOgiriUserName', name); };
  const saveVolume = (v) => { setVolume(v); localStorage.setItem('aiOgiriVolume', v); };
  const saveTimeLimit = (t) => { setTimeLimit(t); localStorage.setItem('aiOgiriTimeLimit', t); };

  const handleBackToTitle = () => {
    if (window.confirm('タイトル画面に戻りますか？\n進行中のゲームデータは失われます。')) {
      playSound('tap'); setIsTimerActive(false); setAppMode('title');
    }
  };

  const updateUserStats = (score, radar) => {
      setUserStats(prev => {
          const newCount = (prev.playCount || 0) + 1; const newMax = Math.max(prev.maxScore || 0, score); const alpha = 0.1;
          const prevRadar = prev.averageRadar || { surprise: 3, context: 3, punchline: 3, humor: 3, intelligence: 3 };
          const r = radar || { surprise: 3, context: 3, punchline: 3, humor: 3, intelligence: 3 };
          const newRadar = {
              surprise: prevRadar.surprise * (1 - alpha) + r.surprise * alpha,
              context: prevRadar.context * (1 - alpha) + r.context * alpha,
              punchline: prevRadar.punchline * (1 - alpha) + r.punchline * alpha,
              humor: prevRadar.humor * (1 - alpha) + r.humor * alpha,
              intelligence: prevRadar.intelligence * (1 - alpha) + r.intelligence * alpha,
          };
          const newData = { playCount: newCount, maxScore: newMax, averageRadar: newRadar };
          localStorage.setItem('aiOgiriUserStats', JSON.stringify(newData)); return newData;
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
  const resetLearnedData = () => {
    if (window.confirm("この端末に保存されたAIの学習データをリセットしますか？")) {
      const emptyData = { topics: [], answers: [], pool: [] };
      setLearned(emptyData);
      localStorage.removeItem('aiOgiriLearnedData');
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

  const getAverageRadar = () => {
      if (gameRadars.length === 0) return { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 };
      const sum = gameRadars.reduce((acc, curr) => ({
          surprise: acc.surprise + (curr.surprise||0), context: acc.context + (curr.context||0), punchline: acc.punchline + (curr.punchline||0), humor: acc.humor + (curr.humor||0), intelligence: acc.intelligence + (curr.intelligence||0),
      }), { surprise: 0, context: 0, punchline: 0, humor: 0, intelligence: 0 });
      const count = gameRadars.length;
      return { surprise: sum.surprise/count, context: sum.context/count, punchline: sum.punchline/count, humor: sum.humor/count, intelligence: sum.intelligence/count };
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
              return unique.sort((a, b) => b.score - a.score); 
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
      if (appMode === 'game' && gameConfig.singleMode === 'time_attack' && startTime && !finishTime) {
          t = setInterval(() => setDisplayTime(formatTime(Date.now() - startTime)), 100);
      }
      return () => clearInterval(t);
  }, [appMode, startTime, finishTime]);

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
  const checkContentSafety = async (text) => { if (!isAiActive) return false; try { const res = await callGemini(`あなたはモデレーターです。"${text}"が不適切ならtrueを {"isInappropriate": boolean} で返して`); return res?.isInappropriate || false; } catch (e) { return false; } };
  const fetchAiTopic = async () => { const ref = shuffleArray(learned.topics).slice(0,3).join("\n"); return (await callGemini(`大喜利のお題を1つ作成。条件:問いは一つ。回答は「名詞」。{placeholder}を文末付近に。出力: {"topic": "..."} 参考:\n${ref}`))?.topic || null; };
  const fetchAiCards = async (count=10) => { const res = await callGemini(`大喜利の回答カード(名詞/短いフレーズ)を${count}個作成。条件:具体的,ジャンルバラバラ,既存回避。出力: {"answers": ["...", ...]}`); if(res?.answers) saveGeneratedCards(res.answers); return res?.answers || null; };
  const fetchAiJudgment = async (topic, answer, isManual) => { const p = isManual ? `お題:${topic} 回答:${answer} 1.不適切チェック(NGならtrue) 2.5項目(意外性,文脈,瞬発力,毒気,知性)1-5点 3.採点(0-100) 4.20文字ツッコミ 出力:{"score":0,"comment":"...","isInappropriate":bool,"radar":{...}}` : `お題:${topic} 回答:${answer} 1.不適切チェック不要 2.5項目評価 3.採点 4.ツッコミ 出力:{"score":0,"comment":"...","isInappropriate":false,"radar":{...}}`; return await callGemini(p); };

  // --- Game Control ---
  const initGame = async () => {
      playSound('decision'); setAppMode('game'); setPhase('drawing'); setRound(1); setAnswerCount(0); setIsSurvivalGameOver(false); setStartTime(null); setFinishTime(null);
      setGameRadars([]); // Reset radars
      if (gameConfig.singleMode === 'time_attack') setStartTime(Date.now());
      
      const fallback = FALLBACK_ANSWERS;
      let pool = [...fallback];
      if (learned.pool) pool = [...pool, ...learned.pool];
      const initialDeck = shuffleArray(pool).slice(0, 60);
      
      if (isAiActive) {
          fetchAiCards(10).then(res => {
              if (res) {
                  setDeck(prev => [...prev, ...res]);
                  // Pool saving logic is inside fetchAiCards -> saveGeneratedCards
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
      if (gameConfig.mode === 'single') {
          setPlayers([{ id: 0, name: userName, score: 0, hand: pHand }, { id: 'ai', name: 'AI審査員', score: 0, hand: [] }]);
          setMasterIndex(0);
      } else {
          let currentD = d1;
          const newPlayers = [];
          for(let i=0; i<gameConfig.playerCount; i++){
              const res = draw(currentD, 7);
              newPlayers.push({ id: i, name: multiNames[i] || `P${i+1}`, score: 0, hand: res.h });
              currentD = res.rest;
          }
          setPlayers(newPlayers);
          setDeck(currentD);
          setMasterIndex(Math.floor(Math.random() * gameConfig.playerCount));
      }
      
      setTimeout(() => startRound(gameConfig.mode === 'single' ? 0 : 0), 500);
  };

  const startRound = (turn) => {
      setSubmissions([]); setSelectedSubmission(null); setAiComment(''); setManualTopicInput(''); setManualAnswerInput('');
      setTopicFeedback(null); setAiFeedback(null); setHasTopicRerolled(false); setHandRerolled(false); setRerollCount(0);
      setTurnIdx(turn); 
      
      if (gameConfig.mode === 'single' && gameConfig.singleMode !== 'freestyle') {
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
          if (gameConfig.singleMode !== 'freestyle') setIsTimerActive(true);
      } else {
          setManualTopicInput(t.replace('{placeholder}', '___'));
      }
      setIsGenerating(false);
  };

  const confirmTopic = () => {
      playSound('decision');
      const t = manualTopicInput.replace(/___+/g, '{placeholder}');
      setTopic(t.includes('{placeholder}') ? t : t + ' {placeholder}');
      if (gameConfig.mode === 'single') {
          setPhase('answer_input'); setTimeLeft(timeLimit); 
          if(gameConfig.singleMode!=='freestyle') setIsTimerActive(true);
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
      
      if (gameConfig.singleMode === 'time_attack') setAnswerCount(prev => prev + 1);

      let score = 50, comment = "...", radar = null;
      
      if (isAiActive) {
          const res = await fetchAiJudgment(topic, text, false);
          if (res) { score = res.score; comment = res.comment; radar = res.radar; }
      }
      
      setAiComment(comment);
      
      if (radar) setGameRadars(prev => [...prev, radar]);
      if (radar) updateUserStats(score, radar);

      const newPlayers = [...players];
      const pIndex = players.findIndex(p => p.id === (gameConfig.mode==='single' ? 0 : turnIdx));
      if (pIndex >= 0) newPlayers[pIndex].score += score;
      setPlayers(newPlayers);
      
      setResult({ answer: text, score, comment, radar });
      setSelectedSubmission({ answerText: text, score, radar });
      
      if (gameConfig.singleMode === 'survival' && score < SURVIVAL_PASS_SCORE) setSurvivalGameOver(true);
      if (gameConfig.singleMode === 'time_attack' && newPlayers[0].score >= TIME_ATTACK_GOAL_SCORE) setFinishTime(Date.now());
      
      if (score >= HALL_OF_FAME_THRESHOLD) {
          const entry = { topic, answer: text, score, comment, player: userName, date: new Date().toLocaleDateString() };
          saveToHallOfFame(entry);
      }

      setIsJudging(false); playSound('result'); setPhase('result');
  };

  const nextGameRound = () => {
      playSound('tap');
      if (gameConfig.mode === 'single') {
          if (gameConfig.singleMode === 'score_attack' && round >= TOTAL_ROUNDS) { updateRanking('score_attack', players[0].score); return setPhase('final_result'); }
          if (gameConfig.singleMode === 'survival' && isSurvivalGameOver) { updateRanking('survival', round - 1); return setPhase('final_result'); }
          if (gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) { updateRanking('time_attack', answerCount); return setPhase('final_result'); }
      } else {
          if (players.some(p => p.score >= WIN_SCORE_MULTI)) return setPhase('final_result');
      }
      
      setRound(r => r + 1);
      const nextMaster = gameConfig.mode === 'multi' ? (masterIndex + 1) % players.length : 0;
      setMasterIndex(nextMaster);
      startRound(gameConfig.mode === 'single' ? 0 : nextMaster);
  };

  const rerollHand = () => {
      playSound('card'); if(handRerolled) return; setIsTimerActive(false);
      const needed = 7; let newDeck = [...deck];
      if (newDeck.length < needed) newDeck = [...newDeck, ...shuffleArray(FALLBACK_ANSWERS)];
      const newHand = []; for(let i=0; i<needed; i++) newHand.push(newDeck.shift());
      setSinglePlayerHand(newHand); setDeck(newDeck); setHandRerolled(true);
      if (gameConfig.singleMode !== 'freestyle') setIsTimerActive(true);
      if (isAiActive) fetchAiCards(5).then(c => { if(c) setDeck(p => [...p, ...c]); });
  };
  
  const handleMultiSubmit = (text) => {
      setSubmissions(prev => [...prev, { playerId: players[turnIdx].id, answerText: text }]);
      setPlayers(prev => prev.map(p => p.id === players[turnIdx].id ? { ...p, hand: p.hand.filter(c => c !== text) } : p));
      setManualAnswerInput('');
      const nextTurn = (turnIdx + 1) % players.length;
      if (nextTurn === masterIndex) { 
          let dummy = deck[0] || "ダミー";
          setSubmissions(prev => shuffleArray([...prev, { playerId: 'dummy', answerText: dummy, isDummy: true }]));
          setPhase('judging');
      } else {
          setTurnIdx(nextTurn); setPhase('turn_change');
      }
  };
  
  const handleJudge = (sub) => {
      playSound('decision'); setSelectedSubmission(sub);
      setPlayers(prev => prev.map(p => {
          if (sub.isDummy && p.id === players[masterIndex].id) return { ...p, score: p.score - 1 };
          if (!sub.isDummy && p.id === sub.playerId) return { ...p, score: p.score + 1 };
          return p;
      }));
      playSound('result'); setPhase('result');
  };

  // --- Render ---
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
                    <span>Round {round}</span>
                    {gameConfig.singleMode === 'time_attack' && <span className="text-blue-600">{displayTime}</span>}
                </div>

                {phase === 'drawing' && <div className="text-center py-20"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-slate-300"/></div>}

                {phase === 'master_topic' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm animate-in fade-in">
                        <h2 className="text-xl font-bold mb-4 text-center">お題を決めてください</h2>
                        <textarea value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl mb-4 border" placeholder="例：冷蔵庫を開けたら..." />
                        <div className="flex gap-2">
                            <button onClick={() => generateTopic(false)} disabled={isGenerating} className="flex-1 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl flex justify-center items-center gap-2"><Wand2 className="w-4 h-4"/> AI作成</button>
                            <button onClick={confirmTopic} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">決定</button>
                        </div>
                    </div>
                )}
                
                {phase === 'turn_change' && (
                    <div className="text-center py-10 animate-in fade-in">
                        <h2 className="text-2xl font-bold mb-4">次は {players[turnIdx].name} さんの番です</h2>
                        <button onClick={() => setPhase('answer_input')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-full">回答する</button>
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
                            {gameConfig.mode === 'single' && <button onClick={rerollHand} disabled={handRerolled} className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"><RefreshCw className="w-3 h-3"/> 手札交換 {handRerolled ? '(済)' : ''}</button>}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {(gameConfig.mode === 'single' ? singlePlayerHand : players[turnIdx].hand).map((t, i) => (
                                <Card key={i} text={t} disabled={isJudging} onClick={() => {
                                    if(gameConfig.mode==='single') submitAnswer(t);
                                    else if(window.confirm('このカードで回答しますか？')) handleMultiSubmit(t);
                                }} />
                            ))}
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <p className="font-bold text-xs text-slate-400 mb-2">自由に回答</p>
                            <div className="flex gap-2">
                                <input value={manualAnswer} onChange={(e) => setManualAnswer(e.target.value)} className="flex-1 p-2 bg-slate-50 rounded border" placeholder="回答を入力..." />
                                <button onClick={() => {
                                    if(gameConfig.mode==='single') submitAnswer(manualAnswer, true);
                                    else handleMultiSubmit(manualAnswer);
                                }} disabled={!manualAnswer.trim() || isJudging} className="px-4 bg-slate-800 text-white rounded font-bold">送信</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {phase === 'judging' && (
                   gameConfig.mode === 'single' ? (
                       <div className="text-center py-20"><Sparkles className="w-16 h-16 text-amber-500 animate-pulse mx-auto mb-4"/><h3 className="text-2xl font-bold text-slate-800">審査中...</h3></div>
                   ) : (
                       <div className="animate-in fade-in">
                           <h2 className="text-center font-bold mb-4">{players[masterIdx].name}さんが選んでください</h2>
                           <TopicDisplay topic={topic} answer={null} />
                           <div className="space-y-2 mt-4">
                               {submissions.map((sub, i) => (
                                   <button key={i} onClick={() => handleJudge(sub)} className="w-full p-4 bg-white border-2 rounded-xl text-left font-bold">{sub.answerText}</button>
                               ))}
                           </div>
                       </div>
                   )
                )}

                {phase === 'result' && (
                    <div className="text-center animate-in zoom-in">
                        <div className="bg-white p-6 rounded-3xl shadow-xl mb-6">
                            <p className="text-sm text-slate-400 font-bold mb-2">お題</p>
                            <p className="text-lg font-bold mb-6">{topic.replace('{placeholder}', '___')}</p>
                            <div className="border-t border-slate-100 my-4"></div>
                            <p className="text-sm text-slate-400 font-bold mb-2">回答</p>
                            <p className="text-3xl font-black text-indigo-600 mb-4">{result?.answer}</p>
                            
                            {gameConfig.mode === 'single' ? (
                                <>
                                <div className="text-6xl font-black text-yellow-500 mb-4">{result?.score}点</div>
                                <div className="bg-slate-100 p-4 rounded-xl text-left inline-block"><p className="font-bold text-xs text-slate-500 mb-1">AIコメント</p><p className="text-sm text-slate-800">「{aiComment}」</p></div>
                                </>
                            ) : (
                                <div className="mt-4 p-4 bg-yellow-50 rounded-xl font-bold">
                                    {selectedSubmission.isDummy ? <span className="text-red-500">残念！それはAIのダミー回答でした！(-1点)</span> : <span className="text-indigo-600">ナイス回答！ (+1点)</span>}
                                </div>
                            )}
                        </div>
                        <button onClick={nextGameRound} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full shadow-xl">
                            {/* 次へボタンの表示制御 */}
                            {(gameConfig.mode === 'single' && gameConfig.singleMode === 'score_attack' && round >= TOTAL_ROUNDS) ? '結果発表へ' :
                             (gameConfig.mode === 'single' && gameConfig.singleMode === 'survival' && isSurvivalGameOver) ? '結果発表へ' :
                             (gameConfig.mode === 'single' && gameConfig.singleMode === 'time_attack' && players[0].score >= TIME_ATTACK_GOAL_SCORE) ? '結果発表へ' :
                             (gameConfig.mode === 'multi' && players.some(p => p.score >= WIN_SCORE_MULTI)) ? '結果発表へ' : '次のラウンドへ'}
                        </button>
                    </div>
                )}

                {phase === 'final_result' && (
                    <div className="text-center py-10 animate-in zoom-in">
                        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-slate-800 mb-2">終了！</h2>
                        <div className="text-6xl font-black text-indigo-600 mb-8">
                             {gameConfig.mode === 'multi' ? `優勝: ${players.sort((a,b)=>b.score-a.score)[0].name}` : `${players[0].score}点`}
                        </div>
                        {gameConfig.mode === 'single' && gameRadars.length > 0 && (
                            <div className="mb-6 flex justify-center flex-col items-center">
                                <p className="text-sm font-bold text-slate-500 mb-2">今回のゲーム評価</p>
                                <RadarChart data={getAverageRadar()} size={180} />
                            </div>
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