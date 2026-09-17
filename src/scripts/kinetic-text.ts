/**
 * PARADOX Kinetic Typography Engine — Inspired by landonorris.com & lusion.co
 * Character & word level slam reveals with physical 3D rotation and clip masks.
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

  // Use SplitType if available
  if (window.SplitType && window.gsap) {
    targets.forEach((target) => {
      try {
        const text = new window.SplitType(target, { types: 'lines,words,chars' });
        
        // Ensure lines are masked cleanly
        if (text.lines) {
          text.lines.forEach((line: HTMLElement) => {
            line.style.overflow = 'clip';
            line.style.display = 'block';
          });
        }

        if (text.chars) {
          window.gsap.set(text.chars, { 
            display: 'inline-block',
            transformOrigin: '0% 50% -50',
            willChange: 'transform, opacity'
          });

          const isHero = target.hasAttribute('data-hero-kinetic');
          
          if (isHero) {
            // Immediate high-impact entrance for hero
            window.gsap.fromTo(text.chars, 
              { y: '120%', opacity: 0, rotateX: -70 },
              {
                y: '0%',
                opacity: 1,
                rotateX: 0,
                duration: 0.9,
                stagger: 0.02,
                ease: 'power4.out',
                delay: 0.15
              }
            );
          } else if (window.ScrollTrigger) {
            // Scroll-triggered slam reveal
            window.gsap.fromTo(text.chars,
              { y: '110%', opacity: 0, rotateX: -60 },
              {
                y: '0%',
                opacity: 1,
                rotateX: 0,
                duration: 0.8,
                stagger: 0.015,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: target,
                  start: 'top 88%',
                  toggleActions: 'play none none none'
                }
              }
            );
          }
        }
      } catch (err) {
        console.warn('Kinetic text init error:', err);
      }
    });
  } else {
    // Pure CSS/DOM fallback: split words manually if CDN fails
    targets.forEach((el) => {
      el.classList.add('kinetic-revealed');
    });
  }
}
