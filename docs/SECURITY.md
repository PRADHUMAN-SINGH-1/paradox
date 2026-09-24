# Security

## Reporting

Email pradhumansingh196@gmail.com. Do not file public issues that include secrets.

## Model

- GitHub Pages hosts static files only.
- Browser code may contain the Supabase publishable key.
- The Supabase service role key, GITHUB_TOKEN, and GEMINI_API_KEY stay server-side.
- The Verify Edge Function keeps provider credentials outside browser code and exposes only bounded analysis results.
- Verify can fail over across multiple configured server-side providers (Gemini, Groq, Cerebras, Mistral, Cloudflare Workers AI, OpenRouter, Hugging Face and optional Ollama) without exposing any provider key to the browser.

## Analysis boundary

- Target repository files are untrusted evidence, never instructions.
- PARADOX never executes cloned target code, package installs, Dockerfiles, shell scripts, or target binaries.
- URL intake is limited to GitHub repository URLs and the backend calls a fixed GitHub API origin, preventing arbitrary SSRF targets.
- Repository tree analysis is pinned to an immutable commit SHA.
- Evidence claims are accepted only when the cited file exists in the inspected revision and the quoted text matches the cited line window.
- Static scanning and LLM investigation are separate trust layers: the static layer can cover every eligible file within explicit ceilings, while the LLM receives only bounded ranked evidence.
- Model-reported contradictions are not trusted as standalone facts; the evidence ledger derives contradiction lists from validated claim states.

## Sensitive-data handling

- Repository evidence passed to the model is redacted for common API-key, token, password, private-key, bearer-token, GitHub-token, Google-key, AWS-key and PEM formats.
- Browser-visible risk and implementation snippets use the same redaction boundary.
- README excerpts shown in Verify results are also redacted.
- Secrets must never be committed to the repository, .env.example, or browser-exposed environment variables.

## Request security

- Verify accepts only bounded JSON request bodies.
- Repository URLs and search queries have explicit length limits.
- Unexpected browser origins are rejected.
- JSON responses send nosniff, no-store for analysis results, frame-denial, referrer, permissions and restrictive CSP headers.
- Requests receive an X-Request-ID for operational tracing without returning sensitive repository content in logs.
- Verify has both an in-memory limiter and a shared Supabase-backed rate limiter. The shared bucket stores a SHA-256-derived key rather than the raw client IP.
- The shared rate limiter is fail-open only to the bounded local limiter if the shared database path is temporarily unavailable.

## Auth and database

- Enable RLS on all user tables.
- Policies must use auth.uid().
- Never allow all on saved_agents or scan_history.
- The Verify rate-limit table is not exposed to anon or authenticated roles. Its mutation RPC is callable only by service_role.

## Supply-chain controls

- Pull requests run project validation and production builds.
- Dependency Review checks dependency changes on pull requests.
- CodeQL runs JavaScript/TypeScript security analysis on the protected main branch and on a weekly schedule.
- Dependabot tracks npm and GitHub Actions updates.
- GitHub Actions checkout steps disable persisted credentials where the workflow does not need them.

## Operational principle

PARADOX is an evidence-backed repository intelligence system, not a penetration tester or security certification service. A deterministic risk indicator is a signal that requires context; a verified implementation claim means only that the supplied repository evidence supports that specific claim.

## Deployment

Apply the current Supabase migrations before relying on the shared Verify rate limiter, and deploy the analyze-repo Edge Function from the checked-in source and deno.json.
