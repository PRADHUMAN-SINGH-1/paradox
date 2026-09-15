import { analyzeRepo,renderAnalysis,metricSnapshot } from './agent-core.js';
import { supabase } from './auth.js';
const form=document.querySelector('#verifyForm');const input=document.querySelector('#repoUrl');const status=document.querySelector('#verifyStatus');const result=document.querySelector('#result');
const setStatus=x=>status.textContent=x;
async function save(x){
  if(!supabase)return setStatus('Analysis complete. Sign in and connect Supabase to save it.');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return setStatus('Sign in to save this agent to your shortlist.');
  const s=metricSnapshot(x);
  const {error}=await supabase.from('saved_agents').upsert({user_id:user.id,repo_url:s.url,repo_name:s.name,score:s.score,verdict:s.verdict}, {onConflict:'user_id,repo_url'});
  if(error)return setStatus(error.message);
  setStatus('Saved to your shortlist.');
}
form?.addEventListener('submit',async e=>{e.preventDefault();result.hidden=true;setStatus('Reading public GitHub evidence…');try{const x=await analyzeRepo(input.value);result.innerHTML=renderAnalysis(x);result.hidden=false;history.replaceState(null,'',`/verify/?url=${encodeURIComponent(x.url)}`);result.querySelector('.save')?.addEventListener('click',()=>save(x));setStatus('Analysis complete.');}catch(err){setStatus(err.message||'Analysis failed.');}});
const q=new URLSearchParams(location.search).get('url');if(q){input.value=q;form.requestSubmit();}
