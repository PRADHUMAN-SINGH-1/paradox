const MAX_FILE = 80_000;
const MAX_FILES = 16;
const CACHE_MS = 5 * 60_000;
const searchCache = new Map<string, { at: number; data: unknown }>();
const analysisCache = new Map<string, { at: number; data: unknown }>();

const ALLOWED_ORIGINS = new Set([
  'https://paradox.engineer',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);

function headers(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://paradox.engineer',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function respond(data: unknown, status: number, cors: Record<string, string>, cache = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': cache ? `public, max-age=${Math.floor(cache / 1000)}` : 'no-store',
    },
  });
}

function parseRepo(raw: string) {
  const value = raw.trim();
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) throw new Error('github-host');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('github-repo');
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  const ownerOk = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner);
  const repoOk = /^[A-Za-z0-9._-]{1,100}$/.test(repo);
  if (!ownerOk || !repoOk || owner === '.' || owner === '..' || repo === '.' || repo === '..') throw new Error('github-repo');
  return { owner, repo, fullName: `${owner}/${repo}` };
}

const token = Deno.env.get('GITHUB_TOKEN') || '';
const ghHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (token) ghHeaders.Authorization = `Bearer ${token}`;

async function gh(path: string) {
  const res = await fetch(`https://api.github.com${path}`, { headers: ghHeaders });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function decodeBase64(value: string) {
  try {
    const cleaned = value.replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes).slice(0, MAX_FILE);
  } catch {
    return '';
  }
}

async function readFile(owner: string, repo: string, path: string) {
  const res = await gh(`/repos/${owner}/${repo}/contents/${encodePath(path)}`);
  if (!res.ok || !res.data || res.data.type !== 'file') return null;
  const size = Number(res.data.size || 0);
  if (size > MAX_FILE) return { path, content: '', size, skipped: true };
  const content = typeof res.data.content === 'string' ? decodeBase64(res.data.content) : '';
  return { path, content, size, skipped: false };
}

async function analyze(owner: string, repo: string) {
  const key = `${owner}/${repo}`.toLowerCase();
  const cached = analysisCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const repoRes = await gh(`/repos/${owner}/${repo}`);
  if (repoRes.status === 404) throw new ResponseError('GitHub could not find this public repository.', 404);
  if (repoRes.status === 403) throw new ResponseError('GitHub is temporarily rate limiting requests. Please try again shortly.', 429);
  if (!repoRes.ok || !repoRes.data || repoRes.data.private) throw new ResponseError('This repository is not publicly accessible.', 404);

  const [languages, root, contributors, releases, commits] = await Promise.all([
    gh(`/repos/${owner}/${repo}/languages`),
    gh(`/repos/${owner}/${repo}/contents`),
    gh(`/repos/${owner}/${repo}/contributors?per_page=1&anon=true`),
    gh(`/repos/${owner}/${repo}/releases?per_page=1`),
    gh(`/repos/${owner}/${repo}/commits?per_page=1`),
  ]);

  const rootItems = Array.isArray(root.data) ? root.data : [];
  const names = rootItems.map((x: { name?: string }) => String(x.name || ''));
  const interesting = [
    'README.md', 'readme.md', 'README', 'package.json', 'requirements.txt', 'pyproject.toml',
    'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'Dockerfile', 'docker-compose.yml',
    'docker-compose.yaml', '.env.example', 'compose.yml',
  ];
  const wanted = interesting.filter(name => names.some(item => item.toLowerCase() === name.toLowerCase()));

  let workflowPaths: string[] = [];
  if (names.includes('.github')) {
    const workflow = await gh(`/repos/${owner}/${repo}/contents/.github/workflows`);
    workflowPaths = Array.isArray(workflow.data)
      ? workflow.data.filter((x: { type?: string }) => x.type === 'file').map((x: { name?: string }) => `.github/workflows/${x.name || ''}`).slice(0, 6)
      : [];
  }

  const filePaths = [...new Set([...wanted, ...workflowPaths])].slice(0, MAX_FILES);
  const fileResults = await Promise.all(filePaths.map(path => readFile(owner, repo, path)));
  const files = fileResults.filter(Boolean);

  const data = {
    repo: repoRes.data,
    languages: languages.ok ? languages.data : {},
    root: rootItems.slice(0, 100),
    files,
    contributors: Array.isArray(contributors.data) ? contributors.data.length : null,
    latestRelease: Array.isArray(releases.data) ? releases.data[0]?.tag_name || null : null,
    latestCommit: Array.isArray(commits.data) ? commits.data[0]?.commit?.committer?.date || null : null,
    analyzedAt: new Date().toISOString(),
    method: 'static-analysis',
  };
  analysisCache.set(key, { at: Date.now(), data });
  return data;
}

async function search(query: string) {
  const q = query.trim().slice(0, 120) || 'ai agent';
  const key = q.toLowerCase();
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const res = await gh(`/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=20`);
  if (res.status === 403) throw new ResponseError('GitHub is temporarily rate limiting requests. Please try again shortly.', 429);
  if (!res.ok) throw new ResponseError("We couldn't complete this search. Try again.", 502);
  const data = {
    total_count: Number(res.data?.total_count || 0),
    items: Array.isArray(res.data?.items) ? res.data.items : [],
  };
  searchCache.set(key, { at: Date.now(), data });
  return data;
}

class ResponseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

Deno.serve(async (req) => {
  const cors = headers(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405, cors);

  try {
    const body = await req.json();
    if (body.mode === 'search') return respond(await search(String(body.query || '')), 200, cors, 20_000);
    const ref = parseRepo(String(body.url || ''));
    return respond(await analyze(ref.owner, ref.repo), 200, cors, 60_000);
  } catch (error) {
    if (error instanceof ResponseError) return respond({ error: error.message }, error.status, cors);
    const message = error instanceof Error && ['github-host', 'github-repo'].includes(error.message)
      ? 'Enter a public GitHub repository URL.'
      : "We couldn't complete this request. Try again.";
    return respond({ error: message }, 400, cors);
  }
});
