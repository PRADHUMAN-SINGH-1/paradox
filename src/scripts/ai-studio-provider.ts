import { supabase } from '../lib/supabase.ts';

const PROVIDERS = [
  ['auto', 'AUTO / FALLBACK'],
  ['gemini', 'Gemini'],
  ['groq', 'Groq'],
  ['cerebras', 'Cerebras'],
  ['huggingface', 'Hugging Face'],
  ['ollama', 'Ollama'],
] as const;

type Provider = typeof PROVIDERS[number][0];

const prompts: Record<string, (get: (id: string) => string) => string> = {
  resume: (get) => `Act as an expert ATS resume strategist. Compare the resume against the job description. Return: match score /100 with reasons, missing skills/keywords, rewritten high-impact bullets, tailored professional summary, and exact changes. Never invent experience or credentials.\n\nRESUME:\n${get('resume')}\n\nJOB DESCRIPTION:\n${get('jd')}\n\nTARGET ROLE:\n${get('role')}`,
  interview: (get) => `Act as a senior interviewer. Create a realistic preparation pack: 8 role-specific questions, what strong answers contain, 3 technical follow-ups, 3 behavioural questions, a tailored 30-second introduction, and 5 red flags to avoid. Ground everything in the supplied evidence.\n\nJOB DESCRIPTION:\n${get('jd')}\n\nBACKGROUND:\n${get('bg')}\n\nSTAGE:\n${get('stage')}`,
  study: (get) => `Act as a university tutor. Turn the supplied material into a high-retention revision pack: concise explanation, key concepts, formulas/rules where relevant, 12 flashcards, 10 exam questions with answers, common mistakes, and a one-day revision plan. Mark uncertainty clearly.\n\nTOPIC:\n${get('topic')}\n\nMATERIAL:\n${get('notes')}\n\nDIFFICULTY:\n${get('difficulty')}`,
  content: (get) => `Act as a sharp editor and content strategist. Transform the brief into a publishable ${get('format')}. Give it a strong hook, concrete value, natural human voice, useful structure and a clear ending. Avoid generic AI filler, fake statistics and empty hype. Also provide 3 alternative hooks.\n\nIDEA:\n${get('brief')}\n\nAUDIENCE:\n${get('audience')}`,
  code: (get) => `Act as a senior ${get('language')} engineer. Diagnose the supplied code and error. Return: root cause, exact corrected code, critical-fix explanation, tests/test cases, and one prevention improvement. Do not rewrite unrelated code.\n\nCODE:\n${get('code')}\n\nERROR / EXPECTED BEHAVIOUR:\n${get('errorInfo')}\n\nLANGUAGE:\n${get('language')}`,
};

function taskFor(flow: string) {
  return `${flow} AI workflow`;
}

function valuesForFlow(root: HTMLElement, flow: string) {
  const ids = Array.from(root.querySelectorAll<HTMLElement>('#fields input, #fields textarea'))
    .map((el) => el.id)
    .filter(Boolean);
  return { ids, get: (id: string) => (root.querySelector<HTMLElement>(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() || '' };
}

async function invoke(provider: Provider, flow: string, prompt: string) {
  if (!supabase) throw new Error('AI service is not configured on this deployment.');
  const { data, error } = await supabase.functions.invoke('ai-router', {
    body: {
      provider,
      task: taskFor(flow),
      prompt,
      system: 'You are PARADOX AI. Be accurate, concrete and transparent about uncertainty. Never invent credentials, sources, statistics or achievements. Prefer useful output over filler.',
    },
  });
  if (error) throw new Error(error.message || 'AI router request failed.');
  if (!data?.text) throw new Error(data?.error || 'No AI output returned.');
  return data as { text: string; provider: string; latencyMs?: number; attempted?: string[] };
}

function init() {
  const root = document.querySelector<HTMLElement>('.studio');
  if (!root) return;
  const connect = root.querySelector<HTMLElement>('.studio-connect');
  if (connect) {
    connect.innerHTML = `<div class="px-provider-connect"><label for="pxProvider">AI provider</label><select id="pxProvider">${PROVIDERS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select><small>Provider credentials stay server-side. PARADOX automatically falls back when a provider is unavailable.</small></div>`;
  }

  const oldRun = root.querySelector<HTMLButtonElement>('#run');
  if (!oldRun) return;
  const run = oldRun.cloneNode(true) as HTMLButtonElement;
  oldRun.replaceWith(run);

  const status = root.querySelector<HTMLElement>('#status');
  const result = root.querySelector<HTMLElement>('#result');
  const empty = root.querySelector<HTMLElement>('#resultEmpty');
  const err = root.querySelector<HTMLElement>('#error');
  const provider = root.querySelector<HTMLSelectElement>('#pxProvider');

  run.addEventListener('click', async () => {
    const active = root.querySelector<HTMLElement>('.flow.active');
    const flow = active?.dataset.flow || 'resume';
    const source = valuesForFlow(root, flow);
    const promptBuilder = prompts[flow];
    if (!promptBuilder) return;
    if (source.ids.some((id) => !source.get(id))) {
      if (err) { err.textContent = 'Complete the workflow inputs first.'; err.hidden = false; }
      return;
    }
    const selected = (provider?.value || 'auto') as Provider;
    if (err) err.hidden = true;
    if (status) status.textContent = 'ROUTING AI';
    if (result) { result.hidden = false; result.textContent = 'Selecting the best available model…'; }
    if (empty) empty.hidden = true;
    run.disabled = true;
    try {
      const data = await invoke(selected, flow, promptBuilder(source.get));
      if (result) result.textContent = data.text;
      if (status) status.textContent = `DONE · ${data.provider.toUpperCase()}${data.latencyMs ? ` · ${data.latencyMs}MS` : ''}`;
      window.gtag?.('event', 'ai_studio_run', { workflow: flow, provider: data.provider });
    } catch (e) {
      if (result) result.hidden = true;
      if (empty) empty.hidden = false;
      if (err) { err.textContent = e instanceof Error ? e.message : 'AI request failed.'; err.hidden = false; }
      if (status) status.textContent = 'ERROR';
    } finally {
      run.disabled = false;
    }
  });

  root.querySelectorAll<HTMLButtonElement>('.flow').forEach((button) => {
    button.addEventListener('click', () => {
      if (status) status.textContent = 'READY';
    });
  });
}

init();
