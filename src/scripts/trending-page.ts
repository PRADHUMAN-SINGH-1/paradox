import { supabase } from '../lib/supabase.ts';

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

async function proxySearch(query: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('analyze-repo', { body: { mode: 'search', query } });
  if (error || !data || data.error) return null;
  return data as { items?: Array<Record<string, unknown>>; total_count?: number };
}

async function directSearch(query: string) {
  const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=8`, { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 403) throw new Error('GitHub is temporarily rate limiting live trend data.');
  if (!r.ok) throw new Error('Live GitHub trend data is unavailable.');
  return await r.json() as { items?: Array<Record<string, unknown>>; total_count?: number };
}

const root = document.querySelector<HTMLElement>('#liveTrend');
const status = document.querySelector<HTMLElement>('#trendStatus');

async function boot() {
  if (!root) return;
  try {
    const data = (await proxySearch('ai agent')) ?? await directSearch('ai agent');
    const items = data.items ?? [];
    if (status) status.textContent = `${data.total_count ?? items.length} public repositories matched the live signal.`;
    root.innerHTML = items.length ? items.map((x) => {
      const full = esc(String(x.full_name || 'Unknown'));
      const url = String(x.html_url || '#');
      const desc = esc(String(x.description || 'No description provided.'));
      const pushed = esc(String(x.pushed_at || '').slice(0, 10) || 'Unknown');
      return `<article class="agent-card"><div class="meta"><span>LIVE GITHUB SIGNAL</span><span>${pushed}</span><span>★ ${Number(x.stargazers_count || 0)}</span></div><h3>${full}</h3><p>${desc}</p><div class="links"><a href="/verify/?url=${encodeURIComponent(url)}">Verify repository →</a><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">GitHub</a></div></article>`;
    }).join('') : '<p class="muted">No live repositories returned right now.</p>';
  } catch (err) {
    if (status) status.textContent = err instanceof Error ? err.message : 'Live trend data unavailable.';
    root.innerHTML = '<p class="muted">Try again later or explore the curated catalog above.</p>';
  }
}

boot();
