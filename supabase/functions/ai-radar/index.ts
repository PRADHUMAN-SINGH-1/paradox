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
  return new Response(JSON.stringify(body), {status, headers:{...headers(req),'Content-Type':'application/json'}});
}
const fetchJson=async(url:string)=>{
  const response=await fetch(url,{headers:{accept:'application/json','user-agent':'PARADOX-Radar/1.1'}});
  if(!response.ok)throw new Error(`${response.status} ${url}`);
  return await response.json();
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:headers(req)});
  if(!['GET','POST'].includes(req.method))return json(req,{error:'Method not allowed'},405);

  const modelSources=[
    'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=12',
    'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=likes&direction=-1&limit=12',
    'https://huggingface.co/api/models?sort=trending&direction=-1&limit=12'
  ];
  const results=await Promise.allSettled([
    Promise.any(modelSources.map(fetchJson)),
    fetchJson('https://api.github.com/search/repositories?q=AI+OR+LLM&sort=stars&order=desc&per_page=12'),
    fetchJson('https://hn.algolia.com/api/v1/search?query=AI%20LLM&tags=story&hitsPerPage=12')
  ]);

  const modelValue=results[0].status==='fulfilled'?results[0].value:[];
  const repoValue=results[1].status==='fulfilled'?results[1].value:null;
  const newsValue=results[2].status==='fulfilled'?results[2].value:null;

  const models=Array.isArray(modelValue)?modelValue.map((x:any)=>({
    id:x.id,url:`https://huggingface.co/${x.id}`,downloads:Number(x.downloads||0),likes:Number(x.likes||0),updated:x.lastModified||''
  })):[];
  const repositories=Array.isArray(repoValue?.items)?repoValue.items.map((x:any)=>({
    name:x.name,full_name:x.full_name,url:x.html_url,stars:Number(x.stargazers_count||0),language:x.language||'AI project',updated:x.updated_at||''
  })):[];
  const stories=Array.isArray(newsValue?.hits)?newsValue.hits.map((x:any)=>({
    title:x.title,url:x.url||'https://news.ycombinator.com/',points:Number(x.points||0),comments:Number(x.num_comments||0),created:x.created_at||''
  })):[];
  return json(req,{models,repositories,stories,fetchedAt:new Date().toISOString(),sources:{models:models.length?'huggingface':'offline',github:repositories.length?'github':'offline',news:stories.length?'hacker-news':'offline'}});
});