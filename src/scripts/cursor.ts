/**
 * PARADOX Morphing Precision Cursor — Inspired by landonorris.com & lusion.co
 * Two-tier LERP physics (dot + trailing reactive ring with contextual morph states)
 */

export class PrecisionCursor {
  private dot: HTMLElement | null = null;
  private ring: HTMLElement | null = null;
  private ringText: HTMLElement | null = null;

  private mouseX = -100;
  private mouseY = -100;
  private ringX = -100;
  private ringY = -100;
  private animId = 0;
  private isFinePointer = false;

  constructor() {
    this.isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!this.isFinePointer) return;

    this.mount();
    this.bind();
    this.loop();
  }

  private mount() {
    // Avoid double mounting
    if (document.getElementById('cursor-dot')) return;

    const dot = document.createElement('div');
    dot.id = 'cursor-dot';
    dot.className = 'cursor-dot';

    const ring = document.createElement('div');
    ring.id = 'cursor-ring';
    ring.className = 'cursor-ring';

    const ringText = document.createElement('span');
    ringText.className = 'cursor-ring-text';
    ring.appendChild(ringText);

    document.body.appendChild(dot);
    document.body.appendChild(ring);

    this.dot = dot;
    this.ring = ring;
    this.ringText = ringText;

    document.documentElement.classList.add('has-custom-cursor');
  }

  private bind() {
    window.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.dot) {
        this.dot.style.transform = `translate3d(${this.mouseX}px, ${this.mouseY}px, 0)`;
      }
    }, { passive: true });

    window.addEventListener('pointerdown', () => {
      this.ring?.classList.add('is-clicking');
    });

    window.addEventListener('pointerup', () => {
      this.ring?.classList.remove('is-clicking');
    });

    document.addEventListener('pointerleave', () => {
      this.dot?.classList.add('is-hidden');
      this.ring?.classList.add('is-hidden');
    });

    document.addEventListener('pointerenter', () => {
      this.dot?.classList.remove('is-hidden');
      this.ring?.classList.remove('is-hidden');
    });

    // Delegated hover observer for interactive elements
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor], .card-interactive, .agent-card, input');
      if (target && this.ring) {
        this.ring.classList.add('is-hovered');

        const customLabel = (target as HTMLElement).getAttribute('data-cursor');
        if (customLabel && this.ringText) {
          this.ringText.textContent = customLabel;
          this.ring.classList.add('has-label');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor], .card-interactive, .agent-card, input');
      if (target && this.ring) {
        this.ring.classList.remove('is-hovered', 'has-label');
        if (this.ringText) this.ringText.textContent = '';
      }
    });
  }

  private loop = () => {
    // Smooth LERP (linear interpolation) for ring
    const factor = 0.16;
    this.ringX += (this.mouseX - this.ringX) * factor;
    this.ringY += (this.mouseY - this.ringY) * factor;

    if (this.ring) {
      this.ring.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0)`;
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.dot?.remove();
    this.ring?.remove();
    document.documentElement.classList.remove('has-custom-cursor');
  }
}
