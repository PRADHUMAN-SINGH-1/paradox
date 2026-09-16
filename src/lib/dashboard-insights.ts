export type InsightRow = Record<string, unknown>;

export const STALE_AFTER_DAYS = 90;

export const VERDICT_COLOR: Record<string, string> = {
  VERIFIED: '#d9ff3f',
  QUESTIONABLE: '#ffc861',
  STALE: '#8b9a92',
  'HIGH-RISK': '#ff6a52',
  UNKNOWN: '#4a5751',
};

export const VERDICT_ORDER = ['VERIFIED', 'QUESTIONABLE', 'STALE', 'HIGH-RISK', 'UNKNOWN'];

/**
 * Number(null) and Number('') are both 0, so a missing score would otherwise
 * be counted as a legitimate zero — dragging the median down and rendering a
 * red "0" chip for a repository that simply has no score recorded.
 */
export function toScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Verdict strings arrive from several sources with inconsistent wording. */
export function normalizeVerdict(value: unknown): string {
  const s = String(value ?? '').toUpperCase();
  if (s.includes('VERIF')) return 'VERIFIED';
  if (s.includes('HIGH')) return 'HIGH-RISK';
  if (s.includes('STALE')) return 'STALE';
  if (s.includes('QUESTION') || s.includes('REVIEW')) return 'QUESTIONABLE';
  return 'UNKNOWN';
}

/** Only finite scores count; rows may carry null, '' or malformed values. */
export function numericScores(rows: InsightRow[]): number[] {
  return rows
    .map((r) => toScore(r.score))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
}

/**
 * Median rather than mean: a workspace often holds only a few repositories,
 * where one outlier would badly skew an average.
 */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
}

export function rowTime(row: InsightRow): number {
  const t = new Date(String(row.created_at ?? row.scannedAt ?? '')).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function daysAgo(row: InsightRow, now: number = Date.now()): number | null {
  const t = rowTime(row);
  if (!t) return null;
  return Math.floor((now - t) / 86400000);
}

export function relativeTime(row: InsightRow, now: number = Date.now()): string {
  const d = daysAgo(row, now);
  if (d === null) return 'Date unknown';
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

export function verdictCounts(rows: InsightRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = normalizeVerdict(r.verdict);
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}

export function scoreTone(score: unknown): 'good' | 'warn' | 'bad' | 'none' {
  const n = toScore(score);
  if (n === null) return 'none';
  if (n >= 75) return 'good';
  if (n >= 50) return 'warn';
  return 'bad';
}

export function repoName(row: InsightRow): string {
  return String(row.repository_full_name || row.repository || 'Repository');
}

export type SortKey = 'recent' | 'score-desc' | 'score-asc' | 'name';

export function filterAndSort(rows: InsightRow[], query: string, sort: SortKey): InsightRow[] {
  const q = query.trim().toLowerCase();
  const view = rows.filter((r) => !q || repoName(r).toLowerCase().includes(q));
  return [...view].sort((a, b) => {
    if (sort === 'name') return repoName(a).localeCompare(repoName(b));
    if (sort === 'score-desc') return (toScore(b.score) ?? -Infinity) - (toScore(a.score) ?? -Infinity);
    if (sort === 'score-asc') return (toScore(a.score) ?? Infinity) - (toScore(b.score) ?? Infinity);
    return rowTime(b) - rowTime(a);
  });
}
