// The global startup stylesheet animates the entire header from opacity: 0.
// That animation runs on every document load/navigation and makes the top-right
// auth/dashboard button visibly disappear for a fraction of a second. Disable
// that entrance animation before any async auth work begins.
const siteHeader = document.querySelector<HTMLElement>('.site-header');
if (siteHeader) {
  siteHeader.style.animation = 'none';
  siteHeader.style.opacity = '1';
  siteHeader.style.transform = 'none';
}

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

function revealAuthLinks(links: NodeListOf<HTMLAnchorElement>): void {
  links.forEach((a) => a.classList.add('auth-state-ready'));
}

async function boot() {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-auth-link]');
  if (!links.length) return;
  try {
    const { supabase } = await import('../../lib/supabase.ts');
    const sessionUser = supabase ? (await supabase.auth.getSession()).data.session?.user ?? null : null;
    links.forEach((a) => {
      a.href = sessionUser ? '/dashboard/' : '/auth/';
      a.textContent = sessionUser ? 'Dashboard' : 'Sign in';
    });
    revealAuthLinks(links);
  } catch {
    links.forEach((a) => { a.href = '/auth/'; a.textContent = 'Sign in'; });
    revealAuthLinks(links);
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

// Resolve auth from Supabase's locally cached session first. getUser() can
// require a network round-trip, which caused the visible "Sign in" ->
// "Dashboard" transition on every page load.
void boot().catch(() => {
  document.querySelectorAll<HTMLAnchorElement>('[data-auth-link]').forEach((a) => {
    a.href = '/auth/';
    a.textContent = 'Sign in';
    a.classList.add('auth-state-ready');
  });
});
