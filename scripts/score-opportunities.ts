import { readFile, writeFile } from "node:fs/promises";

type Signal={query:string;traffic?:number;traffic7d?:number[];traffic30d?:number[];utilityIntent?:number;competitionSaturation?:number;toolId?:string;feasible?:boolean;geo?:string;context?:Record<string,unknown>};
type RawDemand={signals?:Signal[];history?:Signal[]};
const INPUT="src/data/raw_demand.json", OUTPUT="src/data/verified_opportunities.json", MIN_SCORE=80;
const UTILITY=["calculator","generator","converter","maker","planner","picker","counter","timer","chart","bracket","template","checker","formatter","random"];
const INFO=["what is","meaning","definition","history","who is","why is","how does","news","latest news","biography"];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const avg=(a:number[])=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
const norm=(s:unknown)=>String(s??"").toLowerCase().trim().replace(/\s+/g," ");
function velocity(s:Signal){const r=s.traffic7d??[],b=s.traffic30d??[];if(r.length&&b.length)return Number(clamp(50+((avg(r)-Math.max(avg(b),1))/Math.max(avg(b),1))*50,0,100).toFixed(2));return Number(clamp(Math.log10(Math.max(1,s.traffic??0)+1)*18,0,100).toFixed(2))}
function intent(q:string,e?:number){if(typeof e==="number")return clamp(e,.1,2);const x=norm(q);let n=.55;if(UTILITY.some(t=>x.includes(t)))n+=.85;if(INFO.some(t=>x.includes(t)))n-=.35;if(x.split(" ").length>=3)n+=.15;return Number(clamp(n,.1,2).toFixed(2))}
function saturation(q:string,e?:number){if(typeof e==="number")return clamp(e,1,10);const t=norm(q).split(" ").filter(Boolean);const generic=t.filter(x=>["free","online","best","tool","for","the","a","in"].includes(x)).length;return Number(clamp(9.5-Math.min(5.5,Math.max(0,t.length-1)*1.35)+generic*.25,1,10).toFixed(2))}
function feasible(s:Signal):0|1{return s.feasible===false||!s.toolId?0:1}
function slug(s:string){return norm(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}
const raw:RawDemand=JSON.parse(await readFile(INPUT,"utf8"));const signals=[...(raw.signals??[]),...(raw.history??[])];
const map=new Map<string,unknown>();
for(const s of signals){if(!s.query?.trim()||!feasible(s))continue;const v=velocity(s),i=intent(s.query,s.utilityIntent),c=saturation(s.query,s.competitionSaturation),score=Number((v*i/c).toFixed(2));if(score<=MIN_SCORE)continue;const o={...s,slug:slug(s.query),score,metrics:{demandVelocity:v,utilityIntent:i,competitionSaturation:c,feasibilityMultiplier:1}};const old=map.get(slug(s.query)) as {score?:number}|undefined;if(!old||score>(old.score??0))map.set(slug(s.query),o)}
const opportunities=[...map.values()].sort((a,b)=>(b as any).score-(a as any).score);
await writeFile(OUTPUT,JSON.stringify({version:1,generatedAt:new Date().toISOString(),formula:"((Demand Velocity * Utility Intent) / Competition Saturation) * Feasibility Multiplier",threshold:MIN_SCORE,opportunities},null,2)+"\n");
console.log(`Generated ${opportunities.length} verified opportunities.`);