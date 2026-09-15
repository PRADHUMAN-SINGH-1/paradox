Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405, cors);
  try {
    const body = await req.json();
    const raw = String(body.url || '').trim();
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') {
      return respond({ error: 'Enter a public GitHub repository URL.' }, 400, cors);
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return respond({ error: 'Enter a public GitHub repository URL.' }, 400, cors);
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    const token = Deno.env.get('GITHUB_TOKEN');
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (r.status === 404) return respond({ error: 'GitHub could not find this public repository.' }, 404, cors);
    if (r.status === 403) return respond({ error: 'GitHub is temporarily rate limiting requests. Please try again shortly.' }, 429, cors);
    if (!r.ok) return respond({ error: "We couldn't complete this analysis. Try again." }, 502, cors);
    const repoJson = await r.json();
    return respond({
      fullName: repoJson.full_name,
      description: repoJson.description,
      stars: repoJson.stargazers_count,
      pushedAt: repoJson.pushed_at,
      language: repoJson.language,
      license: repoJson.license?.spdx_id ?? null,
      archived: repoJson.archived,
      htmlUrl: repoJson.html_url,
    }, 200, cors);
  } catch {
    return respond({ error: 'Enter a public GitHub repository URL.' }, 400, cors);
  }
});

function respond(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
