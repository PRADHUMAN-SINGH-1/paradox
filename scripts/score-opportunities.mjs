import fs from 'node:fs/promises';

const RAW='src/data/raw_demand.json';
const OUT='src/data/verified_opportunities.json';
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const raw=JSON.parse(await fs.readFile(RAW,'utf8'));
const signals=Array.isArray(raw) ? raw : (raw.signals || []);

function score(s){
  const demand=clamp(Number(s.volumeProxy ?? s.demand ?? 0));
  const intent=clamp(Number(s.utilityIntent ?? s.intent ?? 0));
  const saturation=clamp(Number(s.saturation ?? 0));
  const freshness=clamp(Number(s.freshness ?? 0));
  const score=Math.round(clamp((demand*intent)/100-saturation*.55+freshness*.08)*100)/100;
  return {...s,score,decision:score>=62&&intent>=55?'publish':score>=38?'watch':'reject'};
}
const ranked=signals.filter(s=>s.query).map(score).sort((a,b)=>b.score-a.score);
const verified=ranked.filter(x=>x.decision!=='reject').slice(0,50);
await fs.writeFile(OUT,JSON.stringify({version:1,generatedAt:new Date().toISOString(),formula:'(volumeProxy × utilityIntent) − saturation + freshness bonus',signals:verified},null,2)+'\n');
console.log('Verified opportunities:',verified.length);
