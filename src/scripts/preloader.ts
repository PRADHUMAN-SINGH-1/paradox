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

  let interval: any;

  const finishPreloader = () => {
    if (interval) clearInterval(interval);
    counterEl.textContent = '100%';
    if (barEl) barEl.style.width = '100%';

    sessionStorage.setItem('px_preloader_seen', 'true');

    if (window.gsap) {
      const tl = window.gsap.timeline({
        onComplete: () => {
          preloader.style.display = 'none';
          window.dispatchEvent(new CustomEvent('paradox:preloader_complete'));
        }
      });

      const contentEls: HTMLElement[] = [];
      if (counterEl) contentEls.push(counterEl);
      if (barEl) contentEls.push(barEl);

      // Brief hold 200ms, then fade content over 400ms
      tl.to(contentEls, {
        opacity: 0,
        scale: 1.05,
        filter: 'blur(8px)',
        duration: 0.4,
        ease: 'power2.inOut'
      }, "+=0.2");

      // Wipe away background over 600ms, with subtle scale/blur
      tl.to(preloader, {
        clipPath: 'inset(0% 0 100% 0)',
        scale: 1.02,
        filter: 'blur(4px)',
        duration: 0.6,
        ease: 'power4.inOut'
      });
    } else {
      preloader.style.opacity = '0';
      preloader.style.pointerEvents = 'none';
      setTimeout(() => {
        preloader.remove();
        window.dispatchEvent(new CustomEvent('paradox:preloader_complete'));
      }, 400);
    }
  };

  window.addEventListener('paradox:hero_ready', () => {
    finishPreloader();
  }, { once: true });

  if (window.gsap) {
    const proxy = { value: 0 };
    window.gsap.to(proxy, {
      value: 100,
      duration: alreadyLoaded ? 0.8 : 2.5,
      ease: "power2.inOut",
      onUpdate: () => {
        const current = Math.floor(proxy.value);
        counterEl.textContent = `${String(current).padStart(2, '0')}%`;
        if (barEl) barEl.style.width = `${current}%`;
      },
      onComplete: finishPreloader
    });
  } else {
    interval = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 4;
      if (current >= target) {
        finishPreloader();
      } else {
        counterEl.textContent = `${String(current).padStart(2, '0')}%`;
        if (barEl) barEl.style.width = `${current}%`;
      }
    }, stepTime);
  }
}
