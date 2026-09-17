/**
 * PARADOX Momentum Smooth Scroll & Kinetic Skew Physics — Lando Norris Standard
 * Connects Studio Freight Lenis with GSAP ScrollTrigger, drives velocity skew and marquee racing.
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
      lerp: 0.09,
      smoothWheel: true,
      touchMultiplier: 1.2,
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

      // Lando Norris scroll velocity skew
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
    }

    // Dynamic Marquee Scroll Velocity Acceleration
    let marqueeTimeout: any;
    lenis.on('scroll', ({ velocity }: { velocity: number }) => {
      const marquees = document.querySelectorAll<HTMLElement>('.marquee-content');
      if (marquees.length > 0) {
        const factor = Math.min(6, 1 + Math.abs(velocity) * 0.08);
        const duration = (24 / factor).toFixed(1);
        marquees.forEach((m) => {
          m.style.animationDuration = `${duration}s`;
        });

        clearTimeout(marqueeTimeout);
        marqueeTimeout = setTimeout(() => {
          marquees.forEach((m) => {
            m.style.animationDuration = '24s';
          });
        }, 180);
      }
    });

    return lenis;
  }
}
