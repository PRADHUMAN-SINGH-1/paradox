import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGitHubRepo, parseRepoRef } from '../src/lib/github-url.ts';
import { detectRisks } from '../src/lib/analysis/risk.ts';
import { computeScores, decideVerdict, scoreFreshness } from '../src/lib/analysis/scores.ts';
import type { RepoMeta } from '../src/lib/analysis/types.ts';

test('parses github repository URLs and rejects others', () => {
  const a = parseGitHubRepo('https://github.com/openai/openai-agents-python');
  assert.equal(a.fullName, 'openai/openai-agents-python');
  const b = parseRepoRef('browser-use/browser-use');
  assert.equal(b.owner, 'browser-use');
  assert.throws(() => parseGitHubRepo('https://evil.com/github.com/x/y'));
  assert.throws(() => parseGitHubRepo('https://github.com.evil.tld/x/y'));
  assert.throws(() => parseGitHubRepo('https://user:pass@github.com/x/y'));
  assert.throws(() => parseGitHubRepo('https://github.com/x'));
  assert.throws(() => parseGitHubRepo('file:///etc/passwd'));
});

test('normalizes .git suffix', () => {
  assert.equal(parseGitHubRepo('https://github.com/a/b.git').repo, 'b');
});

test('freshness and verdict heuristics', () => {
  assert.equal(scoreFreshness(2, false), 100);
  assert.equal(scoreFreshness(10, true), 5);
  const meta: RepoMeta = {
    name: 'demo', fullName: 'acme/demo', owner: 'acme', description: 'An agent',
    stars: 100, forks: 10, watchers: 10, openIssues: 4, defaultBranch: 'main',
    license: 'MIT', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    pushedAt: '2026-09-01T00:00:00Z', topics: ['agent'], archived: false, language: 'TypeScript',
    htmlUrl: 'https://github.com/acme/demo', homepage: null,
  };
  const scores = computeScores({ meta, readmeLength: 2000, structureCount: 4, risks: [], now: Date.parse('2026-09-15T00:00:00Z') });
  const v = decideVerdict({ meta, scores, risks: [], readmeLength: 2000, detections: 2 });
  assert.equal(v.verdict, 'VERIFIED');
  const stale = decideVerdict({
    meta: { ...meta, archived: true },
    scores: computeScores({ meta: { ...meta, archived: true }, readmeLength: 2000, structureCount: 4, risks: [] }),
    risks: [], readmeLength: 2000, detections: 2,
  });
  assert.equal(stale.verdict, 'STALE');
  const risky = decideVerdict({
    meta, scores, detections: 2, readmeLength: 2000,
    risks: [
      { category: 'Shell execution', severity: 'HIGH', file: 'a.sh', evidence: 'curl | bash', reason: 'x' },
      { category: 'Dynamic code execution', severity: 'HIGH', file: 'b.js', evidence: 'eval(', reason: 'y' },
    ],
  });
  assert.equal(risky.verdict, 'HIGH-RISK');
});

test('risk detector finds curl pipe bash with evidence', () => {
  const hits = detectRisks([{ path: 'scripts/install.sh', content: 'curl https://example.com/install.sh | bash\n' }]);
  assert.ok(hits.some((h) => h.category === 'Remote script execution' && h.severity === 'HIGH'));
  assert.match(hits[0].evidence, /curl/);
});
