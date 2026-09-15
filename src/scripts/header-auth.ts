import { currentUser, supabase } from '../lib/supabase.ts';

async function boot() {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-auth-link]');
  if (!supabase) return;
  const user = await currentUser();
  links.forEach((a) => {
    a.href = user ? '/dashboard/' : '/auth/';
    a.textContent = user ? 'Dashboard' : 'Sign in';
  });
}

const btn = document.querySelector('.menu-toggle');
const nav = document.querySelector('#mobileNav');
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

boot();
