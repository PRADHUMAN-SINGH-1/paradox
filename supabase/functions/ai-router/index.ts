const ALLOWED_ORIGINS = new Set(['https://paradox.engineer','http://localhost:4321','http://127.0.0.1:4321']);
const MAX_PROMPT = 400_000;
const MINUTE = 60_000;
const hits = new Map<string, { at: number; count: number }>();
const PROVIDER_TIMEOUT_MS = 5_500;
const PROVIDER_COOLDOWN_MS = 60_000;

function providerTimeoutMs(provider: Provider): number {
  if (provider === 'nvidia' || provider === 'cohere') return 12_000;
  if (provider === 'openrouter') return 8_000;
  return PROVIDER_TIMEOUT_MS;
}
const VERIFY_AUTO_MAX_PROVIDERS = 10;
const GENERAL_AUTO_MAX_PROVIDERS = 6;
const providerCooldowns = new Map<string, number>();

function cors(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://paradox.engineer',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
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

type Provider =
  | 'auto'
  | 'gemini'
  | 'groq'
  | 'cerebras'
  | 'mistral'
  | 'cloudflare'
  | 'openrouter'
  | 'huggingface'
  | 'nvidia'
  | 'cohere'
  | 'ollama';

const providers: Provider[] = [
  'gemini',
  'cerebras',
  'groq',
  'mistral',
  'nvidia',
  'cloudflare',
  'openrouter',
  'cohere',
  'huggingface',
  'ollama',
];

function env(name: string) {
  return Deno.env.get(name) || '';
}

function configured(provider: Provider) {
  switch (provider) {
    case 'gemini': return Boolean(env('GEMINI_API_KEY'));
    case 'groq': return Boolean(env('GROQ_API_KEY'));
    case 'cerebras': return Boolean(env('CEREBRAS_API_KEY'));
    case 'mistral': return Boolean(env('MISTRAL_API_KEY'));
    case 'cloudflare': return Boolean(env('CLOUDFLARE_API_TOKEN') && env('CLOUDFLARE_ACCOUNT_ID'));
    case 'openrouter': return Boolean(env('OPENROUTER_API_KEY'));
    case 'huggingface': return Boolean(env('HF_API_KEY'));
    case 'nvidia': return Boolean(env('NVIDIA_API_KEY'));
    case 'cohere': return Boolean(env('COHERE_API_KEY'));
    case 'ollama': return Boolean(env('OLLAMA_BASE_URL'));
    default: return false;
  }
}

function candidates(requested: Provider, task: string, excluded: Provider[] = []): Provider[] {
  let order: Provider[];

  if (requested !== 'auto') {
    order = [requested];
  } else {
    const configuredOrder = env('AI_PROVIDER_ORDER')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => providers.includes(value as Provider)) as Provider[];

    if (configuredOrder.length) {
      // Treat AI_PROVIDER_ORDER as a preference, not an allowlist. Any configured
      // provider omitted from the preference still remains eligible for fallback.
      const preferredSet = new Set(configuredOrder);
      const fallback = providers.filter((provider) => !preferredSet.has(provider));
      order = (
        /repository security verification|planner|routing|critic/i.test(task)
          ? [...new Set(['gemini', 'openrouter', ...configuredOrder, ...fallback])]
          : [...configuredOrder, ...fallback]
      ) as Provider[];
    } else if (/planner|routing|critic/i.test(task)) {
      order = ['groq','cerebras','gemini','mistral','nvidia','cloudflare','openrouter','cohere','huggingface','ollama'];
    } else if (/code|debug|program|technical|repo|security/i.test(task)) {
      order = ['gemini','cerebras','groq','mistral','nvidia','cloudflare','openrouter','cohere','huggingface','ollama'];
    } else if (/resume|interview|study|research|content/i.test(task)) {
      order = ['gemini','mistral','cerebras','groq','nvidia','cloudflare','openrouter','cohere','huggingface','ollama'];
    } else {
      order = ['gemini','cerebras','groq','mistral','nvidia','cloudflare','openrouter','cohere','huggingface','ollama'];
    }
  }

  const autoBudget = /repository security verification/i.test(task)
    ? VERIFY_AUTO_MAX_PROVIDERS
    : GENERAL_AUTO_MAX_PROVIDERS;

  return order
    .filter((provider) => !excluded.includes(provider))
    .filter((provider) => configured(provider))
    .filter((provider, index, all) => all.indexOf(provider) === index)
    .filter((provider) => (providerCooldowns.get(provider) || 0) <= Date.now())
    .slice(0, requested === 'auto' ? autoBudget : 1);
}

async function requireAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Authentication required');
  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('SB_PUBLISHABLE_KEY');
  if (!supabaseUrl || !anonKey) throw new Error('Authentication service is not configured');
  const res = await fetch(supabaseUrl.replace(/\/$/, '') + '/auth/v1/user', {
    headers: { Authorization: authorization, apikey: anonKey },
    signal: AbortSignal.timeout(3_000),
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
  const cleaned = text.trim()
    .replace(/^\x60{3}(?:json)?\s*/i, '')
    .replace(/\s*\x60{3}$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const candidate = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  const parsed = JSON.parse(candidate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Provider returned invalid JSON');
  return candidate;
}

async function requestOpenAICompatible(
  base: string,
  key: string,
  model: string,
  system: string,
  prompt: string,
  structured: boolean,
  extraHeaders: Record<string, string> = {},
  useJsonMode = true,
  timeoutMs = PROVIDER_TIMEOUT_MS,
) {
  if (!base) throw new Error('Provider base URL is not configured');
  if (!key) throw new Error('Provider credential is not configured');

  const res = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: /repository investigation planner/i.test(system) ? 1200 : /adversarial evidence critic/i.test(system) ? 1800 : 3200,
      ...(structured && useJsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...(base.includes('api.cloudflare.com') ? { options: { rejectIfBusy: true } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(String(data?.error?.message || data?.message || 'Provider returned ' + res.status));
  }

  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Provider returned no text');
  return structured ? validateJsonOutput(String(text)) : String(text);
}

async function requestGemini(system: string, prompt: string, structured: boolean) {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini is not configured');
  const model = env('GEMINI_MODEL') || 'gemini-3.8-flash';

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent?key=' +
    encodeURIComponent(key);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4200,
        ...(structured ? { responseMimeType: 'application/json' } : {}),
        ...(env('GEMINI_THINKING_LEVEL')
          ? { thinkingConfig: { thinkingLevel: env('GEMINI_THINKING_LEVEL') } }
          : {}),
      },
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(data?.error?.message || 'Gemini returned ' + res.status));

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string; thought?: boolean }) => p.text && !p.thought ? p.text : '')
    .filter(Boolean)
    .join('\n') || '';

  if (!text) throw new Error('Gemini returned no text');
  return structured ? validateJsonOutput(text) : text;
}

async function requestCohere(system: string, prompt: string, structured: boolean) {
  const key = env('COHERE_API_KEY');
  if (!key) throw new Error('Cohere is not configured');
  const model = env('COHERE_MODEL') || 'command-a-plus-05-2026';

  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      'X-Client-Name': 'PARADOX',
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.1,
      max_tokens: 4200,
      ...(structured ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(providerTimeoutMs('cohere')),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(data?.message || data?.error?.message || 'Cohere returned ' + res.status));

  const text = Array.isArray(data?.message?.content)
    ? data.message.content
        .filter((item: { type?: string; text?: string }) => item.type === 'text' && item.text)
        .map((item: { text?: string }) => item.text || '')
        .join('\n')
    : '';

  if (!text) throw new Error('Cohere returned no text');
  return structured ? validateJsonOutput(text) : text;
}

function providerModel(provider: Provider): string {
  switch (provider) {
    case 'gemini': return env('GEMINI_MODEL') || 'gemini-3.8-flash';
    case 'groq': return env('GROQ_MODEL') || 'openai/gpt-oss-20b';
    case 'cerebras': return env('CEREBRAS_MODEL') || 'gpt-oss-120b';
    case 'mistral': return env('MISTRAL_MODEL') || 'mistral-small-latest';
    case 'cloudflare': return env('CLOUDFLARE_MODEL') || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    case 'openrouter': return env('OPENROUTER_MODEL') || 'openai/gpt-oss-120b:free';
    case 'huggingface': return env('HF_MODEL') || 'openai/gpt-oss-120b:fastest';
    case 'nvidia': return env('NVIDIA_MODEL') || 'openai/gpt-oss-20b';
    case 'cohere': return env('COHERE_MODEL') || 'command-a-plus-05-2026';
    case 'ollama': return env('OLLAMA_MODEL') || 'llama3.2';
    default: return '';
  }
}

async function runProvider(provider: Provider, system: string, prompt: string, structured: boolean) {
  switch (provider) {
    case 'gemini':
      return requestGemini(system, prompt, structured);
    case 'groq':
      return requestOpenAICompatible('https://api.groq.com/openai/v1', env('GROQ_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'cerebras':
      return requestOpenAICompatible(env('CEREBRAS_BASE_URL') || 'https://api.cerebras.ai/v1', env('CEREBRAS_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'mistral':
      return requestOpenAICompatible('https://api.mistral.ai/v1', env('MISTRAL_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'cloudflare':
      return requestOpenAICompatible(
        'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(env('CLOUDFLARE_ACCOUNT_ID')) + '/ai/v1',
        env('CLOUDFLARE_API_TOKEN'),
        providerModel(provider),
        system,
        prompt,
        structured,
      );
    case 'openrouter':
      return requestOpenAICompatible(
        'https://openrouter.ai/api/v1',
        env('OPENROUTER_API_KEY'),
        providerModel(provider),
        system + '\nReturn only a single valid JSON object. Do not wrap it in markdown or add commentary.',
        prompt,
        structured,
        { 'HTTP-Referer': 'https://paradox.engineer', 'X-Title': 'PARADOX' },
        false,
        providerTimeoutMs(provider),
      );
    case 'huggingface':
      return requestOpenAICompatible('https://router.huggingface.co/v1', env('HF_API_KEY'), providerModel(provider), system, prompt, structured);
    case 'nvidia':
      return requestOpenAICompatible(
        'https://integrate.api.nvidia.com/v1',
        env('NVIDIA_API_KEY'),
        providerModel(provider),
        system,
        prompt,
        structured,
        {},
        false,
        providerTimeoutMs(provider),
      );
    case 'cohere':
      return requestCohere(system, prompt, structured);
    case 'ollama':
      return requestOpenAICompatible(
        env('OLLAMA_BASE_URL'),
        env('OLLAMA_API_KEY') || 'ollama-local',
        providerModel(provider),
        system,
        prompt,
        structured,
      );
    default:
      throw new Error('Unsupported provider');
  }
}

function cooldownFor(error: unknown) {
  const message = error instanceof Error ? error.message : 'provider failed';
  if (/returned 401|returned 403|unauthorized|invalid api key|credential/i.test(message)) return 5 * 60_000;
  if (/returned 429|rate limit|quota|capacity|temporar/i.test(message)) return 45_000;
  return PROVIDER_COOLDOWN_MS;
}

function publicFailureCodes(failures: Array<{ provider: Provider; error: unknown }>) {
  return failures.map(({ provider, error }) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const code =
      /401|403|api key|credential|unauthori/i.test(message) ? 'AUTH' :
      /429|rate limit|quota|capacity/i.test(message) ? 'QUOTA' :
      /timeout|timed out/i.test(message) ? 'TIMEOUT' :
      /invalid json|no text/i.test(message) ? 'OUTPUT' :
      /returned 404/i.test(message) ? 'HTTP_404' :
      /returned 5\d\d/i.test(message) ? 'HTTP_5XX' :
      'UNAVAILABLE';
    return provider + ':' + code;
  }).slice(0, 10);
}

Deno.serve(async (req) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, h);

  const internal = internalRequest(req);
  if (!internal && !rateLimit(req)) {
    return json({ error: 'Too many AI requests. Please wait a minute.' }, 429, h);
  }

  try {
    if (!internal) await requireAuthenticatedUser(req);

    const body = await req.json();
    const prompt = String(body.prompt || '').slice(0, MAX_PROMPT);
    const system = String(
      body.system ||
      'You are PARADOX AI. Be accurate, specific and transparent about uncertainty. Never invent credentials, sources or facts.'
    ).slice(0, 10_000);
    const task = String(body.task || 'general').slice(0, 100);
    const requested = String(body.provider || 'auto') as Provider;
    const structured = body.json === true;

    if (!prompt.trim()) return json({ error: 'Prompt is required.' }, 400, h);

    const excludedValues = Array.isArray(body.excludeProviders)
      ? body.excludeProviders.map((value: unknown) => String(value).trim().toLowerCase())
      : [];
    const excluded = excludedValues.filter((value: string) => providers.includes(value as Provider)) as Provider[];
    const order = candidates(
      providers.includes(requested) || requested === 'auto' ? requested : 'auto',
      task,
      excluded,
    );

    const failures: Array<{ provider: Provider; error: unknown }> = [];

    for (const provider of order) {
      try {
        const started = Date.now();
        const text = await runProvider(provider, system, prompt, structured);
        providerCooldowns.delete(provider);

        return json({
          text,
          provider,
          model: providerModel(provider),
          latencyMs: Date.now() - started,
          attempted: order.slice(0, order.indexOf(provider) + 1),
        }, 200, h);
      } catch (error) {
        providerCooldowns.set(provider, Date.now() + cooldownFor(error));
        failures.push({ provider, error });
      }
    }

    const failureCodes = publicFailureCodes(failures);
    console.warn(JSON.stringify({
      event: 'provider-exhausted',
      task,
      requested,
      attempted: order,
      failureCodes,
    }));
    return json({
      error: requested === 'auto'
        ? 'No configured AI provider is currently available.'
        : 'The selected provider (' + requested + ') is currently unavailable.',
      attempted: order,
      failureCodes,
    }, 503, h);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid AI request.';
    return json(
      { error: message },
      message === 'Authentication required' || message === 'Authentication service is not configured' ? 401 : 400,
      h,
    );
  }
});