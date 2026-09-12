import fs from 'node:fs/promises';

const RAW='src/data/raw_demand.json';
const OUT='src/data/verified_opportunities.json';

const TOOL_MAP=[
{id:'classroom-bingo',mode:'bingo',route:'/bingo-card-generator/',terms:['bingo','classroom','teacher','school','student','education','icebreaker']},
{id:'word-search-puzzles',mode:'words',route:'/word-search-generator/',terms:['word search','spelling','vocabulary','literacy','reading','puzzle','worksheet']},
{id:'random-teams',mode:'teams',route:'/random-team-generator/',terms:['team','teams','group','groups','workshop','office','classroom','project']},
{id:'decision-wheel',mode:'wheel',route:'/decision-wheel/',terms:['decision','choice','choose','picker','random','wheel','spin']},
{id:'tournament-brackets',mode:'bracket',route:'/tournament-bracket-generator/',terms:['tournament','championship','cup','league','bracket','football','soccer','basketball','tennis','cricket']},
{id:'raffle-tickets',mode:'raffle',route:'/raffle-ticket-generator/',terms:['raffle','fundraiser','fundraising','charity','giveaway','tickets']},
{id:'seating-charts',mode:'seating',route:'/seating-chart-generator/',terms:['wedding','seating','dinner','conference','banquet','event','party','table']},
{id:'certificates',mode:'certificate',route:'/certificate-maker/',terms:['certificate','award','graduation','appreciation','recognition','diploma']}
];

const UTILITY_WORDS=['calculator','converter','generator','maker','planner','picker','counter','timer','chart','bracket','template','tool'];
const INFO_WORDS=['what is','meaning','definition','history','who is','why does','news','latest','biography'];
const GENERIC_WORDS=new Set(['the','a','an','for','and','or','of','to','in','on','with','near','best','online','free','tool']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const text=v=>String(v??'').toLowerCase().replace(/[_-]+/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

function matchTool(query){
 const q=text(query);let best=null;
 for(const tool of TOOL_MAP){const hits=tool.terms.filter(term=>q.includes(term));if(hits.length&&(!best||hits.length>best.hits.length))best={tool,hits};}
 return best;
}
function utilityIntent(query){
 const q=text(query);let score=.55;
 if(UTILITY_WORDS.some(w=>q.includes(w)))score+=.65;
 if(INFO_WORDS.some(w=>q.includes(w)))score-=.35;
 if(q.split(' ').length>=3)score+=.2;
 return clamp(Number(score.toFixed(2)),.1,2);
}
function saturation(query){
 const tokens=text(query).split(' ').filter(Boolean);
 const unique=tokens.filter(t=>!GENERIC_WORDS.has(t));
 const genericRatio=tokens.length?(tokens.length-unique.length)/tokens.length:1;
 return Number(clamp(9.5-Math.min(5.5,Math.max(0,tokens.length-1)*1.35)+genericRatio*1.2,1,10).toFixed(2));
}
function velocity(signal,signals,history){
 const q=text(signal.query);
 const previous=(history||[]).filter(s=>text(s.query)===q);
 const recent=previous.slice(-7).map(s=>Number(s.traffic)||0),older=previous.slice(-30,-7).map(s=>Number(s.traffic)||0);
 if(recent.length&&older.length){
  const avg=a=>a.reduce((x,n)=>x+n,0)/a.length;
  return Number(clamp(50+((avg(recent)-Math.max(1,avg(older)))/Math.max(1,avg(older)))*50,0,100).toFixed(2));
 }
 const traffic=Number(signal.traffic)||0;
 const peers=signals.map(s=>Number(s.traffic)||0).filter(n=>n>0).sort((a,b)=>a-b);
 if(!peers.length)return 0;
 const rank=peers.filter(n=>n<=traffic).length/peers.length;
 const trendBoost=signal.signalType==='trend'?10:0;
 return Number(clamp(25+rank*65+trendBoost,0,100).toFixed(2));
}
function normalizeSignals(raw){
 const modern=Array.isArray(raw?.signals)?raw.signals:[];
 const legacy=Array.isArray(raw?.sources?.googleTrends?.rows)?raw.sources.googleTrends.rows.map(r=>({...r,source:'Google Trends RSS',signalType:'trend'})):[];
 const seen=new Set();return [...modern,...legacy].map(s=>({query:String(s.query||'').trim(),geo:s.geo||'Global',traffic:Number(s.traffic)||0,source:s.source||'Public demand signal',signalType:s.signalType||'public',context:s.context||''})).filter(s=>s.query&&!seen.has(text(s.query))&&seen.add(text(s.query)));
}
const raw=await fs.readFile(RAW,'utf8').then(JSON.parse).catch(()=>({}));
const signals=normalizeSignals(raw),history=Array.isArray(raw.history)?raw.history:[];
const candidates=[];
for(const signal of signals){
 const match=matchTool(signal.query);if(!match)continue;
 const demandVelocity=velocity(signal,signals,history);
 const utility=utilityIntent(signal.query),sat=saturation(signal.query);
 const score=Number(((demandVelocity*utility)/sat).toFixed(2));
 if(score<=80)continue;
 candidates.push({
  slug:`${text(signal.query).replace(/[^a-z0-9]+/g,'-')}-${match.tool.mode}-generator`,
  title:`${match.tool.terms[0].replace(/\b\w/g,c=>c.toUpperCase())} for ${signal.query}`,
  description:`Use a free browser tool for ${signal.query}. No account or upload required.`,
  query:signal.query,geo:signal.geo,toolId:match.tool.id,toolLabel:match.tool.id.replace(/-/g,' '),
  toolRoute:match.tool.route,topic:match.tool.mode,score,
  metrics:{demandVelocity,utilityIntent:utility,competitionSaturation:sat,feasibilityMultiplier:1},
  evidence:{source:signal.source,trafficProxy:signal.traffic,signalType:signal.signalType}
 });
}
const deduped=new Map();
for(const item of candidates){const key=item.slug;const old=deduped.get(key);if(!old||item.score>old.score)deduped.set(key,item);}
const verified=[...deduped.values()].sort((a,b)=>b.score-a.score).slice(0,50);
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile(OUT,JSON.stringify({
 version:3,generatedAt:new Date().toISOString(),
 formula:'((Demand Velocity × Utility Intent) / Competition Saturation) × Feasibility Multiplier',
 thresholds:{minScore:80,maxTargets:50},signalCount:signals.length,
 opportunities:verified
},null,2)+'\n');
console.log(`Scoring: ${verified.length} verified opportunities from ${signals.length} normalized signals.`);
