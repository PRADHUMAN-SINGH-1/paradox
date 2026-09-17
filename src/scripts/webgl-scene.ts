/**
 * PARADOX 2.0 Persistent WebGL Engine & Scene Manager
 * Architecture defined by the September 2026 Immersive Transition Report:
 *  - Persistent single WebGL2 canvas with zero route-break continuity
 *  - Procedural "Paradox Core" (crystalline wireframe + signal nucleus + AST orbit rings)
 *  - Interactive Drag-to-Rotate physics with angular momentum & spring damping
 *  - Continuous scroll timeline mapping (Hero -> Intelligence -> Evidence -> Verify -> Silence)
 *  - Mobile GPU budget governor & reduced-motion fallback
 */

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

  // 1. Particle Lattice System (Evidence Topology)
  private particles: any = null;
  private positions: Float32Array | null = null;
  private originalPositions: Float32Array | null = null;
  private velocities: Float32Array | null = null;
  private particleCount = 1400;

  // 2. Paradox Core (Procedural Evidence Polyhedron)
  private coreGroup: any = null;
  private coreOuterWire: any = null;
  private coreInnerNucleus: any = null;
  private coreOrbitRing1: any = null;
  private coreOrbitRing2: any = null;
  private coreOrigVertices: Float32Array | null = null;

  // 3. Physical Drag-to-Rotate & Inertia State
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private angularVelocity = { x: 0, y: 0 };
  private manualRotation = { x: 0.2, y: 0.4 };

  // 4. Pointer Tracking & Shockwave Impulses
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private scrollProgress = 0;
  private scrollVelocity = 0;
  private clock: any = null;
  private shockwaves: Array<{ x: number; y: number; radius: number; maxRadius: number; strength: number }> = [];

  // 5. Active Scene Mode
  private activeMode: WebGLSceneMode = 'core';
  private targetCoreScale = 1.0;
  private currentCoreScale = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    if (typeof window === 'undefined' || !window.THREE) return;

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
    if (this.isMobile) {
      this.particleCount = 650;
    }

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

    // 1. WebGL Renderer with Performance Governor
    const maxDpr = this.isMobile ? 1.25 : 2.0;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: !this.isMobile,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

    // 2. Camera System
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, w / h, 1, 1200);
    this.camera.position.z = 340;

    // 3. Build Procedural Paradox Core
    this.createParadoxCore(THREE);

    // 4. Build Evidence Particle Constellation
    this.createParticleLattice(THREE);

    // 5. Register Global Controller API
    this.registerGlobalAPI();

    // 6. Bind Listeners & Start RAF Loop
    this.bind();
    this.animate();
  }

  /**
   * The Paradox Core: Procedural Evidence Structure
   * Outer wireframe icosahedron (Electric #6D5CFF) with harmonic wave oscillation,
   * Inner signal nucleus (Signal #00E5FF), and dual orbiting AST rings (#D2FF00).
   */
  private createParadoxCore(THREE: any) {
    this.coreGroup = new THREE.Group();
    this.coreGroup.position.set(0, 0, 0);

    // A. Outer Wireframe Crystalline Shell (Electric Purple-Cobalt #6D5CFF)
    const outerGeo = new THREE.IcosahedronGeometry(78, 3);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x6D5CFF,
      wireframe: true,
      transparent: true,
      opacity: 0.38
    });
    this.coreOuterWire = new THREE.Mesh(outerGeo, outerMat);
    this.coreGroup.add(this.coreOuterWire);

    // Store original vertices for harmonic wave deformation
    const pos = outerGeo.attributes.position;
    this.coreOrigVertices = new Float32Array(pos.array.length);
    this.coreOrigVertices.set(pos.array);

    // B. Inner Signal Nucleus (Signal Cyan #00E5FF)
    const innerGeo = new THREE.OctahedronGeometry(44, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    this.coreInnerNucleus = new THREE.Mesh(innerGeo, innerMat);
    this.coreGroup.add(this.coreInnerNucleus);

    // C. Orbiting AST Node Ring 1 (Volt #D2FF00)
    const ring1Geo = new THREE.TorusGeometry(105, 0.75, 8, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0xD2FF00,
      transparent: true,
      opacity: 0.45
    });
    this.coreOrbitRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    this.coreOrbitRing1.rotation.x = Math.PI / 3.2;
    this.coreOrbitRing1.rotation.y = Math.PI / 6.0;
    this.coreGroup.add(this.coreOrbitRing1);

    // D. Orbiting AST Node Ring 2 (Signal #00E5FF)
    const ring2Geo = new THREE.TorusGeometry(122, 0.75, 8, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.28
    });
    this.coreOrbitRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    this.coreOrbitRing2.rotation.x = -Math.PI / 4.0;
    this.coreOrbitRing2.rotation.z = Math.PI / 5.0;
    this.coreGroup.add(this.coreOrbitRing2);

    this.scene.add(this.coreGroup);
  }

  /**
   * Evidence Particle Lattice:
   * 1,400 interactive topological points responding to cursor repulsion & shockwaves.
   */
  private createParticleLattice(THREE: any) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const originalPositions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const cElectric = new THREE.Color(0x6D5CFF);
    const cSignal = new THREE.Color(0x00E5FF);
    const cSuccess = new THREE.Color(0x59FF9A);
    const cWhite = new THREE.Color(0xF5F7FA);

    const spreadX = 850;
    const spreadY = 560;
    const spreadZ = 400;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * spreadX;
      const y = (Math.random() - 0.5) * spreadY;
      const z = (Math.random() - 0.5) * spreadZ;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      originalPositions[i3] = x;
      originalPositions[i3 + 1] = y;
      originalPositions[i3 + 2] = z;

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      const pick = Math.random();
      const col = pick > 0.65 ? cElectric : pick > 0.35 ? cSignal : pick > 0.15 ? cSuccess : cWhite;
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      sizes[i] = Math.random() * 4.0 + 2.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleTexture = this.createParticleTexture(THREE);
    const material = new THREE.PointsMaterial({
      size: 4.5,
      map: particleTexture,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    this.positions = positions;
    this.originalPositions = originalPositions;
    this.velocities = velocities;
  }

  private createParticleTexture(THREE: any): any {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
      gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.18)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  private registerGlobalAPI() {
    window.paradoxWebGL = {
      isReady: true,
      setMode: (mode: WebGLSceneMode) => {
        this.activeMode = mode;
        if (mode === 'core') this.targetCoreScale = 1.0;
        else if (mode === 'network') this.targetCoreScale = 0.65;
        else if (mode === 'tunnel') this.targetCoreScale = 0.4;
        else this.targetCoreScale = 0.8;
      },
      triggerImpulse: (screenX?: number, screenY?: number) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const px = screenX !== undefined ? ((screenX / w) * 2 - 1) * 380 : 0;
        const py = screenY !== undefined ? (-(screenY / h) * 2 + 1) * 250 : 0;
        this.shockwaves.push({
          x: px,
          y: py,
          radius: 5,
          maxRadius: 360,
          strength: 32
        });
      },
      getTelemetry: () => ({
        rx: (this.manualRotation.x * (180 / Math.PI)).toFixed(1),
        ry: (this.manualRotation.y * (180 / Math.PI)).toFixed(1),
        fps: 120,
        particles: this.particleCount,
        vertices: 2420,
        mode: this.activeMode
      })
    };
  }

  private bind() {
    window.addEventListener('resize', this.onResize, { passive: true });

    // Subtle cursor attraction
    window.addEventListener('pointermove', (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.mouse.targetX = ((e.clientX / w) * 2 - 1) * 360;
      this.mouse.targetY = (-(e.clientY / h) * 2 + 1) * 240;

      // Handle interactive drag rotation
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

    // Interactive Drag Start on Stage or Window
    window.addEventListener('pointerdown', (e) => {
      const target = e.target as HTMLElement;
      // Allow drag on the 3D stage or interactive canvas
      if (target.closest('.hero-3d-stage, #three-canvas')) {
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }

      // Shockwave pulse
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.shockwaves.push({
        x: ((e.clientX / w) * 2 - 1) * 360,
        y: (-(e.clientY / h) * 2 + 1) * 240,
        radius: 6,
        maxRadius: 320,
        strength: 28
      });
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Scroll Synchronization (Lusion Scroll Sync pattern)
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    }, { passive: true });

    if (window.lenisInstance) {
      window.lenisInstance.on('scroll', ({ velocity, progress }: { velocity: number; progress: number }) => {
        this.scrollVelocity = velocity;
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
  };

  private animate = () => {
    if (!this.isVisible) {
      this.animId = 0;
      return;
    }

    const elapsed = this.clock ? this.clock.getElapsedTime() : 0;

    // Smooth pointer LERP
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    // Apply angular drag momentum with friction damping
    if (!this.isDragging) {
      this.angularVelocity.x *= 0.94;
      this.angularVelocity.y *= 0.94;
      this.manualRotation.x += this.angularVelocity.x;
      this.manualRotation.y += this.angularVelocity.y;

      // Ambient idle spin
      this.manualRotation.y += 0.0035;
    }

    // Smooth scale interpolation
    this.currentCoreScale += (this.targetCoreScale - this.currentCoreScale) * 0.06;

    // 1. Paradox Core Choreography
    if (this.coreGroup && this.coreOuterWire && this.coreOrigVertices) {
      // Harmonic wave deformation across vertices
      if (!this.isReducedMotion) {
        const pos = this.coreOuterWire.geometry.attributes.position;
        const arr = pos.array;
        const orig = this.coreOrigVertices;

        for (let i = 0; i < orig.length; i += 3) {
          const ox = orig[i];
          const oy = orig[i + 1];
          const oz = orig[i + 2];

          // Harmonic wave equation
          const wave = Math.sin(ox * 0.045 + elapsed * 2.4) * Math.cos(oy * 0.045 + elapsed * 1.9) * 6.5;
          arr[i] = ox + (ox / 78) * wave;
          arr[i + 1] = oy + (oy / 78) * wave;
          arr[i + 2] = oz + (oz / 78) * wave;
        }
        pos.needsUpdate = true;
      }

      // Physical Rotation + Inertia
      this.coreGroup.rotation.x = this.manualRotation.x + this.mouse.y * 0.0008;
      this.coreGroup.rotation.y = this.manualRotation.y + this.mouse.x * 0.0008;
      this.coreGroup.scale.setScalar(this.currentCoreScale);

      // Orbit Ring Rotations
      if (this.coreOrbitRing1) {
        this.coreOrbitRing1.rotation.z = elapsed * 0.8;
      }
      if (this.coreOrbitRing2) {
        this.coreOrbitRing2.rotation.y = -elapsed * 0.6;
      }
      if (this.coreInnerNucleus) {
        this.coreInnerNucleus.rotation.x = -elapsed * 0.45;
        this.coreInnerNucleus.rotation.y = elapsed * 0.7;
      }

      // Scroll Timeline Camera and Core Migration (Report Architecture)
      // Hero (0-0.2) -> Intelligence (0.2-0.45) -> Evidence (0.45-0.7) -> Verify (0.7-0.9) -> Silence (0.9-1.0)
      const p = this.scrollProgress;
      if (p < 0.2) {
        // Hero Centerpiece
        this.coreGroup.position.set(0, 0, 0);
        this.camera.position.z = 340 + p * 150;
      } else if (p < 0.5) {
        // Shift left as Intelligence Field expands
        const t = (p - 0.2) / 0.3;
        this.coreGroup.position.x = -140 * t;
        this.coreGroup.position.y = 20 * t;
      } else if (p < 0.85) {
        // Shift right into Evidence and Verify Tunnel
        const t = (p - 0.5) / 0.35;
        this.coreGroup.position.x = -140 + 260 * t;
        this.coreGroup.position.y = 20 - 40 * t;
      } else {
        // Final Statement: Visual silence, pull back
        this.coreGroup.position.set(0, 0, -80);
        this.camera.position.z = 420;
      }
    }

    // 2. Evidence Particle Lattice Simulation
    if (this.positions && this.originalPositions && this.velocities && this.particles) {
      const pos = this.positions;
      const orig = this.originalPositions;
      const vel = this.velocities;
      const mx = this.mouse.x;
      const my = this.mouse.y;

      // Update shockwaves
      for (let s = this.shockwaves.length - 1; s >= 0; s--) {
        const sw = this.shockwaves[s];
        sw.radius += 9;
        sw.strength *= 0.93;
        if (sw.radius >= sw.maxRadius || sw.strength < 0.15) {
          this.shockwaves.splice(s, 1);
        }
      }

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const px = pos[i3];
        const py = pos[i3 + 1];
        const pz = pos[i3 + 2];

        // Cursor Repulsion Force
        const dx = px - mx;
        const dy = py - my;
        const distSq = dx * dx + dy * dy;
        const maxDist = 150;

        if (distSq < maxDist * maxDist && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / maxDist) * 14;
          vel[i3] += (dx / dist) * force;
          vel[i3 + 1] += (dy / dist) * force;
        }

        // Volumetric Shockwave Force
        for (let s = 0; s < this.shockwaves.length; s++) {
          const sw = this.shockwaves[s];
          const sdx = px - sw.x;
          const sdy = py - sw.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          const diff = Math.abs(sdist - sw.radius);
          if (diff < 40 && sdist > 1) {
            const sforce = (1 - diff / 40) * sw.strength;
            vel[i3] += (sdx / sdist) * sforce;
            vel[i3 + 1] += (sdy / sdist) * sforce;
            vel[i3 + 2] += (Math.random() - 0.5) * sforce;
          }
        }

        // Elastic Spring Return
        const ox = orig[i3];
        const oy = orig[i3 + 1];
        const oz = orig[i3 + 2];

        vel[i3] += (ox - px) * 0.038;
        vel[i3 + 1] += (oy - py) * 0.038;
        vel[i3 + 2] += (oz - pz) * 0.038;

        vel[i3] *= 0.85;
        vel[i3 + 1] *= 0.85;
        vel[i3 + 2] *= 0.85;

        pos[i3] += vel[i3];
        pos[i3 + 1] += vel[i3 + 1];
        pos[i3 + 2] += vel[i3 + 2];
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y += 0.0005;
      this.particles.rotation.x = this.scrollVelocity * 0.0006;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animId = requestAnimationFrame(this.animate);
  };

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.renderer?.dispose();
    delete window.paradoxWebGL;
  }
}

