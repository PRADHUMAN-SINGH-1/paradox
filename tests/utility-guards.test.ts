import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

// These calculators previously guarded input with bare `<= 0` / `< 0` checks.
// Because every comparison against NaN is false, non-numeric input slipped
// through and the tools rendered "NaN" — BMI went further and reported the
// "Obesity" category for unparseable input. Each guard must therefore assert
// finiteness explicitly. This test reads the component source so the guards
// cannot silently regress.

const source = readFileSync(new URL('../src/components/UtilityTool.astro', import.meta.url), 'utf8');

function guardFor(name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `calculator "${name}" not found in UtilityTool.astro`);
  // The guard is always the first early-return in the function body.
  const slice = source.slice(start, start + 600);
  const end = slice.indexOf('return msg(');
  assert.notEqual(end, -1, `calculator "${name}" has no validation guard`);
  return slice.slice(0, end);
}

for (const name of ['bmi', 'emi', 'sip', 'discount', 'tip']) {
  test(`${name} guard rejects non-numeric input`, () => {
    const guard = guardFor(name);
    assert.match(
      guard,
      /Number\.isFinite/,
      `${name}() must use Number.isFinite — bare comparisons let NaN through`,
    );
  });
}

test('NaN defeats bare comparison guards (documents the original defect)', () => {
  const bad = Number('abc');
  assert.equal(bad <= 0, false);
  assert.equal(bad < 0, false);
  assert.equal(Number.isFinite(bad), false);
});

test('finite guards still admit legitimate values', () => {
  for (const v of [0, 1, 70, 175, 100000, 0.5]) {
    assert.equal(Number.isFinite(v), true);
  }
});
