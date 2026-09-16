import { fetchAnalysis } from '../lib/analysis/fetch.ts';
import { readCache, writeCache } from '../lib/analysis/cache.ts';
import { renderAnalysis } from '../lib/analysis/render.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';
import { currentUser, supabase } from '../lib/supabase.ts';
import { saveLocalAgent } from '../lib/local-state.ts';

export async function bootProfile(fullName: string) {
  const mount = document.querySelector('#liveAnalysis');
  const status = document.querySelector('#profileStatus');
  track('agent_opened', { repository: fullName });
  if (!mount) return;
  try {
    const ref = parseRepoRef(fullName);
    const cached = readCache(ref.fullName);
    if (status) status.textContent = cached ? 'Showing cached static analysis.' : 'Fetching live public GitHub evidence…';
    const analysis = cached ?? await fetchAnalysis(ref.url);
    if (!cached) writeCache(analysis);
    mount.innerHTML = renderAnalysis(analysis, {
      compareHref: `/compare/?left=${encodeURIComponent(analysis.meta.fullName)}`,
    });
    mount.querySelector('[data-save]')?.addEventListener('click', async () => {
      track('save_agent', { repository: analysis.meta.fullName });
      if (!supabase) {
        saveLocalAgent({
          repository: analysis.meta.fullName,
          url: analysis.meta.htmlUrl,
          verdict: analysis.verdict,
          score: analysis.scores.paradox,
          savedAt: new Date().toISOString(),
        });
        if (status) status.textContent = 'Saved on this device. Create an account later to sync it across devices.';
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
      if (status) status.textContent = error ? "We couldn't save this agent. Try again." : 'Saved to your collection.';
    });
    if (status) status.textContent = cached ? 'Cached static analysis loaded. Use Verify for a fresh run.' : 'Fresh static analysis loaded.';
  } catch (err) {
    if (status) status.textContent = err instanceof Error ? err.message : "We couldn't complete this analysis. Try again.";
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
