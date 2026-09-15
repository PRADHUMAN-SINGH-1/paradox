import { track } from '../lib/analytics.ts';
import { supabase } from '../lib/supabase.ts';

type RepoItem = Record<string, unknown>;

function esc(s: string): string {
  return String(s || '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 9999;
  return Math.max(0, (Date.now() - t) / 86400000);
}

function freshnessLabel(iso: string): string {
  const d = daysSince(iso);
  if (d <= 14) return 'Fresh';
  if (d <= 90) return 'Active';
  if (d <= 365) return 'Cooling';
  return 'Stale';
}

function setState(status: HTMLElement | null, state: 'idle' | 'loading' | 'success' | 'error', text: string) {
  if (!status) return;
  status.dataset.state = state;
  status.textContent = text;
}

async function proxySearch(query: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('analyze-repo', { body: { mode: 'search', query } });
  if (error || !data || data.error) return null;
  return data as { total_count?: number; items?: RepoItem[] };
}

async function directSearch(query: string) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`;
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 403) throw new Error('GitHub is temporarily rate limiting requests. Please try again shortly.');
  if (!r.ok) throw new Error("We couldn't complete this search. Try again.");
  return await r.json() as { total_count?: number; items?: RepoItem[] };
}

function card(x: RepoItem): string {
  const full = String(x.full_name || '');
  const href = `/agents/view/?repo=${encodeURIComponent(full)}`;
  const pushed = String(x.pushed_at || '');
  const freshness = freshnessLabel(pushed);
  const stars = Number(x.stargazers_count || 0);
  const forks = Number(x.forks_count || 0);
  const issues = Number(x.open_issues_count || 0);
  const lang = String(x.language || 'Unknown');
  return `<article class="agent-card" data-freshness="${freshness.toLowerCase()}" data-language="${esc(lang.toLowerCase())}">
    <div class="meta"><span>${esc(lang)}</span><span>★ ${stars}</span><span>⑂ ${forks}</span><span>! ${issues}</span><span>${freshness}</span></div>
    <h2>${esc(full)}</h2>
    <p>${esc(String(x.description || 'No description provided.'))}</p>
    <div class="links">
      <a href="${href}" data-full="${esc(full)}">Inspect</a>
      <a href="/verify/?url=${encodeURIComponent(String(x.html_url || ''))}">Verify</a>
      <a href="${esc(String(x.html_url || '#'))}" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
  </article>`;
}

function wireFilter(results: HTMLElement | null, items: RepoItem[]) {
  const controls = document.querySelector('#discoverFilters');
  if (!controls || !results) return;
  controls.innerHTML = `
    <button type="button" data-filter="all" class="active">All</button>
    <button type="button" data-filter="fresh">Fresh</button>
    <button type="button" data-filter="active">Active</button>
    <button type="button" data-filter="cooling">Cooling</button>
    <button type="button" data-filter="stale">Stale</button>
    <span>${items.length} visible cards</span>`;
  const apply = (filter: string) => {
    controls.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.getAttribute('data-filter') === filter));
    results.querySelectorAll<HTMLElement>('.agent-card').forEach((el) => {
      const keep = filter === 'all' || el.dataset.freshness === filter;
      el.hidden = !keep;
    });
  };
  controls.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => apply(btn.getAttribute('data-filter') || 'all')));
}

export async function searchGitHub(q: string) {
  const status = document.querySelector<HTMLElement>('#searchStatus');
  const results = document.querySelector<HTMLElement>('#results');
  setState(status, 'loading', 'Scanning live public GitHub repositories…');
  if (results) results.innerHTML = '<div class="loading-matrix" aria-hidden="true"></div>';
  const query = q.trim() || 'ai agent';
  track('search', { search_term: query });
  const data = (await proxySearch(query)) ?? await directSearch(query);
  const items = data.items || [];
  if (!items.length) {
    if (results) results.innerHTML = '<p class="empty">No repositories found. Try capability terms like “browser agent”, “MCP”, or “RAG evaluator”.</p>';
    setState(status, 'error', '0 matches found.');
    return;
  }
  if (results) {
    results.innerHTML = `<div id="discoverFilters" class="discover-filters"></div>${items.map(card).join('')}`;
    results.querySelectorAll('[data-full]').forEach((a) => a.addEventListener('click', () => track('search_result_click', { repository: a.getAttribute('data-full') || '' })));
  }
  wireFilter(results, items);
  setState(status, 'success', `${data.total_count ?? items.length} public repositories matched.`);
}

export function bootSearch() {
  const form = document.querySelector<HTMLFormElement>('#searchForm');
  const query = document.querySelector<HTMLInputElement>('#query');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = query?.value.trim() || '';
    history.replaceState(null, '', `/agents/?q=${encodeURIComponent(q)}`);
    try { await searchGitHub(q); }
    catch (err) {
      setState(document.querySelector<HTMLElement>('#searchStatus'), 'error', err instanceof Error ? err.message : 'Search failed.');
    }
  });
  const q = new URLSearchParams(location.search).get('q') || '';
  if (query) query.value = q;
  if (q) {
    searchGitHub(q).catch((err) => {
      setState(document.querySelector<HTMLElement>('#searchStatus'), 'error', err instanceof Error ? err.message : 'Search failed.');
    });
  }
}

bootSearch();
