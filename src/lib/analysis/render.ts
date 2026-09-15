import type { Analysis } from './types.ts';

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function verdictLabel(verdict: Analysis['verdict']): string {
  switch (verdict) {
    case 'VERIFIED': return 'EVIDENCE-SUPPORTED';
    case 'QUESTIONABLE': return 'NEEDS REVIEW';
    case 'STALE': return 'STALE EVIDENCE';
    case 'HIGH-RISK': return 'HIGH-RISK SIGNALS';
    default: return 'UNKNOWN';
  }
}

function scoreWord(value: number): string {
  if (value >= 80) return 'Strong';
  if (value >= 60) return 'Healthy';
  if (value >= 40) return 'Mixed';
  return 'Limited';
}

export function renderAnalysis(x: Analysis, opts: { compareHref?: string } = {}): string {
  const langs = Object.keys(x.languages).slice(0, 6).map(escapeHtml).join(', ') || 'Unknown';
  const dets = x.detections.length
    ? x.detections.map((d) => `<li><strong>${escapeHtml(d.name)}</strong><span class="evidence-file">${escapeHtml(d.file)}</span><br/><code>${escapeHtml(d.evidence)}</code></li>`).join('')
    : '<li>No model/tool detectors matched. That is Unknown, not proof of absence.</li>';
  const risks = x.risks.length
    ? x.risks.map((r) => `<li><strong>${escapeHtml(r.severity)} · ${escapeHtml(r.category)}</strong><span class="evidence-file">${escapeHtml(r.file)}</span><br/>${escapeHtml(r.reason)}<br/><code>${escapeHtml(r.evidence)}</code></li>`).join('')
    : '<li>No static risk indicators matched the current rules.</li>';
  const reasons = x.verdictReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const compare = opts.compareHref || `/compare/?left=${encodeURIComponent(x.meta.fullName)}`;
  const liveProfile = `/agents/view/?repo=${encodeURIComponent(x.meta.fullName)}`;
  const score = (n: number) => Math.max(0, Math.min(100, n));
  const observedSignals = x.structure.length + x.detections.length + x.risks.length + x.verdictReasons.length;
  const highRisks = x.risks.filter((r) => r.severity === 'HIGH').length;
  return `
  <section class="result-head" aria-label="Analysis summary">
    <div>
      <p class="badge">${escapeHtml(x.meta.fullName)}</p>
      <h2>${escapeHtml(x.meta.name)}</h2>
      <p>${escapeHtml(x.meta.description || 'No repository description provided.')}</p>
      <div class="result-facts"><span>${scoreWord(x.scores.health)} health</span><span>${scoreWord(x.scores.documentation)} documentation</span><span>${x.meta.archived ? 'Archived' : 'Active repository'}</span></div>
    </div>
    <div class="verdict" title="This summarizes the evidence found by PARADOX. It is not a security certification.">${escapeHtml(verdictLabel(x.verdict))}</div>
  </section>

  <section class="result-summary" aria-label="How to read this analysis">
    <div><span>WHAT THIS IS</span><strong>Evidence summary</strong><p>Public GitHub metadata, repository structure and static signals observed at analysis time.</p></div>
    <div><span>WHAT IT IS NOT</span><strong>Not a security review</strong><p>No guarantee of safety, correctness, reliability or absence of hidden behavior.</p></div>
    <div><span>BEST NEXT STEP</span><strong>Review the evidence</strong><p>Use the details below before deciding whether the project fits your use case.</p></div>
  </section>

  <p class="method"><strong>Evidence status:</strong> ${escapeHtml(verdictLabel(x.verdict))}. Based on the selected public GitHub evidence available at analysis time.</p>

  <div class="metrics">
    <div class="metric" style="--score:${score(x.scores.paradox)}"><span>PARADOX SCORE</span><b>${x.scores.paradox}/100</b></div>
    <div class="metric" style="--score:${score(x.scores.health)}"><span>HEALTH</span><b>${x.scores.health}</b></div>
    <div class="metric" style="--score:${score(x.scores.freshness)}"><span>FRESHNESS</span><b>${x.scores.freshness}</b></div>
    <div class="metric" style="--score:${score(x.scores.documentation)}"><span>DOCS</span><b>${x.scores.documentation}</b></div>
    <div class="metric" style="--score:${score(x.scores.activity)}"><span>ACTIVITY</span><b>${x.scores.activity}</b></div>
    <div class="metric" style="--score:${score(100 - Math.min(100, x.scores.risk))}"><span>RISK</span><b>${x.scores.risk}</b></div>
  </div>

  <div class="si-trust-grid" aria-label="Evidence profile">
    <article class="si-trust-card"><span>OBSERVED SIGNALS</span><strong>${observedSignals}</strong><p>Repository structure, detectors, risk rules and verdict evidence currently observed.</p></article>
    <article class="si-trust-card"><span>HIGH-RISK INDICATORS</span><strong>${highRisks}</strong><p>High-severity static indicators matched by the current analysis rules.</p></article>
    <article class="si-trust-card"><span>MODELS / TOOLS</span><strong>${x.detections.length}</strong><p>Detected model or tool signals. No match is treated as unknown, not proof of absence.</p></article>
    <article class="si-trust-card"><span>REPOSITORY EVIDENCE</span><strong>${x.structure.length}</strong><p>Selected files and paths contributing to the current evidence profile.</p></article>
  </div>

  <div class="columns">
    <div class="panel">
      <h3>WHY THIS EVIDENCE STATUS</h3>
      <ul>${reasons}</ul>
      <h3>REPOSITORY HEALTH</h3>
      <ul>
        <li>Stars: ${x.meta.stars}</li><li>Forks: ${x.meta.forks}</li><li>Open issues: ${x.meta.openIssues}</li>
        <li>License: ${escapeHtml(x.meta.license || 'Unknown')}</li><li>Primary language: ${escapeHtml(x.meta.language || 'Unknown')}</li>
        <li>Last push: ${escapeHtml(x.meta.pushedAt || 'Unknown')}</li><li>Archived: ${x.meta.archived ? 'yes' : 'no'}</li>
        <li>Latest release: ${escapeHtml(x.latestRelease || 'Unknown')}</li><li>Contributors (sample): ${x.contributors ?? 'Unknown'}</li>
      </ul>
    </div>
    <div class="panel">
      <h3>DETECTED MODELS / TOOLS</h3><ul>${dets}</ul>
      <h3>STATIC RISK INDICATORS</h3><ul>${risks}</ul>
      <h3>STACK FILES OBSERVED</h3><ul>${x.structure.length ? x.structure.map((p) => `<li>${escapeHtml(p)}</li>`).join('') : '<li>Unknown</li>'}</ul>
    </div>
  </div>

  <div class="panel"><h3>README EXCERPT · UNTRUSTED TEXT</h3><p>${escapeHtml(x.readmeExcerpt || 'Unknown')}</p><p><strong>Languages:</strong> ${langs}</p></div>
  <div class="actions-row" aria-label="Analysis actions"><button class="save" type="button" data-save>Save this analysis</button><a href="${escapeHtml(x.meta.htmlUrl)}" target="_blank" rel="noopener noreferrer" data-github>Open GitHub ↗</a><a href="${compare}">Compare agents</a><a href="${liveProfile}">Open agent page</a><a href="/verify/?url=${encodeURIComponent(x.meta.htmlUrl)}">Run fresh analysis</a></div>`;
}
