import { currentUser } from '../lib/supabase.ts';

const publicPaths = ['/auth/', '/contact/', '/privacy/', '/terms/'];
const toolPaths = [/^\/verify\/?$/, /^\/compare\/?$/, /^\/ai-studio\/?$/, /^\/studio\/?$/, /^\/ai\/[^/]+\/?$/, /^\/tools\/[^/]+\/?$/, /^\/utilities\/[^/]+\/?$/, /^\/agents\/?$/];
const gatedForms = new Set(['searchForm', 'compareForm', 'verifyForm', 'authForm']);
const bypassedButtons = new WeakSet<HTMLElement>();

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
    if (form.dataset.authResolved === 'true') {
      delete form.dataset.authResolved;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    void currentUser().then((user) => {
      if (!user) {
        location.href = loginUrl();
        return;
      }
      form.dataset.authResolved = 'true';
      form.requestSubmit();
    });
  }, { capture: true });
}

for (const button of document.querySelectorAll<HTMLElement>('[data-requires-auth]')) {
  button.addEventListener('click', (event) => {
    if (bypassedButtons.has(button)) {
      bypassedButtons.delete(button);
      return;
    }
    event.preventDefault();
    void currentUser().then((user) => {
      if (!user) {
        location.href = loginUrl();
        return;
      }
      const href = button.getAttribute('href');
      if (href) {
        location.href = href;
      } else {
        bypassedButtons.add(button);
        button.click();
      }
    });
  });
}
