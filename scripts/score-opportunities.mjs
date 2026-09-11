import fs from 'node:fs/promises';

const RAW = 'src/data/raw_demand.json';
const OUT = 'src/data/verified_opportunities.json';

const TOOL_MAP = [
  { id:'classroom-bingo', mode:'bingo', route:'/bingo-card-generator/', terms:['bingo','classroom','teacher','school','student','education','icebreaker'] },
  { id:'word-search-puzzles', mode:'words', route:'/word-search-generator/', terms:['word search','spelling','vocabulary','literacy','reading','puzzle','worksheet'] },
  { id:'random-teams', mode:'teams', route:'/random-team-generator/', terms:['team','teams','group','groups','workshop','office','classroom','project'] },
  { id:'decision-wheel', mode:'wheel', route:'/decision-wheel/', terms:['decision','choice','choose','picker','random','wheel','spin'] },
  { id:'tournament-brackets', mode:'bracket', route:'/tournament-bracket-generator/', terms:['tournament','championship','cup','league','bracket','football','soccer','basketball','tennis','cricket'] },
  { id:'raffle-tickets', mode:'raffle', route:'/raffle-ticket-generator/', terms:['raffle','fundraiser','fundraising','charity','giveaway','tickets'] },
  { id:'seating-charts', mode:'seating', route:'/seating-chart-generator/', terms:['wedding','seating','dinner','conference','banquet','event','party','table'] },
  { id:'certificates', mode:'certificate', route:'/certificate-maker/', terms:['certificate','award','graduation','appreciation','recognition','diploma'] }
];

const UTILITY_WORDS = ['calculator','converter','generator','maker','planner','picker','counter','timer','chart','bracket','template'];
const INFO_WORDS = ['what is','meaning','definition','history','who is','why does','news','latest'];
const GENERIC_WORDS = new Set(['the','a','an','for','and','or','of','to','in','on','with','near','best','online','free','tool']);

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const text=v=>String(v||'').toLowerCase().replace(/[_-]+/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const logScale=v=>clamp(Math.log10(Math.max(10,Number(v)||0))*12,0,100);

function getSignals(raw) {
  const rows = raw?.sources?.googleTrends?.rows || [];
  return rows.map(row=>({ query:String(row.query||'').trim(), geo:row.geo||'', traffic:Number(row.traffic)||0, source:'Google Trends RSS' })).filter(x=>x.query);
}

function matchTool(query) {
  const q=text(query);
  let best=null;
  for(const tool of TOOL_MAP){
    const hits=tool.terms.filter(term=>q.includes(term));
    if(hits.length && (!best || hits.length>best.hits.length)) best={tool,hits};
  }
  return best;
}

function utilityIntent(query) {
  const q=text(query);
  let score=0.55;
  if(UTILITY_WORDS.some(w=>q.includes(w))) score+=0.65;
  if(INFO_WORDS.some(w=>q.includes(w))) score-=0.35;
  if(q.split(' ').length>=3) score+=0.2;
  return clamp(Number(score.toFixed(2)),0.1,2);
}

function saturation(query) {
  const tokens=text(query).split(' ').filter(Boolean);
  const unique=tokens.filter(t=>!GENERIC_WORDS.has(t));
  const genericRatio=tokens.length ? (tokens.length-unique.length)/tokens.length : 1;
  // Long-tail phrases are deliberately cheaper; broad one-word topics are expensive.
  return Number(clamp(9.5 - Math.min(5.5, Math.max(0,tokens.length-1)*1.35) + genericRatio*1.2,1,10).toFixed(2));
}

function velocity(current, history) {
  const q=text(current.query);
  const previous=(history||[]).filter(snapshot=>text(snapshot.query)===q);
  const recent=previous.slice(-7).map(x=>Number(x.traffic)||0);
  const older=previous.slice(-30,-7).map(x=>Number(x.traffic)||0);
  if(!recent.length || !older.length) return clamp(logScale(current.traffic),0,100);
  const avg=a=>a.reduce((s,v)=>s+v,0)/(a.length||1);
  const oldAvg=Math.max(1,avg(older)), recentAvg=avg(recent);
  return Number(clamp(50 + ((recentAvg-oldAvg)/oldAvg)*50,0,100).toFixed(2));
}

const raw=await fs.readFile(RAW,'utf8').then(JSON.parse).catch(()=>({sources:{}}));
const signals=getSignals(raw);
const history=raw.history||[];
const candidates=[];

for(const signal of signals){
  const match=matchTool(signal.query);
  if(!match) continue;
  const demandVelocity=velocity(signal,history);
  const intent=utilityIntent(signal.query);
  const saturation=saturation(signal.query);
  const feasibility=match.tool.route ? 1 : 0;
  if(!feasibility) continue;
  const score=Number((((demandVelocity*intent)/saturation)*feasibility).toFixed(2));
  candidates.push({
    slug:`${text(signal.query).replace(/[^a-z0-9]+/g,'-')}-${match.tool.mode}-generator`,
    title:`${match.tool.terms[0] ? match.tool.terms[0].replace(/\b\w/g,c=>c.toUpperCase()) : match.tool.mode} for ${signal.query}`,
    description:`Use a free browser tool for ${signal.query}. No account or upload required.`,
    query:signal.query,
    geo:signal.geo,
    toolId:match.tool.id,
    toolLabel:match.tool.id.replace(/-/g,' '),
    toolRoute:match.tool.route,
    topic:match.tool.mode,
    score,
    metrics:{demandVelocity,utilityIntent:intent,competitionSaturation:saturation,feasibilityMultiplier:feasibility},
    evidence:{source:signal.source,trafficProxy:signal.traffic}
  });
}

const deduped=new Map();
for(const item of candidates){
  const old=deduped.get(item.slug);
  if(!old || item.score>old.score) deduped.set(item.slug,item);
}
const verified=[...deduped.values()].sort((a,b)=>b.score-a.score).slice(0,50);
await fs.writeFile(OUT,JSON.stringify({
  version:2,
  generatedAt:new Date().toISOString(),
  formula:'((Demand Velocity × Utility Intent) / Competition Saturation) × Feasibility Multiplier',
  thresholds:{minScore:1, maxTargets:50},
  opportunities:verified
},null,2)+'\n');
console.log(`Scoring: ${verified.length} feasible opportunities.`);
