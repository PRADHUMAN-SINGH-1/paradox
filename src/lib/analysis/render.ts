import type { Analysis, EvidenceClaim } from './types.ts';
import { evidenceQuality } from './scores.ts';

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
  return items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : `<li class="vx-empty">${escapeHtml(empty)}</li>`;
}

function metric(label: string, value: string | number, tone = ''): string {
  return `<article class="vx-metric ${tone ? `vx-metric--${tone}` : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></article>`;
}

function claimTone(status: EvidenceClaim['status']): string {
  return status === 'CONFIRMED' ? 'good' : status === 'CONTRADICTED' ? 'risk' : 'neutral';
}

function claimCard(claim: EvidenceClaim): string {
  const refs = claim.evidence.length
    ? claim.evidence.map((ref) => `
        <div class="vx-evidence-ref">
          <div><code>${escapeHtml(ref.file)}:${ref.line}</code><span>${escapeHtml(ref.quote)}</span></div>
        </div>`).join('')
    : '<div class="vx-evidence-ref vx-evidence-ref--empty">No validated file evidence attached.</div>';

  return `
    <article class="vx-claim vx-claim--${claimTone(claim.status)}">
      <div class="vx-claim-head">
        <div>
          <span class="vx-claim-id">${escapeHtml(claim.id)}</span>
          <h4>${escapeHtml(claim.claim)}</h4>
        </div>
        <div class="vx-claim-badges">
          <span class="vx-tag">${escapeHtml(claim.status)}</span>
          <span class="vx-tag">${escapeHtml(claim.confidence)} CONFIDENCE</span>
        </div>
      </div>
      <div class="vx-evidence-list">${refs}</div>
    </article>`;
}

export function renderAnalysis(x: Analysis, opts: { compareHref?: string } = {}): string {
  const compare = opts.compareHref || `/compare/?left=${encodeURIComponent(x.meta.fullName)}`;
  const liveProfile = `/agents/view/?repo=${encodeURIComponent(x.meta.fullName)}`;
  const selectedFiles = Math.min(x.coverage.selectedFiles, x.coverage.maxFiles || 64);
  const maxFiles = x.coverage.maxFiles || 64;
  const coverageLabel = `${selectedFiles}/${maxFiles}`;
  const highRisks = x.risks.filter((r) => r.severity === 'HIGH').length;
  const ai = x.intelligence;
  const aiReady = Boolean(ai && ai.status === 'READY');
  const aiStatus = aiReady ? 'LIVE' : 'UNAVAILABLE';
  const aiProvider = ai?.provider ? ai.provider.toUpperCase() : 'NO PROVIDER';
  const aiModel = ai?.model || 'Evidence engine unavailable';
  const claims = ai?.claims || [];
  const evidencePct = aiReady ? evidenceQuality(ai, x.coverage) : 0;
  const confirmed = claims.filter((c) => c.status === 'CONFIRMED').length;
  const contradicted = claims.filter((c) => c.status === 'CONTRADICTED').length;
  const unconfirmed = claims.filter((c) => c.status === 'UNCONFIRMED').length;
  const treeFiles = x.coverage.treeFiles ?? ai?.coverage?.treeFiles ?? 0;
  const targetedFiles = x.coverage.targetedFiles ?? ai?.coverage?.targetedFiles ?? 0;
  const inspectedChars = x.coverage.evidenceChars ?? ai?.coverage?.evidenceChars ?? 0;
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

  const ledger = claims.length
    ? claims.map(claimCard).join('')
    : '<div class="vx-empty">No claim ledger was returned. The deterministic layer remains the only decision source for this run.</div>';

  const aiPanel = ai
    ? `
      <section class="vx-card vx-card--ai">
        <div class="vx-card-head">
          <div>
            <span class="vx-eyebrow">AGENT INVESTIGATION</span>
            <h3>Evidence adjudication</h3>
          </div>
          <div class="vx-status vx-status--${aiReady ? 'live' : 'idle'}"><i></i>${aiStatus}</div>
        </div>
        <div class="vx-ai-summary">
          <strong>${escapeHtml(ai.confidence)} CONFIDENCE · ${escapeHtml(ai.recommendedVerdict || x.verdict)}</strong>
          <p>${escapeHtml(ai.summary || 'The evidence investigator completed a repository-focused review.')}</p>
        </div>
        <div class="vx-agent-facts">
          <span><b>Model</b><strong>${escapeHtml(aiModel)}</strong></span>
          <span><b>Evidence quality</b><strong>${evidencePct}/100</strong></span>
          <span><b>Confirmed</b><strong>${confirmed}</strong></span>
          <span><b>Contradicted</b><strong>${contradicted}</strong></span>
          <span><b>Unconfirmed</b><strong>${unconfirmed}</strong></span>
          <span><b>Targeted files</b><strong>${targetedFiles}</strong></span>
        </div>
        <div class="vx-decision-callout">
          <span>ADJUDICATION</span>
          <p>${escapeHtml(ai.decisionReason || 'The final verdict is constrained by deterministic risk and freshness gates plus validated evidence claims.')}</p>
        </div>
        <div class="vx-three-col">
          <div><span class="vx-mini-label">CONFIRMED</span><ul>${list(ai.confirmed)}</ul></div>
          <div><span class="vx-mini-label">NEEDS REVIEW</span><ul>${list(ai.needsReview)}</ul></div>
          <div><span class="vx-mini-label">CONTRADICTIONS</span><ul>${list(ai.contradictions, 'No evidence contradiction recorded.')}</ul></div>
        </div>
        <footer class="vx-card-foot">
          <span>Provider: ${escapeHtml(aiProvider)} · ${escapeHtml(aiModel)}</span>
          <span>Adversarial evidence pass · no repository execution</span>
        </footer>
      </section>`
    : `
      <section class="vx-card vx-card--ai vx-card--idle">
        <div class="vx-card-head">
          <div>
            <span class="vx-eyebrow">AGENT INVESTIGATION</span>
            <h3>Evidence adjudication</h3>
          </div>
          <div class="vx-status vx-status--idle"><i></i>UNAVAILABLE</div>
        </div>
        <div class="vx-ai-empty">
          <strong>Deterministic verification only.</strong>
          <p>The AI investigator was unavailable for this run, so no model-derived conclusion was used.</p>
        </div>
        <footer class="vx-card-foot"><span>Provider: unavailable</span><span>Deterministic fallback active</span></footer>
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
        <div class="vx-inline-meta"><span>${escapeHtml(x.meta.language || 'Unknown')}</span><span>${x.meta.archived ? 'ARCHIVED' : 'ACTIVE'}</span><span>${scoreWord(x.scores.health)} health</span><span>${scoreWord(x.scores.documentation)} documentation</span><span>${x.method === 'static-analysis+agent-review' ? 'AGENT-REVIEWED' : 'DETERMINISTIC'}</span><span>${x.coverage.recursiveTree ? 'COMPLETE TREE' : 'PARTIAL TREE'}</span></div>
      </div>
      <aside class="vx-score-box">
        <span>PARADOX SCORE</span>
        <strong>${x.scores.paradox}</strong><small>/ 100</small>
        <p>Derived from repository health plus validated evidence quality.</p>
      </aside>
    </header>

    <section class="vx-engine-grid" aria-label="Analysis engines">
      <article class="vx-engine"><span>DETERMINISTIC CORE</span><strong>READY</strong><small>Metadata, structure, risk rules and gates</small></article>
      <article class="vx-engine"><span>LLM INVESTIGATOR</span><strong>${escapeHtml(aiStatus)}</strong><small>${escapeHtml(aiProvider)} · high-reasoning evidence pass</small></article>
      <article class="vx-engine"><span>REPOSITORY COVERAGE</span><strong>${escapeHtml(String(treeFiles || selectedFiles))}</strong><small>${escapeHtml(coverageLabel)} files inspected · ${x.coverage.recursiveTree ? 'complete tree' : 'partial tree'}</small></article>
      <article class="vx-engine"><span>HIGH-RISK</span><strong>${highRisks}</strong><small>Deterministic security indicators</small></article>
    </section>

    <section class="vx-metrics" aria-label="Verification metrics">
      ${metric('HEALTH', x.scores.health, x.scores.health >= 70 ? 'good' : 'neutral')}
      ${metric('FRESHNESS', x.scores.freshness)}
      ${metric('DOCUMENTATION', x.scores.documentation, x.scores.documentation >= 70 ? 'good' : 'neutral')}
      ${metric('ACTIVITY', x.scores.activity, x.scores.activity >= 60 ? 'good' : 'neutral')}
      ${metric('RISK', x.scores.risk, x.scores.risk === 0 ? 'good' : 'risk')}
      ${metric('EVIDENCE', evidencePct, evidencePct >= 70 ? 'good' : 'neutral')}
    </section>

    <section class="vx-grid vx-grid--lead">
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">FINAL ADJUDICATION</span><h3>Why this result</h3></div></div>
        <ul class="vx-reasons">${list(x.verdictReasons, 'No additional verdict reasons were produced.')}</ul>
        <div class="vx-rule"><span>Decision model</span><strong>Deterministic safety gates + evidence-backed LLM recommendation + claim validation</strong></div>
      </article>
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">OBSERVABLE FACTS</span><h3>Repository profile</h3></div></div>
        <div class="vx-facts">
          <span><b>Stars</b><strong>${x.meta.stars}</strong></span>
          <span><b>Forks</b><strong>${x.meta.forks}</strong></span>
          <span><b>Open issues</b><strong>${x.meta.openIssues}</strong></span>
          <span><b>Contributors</b><strong>${x.contributors ?? 'Unknown'}</strong></span>
          <span><b>Recent commits</b><strong>${x.recentCommitCount ?? 'Unknown'}</strong></span>
          <span><b>License</b><strong>${escapeHtml(x.meta.license || 'Unknown')}</strong></span>
          <span><b>Last push</b><strong>${escapeHtml(x.meta.pushedAt || 'Unknown')}</strong></span>
          <span><b>Release</b><strong>${escapeHtml(x.latestRelease || 'Unknown')}</strong></span>
          <span><b>Analyzed commit</b><strong><code>${escapeHtml((x.analyzedCommitSha || '').slice(0, 12) || 'Unknown')}</code></strong></span>
          <span><b>Inspected chars</b><strong>${inspectedChars.toLocaleString()}</strong></span>
        </div>
      </article>
    </section>

    ${aiPanel}

    <section class="vx-card vx-card--ledger">
      <div class="vx-card-head">
        <div><span class="vx-eyebrow">EVIDENCE LEDGER</span><h3>Claim → file → evidence</h3></div>
        <strong class="vx-count">${claims.length}</strong>
      </div>
      <p class="vx-ledger-intro">Only claims with repository evidence attached are allowed to become CONFIRMED or CONTRADICTED. Quotes are validated against the files inspected during this run.</p>
      <div class="vx-ledger">${ledger}</div>
    </section>

    <section class="vx-grid vx-grid--findings">
      <article class="vx-card">
        <div class="vx-card-head"><div><span class="vx-eyebrow">IMPLEMENTATION SIGNALS</span><h3>Models & tools</h3></div><strong class="vx-count">${x.detections.length}</strong></div>
        <ul class="vx-findings">${detections || '<li class="vx-empty">No model/tool implementation signals were confirmed in the inspected files.</li>'}</ul>
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
