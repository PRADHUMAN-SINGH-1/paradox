(() => {
  'use strict';
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.section, .tool-card, .quick-grid > a, .live-card, .generator-panel, .generator-preview').forEach((el) => {
      el.dataset.reveal = '';
      observer.observe(el);
    });
  }
})();