import type { IntelligenceReview, RepoMeta, RiskIndicator, Scores, Verdict } from './types.ts';

export function daysSince(iso: string, now = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 9999;
  return Math.max(0, (now - t) / 86400000);
}

export function scoreFreshness(days: number, archived: boolean): number {
  if (archived) return 5;
  if (days <= 7) return 100;
  if (days <= 30) return 88;
  if (days <= 90) return 70;
  if (days <= 180) return 45;
  if (days <= 365) return 22;
  return 8;
}

export function scoreDocumentation(readmeLength: number, hasLicense: boolean, structureCount: number): number {
  const readme = readmeLength > 4000 ? 100 : readmeLength > 1200 ? 78 : readmeLength > 300 ? 48 : readmeLength > 40 ? 22 : 8;
  return clamp(Math.round(readme * 0.7 + (hasLicense ? 20 : 0) + Math.min(10, structureCount * 2)));
}

// Activity measures observable engineering activity, not repository popularity.
export function scoreActivity(recentCommitCount: number | null, contributors: number | null, days: number): number {
  const commits = recentCommitCount == null ? 8 : Math.min(58, Math.log10(recentCommitCount + 1) * 34);
  const people = contributors == null ? 8 : Math.min(20, Math.log10(contributors + 1) * 18);
  const recency = days <= 30 ? 22 : days <= 90 ? 16 : days <= 180 ? 10 : days <= 365 ? 5 : 0;
  return clamp(Math.round(commits + people + recency));
}

export function scoreRisk(risks: RiskIndicator[]): number {
  if (!risks.length) return 0;
  const weight = { HIGH: 32, MODERATE: 12, LOW: 3 };
  return clamp(Math.round(risks.reduce((n, r) => n + weight[r.severity], 0)));
}

export function evidenceQuality(intelligence: IntelligenceReview | null | undefined, coverage?: {
  selectedFiles?: number;
  maxFiles?: number;
  treeFiles?: number;
  targetedFiles?: number;
}): number {
  if (!intelligence || intelligence.status !== 'READY') return 0;
  const claims = intelligence.claims || [];
  const backed = claims.filter((c) => c.evidence.length > 0).length;
  const confirmed = claims.filter((c) => c.status === 'CONFIRMED').length;
  const contradictions = Math.min(6, intelligence.contradictions.length);
  const claimEvidence = claims.length ? (backed / claims.length) * 100 : 35;
  const confirmation = claims.length ? (confirmed / claims.length) * 100 : 35;
  const confidence = intelligence.confidence === 'HIGH' ? 100 : intelligence.confidence === 'MEDIUM' ? 70 : 40;
  const selected = coverage?.selectedFiles || intelligence.coverage?.selectedFiles || 0;
  const max = coverage?.maxFiles || 40;
  const coverageRatio = max ? Math.min(100, (selected / max) * 100) : 0;
  const targeted = coverage?.targetedFiles || intelligence.coverage?.targetedFiles || 0;
  const investigationDepth = targeted > 0 ? Math.min(100, 55 + targeted * 2) : 35;
  const contradictionPenalty = contradictions * 12;
  return clamp(Math.round(
    coverageRatio * 0.25 +
    claimEvidence * 0.25 +
    confirmation * 0.18 +
    confidence * 0.17 +
    investigationDepth * 0.15 -
    contradictionPenalty
  ));
}

export function scoreHealth(parts: { freshness: number; activity: number; documentation: number; risk: number; archived: boolean }): number {
  const base = parts.freshness * 0.28 + parts.activity * 0.22 + parts.documentation * 0.2 + (100 - parts.risk) * 0.3;
  return clamp(Math.round(parts.archived ? base * 0.4 : base));
}

export function paradoxScore(s: Omit<Scores, 'paradox'>, evidence = 0): number {
  const base = s.health * 0.35 + s.freshness * 0.2 + s.documentation * 0.15 + s.activity * 0.15 + (100 - s.risk) * 0.15;
  const evidenceLift = evidence > 0 ? (evidence - 50) * 0.18 : 0;
  return clamp(Math.round(base + evidenceLift));
}

export function computeScores(input: {
  meta: RepoMeta;
  readmeLength: number;
  structureCount: number;
  risks: RiskIndicator[];
  contributors?: number | null;
  recentCommitCount?: number | null;
  intelligence?: IntelligenceReview | null;
  coverage?: { selectedFiles?: number; maxFiles?: number; treeFiles?: number; targetedFiles?: number };
  now?: number;
}): Scores {
  const days = daysSince(input.meta.pushedAt, input.now);
  const freshness = scoreFreshness(days, input.meta.archived);
  const documentation = scoreDocumentation(input.readmeLength, Boolean(input.meta.license), input.structureCount);
  const activity = scoreActivity(input.recentCommitCount ?? null, input.contributors ?? null, days);
  const risk = scoreRisk(input.risks);
  const health = scoreHealth({ freshness, activity, documentation, risk, archived: input.meta.archived });
  const rest = { health, freshness, documentation, activity, risk };
  const evidence = evidenceQuality(input.intelligence, input.coverage);
  return { ...rest, paradox: paradoxScore(rest, evidence) };
}

export function decideVerdict(analysis: {
  meta: RepoMeta;
  scores: Scores;
  risks: RiskIndicator[];
  readmeLength: number;
  detections: number;
  intelligence?: IntelligenceReview | null;
}): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  const high = analysis.risks.filter((r) => r.severity === 'HIGH');
  const days = daysSince(analysis.meta.pushedAt);
  const ai = analysis.intelligence?.status === 'READY' ? analysis.intelligence : null;
  const claims = ai?.claims || [];
  const confirmed = claims.filter((c) => c.status === 'CONFIRMED').length;
  const unconfirmed = claims.filter((c) => c.status === 'UNCONFIRMED').length;
  const contradictions = claims.filter((c) => c.status === 'CONTRADICTED').length;

  // Deterministic gates always outrank model preference.
  if (high.length >= 2 || (high.length >= 1 && analysis.scores.risk >= 65)) {
    reasons.push(`${high.length} high-severity security indicator(s) were observed in repository files.`);
    if (ai?.recommendedVerdict === 'HIGH-RISK') reasons.push('The evidence investigator independently reached the same risk category.');
    return { verdict: 'HIGH-RISK', reasons };
  }
  if (analysis.meta.archived || days > 365 || analysis.scores.freshness < 40) {
    reasons.push(analysis.meta.archived ? 'Repository is archived.' : 'Recent activity is too old for a current evidence status.');
    if (ai?.recommendedVerdict === 'STALE') reasons.push('The evidence investigator also classified the evidence as stale.');
    return { verdict: 'STALE', reasons };
  }

  const thinDocs = analysis.readmeLength < 300;
  const weak = thinDocs || !analysis.meta.description || analysis.scores.health < 55;

  if (ai) {
    if (ai.recommendedVerdict === 'QUESTIONABLE' || contradictions >= 2 || unconfirmed >= Math.max(2, confirmed)) {
      reasons.push(ai.decisionReason || 'The evidence investigator found incomplete or conflicting evidence.');
      if (contradictions) reasons.push(`${contradictions} evidence claim(s) were contradicted during adjudication.`);
      if (unconfirmed) reasons.push(`${unconfirmed} claim(s) remain unconfirmed after evidence validation.`);
      return { verdict: 'QUESTIONABLE', reasons };
    }

    if (
      ai.recommendedVerdict === 'VERIFIED' &&
      ai.confidence === 'HIGH' &&
      confirmed >= 2 &&
      contradictions === 0 &&
      !weak
    ) {
      reasons.push('The evidence investigator found multiple confirmed implementation claims with validated file evidence.');
      reasons.push(ai.decisionReason || 'Evidence-backed implementation review passed the current adjudication gates.');
      return { verdict: 'VERIFIED', reasons };
    }
  }

  if (weak) {
    if (thinDocs) reasons.push('Documentation is thin or missing.');
    if (!analysis.meta.description) reasons.push('Repository description is missing.');
    if (analysis.scores.health < 55) reasons.push('Composite health is below the evidence-supported threshold.');
    return { verdict: 'QUESTIONABLE', reasons };
  }

  reasons.push(ai
    ? 'Repository passed deterministic gates and the AI evidence investigator found no blocking contradiction.'
    : 'Public repository analyzed with documentation, engineering activity, and no high-risk cluster.');
  return { verdict: 'VERIFIED', reasons };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function explainParadoxScore(): string {
  return 'PARADOX SCORE combines repository health signals with a bounded evidence-quality lift when the evidence investigator produces validated, file-backed claims. It is a summary metric, not a security certification.';
}
