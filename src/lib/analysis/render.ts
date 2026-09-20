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

function verdictTone(verdict: Analysis['verdict']): string {
  switch (verdict) {
    case 'VERIFIED': return 'verified';
    case 'HIGH-RISK': return 'danger';
    case 'STALE': return 'stale';
    default: return 'review';
  }
}

function scoreWord(value: number): string {
  if (value >= 80) return 'Strong';
  if (value >= 60) return 'Healthy';
  if (value >= 40) return 'Mixed';
  return 'Limited';
}

function list(items: string[], empty = 'None observed from the supplied evidence.'): string {
  return items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : `<li class="vx-empty">${escapeHtml(empty)}</li>`;
}

function metric(label: string, value: string | number, tone = ''): string {
  return `<article class="vx-metric ${tone ? `vx-metric--${tone}` : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></article>`;
}

export function renderAnalysis(x: Analysis, opts: { compareHref?: string } = {}): string {
  const compare = opts.compareHref || `/compare/?left=${encodeURIComponent(x.meta.fullName)}`;
  const liveProfile = `/agents/view/?repo=${encodeURIComponent(x.meta.fullName)}`;
  const selectedFiles = Math.min(x.coverage.selectedFiles, x.coverage.maxFiles);
  const coverageLabel = `${selectedFiles}/${x.coverage.maxFiles}`;
  const observedSignals = x.structure.length + x.detections.length + x.risks.length + x.verdictReasons.length;
  const highRisks = x.risks.filter((r) => r.severity === 'HIGH').length;
  const langs = Object.keys(x.languages).slice(0, 6).map(escapeHtml).join(', ') || 'Unknown';

  const detections = x.detections.map((d) => `
    <li class="vx-finding">
      <div><strong>${escapeHtml(d.name)}</strong><span class="vx-tag">${escapeHtml(d.category)}</span></div>
      <small>${escapeHtml(d.file)}</small>
      <code>${escapeHtml(d.evidence)}</code>
    </li>`).join('');

  const risks = x.risks.map((r) => `
    <li class="vx-finding vx-finding--risk vx-risk--${r.severity.toLowerCase()}">
      <div><strong>${escapeHtml(r.category)}</strong><span class="vx-tag">${escapeHtml(r.severity)}</span></div>
      <small>${escapeHtml(r.file)}</small>
      <p>${escapeHtml(r.reason)}</p>
      <code>${escapeHtml(r.evidence)}</code>
    </li>`).join('');

  const ai = x.intelligence;
  const aiReady = Boolean(ai && ai.status !== 'UNAVAILABLE');
  const aiStatus = aiReady ? 'LIVE' : 'STANDBY';
  const aiProvider = ai?.provider ? ai.provider.toUpperCase() : 'NO PROVIDER';
  const aiPanel = ai
    ? `
      <section class="vx-card vx-card--ai">
        <div class="vx-card-head">
          <div>
            <span class="vx-eyebrow">INTELLIGENCE LAYER</span>
            <h3>AI Evidence Review</h3>
          </div>
          <div class="vx-status vx-status--${aiReady ? 'live' : 'idle'}"><i></i>${aiStatus}</div>
        </div>
        <div class="vx-ai-summary">
          <strong>${escapeHtml(ai.confidence)} CONFIDENCE</strong>
          <p>${escapeHtml(ai.summary || 'The supplied repository evidence was cross-checked.')}</p>
        </div>
        <div class="vx-three-col">
          <div><span class="vx-mini-label">CONFIRMED</span><ul>${list(ai.confirmed)}</ul></div>
          <div><span class="vx-mini-label">NEEDS REVIEW</span><ul>${list(ai.needsReview)}</ul></div>
          <div><span class="vx-mini-label">CONTRADICTIONS</span><ul>${list(ai.contradictions, 'No documentation/evidence contradiction observed.')}</ul></div>
        </div>
        <footer class="vx-card-foot"><span>Provider: ${escapeHtml(aiProvider)}</span><span>Evidence-only reasoning · no repository execution</span></footer>
      </section>`
    : `
      <section class="vx-card vx-card--ai vx-card--idle">
        <div class="vx-card-head">
          <div>
            <span class="vx-eyebrow">INTELLIGENCE LAYER</span>
            <h3>AI Evidence Review</h3>
          </div>
          <div class="vx-status vx-status--idle"><i></i>STANDBY</div>
        </div>
        <div class="vx-ai-empty">
          <strong>Static verification completed.</strong>
          <p>No AI provider response was available for this run. The result below is still generated from repository evidence and deterministic rules.</p>
        </div>
        <footer class="vx-card-foot"><span>Provider: unavailable</span><span>No AI conclusion was fabricated</span></footer>
      </section>`;

  return `
  <section class="vx-result" aria-label="Repository verification result">
    <header class="vx-hero">
      <div class="vx-identity">
        <div class="vx-kicker"><span>PARADOX VERIFY</span><span>ANALYSIS ${escapeHtml(x.analyzedAt.replace('T', ' ').replace('Z', ' UTC'))}</span></div>
        <div class="vx-title-row">
          <div>
            <p class="vx-repo">${escapeHtml(x.meta.fullName)}</p>
            <h2>${escapeHtml(x.meta.name)}</h2>
          </div>
          <span class="vx-verdict vx-verdict--${verdictTone(x.verdict)}">${escapeHtml(verdictLabel(x.verdict))}</span>
        </div>
        <p class="vx-description">${escapeHtml(x.meta.description || 'No repository description provided.')}</p>
        <div class="vx-inline-meta"><span>${escapeHtml(x.meta.language || 'Unknown')}</span><span>${x.meta.archived ? 'ARCHIVED' : 'ACTIVE'}</span><span>${scoreWord(x.scores.health)} health</span><span>${scoreWord(x.scores.documentation)} documentation</span></div>
      </div>
      <aside class="vx-score-box">
        <span>PARADOX SCORE</span>
        <strong>${x.scores.paradox}</strong><small>/ 100</small>
        <p>Composite from observable public repository evidence.</p>
      </aside>
    </header>

    <section class="vx-engine-grid" aria-label="Analysis engines">
      <article class="vx-engine"><span>STATIC CORE</span><strong>READY</strong><small>Metadata, structure, rules and scoring</small></article>
      <article class="vx-engine"><span>AI REVIEW</span><strong>${escapeHtml(aiStatus)}</strong><small>${escapeHtml(aiProvider)} evidence cross-check</small></article>
      <article class="vx-engine"><span>COVERAGE</span><strong>${escapeHtml(coverageLabel)}</strong><small>Bounded source-file sample from recursive tree</small></article>
      <article class="vx-engine"><span>HIGH-RISK</span><strong>${highRisks}</strong><small>High-severity security indicators</small></article>
    </section>

    <section class="vx-metrics" aria-label="Verification metrics">
      ${metric('HEALTH', x.scores.health, x.scores.health >= 70 ? 'good' : 'neutral')}
      ${metric('FRESHNESS', x.scores.freshness)}
      ${metric('DOCUMENTATION', x.scores.documentation, x.scores.documentation >= 70 ? 'good' : 'neutral')}
      ${metric('ACTIVITY', x.scores.activity, x.scores.activity >= 60 ? 'good' : 'neutral')}
      ${metric('RISK', x.scores.risk, x.scores.risk === 0 ? 'good' : 'risk')}
      ${metric('SIGNALS', observedSignals)}
    </section>

    <section class="vx-grid vx-grid--lead">
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">DECISION TRACE</span><h3>Why this result</h3></div></div>
        <ul class="vx-reasons">${list(x.verdictReasons, 'No additional verdict reasons were produced.')}</ul>
        <div class="vx-rule"><span>Scoring model</span><strong>35% health · 20% freshness · 15% docs · 15% activity · 15% inverted risk</strong></div>
      </article>
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">REPOSITORY PROFILE</span><h3>Observable facts</h3></div></div>
        <div class="vx-facts">
          <span><b>Stars</b><strong>${x.meta.stars}</strong></span>
          <span><b>Forks</b><strong>${x.meta.forks}</strong></span>
          <span><b>Open issues</b><strong>${x.meta.openIssues}</strong></span>
          <span><b>Contributors</b><strong>${x.contributors ?? 'Unknown'}</strong></span>
          <span><b>Recent commits</b><strong>${x.recentCommitCount ?? 'Unknown'}</strong></span>
          <span><b>License</b><strong>${escapeHtml(x.meta.license || 'Unknown')}</strong></span>
          <span><b>Last push</b><strong>${escapeHtml(x.meta.pushedAt || 'Unknown')}</strong></span>
          <span><b>Release</b><strong>${escapeHtml(x.latestRelease || 'Unknown')}</strong></span>
        </div>
      </article>
    </section>

    ${aiPanel}

    <section class="vx-grid vx-grid--findings">
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">IMPLEMENTATION SIGNALS</span><h3>Models & tools</h3></div><strong class="vx-count">${x.detections.length}</strong></div>
        <ul class="vx-findings">${detections || '<li class="vx-empty">No model/tool implementation signals were confirmed in the sampled files.</li>'}</ul>
      </article>
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">SECURITY SURFACE</span><h3>Risk indicators</h3></div><strong class="vx-count vx-count--${highRisks ? 'risk' : 'good'}">${x.risks.length}</strong></div>
        <ul class="vx-findings">${risks || '<li class="vx-empty vx-empty--good">No security-relevant static risk indicators matched the current rules.</li>'}</ul>
      </article>
    </section>

    <details class="vx-drawer" open>
      <summary><span>INSPECTED FILES</span><b>${x.structure.length}</b><i>OPEN</i></summary>
      <div class="vx-file-grid">${x.structure.map((p) => `<code>${escapeHtml(p)}</code>`).join('') || '<span class="vx-empty">No file paths were returned.</span>'}</div>
    </details>

    <details class="vx-drawer">
      <summary><span>README / PROJECT CONTEXT</span><b>UNTRUSTED TEXT</b><i>OPEN</i></summary>
      <div class="vx-readme"><p>${escapeHtml(x.readmeExcerpt || 'Unknown')}</p><span>Languages: ${langs}</span></div>
    </details>

    <footer class="vx-actions">
      <button class="save" type="button" data-save>Save analysis</button>
      <a href="${escapeHtml(x.meta.htmlUrl)}" target="_blank" rel="noopener noreferrer" data-github>Open GitHub ↗</a>
      <a href="${compare}">Compare</a>
      <a href="${liveProfile}">Agent page</a>
      <a href="/verify/?url=${encodeURIComponent(x.meta.htmlUrl)}">Run fresh analysis</a>
    </footer>
  </section>`;
}
