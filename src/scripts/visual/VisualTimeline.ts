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

  constructor() {
    this.scenes = VisualTheme.SCENES;
  }

  /**
   * Evaluates the continuous timeline state at exact scroll progress [0..1]
   */
  public evaluate(p: number, mouseParallax = { x: 0, y: 0 }): TimelineKeyframe {
    const clampedP = Math.max(0, Math.min(1, p));
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
    const camX = s0.cameraPosition[0] + (s1.cameraPosition[0] - s0.cameraPosition[0]) * easeT + mouseParallax.x * 6.0;
    const camY = s0.cameraPosition[1] + (s1.cameraPosition[1] - s0.cameraPosition[1]) * easeT + mouseParallax.y * 6.0;
    const camZ = s0.cameraPosition[2] + (s1.cameraPosition[2] - s0.cameraPosition[2]) * easeT;

    const tgtX = s0.cameraTarget[0] + (s1.cameraTarget[0] - s0.cameraTarget[0]) * easeT;
    const tgtY = s0.cameraTarget[1] + (s1.cameraTarget[1] - s0.cameraTarget[1]) * easeT;
    const tgtZ = s0.cameraTarget[2] + (s1.cameraTarget[2] - s0.cameraTarget[2]) * easeT;

    const fov = s0.cameraFov + (s1.cameraFov - s0.cameraFov) * easeT;
    const roll = Math.sin(clampedP * Math.PI * 4) * 0.035;

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
        x: camX,
        y: camY,
        z: camZ,
        targetX: tgtX,
        targetY: tgtY,
        targetZ: tgtZ,
        fov,
        roll
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
