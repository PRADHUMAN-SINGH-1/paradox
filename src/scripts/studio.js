(() => {
  'use strict';
  const root = document;
  const $ = (s) => root.querySelector(s);
  const mission = $('#mission');
  const run = $('#runAgent');
  const result = $('#result');
  const provider = $('#provider');
  const style = $('#style');
  const connectBtn = $('#connectBtn');
  const modelBadge = $('#modelBadge');
  const agentStatus = $('#agentStatus');
  const demoBtn = $('#demoBtn');
  const keyName = 'paradox_agent_key';
  const providerName = 'paradox_agent_provider';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const saveKey = (key) => localStorage.setItem(keyName, key);
  const getKey = () => localStorage.getItem(keyName) || '';
  const setProvider = (value) => { localStorage.setItem(providerName, value); if (provider) provider.value = value; };
  const getProvider = () => localStorage.getItem(providerName) || provider?.value || 'openrouter';

  if (!mission || !run || !result) return;
  if (provider) provider.value = getProvider();

  function paintStatus(text, active = false) {
    if (agentStatus) agentStatus.textContent = text.toUpperCase();
    if (modelBadge) modelBadge.textContent = active ? 'AGENT RUNNING' : (getKey() ? getProvider().toUpperCase() + ' CONNECTED' : 'MODEL NOT CONNECTED');
  }

  function connect() {
    const current = getKey();
    const p = getProvider();
    const label = p === 'openrouter' ? 'OpenRouter API key' : p === 'gemini' ? 'Gemini API key' : 'Hugging Face token';
    const key = window.prompt(`${label}\n\nThis key is stored only in your browser localStorage and sent directly to the selected provider. Never paste a production secret into a public codebase.` , current);
    if (key === null) return;
    if (!key.trim()) { localStorage.removeItem(keyName); paintStatus('Idle'); return; }
    saveKey(key.trim());
    setProvider(p);
    paintStatus('Connected');
  }

  async function publicTool(name, args) {
    if (name === 'wikipedia') {
      const q = encodeURIComponent(args.query || '');
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`);
      if (!r.ok) throw new Error('Wikipedia lookup failed');
      const d = await r.json();
      return {title:d.title, extract:d.extract, url:d.content_urls?.desktop?.page};
    }
    if (name === 'github') {
      const q = encodeURIComponent(args.query || '');
      const r = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=6`, {headers:{Accept:'application/vnd.github+json'}});
      if (!r.ok) throw new Error('GitHub search failed');
      const d = await r.json();
      return (d.items || []).slice(0,6).map(x => ({name:x.full_name,stars:x.stargazers_count,description:x.description,url:x.html_url}));
    }
    if (name === 'huggingface') {
      const q = encodeURIComponent(args.query || '');
      const r = await fetch(`https://huggingface.co/api/models?search=${q}&sort=downloads&direction=-1&limit=8`);
      if (!r.ok) throw new Error('Hugging Face search failed');
      const d = await r.json();
      return d.slice(0,8).map(x => ({id:x.id,downloads:x.downloads,likes:x.likes,url:`https://huggingface.co/${x.id}`}));
    }
    if (name === 'hackernews') {
      const q = encodeURIComponent(args.query || '');
      const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=8`);
      if (!r.ok) throw new Error('Hacker News search failed');
      const d = await r.json();
      return (d.hits || []).slice(0,8).map(x => ({title:x.title,url:x.url || `https://news.ycombinator.com/item?id=${x.objectID}`,points:x.points,comments:x.num_comments}));
    }
    throw new Error('Unknown public tool');
  }

  const toolDefs = [
    {type:'function',function:{name:'wikipedia',description:'Fetch a concise public encyclopedia summary for a topic.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
    {type:'function',function:{name:'github',description:'Search public GitHub repositories and return the strongest matches.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
    {type:'function',function:{name:'huggingface',description:'Search public Hugging Face models and return popular matches.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
    {type:'function',function:{name:'hackernews',description:'Search recent Hacker News discussions for a topic.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}}
  ];

  function systemPrompt() {
    return `You are PARADOX, an execution-first AI agent. Your job is to finish the user's requested outcome, not chat about it.\n\nRules:\n- Think through the task and use tools when live public context will improve accuracy.\n- You may call multiple tools and refine the search.\n- Synthesize, compare, challenge weak evidence, then produce a clear finished deliverable.\n- Never invent sources.\n- Prefer current information when the request is time-sensitive.\n- Output in Markdown.\n- Style requested: ${style?.value || 'Actionable report'}.\n- Do not explain your hidden reasoning. Give concise conclusions, evidence and next actions.`;
  }

  async function openRouter(messages) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+getKey(),'HTTP-Referer':location.origin,'X-Title':'PARADOX Agent'},
      body:JSON.stringify({model:'openrouter/free',messages,tools:toolDefs,tool_choice:'auto',temperature:.25})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'OpenRouter request failed');
    return data.choices?.[0]?.message;
  }

  async function gemini(messages) {
    const input = messages.filter(m => m.role !== 'tool').map(m => ({role:m.role === 'assistant' ? 'model' : 'user',parts:[{text:typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}]}));
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':getKey()},body:JSON.stringify({systemInstruction:{parts:[{text:systemPrompt()}]},contents:input,generationConfig:{temperature:.25}})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error?.message || 'Gemini request failed');
    return {role:'assistant',content:data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||''};
  }

  async function huggingface(messages) {
    const r=await fetch('https://router.huggingface.co/v1/chat/completions', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getKey()},body:JSON.stringify({model:'openai/gpt-oss-120b',messages,temperature:.25,max_tokens:3000})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error?.message || 'Hugging Face request failed');
    return data.choices?.[0]?.message;
  }

  async function callModel(messages) {
    if (getProvider()==='gemini') return gemini(messages);
    if (getProvider()==='huggingface') return huggingface(messages);
    return openRouter(messages);
  }

  function render(text, sources=[]) {
    const safe = escapeHtml(text).replace(/```([\s\S]*?)```/g,'<pre>$1</pre>').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h2>$1</h2>').replace(/\n/g,'<br>');
    const sourceHtml = sources.length ? `<div class="source">SOURCES USED<br>${sources.map(s=>`<a href="${s.url||'#'}" target="_blank" rel="noreferrer">${escapeHtml(s.label||s.url||'source')} ↗</a>`).join(' · ')}</div>` : '';
    result.innerHTML = `<div>${safe}</div>${sourceHtml}`;
  }

  async function runAgent(prompt) {
    if (!getKey()) { connect(); if (!getKey()) return; }
    if (!prompt.trim()) { mission.focus(); return; }
    paintStatus('Planning', true);
    run.disabled=true; run.textContent='AGENT WORKING…';
    result.innerHTML='<div class="result-empty"><span>◌</span><p>Agent is planning the work…</p><small>It may call live public research tools before writing the result.</small></div>';
    const messages=[{role:'system',content:systemPrompt()},{role:'user',content:prompt}];
    const sources=[];
    try {
      for (let step=0; step<5; step++) {
        const msg=await callModel(messages);
        if (!msg) throw new Error('The model returned no message.');
        if (msg.tool_calls?.length && getProvider()==='openrouter') {
          messages.push({role:'assistant',content:msg.content||'',tool_calls:msg.tool_calls});
          for (const call of msg.tool_calls) {
            const args=JSON.parse(call.function.arguments||'{}');
            paintStatus('Researching', true);
            const data=await publicTool(call.function.name,args);
            if (call.function.name==='wikipedia' && data.url) sources.push({label:data.title,url:data.url});
            if (Array.isArray(data)) data.forEach(x=>{if(x.url)sources.push({label:x.name||x.title||x.id,url:x.url})});
            messages.push({role:'tool',tool_call_id:call.id,name:call.function.name,content:JSON.stringify(data).slice(0,14000)});
          }
          continue;
        }
        paintStatus('Delivering', true);
        messages.push(msg);
        render(msg.content || JSON.stringify(msg), sources);
        paintStatus('Complete');
        return;
      }
      throw new Error('Agent reached its tool-call limit. Try a narrower mission.');
    } catch (err) {
      paintStatus('Error');
      result.innerHTML=`<div class="result-error"><strong>Agent stopped</strong><p>${escapeHtml(err.message)}</p><small>Check the connected provider key and try again.</small></div>`;
    } finally { run.disabled=false; run.textContent='RUN AGENT ↗'; }
  }

  connectBtn?.addEventListener('click', connect);
  provider?.addEventListener('change', () => { setProvider(provider.value); paintStatus('Idle'); });
  run.addEventListener('click', () => runAgent(mission.value));
  demoBtn?.addEventListener('click', () => { mission.value='Research the current open-source AI coding model landscape. Find the strongest models on Hugging Face, inspect what developers are discussing on GitHub and Hacker News, compare practical strengths and then recommend one for a student building a full-stack project.'; mission.focus(); if(getKey()) runAgent(mission.value); });
  root.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>{mission.value=b.dataset.prompt;mission.focus();}));
  if(getKey()) paintStatus('Connected');
})();
