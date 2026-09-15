import { parseRepoRef, type RepoRef } from '../github-url.ts';
import { detectSignals } from './detect.ts';
import { detectRisks } from './risk.ts';
import { computeScores, decideVerdict } from './scores.ts';
import type { Analysis, FileHit, RepoMeta } from './types.ts';

const API = 'https://api.github.com';
const MAX_FILE = 80_000;
const INTERESTING = [
  'README.md', 'readme.md', 'README',
  'package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod',
  'pom.xml', 'build.gradle', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  '.env.example', 'compose.yml',
];

export class GitHubHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function userMessage(status: number): string {
  if (status === 404) return 'GitHub could not find this public repository.';
  if (status === 403) return 'GitHub is temporarily rate limiting requests. Please try again shortly.';
  if (status === 401) return 'GitHub rejected the request. Try again shortly.';
  if (status >= 500) return "We couldn't complete this analysis. Try again.";
  return "We couldn't complete this analysis. Try again.";
}

export async function githubJson(path: string, token?: string): Promise<{ ok: true; status: number; data: unknown } | { ok: false; status: number }> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { headers });
  if (!r.ok) return { ok: false, status: r.status };
  return { ok: true, status: r.status, data: await r.json() };
}

function decodeContent(encoded: string): string {
  try {
    const bin = atob(encoded.replace(/\n/g, ''));
    return bin.slice(0, MAX_FILE);
  } catch {
    return '';
  }
}

async function textFile(owner: string, repo: string, path: string, token?: string): Promise<string> {
  const res = await githubJson(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll('%2F', '/')}`, token);
  if (!res.ok) return '';
  const data = res.data as { content?: string; encoding?: string; type?: string };
  if (data.type !== 'file' || !data.content) return '';
  return decodeContent(data.content);
}

function mapMeta(raw: Record<string, unknown>): RepoMeta {
  const owner = raw.owner as { login?: string } | undefined;
  const license = raw.license as { spdx_id?: string } | null;
  const spdx = license?.spdx_id && license.spdx_id !== 'NOASSERTION' ? license.spdx_id : null;
  return {
    name: String(raw.name || ''),
    fullName: String(raw.full_name || ''),
    owner: owner?.login || String(raw.full_name || '').split('/')[0],
    description: raw.description ? String(raw.description) : null,
    stars: Number(raw.stargazers_count || 0),
    forks: Number(raw.forks_count || 0),
    watchers: Number(raw.watchers_count || 0),
    openIssues: Number(raw.open_issues_count || 0),
    defaultBranch: String(raw.default_branch || 'main'),
    license: spdx,
    createdAt: String(raw.created_at || ''),
    updatedAt: String(raw.updated_at || ''),
    pushedAt: String(raw.pushed_at || raw.updated_at || ''),
    topics: Array.isArray(raw.topics) ? raw.topics.map(String) : [],
    archived: Boolean(raw.archived),
    language: raw.language ? String(raw.language) : null,
    htmlUrl: String(raw.html_url || ''),
    homepage: raw.homepage ? String(raw.homepage) : null,
  };
}

export async function fetchAnalysis(input: string, token?: string): Promise<Analysis> {
  const ref: RepoRef = parseRepoRef(input);
  const repoRes = await githubJson(`/repos/${ref.owner}/${ref.repo}`, token);
  if (!repoRes.ok) throw new GitHubHttpError(repoRes.status, userMessage(repoRes.status));
  const raw = repoRes.data as Record<string, unknown>;
  if (raw.private === true) throw new GitHubHttpError(404, 'This repository is not publicly accessible.');
  const meta = mapMeta(raw);

  const [langsRes, rootRes, contribRes, relRes, commitRes] = await Promise.all([
    githubJson(`/repos/${ref.owner}/${ref.repo}/languages`, token),
    githubJson(`/repos/${ref.owner}/${ref.repo}/contents`, token),
    githubJson(`/repos/${ref.owner}/${ref.repo}/contributors?per_page=1&anon=true`, token),
    githubJson(`/repos/${ref.owner}/${ref.repo}/releases?per_page=1`, token),
    githubJson(`/repos/${ref.owner}/${ref.repo}/commits?per_page=1`, token),
  ]);

  const languages = langsRes.ok ? (langsRes.data as Record<string, number>) : {};
  const root = rootRes.ok && Array.isArray(rootRes.data) ? (rootRes.data as Array<{ name: string; type: string }>) : [];
  const names = root.map((x) => x.name);

  const wanted = INTERESTING.filter((n) => names.some((x) => x.toLowerCase() === n.toLowerCase()));
  const workflowDir = names.includes('.github');
  let workflowFiles: string[] = [];
  if (workflowDir) {
    const wf = await githubJson(`/repos/${ref.owner}/${ref.repo}/contents/.github/workflows`, token);
    if (wf.ok && Array.isArray(wf.data)) {
      workflowFiles = (wf.data as Array<{ name: string; type: string }>)
        .filter((x) => x.type === 'file')
        .map((x) => `.github/workflows/${x.name}`)
        .slice(0, 6);
    }
  }

  const filePaths = [...wanted, ...workflowFiles].slice(0, 16);
  const contents = await Promise.all(filePaths.map(async (path) => ({ path, content: await textFile(ref.owner, ref.repo, path, token) })));
  const files: FileHit[] = contents.filter((f) => f.content);

  const detections = detectSignals(files);
  const risks = detectRisks(files);
  const readme = files.find((f) => /^readme/i.test(f.path))?.content || '';
  const structure = files.map((f) => f.path);
  const scores = computeScores({ meta, readmeLength: readme.length, structureCount: structure.length, risks });
  const { verdict, reasons } = decideVerdict({ meta, scores, risks, readmeLength: readme.length, detections: detections.length });

  let contributors: number | null = null;
  if (contribRes.ok) {
    contributors = Array.isArray(contribRes.data) ? contribRes.data.length : null;
  }

  const releases = relRes.ok && Array.isArray(relRes.data) ? (relRes.data as Array<{ tag_name?: string }>) : [];
  const commits = commitRes.ok && Array.isArray(commitRes.data) ? (commitRes.data as Array<{ commit?: { committer?: { date?: string } } }>) : [];

  return {
    meta,
    languages,
    files: names,
    detections,
    risks,
    scores,
    verdict,
    verdictReasons: reasons,
    structure,
    readmeExcerpt: readme.replace(/\s+/g, ' ').slice(0, 900),
    contributors,
    latestRelease: releases[0]?.tag_name || null,
    latestCommit: commits[0]?.commit?.committer?.date || meta.pushedAt,
    analyzedAt: new Date().toISOString(),
    method: 'static-analysis',
  };
}
