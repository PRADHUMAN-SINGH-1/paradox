import { currentUser } from '../lib/supabase.ts';

const publicPaths = ['/auth/', '/contact/', '/privacy/', '/terms/'];
const toolPaths = [/^\/verify\/?$/, /^\/compare\/?$/, /^\/ai-studio\/?$/, /^\/studio\/?$/, /^\/ai\/[^/]+\/?$/, /^\/tools\/[^/]+\/?$/, /^\/utilities\/[^/]+\/?$/, /^\/agents\/?$/];
const gatedForms = new Set(['searchForm', 'compareForm', 'verifyForm', 'authForm']);

function requiresAuth(form: HTMLFormElement) {
  if (form.id === 'authForm') return false;
  if (gatedForms.has(form.id)) return true;
  if (publicPaths.includes(location.pathname)) return false;
  return toolPaths.some((pattern) => pattern.test(location.pathname));
}

function loginUrl() {
  const next = `${location.pathname}${location.search}${location.hash}`;
  return `/auth/?next=${encodeURIComponent(next)}`;
}

for (const form of document.querySelectorAll<HTMLFormElement>('form')) {
  if (!requiresAuth(form)) continue;
  form.addEventListener('submit', (event) => {
    void currentUser().then((user) => {
      if (user) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = loginUrl();
    });
  }, { capture: true });
}

for (const button of document.querySelectorAll<HTMLElement>('[data-requires-auth]')) {
  button.addEventListener('click', (event) => {
    void currentUser().then((user) => {
      if (user) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = loginUrl();
    });
  });
}
