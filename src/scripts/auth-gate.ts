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

async function requireAuth(event?: Event) {
  const user = await currentUser();
  if (user) return true;
  event?.preventDefault();
  const next = `${location.pathname}${location.search}${location.hash}`;
  const url = `/auth/?next=${encodeURIComponent(next)}`;
  location.href = url;
  return false;
}

for (const form of document.querySelectorAll<HTMLFormElement>('form')) {
  if (!requiresAuth(form)) continue;
  form.addEventListener('submit', (event) => {
    void requireAuth(event);
  }, { capture: true });
}

for (const button of document.querySelectorAll<HTMLElement>('[data-requires-auth]')) {
  button.addEventListener('click', async (event) => {
    const ok = await currentUser();
    if (ok) return;
    event.preventDefault();
    const next = `${location.pathname}${location.search}${location.hash}`;
    location.href = `/auth/?next=${encodeURIComponent(next)}`;
  });
}
