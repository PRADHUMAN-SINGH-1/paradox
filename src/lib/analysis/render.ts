import type { Analysis } from './types.ts';

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function ring(score: number, label: string): string {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return `<article class="score-ring" style="--value:${value}"><span>${value}</span><small>${label}</small></article>`;
}

function bar(label: string, score: number): string {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return `<div class="score-bar"><span>${label}</span><div><i style="width:${value}%"></i></div><b>${value}</b></div>`;
}

export function renderAnalysis(x: Analysis, opts: { compareHref?: string } = {}): string {
  const langs = Object.keys(x.languages).slice(0, 6).map(escapeHtml).join(', ') || 'Unknown';
  const dets = x.detections.length
    ? x.detections.map((d) => `<li><strong>${escapeHtml(d.name)}</strong><p>${escapeHtml(d.file)}</p><code>${escapeHtml(d.evidence)}</code></li>`).join('')
    : '<li class="empty-row">No model/tool detectors matched. Unknown is not proof of absence.</li>';
  const risks = x.risks.length
    ? x.risks.map((r) => `<li><strong>${escapeHtml(r.severity)} · ${escapeHtml(r.category)}</strong><p>${escapeHtml(r.reason)}</p><code>${escapeHtml(r.file)} · ${escapeHtml(r.evidence)}</code></li>`).join('')
    : '<li class="empty-row">No static risk indicators matched the current rules.</li>';
  const reasons = x.verdictReasons.length ? x.verdictReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('') : '<li class="empty-row">No explicit verdict reasons returned.</li>';
  const compare = opts.compareHref || `/compare/?left=${encodeURIComponent(x.meta.fullName)}`;
  const liveProfile = `/agents/view/?repo=${encodeURIComponent(x.meta.fullName)}`;
  return `
  <section class="analysis-shell">
    <div class="result-head">
      <div>
        <p class="badge">${escapeHtml(x.meta.fullName)}</p>
        <h2>${escapeHtml(x.meta.name)}</h2>
        <p>${escapeHtml(x.meta.description || 'No repository description provided.')}</p>
      </div>
      <div class="verdict" data-verdict="${escapeHtml(x.verdict.toLowerCase())}">${escapeHtml(x.verdict)}</div>
    </div>

    <div class="score-rings">${ring(x.scores.paradox, 'PARADOX')} ${ring(x.scores.health, 'HEALTH')} ${ring(x.scores.freshness, 'FRESHNESS')} ${ring(x.scores.documentation, 'DOCS')} ${ring(x.scores.activity, 'ACTIVITY')} ${ring(x.scores.risk, 'RISK')}</div>

    <div class="score-bars">
      ${bar('Health', x.scores.health)}
      ${bar('Freshness', x.scores.freshness)}
      ${bar('Documentation', x.scores.documentation)}
      ${bar('Activity', x.scores.activity)}
      ${bar('Risk indicator load', x.scores.risk)}
    </div>

    <div class="columns">
      <div class="panel">
        <h3>VERDICT EVIDENCE</h3>
        <ul>${reasons}</ul>
        <h3>REPOSITORY TELEMETRY</h3>
        <ul>
          <li>Stars: ${x.meta.stars}</li>
          <li>Forks: ${x.meta.forks}</li>
          <li>Open issues: ${x.meta.openIssues}</li>
          <li>License: ${escapeHtml(x.meta.license || 'Unknown')}</li>
          <li>Primary language: ${escapeHtml(x.meta.language || 'Unknown')}</li>
          <li>Last push: ${escapeHtml(x.meta.pushedAt || 'Unknown')}</li>
          <li>Archived: ${x.meta.archived ? 'yes' : 'no'}</li>
          <li>Latest release: ${escapeHtml(x.latestRelease || 'Unknown')}</li>
          <li>Contributors (sample): ${x.contributors ?? 'Unknown'}</li>
        </ul>
      </div>
      <div class="panel">
        <h3>DETECTED MODELS / TOOLS</h3>
        <ul class="rich-list">${dets}</ul>
        <h3>STATIC RISK INDICATORS</h3>
        <ul class="rich-list">${risks}</ul>
      </div>
    </div>

    <div class="panel wide">
      <h3>STACK FILES OBSERVED</h3>
      <div class="chip-wrap">${x.structure.length ? x.structure.map((p) => `<span>${escapeHtml(p)}</span>`).join('') : '<span>Unknown</span>'}</div>
      <h3>README EXCERPT (UNTRUSTED TEXT)</h3>
      <p>${escapeHtml(x.readmeExcerpt || 'Unknown')}</p>
      <p class="method">Languages observed: ${langs}</p>
    </div>

    <div class="actions-row">
      <button class="save" type="button" data-save>Save analysis</button>
      <a href="${escapeHtml(x.meta.htmlUrl)}" target="_blank" rel="noopener noreferrer" data-github>Open GitHub</a>
      <a href="${compare}">Compare</a>
      <a href="${liveProfile}">Agent page</a>
    </div>
    <p class="method">Method: static analysis of public GitHub evidence. Not a security certification.</p>
  </section>`;
}
