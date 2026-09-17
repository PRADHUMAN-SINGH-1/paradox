/**
 * PARADOX Momentum Smooth Scroll & Kinetic Skew Physics — Lando Norris Standard
 * Connects Studio Freight Lenis with GSAP ScrollTrigger and drives velocity skew.
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

  if (window.Lenis) {
    const lenis = new window.Lenis({
      lerp: 0.1,
      smoothWheel: true,
      touchMultiplier: 1.25,
      infinite: false
    });
    window.lenisInstance = lenis;

    // Sync with GSAP ScrollTrigger
    if (window.ScrollTrigger && window.gsap) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      lenis.on('scroll', window.ScrollTrigger.update);

      window.gsap.ticker.add((time: number) => {
        lenis.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);

      // Lando Norris exact scroll velocity skew technique
      window.ScrollTrigger.create({
        onUpdate: (self: any) => {
          const velocity = self.getVelocity() / 1000;
          const clamped = Math.max(-5, Math.min(5, velocity * 0.35));
          window.gsap.to('.skewable', {
            skewY: clamped,
            duration: 0.6,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        }
      });
    } else {
      const raf = (time: number) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      // Fallback velocity skew
      let skewTimer: any;
      lenis.on('scroll', ({ velocity }: { velocity: number }) => {
        const clamped = Math.max(-5, Math.min(5, velocity * 0.08));
        const skewEls = document.querySelectorAll<HTMLElement>('.skewable');
        skewEls.forEach((el) => {
          el.style.transform = `skewY(${clamped.toFixed(2)}deg)`;
        });
        clearTimeout(skewTimer);
        skewTimer = setTimeout(() => {
          skewEls.forEach((el) => {
            el.style.transform = 'skewY(0deg)';
            el.style.transition = 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)';
          });
        }, 120);
      });
    }

    return lenis;
  }
}
