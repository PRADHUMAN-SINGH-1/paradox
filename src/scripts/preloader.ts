/**
 * PARADOX Cybernetic Preloader — Inspired by lusion.co & landonorris.com
 * High-speed odometer counter + curtain shutter wipe revealing the 3D scene.
 */

declare global {
  interface Window {
    gsap?: any;
  }
}

export function initPreloader() {
  if (typeof window === 'undefined') return;

  const preloader = document.querySelector<HTMLElement>('#px-preloader');
  const counterEl = document.querySelector<HTMLElement>('#px-preloader-counter');
  const barEl = document.querySelector<HTMLElement>('#px-preloader-bar');

  if (!preloader || !counterEl) return;

  const alreadyLoaded = sessionStorage.getItem('px_preloader_seen');

  let current = 0;
  const target = 100;
  const stepTime = alreadyLoaded ? 3 : 8;

  const interval = setInterval(() => {
    current += Math.floor(Math.random() * 8) + 4;
    if (current >= target) {
      current = 100;
      clearInterval(interval);
      counterEl.textContent = '100%';
      if (barEl) barEl.style.width = '100%';

      sessionStorage.setItem('px_preloader_seen', 'true');

      // Curtain Shutter Wipe
      setTimeout(() => {
        if (window.gsap) {
          window.gsap.to(preloader, {
            clipPath: 'inset(0% 0 100% 0)',
            duration: 0.8,
            ease: 'power4.inOut',
            onComplete: () => {
              preloader.style.display = 'none';
            }
          });
        } else {
          preloader.style.opacity = '0';
          preloader.style.pointerEvents = 'none';
          setTimeout(() => preloader.remove(), 400);
        }
      }, 100);
    } else {
      counterEl.textContent = `${String(current).padStart(2, '0')}%`;
      if (barEl) barEl.style.width = `${current}%`;
    }
  }, stepTime);
}
