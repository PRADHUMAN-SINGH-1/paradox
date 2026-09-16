function normalizeInitialFields() {
  const selector = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="range"]), textarea';
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector).forEach((field) => {
    const value = field.value;
    if (!value) return;
    if (!field.getAttribute('placeholder')) field.setAttribute('placeholder', value);
    field.value = '';
  });
}

function repairDashboardSectionLabels() {
  if (!location.pathname.startsWith('/dashboard/')) return;
  const style = document.createElement('style');
  style.textContent = `
    .professional-dashboard .section-head > div > span { display: none !important; }
    .professional-dashboard .section-head h2 { margin-top: 0 !important; line-height: .98 !important; }
    .professional-dashboard .section-head { align-items: flex-start !important; }
  `;
  document.head.appendChild(style);
}

normalizeInitialFields();
repairDashboardSectionLabels();

const formDefaultObserver = new MutationObserver(() => normalizeInitialFields());
formDefaultObserver.observe(document.documentElement, { childList: true, subtree: true });

async function boot() {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-auth-link]');
  if (!links.length) return;
  try {
    const { currentUser } = await import('../lib/supabase.ts');
    let user: Awaited<ReturnType<typeof currentUser>> = null;
    try { user = await currentUser(); } catch { user = null; }
    links.forEach((a) => { a.href = user ? '/dashboard/' : '/auth/'; a.textContent = user ? 'Dashboard' : 'Sign in'; });
  } catch {
    links.forEach((a) => { a.href = '/auth/'; a.textContent = 'Sign in'; });
  }
}

const btn = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mobileNav');
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

const schedule = (work: () => void) => {
  const requestIdle = window.requestIdleCallback;
  if (typeof requestIdle === 'function') requestIdle(work, { timeout: 2000 });
  else globalThis.setTimeout(work, 1000);
};
schedule(() => { void boot().catch(() => undefined); });
