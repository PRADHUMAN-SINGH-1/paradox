import { fetchAnalysis, GitHubHttpError } from '../lib/analysis/fetch.ts';
import { allowAnonymousVerify, readCache, writeCache } from '../lib/analysis/cache.ts';
import { renderAnalysis } from '../lib/analysis/render.ts';
import type { Analysis } from '../lib/analysis/types.ts';
import { track } from '../lib/analytics.ts';
import { parseRepoRef } from '../lib/github-url.ts';
import { currentUser, supabase } from '../lib/supabase.ts';
import { saveLocalAgent, saveLocalScan } from '../lib/local-state.ts';

function statusEl(): HTMLElement | null { return document.querySelector<HTMLElement>('#verifyStatus'); }
function resultEl(): HTMLElement | null { return document.querySelector<HTMLElement>('#result'); }
function setStatus(text: string) { const el = statusEl(); if (el) el.textContent = text; }
function downloadAnalysis(analysis: Analysis) {
  const payload = JSON.stringify({ exportedAt:new Date().toISOString(), repository:analysis.meta.fullName, verdict:analysis.verdict, scores:analysis.scores, metadata:analysis.meta, latestRelease:analysis.latestRelease, contributors:analysis.contributors, languages:analysis.languages, detections:analysis.detections, risks:analysis.risks, verdictReasons:analysis.verdictReasons, analyzedAt:analysis.analyzedAt }, null, 2);
  const href = URL.createObjectURL(new Blob([payload], { type:'application/json' }));
  const link = document.createElement('a'); link.href=href; link.download=`${analysis.meta.fullName.replace(/[^A-Za-z0-9._-]+/g,'-')}-paradox-analysis.json`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function showSaveFeedback(message: string, downloaded=false) {
  const status=statusEl(); if(!status)return; status.textContent=message; let panel=document.querySelector<HTMLElement>('#verifySaveFeedback');
  if(!panel){panel=document.createElement('div');panel.id='verifySaveFeedback';panel.setAttribute('role','status');panel.innerHTML=`<strong>Analysis saved.</strong><span>${downloaded?'A JSON evidence file was downloaded.':'Your analysis is now saved on this device.'}</span><a href="/dashboard/">Open dashboard →</a>`;panel.style.cssText='display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px;padding:14px 16px;border:1px solid #334038;border-radius:10px;background:#0d1411;color:#eaf0ec;font:500 12px/1.45 "DM Sans",sans-serif';panel.querySelector('strong')?.setAttribute('style','color:#d9ff3f;font-weight:800');panel.querySelector('a')?.setAttribute('style','margin-left:auto;color:#d9ff3f;font:700 10px "DM Mono",monospace;text-decoration:none');status.insertAdjacentElement('afterend',panel)}
}
async function persist(analysis: Analysis) {
  saveLocalScan({ repository:analysis.meta.fullName, verdict:analysis.verdict, score:analysis.scores.paradox, scannedAt:analysis.analyzedAt });
  if(!supabase)return;
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try { user=await currentUser(); } catch { return; }
  if(!user)return;
  const { error } = await supabase.from('scan_history').insert({ user_id:user.id, repository_url:analysis.meta.htmlUrl, repository_full_name:analysis.meta.fullName, verdict:analysis.verdict, score:analysis.scores.paradox, analysis_json:{ scores:analysis.scores, verdict:analysis.verdict, detections:analysis.detections, risks:analysis.risks.map(r=>({category:r.category,severity:r.severity,file:r.file})) } });
  if(error) console.warn('PARADOX: scan history insert failed', error.message);
}
async function save(fullName:string,url:string,verdict:string,score:number,analysis:Analysis,button?:HTMLButtonElement|null){
  if(button){button.disabled=true;button.textContent='Saving…';}
  try {
    track('save_agent',{repository:fullName,verdict,score});
    saveLocalAgent({repository:fullName,url,verdict,score,savedAt:new Date().toISOString()});
    downloadAnalysis(analysis);
    if(!supabase){showSaveFeedback('Saved on this device and downloaded.',true);return}
    let user: Awaited<ReturnType<typeof currentUser>> = null;
    try { user=await currentUser(); } catch { showSaveFeedback('Saved on this device. Authentication could not be checked, so dashboard sync was skipped.',true);return; }
    if(!user){showSaveFeedback('Saved on this device. Sign in later from the dashboard to sync future saves.',true);return}
    const {error}=await supabase.from('saved_agents').upsert({user_id:user.id,repository_url:url,repository_full_name:fullName,verdict,score},{onConflict:'user_id,repository_full_name'});
    if(error){showSaveFeedback('Saved on this device and downloaded. Dashboard sync failed, but your report is safe.',true);return}
    showSaveFeedback('Saved to your dashboard and downloaded.',true);
  } catch {
    setStatus('The report was downloaded, but the save could not be completed.');
  } finally { if(button){button.disabled=false;button.textContent='Saved ✓';} }
}
export async function runVerify(url:string){const result=resultEl();let parsed:ReturnType<typeof parseRepoRef>;try{parsed=parseRepoRef(url)}catch{setStatus('Enter a public GitHub repository URL.');track('verify_failed',{repository:url});return}if(!allowAnonymousVerify()){setStatus('Too many verification requests from this browser. Wait a few minutes or sign in.');return}track('verify_started',{repository:url,source_page:location.pathname});setStatus('Reading public GitHub evidence…');if(result)result.hidden=true;try{const cached=readCache(parsed.fullName);const analysis=cached??await fetchAnalysis(parsed.url);if(!cached)writeCache(analysis);if(result){result.innerHTML=renderAnalysis(analysis);result.hidden=false;result.querySelector('[data-save]')?.addEventListener('click',(event)=>{const button=event.currentTarget as HTMLButtonElement;void save(analysis.meta.fullName,analysis.meta.htmlUrl,analysis.verdict,analysis.scores.paradox,analysis,button).catch(()=>setStatus('Unable to save this analysis.'))});result.querySelector('[data-github]')?.addEventListener('click',()=>track('github_clicked',{repository:analysis.meta.fullName}))}history.replaceState(null,'',`/verify/?url=${encodeURIComponent(analysis.meta.htmlUrl)}`);if(!cached)await persist(analysis);setStatus(cached?'Cached static analysis complete. Run fresh analysis for new evidence.':'Static analysis complete. Save it to your dashboard or download the evidence file.');track('verify_completed',{repository:analysis.meta.fullName,verdict:analysis.verdict,score:analysis.scores.paradox,cached:cached?'true':'false'})}catch(err){const message=err instanceof GitHubHttpError?err.message:"We couldn't complete this analysis. Try again.";setStatus(message);track('verify_failed',{repository:url})}}
export function bootVerify(){const form=document.querySelector<HTMLFormElement>('#verifyForm');const input=document.querySelector<HTMLInputElement>('#repoUrl');form?.addEventListener('submit',e=>{e.preventDefault();if(input)void runVerify(input.value).catch(()=>setStatus("We couldn't complete this analysis. Try again."))});const q=new URLSearchParams(location.search).get('url');if(q&&input)void runVerify(q).catch(()=>setStatus("We couldn't complete this analysis. Try again."))}
bootVerify();
