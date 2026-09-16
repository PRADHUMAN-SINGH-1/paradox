import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  daysAgo,
  filterAndSort,
  median,
  normalizeVerdict,
  numericScores,
  relativeTime,
  repoName,
  scoreTone,
  verdictCounts,
} from '../src/lib/dashboard-insights.ts';

const DAY = 86400000;
const NOW = Date.UTC(2026, 0, 15);
const ago = (days: number) => ({ created_at: new Date(NOW - days * DAY).toISOString() });

test('normalizeVerdict folds inconsistent wording into stable buckets', () => {
  assert.equal(normalizeVerdict('VERIFIED'), 'VERIFIED');
  assert.equal(normalizeVerdict('evidence-supported verified'), 'VERIFIED');
  assert.equal(normalizeVerdict('HIGH-RISK SIGNALS'), 'HIGH-RISK');
  assert.equal(normalizeVerdict('needs review'), 'QUESTIONABLE');
  assert.equal(normalizeVerdict('QUESTIONABLE'), 'QUESTIONABLE');
  assert.equal(normalizeVerdict('STALE EVIDENCE'), 'STALE');
  assert.equal(normalizeVerdict(null), 'UNKNOWN');
  assert.equal(normalizeVerdict(''), 'UNKNOWN');
});

test('numericScores drops non-numeric values instead of producing NaN', () => {
  const rows = [{ score: 80 }, { score: null }, { score: 'abc' }, { score: 40 }, {}];
  assert.deepEqual(numericScores(rows), [40, 80]);
});

test('median handles odd, even and empty sets', () => {
  assert.equal(median([10, 20, 30]), 20);
  assert.equal(median([10, 20, 30, 40]), 25);
  assert.equal(median([]), null);
  assert.equal(median([7]), 7);
});

test('median resists a single outlier that would skew a mean', () => {
  const scores = [70, 72, 74, 1];
  const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  assert.equal(median([...scores].sort((a, b) => a - b)), 71);
  // The mean would misreport this workspace as far weaker than it is.
  assert.equal(mean, 54);
});

test('scoreTone bands scores correctly', () => {
  assert.equal(scoreTone(90), 'good');
  assert.equal(scoreTone(75), 'good');
  assert.equal(scoreTone(74), 'warn');
  assert.equal(scoreTone(50), 'warn');
  assert.equal(scoreTone(49), 'bad');
  assert.equal(scoreTone('abc'), 'none');
  assert.equal(scoreTone(null), 'none');
});

test('daysAgo and relativeTime describe age in human terms', () => {
  assert.equal(daysAgo(ago(0), NOW), 0);
  assert.equal(daysAgo(ago(5), NOW), 5);
  assert.equal(daysAgo({}, NOW), null);
  assert.equal(relativeTime(ago(0), NOW), 'Today');
  assert.equal(relativeTime(ago(1), NOW), 'Yesterday');
  assert.equal(relativeTime(ago(12), NOW), '12 days ago');
  assert.equal(relativeTime(ago(95), NOW), '3 months ago');
  assert.equal(relativeTime(ago(800), NOW), '2 years ago');
  assert.equal(relativeTime({}, NOW), 'Date unknown');
});

test('verdictCounts tallies a mixed workspace', () => {
  const counts = verdictCounts([
    { verdict: 'VERIFIED' },
    { verdict: 'verified' },
    { verdict: 'HIGH-RISK' },
    { verdict: 'nonsense' },
  ]);
  assert.equal(counts.get('VERIFIED'), 2);
  assert.equal(counts.get('HIGH-RISK'), 1);
  assert.equal(counts.get('UNKNOWN'), 1);
});

test('repoName falls back across differing row shapes', () => {
  assert.equal(repoName({ repository_full_name: 'a/b' }), 'a/b');
  assert.equal(repoName({ repository: 'c/d' }), 'c/d');
  assert.equal(repoName({}), 'Repository');
});

test('filterAndSort filters case-insensitively by name', () => {
  const rows = [{ repository_full_name: 'openai/agents' }, { repository_full_name: 'crewAIInc/crewAI' }];
  assert.equal(filterAndSort(rows, 'CREW', 'recent').length, 1);
  assert.equal(filterAndSort(rows, '', 'recent').length, 2);
  assert.equal(filterAndSort(rows, 'zzz', 'recent').length, 0);
});

test('filterAndSort orders by each sort key', () => {
  const rows = [
    { repository_full_name: 'b/one', score: 40, created_at: new Date(NOW - 5 * DAY).toISOString() },
    { repository_full_name: 'a/two', score: 90, created_at: new Date(NOW - 1 * DAY).toISOString() },
    { repository_full_name: 'c/three', score: 70, created_at: new Date(NOW - 9 * DAY).toISOString() },
  ];
  assert.deepEqual(filterAndSort(rows, '', 'score-desc').map((r) => r.score), [90, 70, 40]);
  assert.deepEqual(filterAndSort(rows, '', 'score-asc').map((r) => r.score), [40, 70, 90]);
  assert.deepEqual(filterAndSort(rows, '', 'name').map((r) => repoName(r)), ['a/two', 'b/one', 'c/three']);
  assert.deepEqual(filterAndSort(rows, '', 'recent').map((r) => repoName(r)), ['a/two', 'b/one', 'c/three']);
});

test('filterAndSort does not mutate the source array', () => {
  const rows = [{ repository_full_name: 'b', score: 1 }, { repository_full_name: 'a', score: 2 }];
  const before = rows.map(repoName);
  filterAndSort(rows, '', 'name');
  assert.deepEqual(rows.map(repoName), before);
});
