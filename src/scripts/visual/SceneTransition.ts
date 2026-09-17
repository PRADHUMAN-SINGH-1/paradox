// PARADOX Visual Engine — Scene Transition Controller
// Calculates Hermite cubic easing between narrative scenes, driving camera, materials, and theme tones.

import { VisualTheme } from './VisualTheme.ts';
import type { ActiveTransitionState } from './SceneState.ts';

export class SceneTransition {
  private THREE: any;
  private mouseOffsetX: number = 0;
  private mouseOffsetY: number = 0;

  constructor(threeInstance: any) {
    this.THREE = threeInstance;
  }

  public setParallax(x: number, y: number) {
    this.mouseOffsetX = x * 7.5;
    this.mouseOffsetY = y * 7.5;
  }

  /**
   * Evaluates current active scene and interpolated camera state based on scroll progress [0..1]
   */
  public evaluate(scrollProgress: number): ActiveTransitionState & { isLightTone: boolean } {
    const p = Math.max(0, Math.min(1, scrollProgress));
    const scenes = VisualTheme.SCENES;

    let idx = 0;
    for (let i = 0; i < scenes.length - 1; i++) {
      if (p >= scenes[i].progressStart && p <= scenes[i + 1].progressStart) {
        idx = i;
        break;
      }
      if (i === scenes.length - 2) {
        idx = i;
      }
    }

    const s0 = scenes[idx];
    const s1 = scenes[idx + 1] || s0;

    const span = Math.max(0.0001, s1.progressStart - s0.progressStart);
    const localT = Math.max(0, Math.min(1, (p - s0.progressStart) / span));

    // Cubic Hermite smoothstep for organic deceleration and acceleration
    const smoothT = localT * localT * (3 - 2 * localT);

    // Camera position interpolation + pointer parallax
    const posX = s0.cameraPosition[0] + (s1.cameraPosition[0] - s0.cameraPosition[0]) * smoothT + this.mouseOffsetX;
    const posY = s0.cameraPosition[1] + (s1.cameraPosition[1] - s0.cameraPosition[1]) * smoothT + this.mouseOffsetY;
    const posZ = s0.cameraPosition[2] + (s1.cameraPosition[2] - s0.cameraPosition[2]) * smoothT;

    // Camera target interpolation
    const tgtX = s0.cameraTarget[0] + (s1.cameraTarget[0] - s0.cameraTarget[0]) * smoothT;
    const tgtY = s0.cameraTarget[1] + (s1.cameraTarget[1] - s0.cameraTarget[1]) * smoothT;
    const tgtZ = s0.cameraTarget[2] + (s1.cameraTarget[2] - s0.cameraTarget[2]) * smoothT;

    // FOV interpolation
    const fov = s0.cameraFov + (s1.cameraFov - s0.cameraFov) * smoothT;

    // Background color interpolation
    const c0 = new this.THREE.Color(s0.backgroundColor);
    const c1 = new this.THREE.Color(s1.backgroundColor);
    const mixedBg = c0.lerp(c1, smoothT);

    const isLight = smoothT <= 0.45 ? s0.isLightTone : s1.isLightTone;

    return {
      currentScene: s0,
      nextScene: s1,
      blendFactor: smoothT,
      cameraPosition: [posX, posY, posZ],
      cameraTarget: [tgtX, tgtY, tgtZ],
      cameraFov: fov,
      currentBgColor: mixedBg.getHex(),
      isLightTone: isLight
    };
  }

  /**
   * Helper to calculate smooth visibility envelope weight [0..1] for a scene
   */
  public static calculateSceneWeight(p: number, start: number, end: number, fadeDist = 0.04): number {
    if (p < start - fadeDist || p > end + fadeDist) return 0;
    if (p < start) return (p - (start - fadeDist)) / fadeDist;
    if (p > end) return ((end + fadeDist) - p) / fadeDist;
    return 1;
  }
}
