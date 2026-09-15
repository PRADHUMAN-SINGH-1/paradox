import type { Analysis } from './types.ts';

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function renderAnalysis(x: Analysis, opts: { compareHref?: string } = {}): string {
  const langs = Object.keys(x.languages).slice(0, 6).map(escapeHtml).join(', ') || 'Unknown';
  const dets = x.detections.length
    ? x.detections.map((d) => `<li><strong>${escapeHtml(d.name)}</strong> — ${escapeHtml(d.file)}<br/><code>${escapeHtml(d.evidence)}</code></li>`).join('')
    : '<li>No model/tool detectors matched. That is Unknown, not proof of absence.</li>';
  const risks = x.risks.length
    ? x.risks.map((r) => `<li><strong>${escapeHtml(r.severity)}</strong> ${escapeHtml(r.category)} — ${escapeHtml(r.file)}<br/>${escapeHtml(r.reason)} <code>${escapeHtml(r.evidence)}</code></li>`).join('')
    : '<li>No static risk indicators matched the current rules.</li>';
  const reasons = x.verdictReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const compare = opts.compareHref || `/compare/?left=${encodeURIComponent(x.meta.fullName)}`;
  return `
  <div class="result-head">
    <div>
      <p class="badge">${escapeHtml(x.meta.fullName)}</p>
      <h2>${escapeHtml(x.meta.name)}</h2>
      <p>${escapeHtml(x.meta.description || 'No repository description provided.')}</p>
    </div>
    <div class="verdict">${escapeHtml(x.verdict)}</div>
  </div>
  <p class="method">Method: static analysis of public GitHub evidence. Not a security certification.</p>
  <div class="metrics">
    <div class="metric"><span>PARADOX SCORE</span><b>${x.scores.paradox}/100</b></div>
    <div class="metric"><span>HEALTH</span><b>${x.scores.health}</b></div>
    <div class="metric"><span>FRESHNESS</span><b>${x.scores.freshness}</b></div>
    <div class="metric"><span>DOCS</span><b>${x.scores.documentation}</b></div>
    <div class="metric"><span>ACTIVITY</span><b>${x.scores.activity}</b></div>
    <div class="metric"><span>RISK</span><b>${x.scores.risk}</b></div>
  </div>
  <div class="columns">
    <div class="panel">
      <h3>WHY THIS VERDICT</h3>
      <ul>${reasons}</ul>
      <h3>REPOSITORY HEALTH</h3>
      <ul>
        <li>Stars: ${x.meta.stars}</li>
        <li>Forks: ${x.meta.forks}</li>
        <li>Open issues: ${x.meta.openIssues}</li>
        <li>License: ${escapeHtml(x.meta.license || 'Unknown')}</li>
        <li>Language: ${escapeHtml(x.meta.language || 'Unknown')}</li>
        <li>Last push: ${escapeHtml(x.meta.pushedAt || 'Unknown')}</li>
        <li>Archived: ${x.meta.archived ? 'yes' : 'no'}</li>
        <li>Latest release: ${escapeHtml(x.latestRelease || 'Unknown')}</li>
        <li>Contributors (sample): ${x.contributors ?? 'Unknown'}</li>
      </ul>
    </div>
    <div class="panel">
      <h3>DETECTED MODELS / TOOLS</h3>
      <ul>${dets}</ul>
      <h3>STATIC RISK INDICATORS</h3>
      <ul>${risks}</ul>
      <h3>STACK FILES OBSERVED</h3>
      <ul>${x.structure.length ? x.structure.map((p) => `<li>${escapeHtml(p)}</li>`).join('') : '<li>Unknown</li>'}</ul>
    </div>
  </div>
  <div class="panel">
    <h3>README EXCERPT (UNTRUSTED TEXT)</h3>
    <p>${escapeHtml(x.readmeExcerpt || 'Unknown')}</p>
    <p>Languages: ${langs}</p>
  </div>
  <div class="actions-row">
    <button class="save" type="button" data-save>Save this analysis</button>
    <a href="${escapeHtml(x.meta.htmlUrl)}" rel="noopener noreferrer" data-github>Open GitHub</a>
    <a href="${compare}">Compare</a>
    <a href="/agents/${escapeHtml(x.meta.owner)}/${escapeHtml(x.meta.name)}/">Agent page</a>
  </div>`;
}
