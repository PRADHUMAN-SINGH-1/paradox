import { track } from '../lib/analytics.ts';
import { currentUser, supabase } from '../lib/supabase.ts';
import { clearLocalScans, getLocalSavedAgents, getLocalScans, removeLocalAgent } from '../lib/local-state.ts';

function esc(s: string) {
  return String(s || '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function localMode() {
  const email = document.querySelector('#accountEmail');
  const profileEmail = document.querySelector('#profileEmail');
  const saved = document.querySelector('#savedAgents');
  const history = document.querySelector('#scanHistory');
  if (email) email.textContent = 'Local device mode — sign in to sync across devices.';
  if (profileEmail) profileEmail.textContent = 'No authenticated session is active. Local results remain on this device until you sign in.';
  renderSaved(saved, getLocalSavedAgents().map((x) => ({ ...x, local: true })));
  renderHistory(history, getLocalScans().map((x) => ({ ...x, repository_url: `https://github.com/${x.repository}` })));
}

async function boot() {
  const email = document.querySelector('#accountEmail');
  const profileEmail = document.querySelector('#profileEmail');
  const saved = document.querySelector('#savedAgents');
  const history = document.querySelector('#scanHistory');
  if (!supabase) {
    localMode();
    return;
  }
  const user = await currentUser();
  if (!user) {
    localMode();
    return;
  }
  const identity = user.email || user.id;
  if (email) email.textContent = identity;
  if (profileEmail) profileEmail.textContent = `Signed in as ${identity}. This account is the owner of your saved agents and scan history.`;
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
      const name = String(x.repository_full_name || 'Repository');
      const local = Boolean(x.local);
      return `<article class="card"><h3>${esc(name)}</h3><p>${esc(String(x.verdict || 'Unknown'))} · score ${esc(String(x.score ?? 'Unknown'))}</p><div class="links"><a href="/agents/view/?repo=${encodeURIComponent(name)}">Open</a> <button type="button" data-unsave="${esc(String(x.id || name))}">${local ? 'Remove' : 'Remove'}</button></div></article>`;
    }).join('')
    : '<p class="muted">Nothing saved yet. Verify an agent, then save it.</p>';
  el.querySelectorAll<HTMLButtonElement>('[data-unsave]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!supabase || btn.dataset.unsave?.includes('/')) {
        removeLocalAgent(btn.dataset.unsave || '');
        boot();
        return;
      }
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
      const name = String(x.repository_full_name || 'Repository');
      return `<article class="card"><h3>${esc(name)}</h3><p>${esc(String(x.scannedAt || x.created_at || ''))}<br/>${esc(String(x.verdict || 'Unknown'))} · score ${esc(String(x.score ?? 'Unknown'))}</p><div class="links"><a href="/verify/?url=${encodeURIComponent(String(x.repository_url || `https://github.com/${name}`))}">Open again</a></div></article>`;
    }).join('')
    : '<p class="muted">No scans stored yet.</p>';
}

document.querySelector('#signOut')?.addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
  location.href = '/';
});

document.querySelector('#clearHistory')?.addEventListener('click', async () => {
  if (!supabase) {
    clearLocalScans();
    boot();
    return;
  }
  const user = await currentUser();
  if (!user) {
    clearLocalScans();
    boot();
    return;
  }
  await supabase.from('scan_history').delete().eq('user_id', user.id);
  track('scan_history_cleared');
  boot();
});

boot();
