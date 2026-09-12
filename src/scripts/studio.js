(() => {
  'use strict';
  const q = (s, scope = document) => scope.querySelector(s);
  const mission = q('#mission'), run = q('#runAgent'), result = q('#result');
  const providerEl = q('#provider'), modelEl = q('#model'), styleEl = q('#style');
  const connectBtn = q('#connectBtn'), demoBtn = q('#demoBtn'), badge = q('#modelBadge'), agentStatus = q('#agentStatus');
  if (!mission || !run || !result) return;

  const KEY = 'paradox_agent_key', PROVIDER = 'paradox_agent_provider', MODEL = 'paradox_agent_model', LAST = 'paradox_last_mission';
  const configs = {
    openrouter:{label:'OpenRouter',model:'openrouter/free',endpoint:'https://openrouter.ai/api/v1/chat/completions'},
    huggingface:{label:'Hugging Face',model:'openai/gpt-oss-120b:fastest',endpoint:'https://router.huggingface.co/v1/chat/completions'},
    gemini:{label:'Gemini',model:'gemini-2.5-flash',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'}
  };
  const tools = [
    {type:'function',function:{name:'wikipedia',description:'Fetch a concise public encyclopedia summary.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
    {type:'function',function:{name:'github',description:'Search public GitHub repositories.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
    {type:'function',function:{name:'huggingface',description:'Search public Hugging Face models.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
    {type:'function',function:{name:'hackernews',description:'Search recent Hacker News discussions.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}}
  ];
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const getProvider = () => localStorage.getItem(PROVIDER) || providerEl?.value || 'openrouter';
  const getKey = () => localStorage.getItem(KEY) || '';
  const setProvider = p => { localStorage.setItem(PROVIDER,p); syncModel(); };
  const setKey = k => k ? localStorage.setItem(KEY,k) : localStorage.removeItem(KEY);
  const setModel = m => localStorage.setItem(MODEL,m);
  const getModel = () => localStorage.getItem(MODEL) || configs[getProvider()].model;

  function syncModel(){
    const p=getProvider(); if(providerEl) providerEl.value=p;
    const m=configs[p].model;
    if(modelEl){ modelEl.innerHTML=`<option value="${esc(m)}">${esc(m)}</option>`; modelEl.value=m; }
    setModel(m);
  }
  syncModel();

  function status(text, active=false){
    if(agentStatus) agentStatus.textContent=text.toUpperCase();
    if(badge) badge.textContent=active ? `AGENT · ${text.toUpperCase()}` : (getKey() ? `${configs[getProvider()].label.toUpperCase()} LIVE` : 'LOCAL ENGINE READY');
  }

  async function jsonFetch(url, options={}, ttl=300000){
    const cacheKey=`px:${url}`;
    try{const c=sessionStorage.getItem(cacheKey);if(c){const x=JSON.parse(c);if(Date.now()-x.t<ttl)return x.d;}}catch{}
    const r=await fetch(url,options);
    if(!r.ok) throw new Error(`Public source returned HTTP ${r.status}`);
    const d=await r.json();
    try{sessionStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),d}));}catch{}
    return d;
  }
  async function publicTool(name, args){
    const text=String(args?.query||'').trim(); if(!text) throw new Error('Research query was empty.');
    if(name==='wikipedia'){
      const d=await jsonFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text.replace(/\s+/g,'_'))}`);
      return {title:d.title,extract:d.extract,url:d.content_urls?.desktop?.page};
    }
    if(name==='github'){
      const d=await jsonFetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(text)}&sort=stars&order=desc&per_page=6`,{headers:{Accept:'application/vnd.github+json'}});
      return (d.items||[]).slice(0,6).map(x=>({name:x.full_name,stars:x.stargazers_count,description:x.description,url:x.html_url}));
    }
    if(name==='huggingface'){
      const d=await jsonFetch(`https://huggingface.co/api/models?search=${encodeURIComponent(text)}&sort=downloads&direction=-1&limit=8`);
      return d.slice(0,8).map(x=>({id:x.id,downloads:x.downloads,likes:x.likes,url:`https://huggingface.co/${x.id}`}));
    }
    if(name==='hackernews'){
      const d=await jsonFetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(text)}&tags=story&hitsPerPage=8`);
      return (d.hits||[]).slice(0,8).map(x=>({title:x.title,url:x.url||`https://news.ycombinator.com/item?id=${x.objectID}`,points:x.points,comments:x.num_comments}));
    }
    throw new Error('Unknown public connector.');
  }
  function sys(){return `You are PARADOX, an execution-first AI agent. Finish the requested outcome. Use public research tools when freshness or verification matters. Separate facts, recommendations and assumptions. Never fabricate sources or completed actions. Return a finished Markdown deliverable. Output style: ${styleEl?.value||'Actionable report'}. Never reveal hidden reasoning.`;}
  async function responseJson(r){
    let d; try{d=await r.json();}catch{throw new Error(`Provider returned HTTP ${r.status}`);}
    if(!r.ok) throw new Error(d?.error?.message||d?.message||`Provider returned HTTP ${r.status}`);
    return d;
  }
  async function callOpenAICompatible(messages){
    const p=getProvider(), c=configs[p];
    const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getKey(),...(p==='openrouter'?{'HTTP-Referer':location.origin,'X-Title':'PARADOX Agent OS'}:{})},body:JSON.stringify({model:getModel(),messages,tools,tool_choice:'auto',temperature:.2,max_tokens:3500})});
    const d=await responseJson(r); return d.choices?.[0]?.message;
  }
  async function callGemini(messages){
    const contents=messages.filter(m=>m.role!=='system'&&m.role!=='tool').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:String(m.content||'')}]}));
    const r=await fetch(configs.gemini.endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':getKey()},body:JSON.stringify({systemInstruction:{parts:[{text:sys()}]},contents,generationConfig:{temperature:.2,maxOutputTokens:3500}})});
    const d=await responseJson(r); return {role:'assistant',content:d.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||''};
  }
  async function modelCall(messages){return getProvider()==='gemini'?callGemini(messages):callOpenAICompatible(messages);}

  function queriesFor(text){
    const p=text.toLowerCase(), base=text.replace(/\s+/g,' ').trim().slice(0,160), out=[];
    if(/github|repo|repository|code|coding|developer|framework|library|open.?source/.test(p)) out.push(['github',base]);
    if(/model|llm|ai|hugging.?face|checkpoint|inference|open.?source/.test(p)) out.push(['huggingface',base]);
    if(/news|trend|community|discussion|developers/.test(p)) out.push(['hackernews',base]);
    if(/history|who is|what is|background/.test(p)) out.push(['wikipedia',base]);
    return out.slice(0,4);
  }
  async function localRun(text){
    status('Researching',true); const evidence=[];
    for(const [name,query] of queriesFor(text)){try{evidence.push({name,data:await publicTool(name,{query})});}catch{}}
    const names=evidence.flatMap(e=>Array.isArray(e.data)?e.data.map(x=>x.name||x.id||x.title):[e.data?.title]).filter(Boolean).slice(0,8);
    const urls=evidence.flatMap(e=>Array.isArray(e.data)?e.data.map(x=>x.url):[e.data?.url]).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,8);
    const list=names.length?`<ul>${names.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>No connector was needed; PARADOX prepared an execution scaffold locally.</p>';
    return `<div class="local-report"><div class="mode-chip">LOCAL EXECUTION · LIVE PUBLIC DATA</div><h2>Mission</h2><p>${esc(text).replace(/\n/g,'<br>')}</p><h2>Execution brief</h2><ol><li>Clarify the desired outcome and success criteria.</li><li>Collect the most relevant public signals.</li><li>Compare evidence, separate facts from assumptions, and produce the final deliverable.</li></ol><h2>Evidence snapshot</h2>${list}<h2>Ready for deeper reasoning</h2><p>The local engine is usable now. Connect a model when you need full model reasoning, iterative tool calls or richer generation.</p>${urls.length?`<div class="source">LIVE SOURCES<br>${urls.map(u=>`<a href="${esc(u)}" target="_blank" rel="noreferrer">${esc(u)} ↗</a>`).join(' · ')}</div>`:''}</div>`;
  }
  function render(text,sources=[]){
    const html=esc(text).replace(/```([\s\S]*?)```/g,'<pre>$1</pre>').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h2>$1</h2>').replace(/^[-*] (.*)$/gm,'<li>$1</li>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');
    const src=sources.length?`<div class="source">SOURCES USED<br>${sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label||s.url)} ↗</a>`).join(' · ')}</div>`:'';
    result.innerHTML=`<div class="agent-result"><div class="result-toolbar"><span>PARADOX OUTPUT</span><div><button type="button" data-copy>COPY</button><button type="button" data-save>SAVE</button></div></div><div class="result-body">${html}</div>${src}</div>`;
    q('[data-copy]',result)?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(text);e.currentTarget.textContent='COPIED';setTimeout(()=>e.currentTarget.textContent='COPY',1200);}catch{}});
    q('[data-save]',result)?.addEventListener('click',()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));a.href=u;a.download='paradox-output.md';a.click();URL.revokeObjectURL(u);});
  }
  async function runModel(text){
    const messages=[{role:'system',content:sys()},{role:'user',content:text}], sources=[];
    for(let step=0;step<6;step++){
      const msg=await modelCall(messages); if(!msg) throw new Error('The selected model returned no message.');
      if(msg.tool_calls?.length && getProvider()!=='gemini'){
        messages.push({role:'assistant',content:msg.content||'',tool_calls:msg.tool_calls});
        for(const call of msg.tool_calls){
          let args={}; try{args=JSON.parse(call.function.arguments||'{}');}catch{throw new Error('The model returned invalid tool arguments.');}
          status('Researching',true); const data=await publicTool(call.function.name,args);
          const arr=Array.isArray(data)?data:[data]; arr.forEach(x=>{if(x?.url&&!sources.some(s=>s.url===x.url))sources.push({label:x.name||x.title||x.id,url:x.url});});
          messages.push({role:'tool',tool_call_id:call.id,name:call.function.name,content:JSON.stringify(data).slice(0,14000)});
        }
      }else{render(msg.content||JSON.stringify(msg),sources);return;}
    }
    throw new Error('The agent reached its research-step limit.');
  }
  async function runAgent(text){
    text=String(text||'').trim(); if(!text){mission.focus();return;}
    localStorage.setItem(LAST,text); run.disabled=true; run.textContent='RUNNING…';
    result.innerHTML='<div class="result-empty"><span>PX</span><p>Executing the mission…</p><small>Selecting a route and gathering context.</small></div>';
    try{status('Planning',true);if(getKey()){await runModel(text);}else{result.innerHTML=await localRun(text);}status('Complete');}
    catch(err){status('Error');result.innerHTML=`<div class="result-error"><strong>Agent connection failed</strong><p>${esc(err.message||err)}</p><small>Local execution remains available without a provider key.</small><br><button type="button" data-reconnect>OPEN CONNECTION</button></div>`;q('[data-reconnect]',result)?.addEventListener('click',openConnection);}
    finally{run.disabled=false;run.textContent='RUN AGENT ↗';}
  }

  async function testConnection(){
    if(!getKey()) throw new Error('No provider key supplied.');
    if(getProvider()==='gemini'){
      const r=await fetch(configs.gemini.endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':getKey()},body:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply with exactly PARADOX_OK'}]}],generationConfig:{maxOutputTokens:8}})});
      const d=await responseJson(r); if(!d.candidates?.length)throw new Error('Gemini returned no candidates.');
    }else{
      const c=configs[getProvider()];const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getKey()},body:JSON.stringify({model:c.model,messages:[{role:'user',content:'Reply with exactly PARADOX_OK'}],max_tokens:8,temperature:0})});await responseJson(r);
    }
  }
  function openConnection(){
    let d=q('#connectionDialog'); if(d){d.showModal();return;}
    d=document.createElement('dialog');d.id='connectionDialog';d.innerHTML=`<form method="dialog" class="connection-card"><button class="dialog-close" value="cancel" type="submit">×</button><span class="dialog-kicker">PARADOX / MODEL CONNECTION</span><h2>Bring your model.<br>Keep control.</h2><p class="dialog-copy">The credential stays in this browser and is sent directly to the selected provider.</p><label>PROVIDER<select id="dialogProvider"><option value="openrouter">OpenRouter · free router</option><option value="huggingface">Hugging Face · open models</option><option value="gemini">Gemini · developer API</option></select></label><label>API KEY / TOKEN<input id="dialogKey" type="password" autocomplete="off" placeholder="Paste provider key"/></label><div class="dialog-actions"><button type="button" id="testModel">SAVE & TEST</button><button type="button" id="localMode">USE LOCAL MODE</button></div><p id="connectionFeedback" class="dialog-feedback"></p></form>`;
    document.body.appendChild(d);
    const dp=q('#dialogProvider',d), dk=q('#dialogKey',d), fb=q('#connectionFeedback',d);dp.value=getProvider();dk.value=getKey();
    q('#testModel',d).addEventListener('click',async()=>{setProvider(dp.value);setKey(dk.value.trim());fb.textContent='Testing provider connection…';try{await testConnection();status('Connected');fb.textContent=`Connected to ${configs[getProvider()].label}.`;setTimeout(()=>d.close(),400);}catch(e){setKey('');status('Idle');fb.textContent=e.message||'Connection failed.';}});
    q('#localMode',d).addEventListener('click',()=>{setKey('');status('Idle');fb.textContent='Local execution mode enabled.';setTimeout(()=>d.close(),300);});
    d.addEventListener('close',()=>d.remove());d.showModal();
  }

  connectBtn?.addEventListener('click',openConnection);
  providerEl?.addEventListener('change',()=>{setProvider(providerEl.value);status('Idle');});
  modelEl?.addEventListener('change',()=>setModel(modelEl.value));
  run.addEventListener('click',()=>runAgent(mission.value));
  demoBtn?.addEventListener('click',()=>{mission.value='Research the current open-source AI coding model landscape. Compare useful models, inspect developer signals, and finish with a practical recommendation for a student building a full-stack project.';mission.focus();runAgent(mission.value);});
  document.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>{mission.value=b.dataset.prompt;mission.focus();}));
  const last=localStorage.getItem(LAST);if(last&&!mission.value)mission.value=last;
  status('Idle');

  const s=document.createElement('style');s.textContent=`dialog{border:0;padding:0;background:transparent;width:min(620px,calc(100vw - 28px))}dialog::backdrop{background:rgba(5,7,7,.72);backdrop-filter:blur(10px)}.connection-card{position:relative;background:#f2efe7;border:1px solid #b5b2a8;padding:30px;color:#0b0d0d;box-shadow:16px 16px 0 #d9ff3f;display:grid;gap:14px;font-family:'DM Sans',sans-serif}.dialog-close{position:absolute;right:12px;top:8px;background:transparent;border:0;font-size:26px}.dialog-kicker{font:9px 'DM Mono';letter-spacing:.14em;color:#ff5638}.connection-card h2{font:400 48px/.9 'Instrument Serif';margin:0;letter-spacing:-.03em}.dialog-copy{color:#656760;line-height:1.5}.connection-card label{display:grid;gap:7px;font:10px 'DM Mono';letter-spacing:.06em}.connection-card input,.connection-card select{width:100%;padding:13px;border:1px solid #aaa79e;background:#fff;font:12px 'DM Sans';box-sizing:border-box}.dialog-actions{display:flex;gap:9px}.dialog-actions button{border:1px solid #0d0e0e;background:#0d0e0e;color:#fff;padding:12px 14px;font:9px 'DM Mono';cursor:pointer}.dialog-actions button+button{background:transparent;color:#0d0e0e}.dialog-feedback{font:10px 'DM Mono';min-height:14px;color:#555}.result-body{line-height:1.65}.result-body h2,.result-body h3{color:#d9ff3f}.result-body li{margin-bottom:7px}.result-toolbar{display:flex;justify-content:space-between;border-bottom:1px solid #343734;padding-bottom:12px;margin-bottom:18px;font:9px 'DM Mono';color:#a8aaa3}.result-toolbar button{border:1px solid #444;background:transparent;color:#c8cbc3;padding:5px 8px;margin-left:6px;font:8px 'DM Mono'}.mode-chip{display:inline-block;border:1px solid #555;padding:5px 7px;font:8px 'DM Mono';color:#d9ff3f;margin-bottom:16px}.local-report p,.local-report li{color:#d7d8d2}.local-report ol,.local-report ul{padding-left:22px}.result-error button{margin-top:12px;border:1px solid #ff9e89;background:transparent;color:#ff9e89;padding:9px;font:8px 'DM Mono'}`;document.head.appendChild(s);
})();