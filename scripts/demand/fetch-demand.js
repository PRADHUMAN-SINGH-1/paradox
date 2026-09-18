import fs from 'node:fs/promises';

const OUT='src/data/demand/raw_demand.json';
const UA='PARADOX-Makers/1.0 (+https://paradox.engineer)';
const ACTIONABLE_WORDS=['calculator','converter','generator','maker','planner','picker','counter','timer','chart','bracket','bingo','raffle','seating','certificate','random','draw','split','convert','conversion','schedule','deadline','date','time','unit','percentage','percent','age'];
const safeFetch=async(url,kind='json')=>{
  try{
    const r=await fetch(url,{headers:{'user-agent':UA,accept:'application/json,text/xml;q=0.9,*/*;q=0.8'},signal:AbortSignal.timeout(12000)});
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return kind==='text'?await r.text():await r.json();
  }catch(error){
    console.warn(`[demand] skipped ${url}: ${error.message}`);
    return null;
  }
};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const rows=[];
const failures=[];
const previous=await fs.readFile(OUT,'utf8').then(JSON.parse).catch(()=>({signals:[],history:[]}));

const ids=await safeFetch('https://hacker-news.firebaseio.com/v0/topstories.json');
if(Array.isArray(ids)){
  const stories=await Promise.all(ids.slice(0,40).map(id=>safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)));
  for(const item of stories.filter(Boolean)){
    const query=clean(item.title);
    if(query) rows.push({query,traffic:Number(item.score)||0,geo:'Global',source:'Hacker News',signalType:'attention',observedAt:new Date().toISOString()});
  }
}else failures.push('Hacker News');

const geos=['US','IN','GB','CA','AU','DE','FR','JP','SG'];
for(const geo of geos){
  const xml=await safeFetch(`https://trends.google.com/trending/rss?geo=${geo}`,'text');
  if(!xml){failures.push(`Google Trends:${geo}`);continue;}
  for(const block of xml.match(/<item>[\s\S]*?<\/item>/gi)||[]){
    const title=(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').trim();
    const trafficRaw=(block.match(/<ht:approx_traffic[^>]*>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1]||'').replace(/,/g,'');
    const n=Number((trafficRaw.match(/[0-9.]+/)||['0'])[0])||0;
    if(title) rows.push({query:title,traffic:n,trafficLabel:trafficRaw,geo,source:'Google Trends RSS',signalType:'trend',observedAt:new Date().toISOString()});
  }
}

const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
const [year,month,day]=yesterday.split('-');
const wiki=await safeFetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${year}/${month}/${day}/all-days`);
if(wiki?.items?.[0]?.articles){
  for(const article of wiki.items[0].articles.slice(0,100)){
    const query=clean(article.article).replace(/_/g,' ');
    if(query) rows.push({query,traffic:Number(article.views)||0,geo:'Global',source:'Wikimedia Pageviews',signalType:'knowledge',observedAt:new Date().toISOString()});
  }
}else failures.push('Wikimedia');

const actionableCount=rows.filter(s=>ACTIONABLE_WORDS.some(w=>clean(s.query).toLowerCase().includes(w))).length;
if(actionableCount<8){
  console.warn(`[demand] only ${actionableCount} actionable live signals; merging evergreen fallback baseline.`);
  try{
    const fallback=JSON.parse(await fs.readFile('src/data/demand/fallback_demand.json','utf8'));
    if(Array.isArray(fallback.signals)){
      const existing=new Set(rows.map(s=>clean(s.query).toLowerCase()));
      rows.push(...fallback.signals.map(s=>({
        query:clean(s.query),traffic:Number(s.traffic)||0,geo:s.geo||'Global',
        source:s.source||'Evergreen fallback',signalType:s.signalType||'utility',
        observedAt:new Date().toISOString()
      })).filter(s=>s.query&&!existing.has(s.query.toLowerCase())));
    }
  }catch(error){
    console.error('[demand] fallback_demand.json unavailable:',error.message);
    failures.push('Evergreen fallback');
  }
}

const priorHistory=Array.isArray(previous.history)?previous.history:[];
const priorSignals=Array.isArray(previous.signals)?previous.signals:[];
const history=[...priorHistory,...priorSignals].slice(-5000);
const output={version:1,generatedAt:new Date().toISOString(),signals:rows,history,failures,
sources:{hackerNews:!failures.includes('Hacker News'),googleTrendsRss:!failures.some(x=>x.startsWith('Google Trends:')),wikimediaPageviews:!failures.includes('Wikimedia')}};
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n');
console.log(`Demand radar: ${rows.length} signals collected; ${actionableCount} live actionable signals; ${failures.length} source failures skipped.`);
