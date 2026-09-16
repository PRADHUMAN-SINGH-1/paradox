import { currentUser, supabase } from '../lib/supabase.ts';

type Provider = 'auto' | 'gemini' | 'groq' | 'cerebras' | 'huggingface' | 'ollama';

const samples: Record<string, Record<string, string>> = {
  resume: { resume: 'Software engineering student. Built React + Node.js applications, REST APIs and PostgreSQL-backed projects.\nProjects: NeighborhoodFit, News Hunger.', jd: 'Software Engineer\nBuild REST APIs, React interfaces, clean JavaScript/TypeScript, Git and database-backed products. Strong debugging and communication skills.', role: 'Software Engineer' },
  interview: { jd: 'Software Engineer\nReact, JavaScript, REST APIs, PostgreSQL, Git. Expect coding, system fundamentals and behavioural questions.', bg: 'Computer Science student. Full-stack projects using React, Node.js, Express, PostgreSQL and MongoDB. Built and deployed independent products.', stage: 'Technical interview' },
  study: { topic: 'Database Management Systems — normalization', notes: 'Normalization reduces redundancy and update anomalies. 1NF requires atomic values. 2NF requires 1NF plus no partial dependency on a candidate key. 3NF removes transitive dependency of non-key attributes on a key.', difficulty: 'University exam' },
  content: { brief: 'Launch announcement for a free developer platform combining AI workflows and practical browser utilities.', audience: 'Developers and students', format: 'LinkedIn post' },
  code: { code: 'const users = [1, 2, 3];\nconsole.log(users.map(user => user.name));', errorInfo: 'The output is undefined for each item. Explain the root cause and give a corrected version.', language: 'JavaScript' },
};

const prompts: Record<string, (get: (id: string) => string) => string> = {
  resume: (get) => `Act as an expert ATS resume strategist. Compare the resume against the job description. Return: match score /100 with reasons, missing skills/keywords, rewritten high-impact bullets, tailored professional summary, and exact changes. Never invent experience or credentials.\n\nRESUME:\n${get('resume')}\n\nJOB DESCRIPTION:\n${get('jd')}\n\nTARGET ROLE:\n${get('role')}`,
  interview: (get) => `Act as a senior interviewer. Create a realistic preparation pack: 8 role-specific questions, what strong answers contain, 3 technical follow-ups, 3 behavioural questions, a tailored 30-second introduction, and 5 red flags to avoid. Ground everything in the supplied evidence.\n\nJOB DESCRIPTION:\n${get('jd')}\n\nBACKGROUND:\n${get('bg')}\n\nSTAGE:\n${get('stage')}`,
  study: (get) => `Act as a university tutor. Turn the supplied material into a high-retention revision pack: concise explanation, key concepts, formulas/rules where relevant, 12 flashcards, 10 exam questions with answers, common mistakes, and a one-day revision plan. Mark uncertainty clearly.\n\nTOPIC:\n${get('topic')}\n\nMATERIAL:\n${get('notes')}\n\nDIFFICULTY:\n${get('difficulty')}`,
  content: (get) => `Act as a sharp editor and content strategist. Transform the brief into a publishable ${get('format')}. Give it a strong hook, concrete value, natural human voice, useful structure and a clear ending. Avoid generic AI filler, fake statistics and empty hype. Also provide 3 alternative hooks.\n\nIDEA:\n${get('brief')}\n\nAUDIENCE:\n${get('audience')}`,
  code: (get) => `Act as a senior ${get('language')} engineer. Diagnose the supplied code and error. Return: root cause, exact corrected code, critical-fix explanation, tests/test cases, and one prevention improvement. Do not rewrite unrelated code.\n\nCODE:\n${get('code')}\n\nERROR / EXPECTED BEHAVIOUR:\n${get('errorInfo')}\n\nLANGUAGE:\n${get('language')}`,
};

function taskFor(flow: string) { return `${flow} AI workflow`; }
function getValue(root: HTMLElement, id: string) { return (root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)?.value || '').trim(); }
function fillSample(root: HTMLElement, flow: string) { Object.entries(samples[flow] || {}).forEach(([id, value]) => { const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`); if (el) el.value = value; }); }
function loginUrl() { const next = `${location.pathname}${location.search}${location.hash}`; return `/auth/?next=${encodeURIComponent(next)}`; }

async function invoke(provider: Provider, flow: string, prompt: string) {
  if (!supabase) throw new Error('AI service is not configured on this deployment.');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Sign in to use PARADOX AI Studio.');
  const { data, error } = await supabase.functions.invoke('ai-router', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { provider, task: taskFor(flow), prompt, system: 'You are PARADOX AI Studio. Be accurate, concrete and transparent about uncertainty. Never invent credentials, sources, statistics or achievements. Prefer useful output over filler. Structure long answers with clear headings, bullets and code fences where appropriate.' },
  });
  if (error) throw new Error(error.message || 'AI router request failed.');
  if (!data?.text) { const details = Array.isArray(data?.details) ? ` ${data.details.join(' · ')}` : ''; throw new Error((data?.error || 'No AI output returned.') + details); }
  return data as { text: string; provider: string; latencyMs?: number; attempted?: string[] };
}

function decorate(root: HTMLElement) {
  const actions = root.querySelector<HTMLElement>('.actions');
  if (actions && !root.querySelector('#example')) {
    const button = document.createElement('button'); button.type = 'button'; button.id = 'example'; button.className = 'btn'; button.textContent = 'TRY EXAMPLE';
    actions.insertBefore(button, actions.firstChild);
    button.addEventListener('click', () => { const active = root.querySelector<HTMLElement>('.flow.active'); fillSample(root, active?.dataset.flow || 'resume'); const status = root.querySelector<HTMLElement>('#status'); if (status) status.textContent = 'EXAMPLE LOADED'; });
  }
  const result = root.querySelector<HTMLElement>('.result');
  if (result && !root.querySelector('.px-result-meta')) { const meta = document.createElement('div'); meta.className = 'px-result-meta'; meta.innerHTML = '<span class="px-result-provider">AI</span><span class="px-result-latency">READY</span>'; result.insertBefore(meta, result.firstChild); }
  if (!root.querySelector('.px-studio-note')) { const card = document.createElement('div'); card.className = 'px-studio-note'; card.innerHTML = '<strong>Built for real work.</strong><span>Your workflow is authenticated. Provider credentials stay server-side.</span>'; root.querySelector('.hero')?.appendChild(card); }
}

function init() {
  const root = document.querySelector<HTMLElement>('.studio'); if (!root) return;
  decorate(root);
  const oldRun = root.querySelector<HTMLButtonElement>('#run'); if (!oldRun) return;
  const run = oldRun.cloneNode(true) as HTMLButtonElement; oldRun.replaceWith(run);
  const status = root.querySelector<HTMLElement>('#status'), result = root.querySelector<HTMLElement>('#result'), empty = root.querySelector<HTMLElement>('#resultEmpty'), err = root.querySelector<HTMLElement>('#error'), provider = root.querySelector<HTMLSelectElement>('#pxProvider, #provider');
  const resultProvider = root.querySelector<HTMLElement>('.px-result-provider'), resultLatency = root.querySelector<HTMLElement>('.px-result-latency');

  run.addEventListener('click', async () => {
    let user;
    try { user = await currentUser(); } catch { if (err) { err.textContent = 'Authentication could not be checked. Please try again.'; err.hidden = false; } if (status) status.textContent = 'ERROR'; return; }
    if (!user) { location.href = loginUrl(); return; }
    const active = root.querySelector<HTMLElement>('.flow.active'); const flow = active?.dataset.flow || 'resume'; const promptBuilder = prompts[flow]; if (!promptBuilder) return;
    const fieldIds = Object.keys(samples[flow] || {}); if (fieldIds.some((id) => !getValue(root, id))) { if (err) { err.textContent = 'Complete the workflow inputs first, or use TRY EXAMPLE.'; err.hidden = false; } return; }
    const selected = (provider?.value || 'auto') as Provider; if (err) err.hidden = true; if (status) status.textContent = 'ROUTING AI'; if (result) { result.hidden = false; result.textContent = 'Generating a structured result…'; } if (empty) empty.hidden = true; run.disabled = true; run.textContent = 'RUNNING…';
    const started = performance.now();
    try {
      const data = await invoke(selected, flow, promptBuilder((id) => getValue(root, id)));
      if (result) result.textContent = data.text; const latency = Math.max(1, Math.round(data.latencyMs || performance.now() - started));
      if (status) status.textContent = `DONE · ${String(data.provider || 'AI').toUpperCase()}`; if (resultProvider) resultProvider.textContent = String(data.provider || 'AI').toUpperCase(); if (resultLatency) resultLatency.textContent = `${latency}MS · READY TO COPY`;
      window.gtag?.('event', 'ai_studio_run', { workflow: flow, provider: data.provider });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI request failed.'; if (/sign in/i.test(message)) { location.href = loginUrl(); return; }
      if (result) result.hidden = true; if (empty) empty.hidden = false; if (err) { err.textContent = message; err.hidden = false; } if (status) status.textContent = 'ERROR'; if (resultProvider) resultProvider.textContent = 'ERROR'; if (resultLatency) resultLatency.textContent = 'CHECK INPUT / SESSION';
    } finally { run.disabled = false; run.textContent = 'RUN AI ↗'; }
  });

  root.querySelector<HTMLButtonElement>('#copy')?.addEventListener('click', async () => {
    if (!result || result.hidden) return;
    try { await navigator.clipboard.writeText(result.textContent || ''); if (status) status.textContent = 'COPIED'; }
    catch { if (err) { err.textContent = 'Clipboard access is blocked. Select the result and copy it manually.'; err.hidden = false; } }
  });
  root.querySelectorAll<HTMLButtonElement>('.flow').forEach((button) => button.addEventListener('click', () => { if (status) status.textContent = 'READY'; }));
}

init();
