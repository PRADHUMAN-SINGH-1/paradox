import { fetchAnalysis } from '../lib/analysis/fetch.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function row(label: string, a: unknown, b: unknown): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`;
}

function scoreBar(label: string, a: number): string {
  return `<div><span>${escapeHtml(label)}</span><i style="--v:${Math.max(0, Math.min(100, a))}%"></i><b>${escapeHtml(a)}</b></div>`;
}

function scoreCard(name: string, score: number, x: { health: number; freshness: number; documentation: number; activity: number; risk: number }, side: string): string {
  return `<article class="pp-score-card"><span class="kicker">${side} / REPOSITORY</span><h3>${escapeHtml(name)}</h3><strong>${escapeHtml(score)}/100</strong><div class="pp-score-bars">
    ${scoreBar('HEALTH', x.health)}
    ${scoreBar('FRESHNESS', x.freshness)}
    ${scoreBar('DOCS', x.documentation)}
    ${scoreBar('ACTIVITY', x.activity)}
    ${scoreBar('LOWER RISK SIGNALS', Math.max(0, 100 - x.risk))}
  </div></article>`;
}

function showError(status: HTMLElement, out: HTMLElement, message: string) {
  out.innerHTML = `<div class="panel"><h2>Comparison could not be completed.</h2><p>${escapeHtml(message)}</p><p>Use two public <strong>github.com/owner/repository</strong> URLs and try again.</p></div>`;
  out.hidden = false;
  status.textContent = 'Compare needs another attempt.';
}

export function bootCompare() {
  const form = document.querySelector<HTMLFormElement>('#compareForm');
  const left = document.querySelector<HTMLInputElement>('#repoA');
  const right = document.querySelector<HTMLInputElement>('#repoB');
  const status = document.querySelector<HTMLElement>('#compareStatus');
  const out = document.querySelector<HTMLElement>('#compareResult');
  const params = new URLSearchParams(location.search);
  if (!form || !left || !right || !status || !out) return;
  const leftParam = params.get('left');
  const rightParam = params.get('right');
  if (leftParam) left.value = leftParam;
  if (rightParam) right.value = rightParam;
  if (leftParam && !rightParam) {
    status.textContent = 'Repository A loaded. Add a second public GitHub repository to compare.';
    window.setTimeout(() => right.focus(), 80);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    out.hidden = true;
    status.textContent = 'Validating repositories…';
    track('compare_started');
    let leftRef: ReturnType<typeof parseRepoRef>;
    let rightRef: ReturnType<typeof parseRepoRef>;
    try {
      leftRef = parseRepoRef(left.value);
      rightRef = parseRepoRef(right.value);
      if (leftRef.fullName.toLowerCase() === rightRef.fullName.toLowerCase()) {
        throw new Error('Choose two different repositories to compare.');
      }
    } catch (err) {
      showError(status, out, err instanceof Error ? err.message : 'Enter two valid public GitHub repositories.');
      return;
    }

    left.disabled = true;
    right.disabled = true;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'Comparing…'; }
    try {
      const [x, y] = await Promise.all([
        fetchAnalysis(leftRef.url),
        fetchAnalysis(rightRef.url),
      ]);
      const cell = (v: unknown) => (v == null || v === '' ? 'Unknown' : String(v));
      out.innerHTML = `
        <div class="pp-compare-summary">
          ${scoreCard(x.meta.fullName, x.scores.paradox, x.scores, '01')}
          <div class="pp-vs-core">VS</div>
          ${scoreCard(y.meta.fullName, y.scores.paradox, y.scores, '02')}
        </div>
        <div class="table-wrap">
          <table class="compare-table">
            <thead><tr><th>Signal</th><th>${escapeHtml(x.meta.fullName)}</th><th>${escapeHtml(y.meta.fullName)}</th></tr></thead>
            <tbody>
              ${row('Evidence status', x.verdict, y.verdict)}
              ${row('PARADOX SCORE', x.scores.paradox, y.scores.paradox)}
              ${row('Health', x.scores.health, y.scores.health)}
              ${row('Freshness', x.scores.freshness, y.scores.freshness)}
              ${row('Documentation', x.scores.documentation, y.scores.documentation)}
              ${row('Activity', x.scores.activity, y.scores.activity)}
              ${row('Risk indicators', x.scores.risk, y.scores.risk)}
              ${row('Stars', x.meta.stars, y.meta.stars)}
              ${row('Forks', x.meta.forks, y.meta.forks)}
              ${row('Open issues', x.meta.openIssues, y.meta.openIssues)}
              ${row('License', cell(x.meta.license), cell(y.meta.license))}
              ${row('Language', cell(x.meta.language), cell(y.meta.language))}
              ${row('Last push', cell(x.meta.pushedAt), cell(y.meta.pushedAt))}
              ${row('Release', cell(x.latestRelease), cell(y.latestRelease))}
              ${row('Contributors (sample)', cell(x.contributors), cell(y.contributors))}
              ${row('High-risk indicators', x.risks.filter((r) => r.severity === 'HIGH').length, y.risks.filter((r) => r.severity === 'HIGH').length)}
              ${row('Models/tools detected', x.detections.map((d) => d.name).join(', ') || 'Unknown', y.detections.map((d) => d.name).join(', ') || 'Unknown')}
            </tbody>
          </table>
        </div>
        <p class="method">Missing values are shown as Unknown. This is static analysis, not a ranking of safety.</p>
        <p><a href="/verify/?url=${encodeURIComponent(x.meta.htmlUrl)}">Open ${escapeHtml(x.meta.fullName)}</a> · <a href="/verify/?url=${encodeURIComponent(y.meta.htmlUrl)}">Open ${escapeHtml(y.meta.fullName)}</a></p>`;
      out.hidden = false;
      status.textContent = 'Comparison complete.';
      history.replaceState(null, '', `/compare/?left=${encodeURIComponent(x.meta.fullName)}&right=${encodeURIComponent(y.meta.fullName)}`);
      track('compare_completed', { repository: `${x.meta.fullName},${y.meta.fullName}` });
    } catch (err) {
      showError(status, out, err instanceof Error ? err.message : "We couldn't complete this comparison. Try again.");
      track('compare_failed');
    } finally {
      left.disabled = false;
      right.disabled = false;
      if (submit) { submit.disabled = false; submit.textContent = 'Compare'; }
    }
  });

  if (leftParam && rightParam) form.requestSubmit();
}

bootCompare();
