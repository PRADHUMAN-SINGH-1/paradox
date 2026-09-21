export type RepoRef = { owner: string; repo: string; fullName: string; url: string };

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

export function normalizeRepoInput(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/** Parse a public github.com repository URL. Rejects non-GitHub hosts (SSRF). */
export function parseGitHubRepo(value: string): RepoRef {
  const raw = normalizeRepoInput(value);
  if (!raw) throw new Error('Enter a public GitHub repository URL.');

  let url: URL;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    throw new Error('Enter a public GitHub repository URL.');
  }

  if (url.username || url.password) throw new Error('Enter a public GitHub repository URL.');
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Enter a public GitHub repository URL.');
  }
  if (url.port && url.port !== '443' && url.port !== '80') {
    throw new Error('Enter a public GitHub repository URL.');
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    throw new Error('Enter a public GitHub repository URL.');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) throw new Error('Enter a public GitHub repository URL.');
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw new Error('Enter a public GitHub repository URL.');
  }
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === '.' || repo.startsWith('-')) {
    throw new Error('Enter a public GitHub repository URL.');
  }

  const fullName = `${owner}/${repo}`;
  return { owner, repo, fullName, url: `https://github.com/${fullName}` };
}

export function parseRepoRef(value: string): RepoRef {
  const trimmed = normalizeRepoInput(value);
  if (/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]+$/.test(trimmed)) {
    return parseGitHubRepo(`https://github.com/${trimmed}`);
  }
  return parseGitHubRepo(trimmed);
}
