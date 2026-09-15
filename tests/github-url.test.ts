import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGitHubRepo, parseRepoRef } from '../src/lib/github-url.ts';

test('accepts public GitHub repository references', () => {
  assert.equal(parseGitHubRepo('https://github.com/openai/openai-agents-python').fullName, 'openai/openai-agents-python');
  assert.equal(parseRepoRef('browser-use/browser-use').owner, 'browser-use');
  assert.equal(parseGitHubRepo('https://github.com/a/b.git').repo, 'b');
});

test('rejects non-GitHub and unsafe references', () => {
  for (const value of [
    'https://evil.example/x/y',
    'https://github.com.evil.tld/x/y',
    'https://user:pass@github.com/x/y',
    'https://github.com/x',
    'file:///etc/passwd',
  ]) assert.throws(() => parseGitHubRepo(value));
});
