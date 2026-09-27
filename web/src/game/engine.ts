import { Application, Assets, Container, Graphics, TilingSprite } from 'pixi.js';

export interface Snapshot {
  speedKmh: number;
  watts: number;
  tokensPerSec: number;
  stamina: number; // 0-100
  sessionTokens: number;
  crankAngle: number;
}

const DESIGN_W = 1280;
const DESIGN_H = 720;
const GROUND_Y = 590;

// 几何(设计坐标系)
const REAR = { x: 470, y: 500 };
const FRONT = { x: 730, y: 500 };
const WHEEL_R = 78;
const BB = { x: 585, y: 512 };
const CRANK = 38;
const SEAT = { x: 555, y: 372 };
const HANDLE = { x: 745, y: 330 };
const SHOULDER = { x: 648, y: 302 };
const HEAD = { x: 672, y: 262 };
const REACTOR = { x: 1010, y: 420, r: 92 };
const GEN = { x: 640, y: 556 }; // 发电机(中轴下方)

interface Spark {
  g: Graphics;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  kind: 'spark' | 'token';
}

export class BikeEngine {
  private app = new Application();
  private world = new Container();
  private bike = new Graphics();
  private fx = new Graphics();
  private sparks: Spark[] = [];
  private sparkLayer = new Container();
  private bg: TilingSprite | null = null;

  // 踩踏状态
  private lastSide: 'left' | 'right' | null = null;
  private strokes: number[] = []; // 最近踩踏时间戳(ms)
  private crankAngle = 0;
  private crankVel = 0;
  private rpm = 0;
  private watts = 0;
  private joules = 0; // 未结算能量
  private sessionTokens = 0;
  private stamina = 100;
  private boostMult = 1;
  private boostUntil = 0;
  private stallUntil = 0;
  private bgScroll = 0;
  private time = 0;
  private destroyed = false;

  onStats: ((s: Snapshot) => void) | null = null;
  onFirstPedal: (() => void) | null = null;
  private firstPedalFired = false;

  async init(wrapper: HTMLElement) {
    await this.app.init({
      background: 0x070812,
      resizeTo: wrapper,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    wrapper.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);

    // 背景(视差滚动城市)
    try {
      const tex = await Assets.load('/assets/bg-city.jpg');
      this.bg = new TilingSprite({ texture: tex, width: DESIGN_W * 1.2, height: DESIGN_H });
      const s = Math.max(DESIGN_W / tex.width, (GROUND_Y + 60) / tex.height);
      this.bg.tileScale.set(s);
      this.bg.y = DESIGN_H - tex.height * s;
      this.bg.alpha = 0.85;
      this.world.addChild(this.bg);
    } catch {
      /* 背景缺失时用纯色兜底 */
    }

    // 地面
    const ground = new Graphics();
    ground.rect(0, GROUND_Y + WHEEL_R - 12, DESIGN_W, DESIGN_H).fill(0x05060d);
    ground.rect(0, GROUND_Y + WHEEL_R - 12, DESIGN_W, 2).fill({ color: 0x22d3ee, alpha: 0.5 });
    this.world.addChild(ground);

    this.world.addChild(this.bike);
    this.world.addChild(this.sparkLayer);
    this.world.addChild(this.fx);

    this.app.ticker.add((t) => this.update(t.deltaMS / 1000));
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = () => {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const s = Math.min(w / DESIGN_W, h / DESIGN_H);
    this.world.scale.set(s);
    this.world.position.set((w - DESIGN_W * s) / 2, (h - DESIGN_H * s) / 2);
  };

  /** 一脚踩踏。必须左右交替,否则无效(并返回 false)。 */
  pedal(side: 'left' | 'right'): boolean {
    if (side === this.lastSide) return false;
    this.lastSide = side;
    const now = performance.now();
    this.strokes.push(now);
    if (this.strokes.length > 24) this.strokes.shift();
    if (!this.firstPedalFired) {
      this.firstPedalFired = true;
      this.onFirstPedal?.();
    }
    return true;
  }

  setBoost(mult: number, sec: number) {
    this.boostMult = mult;
    this.boostUntil = performance.now() + sec * 1000;
  }

  stall(sec: number) {
    this.stallUntil = performance.now() + sec * 1000;
  }

  /** 取出本结算窗口累计的能量并清零。 */
  drainJoules(): number {
    const j = this.joules;
    this.joules = 0;
    return j;
  }

  /** 结算失败时把能量退回,下轮重试。 */
  returnJoules(j: number) {
    this.joules += j;
  }

  get tokensPerWattSecond() {
    return 0.08; // 与服务端 config 保持一致
  }

  private update(dt: number) {
    if (this.destroyed) return;
    this.time += dt;
    const now = performance.now();

    // —— 踏频估计:最近 1.6s 内的交替踩踏次数 ——
    while (this.strokes.length && now - this.strokes[0] > 1600) this.strokes.shift();
    const instRpm = (this.strokes.length / 1.6) * 30; // 两脚各踩一次=一圈
    this.rpm += (instRpm - this.rpm) * Math.min(1, dt * 6);

    // —— 功率模型 ——
    const stalled = now < this.stallUntil;
    if (now > this.boostUntil) this.boostMult = 1;
    const staminaFactor = this.stamina > 15 ? 1 : 0.35;
    let target = Math.min(1400, 3.2 * Math.pow(this.rpm, 1.45));
    target *= staminaFactor * this.boostMult;
    if (stalled) target = 0;
    this.watts += (target - this.watts) * Math.min(1, dt * 5);

    // —— 体力 ——
    const drain = (this.watts / 1200) * 16;
    const regen = this.watts < 60 ? 14 : 0;
    this.stamina = Math.max(0, Math.min(100, this.stamina + (regen - drain) * dt));

    // —— 能量与词元 ——
    const effJoules = this.watts * dt;
    this.joules += effJoules;
    this.sessionTokens += effJoules * this.tokensPerWattSecond;

    // —— 曲柄/车轮动画 ——
    const targetVel = (this.rpm / 60) * Math.PI * 2;
    this.crankVel += (targetVel - this.crankVel) * Math.min(1, dt * 8);
    this.crankAngle += this.crankVel * dt;
    const speedKmh = this.rpm * 0.32;
    this.bgScroll += speedKmh * dt * 6;
    if (this.bg) this.bg.tilePosition.x = -this.bgScroll;

    this.drawBike(stalled);
    this.drawReactor();
    this.updateSparks(dt);

    // 高功率时从发电机喷词元火花
    if (this.watts > 120 && Math.random() < dt * Math.min(30, this.watts / 40)) {
      this.spawnSpark('token');
    }
    if (this.watts > 500 && Math.random() < dt * 12) {
      this.spawnSpark('spark');
    }

    this.onStats?.({
      speedKmh,
      watts: this.watts,
      tokensPerSec: this.watts * this.tokensPerWattSecond,
      stamina: this.stamina,
      sessionTokens: this.sessionTokens,
      crankAngle: this.crankAngle,
    });
  }

  private spawnSpark(kind: 'spark' | 'token') {
    if (this.sparks.length > 140) return;
    const g = new Graphics();
    if (kind === 'token') {
      g.circle(0, 0, 5).fill(0xfbbf24);
      g.circle(0, 0, 2).fill(0xfff7d6);
    } else {
      g.circle(0, 0, 3).fill(0x22d3ee);
    }
    this.sparkLayer.addChild(g);
    this.sparks.push({
      g,
      x: GEN.x + (Math.random() - 0.5) * 20,
      y: GEN.y,
      vx: (Math.random() - 0.5) * 60,
      vy: -120 - Math.random() * 120,
      life: 0,
      maxLife: kind === 'token' ? 1.6 : 0.7,
      kind,
    });
  }

  private updateSparks(dt: number) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += dt;
      if (s.kind === 'token') {
        // 词元被 K3 核心吸过去
        const dx = REACTOR.x - s.x;
        const dy = REACTOR.y - s.y;
        s.vx += dx * dt * 3.2;
        s.vy += dy * dt * 3.2;
      } else {
        s.vy += 500 * dt;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.g.position.set(s.x, s.y);
      s.g.alpha = Math.max(0, 1 - s.life / s.maxLife);
      const done =
        s.life > s.maxLife ||
        (s.kind === 'token' && Math.hypot(REACTOR.x - s.x, REACTOR.y - s.y) < 40);
      if (done) {
        s.g.destroy();
        this.sparks.splice(i, 1);
      }
    }
  }

  private drawBike(stalled: boolean) {
    const g = this.bike;
    g.clear();
    const a = this.crankAngle;
    const wheelSpin = a * 2.2;
    const glow = Math.min(1, this.watts / 900);
    const volt = stalled ? 0x475569 : 0x22d3ee;
    const juice = stalled ? 0x475569 : 0xe879f9;

    // 支架(固定式发电台)
    g.poly([BB.x - 130, GROUND_Y + 62, BB.x + 150, GROUND_Y + 62, BB.x + 60, BB.y + 30, BB.x - 60, BB.y + 30])
      .fill({ color: 0x111631, alpha: 0.9 })
      .stroke({ color: 0x263055, width: 2 });

    for (const hub of [REAR, FRONT]) {
      // 车轮
      g.circle(hub.x, hub.y, WHEEL_R).stroke({ color: 0x1e2a52, width: 10 });
      g.circle(hub.x, hub.y, WHEEL_R).stroke({ color: volt, width: 3, alpha: 0.6 + glow * 0.4 });
      // 辐条
      for (let i = 0; i < 6; i++) {
        const ang = wheelSpin + (i * Math.PI) / 3;
        g.moveTo(hub.x, hub.y)
          .lineTo(hub.x + Math.cos(ang) * (WHEEL_R - 6), hub.y + Math.sin(ang) * (WHEEL_R - 6))
          .stroke({ color: 0x3b82f6, width: 2, alpha: 0.7 });
      }
      g.circle(hub.x, hub.y, 7).fill(0x0d1022).stroke({ color: volt, width: 2 });
    }

    // 车架
    const frame = { color: volt, width: 6 };
    g.moveTo(REAR.x, REAR.y).lineTo(BB.x, BB.y).stroke(frame);
    g.moveTo(BB.x, BB.y).lineTo(HANDLE.x - 18, HANDLE.y + 24).stroke(frame);
    g.moveTo(HANDLE.x - 18, HANDLE.y + 24).lineTo(FRONT.x, FRONT.y).stroke(frame);
    g.moveTo(REAR.x, REAR.y).lineTo(SEAT.x, SEAT.y).stroke(frame);
    g.moveTo(SEAT.x, SEAT.y).lineTo(HANDLE.x - 18, HANDLE.y + 24).stroke(frame);
    g.moveTo(SEAT.x - 14, SEAT.y).lineTo(SEAT.x + 16, SEAT.y).stroke({ color: juice, width: 7 });
    g.moveTo(HANDLE.x - 30, HANDLE.y + 22).lineTo(HANDLE.x + 6, HANDLE.y + 22).stroke({ color: juice, width: 6 });

    // 发电机(中轴下)
    g.roundRect(GEN.x - 26, GEN.y - 16, 52, 32, 8)
      .fill(0x111631)
      .stroke({ color: 0xfbbf24, width: 2, alpha: 0.5 + glow * 0.5 });

    // 曲柄 + 脚踏
    const px = BB.x + Math.cos(a) * CRANK;
    const py = BB.y + Math.sin(a) * CRANK;
    const qx = BB.x - Math.cos(a) * CRANK;
    const qy = BB.y - Math.sin(a) * CRANK;
    g.moveTo(qx, qy).lineTo(px, py).stroke({ color: 0x94a3b8, width: 7 });
    g.circle(BB.x, BB.y, 9).fill(0x0d1022).stroke({ color: 0xfbbf24, width: 3 });
    g.roundRect(px - 12, py - 4, 24, 8, 3).fill(juice);
    g.roundRect(qx - 12, qy - 4, 24, 8, 3).fill(juice);

    // 骑手(扁平小人)
    const suit = 0x34d399;
    const skin = 0xfcd9b8;
    // 躯干
    g.moveTo(SEAT.x + 8, SEAT.y - 4).lineTo(SHOULDER.x, SHOULDER.y).stroke({ color: suit, width: 20 });
    // 手臂
    g.moveTo(SHOULDER.x, SHOULDER.y).lineTo(HANDLE.x - 12, HANDLE.y + 22).stroke({ color: suit, width: 9 });
    // 头 + 头盔
    g.circle(HEAD.x, HEAD.y, 17).fill(skin);
    g.arc(HEAD.x, HEAD.y, 19, Math.PI, Math.PI * 2).stroke({ color: juice, width: 9 });
    // 双腿(髋→膝→脚踏,膝盖向前顶)
    const hip = { x: SEAT.x + 8, y: SEAT.y - 6 };
    for (const [tx, ty] of [
      [px, py],
      [qx, qy],
    ]) {
      const knee = { x: (hip.x + tx) / 2 + 26, y: (hip.y + ty) / 2 - 14 };
      g.moveTo(hip.x, hip.y).lineTo(knee.x, knee.y).lineTo(tx, ty).stroke({ color: 0x10b981, width: 10 });
    }
  }

  private drawReactor() {
    const g = this.fx;
    g.clear();
    const glow = Math.min(1, this.watts / 900);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);

    // 电缆:发电机 → K3 核心
    g.moveTo(GEN.x + 26, GEN.y + 8)
      .bezierCurveTo(GEN.x + 140, GROUND_Y + 80, REACTOR.x - 130, GROUND_Y + 70, REACTOR.x - 40, REACTOR.y + REACTOR.r)
      .stroke({ color: 0xfbbf24, width: 4, alpha: 0.35 + glow * 0.6 });

    // 核心底座
    g.roundRect(REACTOR.x - 90, REACTOR.y + REACTOR.r - 6, 180, 24, 6).fill(0x111631);

    // 光晕
    const haloR = REACTOR.r * (1.15 + glow * 0.5 + pulse * 0.08);
    g.circle(REACTOR.x, REACTOR.y, haloR).fill({ color: 0xe879f9, alpha: 0.05 + glow * 0.16 });
    g.circle(REACTOR.x, REACTOR.y, REACTOR.r + 10).fill({ color: 0x22d3ee, alpha: 0.08 + glow * 0.2 });
    // 核心体
    g.circle(REACTOR.x, REACTOR.y, REACTOR.r).fill(0x0d1022).stroke({ color: 0xe879f9, width: 4, alpha: 0.7 + glow * 0.3 });
    // 内部能量环
    const inner = REACTOR.r * 0.55 * (0.9 + pulse * 0.15 * (0.3 + glow));
    g.circle(REACTOR.x, REACTOR.y, inner).fill({ color: 0x22d3ee, alpha: 0.25 + glow * 0.55 });
    g.circle(REACTOR.x, REACTOR.y, inner * 0.5).fill({ color: 0xffffff, alpha: 0.3 + glow * 0.6 });
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('resize', this.resize);
    this.app.destroy(true);
  }
}
