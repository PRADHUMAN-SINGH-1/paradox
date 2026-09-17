/**
 * PARADOX Interactive Liquid Cursor & Chromatic Trail — Inspired by lusion.co
 * Renders high-performance fluid disturbance and kinetic energy rings around cursor.
 */

export class FluidCursorCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId = 0;
  private isVisible = true;

  private lastX = -999;
  private lastY = -999;

  // Trail of kinetic fluid drops
  private drops: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    color: string;
  }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    this.resize();
    this.bind();
    this.start();
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.scale(dpr, dpr);
  };

  private bind() {
    window.addEventListener('resize', this.resize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.lastX = e.clientX;
      this.lastY = e.clientY;

      // Spawn fluid energy ripples when moving fast
      if (dist > 6 && this.drops.length < 35) {
        this.drops.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: Math.min(32, dist * 0.45 + 4),
          maxRadius: Math.min(64, dist * 0.9 + 18),
          alpha: 0.35,
          color: Math.random() > 0.3 ? '200, 255, 0' : '255, 255, 255'
        });
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      // High-velocity shock ring on click
      for (let i = 0; i < 3; i++) {
        this.drops.push({
          x: e.clientX,
          y: e.clientY,
          vx: 0,
          vy: 0,
          radius: 8 + i * 12,
          maxRadius: 110 + i * 35,
          alpha: 0.65 - i * 0.15,
          color: '200, 255, 0'
        });
      }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible && !this.animId) this.start();
    });
  }

  private start() {
    const loop = () => {
      if (!this.isVisible) {
        this.animId = 0;
        return;
      }
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  private render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // Draw & update expanding fluid ripples
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.x += d.vx;
      d.y += d.vy;
      d.radius += (d.maxRadius - d.radius) * 0.08;
      d.alpha *= 0.94;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${d.color}, ${d.alpha.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (d.alpha < 0.01 || d.radius >= d.maxRadius - 1) {
        this.drops.splice(i, 1);
      }
    }
  }

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
