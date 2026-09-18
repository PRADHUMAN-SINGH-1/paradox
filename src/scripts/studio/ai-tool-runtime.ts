import { currentUser, supabase } from '../../lib/supabase.ts';

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const read=(root:HTMLElement,id:string)=>{const el=root.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[data-field="${id}"]`);return el?.value.trim()||'';};
const render=(root:HTMLElement,html:string)=>{const empty=root.querySelector<HTMLElement>('[data-role="empty"]'),out=root.querySelector<HTMLElement>('[data-role="output"]');if(empty)empty.hidden=true;if(out){out.hidden=false;out.innerHTML='<div class="tool-result-sheet">'+html+'</div>';}};
const status=(root:HTMLElement,msg:string,ok=false)=>{const el=root.querySelector<HTMLElement>('[data-role="status"]');if(el)el.innerHTML=msg?'<span class="'+(ok?'status-success':'status-error')+'">'+escapeHtml(msg)+'</span>':'';};

function runLocal(root:HTMLElement,mode:string){
 try{
  if(mode==='prompt-generator')return render(root,'<h3>Generated prompt</h3><pre>'+escapeHtml(`ROLE\nYou are an expert assistant.\n\nGOAL\n${read(root,'goal')}\n\nAUDIENCE\n${read(root,'audience')}\n\nTONE\n${read(root,'tone')}\n\nCONSTRAINTS\n${read(root,'rules')}\n\nOUTPUT\n${read(root,'format')}`)+'</pre>');
  if(mode==='prompt-formatter'){const x=read(root,'text');if(!x)throw Error('Paste a prompt first.');return render(root,'<h3>Structured prompt</h3><pre>'+escapeHtml(`CONTEXT\n${x}\n\nTASK\nFollow the instruction precisely.\n\nCONSTRAINTS\nKeep factual claims supportable.\n\nOUTPUT\nReturn a clear useful answer.`)+'</pre>');}
  if(mode==='token-counter'){const x=read(root,'text'),t=Math.ceil(x.length/4),c=Number(read(root,'ctx'))||128000;return render(root,`<h3>Estimated tokens</h3><div class="utility-big">${t.toLocaleString()}</div><p>${(t/c*100).toFixed(2)}% of ${c.toLocaleString()} tokens · ${x.length.toLocaleString()} chars · ${x.split(/\s+/).filter(Boolean).length.toLocaleString()} words.</p>`);}
  if(mode==='cost-calculator'){const req=+read(root,'req'),inn=+read(root,'in'),out=+read(root,'out'),ip=+read(root,'ip'),op=+read(root,'op');if([req,inn,out,ip,op].some(Number.isNaN))throw Error('Use valid numbers.');const input=req*inn*ip/1e6,output=req*out*op/1e6;return render(root,`<h3>Estimated API cost</h3><div class="utility-big">$${(input+output).toFixed(2)}</div><p>Input $${input.toFixed(2)} · Output $${output.toFixed(2)} · Yearly $${((input+output)*12).toFixed(2)}</p>`);}
  if(mode==='context-calculator'){const t=Math.ceil(read(root,'text').length/4),c=+read(root,'ctx')||128000;return render(root,`<h3>Context usage</h3><div class="utility-big">${(t/c*100).toFixed(2)}%</div><p>${t.toLocaleString()} estimated tokens · ${Math.max(0,c-t).toLocaleString()} remaining.</p>`);}
  if(mode==='json-formatter'){return render(root,'<h3>Valid JSON</h3><pre>'+escapeHtml(JSON.stringify(JSON.parse(read(root,'text')),null,2))+'</pre>');}
  if(mode==='json-to-prompt'){const obj=JSON.parse(read(root,'text')),lines:string[]=[];const walk=(x:unknown,path='')=>{if(x&&typeof x==='object')Object.entries(x as Record<string,unknown>).forEach(([k,v])=>walk(v,path?path+'.'+k:k));else lines.push(path+': '+String(x));};walk(obj);return render(root,'<h3>Prompt-ready data</h3><pre>'+escapeHtml(lines.join('\n'))+'</pre>');}
  if(mode==='system-prompt-builder')return render(root,'<h3>System prompt</h3><pre>'+escapeHtml(`ROLE\n${read(root,'role')}\n\nGOALS\n${read(root,'goals')}\n\nRULES\n${read(root,'rules')}\n\nOUTPUT FORMAT\n${read(root,'format')}`)+'</pre>');
  if(mode==='prompt-diff'){const a=read(root,'a').split(/\r?\n/),b=read(root,'b').split(/\r?\n/),lines:string[]=[];for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i]===b[i])lines.push('  '+(a[i]||''));else{if(a[i])lines.push('- '+a[i]);if(b[i])lines.push('+ '+b[i]);}}return render(root,'<h3>Line diff</h3><pre>'+escapeHtml(lines.join('\n')||'No differences.')+'</pre>');}
  if(mode==='regex-tester'){const pattern=read(root,'pattern'),flags=read(root,'flags').replace(/[^dgimsuvy]/g,''),text=read(root,'text'),rx=new RegExp(pattern,flags),matches:string[]=[];if(flags.includes('g'))for(const m of text.matchAll(rx))matches.push('@'+m.index+': '+m[0]);else{const m=text.match(rx);if(m)matches.push('@'+m.index+': '+m[0]);}return render(root,`<h3>${matches.length} matches</h3><pre>${escapeHtml(matches.join('\n')||'No matches')}</pre>`);}
  if(mode==='markdown-cleaner'){const x=read(root,'text');if(!x)throw Error('Paste Markdown first.');const clean=x.replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g,'').replace(/^\s{0,3}#{1,6}\s*/gm,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*|__|\x60|~~/g,'').replace(/^\s*[-*+]\s+/gm,'').replace(/^\s*>\s?/gm,'').replace(/\n{3,}/g,'\n\n').trim();return render(root,'<h3>Plain text</h3><pre>'+escapeHtml(clean)+'</pre>');}
  if(mode==='uuid-generator'){const n=Math.max(1,Math.min(500,+read(root,'count')||1));return render(root,'<h3>UUID v4</h3><pre>'+escapeHtml(Array.from({length:n},()=>crypto.randomUUID()).join('\n'))+'</pre>');}
  if(mode==='base64-encoder-decoder')throw Error('Use Encode or Decode.');
  if(mode==='jwt-decoder'){const parts=read(root,'text').split('.');if(parts.length!==3)throw Error('JWT must contain header.payload.signature.');const decode=(s:string)=>JSON.parse(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')));return render(root,'<h3>Decoded JWT</h3><pre>'+escapeHtml('HEADER\n'+JSON.stringify(decode(parts[0]),null,2)+'\n\nPAYLOAD\n'+JSON.stringify(decode(parts[1]),null,2))+'</pre><p>Signature is not verified.</p>');}
  if(mode==='text-case-converter'){const t=read(root,'text'),words=t.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean),camel=words.map((w,i)=>i?w[0].toUpperCase()+w.slice(1):w).join('');return render(root,'<h3>Text cases</h3><pre>'+escapeHtml(`camelCase: ${camel}\nsnake_case: ${words.join('_')}\nkebab-case: ${words.join('-')}\nTitle Case: ${words.map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}\nUPPER CASE: ${t.toUpperCase()}\nlower case: ${t.toLowerCase()}`)+'</pre>');}
  if(mode==='llms-txt-generator'){const urls=read(root,'urls').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!urls.length)throw Error('Add at least one URL.');return render(root,'<h3>llms.txt</h3><pre>'+escapeHtml(`# ${read(root,'site')||'Website'}\n\n> ${read(root,'desc')||'Useful website pages.'}\n\n## Resources\n${urls.map(x=>'- '+x).join('\n')}`)+'</pre>');}
 }catch(error){status(root,error instanceof Error?error.message:'Tool failed.');}
}

async function aiAssist(root:HTMLElement){
 if(!supabase){status(root,'AI service is not configured.');return;}
 const user=await currentUser();if(!user){location.href='/auth/?next='+encodeURIComponent(location.pathname+location.search);return;}
 const fields=[...root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-field]')].map(el=>el.getAttribute('data-field')+': '+el.value).filter(x=>x.split(': ').slice(1).join(': ').trim());
 const tool=root.querySelector('header h3')?.textContent||'Developer utility';
 const {data,error}=await supabase.functions.invoke('ai-router',{body:{provider:'auto',task:'developer toolkit AI assist',prompt:`Improve, explain, review or transform this developer-tool input. Preserve supplied facts and never invent values. TOOL: ${tool}\n\nINPUT:\n${fields.join('\n')}`,system:'You are PARADOX Developer Toolkit. Be precise and practical.'}});
 if(error)throw Error(error.message||'AI assist failed.');
 render(root,'<h3>AI Assist</h3><pre>'+escapeHtml(data?.text||'No AI result returned.')+'</pre>');status(root,'AI ASSIST COMPLETE',true);
}

function mount(root:HTMLElement){
 if(root.dataset.runtimeReady==='true')return;root.dataset.runtimeReady='true';
 const mode=root.dataset.aiTool||'prompt-formatter';
 root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   const action=button.dataset.action;
   if(action==='run')runLocal(root,mode);
   else if(action==='encode'){const value=btoa(unescape(encodeURIComponent(read(root,'text'))));render(root,'<h3>Base64</h3><pre>'+escapeHtml(value)+'</pre>');}
   else if(action==='decode'){const value=decodeURIComponent(escape(atob(read(root,'text'))));render(root,'<h3>Decoded text</h3><pre>'+escapeHtml(value)+'</pre>');}
   else if(action==='clear'){root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-field]').forEach(el=>{el.value=el.defaultValue;});const out=root.querySelector<HTMLElement>('[data-role="output"]'),empty=root.querySelector<HTMLElement>('[data-role="empty"]');if(out)out.hidden=true;if(empty)empty.hidden=false;status(root,'');}
   else if(action==='copy'){const out=root.querySelector<HTMLElement>('[data-role="output"]');if(!out)throw Error('Nothing to copy yet.');await navigator.clipboard.writeText(out.innerText||'');status(root,'RESULT COPIED',true);}
   else if(action==='ai'){status(root,'AI ASSIST…');await aiAssist(root);}
  }catch(error){status(root,error instanceof Error?error.message:'Action failed.');}
  finally{button.disabled=false;}
 }));
}
function init(){document.querySelectorAll<HTMLElement>('[data-ai-tool]').forEach(mount);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
export {};
