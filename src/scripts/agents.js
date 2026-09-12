(() => {
  'use strict';
  const grid = document.querySelector('#agentGrid');
  const filters = document.querySelector('#filters');
  const search = document.querySelector('#search');
  const status = document.querySelector('#status');
  const count = document.querySelector('#count');
  if (!grid || !filters) return;

  const OWNER = 'https://github.com/Shubhamsaboo/awesome-llm-apps';
  const API = 'https://api.github.com/repos/Shubhamsaboo/awesome-llm-apps/git/trees/main?recursive=1';
  const families = [
    ['all','ALL'],
    ['agent_skills','AGENT SKILLS'],
    ['starter_ai_agents','STARTER'],
    ['advanced_ai_agents','ADVANCED'],
    ['always_on_agents','ALWAYS-ON'],
    ['mcp_ai_agents','MCP'],
    ['generative_ui_agents','GENERATIVE UI'],
    ['voice_ai_agents','VOICE']
  ];
  const excluded = ['README.md','LICENSE','requirements.txt'];
  const state = {family:'all', query:'', agents:[]};
  const humanize = (slug) => slug.split('/').filter(Boolean).pop().replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const familyFor = (path) => families.find(([slug]) => slug !== 'all' && path.startsWith(slug + '/'))?.[0] || '';
  const depth = (path) => path.split('/').length;
  const isAgentReadme = (path) => {
    if (!path.endsWith('/README.md')) return false;
    if (excluded.includes(path)) return false;
    const family = familyFor(path);
    if (!family || depth(path) < 3) return false;
    if (path.includes('/docs/') || path.includes('/ai_agent_framework_crash_course/') || path.includes('/rag_tutorials/')) return false;
    return true;
  };
  const slugFromPath = (path) => path.slice(0,-'/README.md'.length);
  const labelForFamily = (f) => families.find(([slug]) => slug === f)?.[1] || f;
  const purposeFor = (name, family) => {
    const n = name.toLowerCase();
    if (n.includes('research')) return 'Research, compare evidence and produce a grounded deliverable.';
    if (n.includes('coding') || n.includes('code')) return 'Software engineering workflow with planning, implementation and review.';
    if (n.includes('travel')) return 'Plan a useful trip with constraints, options and recommendations.';
    if (n.includes('finance') || n.includes('investment')) return 'Analyze financial questions and turn evidence into an actionable brief.';
    if (n.includes('journal')) return 'Research a topic, cross-check public evidence and draft a publishable brief.';
    if (n.includes('recruit')) return 'Turn hiring goals into screening, interview and decision workflows.';
    if (n.includes('legal')) return 'Organize legal research and structured analysis; verify professional advice separately.';
    if (n.includes('sales') || n.includes('competitor')) return 'Turn market and competitor signals into a focused business brief.';
    if (n.includes('design') || n.includes('ui')) return 'Critique and improve product or interface decisions.';
    if (n.includes('podcast') || n.includes('audio') || n.includes('voice')) return 'Transform source material into a spoken or audio-oriented workflow.';
    if (family === 'always_on_agents') return 'Monitor a changing information stream and return a concise brief.';
    if (family === 'agent_skills') return 'Apply a focused capability to a coding, writing or reasoning workflow.';
    return 'Agent-inspired workflow adapted to the PARADOX execution engine.';
  };
  const promptFor = (name, family) => `You are running the PARADOX adaptation of the open-source agent pattern “${name}” from the ${labelForFamily(family)} family in Shubhamsaboo/awesome-llm-apps. Execute the user's outcome using the strongest available reasoning path, live public research when useful, and clear deliverables. Preserve the spirit of the agent pattern but do not claim to run the original repository code. User outcome: `;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function renderFilters() {
    filters.innerHTML = families.map(([slug,label]) => `<button type="button" data-family="${slug}" class="${state.family===slug?'active':''}">${label}</button>`).join('');
    filters.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      state.family = btn.dataset.family;
      renderFilters();
      render();
    }));
  }

  function render() {
    const q = state.query.toLowerCase().trim();
    const visible = state.agents.filter(a => {
      const familyOK = state.family === 'all' || a.family === state.family;
      const queryOK = !q || `${a.name} ${a.path} ${a.family}`.toLowerCase().includes(q);
      return familyOK && queryOK;
    });
    count.textContent = visible.length.toLocaleString();
    status.textContent = `${visible.length.toLocaleString()} runnable recipes mapped from the public registry.`;
    if (!visible.length) {
      grid.innerHTML = '<div class="empty"><strong>No agent matched.</strong>Try another search or family.</div>';
      return;
    }
    grid.innerHTML = visible.map((a, i) => {
      const prompt = promptFor(a.name, a.family);
      const runUrl = `/studio/?agent=${encodeURIComponent(a.name)}&mission=${encodeURIComponent(prompt)}`;
      const source = `${OWNER}/tree/main/${a.path}`;
      return `<article class="atlas-card"><div class="meta"><span>${String(i+1).padStart(3,'0')}</span><span>${esc(labelForFamily(a.family))}</span></div><h2>${esc(a.name)}</h2><p>${esc(purposeFor(a.name,a.family))}</p><div class="actions"><a class="run" href="${runUrl}">RUN IN PARADOX ↗</a><a href="${source}" target="_blank" rel="noreferrer">SOURCE ↗</a></div></article>`;
    }).join('');
  }

  search?.addEventListener('input', () => { state.query = search.value; render(); });
  renderFilters();
  grid.innerHTML = '<div class="empty"><strong>Loading live agent registry…</strong>Reading the public repository tree.</div>';
  fetch(API, {headers:{Accept:'application/vnd.github+json'}})
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`GitHub registry returned ${r.status}`)))
    .then(data => {
      const files = Array.isArray(data.tree) ? data.tree.map(x => x.path) : [];
      const seen = new Set();
      state.agents = files.filter(isAgentReadme).map(path => {
        const family = familyFor(path);
        const key = `${family}:${slugFromPath(path)}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {path:slugFromPath(path), family, name:humanize(path)};
      }).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
      status.textContent = `${state.agents.length.toLocaleString()} recipes discovered from the live GitHub tree.`;
      render();
    })
    .catch(err => {
      status.textContent = 'Live GitHub registry unavailable.';
      grid.innerHTML = `<div class="empty"><strong>Registry unavailable</strong><span>${esc(err.message)}</span></div>`;
    });
})();
