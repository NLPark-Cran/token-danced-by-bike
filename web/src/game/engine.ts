import { Application, Assets, Container, Graphics, TilingSprite } from 'pixi.js';

export interface Snapshot {
  speedKmh: number;
  watts: number;
  tokensPerSec: number;
  stamina: number;
  sessionTokens: number;
  coreCharge: number;
}

export interface BikeEngineOptions {
  onSnapshot?: (snapshot: Snapshot) => void;
  onEarn?: (wholeTokens: number) => void;
}

export class BikeEngine {
  private app = new Application();
  private world = new Container();
  private bg?: TilingSprite;
  private pedal = 0;
  private speed = 0;
  private stamina = 100;
  private sessionTokens = 0;
  private pendingTokens = 0;
  private bgScroll = 0;
  private lastInput = 0;
  private ready = false;
  private readonly options: BikeEngineOptions;

  constructor(options: BikeEngineOptions = {}) { this.options = options; }

  async mount(host: HTMLElement) {
    await this.app.init({ resizeTo: host, antialias: true, backgroundAlpha: 0, resolution: Math.min(devicePixelRatio, 2) });
    host.replaceChildren(this.app.canvas);
    this.app.stage.addChild(this.world);
    const texture = await Assets.load('/assets/bg-city.png');
    this.bg = new TilingSprite({ texture, width: this.app.screen.width, height: this.app.screen.height });
    this.world.addChild(this.bg);
    this.drawMachine();
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
    window.addEventListener('resize', this.resize);
    this.app.canvas.addEventListener('pointerdown', this.push);
    window.addEventListener('keydown', this.keydown);
    this.ready = true;
  }

  private resize = () => {
    if (!this.bg) return;
    this.bg.width = this.app.screen.width;
    this.bg.height = this.app.screen.height;
  };

  private keydown = (event: KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      event.preventDefault();
      this.push();
    }
  };

  private push = () => {
    if (!this.ready || this.stamina <= 0.5) return;
    const now = performance.now();
    const rhythm = Math.max(0, 1 - Math.abs(220 - (now - this.lastInput)) / 420);
    this.lastInput = now;
    this.pedal += 1;
    this.speed = Math.min(58, this.speed + 4.2 + rhythm * 3.8);
    this.stamina = Math.max(0, this.stamina - 0.7);
  };

  private drawMachine() {
    const machine = new Container();
    const floor = new Graphics().roundRect(-170, 88, 340, 20, 10).fill({ color: 0x111827, alpha: .9 });
    const rear = new Graphics().circle(-92, 40, 52).stroke({ color: 0x22d3ee, width: 9 }).circle(-92, 40, 8).fill(0xe879f9);
    const front = new Graphics().circle(92, 40, 52).stroke({ color: 0x22d3ee, width: 9 }).circle(92, 40, 8).fill(0xe879f9);
    const frame = new Graphics().moveTo(-92, 40).lineTo(-20, -30).lineTo(38, 40).lineTo(-92, 40).moveTo(-20, -30).lineTo(92, 40).stroke({ color: 0xfbbf24, width: 10, cap: 'round', join: 'round' });
    const core = new Graphics().circle(180, -20, 58).fill({ color: 0x312e81, alpha: .9 }).stroke({ color: 0xe879f9, width: 8 });
    machine.addChild(floor, rear, front, frame, core);
    machine.position.set(this.app.screen.width / 2, this.app.screen.height * .66);
    machine.scale.set(Math.min(1.2, this.app.screen.width / 650));
    this.world.addChild(machine);
  }

  private tick(dt: number) {
    this.speed *= Math.pow(.73, dt);
    const watts = Math.round(this.speed * 8.4);
    const tokensPerSec = Math.max(0, (watts - 28) / 520);
    const earned = tokensPerSec * dt;
    this.sessionTokens += earned;
    this.pendingTokens += earned;
    this.stamina = Math.min(100, this.stamina + (this.speed < 4 ? 3.2 : .45) * dt);
    this.bgScroll += this.speed * dt * 2.4;
    if (this.bg) this.bg.tilePosition.x = -this.bgScroll;
    const whole = Math.floor(this.pendingTokens);
    if (whole > 0) { this.pendingTokens -= whole; this.options.onEarn?.(whole); }
    this.options.onSnapshot?.({ speedKmh: this.speed, watts, tokensPerSec, stamina: this.stamina, sessionTokens: this.sessionTokens, coreCharge: Math.min(100, watts / 5) });
  }

  destroy() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.keydown);
    this.app.canvas.removeEventListener('pointerdown', this.push);
    this.app.destroy(true, { children: true, texture: false });
    this.ready = false;
  }
}

/*
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
Design note: Fractional rewards accumulate before synchronization.
Design note: Parallax speed follows the simulated bicycle speed.
Design note: The canvas resolution is capped for mobile GPUs.
Design note: Pointer and keyboard input share one bounded action.
Design note: Callbacks keep rendering independent from account data.
Design note: Destroy removes listeners and releases Pixi resources.
Design note: Input impulses accelerate the virtual flywheel.
Design note: Velocity decays continuously between pedal strokes.
Design note: Rhythmic input earns a small cadence bonus.
Design note: Stamina drains under load and recovers at rest.
Design note: Power is derived from the current wheel speed.
Design note: Token yield begins only above idle power.
                                                             */