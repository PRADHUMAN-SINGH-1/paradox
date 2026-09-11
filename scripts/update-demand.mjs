const fs = await import('node:fs/promises');

const HEADERS = {
  'User-Agent': 'PARADOX-Makers-Global-Demand/3.0 (https://paradox.engineer)',
  Accept: 'application/json, text/xml;q=0.9, */*;q=0.8'
};

const WIKI_PROJECTS = [
  'en.wikipedia.org', 'es.wikipedia.org', 'hi.wikipedia.org', 'fr.wikipedia.org',
  'de.wikipedia.org', 'pt.wikipedia.org', 'ja.wikipedia.org', 'id.wikipedia.org',
  'zh.wikipedia.org', 'ru.wikipedia.org', 'ar.wikipedia.org', 'ko.wikipedia.org'
];

const TREND_GEOS = ['US','IN','GB','CA','AU','DE','FR','ES','IT','BR','MX','JP','KR','SG','ID','NG','ZA','AE','SA','PH'];

const TOOLS = [
  { id:'classroom-bingo', label:'Classroom bingo', mode:'bingo', route:'/bingo-card-generator/', terms:['bingo','teacher','teachers','classroom','school','student','students','education','exam','back to school','icebreaker'] },
  { id:'word-search-puzzles', label:'Word-search puzzles', mode:'words', route:'/word-search-generator/', terms:['word search','spelling','vocabulary','literacy','reading','puzzle','school','worksheet','crossword','scrabble'] },
  { id:'random-teams', label:'Random team splitting', mode:'teams', route:'/random-team-generator/', terms:['team','teams','group','groups','workshop','classroom','office','school','football','cricket','project'] },
  { id:'decision-wheel', label:'Random decision wheel', mode:'wheel', route:'/decision-wheel/', terms:['decision','choice','choose','wheel','random','picker','party','game','spin','names'] },
  { id:'tournament-brackets', label:'Tournament brackets', mode:'bracket', route:'/tournament-bracket-generator/', terms:['tournament','championship','cup','league','bracket','football','soccer','basketball','tennis','cricket','baseball','hockey','nfl','nba','fifa','ufc','wimbledon'] },
  { id:'raffle-tickets', label:'Raffle tickets', mode:'raffle', route:'/raffle-ticket-generator/', terms:['raffle','fundraiser','fundraising','charity','giveaway','tickets','draw','school fair'] },
  { id:'seating-charts', label:'Seating charts', mode:'seating', route:'/seating-chart-generator/', terms:['wedding','seating','dinner','conference','classroom','event','table','reception','banquet','party'] },
  { id:'certificates', label:'Certificates', mode:'certificate', route:'/certificate-maker/', terms:['certificate','award','graduation','appreciation','recognition','completion','teacher appreciation','diploma'] }
];

const TOPIC_RULES = [
  { id:'sports', tool:'tournament-brackets', terms:['football','soccer','basketball','tennis','cricket','baseball','hockey','nfl','nba','fifa','ufc','wimbledon','formula 1','f1','grand slam','championship','world cup','cup'] },
  { id:'school', tool:'classroom-bingo', terms:['school','teacher','teachers','classroom','student','students','education','exam','back to school','semester','lesson','homework'] },
  { id:'spelling', tool:'word-search-puzzles', terms:['spelling','vocabulary','literacy','reading','word','puzzle','crossword','scrabble'] },
  { id:'events', tool:'seating-charts', terms:['wedding','reception','dinner','conference','banquet','event','party','table'] },
  { id:'awards', tool:'certificates', terms:['graduation','award','awards','certificate','appreciation','recognition','diploma','completion'] },
  { id:'fundraising', tool:'raffle-tickets', terms:['raffle','fundraiser','fundraising','charity','giveaway','draw'] },
  { id:'groups', tool:'random-teams', terms:['team','teams','group','groups','workshop','office','classroom','project'] },
  { id:'choices', tool:'decision-wheel', terms:['decision','choice','choose','picker','random','wheel','spin','names','party','game'] }
];

const STOP_TRENDS = new Set(['weather','news','today','tomorrow','yesterday','live','latest','score','scores','results','what is','meaning','definition','near me']);

function cleanText(value='') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function lower(value='') {
  return cleanText(value).toLowerCase().replace(/[_-]+/g, ' ');
}

function xmlDecode(value='') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function parseApproxTraffic(raw='') {
  const value = lower(raw).replace(/,/g,'');
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)\s*([kmb])?/i);
  if (!match) return 0;
  const n = Number(match[1]);
  const suffix = (match[2] || '').toLowerCase();
  const multiplier = suffix === 'm' ? 1e6 : suffix === 'b' ? 1e9 : suffix === 'k' ? 1e3 : 1;
  return n * multiplier;
}

async function fetchText(url, timeout=18000) {
  const response = await fetch(url, { headers: HEADERS, redirect:'follow', signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchJson(url, timeout=18000) {
  const response = await fetch(url, { headers: HEADERS, redirect:'follow', signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function googleTrendsFeed(geo) {
  const url = `https://trends.google.com/trending/rss?geo=${geo}`;
  const xml = await fetchText(url);
  const items = [];
  for (const block of xml.match(/<item>[\s\S]*?<\/item>/gi) || []) {
    const title = xmlDecode((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1]);
    const trafficRaw = xmlDecode((block.match(/<ht:approx_traffic[^>]*>([\s\S]*?)<\/ht:approx_traffic>/i) || [,''])[1]);
    const pubDate = xmlDecode((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [,''])[1]);
    if (!title) continue;
    items.push({ query:title, trafficLabel:trafficRaw, traffic:parseApproxTraffic(trafficRaw), geo, pubDate, source:'Google Trends RSS' });
  }
  return items.slice(0, 25);
}

async function collectGoogleTrends() {
  const results = await Promise.allSettled(TREND_GEOS.map(geo => googleTrendsFeed(geo)));
  const trends = [];
  const failures = [];
  results.forEach((result,index) => {
    const geo = TREND_GEOS[index];
    if (result.status === 'fulfilled') trends.push(...result.value);
    else failures.push({ source:'Google Trends', geo, error:String(result.reason?.message || result.reason) });
  });
  return { trends, failures };
}

async function wikiSignals() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  const parts = date.toISOString().slice(0,10).split('-');
  const results = await Promise.allSettled(WIKI_PROJECTS.map(async project => {
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${project}/all-access/${parts[0]}/${parts[1]}/${parts[2]}/all-days`;
    const data = await fetchJson(url);
    return { project, date:parts.join('-'), articles:(data.items?.[0]?.articles || []).slice(0,500).map(a => ({ title:a.article, views:Number(a.views)||0 })) };
  }));
  return results.map((result,index) => result.status === 'fulfilled'
    ? result.value
    : { project:WIKI_PROJECTS[index], date:parts.join('-'), articles:[], error:String(result.reason?.message || result.reason) });
}

async function gdeltSignal(query) {
  try {
    const encoded = encodeURIComponent(`(${query})`);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encoded}&mode=timelinevolraw&format=json&timespan=7d`;
    const data = await fetchJson(url, 20000);
    const values = (data.timeline?.[0]?.data || []).map(point => Number(point.value) || 0);
    return { total:values.reduce((sum,value) => sum + value, 0), latest:values.at(-1) || 0 };
  } catch (error) {
    return { total:0, latest:0, error:String(error.message || error) };
  }
}

async function hackerNewsSignals() {
  try {
    const ids = await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json');
    const selected = ids.slice(0, 80);
    const results = await Promise.allSettled(selected.map(id => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 12000)));
    return results.filter(r => r.status==='fulfilled').map(r => r.value).filter(Boolean).map(item => ({
      title:cleanText(item.title || ''), score:Number(item.score)||0, comments:Number(item.descendants)||0, url:item.url || `https://news.ycombinator.com/item?id=${item.id}`
    })).filter(item => item.title);
  } catch {
    return [];
  }
}

async function githubSignals() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  const since = d.toISOString().slice(0,10);
  try {
    const data = await fetchJson(`https://api.github.com/search/repositories?q=created:%3E=${since}&sort=stars&order=desc&per_page=50`, 20000);
    return (data.items || []).map(item => ({ name:item.full_name, description:cleanText(item.description || ''), stars:Number(item.stargazers_count)||0, url:item.html_url }));
  } catch {
    return [];
  }
}

async function catalogDiscovery() {
  const catalogs = [
    { name:'public-apis/public-apis', url:'https://raw.githubusercontent.com/public-apis/public-apis/master/README.md' },
    { name:'whizkydee/Awesome-APIs', url:'https://raw.githubusercontent.com/whizkydee/Awesome-APIs/master/README.md' }
  ];
  const result = [];
  for (const catalog of catalogs) {
    try {
      const readme = await fetchText(catalog.url, 25000);
      const lines = readme.split('\n');
      let category = 'Uncategorized';
      const entries = [];
      for (const line of lines) {
        const heading = line.match(/^###\s+(.+?)(?:\s+#.*)?$/);
        if (heading) category = cleanText(heading[1]);
        const row = line.match(/^\|\s*\[\*\*?\*?\[?([^\]|]+)\]?\([^\)]+\)\*?\*?\s*\|\s*([^|]+)\|/);
        if (!row) continue;
        const name = cleanText(row[1].replace(/[*`]/g,''));
        const description = cleanText(row[2].replace(/[*`]/g,''));
        const relevance = lower(`${category} ${name} ${description}`);
        if (/(news|analytics|search|trend|social|education|school|events|sports|weather|calendar|open data|maps|geocod|books|content|entertainment|productivity)/.test(relevance)) {
          entries.push({ name, category, description });
        }
      }
      result.push({ name:catalog.name, url:catalog.url, scanned:true, relevantEntries:entries.slice(0,60), totalRelevant:entries.length });
    } catch (error) {
      result.push({ name:catalog.name, url:catalog.url, scanned:false, relevantEntries:[], totalRelevant:0, error:String(error.message || error) });
    }
  }
  return result;
}

function signalScore(trend) {
  const traffic = trend.traffic || 0;
  const base = Math.log10(Math.max(10, traffic)) * 8;
  const globalBonus = Math.min(6, 1 + (trend.geo === 'US' || trend.geo === 'IN' ? 2 : 0));
  return base + globalBonus;
}

function findToolMatches(text) {
  const value = lower(text);
  return TOOLS.map(tool => {
    const hits = tool.terms.filter(term => value.includes(term));
    return hits.length ? { id:tool.id, hits, weight:hits.length } : null;
  }).filter(Boolean).sort((a,b) => b.weight-a.weight);
}

function findRuleMatches(text) {
  const value = lower(text);
  return TOPIC_RULES.map(rule => {
    const hits = rule.terms.filter(term => value.includes(term));
    return hits.length ? { ...rule, hits, weight:hits.length } : null;
  }).filter(Boolean).sort((a,b) => b.weight-a.weight);
}

function slugify(value) {
  return lower(value).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70) || 'trend';
}

function buildSeoPages(trends, wikiTitles, gdeltScores) {
  const candidates = [];
  const seen = new Set();
  for (const trend of trends.sort((a,b) => signalScore(b)-signalScore(a))) {
    const query = cleanText(trend.query);
    if (query.length < 4 || STOP_TRENDS.has(lower(query))) continue;
    const rules = findRuleMatches(query);
    if (!rules.length) continue;
    const rule = rules[0];
    const tool = TOOLS.find(item => item.id === rule.tool);
    if (!tool) continue;
    const wikiSupport = wikiTitles.filter(item => rule.terms.some(term => lower(item.title).includes(term))).length;
    const gdeltSupport = gdeltScores[rule.tool]?.total || 0;
    const support = Math.log10(Math.max(1, gdeltSupport)) + Math.min(8, wikiSupport / 20);
    const score = signalScore(trend) + support * 2 + Math.min(5, trends.filter(t => lower(t.query) === lower(query)).length);
    const slug = `${slugify(query)}-${tool.mode}-generator`;
    if (seen.has(slug)) continue;
    seen.add(slug);
    candidates.push({
      slug,
      title:`${tool.label} for ${query}`,
      description:`Create a ${tool.mode} result around ${query} with a free, no-account browser tool. Print or save the finished result when you are ready.`,
      query,
      toolId:tool.id,
      toolLabel:tool.label,
      toolRoute:tool.route,
      topic:rule.id,
      score:Number(score.toFixed(2)),
      evidence:{ googleTrends:true, geos:[trend.geo], wikiSupport, gdeltSupport:Math.round(gdeltSupport) },
      generatedAt:new Date().toISOString()
    });
    if (candidates.length >= 14) break;
  }
  return candidates.sort((a,b)=>b.score-a.score);
}

const [trendBundle, wiki, hackerNews, githubRepos, catalogs] = await Promise.all([
  collectGoogleTrends(),
  wikiSignals(),
  hackerNewsSignals(),
  githubSignals(),
  catalogDiscovery()
]);

const gdeltScores = {};
for (const tool of TOOLS) {
  gdeltScores[tool.id] = await gdeltSignal(tool.terms.slice(0,6).join(' OR '));
}

const trendMap = new Map();
for (const item of trendBundle.trends) {
  const key = `${lower(item.query)}|${item.geo}`;
  if (!trendMap.has(key)) trendMap.set(key, item);
}
const trends = [...trendMap.values()].sort((a,b)=>signalScore(b)-signalScore(a));
const wikiTitles = wiki.flatMap(source => source.articles.map(article => ({ ...article, project:source.project })));

const toolStats = TOOLS.map(tool => {
  const matched = trends.filter(item => findToolMatches(item.query).some(match => match.id === tool.id));
  const queryScore = matched.reduce((sum,item)=>sum + signalScore(item),0);
  const media = gdeltScores[tool.id] || { total:0, latest:0 };
  return {
    id:tool.id, label:tool.label, mode:tool.mode, route:tool.route,
    score:Number((queryScore + Math.log10(Math.max(1,media.total))*15).toFixed(2)),
    trendMatches:matched.slice(0,8).map(item => ({ query:item.query, geo:item.geo, traffic:item.trafficLabel, trafficValue:item.traffic })),
    mediaSignal:Math.round(media.total),
    wikipediaMatches:wikiTitles.filter(item => tool.terms.some(term => lower(item.title).includes(term))).slice(0,8).map(item => ({ title:item.title, project:item.project, views:item.views }))
  };
}).sort((a,b)=>b.score-a.score);

const seoOpportunities = buildSeoPages([...trends], wikiTitles, gdeltScores);

const topTrends = trends.slice(0,30).map(item => ({ query:item.query, geo:item.geo, traffic:item.trafficLabel, trafficValue:item.traffic, pubDate:item.pubDate }));

const output = {
  version:3,
  generatedAt:new Date().toISOString(),
  refreshedAt:new Date().toISOString().slice(0,10),
  sourceHealth:{
    googleTrends:{ ok:trendBundle.trends.length>0, countries:TREND_GEOS.length, rows:trendBundle.trends.length, failures:trendBundle.failures.slice(0,8) },
    wikipedia:{ ok:wiki.some(s=>s.articles.length), languages:WIKI_PROJECTS.length },
    gdelt:{ ok:Object.values(gdeltScores).some(item=>item.total>0), checked:Object.keys(gdeltScores).length },
    hackerNews:{ ok:hackerNews.length>0, stories:hackerNews.length },
    github:{ ok:githubRepos.length>0, repositories:githubRepos.length }
  },
  sources:[
    { name:'Google Trends Trending Now RSS', url:'https://trends.google.com/trending/rss', scope:`Aggregate trending searches across ${TREND_GEOS.length} countries/regions.` },
    { name:'Wikimedia Analytics', url:'https://doc.wikimedia.org/analytics-api/', scope:`Top pageviews across ${WIKI_PROJECTS.length} language projects.` },
    { name:'GDELT', url:'https://www.gdeltproject.org/', scope:'Global news coverage volume for tool-relevant themes.' },
    { name:'Hacker News', url:'https://github.com/HackerNews/API', scope:'Public developer-interest signal.' },
    { name:'GitHub Search API', url:'https://docs.github.com/en/rest/search/search', scope:'Recently created repositories sorted by stars.' },
    { name:'public-apis/public-apis', url:'https://github.com/public-apis/public-apis', scope:'API discovery registry used to expand/validate candidate data sources.' },
    { name:'whizkydee/Awesome-APIs', url:'https://github.com/whizkydee/Awesome-APIs', scope:'Curated API discovery registry used to expand/validate candidate data sources.' }
  ],
  globalTrends:topTrends,
  opportunities:toolStats,
  seoOpportunities,
  catalogDiscovery:catalogs,
  developerSignals:{ hackerNews:hackerNews.slice(0,20), github:githubRepos.slice(0,20) },
  disclaimer:'PARADOX uses public aggregate signals only. This is not private user data and it is not a guarantee of Google search volume, rankings, traffic or revenue. SEO pages are capped and only created when a real tool can satisfy a detected topic.'
};

await fs.mkdir('src/data', { recursive:true });
await fs.writeFile('src/data/demand.json', `${JSON.stringify(output,null,2)}\n`);
await fs.writeFile('src/data/seo-opportunities.json', `${JSON.stringify(seoOpportunities,null,2)}\n`);
await fs.writeFile('src/data/api-sources.json', `${JSON.stringify(catalogs,null,2)}\n`);

console.log(`Demand engine: ${trends.length} Google Trends rows, ${toolStats.length} tool rankings, ${seoOpportunities.length} SEO opportunities.`);
