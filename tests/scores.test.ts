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


test('incomplete repository coverage cannot receive a verified verdict', () => {
  const scores = computeScores({ meta, readmeLength: 2000, structureCount: 8, risks: [] });
  const result = decideVerdict({
    meta,
    scores,
    risks: [],
    readmeLength: 2000,
    detections: 2,
    coverage: { recursiveTree: false },
  });
  assert.equal(result.verdict, 'QUESTIONABLE');
});


test('evidence-aware scoring materially reflects a validated agent review', () => {
  const deterministic = computeScores({
    meta,
    readmeLength: 2000,
    structureCount: 4,
    risks: [],
    now: Date.parse('2026-09-15T00:00:00Z'),
  });

  const intelligence = {
    status: 'READY' as const,
    confidence: 'HIGH' as const,
    summary: 'validated',
    confirmed: ['claim one', 'claim two', 'claim three', 'claim four'],
    needsReview: [],
    contradictions: [],
    recommendedVerdict: 'VERIFIED' as const,
    claims: [
      { id: '1', claim: 'one', status: 'CONFIRMED' as const, confidence: 'HIGH' as const, evidence: [{ file: 'src/index.ts', line: 10, quote: 'one' }] },
      { id: '2', claim: 'two', status: 'CONFIRMED' as const, confidence: 'HIGH' as const, evidence: [{ file: 'src/index.ts', line: 20, quote: 'two' }] },
      { id: '3', claim: 'three', status: 'CONFIRMED' as const, confidence: 'HIGH' as const, evidence: [{ file: 'src/index.ts', line: 30, quote: 'three' }] },
      { id: '4', claim: 'four', status: 'CONFIRMED' as const, confidence: 'HIGH' as const, evidence: [{ file: 'src/index.ts', line: 40, quote: 'four' }] },
    ],
  };

  const evidenceAware = computeScores({
    meta,
    readmeLength: 2000,
    structureCount: 4,
    risks: [],
    now: Date.parse('2026-09-15T00:00:00Z'),
    intelligence,
    coverage: { selectedFiles: 40, maxFiles: 40, targetedFiles: 20, treeFiles: 100 },
  });

  assert.notEqual(evidenceAware.paradox, deterministic.paradox);
  assert.ok(evidenceAware.paradox > deterministic.paradox);
});
