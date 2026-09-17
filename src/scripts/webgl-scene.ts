/**
 * PARADOX Bespoke 3D WebGL Particle & Fluid Lattice — Inspired by lusion.co & landonorris.com
 * Powered by Three.js with pointer displacement physics, velocity-driven depth, and click shockwaves.
 */

declare global {
  interface Window {
    THREE?: any;
    lenisInstance?: any;
  }
}

export class ThreeWebGLScene {
  private canvas: HTMLCanvasElement;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private animId = 0;
  private isVisible = true;

  private particles: any = null;
  private positions: Float32Array | null = null;
  private originalPositions: Float32Array | null = null;
  private velocities: Float32Array | null = null;
  private count = 1200;

  private mouse = { x: -9999, y: -9999, targetX: -9999, targetY: -9999 };
  private scrollVelocity = 0;
  private shockwaves: Array<{ x: number; y: number; radius: number; maxRadius: number; strength: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    if (typeof window === 'undefined' || !window.THREE) return;

    try {
      this.init();
    } catch (e) {
      console.warn('ThreeWebGLScene initialization skipped:', e);
    }
  }

  private init() {
    const THREE = window.THREE;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, w / h, 1, 1000);
    this.camera.position.z = 320;

    // 3. Procedural Circular Glow Texture
    const particleTexture = this.createParticleTexture();

    // 4. Geometry & Attributes
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const originalPositions = new Float32Array(this.count * 3);
    const velocities = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    // Verified Palette: #d2ff00 (Neon Lime), #1a2ffb (Lusion Cobalt), #ffffff (White)
    const colorLime = new THREE.Color('#d2ff00');
    const colorCobalt = new THREE.Color('#1a2ffb');
    const colorWhite = new THREE.Color('#ffffff');

    const spreadX = 700;
    const spreadY = 480;
    const spreadZ = 300;

    for (let i = 0; i < this.count; i++) {
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

      // Color distribution: 60% Lime, 25% Cobalt, 15% White
      const pick = Math.random();
      const c = pick > 0.4 ? colorLime : pick > 0.15 ? colorCobalt : colorWhite;
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      sizes[i] = Math.random() * 4.5 + 2.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 5. Shader Material
    const material = new THREE.PointsMaterial({
      size: 4.5,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    this.positions = positions;
    this.originalPositions = originalPositions;
    this.velocities = velocities;

    // 6. Listeners & Loop
    this.bind();
    this.animate();
  }

  private createParticleTexture(): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  private bind() {
    window.addEventListener('resize', this.onResize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      // Normalized coordinates mapped to 3D plane at z=0
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.mouse.targetX = ((e.clientX / w) * 2 - 1) * 350;
      this.mouse.targetY = (-(e.clientY / h) * 2 + 1) * 240;
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const px = ((e.clientX / w) * 2 - 1) * 350;
      const py = (-(e.clientY / h) * 2 + 1) * 240;
      this.shockwaves.push({
        x: px,
        y: py,
        radius: 5,
        maxRadius: 280,
        strength: 24
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible && !this.animId) this.animate();
    });

    if (window.lenisInstance) {
      window.lenisInstance.on('scroll', ({ velocity }: { velocity: number }) => {
        this.scrollVelocity = velocity;
      });
    }
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

    // Smooth pointer LERP
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    if (this.positions && this.originalPositions && this.velocities && this.particles) {
      const pos = this.positions;
      const orig = this.originalPositions;
      const vel = this.velocities;
      const mx = this.mouse.x;
      const my = this.mouse.y;

      // Update shockwaves
      for (let s = this.shockwaves.length - 1; s >= 0; s--) {
        const sw = this.shockwaves[s];
        sw.radius += 8;
        sw.strength *= 0.94;
        if (sw.radius >= sw.maxRadius || sw.strength < 0.2) {
          this.shockwaves.splice(s, 1);
        }
      }

      for (let i = 0; i < this.count; i++) {
        const i3 = i * 3;
        const px = pos[i3];
        const py = pos[i3 + 1];
        const pz = pos[i3 + 2];

        // 1. Mouse Repulsion Force
        const dx = px - mx;
        const dy = py - my;
        const distSq = dx * dx + dy * dy;
        const maxDist = 140;

        if (distSq < maxDist * maxDist && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / maxDist) * 12;
          vel[i3] += (dx / dist) * force;
          vel[i3 + 1] += (dy / dist) * force;
        }

        // 2. Shockwave Force
        for (let s = 0; s < this.shockwaves.length; s++) {
          const sw = this.shockwaves[s];
          const sdx = px - sw.x;
          const sdy = py - sw.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          const diff = Math.abs(sdist - sw.radius);
          if (diff < 35 && sdist > 1) {
            const sforce = (1 - diff / 35) * sw.strength;
            vel[i3] += (sdx / sdist) * sforce;
            vel[i3 + 1] += (sdy / sdist) * sforce;
            vel[i3 + 2] += (Math.random() - 0.5) * sforce;
          }
        }

        // 3. Elastic Spring Back to Home Position
        const ox = orig[i3];
        const oy = orig[i3 + 1];
        const oz = orig[i3 + 2];

        vel[i3] += (ox - px) * 0.035;
        vel[i3 + 1] += (oy - py) * 0.035;
        vel[i3 + 2] += (oz - pz) * 0.035;

        // Friction damping
        vel[i3] *= 0.86;
        vel[i3 + 1] *= 0.86;
        vel[i3 + 2] *= 0.86;

        pos[i3] += vel[i3];
        pos[i3 + 1] += vel[i3 + 1];
        pos[i3 + 2] += vel[i3 + 2];
      }

      this.particles.geometry.attributes.position.needsUpdate = true;

      // Subtle slow rotation & scroll velocity camera pitch
      this.particles.rotation.y += 0.0006;
      this.particles.rotation.x = this.scrollVelocity * 0.0008;
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
  }
}
