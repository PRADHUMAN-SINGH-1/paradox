import { supabase } from './auth.js';
const email=document.querySelector('#accountEmail');const saved=document.querySelector('#savedAgents');const history=document.querySelector('#scanHistory');const out=document.querySelector('#signOut');
if(!supabase){email.textContent='Authentication is not configured yet.';saved.innerHTML=history.innerHTML='<p class="muted">Connect Supabase to enable accounts.</p>';}else{
  const {data:{user}}=await supabase.auth.getUser();if(!user){location.href='/auth/';}
  else{email.textContent=user.email||'';const s=await supabase.from('saved_agents').select('*').order('created_at',{ascending:false}).limit(50);const h=await supabase.from('scan_history').select('*').order('created_at',{ascending:false}).limit(50);render(saved,s.data||[],'repo_url');render(history,h.data||[],'repo_url');}
}
function render(el,rows,key){el.innerHTML=rows.length?rows.map(x=>`<article class="card"><h3>${x.repo_name||'Repository'}</h3><p>${x.verdict||''} · score ${x.score??'—'}</p><a href="/verify/?url=${encodeURIComponent(x[key])}">OPEN ↗</a></article>`).join(''):'<p class="muted">Nothing here yet.</p>';}
out?.addEventListener('click',async()=>{if(supabase){await supabase.auth.signOut();location.href='/';}});
