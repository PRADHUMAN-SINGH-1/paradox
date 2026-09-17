// PARADOX Tiered Loading Manager
// Decouples Priority 0 (Critical Hero) readiness from secondary chapter background streaming.

export type LoadingMilestone = 'BOOT' | 'HERO_READY' | 'STREAMING_BACKGROUND' | 'COMPLETE';

export class LoadingManager {
  private milestone: LoadingMilestone = 'BOOT';
  private heroReadyCallbacks: Array<() => void> = [];
  private completeCallbacks: Array<() => void> = [];

  private isFontsReady: boolean = false;
  private isRendererReady: boolean = false;
  private isHeroShadersReady: boolean = false;

  constructor() {
    this.checkFonts();
  }

  private async checkFonts() {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      try {
        await (document as any).fonts.ready;
      } catch {
        // Fallback gracefully
      }
    }
    this.isFontsReady = true;
    this.checkHeroReadiness();
  }

  public notifyRendererReady() {
    this.isRendererReady = true;
    this.checkHeroReadiness();
  }

  public notifyHeroShadersReady() {
    this.isHeroShadersReady = true;
    this.checkHeroReadiness();
  }

  private checkHeroReadiness() {
    if (this.milestone === 'BOOT' && this.isFontsReady && this.isRendererReady && this.isHeroShadersReady) {
      this.milestone = 'HERO_READY';
      this.heroReadyCallbacks.forEach((cb) => cb());
      this.heroReadyCallbacks = [];
      
      // Start background streaming
      this.startBackgroundStreaming();
    }
  }

  private startBackgroundStreaming() {
    this.milestone = 'STREAMING_BACKGROUND';
    // Yield to the main thread then mark complete
    if (typeof window !== 'undefined') {
      const idleCallback = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(cb, 200));
      idleCallback(() => {
        this.milestone = 'COMPLETE';
        this.completeCallbacks.forEach((cb) => cb());
        this.completeCallbacks = [];
      });
    } else {
      this.milestone = 'COMPLETE';
    }
  }

  public onHeroReady(callback: () => void) {
    if (this.milestone !== 'BOOT') {
      callback();
    } else {
      this.heroReadyCallbacks.push(callback);
    }
  }

  public onComplete(callback: () => void) {
    if (this.milestone === 'COMPLETE') {
      callback();
    } else {
      this.completeCallbacks.push(callback);
    }
  }

  public getMilestone(): LoadingMilestone {
    return this.milestone;
  }
}
