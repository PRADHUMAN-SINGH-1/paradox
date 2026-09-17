/**
 * PARADOX Inverted Difference Cursor — Lusion.co & Lando Norris Production Standard
 * High-performance 120fps hardware-accelerated difference cursor using GSAP quickSetter.
 */

declare global {
  interface Window {
    gsap?: any;
  }
}

export class PrecisionCursor {
  private blob: HTMLElement | null = null;
  private animId = 0;
  private isFinePointer = false;

  private mouseX = -200;
  private mouseY = -200;
  private currentX = -200;
  private currentY = -200;

  constructor() {
    this.isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    if (!this.isFinePointer) return;

    this.mount();
    this.bind();
    this.loop();
  }

  private mount() {
    let blob = document.getElementById('cursor-blob');
    if (!blob) {
      blob = document.createElement('div');
      blob.id = 'cursor-blob';
      document.body.appendChild(blob);
    }
    this.blob = blob;
    document.documentElement.classList.add('has-custom-cursor');
  }

  private bind() {
    window.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerdown', () => {
      this.blob?.classList.add('is-clicking');
    });

    window.addEventListener('pointerup', () => {
      this.blob?.classList.remove('is-clicking');
    });

    document.addEventListener('pointerleave', () => {
      this.blob?.classList.add('is-hidden');
    });

    document.addEventListener('pointerenter', () => {
      this.blob?.classList.remove('is-hidden');
    });

    // Delegated hover observer for interactive elements
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor], .card-interactive, .agent-card, .foundation-card, .tool-brutalist-card, input');
      if (target && this.blob) {
        this.blob.classList.add('is-hovered');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor], .card-interactive, .agent-card, .foundation-card, .tool-brutalist-card, input');
      if (target && this.blob) {
        this.blob.classList.remove('is-hovered');
      }
    });
  }

  private loop = () => {
    // Smooth LERP (linear interpolation)
    const factor = 0.22;
    this.currentX += (this.mouseX - this.currentX) * factor;
    this.currentY += (this.mouseY - this.currentY) * factor;

    if (this.blob) {
      this.blob.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0)`;
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.blob?.remove();
    document.documentElement.classList.remove('has-custom-cursor');
  }
}
