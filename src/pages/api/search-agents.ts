import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')?.trim() || 'AI agent';
  if (query.length < 2) return Response.json({ items:[] });
  const q = encodeURIComponent(`${query} in:name,description stars:>5 archived:false`);
  const response = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=24`, {
    headers:{ Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10', ...(import.meta.env.GITHUB_TOKEN ? { Authorization:`Bearer ${import.meta.env.GITHUB_TOKEN}` } : {}) },
    signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) return Response.json({ error:'GitHub search is temporarily unavailable.' }, { status:502 });
  const data = await response.json();
  return Response.json({ items:(data.items||[]).map((item:any) => ({ fullName:item.full_name, name:item.name, owner:item.owner.login, description:item.description, stars:item.stargazers_count, language:item.language, pushedAt:item.pushed_at, url:item.html_url })) });
};
