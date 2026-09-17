// PARADOX Master Clock
// Single unified animation loop eliminating competing rAF instances across engines.

type ClockCallback = (delta: number, elapsed: number) => void;

export class MasterClock {
  private static instance: MasterClock | null = null;
  private callbacks: Map<string, ClockCallback> = new Map();
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private elapsed: number = 0;
  private rafId: number | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });
    }
  }

  public static getInstance(): MasterClock {
    if (!MasterClock.instance) {
      MasterClock.instance = new MasterClock();
    }
    return MasterClock.instance;
  }

  public register(id: string, callback: ClockCallback) {
    this.callbacks.set(id, callback);
    if (!this.isRunning && this.callbacks.size > 0) {
      this.start();
    }
  }

  public unregister(id: string) {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) {
      this.pause();
    }
  }

  private start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  private pause() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private resume() {
    if (!this.isRunning && this.callbacks.size > 0) {
      this.lastTime = performance.now();
      this.isRunning = true;
      this.tick();
    }
  }

  private tick = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    // Cap delta at 100ms to prevent huge jumps after backgrounding
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += delta;

    this.callbacks.forEach((cb) => {
      try {
        cb(delta, this.elapsed);
      } catch (e) {
        console.error('[MasterClock Error]', e);
      }
    });

    this.rafId = requestAnimationFrame(this.tick);
  };
}
