(() => {
  'use strict';
  const root=document;
  const q=(s,scope=root)=>scope.querySelector(s);
  const mission=q('#mission'),run=q('#runAgent'),result=q('#result');
  const providerEl=q('#provider'),modelEl=q('#model'),styleEl=q('#style');
  const connectBtn=q('#connectBtn'),demoBtn=q('#demoBtn'),badge=q('#modelBadge'),agentStatus=q('#agentStatus');
  if(!mission||!run||!result)return;

  const KEY='paradox_agent_key',PROVIDER='paradox_agent_provider',LAST='paradox_last_mission';
  const BROWSER_MODEL='onnx-community/Qwen2.5-0.5B-Instruct';
  const cfg={
    browser:{label:'Browser AI',model:BROWSER_MODEL},
    openrouter:{label:'OpenRouter',model:'openrouter/free',endpoint:'https://openrouter.ai/api/v1/chat/completions'},
    huggingface:{label:'Hugging Face',model:'openai/gpt-oss-120b:fastest',endpoint:'https://router.huggingface.co/v1/chat/completions'},
    gemini:{label:'Gemini',model:'gemini-2.5-flash',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'}
  };
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const provider=()=>localStorage.getItem(PROVIDER)||'browser';
  const key=()=>localStorage.getItem(KEY)||'';
  const setProvider=p=>{localStorage.setItem(PROVIDER,p);sync();};

  const tool={
    github:async query=>{const r=await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=6`,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error('GitHub research failed');const d=await r.json();return(d.items||[]).map(x=>({label:x.full_name,url:x.html_url,content:`${x.description||'No description'} · ${x.stargazers_count||0} stars`}));},
    huggingface:async query=>{const r=await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=8`);if(!r.ok)throw new Error('Hugging Face research failed');const d=await r.json();return d.map(x=>({label:x.id,url:`https://huggingface.co/${x.id}`,content:`${x.downloads||0} downloads · ${x.likes||0} likes`}));},
    hackernews:async query=>{const r=await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=8`);if(!r.ok)throw new Error('Hacker News research failed');const d=await r.json();return(d.hits||[]).map(x=>({label:x.title,url:x.url||`https://news.ycombinator.com/item?id=${x.objectID}`,content:`${x.points||0} points · ${x.num_comments||0} comments`}));},
    wikipedia:async query=>{const r=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g,'_'))}`);if(!r.ok)throw new Error('Wikipedia research failed');const d=await r.json();return[{label:d.title,url:d.content_urls?.desktop?.page,content:d.extract||''}];}
  };

  function sync(){
    let p=provider();
    if(!cfg[p]){p='browser';localStorage.setItem(PROVIDER,p);}
    if(providerEl){
      if(!providerEl.querySelector('option[value="browser"]'))providerEl.insertAdjacentHTML('afterbegin','<option value="browser">BROWSER AI · PRIVATE</option>');
      providerEl.value=p;
    }
    if(modelEl)modelEl.innerHTML=`<option value="${esc(cfg[p].model)}">${esc(cfg[p].model)}</option>`;
    if(connectBtn)connectBtn.textContent=p==='browser'?'BROWSER MODEL':'CONNECT MODEL';
    paint('Ready');
  }
  function paint(text,active=false){
    if(agentStatus)agentStatus.textContent=text.toUpperCase();
    if(badge)badge.textContent=active?`AGENT · ${text.toUpperCase()}`:(provider()==='browser'?'BROWSER AI READY':`${cfg[provider()].label.toUpperCase()} ${key()?'LIVE':'DISCONNECTED'}`);
  }
  sync();

  async function loadBrowser(){
    if(window.__paradoxBrowserModel)return window.__paradoxBrowserModel;
    paint('Loading model',true);
    result.innerHTML='<div class="result-empty"><span>PX</span><p>Loading the browser AI…</p><small>First run downloads a compact Qwen model and caches it in this browser.</small></div>';
    const {pipeline,env}=await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1');
    env.allowLocalModels=false;
    const device=env.IS_WEBGPU_AVAILABLE?'webgpu':'wasm';
    window.__paradoxDevice=device;
    window.__paradoxBrowserModel=await pipeline('text-generation',BROWSER_MODEL,{device,dtype:'q4'});
    return window.__paradoxBrowserModel;
  }

  function queriesFor(text){
    const t=text.toLowerCase(),out=[];
    if(/model|llm|ai|open.?source|inference|checkpoint|hugging.?face|latest/.test(t))out.push(['huggingface',text]);
    if(/code|coding|github|repo|repository|framework|library|developer|open.?source/.test(t))out.push(['github',text]);
    if(/news|trend|community|discussion|developers|latest/.test(t))out.push(['hackernews',text]);
    if(/history|who is|background|what is/.test(t))out.push(['wikipedia',text]);
    return out.slice(0,3);
  }
  async function research(text){
    const evidence=[];
    for(const [name,query] of queriesFor(text)){try{evidence.push(...await tool[name](query));}catch{}}
    return evidence.slice(0,16);
  }
  function prompt(text,evidence){
    const context=evidence.length?`\n\nLIVE PUBLIC EVIDENCE:\n${evidence.map((x,i)=>`${i+1}. ${x.label}\n${x.content||''}\n${x.url||''}`).join('\n')}`:'';
    return `You are PARADOX, an execution-first AI work agent. Finish the user's mission directly.\n\nMISSION:\n${text}\n\nOUTPUT STYLE:\n${styleEl?.value||'Actionable report'}\n\nRules:\n- Deliver the finished result, not a discussion about how to do it.\n- Use the live evidence when relevant.\n- Never invent facts or sources.\n- Separate verified facts from assumptions.\n- Return clean Markdown.\n${context}`;
  }

  async function browserGenerate(text,evidence){
    const gen=await loadBrowser();
    paint('Reasoning',true);
    const out=await gen(prompt(text,evidence),{max_new_tokens:900,do_sample:true,temperature:.35,top_p:.9,return_full_text:false});
    const generated=out?.[0]?.generated_text;
    const content=Array.isArray(generated)?generated[generated.length-1]?.content:generated;
    if(!content)throw new Error('Browser model returned no output.');
    return String(content).trim();
  }

  async function cloudGenerate(text,evidence){
    const p=provider(),c=cfg[p];
    if(!key())throw new Error('Connect the selected cloud provider first.');
    const bodyPrompt=prompt(text,evidence);
    if(p==='gemini'){
      const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key()},body:JSON.stringify({contents:[{role:'user',parts:[{text:bodyPrompt}]}],generationConfig:{temperature:.2,maxOutputTokens:3500}})});
      const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Gemini HTTP ${r.status}`);return d.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
    }
    const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key(),...(p==='openrouter'?{'HTTP-Referer':location.origin,'X-Title':'PARADOX Agent OS'}:{})},body:JSON.stringify({model:c.model,messages:[{role:'system',content:'You are PARADOX, an execution-first AI work agent.'},{role:'user',content:bodyPrompt}],temperature:.2,max_tokens:3500})});
    const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Provider HTTP ${r.status}`);return d.choices?.[0]?.message?.content||'';
  }

  function render(text,evidence){
    const html=esc(text).replace(/```([\s\S]*?)```/g,'<pre>$1</pre>').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h2>$1</h2>').replace(/^[-*] (.*)$/gm,'<li>$1</li>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');
    const links=evidence.filter(x=>x.url).slice(0,8);
    result.innerHTML=`<div class="agent-result"><div class="result-toolbar"><span>PARADOX OUTPUT · ${esc(provider()==='browser'?`BROWSER ${window.__paradoxDevice||''}`:cfg[provider()].label.toUpperCase())}</span><div><button type="button" data-copy>COPY</button><button type="button" data-save>SAVE</button></div></div><div class="result-body">${html}</div>${links.length?`<div class="source">SOURCES USED<br>${links.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noreferrer">${esc(x.label)} ↗</a>`).join(' · ')}</div>`:''}</div>`;
    q('[data-copy]',result)?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(text);e.currentTarget.textContent='COPIED';setTimeout(()=>e.currentTarget.textContent='COPY',1000);}catch{}});
    q('[data-save]',result)?.addEventListener('click',()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));a.href=u;a.download='paradox-output.md';a.click();URL.revokeObjectURL(u);});
  }

  async function runAgent(text){
    text=String(text||'').trim();if(!text){mission.focus();return;}
    localStorage.setItem(LAST,text);run.disabled=true;run.textContent='RUNNING…';paint('Planning',true);
    result.innerHTML='<div class="result-empty"><span>PX</span><p>Agent is working…</p><small>Researching context, then generating the finished deliverable.</small></div>';
    try{
      const evidence=await research(text);paint('Reasoning',true);
      const output=provider()==='browser'?await browserGenerate(text,evidence):await cloudGenerate(text,evidence);
      if(!output.trim())throw new Error('The model returned an empty result.');
      render(output,evidence);paint('Complete');
    }catch(e){paint('Error');result.innerHTML=`<div class="result-error"><strong>Agent stopped</strong><p>${esc(e.message||e)}</p><small>Switch to Browser AI for no-key execution, or connect a cloud provider.</small></div>`;}
    finally{run.disabled=false;run.textContent='RUN AGENT ↗';}
  }

  async function testCloud(){
    const p=provider(),c=cfg[p];if(!key())throw new Error('No API key entered.');
    if(p==='gemini'){
      const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key()},body:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply with exactly PARADOX_OK'}]}],generationConfig:{maxOutputTokens:8}})});const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Gemini HTTP ${r.status}`);
    }else{
      const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key()},body:JSON.stringify({model:c.model,messages:[{role:'user',content:'Reply with exactly PARADOX_OK'}],max_tokens:8,temperature:0})});const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Provider HTTP ${r.status}`);
    }
  }
  function openConnection(){
    if(provider()==='browser'){runAgent(mission.value);return;}
    let d=q('#connectionDialog');if(d){d.showModal();return;}
    d=document.createElement('dialog');d.id='connectionDialog';d.innerHTML=`<form method="dialog" class="connection-card"><button class="dialog-close" value="cancel" type="submit">×</button><span class="dialog-kicker">PARADOX / MODEL CONNECTION</span><h2>Connect a cloud model.</h2><p class="dialog-copy">The credential stays in this browser and is sent directly to the selected provider.</p><label>PROVIDER<select id="dialogProvider"><option value="openrouter">OpenRouter · free models</option><option value="huggingface">Hugging Face · open models</option><option value="gemini">Gemini · developer API</option></select></label><label>API KEY / TOKEN<input id="dialogKey" type="password" autocomplete="off" placeholder="Paste provider key"/></label><div class="dialog-actions"><button type="button" id="testModel">SAVE & TEST</button><button type="button" id="browserMode">USE BROWSER AI</button></div><p id="connectionFeedback" class="dialog-feedback"></p></form>`;
    document.body.appendChild(d);
    const dp=q('#dialogProvider',d),dk=q('#dialogKey',d),fb=q('#connectionFeedback',d);dp.value=provider()==='browser'?'openrouter':provider();dk.value=key();
    q('#browserMode',d).addEventListener('click',()=>{localStorage.setItem(PROVIDER,'browser');localStorage.removeItem(KEY);sync();d.close();});
    q('#testModel',d).addEventListener('click',async()=>{localStorage.setItem(PROVIDER,dp.value);localStorage.setItem(KEY,dk.value.trim());sync();fb.textContent='Testing provider…';try{await testCloud();fb.textContent='Connected · ready';paint('Connected');setTimeout(()=>d.close(),500);}catch(e){fb.textContent=`Connection failed: ${e.message}`;}});
    d.showModal();
  }

  providerEl?.addEventListener('change',()=>{setProvider(providerEl.value);if(providerEl.value==='browser')localStorage.removeItem(KEY);});
  connectBtn?.addEventListener('click',openConnection);
  run.addEventListener('click',()=>runAgent(mission.value));
  demoBtn?.addEventListener('click',()=>{mission.value='Research the current open-source AI coding model landscape. Compare strong models using live Hugging Face, GitHub and developer discussion signals, then recommend one for a full-stack student project with reasons and sources.';mission.focus();runAgent(mission.value);});
  root.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>{mission.value=b.dataset.prompt;mission.focus();runAgent(mission.value);}));
  if(localStorage.getItem(LAST)&&!mission.value)mission.value=localStorage.getItem(LAST);

  const css=document.createElement('style');css.textContent=`dialog#connectionDialog{border:0;padding:0;background:transparent}dialog#connectionDialog::backdrop{background:rgba(0,0,0,.65)}.connection-card{width:min(520px,calc(100vw - 30px));padding:28px;background:#f2efe7;color:#0c0d0d;border:1px solid #aaa79e;box-shadow:14px 14px 0 #ff5335;display:grid;gap:14px;font-family:'DM Sans'}.dialog-close{justify-self:end;border:0;background:transparent;font-size:25px}.dialog-kicker{font:9px 'DM Mono';color:#ff5335;letter-spacing:.13em}.connection-card h2{font:48px/.9 'Instrument Serif';font-weight:400;margin:5px 0}.dialog-copy,.dialog-feedback{color:#666}.connection-card label{font:9px 'DM Mono';display:grid;gap:7px}.connection-card input,.connection-card select{padding:12px;border:1px solid #bbb8b0;background:white;font:12px 'DM Sans'}.dialog-actions{display:flex;gap:9px;flex-wrap:wrap}.dialog-actions button{border:0;background:#0c0d0d;color:white;padding:12px 15px;font:9px 'DM Mono'}`;document.head.appendChild(css);
})();
