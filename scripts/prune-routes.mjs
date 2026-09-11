import fs from 'node:fs/promises';

const PERFORMANCE='.seo-state/performance.json';
const PLAN='src/data/seo-opportunities.json';
const BLACKLIST='src/data/blacklist.json';

async function read(path,fallback){try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}}
const performance=await read(PERFORMANCE,{});
const candidates=await read(PLAN,[]);
const previous=await read(BLACKLIST,{version:1,updatedAt:null,slugs:[]});
const pages=performance?.searchConsole?.pages||[];
const now=Date.now();
const days=60*24*60*60*1000;
const bad=new Set(previous.slugs||[]);

for(const item of candidates){
  const firstSeen=item.firstSeen || item.generatedAt;
  const age=firstSeen ? now-new Date(firstSeen).getTime() : 0;
  const match=pages.find(row=>(row.keys?.[0]||'').includes(item.slug));
  const impressions=Number(match?.impressions)||0;
  const ctr=Number(match?.ctr)||0;
  if(age>=days && impressions>100 && ctr<0.005) bad.add(item.slug);
}

const output={version:1,updatedAt:new Date().toISOString(),criteria:{ageDays:60,minImpressions:100,maxCtr:0.005},slugs:[...bad].sort()};
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile(BLACKLIST,JSON.stringify(output,null,2)+'\n');
console.log(`Pruning: ${output.slugs.length} blacklisted routes.`);
