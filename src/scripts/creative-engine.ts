/**
 * PARADOX Master Creative Engine — Lando Norris & Lusion Production Standard
 * Boots PrecisionCursor, Lenis Smooth Scroll, Kinetic Typography & Cyber HUD.
 */

import { PrecisionCursor } from './cursor.ts';
import { initSmoothScroll } from './scroll.ts';
import { initKineticText } from './kinetic-text.ts';
import { FluidCursorCanvas } from './webgl-distortion.ts';

declare global {
  interface Window {
    gsap?: any;
    ScrollTrigger?: any;
  }
}

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
      <div class="hud-status-badge">SECURE_RUN // 120 FPS</div>
    `;

    const stream = document.createElement('div');
    stream.className = 'hud-stream';

    const canvas = document.createElement('canvas');
    canvas.className = 'hud-waveform';
    canvas.width = 400;
    canvas.height = 44;

    container.appendChild(header);
    container.appendChild(canvas);
    container.appendChild(stream);

    const messages = [
      'OBS_EVIDENCE: SHA256 integrity validated [OK]',
      'SIG_ANALYSIS: ast_walker inspecting manifests (0 exploits)',
      'METRIC_FRESH: commit velocity nominal (>90d delta = 0)',
      'DEP_GRAPH: lockfile parity verified against public registry',
      'ZERO_EXEC: static sandbox boundary confirmed immutable',
      'PERF_TELEMETRY: render cycle completed in 0.8ms'
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

      while (stream.children.length > 5) {
        stream.removeChild(stream.children[0]);
      }
    }, 1600);

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
          const amp = Math.sin(x * 0.06 + phase) * Math.cos(x * 0.02 - phase * 0.5) * (h * 0.42);
          ctx.lineTo(x, mid + amp);
        }

        ctx.strokeStyle = '#e4f900';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        phase += 0.08;
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

let hasInitialized = false;

export function initCreativeEngine() {
  if (typeof window === 'undefined' || hasInitialized) return;
  hasInitialized = true;

  // 1. Mount Inverted Difference Cursor
  new PrecisionCursor();

  // 2. Initialize Lenis Smooth Scroll
  initSmoothScroll();

  // 3. Initialize Kinetic Typography with SplitType
  initKineticText();

  // 4. Fluid Canvas for mouse trail
  if (window.matchMedia('(pointer: fine)').matches) {
    const fluidCanvas = document.querySelector<HTMLCanvasElement>('#fluid-canvas');
    if (fluidCanvas) {
      try {
        new FluidCursorCanvas(fluidCanvas);
      } catch (err) {
        console.warn('Fluid canvas error:', err);
      }
    }
  }

  // 5. ScrollTrigger Section Reveals
  if (window.gsap && window.ScrollTrigger) {
    document.querySelectorAll<HTMLElement>('.section-brutalist').forEach((sec) => {
      window.gsap.fromTo(sec,
        { opacity: 0.2, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 88%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }
}

// Ensure execution after CDN libraries are loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    initCreativeEngine();
  } else {
    window.addEventListener('load', () => initCreativeEngine());
  }
}
