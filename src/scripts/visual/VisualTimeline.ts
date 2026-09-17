// PARADOX Visual Engine — Visual Timeline Orchestrator
// Computes high-precision scroll timeline curves, camera choreography, and scene progression keyframes.

import { VisualTheme } from './VisualTheme.ts';
import type { SceneDefinition } from './SceneState.ts';

export interface TimelineKeyframe {
  progress: number;
  sceneId: string;
  sceneIndex: number;
  localProgress: number;
  camera: {
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    fov: number;
    roll: number;
  };
  lighting: {
    exposure: number;
    keyIntensity: number;
    rimIntensity: number;
  };
  theme: {
    isLightTone: boolean;
    bgColor: number;
  };
}

export class VisualTimeline {
  private scenes: SceneDefinition[];
  private dampedCamera = { x: 0, y: 0, z: 180, targetX: 0, targetY: 0, targetZ: 0, fov: 48, roll: 0 };
  private scrollVelocity = 0;
  private lastProgress = 0;
  private initialized = false;

  constructor() {
    this.scenes = VisualTheme.SCENES;
  }

  /**
   * Evaluates the continuous timeline state at exact scroll progress [0..1]
   */
  public evaluate(p: number, mouseParallax = { x: 0, y: 0 }, delta: number = 0.016): TimelineKeyframe {
    const clampedP = Math.max(0, Math.min(1, p));
    const safeDelta = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.1) : 0.016;
    let idx = 0;

    for (let i = 0; i < this.scenes.length - 1; i++) {
      if (clampedP >= this.scenes[i].progressStart && clampedP <= this.scenes[i + 1].progressStart) {
        idx = i;
        break;
      }
      if (i === this.scenes.length - 2) {
        idx = i;
      }
    }

    const s0 = this.scenes[idx];
    const s1 = this.scenes[idx + 1] || s0;

    const span = Math.max(0.0001, s1.progressStart - s0.progressStart);
    const localT = Math.max(0, Math.min(1, (clampedP - s0.progressStart) / span));

    // Quintic / Hermite organic ease for cinematic motion
    const easeT = localT * localT * localT * (localT * (localT * 6 - 15) + 10);

    // Camera Travel with pointer parallax & subtle dynamic roll
    let camX = s0.cameraPosition[0] + (s1.cameraPosition[0] - s0.cameraPosition[0]) * easeT + (mouseParallax.x || 0) * 6.0;
    let camY = s0.cameraPosition[1] + (s1.cameraPosition[1] - s0.cameraPosition[1]) * easeT + (mouseParallax.y || 0) * 6.0;
    let camZ = s0.cameraPosition[2] + (s1.cameraPosition[2] - s0.cameraPosition[2]) * easeT;

    let tgtX = s0.cameraTarget[0] + (s1.cameraTarget[0] - s0.cameraTarget[0]) * easeT;
    let tgtY = s0.cameraTarget[1] + (s1.cameraTarget[1] - s0.cameraTarget[1]) * easeT;
    let tgtZ = s0.cameraTarget[2] + (s1.cameraTarget[2] - s0.cameraTarget[2]) * easeT;

    let fov = s0.cameraFov + (s1.cameraFov - s0.cameraFov) * easeT;
    let roll = Math.sin(clampedP * Math.PI * 4) * 0.035;

    // Per-scene camera motion modifiers
    if (s0.id === 'ORIGIN') {
      camX += Math.sin(clampedP * Math.PI * 2) * 2;
    } else if (s0.id === 'CORE') {
      camX += Math.cos(clampedP * Math.PI * 4) * 4;
      camZ -= 10;
    } else if (s0.id === 'TOPOLOGY') {
      camZ += Math.sin(clampedP * Math.PI) * -20;
      roll += 0.05;
    } else if (s0.id === 'VERIFY') {
      roll = 0;
    } else if (s0.id === 'TUNNEL') {
      camZ -= easeT * 50;
      fov = 30;
    } else if (s0.id === 'VOID') {
      camZ += easeT * 20;
    }

    this.scrollVelocity = Math.abs(clampedP - this.lastProgress) / Math.max(0.001, safeDelta);
    this.lastProgress = clampedP;
    const shake = Math.min(this.scrollVelocity * 0.5, 0.8);
    
    if (shake > 0.01) {
      camX += (Math.random() - 0.5) * shake;
      camY += (Math.random() - 0.5) * shake;
    }

    if (!this.initialized) {
      this.dampedCamera.x = camX;
      this.dampedCamera.y = camY;
      this.dampedCamera.z = camZ;
      this.dampedCamera.targetX = tgtX;
      this.dampedCamera.targetY = tgtY;
      this.dampedCamera.targetZ = tgtZ;
      this.dampedCamera.fov = fov;
      this.dampedCamera.roll = roll;
      this.initialized = true;
    } else {
      // Apply exponential damping
      const damp = Math.max(0, Math.min(1, 1 - Math.exp(-3.5 * safeDelta)));
      if (Number.isFinite(camX)) this.dampedCamera.x += (camX - this.dampedCamera.x) * damp;
      if (Number.isFinite(camY)) this.dampedCamera.y += (camY - this.dampedCamera.y) * damp;
      if (Number.isFinite(camZ)) this.dampedCamera.z += (camZ - this.dampedCamera.z) * damp;
      if (Number.isFinite(tgtX)) this.dampedCamera.targetX += (tgtX - this.dampedCamera.targetX) * damp;
      if (Number.isFinite(tgtY)) this.dampedCamera.targetY += (tgtY - this.dampedCamera.targetY) * damp;
      if (Number.isFinite(tgtZ)) this.dampedCamera.targetZ += (tgtZ - this.dampedCamera.targetZ) * damp;
      if (Number.isFinite(fov)) this.dampedCamera.fov += (fov - this.dampedCamera.fov) * damp;
      if (Number.isFinite(roll)) this.dampedCamera.roll += (roll - this.dampedCamera.roll) * damp;
    }

    // Lighting interpolation
    const exp = s0.lighting.exposure + (s1.lighting.exposure - s0.lighting.exposure) * easeT;
    const keyInt = s0.lighting.keyIntensity + (s1.lighting.keyIntensity - s0.lighting.keyIntensity) * easeT;
    const rimInt = s0.lighting.rimIntensity + (s1.lighting.rimIntensity - s0.lighting.rimIntensity) * easeT;

    const isLight = easeT <= 0.45 ? s0.isLightTone : s1.isLightTone;

    return {
      progress: clampedP,
      sceneId: s0.id,
      sceneIndex: idx,
      localProgress: easeT,
      camera: {
        x: this.dampedCamera.x,
        y: this.dampedCamera.y,
        z: this.dampedCamera.z,
        targetX: this.dampedCamera.targetX,
        targetY: this.dampedCamera.targetY,
        targetZ: this.dampedCamera.targetZ,
        fov: this.dampedCamera.fov,
        roll: this.dampedCamera.roll
      },
      lighting: {
        exposure: exp,
        keyIntensity: keyInt,
        rimIntensity: rimInt
      },
      theme: {
        isLightTone: isLight,
        bgColor: isLight ? 0xEEF0F4 : s0.backgroundColor
      }
    };
  }

  public getScenes(): SceneDefinition[] {
    return this.scenes;
  }
}
