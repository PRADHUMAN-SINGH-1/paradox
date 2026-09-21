import { fetchAnalysis, GitHubHttpError } from '../../lib/analysis/fetch.ts';
import { allowAnonymousVerify, readCache, writeCache } from '../../lib/analysis/cache.ts';
import { renderAnalysis } from '../../lib/analysis/render.ts';
import type { Analysis } from '../../lib/analysis/types.ts';
import { track } from '../../lib/analytics.ts';
import { parseRepoRef } from '../../lib/github-url.ts';
import { currentUser, supabase } from '../../lib/supabase.ts';
import { saveLocalAgent, saveLocalScan } from '../../lib/local-state.ts';

function statusEl() {
  return document.querySelector<HTMLElement>('#verifyStatus');
}
function resultEl() {
  return document.querySelector<HTMLElement>('#result');
}
function setStatus(text: string) {
  const el = statusEl();
  if (el) el.textContent = text;
}
function feedback(message: string) {
  const status = statusEl();
  if (status) status.textContent = message;
}

function downloadAnalysis(a: Analysis) {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      repository: a.meta.fullName,
      verdict: a.verdict,
      scores: a.scores,
      metadata: a.meta,
      latestRelease: a.latestRelease,
      contributors: a.contributors,
      languages: a.languages,
      detections: a.detections,
      risks: a.risks,
      verdictReasons: a.verdictReasons,
      intelligence: a.intelligence,
      coverage: a.coverage,
      method: a.method,
      analyzedAt: a.analyzedAt,
    },
    null,
    2
  );
  const href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = href;
  link.download = `${a.meta.fullName.replace(/[^A-Za-z0-9._-]+/g, '-')}-paradox-analysis.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function persist(a: Analysis) {
  saveLocalScan({
    repository: a.meta.fullName,
    verdict: a.verdict,
    score: a.scores.paradox,
    scannedAt: a.analyzedAt,
  });
  if (!supabase) return;
  try {
    const user = await currentUser();
    if (!user) return;
    await supabase.from('scan_history').insert({
      user_id: user.id,
      repository_url: a.meta.htmlUrl,
      repository_full_name: a.meta.fullName,
      verdict: a.verdict,
      score: a.scores.paradox,
      analysis_json: {
        scores: a.scores,
        verdict: a.verdict,
        detections: a.detections,
        risks: a.risks.map((r) => ({ category: r.category, severity: r.severity, file: r.file })),
        intelligence: a.intelligence,
        coverage: a.coverage,
        method: a.method,
      },
    });
  } catch {
    // Non-critical: history sync failure shouldn't block the UI.
  }
}

async function save(
  fullName: string,
  url: string,
  verdict: string,
  score: number,
  a: Analysis,
  button?: HTMLButtonElement | null
) {
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving…';
  }

  // Tracks the label to apply once we're done, so a failure never gets
  // silently overwritten with a "Saved ✓" that didn't happen.
  let finalLabel = 'Saved ✓';

  try {
    track('save_agent', { repository: fullName, verdict, score });
    saveLocalAgent({ repository: fullName, url, verdict, score, savedAt: new Date().toISOString() });
    downloadAnalysis(a);

    if (!supabase) {
      feedback('Saved on this device and downloaded.');
      return;
    }

    let user: Awaited<ReturnType<typeof currentUser>> = null;
    try {
      user = await currentUser();
    } catch {
      feedback('Saved on this device. Authentication check failed; dashboard sync was skipped.');
      finalLabel = 'Saved locally';
      return;
    }

    if (!user) {
      feedback('Saved on this device and downloaded. Sign in to sync future saves.');
      return;
    }

    const { error } = await supabase
      .from('saved_agents')
      .upsert(
        { user_id: user.id, repository_url: url, repository_full_name: fullName, verdict, score },
        { onConflict: 'user_id,repository_full_name' }
      );

    if (error) {
      finalLabel = 'Saved locally';
      feedback('Saved locally and downloaded; dashboard sync failed.');
    } else {
      feedback('Saved to dashboard and downloaded.');
    }
  } catch {
    // Any unexpected throw (Blob/URL API, local-storage quota, etc.) lands here
    // instead of becoming an unhandled promise rejection.
    finalLabel = 'Save failed';
    feedback("We couldn't save this. Try again.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = finalLabel;
    }
  }
}

// Monotonically increasing id used to detect and drop stale, out-of-order
// responses when multiple runVerify calls overlap (double-click, chip click
// mid-analysis, etc.).
let activeRequestId = 0;

export async function runVerify(url: string, fresh = false, submitButton?: HTMLButtonElement | null) {
  const requestId = ++activeRequestId;
  const isStale = () => requestId !== activeRequestId;

  const result = resultEl();
  const input = document.querySelector<HTMLInputElement>('#repoUrl');
  const cleaned = url.trim();

  if (input && cleaned) input.value = cleaned;

  let parsed: ReturnType<typeof parseRepoRef>;
  try {
    parsed = parseRepoRef(cleaned);
  } catch {
    setStatus('Enter a public GitHub repository URL.');
    track('verify_failed', { repository: cleaned });
    return;
  }

  // Only persist to sessionStorage once the URL has passed validation, so an
  // invalid entry never survives a reload.
  try {
    sessionStorage.setItem('paradox:verify-url', parsed.url);
  } catch {}

  if (!allowAnonymousVerify()) {
    setStatus('Too many verification requests from this browser. Wait a few minutes or sign in.');
    return;
  }

  if (input) input.value = parsed.url;
  if (submitButton) submitButton.disabled = true;

  track('verify_started', {
    repository: parsed.fullName,
    source_page: location.pathname,
    fresh: fresh ? 'true' : 'false',
  });
  setStatus(fresh ? 'Refreshing public GitHub evidence…' : 'Reading public GitHub evidence…');
  if (result) result.hidden = true;

  try {
    const cached = !fresh ? readCache(parsed.fullName) : null;
    const analysis = cached ?? (await fetchAnalysis(parsed.url, fresh));

    // A newer call to runVerify started while we were awaiting the fetch —
    // don't let this older response clobber the newer one on screen.
    if (isStale()) return;

    if (!cached) writeCache(analysis);

    if (result) {
      result.innerHTML = renderAnalysis(analysis);
      result.hidden = false;
      result.querySelector<HTMLButtonElement>('[data-save]')?.addEventListener('click', (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        void save(analysis.meta.fullName, analysis.meta.htmlUrl, analysis.verdict, analysis.scores.paradox, analysis, b);
      });
      result.querySelector('[data-github]')?.addEventListener('click', () =>
        track('github_clicked', { repository: analysis.meta.fullName })
      );
    }

    const finalUrl = analysis.meta.htmlUrl || parsed.url;
    if (input) input.value = finalUrl;
    try {
      sessionStorage.setItem('paradox:verify-url', finalUrl);
    } catch {}
    history.replaceState(null, '', `/verify/?url=${encodeURIComponent(finalUrl)}`);

    if (fresh || !cached) await persist(analysis);

    if (isStale()) return;

    setStatus(
      fresh ? 'Fresh evidence investigation complete.' : 'Cached evidence investigation loaded. Run Analyze Repository to refresh evidence.'
    );
    track('verify_completed', {
      repository: analysis.meta.fullName,
      verdict: analysis.verdict,
      score: analysis.scores.paradox,
      cached: cached ? 'true' : 'false',
    });
  } catch (err) {
    if (isStale()) return;
    if (input) input.value = parsed.url;
    setStatus(err instanceof GitHubHttpError ? err.message : "We couldn't complete this analysis. Try again.");
    track('verify_failed', { repository: cleaned });
  } finally {
    if (submitButton && !isStale()) submitButton.disabled = false;
  }
}

export function bootVerify() {
  const form = document.querySelector<HTMLFormElement>('#verifyForm');
  const input = document.querySelector<HTMLInputElement>('#repoUrl');
  if (!form || !input) return;
  if (form.dataset.verifyBooted === 'true') return;
  form.dataset.verifyBooted = 'true';

  const params = new URLSearchParams(location.search);
  const saved =
    params.get('url') ||
    (() => {
      try {
        return sessionStorage.getItem('paradox:verify-url');
      } catch {
        return null;
      }
    })();
  if (saved) input.value = saved;

  input.addEventListener('input', () => {
    try {
      sessionStorage.setItem('paradox:verify-url', input.value);
    } catch {}
  });

  form.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) {
        setStatus('Enter a public GitHub repository URL.');
        input.focus();
        return;
      }
      const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      void runVerify(value, true, submitButton).catch(() => setStatus("We couldn't complete the analysis. Try again."));
    },
    true
  );

  if (saved && !params.get('url')) {
    const u = new URL(location.href);
    u.searchParams.set('url', saved);
    history.replaceState(null, '', u.pathname + u.search);
  }
}

bootVerify();
