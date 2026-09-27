import './style.css';
import gsap from 'gsap';
import { api, type Me, type LeaderboardEntry } from './api';
import { BikeEngine, type Snapshot } from './game/engine';

const app = document.querySelector<HTMLDivElement>('#app')!;

const MEME_EVENTS = [
  '你在马路上被空气打了一巴掌！',
  '一只猹路过，往你的车筐里丢了 1 个词元。',
  'K3 核心发出了一声闷闷儿的咕噜。',
  '你的左脚和右脚吵了一架，最后和好了。',
  'TokenDance 结算员骑着二八大杠超过了你。',
  '路边大爷喊：小伙子蹬快点，K3 要烧了！',
  '你的自行车链条发出了哲学家的叹息。',
  '一阵妖风吹过，你觉得头发又少了两根。',
  'K3 说：这电，烧得我身上暖洋洋的。',
  '你踩得太狠，踏板提出了劳动仲裁。',
];

const esc = (value: string) => value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function renderLeaderboard(rows: LeaderboardEntry[]): string {
  if (!rows.length) return '<p class="text-sm text-slate-400">还没有骑手，K3 正在挨饿。</p>';
  return `<ol class="space-y-2">${rows.map((row, index) => `
    <li class="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
      <span class="w-6 text-center font-bold ${index < 3 ? 'text-amber-300' : 'text-slate-500'}">${index + 1}</span>
      ${row.avatar_url ? `<img src="${esc(row.avatar_url)}" alt="" class="h-7 w-7 rounded-full object-cover" />` : '<span class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs">猹</span>'}
      <span class="flex-1 truncate text-sm">${esc(row.nickname)}</span>
      <span class="font-mono text-sm text-cyan-300">${row.total.toLocaleString()} 词元</span>
    </li>`).join('')}</ol>`;
}

function landing() {
  app.innerHTML = `
    <div class="scanlines mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <header class="space-y-3">
        <p class="text-xs tracking-[0.5em] text-fuchsia-300/80">TOKEN · DANCED · BY · BIKE</p>
        <h1 class="neon-text text-4xl font-black leading-tight sm:text-6xl">我的 Token,<br/>danced by bike:</h1>
        <p class="mx-auto max-w-xl text-sm text-slate-300 sm:text-base">
          踩自行车发电，给 TokenDance 充虚拟词元，维持 Kimi K3「闷闷儿烧」。
          操作很简单：像在马路上被人打了一巴掌一样，疯狂踩踏。
        </p>
      </header>
      <button id="login" class="glass group relative rounded-2xl px-8 py-4 text-lg font-bold text-cyan-200 transition hover:scale-105 hover:text-white">
        使用观猹账号登录
        <span class="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-cyan-500/30 to-fuchsia-500/30 blur-md transition group-hover:blur-lg"></span>
      </button>
      <section class="glass w-full max-w-md rounded-2xl p-5 text-left">
        <h2 class="mb-3 text-sm font-bold tracking-widest text-amber-300">🔥 K3 饲料排行榜</h2>
        <div id="board"><p class="text-sm text-slate-500">加载中……</p></div>
      </section>
      <footer class="text-xs text-slate-600">观猹 FDE 共学营 · 本游戏不产生任何真实电力，只产生快乐</footer>
    </div>`;
  document.querySelector('#login')!.addEventListener('click', api.login);
  api.leaderboard().then((rows) => {
    const board = document.querySelector('#board');
    if (board) board.innerHTML = renderLeaderboard(rows);
  }).catch(() => {
    const board = document.querySelector('#board');
    if (board) board.innerHTML = '<p class="text-sm text-red-400">排行榜加载失败，K3 表示理解。</p>';
  });
}

function memeToast() {
  const text = MEME_EVENTS[Math.floor(Math.random() * MEME_EVENTS.length)]!;
  const toast = document.createElement('div');
  toast.className = 'glass pointer-events-none fixed left-1/2 top-16 z-50 rounded-xl px-5 py-3 text-sm text-amber-200';
  toast.textContent = text;
  document.body.appendChild(toast);
  gsap.fromTo(toast, { y: -30, opacity: 0, rotate: -4 }, { y: 0, opacity: 1, rotate: 0, duration: .4, ease: 'back.out(2)' });
  gsap.to(toast, { opacity: 0, y: -20, delay: 2.2, duration: .4, onComplete: () => toast.remove() });
}

function game(me: Me) {
  app.innerHTML = `
    <div class="scanlines flex min-h-screen flex-col">
      <header class="glass sticky top-0 z-40 flex items-center justify-between gap-3 border-x-0 border-t-0 px-4 py-3">
        <h1 class="neon-text truncate text-lg font-black sm:text-xl">我的 Token, danced by bike:</h1>
        <div class="flex items-center gap-3">
          <span class="tokenpill token-pill font-mono text-xs text-cyan-200">⚡ 余额 <b id="balance">${me.balance.toLocaleString()}</b></span>
          <span class="hidden text-sm text-slate-300 sm:inline">${esc(me.nickname)}</span>
          <button id="logout" class="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:text-white">退出</button>
        </div>
      </header>
      <main class="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
        <section class="glass relative flex-1 overflow-hidden rounded-2xl">
          <div id="stage" class="absolute inset-0"></div>
          <div class="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap justify-center gap-2 p-3 sm:justify-between">
            <span class="token-pill text-xs">🚴 时速 <b id="speed" class="font-mono text-cyan-300">0.0</b> km/h</span>
            <span class="token-pill text-xs">⚡ 功率 <b id="watts" class="font-mono text-fuchsia-300">0</b> W</span>
            <span class="token-pill text-xs">🪙 产出 <b id="tps" class="font-mono text-amber-300">0.00</b> 词元/秒</span>
            <span class="token-pill text-xs">🔥 K3 烧度 <b id="core" class="font-mono text-red-300">0</b>%</span>
          </div>
          <div class="absolute inset-x-0 bottom-0 space-y-2 p-3">
            <div class="h-2 overflow-hidden rounded-full bg-white/10">
              <div id="stamina" class="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-[width] duration-150" style="width:100%"></div>
            </div>
            <p class="text-center text-xs text-slate-400">狂点屏幕 / 狂敲空格、←、→ 踩踏 · 攒够 <b>5 词元</b>自动结算 · 今日 <b id="today">${me.today}</b>/3600</p>
          </div>
        </section>
        <aside class="flex w-full flex-col gap-4 lg:w-80">
          <section class="glass rounded-2xl p-4 text-center">
            <p class="text-xs tracking-widest text-slate-400">本次行程发电</p>
            <p id="session" class="neon-text my-1 font-mono text-4xl font-black text-amber-300">0.0</p>
            <p class="text-xs text-slate-500">词元 · 总计 <b id="total">${me.total.toLocaleString()}</b></p>
            <button id="sync" class="mt-3 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white transition hover:opacity-85 active:scale-95">手动结算到 TokenDance</button>
          </section>
          <section class="glass flex-1 rounded-2xl p-4">
            <h2 class="mb-3 text-sm font-bold tracking-widest text-amber-300">🔥 K3 饲料排行榜</h2>
            <div id="board"></div>
          </section>
        </aside>
      </main>
    </div>`;

  const el = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!;
  let pending = 0;
  let syncing = false;

  const sync = async (tokens: number) => {
    if (tokens <= 0 || syncing) return;
    syncing = true;
    try {
      const result = await api.sync(tokens);
      pending -= tokens;
      el('balance').textContent = result.balance.toLocaleString();
      el('total').textContent = result.total.toLocaleString();
      el('today').textContent = String(Number(el('today').textContent) + result.earned);
      if (result.capped) memeToast();
    } catch { /* tokens stay in the pending bucket for the next attempt */ }
    syncing = false;
  };

  const engine = new BikeEngine({
    onEarn: (whole) => {
      pending += whole;
      if (pending >= 5) void sync(pending);
    },
    onSnapshot: (s: Snapshot) => {
      el('speed').textContent = s.speedKmh.toFixed(1);
      el('watts').textContent = String(s.watts);
      el('tps').textContent = s.tokensPerSec.toFixed(2);
      el('core').textContent = String(Math.round(s.coreCharge));
      el('stamina').style.width = `${s.stamina}%`;
      el('session').textContent = s.sessionTokens.toFixed(1);
    },
  });
  void engine.mount(el('stage'));

  const refreshBoard = () => api.leaderboard().then((rows) => { el('board').innerHTML = renderLeaderboard(rows); }).catch(() => {});
  void refreshBoard();
  const boardTimer = setInterval(refreshBoard, 15_000);
  const memeTimer = setInterval(() => { if (Math.random() < .5) memeToast(); }, 12_000);

  el('sync').addEventListener('click', () => { memeToast(); void sync(Math.floor(pending)); });
  el('logout').addEventListener('click', async () => {
    await sync(Math.floor(pending));
    await api.logout().catch(() => {});
    cleanup();
    landing();
  });

  const cleanup = () => {
    clearInterval(boardTimer);
    clearInterval(memeTimer);
    engine.destroy();
  };
}

api.me().then(game).catch(landing);
