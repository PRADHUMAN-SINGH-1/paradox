import { track } from '../lib/analytics.ts';

function esc(s: string): string {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
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

export async function searchGitHub(q: string) {
  const status = document.querySelector('#searchStatus');
  const results = document.querySelector('#results');
  if (status) status.textContent = 'Searching public GitHub repositories…';
  if (results) results.innerHTML = '';
  track('search', { search_term: q });
  const query = q.trim() || 'ai agent';
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`;
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 403) throw new Error('GitHub is temporarily rate limiting requests. Please try again shortly.');
  if (!r.ok) throw new Error("We couldn't complete this search. Try again.");
  const data = await r.json() as { total_count?: number; items?: Array<Record<string, unknown>> };
  const items = data.items || [];
  if (!items.length) {
    if (results) results.innerHTML = '<p class="empty">No repositories found. Try a capability like “browser agent” or “MCP”.</p>';
    if (status) status.textContent = '0 matches';
    return;
  }
  if (results) {
    results.innerHTML = items.map((x) => {
      const full = String(x.full_name || '');
      const href = `/agents/${full}/`;
      const pushed = String(x.pushed_at || '');
      return `<article class="agent-card">
        <div class="meta"><span>${esc(String(x.language || 'Unknown'))}</span><span>★ ${Number(x.stargazers_count || 0)}</span><span>${freshnessLabel(pushed)}</span></div>
        <h2>${esc(full)}</h2>
        <p>${esc(String(x.description || 'No description provided.'))}</p>
        <div class="links">
          <a href="${href}" data-full="${esc(full)}">Open profile</a>
          <a href="/verify/?url=${encodeURIComponent(String(x.html_url))}">Verify</a>
        </div>
      </article>`;
    }).join('');
    results.querySelectorAll('[data-full]').forEach((a) => {
      a.addEventListener('click', () => track('search_result_click', { repository: a.getAttribute('data-full') || '' }));
    });
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
