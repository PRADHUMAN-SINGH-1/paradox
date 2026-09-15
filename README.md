# PARADOX

PARADOX is an AI agent intelligence site: discover public AI agents and GitHub projects, inspect repository evidence, compare them, and save a shortlist after sign-in.

Live site: https://paradox.engineer/

Core loop: **Discover → Understand → Verify → Compare → Save**

This is static analysis of public repositories. It is **not** a security certification and does not execute cloned code.

## Architecture

- Frontend: Astro static HTML on GitHub Pages
- Auth / database: Supabase
- GitHub proxy: Supabase Edge Function `analyze-repo`
- Deterministic analysis: TypeScript in `src/lib/analysis/`
- Browser fallback: direct GitHub REST only when Supabase is unavailable, so local development and a minimally configured deployment remain usable

No Express/Node server. The Supabase service-role key and GitHub token must never ship to the browser.

## Local development

```bash
npm ci
cp .env.example .env   # optional public Supabase values
npm test
npm run dev
```

Build:

```bash
npm run build
```

Output is `dist/`.

## Environment variables

Frontend (safe to expose):

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server / Edge Function only:

- `GITHUB_TOKEN` (recommended; raises the GitHub API limit used by the proxy)

Set the public Supabase values as GitHub Actions repository secrets. Set `GITHUB_TOKEN` as a Supabase Edge Function secret.

## Supabase setup

1. Create a project.
2. Apply `supabase/migrations/20260915_agent_intelligence.sql`.
3. Enable email/password auth and optional GitHub OAuth with redirect `https://paradox.engineer/dashboard/`.
4. Add the project URL and publishable key to GitHub Actions secrets.
5. Deploy the Edge Function and add `GITHUB_TOKEN` as its secret.

The migration creates `profiles`, `saved_agents`, `scan_history`, and `analysis_cache` with Row Level Security. Users can access only their own account data; public analysis cache rows are read-only to the frontend.

## GitHub API behavior

- Only `github.com` / `www.github.com` repository URLs are accepted.
- Production discovery and verification use the Supabase Edge Function, with short-lived in-memory caches and a server-side token when configured.
- Analysis fetches metadata plus a bounded set of files. No `npm install`, Docker run, or shell execution of the target repository.
- Files larger than the analysis limit are skipped before base64 decoding.
- If Supabase is unavailable, the browser falls back to the public GitHub API so the core UI still works, but that degraded path is subject to GitHub's public rate limits.

## Deployment

GitHub Actions on `main`: Node 22, reproducible `npm ci`, full test suite, Astro build, Pages artifact, deploy.

If an older clone has no `package-lock.json`, the deployment workflow creates and commits one automatically before switching the build to `npm ci`.

## Security model

See [SECURITY.md](SECURITY.md). README, source and issues from third-party repositories are untrusted input. PARADOX never executes target repository code and escapes repository-derived text before rendering it.

## SEO

Only the focused agent-intelligence surface is included in the sitemap. Legacy Maker pages remain available where needed for compatibility but default to `noindex,nofollow` and are not part of the primary navigation.

Public catalogued agent pages are prebuilt for SEO. Dynamic verification/search pages are intentionally non-indexed.

## Limitations

- Catalogued `/agents/owner/repo/` pages are prebuilt. Arbitrary GitHub repositories are analyzed through `/verify/` or `/agents/view/?repo=owner/repo`.
- Verdicts and scores are heuristics derived from public evidence.
- Supabase auth and Edge Functions require the production project secrets to be configured before they can be end-to-end tested.
