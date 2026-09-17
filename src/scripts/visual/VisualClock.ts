// PARADOX Visual Engine — Visual Clock
// High-precision clock driving delta smoothing, elapsed time, pointer inertia, and audio energy analysis.

import { sound } from '../sound-engine.ts';

export class VisualClock {
  private lastTime: number = 0;
  private elapsed: number = 0;

  // Pointer & Inertia State
  public mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  public manualRotation = { x: 0.1, y: 0.2 };
  public angularVelocity = { x: 0, y: 0 };
  public isDragging: boolean = false;
  public lastPointerX: number = 0;
  public lastPointerY: number = 0;

  constructor() {
    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  public tick(): { delta: number; elapsed: number; audioEnergy: number } {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const rawDelta = Math.max(0.001, (now - this.lastTime) / 1000);
    const delta = Math.min(0.08, rawDelta); // clamp to avoid jumps
    this.lastTime = now;
    this.elapsed += delta;

    // Smooth pointer easing
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    // Inertial rotation damping
    if (!this.isDragging) {
      this.angularVelocity.x *= 0.94;
      this.angularVelocity.y *= 0.94;
      this.manualRotation.x += this.angularVelocity.x;
      this.manualRotation.y += this.angularVelocity.y;
      this.manualRotation.y += 0.002;
    }

    const audioEnergy = sound.getAudioEnergy();
    return { delta, elapsed: this.elapsed, audioEnergy };
  }

  public getElapsed(): number {
    return this.elapsed;
  }
}
