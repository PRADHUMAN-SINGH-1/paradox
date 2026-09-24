const ALLOWED_ORIGINS = new Set(['https://paradox.engineer','http://localhost:4321','http://127.0.0.1:4321']);
const MAX_PROMPT = 400_000;
const MINUTE = 60_000;
const hits = new Map<string, { at: number; count: number }>();
const PROVIDER_TIMEOUT_MS = 9_000;
function cors(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://paradox.engineer',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
function rateLimit(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now - row.at > MINUTE) {
    hits.set(ip, { at: now, count: 1 });
    return true;
  }
  row.count += 1;
  return row.count <= 20;
}
type Provider = 'auto' | 'gemini' | 'groq' | 'cerebras' | 'mistral' | 'cloudflare' | 'openrouter' | 'huggingface' | 'ollama';
const providers: Provider[] = ['gemini', 'groq', 'cerebras', 'mistral', 'cloudflare', 'openrouter', 'huggingface', 'ollama'];
function env(name: string) { return Deno.env.get(name) || ''; }
function candidates(requested: Provider, task: string): Provider[] {
  if (requested !== 'auto') return [requested];
  if (/code|debug|program|technical|repo|security/i.test(task)) {
    return ['groq', 'cerebras', 'mistral', 'cloudflare', 'gemini', 'openrouter', 'huggingface', 'ollama'];
  }
  if (/resume|interview|study|research|content/i.test(task)) {
    return ['gemini', 'mistral', 'groq', 'cerebras', 'cloudflare', 'openrouter', 'huggingface', 'ollama'];
  }
  return ['gemini', 'groq', 'cerebras', 'mistral', 'cloudflare', 'openrouter', 'huggingface', 'ollama'];
}
async function requireAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Authentication required');
  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('SB_PUBLISHABLE_KEY');
  if (!supabaseUrl || !anonKey) throw new Error('Authentication service is not configured');
  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!res.ok) throw new Error('Authentication required');
  const user = await res.json().catch(() => null);
  if (!user?.id) throw new Error('Authentication required');
  return user;
}

function internalRequest(req: Request): boolean {
  const supplied = req.headers.get('x-paradox-internal-key') || '';
  const expected = env('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(supplied && expected && supplied === expected);
}
function validateJsonOutput(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const candidate = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  const parsed = JSON.parse(candidate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Provider returned invalid JSON');
  return candidate;
}

async function requestOpenAICompatible(base: string, key: string, model: string, system: string, prompt: string, structured: boolean) {
  if (!base) throw new Error('Provider base URL is not configured');
  if (!key) throw new Error('Provider credential is not configured');
  const res = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4200,
      ...(structured ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(data?.error?.message || data?.message || 'Provider returned ' + res.status));
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Provider returned no text');
  return structured ? validateJsonOutput(String(text)) : String(text);
}

async function requestGemini(system: string, prompt: string, structured: boolean) {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini is not configured');
  const model = env('GEMINI_MODEL') || 'gemini-3.8-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4200, ...(structured ? { responseMimeType: 'application/json' } : {}) },
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(data?.error?.message || 'Gemini returned ' + res.status));
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('\n') || '';
  if (!text) throw new Error('Gemini returned no text');
  return structured ? validateJsonOutput(text) : text;
}

function providerModel(provider: Provider): string {
  switch (provider) {
    case 'gemini': return env('GEMINI_MODEL') || 'gemini-3.8-flash';
    case 'groq': return env('GROQ_MODEL') || 'openai/gpt-oss-20b';
    case 'cerebras': return env('CEREBRAS_MODEL') || 'gpt-oss-120b';
    case 'mistral': return env('MISTRAL_MODEL') || 'mistral-small-latest';
    case 'cloudflare': return env('CLOUDFLARE_MODEL') || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    case 'openrouter': return env('OPENROUTER_MODEL') || 'openrouter/free';
    case 'huggingface': return env('HF_MODEL') || 'meta-llama/Llama-3.3-70B-Instruct';
    case 'ollama': return env('OLLAMA_MODEL') || 'llama3.2';
  }
}

async function runProvider(provider: Provider, system: string, prompt: string, structured: boolean) {
  switch (provider) {
    case 'gemini': return requestGemini(system, prompt, structured);
    case 'groq': return requestOpenAICompatible('https://api.groq.com/openai/v1', env('GROQ_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'cerebras': return requestOpenAICompatible(env('CEREBRAS_BASE_URL') || 'https://api.cerebras.ai/v1', env('CEREBRAS_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'mistral': return requestOpenAICompatible('https://api.mistral.ai/v1', env('MISTRAL_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'cloudflare': return requestOpenAICompatible('https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(env('CLOUDFLARE_ACCOUNT_ID')) + '/ai/v1', env('CLOUDFLARE_API_TOKEN'), providerModel(provider), system, prompt, structured);
    case 'openrouter': return requestOpenAICompatible('https://openrouter.ai/api/v1', env('OPENROUTER_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'huggingface': return requestOpenAICompatible('https://router.huggingface.co/v1', env('HF_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'ollama': return requestOpenAICompatible(env('OLLAMA_BASE_URL'), env('OLLAMA_API_KEY'), providerModel(provider), system, prompt, structured);
  }
}
Deno.serve(async (req) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, h);
  const internal = internalRequest(req);
  if (!internal && !rateLimit(req)) return json({ error: 'Too many AI requests. Please wait a minute.' }, 429, h);
  try {
    if (!internal) await requireAuthenticatedUser(req);
    const body = await req.json();
    const prompt = String(body.prompt || '').slice(0, MAX_PROMPT);
    const system = String(body.system || 'You are PARADOX AI. Be accurate, specific and transparent about uncertainty. Never invent credentials, sources or facts.').slice(0, 10000);
    const task = String(body.task || 'general').slice(0, 100);
    const requested = String(body.provider || 'auto') as Provider;
    const structured = body.json === true;
    const order = candidates(providers.includes(requested) || requested === 'auto' ? requested : 'auto', task);
    if (!prompt.trim()) return json({ error: 'Prompt is required.' }, 400, h);
    const failures: string[] = [];
    for (const provider of order) {
      try {
        const started = Date.now();
        const text = await runProvider(provider, system, prompt, structured);
        return json({
          text,
          provider,
          model: providerModel(provider),
          latencyMs: Date.now() - started,
          attempted: order.slice(0, order.indexOf(provider) + 1),
        }, 200, h);
      } catch (e) {
        failures.push(`${provider}: ${e instanceof Error ? e.message : 'failed'}`);
      }
    }
    return json({ error: requested === 'auto' ? 'No configured AI provider is currently available.' : `The selected provider (${requested}) is currently unavailable.`, details: failures }, 503, h);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid AI request.';
    return json({ error: message }, message === 'Authentication required' || message === 'Authentication service is not configured' ? 401 : 400, h);
  }
});
