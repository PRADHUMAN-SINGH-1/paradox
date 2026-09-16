import { track } from '../lib/analytics.ts';
import { supabase } from '../lib/supabase.ts';

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

async function proxySearch(query: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('analyze-repo', { body: { mode: 'search', query } });
  if (error || !data || data.error) return null;
  return data as { total_count?: number; items?: Array<Record<string, unknown>> };
}

async function directSearch(query: string) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  let r: Response;
  try {
    r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('GitHub search timed out. Please try again.');
    throw error;
  } finally { window.clearTimeout(timeout); }
  if (r.status === 403) throw new Error('GitHub is temporarily rate limiting requests. Please try again shortly.');
  if (!r.ok) throw new Error("We couldn't complete this search. Try again.");
  return await r.json() as { total_count?: number; items?: Array<Record<string, unknown>> };
}

export async function searchGitHub(q: string) {
  const status = document.querySelector('#searchStatus');
  const results = document.querySelector('#results');
  if (status) status.textContent = 'Searching public GitHub repositories…';
  if (results) results.innerHTML = '';
  const query = q.trim() || 'ai agent';
  track('search', { search_term: query });
  const data = (await proxySearch(query)) ?? await directSearch(query);
  const items = data.items || [];
  if (!items.length) {
    if (results) results.innerHTML = '<p class="empty">No repositories found. Try a capability like “browser agent” or “MCP”.</p>';
    if (status) status.textContent = '0 matches';
    return;
  }
  if (results) {
    results.innerHTML = items.map((x) => {
      const full = String(x.full_name || '');
      const href = `/agents/view/?repo=${encodeURIComponent(full)}`;
      return `<article class="agent-card">
        <div class="meta"><span>${esc(String(x.language || 'Unknown'))}</span><span>★ ${Number(x.stargazers_count || 0)}</span><span>${freshnessLabel(String(x.pushed_at || ''))}</span></div>
        <h2>${esc(full)}</h2>
        <p>${esc(String(x.description || 'No description provided.'))}</p>
        <div class="links">
          <a href="${href}" data-full="${esc(full)}">Inspect</a>
          <a href="/verify/?url=${encodeURIComponent(String(x.html_url))}">Verify</a>
          <a href="${esc(String(x.html_url || '#'))}" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </article>`;
    }).join('');
    results.querySelectorAll('[data-full]').forEach((a) => a.addEventListener('click', () => track('search_result_click', { repository: a.getAttribute('data-full') || '' })));
  }
  if (status) status.textContent = `${data.total_count ?? items.length} public repositories matched.`;
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
      const status = document.querySelector('#searchStatus');
      if (status) status.textContent = err instanceof Error ? err.message : 'Search failed.';
    }
  });
  const q = new URLSearchParams(location.search).get('q') || '';
  if (query) query.value = q;
  if (q) searchGitHub(q).catch((err) => {
    const status = document.querySelector('#searchStatus');
    if (status) status.textContent = err instanceof Error ? err.message : 'Search failed.';
  });
}

bootSearch();
