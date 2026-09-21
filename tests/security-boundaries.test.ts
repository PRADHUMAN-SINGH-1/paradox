import assert from 'node:assert/strict';
import { test } from 'node:test';
import { redactSensitiveText } from '../src/lib/analysis/sanitize.ts';
import { detectRisks } from '../src/lib/analysis/risk.ts';
import { detectSignals } from '../src/lib/analysis/detect.ts';

test('redacts common credential formats before evidence reaches the UI', () => {
  const value = [
    'API_KEY="super-secret-value"',
    'ghp_1234567890abcdefghijklmnop',
    'sk-1234567890abcdefghijklmnop',
    'AIzaSyD-1234567890abcdefghijklmnop',
    '-----BEGIN PRIVATE KEY-----',
    'secret material',
    '-----END PRIVATE KEY-----',
  ].join('\n');

  const redacted = redactSensitiveText(value);
  assert.equal(redacted.includes('super-secret-value'), false);
  assert.equal(redacted.includes('ghp_1234567890'), false);
  assert.equal(redacted.includes('sk-1234567890'), false);
  assert.equal(redacted.includes('AIzaSyD-'), false);
  assert.equal(redacted.includes('secret material'), false);
  assert.match(redacted, /REDACTED/);
});

test('risk evidence is redacted instead of echoing credential material', () => {
  const hits = detectRisks([{
    path: 'src/config.ts',
    content: 'const token = process.env.API_TOKEN; // ghp_1234567890abcdefghijklmnop',
  }]);
  const hit = hits.find(item => item.category === 'Credential access');
  assert.ok(hit);
  assert.equal(hit.evidence.includes('ghp_1234567890'), false);
});

test('implementation evidence is redacted instead of echoing API keys', () => {
  const hits = detectSignals([{
    path: 'src/client.ts',
    content: 'const client = new OpenAI({ apiKey: "sk-1234567890abcdefghijklmnop" });',
  }]);
  const hit = hits.find(item => item.name === 'OpenAI');
  assert.ok(hit);
  assert.equal(hit.evidence.includes('sk-1234567890'), false);
});
