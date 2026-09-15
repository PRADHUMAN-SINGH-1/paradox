import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL || '';
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
export const supabase = url && key ? createClient(url, key) : null;

export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function boot() {
  const links = document.querySelectorAll('[data-auth-link]');
  if (!supabase) { links.forEach(a => a.textContent = 'JOIN ↗'); return; }
  const user = await currentUser();
  links.forEach(a => {
    a.href = user ? '/account/' : '/auth/';
    a.textContent = user ? 'ACCOUNT ↗' : 'JOIN ↗';
  });
}

boot();
