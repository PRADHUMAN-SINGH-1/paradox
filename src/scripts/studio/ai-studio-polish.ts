(() => {
  const root = document.querySelector<HTMLElement>('.studio');
  if (!root) return;
  document.documentElement.classList.add('studio-runtime');
  const styleId='paradox-studio-runtime-style';
  if(!document.getElementById(styleId)){
    const style=document.createElement('style');style.id=styleId;style.textContent=`
      body:has(.studio) #three-canvas{z-index:1!important;opacity:.92!important;display:block!important;}
      body:has(.studio) .studio{background:transparent!important;}
      body:has(.studio) .site-header{position:sticky!important;z-index:1000!important;}
      body:has(.studio) .studio button,body:has(.studio) .studio a,body:has(.studio) .studio input,body:has(.studio) .studio textarea,body:has(.studio) .studio select{touch-action:manipulation;}
      .studio-runtime .studio-tool-select,.studio-runtime .flow,.studio-runtime .switcher button{transition:background-color .2s ease,color .2s ease,border-color .2s ease,transform .2s ease;}
      .studio-runtime .studio-tool-select:hover,.studio-runtime .flow:hover{transform:translateX(2px);}
      .studio-runtime .ai-assist-btn{margin-left:auto!important;}
      @media(max-width:700px){.studio-runtime .ai-assist-btn{margin-left:0!important;width:100%!important}.studio-runtime #three-canvas{opacity:.72!important}}
    `;document.head.appendChild(style);
  }
  const routerPrefix = '/functions/v1/ai-router';
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    if (!url.includes(routerPrefix) || !init?.body || typeof init.body !== 'string') return originalFetch(input, init);
    try { const payload = JSON.parse(init.body); payload.prompt = `${payload.prompt || ''}\n\nQUALITY REQUIREMENTS:\n- Tailor directly to supplied inputs.\n- Use clear headings and actionable output.\n- Never invent facts, credentials, metrics, sources or APIs.\n- Preserve supplied facts exactly unless labeling a suggested rewrite.`; payload.system = `${payload.system || ''} Return production-useful output with strong information hierarchy.`; return originalFetch(input, { ...init, body: JSON.stringify(payload) }); } catch { return originalFetch(input, init); }
  };
  const result = root.querySelector<HTMLElement>('#result');
  const resultTop = root.querySelector<HTMLElement>('.result-top');
  const run = root.querySelector<HTMLButtonElement>('#run');
  if (!result || !resultTop || !run) return;
  let meta = root.querySelector<HTMLElement>('.studio-result-meta');
  if (!meta) { meta = document.createElement('div'); meta.className = 'studio-result-meta'; resultTop.appendChild(meta); }
  let rerun = root.querySelector<HTMLButtonElement>('#rerun');
  if (!rerun) { rerun = document.createElement('button'); rerun.id = 'rerun'; rerun.type = 'button'; rerun.className = 'mini'; rerun.textContent = 'RUN AGAIN'; rerun.addEventListener('click', () => run.click()); resultTop.appendChild(rerun); }
  const updateMeta = () => { if (!meta) return; const text=result.textContent?.trim()||''; if(!text||text==='Generating…'||text==='Generating structured output…'){meta.textContent='';return;} const words=text.split(/\s+/).filter(Boolean).length; const lines=text.split(/\r?\n/).length; meta.textContent=`${words.toLocaleString()} words · ${lines} lines`; };
  const observer=new MutationObserver(updateMeta);observer.observe(result,{childList:true,characterData:true,subtree:true});updateMeta();
  void import('./ai-studio-page.ts');
  void import('./ai-tool-assist.ts');
})();
export {};