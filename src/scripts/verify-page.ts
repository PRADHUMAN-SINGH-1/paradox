import { fetchAnalysis, GitHubHttpError } from '../lib/analysis/fetch.ts';
import { allowAnonymousVerify, readCache, writeCache } from '../lib/analysis/cache.ts';
import { renderAnalysis } from '../lib/analysis/render.ts';
import type { Analysis } from '../lib/analysis/types.ts';
import { track } from '../lib/analytics.ts';
import { currentUser, supabase } from '../lib/supabase.ts';
import { saveLocalAgent, saveLocalScan } from '../lib/local-state.ts';

function statusEl(): HTMLElement | null { return document.querySelector<HTMLElement>('#verifyStatus'); }
function resultEl(): HTMLElement | null { return document.querySelector<HTMLElement>('#result'); }

function setStatus(text: string) {
  const el = statusEl();
  if (el) el.textContent = text;
}

function downloadAnalysis(analysis: Analysis) {
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    repository: analysis.meta.fullName,
    verdict: analysis.verdict,
    scores: analysis.scores,
    metadata: analysis.meta,
    latestRelease: analysis.latestRelease,
    contributors: analysis.contributors,
    languages: analysis.languages,
    detections: analysis.detections,
    risks: analysis.risks,
    verdictReasons: analysis.verdictReasons,
    analyzedAt: analysis.analyzedAt,
  }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${analysis.meta.fullName.replace(/[^A-Za-z0-9._-]+/g, '-')}-paradox-analysis.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function showSaveFeedback(message: string, analysis: Analysis) {
  const status = statusEl();
  if (!status) return;
  status.textContent = message;
  let panel = document.querySelector<HTMLElement>('#verifySaveFeedback');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'verifySaveFeedback';
    panel.setAttribute('role', 'status');
    panel.innerHTML = `<strong>Analysis saved.</strong><span>Keep a local evidence file and reopen the workspace later.</span><a href="/dashboard/">Open dashboard →</a>`;
    status.insertAdjacentElement('afterend', panel);
  }
  panel.querySelector('a')?.setAttribute('href', '/dashboard/');
  downloadAnalysis(analysis);
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

async function save(fullName: string, url: string, verdict: string, score: number, analysis: Analysis) {
  track('save_agent', { repository: fullName, verdict, score });
  downloadAnalysis(analysis);
  if (!supabase) {
    saveLocalAgent({ repository: fullName, url, verdict, score, savedAt: new Date().toISOString() });
    showSaveFeedback('Saved on this device and downloaded.', analysis);
    return;
  }
  const user = await currentUser();
  if (!user) {
    showSaveFeedback('Download complete. Sign in to sync this analysis to your dashboard.', analysis);
    window.setTimeout(() => {
      location.href = `/auth/?next=${encodeURIComponent(location.pathname + location.search)}`;
    }, 650);
    return;
  }
  const { error } = await supabase.from('saved_agents').upsert({
    user_id: user.id,
    repository_url: url,
    repository_full_name: fullName,
    verdict,
    score,
  }, { onConflict: 'user_id,repository_full_name' });
  if (error) {
    setStatus("Local download complete, but dashboard save failed. Try again.");
    return;
  }
  showSaveFeedback('Saved to your dashboard and downloaded.', analysis);
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
        void save(analysis.meta.fullName, analysis.meta.htmlUrl, analysis.verdict, analysis.scores.paradox, analysis);
      });
      result.querySelector('[data-github]')?.addEventListener('click', () => {
        track('github_clicked', { repository: analysis.meta.fullName });
      });
    }
    history.replaceState(null, '', `/verify/?url=${encodeURIComponent(analysis.meta.htmlUrl)}`);
    await persist(analysis);
    setStatus('Static analysis complete. Save it to your dashboard or download the evidence file.');
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
