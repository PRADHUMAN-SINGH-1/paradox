/**
 * PARADOX 2.0 Master WebGL Engine
 * Architecture defined by the September 2026 Immersive Frontend Transformation Specification:
 *  - Explicit Post-Processing: Scene -> RenderPass -> Controlled FX -> SMAA -> Screen
 *  - Custom GLSL Shaders: Core noise displacement, fresnel edge highlight, audio reactivity
 *  - Real Data Normalization & Instanced Mesh Repository Evidence Chips
 *  - Continuous 11-chapter Camera Scroll Trajectory with zero teleportation
 *  - Real-time Performance Governor (DPR scaling, frame budgeting, zero fake telemetry)
 *  - Tiered Hero Readiness preloader coordination
 */

import { CoreVert, CoreFrag, ParticlesVert, ParticlesFrag } from './shaders/shaderIndex.ts';
import { PerformanceGovernor } from './webgl/PerformanceGovernor.ts';
import { LoadingManager } from './webgl/LoadingManager.ts';
import { CameraTimeline } from './webgl/CameraTimeline.ts';
import { InstanceManager } from './webgl/InstanceManager.ts';
import { EnvironmentPipeline } from './webgl/EnvironmentPipeline.ts';
import { PostProcessing } from './webgl/PostProcessing.ts';
import { DomWebGLSync } from './webgl/DomWebGLSync.ts';
import { sound } from './sound-engine.ts';

declare global {
  interface Window {
    THREE?: any;
    lenisInstance?: any;
    paradoxWebGL?: any;
  }
}

export type WebGLSceneMode = 'core' | 'network' | 'tunnel' | 'evidence';

export class ThreeWebGLScene {
  private canvas: HTMLCanvasElement;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private animId = 0;
  private isVisible = true;
  private isReducedMotion = false;
  private isMobile = false;

  // Subsystems
  private governor: PerformanceGovernor;
  private loadingManager: LoadingManager;
  private cameraTimeline: CameraTimeline;
  private instanceManager: InstanceManager | null = null;
  private envPipeline: EnvironmentPipeline | null = null;
  private postProcessing: PostProcessing | null = null;
  private domSync: DomWebGLSync | null = null;

  public getDomSync(): DomWebGLSync | null {
    return this.domSync;
  }

  // Core 3D Objects
  private coreMesh: any = null;
  private coreMaterial: any = null;
  private coreInnerNucleus: any = null;
  private coreOrbitRing1: any = null;
  private coreOrbitRing2: any = null;
  private coreGroup: any = null;

  // Particle Constellation
  private particles: any = null;
  private particlesMaterial: any = null;
  private particleCount = 900;

  // Interaction State
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private angularVelocity = { x: 0, y: 0 };
  private manualRotation = { x: 0.2, y: 0.4 };
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private mouseWorld: any = null;

  // Scroll & Time Tracking
  private scrollProgress = 0;
  private clock: any = null;
  private shockwaveOrigin: any = null;
  private shockwaveProgress = 0;

  // Active Narrative Mode
  private activeMode: WebGLSceneMode = 'core';
  private targetCoreScale = 1.0;
  private currentCoreScale = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.governor = new PerformanceGovernor();
    this.loadingManager = new LoadingManager();
    this.cameraTimeline = new CameraTimeline();

    if (typeof window === 'undefined' || !window.THREE) return;

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

    try {
      this.init();
    } catch (e) {
      console.warn('Paradox WebGL Scene initialization error:', e);
    }
  }

  private init() {
    const THREE = window.THREE;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.clock = new THREE.Clock();
    this.mouseWorld = new THREE.Vector3(0, 0, 0);
    this.shockwaveOrigin = new THREE.Vector3(0, 0, 0);

    const budget = this.governor.getBudget();

    // 1. WebGL Renderer with sRGB & ACESFilmic Tone Mapping
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
    this.camera = new THREE.PerspectiveCamera(50, w / h, 1, 1500);
    this.camera.position.set(0, 0, 180);

    // 3. Setup Environment & Surgical Lighting
    this.envPipeline = new EnvironmentPipeline(THREE, this.renderer, this.scene);
    this.envPipeline.setup();

    // 4. Setup Explicit Post-Processing Pipeline
    this.postProcessing = new PostProcessing(THREE, this.renderer, this.scene, this.camera);
    this.postProcessing.setSize(w, h);

    // 5. DOM-WebGL Synchronization
    this.domSync = new DomWebGLSync(THREE, this.camera);

    // 6. Build Shaded Paradox Core (P0 Hero)
    this.createParadoxCore(THREE);

    // 7. Build Shaded Particle Constellation
    this.createParticles(THREE, budget.particleBudget);

    // 8. Build Instanced Repository Evidence Chips
    this.instanceManager = new InstanceManager(THREE);
    const evidenceMesh = this.instanceManager.createEvidenceGrid(budget.maxInstances);
    this.scene.add(evidenceMesh);

    // 9. Notify Loading Readiness
    this.loadingManager.notifyRendererReady();
    this.loadingManager.notifyHeroShadersReady();
    this.loadingManager.onHeroReady(() => {
      window.dispatchEvent(new CustomEvent('paradox:hero_ready'));
    });

    // 10. Register Global API (Zero fake telemetry)
    this.registerGlobalAPI();

    // 11. Bind Listeners & Start RAF Loop
    this.bind();
    this.animate();
  }

  /**
   * The Paradox Core:
   * Icosahedron deformed by simplex vertex noise & audio reactivity,
   * shaded with Fresnel edge glow and metallic specular highlights.
   */
  private createParadoxCore(THREE: any) {
    this.coreGroup = new THREE.Group();
    this.coreGroup.position.set(0, 0, 0);

    // Outer Shaded Shell
    const coreGeo = new THREE.IcosahedronGeometry(22, 5);
    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: CoreVert,
      fragmentShader: CoreFrag,
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uDisplacement: { value: 0.18 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uMouseRadius: { value: 25.0 },
        uMouseStrength: { value: 4.5 },
        uHealth: { value: 0.96 },
        uColor: { value: new THREE.Color(0x0B0E11) },
        uRimColor: { value: new THREE.Color(0x6D5CFF) },
        uHealthColor: { value: new THREE.Color(0x59FF9A) },
        uRoughness: { value: 0.2 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMaterial);
    this.coreGroup.add(this.coreMesh);

    // Inner Signal Nucleus
    const innerGeo = new THREE.OctahedronGeometry(12, 3);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    this.coreInnerNucleus = new THREE.Mesh(innerGeo, innerMat);
    this.coreGroup.add(this.coreInnerNucleus);

    // Orbiting Rings
    const ring1Geo = new THREE.TorusGeometry(32, 0.25, 8, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x6D5CFF,
      transparent: true,
      opacity: 0.4
    });
    this.coreOrbitRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    this.coreOrbitRing1.rotation.x = Math.PI / 3.2;
    this.coreOrbitRing1.rotation.y = Math.PI / 6.0;
    this.coreGroup.add(this.coreOrbitRing1);

    const ring2Geo = new THREE.TorusGeometry(38, 0.25, 8, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.3
    });
    this.coreOrbitRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    this.coreOrbitRing2.rotation.x = -Math.PI / 4.0;
    this.coreOrbitRing2.rotation.z = Math.PI / 5.0;
    this.coreGroup.add(this.coreOrbitRing2);

    this.scene.add(this.coreGroup);
  }

  /**
   * Shaded Particle Constellation
   */
  private createParticles(THREE: any, count: number) {
    this.particleCount = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const cBrand = new THREE.Color(0x6D5CFF);
    const cCyan = new THREE.Color(0x00E5FF);
    const cEmerald = new THREE.Color(0x59FF9A);
    const cWhite = new THREE.Color(0xF5F7FA);

    const spreadX = 260;
    const spreadY = 160;
    const spreadZ = 120;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * spreadX;
      positions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      positions[i3 + 2] = (Math.random() - 0.5) * spreadZ;

      velocities[i3 + 0] = (Math.random() - 0.5) * 0.4;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.4;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.4;

      const pick = Math.random();
      const col = pick > 0.65 ? cBrand : pick > 0.35 ? cCyan : pick > 0.15 ? cEmerald : cWhite;
      colors[i3 + 0] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      scales[i] = Math.random() * 0.8 + 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.particlesMaterial = new THREE.ShaderMaterial({
      vertexShader: ParticlesVert,
      fragmentShader: ParticlesFrag,
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uBaseSize: { value: 2.2 },
        uShockwaveOrigin: { value: this.shockwaveOrigin },
        uShockwaveProgress: { value: 0.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, this.particlesMaterial);
    this.scene.add(this.particles);
  }

  private registerGlobalAPI() {
    window.paradoxWebGL = {
      isReady: true,
      setMode: (mode: WebGLSceneMode) => {
        this.activeMode = mode;
        if (mode === 'core') this.targetCoreScale = 1.0;
        else if (mode === 'network') this.targetCoreScale = 0.65;
        else if (mode === 'tunnel') this.targetCoreScale = 0.35;
        else this.targetCoreScale = 0.8;
      },
      triggerImpulse: (screenX?: number, screenY?: number) => {
        if (screenX !== undefined && screenY !== undefined) {
          const ndcX = (screenX / window.innerWidth) * 2 - 1;
          const ndcY = -(screenY / window.innerHeight) * 2 + 1;
          this.shockwaveOrigin.set(ndcX * 40, ndcY * 25, 0);
        } else {
          this.shockwaveOrigin.set(0, 0, 0);
        }
        this.shockwaveProgress = 0.01;
      },
      getTelemetry: () => {
        const budget = this.governor.getBudget();
        return {
          rx: (this.manualRotation.x * (180 / Math.PI)).toFixed(1),
          ry: (this.manualRotation.y * (180 / Math.PI)).toFixed(1),
          fps: budget.fps,
          tier: budget.tier,
          dpr: budget.targetDpr.toFixed(2),
          particles: this.particleCount,
          mode: this.activeMode
        };
      }
    };
  }

  private bind() {
    window.addEventListener('resize', this.onResize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.mouse.targetX = (e.clientX / w) * 2 - 1;
      this.mouse.targetY = -(e.clientY / h) * 2 + 1;

      // Update world mouse coordinate for proximity shader deformation
      if (this.mouseWorld) {
        this.mouseWorld.set(this.mouse.targetX * 35, this.mouse.targetY * 20, 0);
      }

      if (this.isDragging) {
        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        this.angularVelocity.y = deltaX * 0.008;
        this.angularVelocity.x = deltaY * 0.008;

        this.manualRotation.y += this.angularVelocity.y;
        this.manualRotation.x += this.angularVelocity.x;
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.hero-3d-stage, #three-canvas')) {
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }

      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.shockwaveOrigin.set(ndcX * 40, ndcY * 25, 0);
      this.shockwaveProgress = 0.01;
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
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

    const delta = this.clock ? this.clock.getDelta() : 0.016;
    const elapsed = this.clock ? this.clock.getElapsedTime() : 0;

    // 1. Tick Performance Governor
    const budget = this.governor.tick();

    // 2. Fetch Audio Energy from SoundEngine
    const audioEnergy = sound.getAudioEnergy();

    // 3. Smooth Pointer LERP & Parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;
    this.cameraTimeline.setParallax(this.mouse.x, this.mouse.y);

    // 4. Drag Inertia with Friction Damping
    if (!this.isDragging) {
      this.angularVelocity.x *= 0.94;
      this.angularVelocity.y *= 0.94;
      this.manualRotation.x += this.angularVelocity.x;
      this.manualRotation.y += this.angularVelocity.y;
      if (!this.isReducedMotion) {
        this.manualRotation.y += 0.0035; // Ambient idle spin
      }
    }

    // 5. Evaluate Camera Trajectory across 11 Scroll Chapters
    const camState = this.cameraTimeline.evaluate(this.scrollProgress);
    this.camera.position.set(camState.position[0], camState.position[1], camState.position[2]);
    this.camera.lookAt(camState.target[0], camState.target[1], camState.target[2]);
    if (this.camera.fov !== camState.fov) {
      this.camera.fov = camState.fov;
      this.camera.updateProjectionMatrix();
    }

    // 6. Update Paradox Core Shader Uniforms & Rotation
    this.currentCoreScale += (this.targetCoreScale - this.currentCoreScale) * 0.06;
    if (this.coreGroup) {
      this.coreGroup.rotation.x = this.manualRotation.x + this.mouse.y * 0.05;
      this.coreGroup.rotation.y = this.manualRotation.y + this.mouse.x * 0.05;
      this.coreGroup.scale.setScalar(this.currentCoreScale);

      if (this.coreMaterial && this.coreMaterial.uniforms) {
        this.coreMaterial.uniforms.uTime.value = elapsed;
        this.coreMaterial.uniforms.uAudio.value = audioEnergy;
        this.coreMaterial.uniforms.uMouse.value.copy(this.mouseWorld);
      }

      if (this.coreOrbitRing1) this.coreOrbitRing1.rotation.z = elapsed * 0.8;
      if (this.coreOrbitRing2) this.coreOrbitRing2.rotation.y = -elapsed * 0.6;
      if (this.coreInnerNucleus) {
        this.coreInnerNucleus.rotation.x = -elapsed * 0.45;
        this.coreInnerNucleus.rotation.y = elapsed * 0.7;
      }
    }

    // 7. Update Particle Shockwave & Uniforms
    if (this.shockwaveProgress > 0) {
      this.shockwaveProgress += delta * 1.2;
      if (this.shockwaveProgress > 1.0) this.shockwaveProgress = 0;
    }

    if (this.particlesMaterial && this.particlesMaterial.uniforms) {
      this.particlesMaterial.uniforms.uTime.value = elapsed;
      this.particlesMaterial.uniforms.uAudio.value = audioEnergy;
      this.particlesMaterial.uniforms.uShockwaveProgress.value = this.shockwaveProgress;
    }

    // 8. Update Instanced Evidence Grid
    if (this.instanceManager) {
      this.instanceManager.update(elapsed, audioEnergy);
    }

    // 9. Master Render Pass through Explicit PostProcessing Pipeline
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
    this.envPipeline?.dispose();
    this.postProcessing?.dispose();
    this.renderer?.dispose();
    delete window.paradoxWebGL;
  }
}
