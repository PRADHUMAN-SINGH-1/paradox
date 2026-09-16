import { supabase } from '../supabase.ts';
import { parseRepoRef, type RepoRef } from '../github-url.ts';
import { detectSignals } from './detect.ts';
import { detectRisks } from './risk.ts';
import { computeScores, decideVerdict } from './scores.ts';
import type { Analysis, FileHit, RepoMeta } from './types.ts';

const API = 'https://api.github.com';
const MAX_FILE = 80_000;
const MAX_FILES = 32;
const INTERESTING = [
  'README.md', 'readme.md', 'README', 'package.json', 'requirements.txt', 'pyproject.toml',
  'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'Dockerfile', 'docker-compose.yml',
  'docker-compose.yaml', '.env.example', 'compose.yml',
];
const SOURCE_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|java|kt|go|rs|php|cs|rb|swift|sh|yml|yaml)$/i;
const SKIP_PATH = /(?:^|\/)(?:node_modules|\.git|dist|build|coverage|vendor|target|\.next|\.astro)(?:\/|$)/i;

export class GitHubHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function userMessage(status: number): string {
  if (status === 404) return 'GitHub could not find this public repository.';
  if (status === 403 || status === 429) return 'GitHub is temporarily rate limiting requests. Please try again shortly.';
  if (status === 401) return 'GitHub rejected the request. Try again shortly.';
  return "We couldn't complete this analysis. Try again.";
}

function mapMeta(raw: Record<string, unknown>): RepoMeta {
  const owner = raw.owner as { login?: string } | undefined;
  const license = raw.license as { spdx_id?: string } | null;
  const spdx = license?.spdx_id && license.spdx_id !== 'NOASSERTION' ? license.spdx_id : null;
  return {
    name: String(raw.name || ''), fullName: String(raw.full_name || ''),
    owner: owner?.login || String(raw.full_name || '').split('/')[0],
    description: raw.description ? String(raw.description) : null,
    stars: Number(raw.stargazers_count || 0), forks: Number(raw.forks_count || 0),
    watchers: Number(raw.watchers_count || 0), openIssues: Number(raw.open_issues_count || 0),
    defaultBranch: String(raw.default_branch || 'main'), license: spdx,
    createdAt: String(raw.created_at || ''), updatedAt: String(raw.updated_at || ''),
    pushedAt: String(raw.pushed_at || raw.updated_at || ''),
    topics: Array.isArray(raw.topics) ? raw.topics.map(String) : [],
    archived: Boolean(raw.archived), language: raw.language ? String(raw.language) : null,
    htmlUrl: String(raw.html_url || ''), homepage: raw.homepage ? String(raw.homepage) : null,
  };
}

function analyzeEvidence(data: {
  repo: Record<string, unknown>;
  languages: Record<string, number>;
  root: Array<{ name?: string }>;
  files: Array<{ path: string; content: string; size?: number; skipped?: boolean }>;
  contributors: number | null;
  latestRelease: string | null;
  latestCommit: string | null;
  analyzedAt?: string;
}): Analysis {
  const meta = mapMeta(data.repo);
  const files: FileHit[] = data.files.filter((file) => file.content).map((file) => ({ path: file.path, content: file.content }));
  const names = data.root.map((item) => String(item.name || ''));
  const detections = detectSignals(files);
  const risks = detectRisks(files);
  const readme = files.find((file) => /^readme/i.test(file.path))?.content || '';
  const structure = files.map((file) => file.path);
  const scores = computeScores({ meta, readmeLength: readme.length, structureCount: structure.length, risks });
  const { verdict, reasons } = decideVerdict({ meta, scores, risks, readmeLength: readme.length, detections: detections.length });
  return {
    meta, languages: data.languages || {}, files: names, detections, risks, scores, verdict,
    verdictReasons: reasons, structure, readmeExcerpt: readme.replace(/\s+/g, ' ').slice(0, 900),
    contributors: data.contributors, latestRelease: data.latestRelease,
    latestCommit: data.latestCommit || meta.pushedAt, analyzedAt: data.analyzedAt || new Date().toISOString(),
    method: 'static-analysis',
  };
}

async function fetchViaProxy(ref: RepoRef): Promise<Analysis> {
  if (!supabase) throw new Error('proxy-unavailable');
  const { data, error } = await supabase.functions.invoke('analyze-repo', { body: { mode: 'analyze', url: ref.url } });
  if (error) throw error;
  if (!data || data.error) throw new GitHubHttpError(400, String(data?.error || 'Analysis failed.'));
  return analyzeEvidence(data);
}

async function githubJson(path: string): Promise<{ ok: true; status: number; data: any } | { ok: false; status: number }> {
  const r = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!r.ok) return { ok: false, status: r.status };
  return { ok: true, status: r.status, data: await r.json() };
}

function decodeContent(encoded: string): string {
  try {
    const cleaned = encoded.replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes).slice(0, MAX_FILE);
  } catch {
    return '';
  }
}

async function textFile(owner: string, repo: string, path: string): Promise<{ path: string; content: string; size: number; skipped: boolean } | null> {
  const res = await githubJson(`/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`);
  if (!res.ok || res.data?.type !== 'file') return null;
  const size = Number(res.data.size || 0);
  if (size > MAX_FILE) return { path, content: '', size, skipped: true };
  return { path, content: res.data.content ? decodeContent(res.data.content) : '', size, skipped: false };
}

function selectPaths(rootNames: string[], treeItems: Array<{ path?: string; type?: string; size?: number }>): string[] {
  const available = new Set(treeItems.filter((item) => item.type === 'blob' && item.path && !SKIP_PATH.test(item.path)).map((item) => item.path as string));
  const priority = INTERESTING.filter((name) => rootNames.some((item) => item.toLowerCase() === name.toLowerCase()))
    .concat(treeItems.filter((item) => item.type === 'blob' && item.path && !SKIP_PATH.test(item.path) && /\.github\/workflows\//i.test(item.path)).map((item) => item.path as string));
  const source = treeItems
    .filter((item) => item.type === 'blob' && item.path && !SKIP_PATH.test(item.path) && SOURCE_EXT.test(item.path) && Number(item.size || 0) <= MAX_FILE)
    .sort((a, b) => String(a.path).length - String(b.path).length)
    .map((item) => item.path as string);
  return [...new Set([...priority.filter((path) => available.has(path)), ...source])].slice(0, MAX_FILES);
}

async function fetchDirect(ref: RepoRef): Promise<Analysis> {
  const repoRes = await githubJson(`/repos/${ref.owner}/${ref.repo}`);
  if (!repoRes.ok) throw new GitHubHttpError(repoRes.status, userMessage(repoRes.status));
  if (repoRes.data.private === true) throw new GitHubHttpError(404, 'This repository is not publicly accessible.');

  const branch = String(repoRes.data.default_branch || 'main');
  const [langs, root, contributors, releases, commits, tree] = await Promise.all([
    githubJson(`/repos/${ref.owner}/${ref.repo}/languages`),
    githubJson(`/repos/${ref.owner}/${ref.repo}/contents`),
    githubJson(`/repos/${ref.owner}/${ref.repo}/contributors?per_page=100&anon=true`),
    githubJson(`/repos/${ref.owner}/${ref.repo}/releases?per_page=1`),
    githubJson(`/repos/${ref.owner}/${ref.repo}/commits?per_page=1`),
    githubJson(`/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`),
  ]);
  const rootItems = root.ok && Array.isArray(root.data) ? root.data : [];
  const names = rootItems.map((item: { name?: string }) => String(item.name || ''));
  const treeItems = tree.ok && Array.isArray(tree.data?.tree) ? tree.data.tree : [];
  const filePaths = selectPaths(names, treeItems);
  const files = (await Promise.all(filePaths.map((path) => textFile(ref.owner, ref.repo, path)))).filter(Boolean) as Array<{ path: string; content: string; size: number; skipped: boolean }>;
  return analyzeEvidence({
    repo: repoRes.data,
    languages: langs.ok ? langs.data : {},
    root: rootItems,
    files,
    contributors: contributors.ok && Array.isArray(contributors.data) ? Math.min(contributors.data.length, 100) : null,
    latestRelease: releases.ok && Array.isArray(releases.data) ? releases.data[0]?.tag_name || null : null,
    latestCommit: commits.ok && Array.isArray(commits.data) ? commits.data[0]?.commit?.committer?.date || null : null,
  });
}

export async function fetchAnalysis(input: string): Promise<Analysis> {
  const ref = parseRepoRef(input);
  try { return await fetchViaProxy(ref); }
  catch { return fetchDirect(ref); }
}
