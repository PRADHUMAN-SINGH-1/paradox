/**
 * PARADOX Creative Engine — Awwwards-Tier Interactive Systems
 * 
 * 1. NeuralCanvas: High-performance 60fps Float32Array particle graph with cursor repulsion & click shockwaves.
 * 2. SpotlightGrid: Specular border and radial glass illumination tracking cursor position (--mouse-x, --mouse-y).
 * 3. MagneticButton: LERP spring-physics tactile attraction for primary CTAs.
 * 4. CyberHUD: Real-time ASCII telemetry streams and dynamic frequency audio/scan waveforms.
 */

// ============================================================================
// 1. NEURAL CANVAS 2D PHYSICS ENGINE (Zero-GC, 60fps)
// ============================================================================
export class NeuralCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number = 0;
  private isVisible: boolean = true;
  private count: number = 65;

  // Float32Arrays for zero memory allocation in the render loop
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private radius: Float32Array;
  private baseAlpha: Float32Array;
  private colors: string[];

  // Mouse & Shockwave physics state
  private mouse = { x: -9999, y: -9999, vx: 0, vy: 0, lastX: 0, lastY: 0 };
  private shockwaves: Array<{ x: number; y: number; radius: number; maxRadius: number; strength: number }> = [];
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    // Adjust particle count based on screen width for optimal performance
    const w = window.innerWidth;
    this.count = w < 768 ? 36 : w < 1200 ? 55 : 75;

    this.x = new Float32Array(this.count);
    this.y = new Float32Array(this.count);
    this.vx = new Float32Array(this.count);
    this.vy = new Float32Array(this.count);
    this.radius = new Float32Array(this.count);
    this.baseAlpha = new Float32Array(this.count);
    this.colors = [];

    this.initParticles();
    this.bindEvents();
    this.resize();
    this.start();
  }

  private initParticles() {
    const palette = [
      'rgba(99, 102, 241, ', // Indigo
      'rgba(0, 229, 255, ',  // Cyan
      'rgba(16, 185, 129, ', // Emerald
      'rgba(255, 255, 255, '  // Pure white spark
    ];

    for (let i = 0; i < this.count; i++) {
      this.x[i] = Math.random() * (window.innerWidth || 1000);
      this.y[i] = Math.random() * (window.innerHeight || 800);
      this.vx[i] = (Math.random() - 0.5) * 0.45;
      this.vy[i] = (Math.random() - 0.5) * 0.45;
      this.radius[i] = Math.random() * 1.8 + 1.0;
      this.baseAlpha[i] = Math.random() * 0.5 + 0.25;
      this.colors.push(palette[Math.floor(Math.random() * palette.length)]);
    }
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });

    window.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;
      this.mouse.vx = (newX - this.mouse.x) * 0.2;
      this.mouse.vy = (newY - this.mouse.y) * 0.2;
      this.mouse.x = newX;
      this.mouse.y = newY;
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });

    window.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
        this.shockwaves.push({
          x: clickX,
          y: clickY,
          radius: 0,
          maxRadius: Math.max(rect.width, rect.height) * 0.45,
          strength: 1.0
        });
      }
    }, { passive: true });

    // Intersection observer to pause render loop when out of viewport
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this.isVisible = entry.isIntersecting && !document.hidden;
        if (this.isVisible && !this.animId) {
          this.start();
        }
      }
    }, { threshold: 0.05 });
    observer.observe(this.canvas);

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible && !this.animId) {
        this.start();
      }
    });
  }

  public resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.parentElement?.getBoundingClientRect() || this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  private start() {
    const loop = () => {
      if (!this.isVisible) {
        this.animId = 0;
        return;
      }
      this.updateAndRender();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  private updateAndRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const count = this.count;
    const mx = this.mouse.x;
    const my = this.mouse.y;

    ctx.clearRect(0, 0, w, h);

    // Update Shockwaves
    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      sw.radius += 6.5;
      sw.strength *= 0.96;

      // Draw subtle tactical shockwave ripple
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${sw.strength * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (sw.radius > sw.maxRadius || sw.strength < 0.02) {
        this.shockwaves.splice(s, 1);
      }
    }

    // Update & draw particles
    const maxConnectDist = w < 768 ? 85 : 120;
    const maxConnectDistSq = maxConnectDist * maxConnectDist;
    const mouseRadius = 140;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    for (let i = 0; i < count; i++) {
      let px = this.x[i];
      let py = this.y[i];
      let pvx = this.vx[i];
      let pvy = this.vy[i];

      // Euler physics integration
      px += pvx;
      py += pvy;

      // Boundary bouncing
      if (px < 0) { px = 0; pvx = -pvx; }
      else if (px > w) { px = w; pvx = -pvx; }
      if (py < 0) { py = 0; pvy = -pvy; }
      else if (py > h) { py = h; pvy = -pvy; }

      // Mouse repulsion vector
      const dxm = px - mx;
      const dym = py - my;
      const distSqM = dxm * dxm + dym * dym;
      if (distSqM < mouseRadiusSq && distSqM > 1) {
        const dist = Math.sqrt(distSqM);
        const factor = (1 - dist / mouseRadius) * 0.8;
        pvx += (dxm / dist) * factor;
        pvy += (dym / dist) * factor;
      }

      // Shockwave deflection
      for (let s = 0; s < this.shockwaves.length; s++) {
        const sw = this.shockwaves[s];
        const dxs = px - sw.x;
        const dys = py - sw.y;
        const distS = Math.sqrt(dxs * dxs + dys * dys);
        const diff = Math.abs(distS - sw.radius);
        if (diff < 35 && distS > 1) {
          const push = (1 - diff / 35) * sw.strength * 2.5;
          pvx += (dxs / distS) * push;
          pvy += (dys / distS) * push;
        }
      }

      // Friction / Terminal velocity damping
      pvx *= 0.985;
      pvy *= 0.985;

      this.x[i] = px;
      this.y[i] = py;
      this.vx[i] = pvx;
      this.vy[i] = pvy;

      // Draw particle dot
      ctx.beginPath();
      ctx.arc(px, py, this.radius[i], 0, Math.PI * 2);
      ctx.fillStyle = `${this.colors[i]}${this.baseAlpha[i]})`;
      ctx.fill();

      // Constellation / Synaptic connections
      for (let j = i + 1; j < count; j++) {
        const dx = px - this.x[j];
        const dy = py - this.y[j];
        const distSq = dx * dx + dy * dy;

        if (distSq < maxConnectDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / maxConnectDist) * 0.22;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(this.x[j], this.y[j]);
          ctx.strokeStyle = `rgba(130, 150, 240, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

// ============================================================================
// 2. SPOTLIGHT GRID (Radial Cursor Tracking & Specular Glass Glow)
// ============================================================================
export class SpotlightGrid {
  private cards: HTMLElement[] = [];
  private ticking: boolean = false;
  private lastX: number = -9999;
  private lastY: number = -9999;

  constructor() {
    this.refreshCards();
    this.bind();
  }

  public refreshCards() {
    this.cards = Array.from(document.querySelectorAll<HTMLElement>('.card-glass, .spotlight-card, .bento-cell, .feature-card, .agent-card'));
  }

  private bind() {
    window.addEventListener('pointermove', (e) => {
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      if (!this.ticking) {
        this.ticking = true;
        requestAnimationFrame(() => this.update());
      }
    }, { passive: true });

    // Handle scroll to keep spotlight aligned
    window.addEventListener('scroll', () => {
      if (!this.ticking && this.lastX !== -9999) {
        this.ticking = true;
        requestAnimationFrame(() => this.update());
      }
    }, { passive: true });
  }

  private update() {
    const x = this.lastX;
    const y = this.lastY;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const rect = card.getBoundingClientRect();

      // Only update cards that are within 350px of the cursor for performance
      if (
        x >= rect.left - 250 &&
        x <= rect.right + 250 &&
        y >= rect.top - 250 &&
        y <= rect.bottom + 250
      ) {
        const mouseX = Math.round(x - rect.left);
        const mouseY = Math.round(y - rect.top);
        card.style.setProperty('--mouse-x', `${mouseX}px`);
        card.style.setProperty('--mouse-y', `${mouseY}px`);
        card.classList.add('is-illuminated');
      } else if (card.classList.contains('is-illuminated')) {
        card.classList.remove('is-illuminated');
      }
    }

    this.ticking = false;
  }
}

// ============================================================================
// 3. MAGNETIC BUTTONS (Tactile LERP Hooke's Law Physics)
// ============================================================================
export class MagneticButton {
  private el: HTMLElement;
  private boundRect: DOMRect | null = null;
  private currX: number = 0;
  private currY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private animId: number = 0;
  private isHovered: boolean = false;
  private strength: number = 0.35;

  constructor(el: HTMLElement) {
    this.el = el;
    this.bind();
  }

  private bind() {
    this.el.addEventListener('pointerenter', () => {
      this.isHovered = true;
      this.boundRect = this.el.getBoundingClientRect();
      this.startLoop();
    }, { passive: true });

    this.el.addEventListener('pointermove', (e) => {
      if (!this.boundRect) this.boundRect = this.el.getBoundingClientRect();
      const centerX = this.boundRect.left + this.boundRect.width / 2;
      const centerY = this.boundRect.top + this.boundRect.height / 2;
      this.targetX = (e.clientX - centerX) * this.strength;
      this.targetY = (e.clientY - centerY) * this.strength;
    }, { passive: true });

    this.el.addEventListener('pointerleave', () => {
      this.isHovered = false;
      this.targetX = 0;
      this.targetY = 0;
    }, { passive: true });
  }

  private startLoop() {
    if (this.animId) return;

    const tick = () => {
      // Linear Interpolation (LERP) spring equation
      this.currX += (this.targetX - this.currX) * 0.14;
      this.currY += (this.targetY - this.currY) * 0.14;

      this.el.style.transform = `translate3d(${this.currX.toFixed(2)}px, ${this.currY.toFixed(2)}px, 0)`;

      // Continue animating until nearly at rest
      if (this.isHovered || Math.abs(this.currX) > 0.05 || Math.abs(this.currY) > 0.05) {
        this.animId = requestAnimationFrame(tick);
      } else {
        this.el.style.transform = 'translate3d(0, 0, 0)';
        this.animId = 0;
      }
    };

    this.animId = requestAnimationFrame(tick);
  }
}

// ============================================================================
// 4. CYBER HUD & LIVE TELEMETRY CONSOLE
// ============================================================================
export class CyberHUD {
  public static createLiveStream(container: HTMLElement, label = 'SYSTEM TELEMETRY'): () => void {
    container.classList.add('hud-container');

    const header = document.createElement('div');
    header.className = 'hud-header';
    header.innerHTML = `
      <div class="hud-title">
        <span class="dot-pulse"></span>
        <span>[ ${label} ]</span>
      </div>
      <div class="hud-status-badge">SECURE_RUN // 60 FPS</div>
    `;

    const stream = document.createElement('div');
    stream.className = 'hud-stream';

    const canvas = document.createElement('canvas');
    canvas.className = 'hud-waveform';
    canvas.width = 300;
    canvas.height = 36;

    container.appendChild(header);
    container.appendChild(canvas);
    container.appendChild(stream);

    // Telemetry items pool
    const messages = [
      'OBS_EVIDENCE: SHA256 integrity validated [OK]',
      'SIG_ANALYSIS: ast_walker inspecting manifests (0 exploits)',
      'METRIC_FRESH: commit velocity nominal (>90d delta = 0)',
      'DEP_GRAPH: lockfile parity verified against public registry',
      'ZERO_EXEC: static sandbox boundary confirmed immutable',
      'PERF_TELEMETRY: render cycle completed in 1.2ms'
    ];

    let msgIndex = 0;
    const interval = setInterval(() => {
      if (!document.body.contains(container)) {
        clearInterval(interval);
        return;
      }
      const line = document.createElement('div');
      line.className = 'hud-line';
      const time = new Date().toISOString().split('T')[1].slice(0, 8);
      const blocks = '█▓▒░'[Math.floor(Math.random() * 4)];
      line.innerHTML = `<span class="hud-time">${time}</span> <span class="hud-glyph">${blocks}</span> <span class="hud-msg">${messages[msgIndex % messages.length]}</span>`;
      stream.appendChild(line);
      msgIndex++;

      // Keep maximum 4 lines
      while (stream.children.length > 4) {
        stream.removeChild(stream.children[0]);
      }
    }, 1800);

    // Waveform simulation
    const ctx = canvas.getContext('2d');
    let waveAnim = 0;
    let phase = 0;

    const renderWave = () => {
      if (!document.body.contains(canvas)) {
        cancelAnimationFrame(waveAnim);
        return;
      }
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        const w = canvas.width;
        const h = canvas.height;
        const mid = h / 2;

        for (let x = 0; x < w; x += 3) {
          const amp = Math.sin(x * 0.08 + phase) * Math.cos(x * 0.03 - phase * 0.7) * (h * 0.38);
          ctx.lineTo(x, mid + amp);
        }

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        phase += 0.07;
      }
      waveAnim = requestAnimationFrame(renderWave);
    };
    waveAnim = requestAnimationFrame(renderWave);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(waveAnim);
    };
  }
}

// ============================================================================
// INITIALIZATION RUNNER
// ============================================================================
export function initCreativeEngine() {
  // 1. Mount Neural Canvas if canvas element exists
  const heroCanvas = document.querySelector<HTMLCanvasElement>('#neural-canvas');
  if (heroCanvas) {
    try {
      new NeuralCanvas(heroCanvas);
    } catch (err) {
      console.warn('NeuralCanvas init bypassed:', err);
    }
  }

  // 2. Initialize Spotlight Grid
  const spotlight = new SpotlightGrid();

  // 3. Initialize Magnetic Buttons
  document.querySelectorAll<HTMLElement>('.btn-magnetic, .btn-primary, .btn-emerald').forEach((btn) => {
    if (!btn.dataset.magneticInit) {
      btn.dataset.magneticInit = 'true';
      new MagneticButton(btn);
    }
  });

  return { spotlight };
}

// Self-initialize on DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCreativeEngine());
  } else {
    initCreativeEngine();
  }
}
