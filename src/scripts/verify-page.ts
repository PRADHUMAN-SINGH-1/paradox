import { fetchAnalysis, GitHubHttpError } from '../lib/analysis/fetch.ts';
import { allowAnonymousVerify, readCache, writeCache } from '../lib/analysis/cache.ts';
import { renderAnalysis } from '../lib/analysis/render.ts';
import type { Analysis } from '../lib/analysis/types.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';
import { currentUser, supabase } from '../lib/supabase.ts';
import { saveLocalAgent, saveLocalScan } from '../lib/local-state.ts';

function statusEl(): HTMLElement | null { return document.querySelector<HTMLElement>('#verifyStatus'); }
function resultEl(): HTMLElement | null { return document.querySelector<HTMLElement>('#result'); }

function setStatus(text: string) {
  const el = statusEl();
  if (el) el.textContent = text;
}

async function persist(analysis: Analysis) {
  saveLocalScan({
    repository: analysis.meta.fullName,
    verdict: analysis.verdict,
    score: analysis.scores.paradox,
    scannedAt: analysis.analyzedAt,
  });
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  const row = {
    user_id: user.id,
    repository_url: analysis.meta.htmlUrl,
    repository_full_name: analysis.meta.fullName,
    verdict: analysis.verdict,
    score: analysis.scores.paradox,
    analysis_json: {
      scores: analysis.scores,
      verdict: analysis.verdict,
      detections: analysis.detections,
      risks: analysis.risks.map((r) => ({ category: r.category, severity: r.severity, file: r.file })),
    },
  };
  await supabase.from('scan_history').insert(row);
}

async function save(fullName: string, url: string, verdict: string, score: number) {
  track('save_agent', { repository: fullName, verdict, score });
  if (!supabase) {
    saveLocalAgent({ repository: fullName, url, verdict, score, savedAt: new Date().toISOString() });
    setStatus('Saved on this device. Create an account later to sync it across devices.');
    return;
  }
  const user = await currentUser();
  if (!user) {
    setStatus('Create a free account to save it.');
    location.href = `/auth/?next=${encodeURIComponent(location.pathname + location.search)}`;
    return;
  }
  const { error } = await supabase.from('saved_agents').upsert({
    user_id: user.id,
    repository_url: url,
    repository_full_name: fullName,
    verdict,
    score,
  }, { onConflict: 'user_id,repository_full_name' });
  setStatus(error ? "We couldn't save this agent. Try again." : 'Saved to your collection.');
}

export async function runVerify(url: string) {
  const result = resultEl();
  let parsed: ReturnType<typeof parseRepoRef>;
  try {
    parsed = parseRepoRef(url);
  } catch {
    setStatus('Enter a public GitHub repository URL.');
    track('verify_failed', { repository: url });
    return;
  }
  if (!allowAnonymousVerify()) {
    setStatus('Too many verification requests from this browser. Wait a few minutes or sign in.');
    return;
  }
  track('verify_started', { repository: url, source_page: location.pathname });
  setStatus('Reading public GitHub evidence…');
  if (result) result.hidden = true;
  try {
    const cached = readCache(parsed.fullName);
    const analysis = cached ?? await fetchAnalysis(parsed.url);
    if (!cached) writeCache(analysis);
    if (result) {
      result.innerHTML = renderAnalysis(analysis);
      result.hidden = false;
      result.querySelector('[data-save]')?.addEventListener('click', () => {
        save(analysis.meta.fullName, analysis.meta.htmlUrl, analysis.verdict, analysis.scores.paradox);
      });
      result.querySelector('[data-github]')?.addEventListener('click', () => {
        track('github_clicked', { repository: analysis.meta.fullName });
      });
    }
    history.replaceState(null, '', `/verify/?url=${encodeURIComponent(analysis.meta.htmlUrl)}`);
    await persist(analysis);
    setStatus('Static analysis complete. Save it if you want to come back later.');
    track('verify_completed', { repository: analysis.meta.fullName, verdict: analysis.verdict, score: analysis.scores.paradox });
  } catch (err) {
    const message = err instanceof GitHubHttpError ? err.message : "We couldn't complete this analysis. Try again.";
    setStatus(message);
    track('verify_failed', { repository: url });
  }
}

export function bootVerify() {
  const form = document.querySelector<HTMLFormElement>('#verifyForm');
  const input = document.querySelector<HTMLInputElement>('#repoUrl');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input) runVerify(input.value);
  });
  const q = new URLSearchParams(location.search).get('url');
  if (q && input) {
    input.value = q;
    runVerify(q);
  }
}

bootVerify();
