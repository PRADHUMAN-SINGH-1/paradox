import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

// Minimal storage shim so the browser-facing cache module can be exercised
// in Node. Mirrors the subset of the Web Storage API the module touches.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string): void { this.map.set(k, String(v)); }
  removeItem(k: string): void { this.map.delete(k); }
  clear(): void { this.map.clear(); }
}

const g = globalThis as Record<string, unknown>;
g.sessionStorage = new MemoryStorage();
g.localStorage = new MemoryStorage();

const { readSearchCache, writeSearchCache } = await import('../src/lib/analysis/cache.ts');

beforeEach(() => {
  (g.sessionStorage as MemoryStorage).clear();
});

test('returns null for a query that was never cached', () => {
  assert.equal(readSearchCache('never-searched-before'), null);
});

test('round-trips a cached search payload', () => {
  const payload = { total_count: 2, items: [{ full_name: 'a/b' }, { full_name: 'c/d' }] };
  writeSearchCache('browser agent', payload);
  assert.deepEqual(readSearchCache('browser agent'), payload);
});

test('normalizes case and whitespace so equivalent queries share one entry', () => {
  writeSearchCache('Browser   Agent', { total_count: 1 });
  // Different casing and spacing must hit the same cache entry, otherwise
  // trivial query variations would each cost a live API call.
  assert.deepEqual(readSearchCache('  browser agent  '), { total_count: 1 });
  assert.deepEqual(readSearchCache('BROWSER AGENT'), { total_count: 1 });
});

test('distinct queries do not collide', () => {
  writeSearchCache('mcp', { total_count: 1 });
  writeSearchCache('rag', { total_count: 2 });
  assert.deepEqual(readSearchCache('mcp'), { total_count: 1 });
  assert.deepEqual(readSearchCache('rag'), { total_count: 2 });
});

test('expired entries are treated as a miss', () => {
  const stale = { at: Date.now() - 60 * 60 * 1000, value: { total_count: 9 } };
  (g.sessionStorage as MemoryStorage).setItem('paradox:search:stale query', JSON.stringify(stale));
  assert.equal(readSearchCache('stale query'), null);
});

test('malformed cache entries do not throw', () => {
  (g.sessionStorage as MemoryStorage).setItem('paradox:search:broken', '{not json');
  assert.doesNotThrow(() => readSearchCache('broken'));
  assert.equal(readSearchCache('broken'), null);
});
