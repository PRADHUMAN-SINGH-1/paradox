import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const SITE='https://paradox.engineer';
const GSC_SITE=process.env.GSC_SITE_URL||'sc-domain:paradox.engineer';
const INDEXNOW_KEY='7b6f4a2d9e314c5f8a1d0b3e6f2c9a47';
const sitemapText=await fs.readFile('public/sitemap.xml','utf8').catch(()=> '');
const sitemapUrls=[...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].trim());
const urls=[...new Set(sitemapUrls.concat([`${SITE}/`,`${SITE}/ai/`,`${SITE}/daily/`,`${SITE}/world/`,`${SITE}/trending/`,`${SITE}/utilities/`]))];
function b64url(v){return Buffer.from(v).toString('base64url');}
async function getGoogleToken(){const raw=process.env.GSC_SERVICE_ACCOUNT_JSON_B64;if(!raw)return null;const a=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));const now=Math.floor(Date.now()/1000);const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));const c=b64url(JSON.stringify({iss:a.client_email,scope:'https://www.googleapis.com/auth/webmasters',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));const unsigned=`${h}.${c}`;const signer=crypto.createSign('RSA-SHA256');signer.update(unsigned);const assertion=`${unsigned}.${signer.sign(a.private_key,'base64url')}`;const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});if(!r.ok)throw new Error(`Google token ${r.status}: ${await r.text()}`);return (await r.json()).access_token;}
async function submitGoogleSitemap(){const token=await getGoogleToken();if(!token)return{enabled:false,reason:'GSC_SERVICE_ACCOUNT_JSON_B64 not configured'};const e=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/sitemaps/${encodeURIComponent(`${SITE}/sitemap.xml`)}`;const r=await fetch(e,{method:'PUT',headers:{authorization:`Bearer ${token}`}});if(!r.ok)throw new Error(`Google sitemap ${r.status}: ${await r.text()}`);return{enabled:true,submitted:`${SITE}/sitemap.xml`};}
async function submitBing(){const key=process.env.BING_WEBMASTER_API_KEY;if(!key)return{enabled:false,reason:'BING_WEBMASTER_API_KEY not configured'};const r=await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({siteUrl:SITE,urlList:urls.slice(0,500)})});if(!r.ok)throw new Error(`Bing indexing ${r.status}: ${await r.text()}`);return{enabled:true,submitted:Math.min(urls.length,500)};}
async function submitIndexNow(){const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:'paradox.engineer',key:INDEXNOW_KEY,keyLocation:`${SITE}/${INDEXNOW_KEY}.txt`,urlList:urls.slice(0,10000)})});const text=await r.text();if(!r.ok&&r.status!==202)throw new Error(`IndexNow ${r.status}: ${text}`);return{enabled:true,status:r.status,submitted:Math.min(urls.length,10000)};}
const results={};
try{results.google=await submitGoogleSitemap();}catch(error){results.google={enabled:false,error:error.message};}
try{results.bing=await submitBing();}catch(error){results.bing={enabled:false,error:error.message};}
try{results.indexNow=await submitIndexNow();}catch(error){results.indexNow={enabled:false,error:error.message};}
console.log(JSON.stringify({generatedAt:new Date().toISOString(),urlCount:urls.length,...results},null,2));
