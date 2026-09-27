import './style.css';
import { api, type Me, type LeaderboardEntry } from './api';
import { BikeEngine } from './game/engine';

const GAME_TITLE = '我的 Token, danced by bike:';

// ============================== DOM ==============================
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<nav class="fixed top-0 inset-x-0 z-40 backdrop-blur bg-abyss/70 border-b border-white/5">
  <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
    <img src="/assets/logo.jpg" alt="logo" class="w-8 h-8 rounded-full ring-1 ring-volt/40" />
    <span class="font-bold tracking-wide text-sm sm:text-base">我的 Token, <span class="text-volt text-glow">danced by bike:</span></span>
    <div class="flex-1"></div>
    <div id="balance-chip" class="hidden sm:flex items-center gap-1.5 text-ember text-sm stat-num">
      ⚡ <span id="nav-balance">--</span> 词元
    </div>
    <div id="auth-slot"></div>
  </div>
</nav>

<!-- 英雄区 -->
<header class="relative pt-14 min-h-[92vh] flex items-center overflow-hidden">
  <img src="/assets/bg-city.jpg" alt="" class="absolute inset-0 w-full h-full object-cover opacity-40" />
  <div class="absolute inset-0 bg-gradient-to-b from-abyss/40 via-abyss/70 to-abyss"></div>
  <div class="relative max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-10 items-center">
    <div>
      <p class="text-juice text-glow font-mono text-sm mb-3">// 观猹 FDE 共学营 · 无厘头大作业</p>
      <h1 class="text-4xl sm:text-6xl font-black leading-tight">
        我的 <span class="text-ember text-glow">Token</span>,<br/>
        <span class="text-volt text-glow">danced by bike:</span>
      </h1>
      <p class="mt-6 text-gray-300 leading-relaxed">
        K3 太贵了?别抱怨,上车。<br/>
        狂踩这台赛博二轮,把腿力炼成<span class="text-ember">虚拟词元</span>,
        喂给右侧那颗饥渴的 <span class="text-juice">K3 核心</span> —— 维持它闷闷儿烧。
      </p>
      <div class="mt-8 flex flex-wrap gap-4">
        <a href="#ride" class="px-7 py-3 rounded-full bg-volt text-abyss font-bold hover:scale-105 transition shadow-[0_0_30px_rgba(34,211,238,.5)]">
          🚴 开始踩车发电
        </a>
        <a href="/api/auth/login" id="hero-login" class="px-7 py-3 rounded-full border border-juice/60 text-juice hover:bg-juice/10 transition">
          观猹登录 · 保存词元
        </a>
      </div>
      <p class="mt-4 text-xs text-gray-500">* 词元是虚拟的,快乐是真实的。本游戏不构成任何蹬车投资建议。</p>
    </div>
    <div class="hidden md:block animate-floaty">
      <img src="/assets/hero-pedal.jpg" alt="踩车发电" class="rounded-2xl ring-1 ring-volt/30 shadow-[0_0_60px_rgba(232,121,249,.25)]" />
    </div>
  </div>
</header>

<!-- 跑马灯 -->
<div class="border-y border-white/5 bg-panel/60 overflow-hidden py-2">
  <div class="animate-marquee whitespace-nowrap text-sm text-gray-400" id="marquee"></div>
</div>

<!-- 游戏区 -->
<section id="ride" class="max-w-6xl mx-auto px-4 py-14">
  <h2 class="text-2xl font-bold mb-1">⚡ 词元发电站</h2>
  <p class="text-sm text-gray-400 mb-4">键盘 <kbd class="px-1.5 py-0.5 bg-white/10 rounded">←</kbd> <kbd class="px-1.5 py-0.5 bg-white/10 rounded">→</kbd> 交替狂敲 = 踩踏(手机用下方两个大按钮)。踩得越快,K3 吃得越香。</p>

  <div class="relative rounded-2xl overflow-hidden ring-1 ring-white/10 bg-panel">
    <div id="canvas-wrap" class="w-full aspect-[16/9]"></div>

    <!-- HUD -->
    <div class="absolute top-3 left-3 flex gap-3 text-xs sm:text-sm">
      <div class="bg-abyss/70 backdrop-blur rounded-lg px-3 py-2 ring-1 ring-white/10">
        <div class="text-gray-400">车速</div>
        <div class="stat-num text-volt text-lg font-bold"><span id="hud-speed">0</span> <span class="text-xs">km/h</span></div>
      </div>
      <div class="bg-abyss/70 backdrop-blur rounded-lg px-3 py-2 ring-1 ring-white/10">
        <div class="text-gray-400">功率</div>
        <div class="stat-num text-juice text-lg font-bold"><span id="hud-watts">0</span> <span class="text-xs">W</span></div>
      </div>
      <div class="bg-abyss/70 backdrop-blur rounded-lg px-3 py-2 ring-1 ring-white/10">
        <div class="text-gray-400">产率</div>
        <div class="stat-num text-ember text-lg font-bold"><span id="hud-rate">0.0</span> <span class="text-xs">词元/s</span></div>
      </div>
      <div class="bg-abyss/70 backdrop-blur rounded-lg px-3 py-2 ring-1 ring-white/10">
        <div class="text-gray-400">本局已发</div>
        <div class="stat-num text-emerald-300 text-lg font-bold"><span id="hud-session">0</span></div>
      </div>
    </div>

    <!-- 体力条 -->
    <div class="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-72 bg-abyss/70 backdrop-blur rounded-lg px-3 py-2 ring-1 ring-white/10">
      <div class="flex justify-between text-xs text-gray-400 mb-1"><span>🦵 腿力</span><span id="hud-stamina-num" class="stat-num">100%</span></div>
      <div class="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div id="hud-stamina" class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-volt transition-all duration-200" style="width:100%"></div>
      </div>
      <div id="hud-hint" class="text-xs text-ember mt-1.5 hidden">腿软了!歇口气,功率打骨折……</div>
    </div>

    <div id="sync-status" class="absolute top-3 right-3 text-xs text-gray-500 bg-abyss/60 rounded px-2 py-1"></div>
  </div>

  <!-- 手机踏板 -->
  <div class="sm:hidden grid grid-cols-2 gap-4 mt-4">
    <button id="pedal-l" class="py-6 rounded-2xl bg-volt/15 border border-volt/50 text-volt text-xl font-black active:scale-95 transition select-none">🦵 左蹬</button>
    <button id="pedal-r" class="py-6 rounded-2xl bg-juice/15 border border-juice/50 text-juice text-xl font-black active:scale-95 transition select-none">右蹬 🦵</button>
  </div>

  <div id="guest-banner" class="hidden mt-4 rounded-xl border border-ember/40 bg-ember/10 text-ember text-sm px-4 py-3">
    你正在以游客身份裸踩,词元不会入账。<a href="/api/auth/login" class="underline font-bold">用观猹登录</a>,把汗水存进银行。
  </div>
</section>

<!-- 数据区 -->
<section class="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-5 gap-6">
  <div class="md:col-span-2 rounded-2xl bg-panel ring-1 ring-white/10 p-5">
    <h3 class="font-bold mb-1">🔥 K3 闷烧观测台</h3>
    <p class="text-xs text-gray-500 mb-4">全站骑士喂给 K3 的虚拟词元总量</p>
    <div class="stat-num text-4xl font-black text-juice text-glow" id="global-total">--</div>
    <div class="mt-4 text-sm text-gray-400" id="my-stats"></div>
    <img src="/assets/meme-slap.jpg" alt="被马路扇了一巴掌" class="mt-5 rounded-xl w-40 opacity-80 rotate-[-3deg] ring-1 ring-white/10" />
    <p class="text-xs text-gray-600 mt-2">图:踩车途中被马路扇了一巴掌(真实事件改编)</p>
  </div>
  <div class="md:col-span-3 rounded-2xl bg-panel ring-1 ring-white/10 p-5">
    <h3 class="font-bold mb-4">🏆 腿王排行榜</h3>
    <div id="leaderboard" class="space-y-2 text-sm max-h-96 overflow-y-auto pr-1">
      <p class="text-gray-500">加载中……</p>
    </div>
  </div>
</section>

<footer class="border-t border-white/5 py-8 text-center text-xs text-gray-600">
  <p>《${GAME_TITLE}》 · 观猹 FDE 共学营无厘头作业 · Powered by TokenDance 词元</p>
  <p class="mt-1">词元为虚拟道具,与真实账户额度无关 · 膝盖受损概不负责</p>
</footer>

<div id="toast-box" class="fixed top-16 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4"></div>
`;

// ============================== 状态 ==============================
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
let me: Me | null = null;

function toast(html: string, kind: 'info' | 'good' | 'bad' = 'info') {
  const box = $('#toast-box');
  const el = document.createElement('div');
  const color = kind === 'good' ? 'border-emerald-400/50 text-emerald-300' : kind === 'bad' ? 'border-rose-400/50 text-rose-300' : 'border-volt/50 text-volt';
  el.className = `toast pointer-events-auto bg-abyss/90 backdrop-blur border ${color} rounded-xl px-4 py-2.5 text-sm shadow-lg max-w-md text-center`;
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ============================== 认证 UI ==============================
async function refreshAuth() {
  try {
    const { user } = await api.me();
    me = user;
  } catch {
    me = null;
  }
  const slot = $('#auth-slot');
  if (me) {
    slot.innerHTML = `
      <div class="flex items-center gap-2">
        ${me.avatar_url ? `<img src="${me.avatar_url}" class="w-8 h-8 rounded-full ring-1 ring-white/20" alt=""/>` : ''}
        <span class="text-sm hidden sm:inline">${escapeHtml(me.nickname || '猹友')}</span>
        <button id="logout-btn" class="text-xs text-gray-500 hover:text-gray-300 underline">退出</button>
      </div>`;
    $('#logout-btn').onclick = async () => {
      await api.logout();
      location.reload();
    };
    $('#nav-balance').textContent = fmt(me.balance);
    $('#balance-chip').classList.remove('hidden');
    $('#hero-login').classList.add('hidden');
    $('#guest-banner').classList.add('hidden');
    $('#my-stats').innerHTML = `我的词元:<b class="text-ember stat-num">${fmt(me.balance)}</b>(今日 +<span class="stat-num">${fmt(me.today)}</span>)`;
  } else {
    slot.innerHTML = `<a href="/api/auth/login" class="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full bg-juice/15 border border-juice/50 text-juice hover:bg-juice/25 transition">
      <img src="/assets/watcha-icon.png" class="w-4 h-4 rounded-full" onerror="this.remove()"/>观猹登录</a>`;
    $('#guest-banner').classList.remove('hidden');
  }
}

// ============================== 游戏 ==============================
const engine = new BikeEngine();
let pendJoules = 0;
let syncWindowStart = performance.now();

async function boot() {
  await engine.init($('#canvas-wrap'));
  engine.onStats = (s) => {
    $('#hud-speed').textContent = s.speedKmh.toFixed(0);
    $('#hud-watts').textContent = s.watts.toFixed(0);
    $('#hud-rate').textContent = s.tokensPerSec.toFixed(1);
    $('#hud-session').textContent = s.sessionTokens.toFixed(1);
    $('#hud-stamina').style.width = `${s.stamina}%`;
    $('#hud-stamina-num').textContent = `${s.stamina.toFixed(0)}%`;
    $('#hud-hint').classList.toggle('hidden', s.stamina > 15);
  };
  engine.onFirstPedal = () => {
    toast('开踩!K3 闻到了词元的香味 😋', 'good');
  };
}

// 键盘踩踏
let lastKey = '';
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const map: Record<string, 'left' | 'right'> = {
    ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', A: 'left', D: 'right',
  };
  const side = map[e.key];
  if (!side) return;
  e.preventDefault();
  if (!engine.pedal(side)) {
    if (lastKey !== 'x') flashAlternateHint();
  }
  lastKey = e.key;
});

let hintLock = false;
function flashAlternateHint() {
  if (hintLock) return;
  hintLock = true;
  toast('要<b>左右交替</b>踩!同一只脚连踩会原地劈叉 🥴', 'bad');
  setTimeout(() => (hintLock = false), 1500);
}

// 手机踏板
for (const [id, side] of [['#pedal-l', 'left'], ['#pedal-r', 'right']] as const) {
  const btn = $(id);
  const h = (e: Event) => {
    e.preventDefault();
    engine.pedal(side);
  };
  btn.addEventListener('pointerdown', h);
}

// 结算循环:每 5s 把能量兑换成词元
setInterval(async () => {
  const joules = engine.drainJoules();
  if (joules <= 0.5) return;
  if (!me) {
    pendJoules += joules; // 游客:挂在账上,登录后也不补(狠心)
    $('#sync-status').textContent = '游客模式 · 词元蒸发中';
    return;
  }
  const windowSec = (performance.now() - syncWindowStart) / 1000;
  syncWindowStart = performance.now();
  try {
    const r = await api.sync(joules, windowSec);
    me.balance = r.balance;
    me.today = r.today;
    $('#nav-balance').textContent = fmt(r.balance);
    $('#my-stats').innerHTML = `我的词元:<b class="text-ember stat-num">${fmt(r.balance)}</b>(今日 +<span class="stat-num">${fmt(r.today)}</span>)`;
    $('#sync-status').textContent = `已入账 +${r.earned} 词元 ✓`;
    if (r.capped) toast('功率太离谱,电表掐表了(物理 anti-cheat)🤏', 'bad');
  } catch {
    engine.returnJoules(joules); // 失败回滚
    $('#sync-status').textContent = '同步失败,下轮重试…';
  }
}, 5000);

// ============================== 无厘头随机事件 ==============================
interface MemeEvent {
  text: string;
  apply: () => void;
}
const memeEvents: MemeEvent[] = [
  { text: '🖐️ 马路突然扇了你一巴掌!你怒了,功率 ×1.6(10s)', apply: () => engine.setBoost(1.6, 10) },
  { text: '🐱 一只猹窜上后座帮你踩,功率 ×1.4(12s)', apply: () => engine.setBoost(1.4, 12) },
  { text: '⛓️ 链条掉了!3 秒纯滑行,功率归零', apply: () => engine.stall(3) },
  { text: '🍜 你想起 K3 的价格,悲从中来,功率 ×2(6s)', apply: () => engine.setBoost(2, 6) },
  { text: '💨 一阵妖风从背后推你,功率 ×1.3(15s)', apply: () => engine.setBoost(1.3, 15) },
  { text: '🪫 发电机闹情绪,功率 ×0.5(8s)', apply: () => engine.setBoost(0.5, 8) },
];
function scheduleMeme() {
  const delay = 22000 + Math.random() * 30000;
  setTimeout(() => {
    const ev = memeEvents[Math.floor(Math.random() * memeEvents.length)];
    toast(ev.text);
    ev.apply();
    scheduleMeme();
  }, delay);
}

// 跑马灯
const marqueeLines = [
  'TokenDance 好啊,TokenDance 我们喜欢你 😭',
  '踩一公里,K3 多活一秒',
  '本游戏由两条腿和一台发电机驱动',
  '警告:词元不能兑换成鸡腿',
  '观猹 FDE 共学营荣誉出品',
  'AGI BAR 同款白嫖精神',
  '前一百名骑士将获得虚无缥缈的荣誉感',
];
$('#marquee').innerHTML = [...marqueeLines, ...marqueeLines].map((t) => `<span class="mx-8">${t}</span>`).join('');

// ============================== 排行榜 ==============================
async function refreshLeaderboard() {
  try {
    const { top, global_total } = await api.leaderboard();
    $('#global-total').textContent = fmt(global_total);
    if (!top.length) {
      $('#leaderboard').innerHTML = '<p class="text-gray-500">虚位以待,第一腿王就是你。</p>';
      return;
    }
    $('#leaderboard').innerHTML = top
      .slice(0, 20)
      .map(
        (e: LeaderboardEntry) => `
      <div class="flex items-center gap-3 px-3 py-2 rounded-lg ${e.rank <= 3 ? 'bg-white/5 ring-1 ring-ember/20' : ''}">
        <span class="stat-num w-6 text-center ${e.rank === 1 ? 'text-ember' : e.rank === 2 ? 'text-gray-300' : e.rank === 3 ? 'text-amber-600' : 'text-gray-600'}">${e.rank}</span>
        ${e.avatar_url ? `<img src="${e.avatar_url}" class="w-7 h-7 rounded-full" alt=""/>` : '<span class="w-7 h-7 rounded-full bg-white/10 inline-block"></span>'}
        <span class="flex-1 truncate">${escapeHtml(e.nickname || '无名猹')}</span>
        <span class="text-xs text-gray-500 stat-num">今日 ${fmt(e.today)}</span>
        <span class="stat-num text-ember font-bold">${fmt(e.total)}</span>
      </div>`,
      )
      .join('');
  } catch {
    /* 静默 */
  }
}

// ============================== 工具 ==============================
function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(n >= 100 ? 0 : 1);
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// oauth 错误提示
const oauthErr = new URLSearchParams(location.search).get('oauth_error');
if (oauthErr) {
  toast(`观猹登录失败:${escapeHtml(oauthErr)}`, 'bad');
  history.replaceState(null, '', '/');
}

// ============================== 启动 ==============================
document.title = `《${GAME_TITLE}》 · 踩二轮喂 K3`;
await refreshAuth();
await boot();
refreshLeaderboard();
setInterval(refreshLeaderboard, 30000);
scheduleMeme();
