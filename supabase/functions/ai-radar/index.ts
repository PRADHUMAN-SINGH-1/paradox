import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set(['https://paradox.engineer','http://localhost:4321','http://127.0.0.1:4321']);

function headers(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED.has(origin) ? origin : 'https://paradox.engineer',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(req), 'Content-Type': 'application/json' },
  });
}

const fetchJson = async (url: string) => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(String(response.status));
  return await response.json();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers(req) });
  if (!['GET','POST'].includes(req.method)) return json(req, { error: 'Method not allowed' }, 405);

  const results = await Promise.allSettled([
    fetchJson('https://huggingface.co/api/models?sort=trending&direction=-1&limit=12'),
    fetchJson('https://api.github.com/search/repositories?q=AI+OR+LLM&sort=stars&order=desc&per_page=12'),
    fetchJson('https://hn.algolia.com/api/v1/search?query=AI%20LLM&tags=story&hitsPerPage=12'),
  ]);

  const models = results[0].status === 'fulfilled' && Array.isArray(results[0].value)
    ? results[0].value.map((x: any) => ({
        id: x.id,
        url: `https://huggingface.co/${x.id}`,
        downloads: Number(x.downloads || 0),
        likes: Number(x.likes || 0),
      }))
    : [];

  const repositories = results[1].status === 'fulfilled' && Array.isArray(results[1].value?.items)
    ? results[1].value.items.map((x: any) => ({
        name: x.name,
        full_name: x.full_name,
        url: x.html_url,
        stars: Number(x.stargazers_count || 0),
        language: x.language || 'AI project',
      }))
    : [];

  const stories = results[2].status === 'fulfilled' && Array.isArray(results[2].value?.hits)
    ? results[2].value.hits.map((x: any) => ({
        title: x.title,
        url: x.url || 'https://news.ycombinator.com/',
        points: Number(x.points || 0),
        comments: Number(x.num_comments || 0),
      }))
    : [];

  return json(req, {
    models,
    repositories,
    stories,
    fetchedAt: new Date().toISOString(),
  });
});
