import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeScores, decideVerdict, scoreFreshness } from '../src/lib/analysis/scores.ts';
import type { RepoMeta } from '../src/lib/analysis/types.ts';

const meta: RepoMeta = {
  name: 'demo', fullName: 'acme/demo', owner: 'acme', description: 'An agent',
  stars: 100, forks: 10, watchers: 10, openIssues: 4, defaultBranch: 'main', license: 'MIT',
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', pushedAt: '2026-09-01T00:00:00Z',
  topics: ['agent'], archived: false, language: 'TypeScript', htmlUrl: 'https://github.com/acme/demo', homepage: null,
};

test('freshness scores age and archived status', () => {
  assert.equal(scoreFreshness(2, false), 100);
  assert.equal(scoreFreshness(10, true), 5);
});

test('healthy evidence yields a verified project', () => {
  const scores = computeScores({ meta, readmeLength: 2000, structureCount: 4, risks: [], now: Date.parse('2026-09-15T00:00:00Z') });
  assert.equal(decideVerdict({ meta, scores, risks: [], readmeLength: 2000, detections: 2 }).verdict, 'VERIFIED');
});

test('archived and dangerous projects are classified correctly', () => {
  const staleMeta = { ...meta, archived: true };
  const staleScores = computeScores({ meta: staleMeta, readmeLength: 2000, structureCount: 4, risks: [] });
  assert.equal(decideVerdict({ meta: staleMeta, scores: staleScores, risks: [], readmeLength: 2000, detections: 2 }).verdict, 'STALE');
  const risks = [
    { category: 'Shell execution', severity: 'HIGH' as const, file: 'a.sh', evidence: 'curl | bash', reason: 'x' },
    { category: 'Dynamic code execution', severity: 'HIGH' as const, file: 'b.js', evidence: 'eval(', reason: 'y' },
  ];
  const riskyScores = computeScores({ meta, readmeLength: 2000, structureCount: 4, risks });
  assert.equal(decideVerdict({ meta, scores: riskyScores, risks, readmeLength: 2000, detections: 2 }).verdict, 'HIGH-RISK');
});
