// PARADOX Performance Governor
// Real-time frame budget monitoring and dynamic quality tiering.
// ZERO fabricated telemetry - purely governs internal rendering budgets.

export type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PerformanceBudget {
  tier: QualityTier;
  targetDpr: number;
  maxInstances: number;
  particleBudget: number;
  postProcessingEnabled: boolean;
  smaaEnabled: boolean;
  fps: number;
}

export class PerformanceGovernor {
  private frameTimes: number[] = [];
  private lastTime: number = performance.now();
  private readonly windowSize: number = 60;
  private currentTier: QualityTier = 'HIGH';
  private consecutiveLowFrames: number = 0;
  private consecutiveHighFrames: number = 0;
  private rollingFps: number = 60;

  constructor() {
    // Detect mobile or low-memory device
    if (typeof window !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
      if (isMobile || isLowMemory) {
        this.currentTier = 'MEDIUM';
      }
    }
  }

  /**
   * Called on every frame of the render loop with the current timestamp.
   */
  public tick(now: number = performance.now()): PerformanceBudget {
    const delta = Math.max(1, now - this.lastTime);
    this.lastTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.windowSize) {
      this.frameTimes.shift();
    }

    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.rollingFps = Math.round(1000 / avgDelta);

    // Evaluate tier transitions with hysteresis to prevent thrashing
    if (this.rollingFps < 38) {
      this.consecutiveLowFrames++;
      this.consecutiveHighFrames = 0;
      if (this.consecutiveLowFrames > 90 && this.currentTier !== 'LOW') {
        this.currentTier = this.currentTier === 'HIGH' ? 'MEDIUM' : 'LOW';
        this.consecutiveLowFrames = 0;
      }
    } else if (this.rollingFps > 56) {
      this.consecutiveHighFrames++;
      this.consecutiveLowFrames = 0;
      if (this.consecutiveHighFrames > 180 && this.currentTier !== 'HIGH') {
        this.currentTier = this.currentTier === 'LOW' ? 'MEDIUM' : 'HIGH';
        this.consecutiveHighFrames = 0;
      }
    } else {
      this.consecutiveLowFrames = 0;
      this.consecutiveHighFrames = 0;
    }

    return this.getBudget();
  }

  /**
   * Returns current execution budget parameters.
   */
  public getBudget(): PerformanceBudget {
    const maxDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    switch (this.currentTier) {
      case 'HIGH':
        return {
          tier: 'HIGH',
          targetDpr: Math.min(maxDpr, 2.0),
          maxInstances: 160,
          particleBudget: 900,
          postProcessingEnabled: true,
          smaaEnabled: true,
          fps: this.rollingFps
        };
      case 'MEDIUM':
        return {
          tier: 'MEDIUM',
          targetDpr: Math.min(maxDpr, 1.5),
          maxInstances: 90,
          particleBudget: 500,
          postProcessingEnabled: true,
          smaaEnabled: false,
          fps: this.rollingFps
        };
      case 'LOW':
      default:
        return {
          tier: 'LOW',
          targetDpr: 1.0,
          maxInstances: 45,
          particleBudget: 250,
          postProcessingEnabled: false,
          smaaEnabled: false,
          fps: this.rollingFps
        };
    }
  }

  public getTier(): QualityTier {
    return this.currentTier;
  }

  /**
   * Force a quality tier downgrade (called by VisualDirector performance monitoring)
   */
  public downgradeTier() {
    if (this.currentTier === 'HIGH') {
      this.currentTier = 'MEDIUM';
    } else if (this.currentTier === 'MEDIUM') {
      this.currentTier = 'LOW';
    }
    this.consecutiveLowFrames = 0;
    this.consecutiveHighFrames = 0;
  }
}
