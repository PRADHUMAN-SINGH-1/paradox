import { fetchAnalysis } from '../lib/analysis/fetch.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';

function row(label: string, a: string, b: string, delta = ''): string {
  return `<tr><th>${label}</th><td>${a}</td><td>${b}</td><td>${delta}</td></tr>`;
}

function esc(s: string): string {
  return String(s || '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function scoreBar(label: string, a: number, b: number): string {
  const safeA = Math.max(0, Math.min(100, Number(a) || 0));
  const safeB = Math.max(0, Math.min(100, Number(b) || 0));
  return `<article class="compare-metric"><header><span>${label}</span><b>${safeA} vs ${safeB}</b></header><div><i style="width:${safeA}%"></i><i style="width:${safeB}%"></i></div></article>`;
}

function setState(status: HTMLElement, state: 'idle' | 'loading' | 'success' | 'error', text: string) {
  status.dataset.state = state;
  status.textContent = text;
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
    setState(status, 'loading', 'Scanning repositories and building comparison graph…');
    out.hidden = true;
    out.innerHTML = '<div class="loading-matrix" aria-hidden="true"></div>';
    track('compare_started');
    try {
      const [x, y] = await Promise.all([fetchAnalysis(parseRepoRef(left.value).url), fetchAnalysis(parseRepoRef(right.value).url)]);
      const cell = (v: unknown) => (v == null || v === '' ? 'Unknown' : String(v));
      const delta = (a: number, b: number) => {
        const diff = (Number(a) || 0) - (Number(b) || 0);
        if (!diff) return '0';
        return `${diff > 0 ? '+' : ''}${diff}`;
      };
      out.innerHTML = `
        <section class="compare-shell">
          <div class="compare-repos">
            <article><span>Repository A</span><h2>${esc(x.meta.fullName)}</h2><p>${esc(x.meta.description || 'No repository description provided.')}</p></article>
            <article><span>Repository B</span><h2>${esc(y.meta.fullName)}</h2><p>${esc(y.meta.description || 'No repository description provided.')}</p></article>
          </div>
          <div class="compare-bars">
            ${scoreBar('PARADOX SCORE', x.scores.paradox, y.scores.paradox)}
            ${scoreBar('HEALTH', x.scores.health, y.scores.health)}
            ${scoreBar('FRESHNESS', x.scores.freshness, y.scores.freshness)}
            ${scoreBar('DOCUMENTATION', x.scores.documentation, y.scores.documentation)}
            ${scoreBar('ACTIVITY', x.scores.activity, y.scores.activity)}
            ${scoreBar('RISK', x.scores.risk, y.scores.risk)}
          </div>
          <div class="table-wrap">
            <table class="compare-table">
              <thead><tr><th>Signal</th><th>${esc(x.meta.fullName)}</th><th>${esc(y.meta.fullName)}</th><th>Delta</th></tr></thead>
              <tbody>
                ${row('Verdict', esc(x.verdict), esc(y.verdict))}
                ${row('PARADOX SCORE', String(x.scores.paradox), String(y.scores.paradox), delta(x.scores.paradox, y.scores.paradox))}
                ${row('Health', String(x.scores.health), String(y.scores.health), delta(x.scores.health, y.scores.health))}
                ${row('Freshness', String(x.scores.freshness), String(y.scores.freshness), delta(x.scores.freshness, y.scores.freshness))}
                ${row('Documentation', String(x.scores.documentation), String(y.scores.documentation), delta(x.scores.documentation, y.scores.documentation))}
                ${row('Activity', String(x.scores.activity), String(y.scores.activity), delta(x.scores.activity, y.scores.activity))}
                ${row('Risk (higher = more indicators)', String(x.scores.risk), String(y.scores.risk), delta(x.scores.risk, y.scores.risk))}
                ${row('Stars', String(x.meta.stars), String(y.meta.stars), delta(x.meta.stars, y.meta.stars))}
                ${row('Forks', String(x.meta.forks), String(y.meta.forks), delta(x.meta.forks, y.meta.forks))}
                ${row('Open issues', String(x.meta.openIssues), String(y.meta.openIssues), delta(x.meta.openIssues, y.meta.openIssues))}
                ${row('License', cell(x.meta.license), cell(y.meta.license))}
                ${row('Language', cell(x.meta.language), cell(y.meta.language))}
                ${row('Last push', cell(x.meta.pushedAt), cell(y.meta.pushedAt))}
                ${row('Release', cell(x.latestRelease), cell(y.latestRelease))}
                ${row('Contributors (sample)', cell(x.contributors), cell(y.contributors), delta(Number(x.contributors), Number(y.contributors)))}
                ${row('High-risk indicators', String(x.risks.filter((r)=>r.severity==='HIGH').length), String(y.risks.filter((r)=>r.severity==='HIGH').length), delta(x.risks.filter((r)=>r.severity==='HIGH').length, y.risks.filter((r)=>r.severity==='HIGH').length))}
                ${row('Models/tools detected', esc(x.detections.map((d)=>d.name).join(', ') || 'Unknown'), esc(y.detections.map((d)=>d.name).join(', ') || 'Unknown'))}
              </tbody>
            </table>
          </div>
          <p class="method">Unknown means missing evidence from public metadata. This is static analysis, not a safety ranking.</p>
          <p><a href="/verify/?url=${encodeURIComponent(x.meta.htmlUrl)}">Open ${esc(x.meta.fullName)}</a> · <a href="/verify/?url=${encodeURIComponent(y.meta.htmlUrl)}">Open ${esc(y.meta.fullName)}</a></p>
        </section>`;
      out.hidden = false;
      setState(status, 'success', 'Comparison complete. Review score deltas and evidence table below.');
      history.replaceState(null, '', `/compare/?left=${encodeURIComponent(x.meta.fullName)}&right=${encodeURIComponent(y.meta.fullName)}`);
      track('compare_completed', { repository: `${x.meta.fullName},${y.meta.fullName}` });
    } catch (err) {
      setState(status, 'error', err instanceof Error ? err.message : "We couldn't complete this analysis. Try again.");
    }
  });

  if (params.get('left') && params.get('right')) form?.requestSubmit();
}

bootCompare();
