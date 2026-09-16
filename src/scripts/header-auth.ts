async function boot() {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-auth-link]');
  if (!links.length) return;
  try {
    const { currentUser } = await import('../lib/supabase.ts');
    let user: Awaited<ReturnType<typeof currentUser>> = null;
    try {
      user = await currentUser();
    } catch {
      user = null;
    }
    links.forEach((a) => {
      a.href = user ? '/dashboard/' : '/auth/';
      a.textContent = user ? 'Dashboard' : 'Sign in';
    });
  } catch {
    links.forEach((a) => {
      a.href = '/auth/';
      a.textContent = 'Sign in';
    });
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
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(work, { timeout: 2000 });
  } else {
    window.setTimeout(work, 1000);
  }
};
schedule(() => { void boot().catch(() => undefined); });
