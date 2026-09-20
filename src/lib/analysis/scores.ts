import type { RepoMeta, RiskIndicator, Scores, Verdict } from './types.ts';

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
// Stars/forks are intentionally excluded because they do not establish code health.
export function scoreActivity(recentCommitCount: number | null, contributors: number | null, days: number): number {
  const commits = recentCommitCount == null ? 8 : Math.min(58, Math.log10(recentCommitCount + 1) * 34);
  const people = contributors == null ? 8 : Math.min(20, Math.log10(contributors + 1) * 18);
  const recency = days <= 30 ? 22 : days <= 90 ? 16 : days <= 180 ? 10 : days <= 365 ? 5 : 0;
  return clamp(Math.round(commits + people + recency));
}

export function scoreRisk(risks: RiskIndicator[]): number {
  if (!risks.length) return 0;
  const weight = { HIGH: 32, MODERATE: 12, LOW: 3 };
  const raw = risks.reduce((n, r) => n + weight[r.severity], 0);
  return clamp(Math.round(raw));
}

export function scoreHealth(parts: { freshness: number; activity: number; documentation: number; risk: number; archived: boolean }): number {
  const base = parts.freshness * 0.28 + parts.activity * 0.22 + parts.documentation * 0.2 + (100 - parts.risk) * 0.3;
  return clamp(Math.round(parts.archived ? base * 0.4 : base));
}

export function paradoxScore(s: Omit<Scores, 'paradox'>): number {
  return clamp(Math.round(s.health * 0.35 + s.freshness * 0.2 + s.documentation * 0.15 + s.activity * 0.15 + (100 - s.risk) * 0.15));
}

export function computeScores(input: {
  meta: RepoMeta;
  readmeLength: number;
  structureCount: number;
  risks: RiskIndicator[];
  contributors?: number | null;
  recentCommitCount?: number | null;
  now?: number;
}): Scores {
  const days = daysSince(input.meta.pushedAt, input.now);
  const freshness = scoreFreshness(days, input.meta.archived);
  const documentation = scoreDocumentation(input.readmeLength, Boolean(input.meta.license), input.structureCount);
  const activity = scoreActivity(input.recentCommitCount ?? null, input.contributors ?? null, days);
  const risk = scoreRisk(input.risks);
  const health = scoreHealth({ freshness, activity, documentation, risk, archived: input.meta.archived });
  const rest = { health, freshness, documentation, activity, risk };
  return { ...rest, paradox: paradoxScore(rest) };
}

export function decideVerdict(analysis: {
  meta: RepoMeta;
  scores: Scores;
  risks: RiskIndicator[];
  readmeLength: number;
  detections: number;
}): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  const high = analysis.risks.filter((r) => r.severity === 'HIGH');
  const days = daysSince(analysis.meta.pushedAt);

  if (high.length >= 2 || (high.length >= 1 && analysis.scores.risk >= 65)) {
    reasons.push(`${high.length} high-severity security indicator(s) were observed in repository files.`);
    return { verdict: 'HIGH-RISK', reasons };
  }
  if (analysis.meta.archived || days > 365) {
    reasons.push(analysis.meta.archived ? 'Repository is archived.' : 'No meaningful push activity in over a year.');
    return { verdict: 'STALE', reasons };
  }
  if (analysis.scores.freshness < 40) {
    reasons.push('Recent activity is low relative to maintained-project evidence.');
    return { verdict: 'STALE', reasons };
  }
  const thinDocs = analysis.readmeLength < 300;
  const weak = thinDocs || !analysis.meta.description || analysis.scores.health < 55;
  if (weak) {
    if (thinDocs) reasons.push('Documentation is thin or missing.');
    if (!analysis.meta.description) reasons.push('Repository description is missing.');
    if (analysis.scores.health < 55) reasons.push('Composite health is below the evidence-supported threshold.');
    return { verdict: 'QUESTIONABLE', reasons };
  }
  reasons.push('Public repository analyzed with documentation, engineering activity, and no high-risk cluster.');
  return { verdict: 'VERIFIED', reasons };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function explainParadoxScore(): string {
  return 'PARADOX SCORE is a weighted blend of health (35%), freshness (20%), documentation (15%), activity (15%) and inverted risk (15%). Scores summarize observable public evidence; they are not precision measurements or security certification.';
}
