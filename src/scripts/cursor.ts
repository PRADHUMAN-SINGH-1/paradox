/**
 * PARADOX 2.0 Inverted Difference Pill Cursor & Specular 3D Physics Engine
 * Production tier specified by the Immersive Transition Report:
 *  - Context-sensitive difference pill cursor with dynamic text labels
 *  - 3D perspective card tilt with spring return
 *  - Magnetic micro-physics on interactive buttons
 */

declare global {
  interface Window {
    gsap?: any;
  }
}

/**
 * 3D Perspective Card Tilt & Specular Spotlight Engine
 */
export function initSpotlightCards() {
  if (typeof window === 'undefined') return;

  const cards = document.querySelectorAll<HTMLElement>('.spotlight-card, .agent-card, .tool-brutalist-card, .horizontal-card');

  cards.forEach((card) => {
    card.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update specular border illumination CSS variables
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      // 3D Perspective Tilt Physics
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = -((y - centerY) / centerY) * 6.5;
      const rotateY = ((x - centerX) / centerX) * 6.5;

      card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
    }, { passive: true });

    card.addEventListener('pointerleave', () => {
      // Smooth spring reset
      card.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      setTimeout(() => {
        card.style.transition = '';
      }, 450);
    }, { passive: true });
  });

  // Magnetic Button Physics
  const magneticButtons = document.querySelectorAll<HTMLElement>('.btn, .sound-toggle-btn');
  magneticButtons.forEach((btn) => {
    btn.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = btn.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.28;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.28;
      btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    }, { passive: true });

    btn.addEventListener('pointerleave', () => {
      btn.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      btn.style.transform = 'translate3d(0, 0, 0)';
      setTimeout(() => {
        btn.style.transition = '';
      }, 350);
    }, { passive: true });
  });
}

/**
 * Desktop-Only Context-Sensitive Difference Pill Cursor
 */
export class PrecisionCursor {
  private blob: HTMLElement | null = null;
  private label: HTMLElement | null = null;
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

    let label = document.getElementById('cursor-label');
    if (!label) {
      label = document.createElement('span');
      label.id = 'cursor-label';
      label.className = 'cursor-label';
      blob.appendChild(label);
    }

    this.blob = blob;
    this.label = label;
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

    // Delegated hover observer for context labels
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement)?.closest('[data-cursor], a, button, input, .card-interactive, .spotlight-card, .hero-3d-stage');
      if (target && this.blob) {
        const cursorText = target.getAttribute('data-cursor');
        if (cursorText && this.label) {
          this.label.textContent = cursorText;
          this.blob.classList.add('has-label');
        } else {
          if (this.label) this.label.textContent = '';
          this.blob.classList.remove('has-label');
        }
        this.blob.classList.add('is-hovered');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = (e.target as HTMLElement)?.closest('[data-cursor], a, button, input, .card-interactive, .spotlight-card, .hero-3d-stage');
      if (target && this.blob) {
        this.blob.classList.remove('is-hovered');
        this.blob.classList.remove('has-label');
        if (this.label) this.label.textContent = '';
      }
    });
  }

  private loop = () => {
    // Smooth LERP (linear interpolation at 120fps)
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

