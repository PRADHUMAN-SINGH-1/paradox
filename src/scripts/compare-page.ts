import { fetchAnalysis } from '../lib/analysis/fetch.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function row(label: string, a: unknown, b: unknown): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`;
}

function scoreBar(label: string, a: number, b: number): string {
  return `<div><span>${escapeHtml(label)}</span><i style="--v:${Math.max(0, Math.min(100, a))}%"></i><b>${escapeHtml(a)}</b><small>${escapeHtml(b)}</small></div>`;
}

function scoreCard(name: string, score: number, x: { health: number; freshness: number; documentation: number; activity: number; risk: number }, side: string): string {
  return `<article class="pp-score-card"><span class="kicker">${side} / REPOSITORY</span><h3>${escapeHtml(name)}</h3><strong>${escapeHtml(score)}/100</strong><div class="pp-score-bars">
    ${scoreBar('HEALTH', x.health, 0).replace(`<b>${x.health}</b><small>0</small>`, `<b>${x.health}</b><small></small>`)}
    ${scoreBar('FRESHNESS', x.freshness, 0).replace(`<b>${x.freshness}</b><small>0</small>`, `<b>${x.freshness}</b><small></small>`)}
    ${scoreBar('DOCS', x.documentation, 0).replace(`<b>${x.documentation}</b><small>0</small>`, `<b>${x.documentation}</b><small></small>`)}
    ${scoreBar('ACTIVITY', x.activity, 0).replace(`<b>${x.activity}</b><small>0</small>`, `<b>${x.activity}</b><small></small>`)}
    ${scoreBar('RISK', Math.max(0, 100 - x.risk), 0).replace(`<b>${Math.max(0, 100 - x.risk)}</b><small>0</small>`, `<b>${x.risk}</b><small></small>`)}
  </div></article>`;
}

export function bootCompare() {
  const form = document.querySelector<HTMLFormElement>('#compareForm');
  const left = document.querySelector<HTMLInputElement>('#repoA');
  const right = document.querySelector<HTMLInputElement>('#repoB');
  const status = document.querySelector<HTMLElement>('#compareStatus');
  const out = document.querySelector<HTMLElement>('#compareResult');
  const params = new URLSearchParams(location.search);
  if (left && params.get('left')) left.value = params.get('left')!;
  if (right && params.get('right')) right.value = params.get('right')!;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!left || !right || !status || !out) return;
    status.textContent = 'Analyzing both repositories…';
    out.hidden = true;
    track('compare_started');
    try {
      const [x, y] = await Promise.all([fetchAnalysis(parseRepoRef(left.value).url), fetchAnalysis(parseRepoRef(right.value).url)]);
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
              ${row('Verdict', x.verdict, y.verdict)}
              ${row('PARADOX SCORE', x.scores.paradox, y.scores.paradox)}
              ${row('Health', x.scores.health, y.scores.health)}
              ${row('Freshness', x.scores.freshness, y.scores.freshness)}
              ${row('Documentation', x.scores.documentation, y.scores.documentation)}
              ${row('Activity', x.scores.activity, y.scores.activity)}
              ${row('Risk (higher = more indicators)', x.scores.risk, y.scores.risk)}
              ${row('Stars', x.meta.stars, y.meta.stars)}
              ${row('Forks', x.meta.forks, y.meta.forks)}
              ${row('Open issues', x.meta.openIssues, y.meta.openIssues)}
              ${row('License', cell(x.meta.license), cell(y.meta.license))}
              ${row('Language', cell(x.meta.language), cell(y.meta.language))}
              ${row('Last push', cell(x.meta.pushedAt), cell(y.meta.pushedAt))}
              ${row('Release', cell(x.latestRelease), cell(y.latestRelease))}
              ${row('Contributors (sample)', cell(x.contributors), cell(y.contributors))}
              ${row('High-risk indicators', x.risks.filter(r=>r.severity==='HIGH').length, y.risks.filter(r=>r.severity==='HIGH').length)}
              ${row('Models/tools detected', x.detections.map(d=>d.name).join(', ') || 'Unknown', y.detections.map(d=>d.name).join(', ') || 'Unknown')}
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
      status.textContent = err instanceof Error ? err.message : "We couldn't complete this analysis. Try again.";
    }
  });

  if (params.get('left') && params.get('right')) form?.requestSubmit();
}

bootCompare();
