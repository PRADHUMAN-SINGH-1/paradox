import { currentUser, supabase } from '../../lib/supabase.ts';

function init(){
  const host=document.querySelector<HTMLElement>('.tool-host');
  if(!host||host.dataset.aiAssistReady==='true')return;
  host.dataset.aiAssistReady='true';
  const mount=()=>{
    const actions=host.querySelector<HTMLElement>('.generator-actions');
    if(!actions||actions.querySelector('#aiAssist'))return;
    const button=document.createElement('button');button.type='button';button.id='aiAssist';button.className='gen-btn ai-assist-btn';button.textContent='AI ASSIST ↗';
    actions.appendChild(button);
    button.addEventListener('click',async()=>{
      if(!supabase){window.alert('AI service is not configured on this deployment.');return;}
      button.disabled=true;button.textContent='AI ASSIST…';
      try{
        const user=await currentUser();if(!user){location.href=`/auth/?next=${encodeURIComponent(location.pathname+location.search)}`;return;}
        const fields=[...host.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('.field input,.field textarea')].map(el=>`${el.closest('.field')?.querySelector('label')?.textContent?.trim()||el.id}: ${el.value}`).filter(x=>!/:\s*$/.test(x));
        if(!fields.length)throw new Error('Enter data in the tool first.');
        const title=host.querySelector<HTMLElement>('.generator-panel-head h2')?.textContent?.trim()||'Developer utility';
        const prompt=`Use this developer utility output as context. Improve, explain, review or transform the supplied data. Return a concise, technically useful result with headings when helpful. Never invent facts.\n\nUTILITY: ${title}\n\nINPUT:\n${fields.join('\n')}`;
        const {data,error}=await supabase.functions.invoke('ai-router',{body:{provider:'auto',task:'developer toolkit AI assist',prompt,system:'You are PARADOX Developer Toolkit. Be precise, practical and honest about uncertainty. Preserve user data exactly when transforming it.'}});
        if(error)throw new Error(error.message||'AI assist failed.');
        const output=host.querySelector<HTMLElement>('#output'),empty=host.querySelector<HTMLElement>('#empty');
        if(output){output.hidden=false;output.textContent=data?.text||'No AI output returned.';}if(empty)empty.hidden=true;
        const status=host.querySelector<HTMLElement>('#status');if(status)status.innerHTML='<div class="status-success">AI ASSIST COMPLETE</div>';
      }catch(e){const status=host.querySelector<HTMLElement>('#status');if(status)status.innerHTML=`<div class="status-error">${String(e instanceof Error?e.message:e)}</div>`;}finally{button.disabled=false;button.textContent='AI ASSIST ↗';}
    });
  };
  mount();
  new MutationObserver(mount).observe(host,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
export {};