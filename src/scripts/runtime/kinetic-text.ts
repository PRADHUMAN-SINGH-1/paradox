/**
 * PARADOX Kinetic Typography Engine — Lando Norris (OFF+BRAND) Production Standard
 * Razor-sharp clip-path boundary slam reveals driven by SplitType & GSAP.
 */

declare global {
  interface Window {
    SplitType?: any;
    gsap?: any;
    ScrollTrigger?: any;
  }
}

export function initKineticText() {
  if (typeof window === 'undefined') return;

  const targets = document.querySelectorAll<HTMLElement>('[data-kinetic]');
  if (targets.length === 0) return;

  if (window.SplitType && window.gsap) {
    targets.forEach((target) => {
      try {
        const text = new window.SplitType(target, { types: 'lines,words,chars' });

        if (text.lines) {
          text.lines.forEach((line: HTMLElement) => {
            line.style.overflow = 'clip';
            line.style.display = 'block';
          });
        }

        const isHero = target.hasAttribute('data-hero-kinetic');
        const elementsToAnimate = text.lines && text.lines.length > 0 ? text.lines : text.words;

        if (isHero) {
          // Lando Norris hero slam wipe
          window.gsap.fromTo(elementsToAnimate,
            { clipPath: 'inset(100% 0 0 0)', y: 30, opacity: 0 },
            {
              clipPath: 'inset(0% 0 0 0)',
              y: 0,
              opacity: 1,
              duration: 1.0,
              stagger: 0.08,
              ease: 'power4.inOut',
              delay: 0.1
            }
          );
        } else if (window.ScrollTrigger) {
          // Scroll-triggered slam wipe
          window.gsap.fromTo(elementsToAnimate,
            { clipPath: 'inset(100% 0 0 0)', y: 24, opacity: 0 },
            {
              clipPath: 'inset(0% 0 0 0)',
              y: 0,
              opacity: 1,
              duration: 0.9,
              stagger: 0.06,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: target,
                start: 'top 85%',
                toggleActions: 'play none none none'
              }
            }
          );
        } else {
          window.gsap.to(elementsToAnimate, { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' });
        }
      } catch (err) {
        console.warn('Kinetic text error, fallback to visible:', err);
        target.style.opacity = '1';
      }
    });
  } else {
    // Fallback if CDN blocked
    targets.forEach((el) => {
      el.style.opacity = '1';
    });
  }
}
