/**
 * PARADOX Momentum Smooth Scroll & Kinetic Skew Physics
 * Integrates Lenis with GSAP ScrollTrigger ticker and maps scroll velocity to angular skew.
 */

declare global {
  interface Window {
    Lenis?: any;
    gsap?: any;
    ScrollTrigger?: any;
    lenisInstance?: any;
  }
}

export function initSmoothScroll() {
  if (typeof window === 'undefined') return;

  // If Lenis is loaded via CDN or bundle
  if (window.Lenis) {
    const lenis = new window.Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    window.lenisInstance = lenis;

    // Sync with GSAP ScrollTrigger if available
    if (window.ScrollTrigger && window.gsap) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      lenis.on('scroll', window.ScrollTrigger.update);

      window.gsap.ticker.add((time: number) => {
        lenis.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time: number) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }

    // Scroll Velocity Skew (Signature effect from landonorris.com)
    let skewTimeout: any;
    lenis.on('scroll', ({ velocity }: { velocity: number }) => {
      const clamped = Math.max(-8, Math.min(8, velocity * 0.08));
      const skewEls = document.querySelectorAll<HTMLElement>('.skewable');
      skewEls.forEach((el) => {
        el.style.transform = `skewY(${clamped.toFixed(2)}deg)`;
        el.style.transition = 'transform 80ms ease-out';
      });

      clearTimeout(skewTimeout);
      skewTimeout = setTimeout(() => {
        skewEls.forEach((el) => {
          el.style.transform = 'skewY(0deg)';
          el.style.transition = 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)';
        });
      }, 120);
    });

    return lenis;
  }
}
