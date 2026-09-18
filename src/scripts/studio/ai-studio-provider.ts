import { supabase } from '../../lib/supabase.ts';

type Provider='auto'|'gemini'|'groq'|'cerebras'|'huggingface'|'ollama';
type Workflow={label:string;title:string;desc:string;fields:string[]};
const W:Record<string,Workflow>={
 resume:{label:'RESUME TAILOR',title:'Make the application fit.',desc:'Tailor a real resume to a real role without inventing evidence.',fields:['jd','role']},
 interview:{label:'INTERVIEW COACH',title:'Train against the actual role.',desc:'Generate a focused interview plan from the supplied role and background.',fields:['jd','bg','stage']},
 study:{label:'STUDY ENGINE',title:'Turn notes into a revision system.',desc:'Convert source material into explanations, flashcards and exam practice.',fields:['topic','notes','difficulty']},
 content:{label:'CONTENT STUDIO',title:'Go from idea to publishable draft.',desc:'Turn a concrete brief into platform-ready content with a strong hook.',fields:['brief','audience','format']}
};
const samples:Record<string,Record<string,string>>={
 resume:{role:'Software Engineer',resume:'Software engineering student. Built React + Node.js applications, REST APIs and PostgreSQL-backed projects.'},
 interview:{jd:'Software Engineer\nReact, JavaScript, REST APIs, PostgreSQL, Git.',bg:'Computer Science student. Full-stack projects using React, Node.js, Express, PostgreSQL and MongoDB.',stage:'Technical interview'},
 study:{topic:'Database Management Systems — normalization',notes:'1NF requires atomic values. 2NF removes partial dependency. 3NF removes transitive dependency.',difficulty:'University exam'},
 content:{brief:'Launch announcement for a developer platform combining AI workflows and browser utilities.',audience:'Developers and students',format:'LinkedIn post'}
};
const prompts:Record<string,(get:(id:string)=>string,resumeText:string)=>string>={
 resume:(g,resumeText)=>`Tailor the supplied resume to the supplied role. Return match analysis, matched keywords, missing keywords, rewritten bullets using only supplied evidence, a tailored summary, and exact edits. Never invent experience, metrics, employers, education or skills.\nRESUME:\n${resumeText}\nJOB:\n${g('jd')}\nROLE:\n${g('role')}`,
 interview:g=>`Create an interview preparation pack from the supplied role and background: 8 questions with answer framework, 3 technical follow-ups, 3 behavioural questions, a short introduction and 5 pitfalls. Do not invent experience.\nJOB:\n${g('jd')}\nBACKGROUND:\n${g('bg')}\nSTAGE:\n${g('stage')}`,
 study:g=>`Create a reliable revision pack from the supplied material: explanation, key concepts, 12 flashcards, 10 exam questions with answers, common mistakes and a one-day plan. Do not fabricate source material.\nTOPIC:\n${g('topic')}\nMATERIAL:\n${g('notes')}\nLEVEL:\n${g('difficulty')}`,
 content:g=>`Turn this brief into a publishable ${g('format')}. Give 3 hooks, the final draft and a short CTA. Match the audience. Avoid filler and unsupported claims.\nIDEA:\n${g('brief')}\nAUDIENCE:\n${g('audience')}`
};
const get=(root:HTMLElement,id:string)=>root.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[data-field="${id}"]`)?.value.trim()||'';
const setSectionVisibility=(root:HTMLElement,flow:string)=>root.querySelectorAll<HTMLElement>('[data-workflow-form]').forEach(form=>{form.hidden=form.dataset.workflowForm!==flow;});
async function extractFile(file:File):Promise<string>{
 const name=file.name.toLowerCase();
 if(name.endsWith('.pdf')){
   const pdfjs=await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/+esm');
   const buffer=await file.arrayBuffer();
   const pdf=await pdfjs.getDocument({data:buffer}).promise;
   const pages:string[]=[];
   for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();pages.push(content.items.map((item:any)=>item.str||'').join(' '));}
   return pages.join('\n');
 }
 if(name.endsWith('.docx')){
   const mammoth=await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mammoth@1.9.0/+esm');
   const buffer=await file.arrayBuffer();
   const result=await mammoth.extractRawText({arrayBuffer:buffer});
   return String(result.value||'');
 }
 if(/\.(txt|md|rtf|csv|json)$/i.test(name)) return await file.text();
 throw new Error('Unsupported document type. Use PDF, DOCX, TXT, MD, RTF, CSV or JSON.');
}
function init(){
 const root=document.querySelector<HTMLElement>('.studio');
 if(!root||root.dataset.controllerReady==='true')return;
 root.dataset.controllerReady='true';
 const label=root.querySelector<HTMLElement>('#flowLabel'),title=root.querySelector<HTMLElement>('#flowTitle'),desc=root.querySelector<HTMLElement>('#flowDescription'),status=root.querySelector<HTMLElement>('#status'),result=root.querySelector<HTMLElement>('#result'),empty=root.querySelector<HTMLElement>('#resultEmpty'),error=root.querySelector<HTMLElement>('#error'),provider=root.querySelector<HTMLSelectElement>('#provider'),run=root.querySelector<HTMLButtonElement>('#run'),example=root.querySelector<HTMLButtonElement>('#example'),clear=root.querySelector<HTMLButtonElement>('#clear'),copy=root.querySelector<HTMLButtonElement>('#copy'),download=root.querySelector<HTMLButtonElement>('#download'),metaProvider=root.querySelector<HTMLElement>('.px-result-provider'),metaLatency=root.querySelector<HTMLElement>('.px-result-latency'),resumeFile=root.querySelector<HTMLInputElement>('#resumeFile'),resumeStatus=root.querySelector<HTMLElement>('[data-resume-status]'),resumeNote=root.querySelector<HTMLElement>('[data-resume-example-note]'),resumeBrowse=root.querySelector<HTMLButtonElement>('[data-resume-browse]');
 let current=new URLSearchParams(location.search).get('workflow')||'resume';
 if(!W[current])current='resume';
 let resumeText='';
 let resumeExample='';
 const render=(flow:string,reset=true)=>{
   current=W[flow]?flow:'resume';
   const w=W[current];
   if(label)label.textContent=w.label;if(title)title.textContent=w.title;if(desc)desc.textContent=w.desc;
   setSectionVisibility(root,current);
   root.querySelectorAll<HTMLButtonElement>('.flow').forEach(b=>b.classList.toggle('active',b.dataset.flow===current));
   if(reset){if(result)result.hidden=true;if(empty)empty.hidden=false;if(error)error.hidden=true;if(status)status.textContent='READY';if(metaProvider)metaProvider.textContent='AI';if(metaLatency)metaLatency.textContent='READY';}
 };
 root.querySelectorAll<HTMLButtonElement>('.flow').forEach(b=>b.addEventListener('click',()=>{
   const f=b.dataset.flow||'resume';render(f);
   const u=new URL(location.href);u.searchParams.set('workflow',f);u.searchParams.delete('section');u.searchParams.delete('tool');history.replaceState(null,'',u.pathname+u.search);
   requestAnimationFrame(()=>document.querySelector('#studioWorkflows')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }));
 resumeBrowse?.addEventListener('click',()=>resumeFile?.click());
 resumeFile?.addEventListener('change',async()=>{
   const file=resumeFile.files?.[0];if(!file)return;
   if(resumeStatus)resumeStatus.textContent='READING '+file.name.toUpperCase()+'…';
   if(resumeNote)resumeNote.hidden=true;
   try{
     resumeText=(await extractFile(file)).trim();
     if(!resumeText)throw new Error('The document contains no readable text.');
     if(resumeStatus)resumeStatus.textContent=`${file.name} · ${resumeText.length.toLocaleString()} characters extracted`;
     status!.textContent='RESUME READY';
   }catch(e){resumeText='';if(resumeStatus)resumeStatus.textContent=e instanceof Error?e.message:'Could not read the file.';if(resumeFile)resumeFile.value='';}
 });
 example?.addEventListener('click',()=>{
   const sample=samples[current]||{};
   if(current==='resume'){resumeExample=sample.resume||'';resumeText='';if(resumeFile)resumeFile.value='';if(resumeStatus)resumeStatus.textContent='EXAMPLE RESUME LOADED';if(resumeNote){resumeNote.textContent='Using an example resume for this run. Attach your own resume to replace it.';resumeNote.hidden=false;}}
   Object.entries(sample).forEach(([id,val])=>{const el=root.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[data-field="${id}"]`);if(el)el.value=val;});
   status!.textContent='EXAMPLE LOADED';
 });
 clear?.addEventListener('click',()=>{
   root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-field]').forEach(el=>{el.value=el.defaultValue;});
   if(resumeFile)resumeFile.value='';resumeText='';resumeExample='';if(resumeStatus)resumeStatus.textContent='No file selected';if(resumeNote)resumeNote.hidden=true;render(current);
 });
 copy?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(result?.textContent||'');status!.textContent='COPIED';}catch{status!.textContent='Clipboard unavailable.'}});
 download?.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([result?.textContent||''],{type:'text/plain'}));a.download=`paradox-${current}-result.txt`;a.click();});
 run?.addEventListener('click',async()=>{
   const workflow=W[current];
   const sourceResume=current==='resume'?(resumeText||resumeExample):'';
   if(current==='resume'&&!sourceResume){error!.textContent='Attach your resume before running the tailor.';error!.hidden=false;return;}
   if(workflow.fields.some(id=>!get(root,id))){error!.textContent='Complete every input first.';error!.hidden=false;return;}
   run.disabled=true;run.textContent='RUNNING…';status!.textContent='ROUTING AI';error!.hidden=true;result!.hidden=false;empty!.hidden=true;result!.textContent='Generating structured output…';
   const t=performance.now();
   try{
     const {data,error:fnError}=await supabase!.functions.invoke('ai-router',{body:{provider:(provider?.value||'auto') as Provider,task:`${current} AI workflow`,prompt:prompts[current](id=>get(root,id),sourceResume),system:'You are PARADOX AI Studio. Be accurate, concrete and transparent. Never invent credentials, metrics, sources or achievements.'}});
     if(fnError)throw new Error(fnError.message||'AI router request failed.');
     if(!data?.text)throw new Error(data?.error||'No AI output returned.');
     result!.textContent=data.text;status!.textContent=`DONE · ${String(data.provider||'AI').toUpperCase()}`;if(metaProvider)metaProvider.textContent=String(data.provider||'AI').toUpperCase();if(metaLatency)metaLatency.textContent=`${Math.round(data.latencyMs||performance.now()-t)}MS`;
   }catch(e){result!.hidden=true;empty!.hidden=false;error!.textContent=e instanceof Error?e.message:'AI request failed.';error!.hidden=false;status!.textContent='ERROR';}
   finally{run.disabled=false;run.textContent='RUN AI ↗';}
 });
 render(current);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
export {};
