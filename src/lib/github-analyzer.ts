const API = 'https://api.github.com';

type Repo = { full_name:string; name:string; html_url:string; description:string|null; default_branch:string; archived:boolean; disabled:boolean; fork:boolean; created_at:string; updated_at:string; pushed_at:string|null; stargazers_count:number; open_issues_count:number; license?:{spdx_id:string|null}|null; topics?:string[]; language:string|null };
type Check = { id:string; label:string; status:'pass'|'warn'|'fail'; detail:string };

const headers = () => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  ...(import.meta.env.GITHUB_TOKEN ? { Authorization: `Bearer ${import.meta.env.GITHUB_TOKEN}` } : {}),
});

async function gh<T>(path:string):Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: headers(), signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response.json() as Promise<T>;
}

function decode(content:string) {
  return Buffer.from(content, 'base64').toString('utf8');
}

async function fileText(owner:string, repo:string, path:string, ref:string) {
  try {
    const data = await gh<any>(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    return data.type === 'file' && data.content ? decode(data.content) : '';
  } catch { return ''; }
}

function parseRepo(input:string) {
  const url = new URL(input.trim());
  if (url.hostname !== 'github.com') throw new Error('Only public github.com repository URLs are supported.');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('Use a repository URL such as https://github.com/owner/repository.');
  return { owner: parts[0], repo: parts[1].replace(/\.git$/,'') };
}

function daysSince(date?:string|null) {
  if (!date) return Infinity;
  return Math.floor((Date.now() - Date.parse(date)) / 86400000);
}

function scanPermissions(files:{path:string;text:string}[]) {
  const text = files.map(x => x.text).join('\n');
  const hit = (re:RegExp) => re.test(text);
  return {
    filesystem: hit(/(?:fs\.(?:read|write|unlink|rm|mkdir|rename)|readFile|writeFile|pathlib\.|open\(|os\.path|shutil\.)/i),
    shell: hit(/(?:child_process|exec\s*\(|spawn\s*\(|subprocess|os\.system|popen\(|shell\s*=\s*true)/i),
    network: hit(/(?:fetch\s*\(|axios|https?\.request|requests\.|urllib\.|curl\s|wget\s)/i),
    secrets: hit(/(?:process\.env|import\.meta\.env|os\.getenv|dotenv|secret|api[_-]?key)/i),
    install: hit(/(?:curl[^\n]{0,100}\|\s*(?:bash|sh)|wget[^\n]{0,100}\|\s*(?:bash|sh)|sudo\s|rm\s+-rf|chmod\s+777)/i),
  };
}

export async function analyzeGitHubRepository(input:string) {
  const { owner, repo } = parseRepo(input);
  const data = await gh<Repo>(`/repos/${owner}/${repo}`);
  if (data.fork) return analyzeGitHubRepository(`https://github.com/${owner}/${repo}`);

  const ref = data.default_branch;
  const [commits, releases, languages, tree] = await Promise.all([
    gh<any[]>(`/repos/${owner}/${repo}/commits?per_page=5`),
    gh<any[]>(`/repos/${owner}/${repo}/releases?per_page=1`),
    gh<Record<string,number>>(`/repos/${owner}/${repo}/languages`),
    gh<any>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`),
  ]);

  const paths = Array.isArray(tree.tree) ? tree.tree.filter((x:any) => x.type === 'blob').map((x:any) => x.path) : [];
  const manifestCandidates = ['package.json','pyproject.toml','requirements.txt','go.mod','Cargo.toml','Dockerfile','docker-compose.yml','.env.example'];
  const manifests = await Promise.all(manifestCandidates.map(async path => ({ path, text: await fileText(owner,repo,path,ref) })));
  const sourcePaths = paths.filter((path:string) => /\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|sh)$/i.test(path) && /^(src|app|lib|scripts|server|api|agents?|tools?)[/\\]/i.test(path)).slice(0,18);
  const source = await Promise.all(sourcePaths.map(async path => ({ path, text: (await fileText(owner,repo,path,ref)).slice(0,16000) })));
  const readme = await fileText(owner,repo,'README.md',ref);
  const permissions = scanPermissions([...manifests, ...source]);
  const recentCommit = commits[0]?.commit?.committer?.date || commits[0]?.commit?.author?.date || null;
  const checks:Check[] = [
    { id:'repository', label:'Repository reachable', status:'pass', detail:'GitHub metadata was fetched successfully.' },
    { id:'readme', label:'Documentation', status:readme ? 'pass':'warn', detail:readme ? 'README.md is present.' : 'No README.md was found on the default branch.' },
    { id:'activity', label:'Recent activity', status:daysSince(recentCommit) <= 90 ? 'pass' : 'warn', detail:recentCommit ? `Latest sampled commit is ${daysSince(recentCommit)} days old.` : 'No commit timestamp was returned.' },
    { id:'release', label:'Release signal', status:releases.length ? 'pass':'warn', detail:releases.length ? `Latest release: ${releases[0].tag_name || releases[0].name}.` : 'No published release was found.' },
    { id:'automation', label:'Repository automation', status:paths.some(p => p.startsWith('.github/workflows/')) ? 'pass':'warn', detail:paths.some(p => p.startsWith('.github/workflows/')) ? 'GitHub Actions workflow files are present.' : 'No GitHub Actions workflow was detected.' },
  ];

  const riskFlags = [
    permissions.install && 'Install commands can change the host environment.',
    permissions.shell && 'Shell/process execution patterns were detected.',
    permissions.secrets && 'Environment variables or secret-handling patterns were detected.',
    permissions.network && 'Outbound network access patterns were detected.',
    permissions.filesystem && 'Filesystem access patterns were detected.',
  ].filter(Boolean) as string[];
  const age = daysSince(data.pushed_at);
  const base = data.archived || data.disabled ? 25 : age > 365 ? 45 : age > 180 ? 65 : 80;
  const deductions = (permissions.install ? 20:0) + (permissions.shell ? 12:0) + (permissions.secrets ? 7:0);
  const healthScore = Math.max(0, Math.min(100, base - deductions + (releases.length ? 5:0) + (readme ? 5:0)));
  const verdict = data.archived || age > 365 ? 'STALE' : healthScore >= 80 ? 'PROMISING' : healthScore >= 60 ? 'REVIEW' : 'HIGH-RISK';

  return {
    repository: { owner, repo, fullName:data.full_name, url:data.html_url, description:data.description, defaultBranch:ref, stars:data.stargazers_count, openIssues:data.open_issues_count, license:data.license?.spdx_id || null, language:data.language, topics:data.topics || [], archived:data.archived, fork:data.fork, pushedAt:data.pushed_at },
    freshness: { daysSincePush: Number.isFinite(age) ? age : null, latestCommit:recentCommit, latestRelease:releases[0] ? { name:releases[0].name, tag:releases[0].tag_name, publishedAt:releases[0].published_at } : null },
    stack: { languages:Object.keys(languages).sort((a,b) => languages[b]-languages[a]).slice(0,8), manifests:manifests.filter(x => x.text).map(x => x.path) },
    permissions,
    riskFlags,
    checks,
    score:healthScore,
    verdict,
    limitations:['Static repository inspection only; PARADOX does not execute untrusted agent code.','Permission signals are heuristic and should not be treated as a security audit.'],
  };
}

export { parseRepo };
