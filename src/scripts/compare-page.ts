import { fetchAnalysis } from '../lib/analysis/fetch.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';

function row(label: string, a: string, b: string): string {
  return `<tr><th>${label}</th><td>${a}</td><td>${b}</td></tr>`;
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
    status.dataset.state = 'loading';
    out.hidden = true;
    track('compare_started');
    try {
      const [x, y] = await Promise.all([fetchAnalysis(parseRepoRef(left.value).url), fetchAnalysis(parseRepoRef(right.value).url)]);
      const cell = (v: unknown) => (v == null || v === '' ? 'Unknown' : String(v));
      out.innerHTML = `
        <div class="table-wrap">
          <table class="compare-table">
            <thead><tr><th>Signal</th><th>${x.meta.fullName}</th><th>${y.meta.fullName}</th></tr></thead>
            <tbody>
              ${row('Verdict', x.verdict, y.verdict)}
              ${row('PARADOX SCORE', String(x.scores.paradox), String(y.scores.paradox))}
              ${row('Health', String(x.scores.health), String(y.scores.health))}
              ${row('Freshness', String(x.scores.freshness), String(y.scores.freshness))}
              ${row('Documentation', String(x.scores.documentation), String(y.scores.documentation))}
              ${row('Activity', String(x.scores.activity), String(y.scores.activity))}
              ${row('Risk (higher = more indicators)', String(x.scores.risk), String(y.scores.risk))}
              ${row('Stars', String(x.meta.stars), String(y.meta.stars))}
              ${row('Forks', String(x.meta.forks), String(y.meta.forks))}
              ${row('Open issues', String(x.meta.openIssues), String(y.meta.openIssues))}
              ${row('License', cell(x.meta.license), cell(y.meta.license))}
              ${row('Language', cell(x.meta.language), cell(y.meta.language))}
              ${row('Last push', cell(x.meta.pushedAt), cell(y.meta.pushedAt))}
              ${row('Release', cell(x.latestRelease), cell(y.latestRelease))}
              ${row('Contributors (sample)', cell(x.contributors), cell(y.contributors))}
              ${row('High-risk indicators', String(x.risks.filter(r=>r.severity==='HIGH').length), String(y.risks.filter(r=>r.severity==='HIGH').length))}
              ${row('Models/tools detected', x.detections.map(d=>d.name).join(', ') || 'Unknown', y.detections.map(d=>d.name).join(', ') || 'Unknown')}
            </tbody>
          </table>
        </div>
        <p class="method">Missing values are shown as Unknown. This is static analysis, not a ranking of safety.</p>
        <p><a href="/verify/?url=${encodeURIComponent(x.meta.htmlUrl)}">Open ${x.meta.fullName}</a> · <a href="/verify/?url=${encodeURIComponent(y.meta.htmlUrl)}">Open ${y.meta.fullName}</a></p>`;
      out.hidden = false;
      status.textContent = 'Comparison complete.';
      status.dataset.state = 'success';
      history.replaceState(null, '', `/compare/?left=${encodeURIComponent(x.meta.fullName)}&right=${encodeURIComponent(y.meta.fullName)}`);
      track('compare_completed', { repository: `${x.meta.fullName},${y.meta.fullName}` });
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : "We couldn't complete this analysis. Try again.";
      status.dataset.state = 'error';
    }
  });

  if (params.get('left') && params.get('right')) form?.requestSubmit();
}

bootCompare();
