# PARADOX AI Router

The `ai-router` Edge Function keeps model-provider credentials server-side and exposes one normalized API to AI Studio.

## Required Supabase secrets

Set these in the Supabase project Edge Function secrets. Never commit them to GitHub or the Astro frontend.

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `CEREBRAS_API_KEY`
- `HF_API_KEY`
- `OLLAMA_API_KEY` (only when the configured Ollama endpoint requires one)

## Optional model/runtime configuration

- `GEMINI_MODEL` default: `gemini-2.5-flash`
- `GROQ_MODEL` default: `openai/gpt-oss-20b`
- `CEREBRAS_BASE_URL` default: `https://api.cerebras.ai/v1`
- `CEREBRAS_MODEL` default: `gpt-oss-120b`
- `HF_MODEL` default: `meta-llama/Llama-3.3-70B-Instruct`
- `OLLAMA_BASE_URL` — required for a remote Ollama deployment; do not use `localhost` from the hosted Supabase function
- `OLLAMA_MODEL` default: `llama3.2`

## Routing

`provider=auto` selects a provider order based on the workflow and falls back when a provider is unavailable. Explicit providers are also supported.

The function never returns provider credentials to the browser.
