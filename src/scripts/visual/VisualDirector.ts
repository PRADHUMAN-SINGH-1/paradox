// PARADOX Visual Engine — Master Visual Director
// Orchestrates the 11 visual scene worlds, transitions, physical lighting, materials, and DOM synchronization.

import { PerformanceGovernor } from '../webgl/PerformanceGovernor.ts';
import { LoadingManager } from '../webgl/LoadingManager.ts';
import { EnvironmentPipeline } from '../webgl/EnvironmentPipeline.ts';
import { PostProcessing } from '../webgl/PostProcessing.ts';
import { VisualClock } from './VisualClock.ts';
import { AssetRegistry } from './AssetRegistry.ts';
import { SceneTransition } from './SceneTransition.ts';
import { SceneRegistry } from './SceneRegistry.ts';
import { VisualComposition } from './VisualComposition.ts';
import { VisualTimeline } from './VisualTimeline.ts';
import { MediaManager } from '../media/MediaManager.ts';

declare global {
  interface Window {
    THREE?: any;
    lenisInstance?: any;
    paradoxVisualDirector?: any;
    paradoxWebGL?: any;
  }
}

export class VisualDirector {
  private static instance: VisualDirector | null = null;

  private canvas: HTMLCanvasElement;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private animId = 0;
  private isVisible = true;
  private isMobile = false;

  // Subsystems
  private clock: VisualClock;
  private governor: PerformanceGovernor;
  private loadingManager: LoadingManager;
  private assets: AssetRegistry | null = null;
  private sceneRegistry: SceneRegistry | null = null;
  private transition: SceneTransition | null = null;
  private timeline: VisualTimeline | null = null;
  private composition: VisualComposition | null = null;
  private envPipeline: EnvironmentPipeline | null = null;
  private postProcessing: PostProcessing | null = null;
  private mediaManager: MediaManager | null = null;

  private scrollProgress = 0;
  private mouseWorld: any = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new VisualClock();
    this.governor = new PerformanceGovernor();
    this.loadingManager = new LoadingManager();

    if (typeof window === 'undefined' || !window.THREE) return;

    this.isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

    try {
      this.init();
    } catch (e) {
      console.warn('Paradox Visual Director initialization error:', e);
    }
  }

  public static getInstance(canvas?: HTMLCanvasElement): VisualDirector | null {
    if (!VisualDirector.instance && canvas) {
      VisualDirector.instance = new VisualDirector(canvas);
    }
    return VisualDirector.instance;
  }

  private init() {
    const THREE = window.THREE;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.mouseWorld = new THREE.Vector3(0, 0, 0);

    const budget = this.governor.getBudget();

    // 1. Persistent WebGL Renderer with sRGB & ACES Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: budget.tier === 'HIGH' && !this.isMobile,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isMobile ? Math.min(budget.targetDpr, 1.25) : budget.targetDpr);

    // 2. Camera System
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, w / h, 1, 1500);
    this.camera.position.set(0, 0, 180);

    // Initial Scene Background: Editorial Light Gallery (#EEF0F4)
    this.scene.background = new THREE.Color(0xEEF0F4);

    // 3. Subsystems
    this.envPipeline = new EnvironmentPipeline(THREE, this.renderer, this.scene);
    this.envPipeline.setup();

    this.postProcessing = new PostProcessing(THREE, this.renderer, this.scene, this.camera);
    this.postProcessing.setSize(w, h);

    this.assets = new AssetRegistry(THREE);
    this.transition = new SceneTransition(THREE);
    this.timeline = new VisualTimeline();
    this.sceneRegistry = new SceneRegistry(THREE, this.scene, this.assets, budget);
    this.composition = new VisualComposition(THREE, this.camera);
    this.mediaManager = MediaManager.getInstance();
    this.mediaManager.bindPageVideos();

    // 4. Loading Readiness
    this.loadingManager.notifyRendererReady();
    this.loadingManager.notifyHeroShadersReady();
    this.loadingManager.onHeroReady(() => {
      window.dispatchEvent(new CustomEvent('paradox:hero_ready'));
    });

    // 5. Global Telemetry API
    this.registerGlobalAPI();

    // 6. Bind Listeners & Start Loop
    this.bind();
    this.animate();
  }

  private registerGlobalAPI() {
    const api = {
      isReady: true,
      getTelemetry: () => {
        const budget = this.governor.getBudget();
        return {
          rx: (this.clock.manualRotation.x * (180 / Math.PI)).toFixed(1),
          ry: (this.clock.manualRotation.y * (180 / Math.PI)).toFixed(1),
          fps: budget.fps,
          tier: budget.tier,
          dpr: budget.targetDpr.toFixed(2),
          scrollProgress: this.scrollProgress.toFixed(3)
        };
      }
    };
    window.paradoxVisualDirector = api;
    window.paradoxWebGL = api;
  }

  private bind() {
    window.addEventListener('resize', this.onResize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.clock.mouse.targetX = (e.clientX / w) * 2 - 1;
      this.clock.mouse.targetY = -(e.clientY / h) * 2 + 1;

      if (this.mouseWorld) {
        this.mouseWorld.set(this.clock.mouse.targetX * 30, this.clock.mouse.targetY * 18, 0);
      }

      if (this.clock.isDragging) {
        const deltaX = e.clientX - this.clock.lastPointerX;
        const deltaY = e.clientY - this.clock.lastPointerY;
        this.clock.lastPointerX = e.clientX;
        this.clock.lastPointerY = e.clientY;

        this.clock.angularVelocity.y = deltaX * 0.008;
        this.clock.angularVelocity.x = deltaY * 0.008;
        this.clock.manualRotation.y += this.clock.angularVelocity.y;
        this.clock.manualRotation.x += this.clock.angularVelocity.x;
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      this.clock.isDragging = true;
      this.clock.lastPointerX = e.clientX;
      this.clock.lastPointerY = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      this.clock.isDragging = false;
    });

    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    }, { passive: true });

    if (window.lenisInstance) {
      window.lenisInstance.on('scroll', ({ progress }: { progress: number }) => {
        this.scrollProgress = progress;
      });
    }

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible && !this.animId) this.animate();
    });
  }

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.postProcessing) {
      this.postProcessing.setSize(w, h);
    }
  };

  private animate = () => {
    if (!this.isVisible) {
      this.animId = 0;
      return;
    }

    const { delta, elapsed, audioEnergy } = this.clock.tick();
    const budget = this.governor.tick();

    if (this.transition && this.camera && this.sceneRegistry && this.timeline) {
      // 1. Mouse Parallax
      this.transition.setParallax(this.clock.mouse.x, this.clock.mouse.y);

      // 2. Evaluate Continuous Scene Transition State via Timeline
      const keyframe = this.timeline.evaluate(this.scrollProgress, { x: this.clock.mouse.x, y: this.clock.mouse.y });

      // 3. Camera Choreography (Position, Target, FOV, Roll)
      this.camera.position.set(keyframe.camera.x, keyframe.camera.y, keyframe.camera.z);
      this.camera.lookAt(keyframe.camera.targetX, keyframe.camera.targetY, keyframe.camera.targetZ);
      this.camera.rotation.z = keyframe.camera.roll;

      if (this.camera.fov !== keyframe.camera.fov) {
        this.camera.fov = keyframe.camera.fov;
        this.camera.updateProjectionMatrix();
      }

      // 4. Background Color Crossfade
      if (this.scene) {
        this.scene.background.setHex(keyframe.theme.bgColor);
      }

      // 5. Dynamic Core Material Adaptation
      const coreMat = this.sceneRegistry.getCoreMaterial();
      if (coreMat && coreMat.uniforms) {
        if (keyframe.theme.isLightTone) {
          coreMat.uniforms.uColor.value.setHex(0x181C24);
          coreMat.uniforms.uRimColor.value.setHex(0xFFFFFF);
        } else {
          coreMat.uniforms.uColor.value.setHex(0x0A0D12);
          coreMat.uniforms.uRimColor.value.setHex(0xCFD5E1);
        }
      }

      // 6. DOM ↔ WebGL Composition Sync
      if (this.composition) {
        this.composition.updateTheme(keyframe.theme.isLightTone, keyframe.theme.bgColor);
      }

      // 7. Dynamic Scene Geometries and Shader Updates
      this.sceneRegistry.update(
        this.scrollProgress,
        delta,
        elapsed,
        audioEnergy,
        this.mouseWorld,
        this.clock.manualRotation,
        this.clock.mouse
      );
    }

    // 8. Explicit Post-Processing Render Pass
    if (this.postProcessing) {
      this.postProcessing.render(delta, budget.tier);
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animId = requestAnimationFrame(this.animate);
  };

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.sceneRegistry?.dispose();
    this.envPipeline?.dispose();
    this.postProcessing?.dispose();
    this.renderer?.dispose();
    VisualDirector.instance = null;
  }
}
