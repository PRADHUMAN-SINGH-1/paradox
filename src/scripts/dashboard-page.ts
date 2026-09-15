import { track } from '../lib/analytics.ts';
import { currentUser, supabase } from '../lib/supabase.ts';

function esc(s: string) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

async function boot() {
  const email = document.querySelector('#accountEmail');
  const saved = document.querySelector('#savedAgents');
  const history = document.querySelector('#scanHistory');
  if (!supabase) {
    if (email) email.textContent = 'Authentication is not configured yet.';
    if (saved) saved.innerHTML = '<p class="muted">Connect Supabase to enable saved agents.</p>';
    if (history) history.innerHTML = '<p class="muted">Connect Supabase to enable scan history.</p>';
    return;
  }
  const user = await currentUser();
  if (!user) {
    location.href = '/auth/?next=/dashboard/';
    return;
  }
  if (email) email.textContent = user.email || user.id;
  track('scan_history_opened');
  const s = await supabase.from('saved_agents').select('*').order('created_at', { ascending: false }).limit(50);
  const h = await supabase.from('scan_history').select('*').order('created_at', { ascending: false }).limit(50);
  renderSaved(saved, s.data || []);
  renderHistory(history, h.data || []);
}

function renderSaved(el: Element | null, rows: Array<Record<string, unknown>>) {
  if (!el) return;
  el.innerHTML = rows.length
    ? rows.map((x) => {
      const name = String(x.repository_full_name || x.repo_name || 'Repository');
      return `<article class="card"><h3>${esc(name)}</h3><p>${esc(String(x.verdict || 'Unknown'))} · score ${esc(String(x.score ?? 'Unknown'))}</p><div class="links"><a href="/agents/${esc(name)}/">Open</a> <button type="button" data-unsave="${esc(String(x.id))}">Remove</button></div></article>`;
    }).join('')
    : '<p class="muted">Nothing saved yet. Verify an agent, then save it.</p>';
  el.querySelectorAll<HTMLButtonElement>('[data-unsave]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!supabase) return;
      await supabase.from('saved_agents').delete().eq('id', btn.dataset.unsave);
      track('unsave_agent');
      boot();
    });
  });
}

function renderHistory(el: Element | null, rows: Array<Record<string, unknown>>) {
  if (!el) return;
  el.innerHTML = rows.length
    ? rows.map((x) => {
      const name = String(x.repository_full_name || x.repo_name || 'Repository');
      return `<article class="card"><h3>${esc(name)}</h3><p>${esc(String(x.created_at || ''))}<br/>${esc(String(x.verdict || 'Unknown'))} · score ${esc(String(x.score ?? 'Unknown'))}</p><div class="links"><a href="/verify/?url=${encodeURIComponent(String(x.repository_url || x.repo_url || ''))}">Open again</a> <button type="button" data-forget="${esc(String(x.id))}">Delete</button></div></article>`;
    }).join('')
    : '<p class="muted">No scans stored yet.</p>';
  el.querySelectorAll<HTMLButtonElement>('[data-forget]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!supabase) return;
      await supabase.from('scan_history').delete().eq('id', btn.dataset.forget);
      boot();
    });
  });
}

document.querySelector('#signOut')?.addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
  location.href = '/';
});

document.querySelector('#clearHistory')?.addEventListener('click', async () => {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  await supabase.from('scan_history').delete().eq('user_id', user.id);
  boot();
});

boot();
