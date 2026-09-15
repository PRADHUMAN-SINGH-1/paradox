import { fetchAnalysis } from '../lib/analysis/fetch.ts';
import { readCache, writeCache } from '../lib/analysis/cache.ts';
import { renderAnalysis } from '../lib/analysis/render.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';
import { currentUser, supabase } from '../lib/supabase.ts';

function setStatus(status: Element | null, text: string, state: 'idle' | 'loading' | 'success' | 'error') {
  if (!status) return;
  status.textContent = text;
  (status as HTMLElement).dataset.state = state;
}

export async function bootProfile(fullName: string) {
  const mount = document.querySelector('#liveAnalysis');
  const status = document.querySelector('#profileStatus');
  track('agent_opened', { repository: fullName });
  if (!mount) return;
  try {
    const ref = parseRepoRef(fullName);
    const cached = readCache(ref.fullName);
    setStatus(status, cached ? 'Showing cached static analysis.' : 'Fetching live public GitHub evidence…', 'loading');
    mount.innerHTML = '<div class="loading-matrix" aria-hidden="true"></div>';
    const analysis = cached ?? await fetchAnalysis(ref.url);
    if (!cached) writeCache(analysis);
    mount.innerHTML = renderAnalysis(analysis, {
      compareHref: `/compare/?left=${encodeURIComponent(analysis.meta.fullName)}`,
    });
    mount.querySelector('[data-save]')?.addEventListener('click', async () => {
      track('save_agent', { repository: analysis.meta.fullName });
      if (!supabase) {
        const key = 'paradox:saved-agents';
        const saved = JSON.parse(localStorage.getItem(key) || '[]') as string[];
        if (!saved.includes(analysis.meta.fullName)) saved.push(analysis.meta.fullName);
        localStorage.setItem(key, JSON.stringify(saved));
        setStatus(status, 'Saved on this device. Create an account later to sync it across devices.', 'success');
        return;
      }
      const user = await currentUser();
      if (!user) {
        location.href = `/auth/?next=${encodeURIComponent(location.href)}`;
        return;
      }
      const { error } = await supabase.from('saved_agents').upsert({
        user_id: user.id,
        repository_url: analysis.meta.htmlUrl,
        repository_full_name: analysis.meta.fullName,
        verdict: analysis.verdict,
        score: analysis.scores.paradox,
      }, { onConflict: 'user_id,repository_full_name' });
      setStatus(status, error ? "We couldn't save this agent. Try again." : 'Saved to your collection.', error ? 'error' : 'success');
    });
    setStatus(status, 'Live static analysis loaded.', 'success');
  } catch (err) {
    setStatus(status, err instanceof Error ? err.message : "We couldn't complete this analysis. Try again.", 'error');
  }
}

const pageRepo = new URLSearchParams(location.search).get('repo');
const fromPage = document.body?.dataset.agent;
if (pageRepo) bootProfile(pageRepo);
else if (fromPage) bootProfile(fromPage);
else {
  const m = location.pathname.match(/^\/agents\/([^/]+)\/([^/]+)\/?$/);
  if (m) bootProfile(`${m[1]}/${m[2]}`);
}
