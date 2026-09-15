# PARADOX

PARADOX is an AI agent intelligence site: discover public AI agents and GitHub projects, inspect repository evidence, compare them, and save a shortlist after sign-in.

Live site: https://paradox.engineer/

Core loop: **Discover → Understand → Verify → Compare → Save**

This is static analysis of public repositories. It is **not** a security certification and does not execute cloned code.

## Architecture

- Frontend: Astro static HTML on GitHub Pages
- Auth / database: Supabase (optional until secrets are set)
- Server-side GitHub (optional): Supabase Edge Function `analyze-repo`
- Browser fallback: GitHub REST API for public repos (strict `github.com` URL parser)

No Express/Node server. The service-role key must never ship in frontend code.

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

Set the same names as GitHub Actions repository secrets so production builds embed them.

Server / Edge Function only:

- `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard, never commit)
- `GITHUB_TOKEN` (optional; raises GitHub API rate limits for Edge Functions)

The site **builds and most discovery UI works without these**. Auth, save, and history stay visibly unavailable until the public keys exist.

## Supabase setup

1. Create a project.
2. Run `supabase/migrations/20260915_agent_intelligence.sql` in the SQL editor.
3. Enable email auth (confirmations on) and optional GitHub OAuth with redirect `https://paradox.engineer/dashboard/`.
4. Copy the **project URL** and **anon/publishable** key into GitHub Actions secrets.
5. Optional: `supabase functions deploy analyze-repo` and set `GITHUB_TOKEN`.

Row Level Security: users can only read/write their own `profiles`, `saved_agents`, and `scan_history`. `analysis_cache` is public-read for summaries, written by the service role.

## GitHub API behavior

- Only `github.com` / `www.github.com` repository URLs are accepted.
- Analysis fetches metadata plus a bounded set of files. No `npm install`, no Docker run, no shell of the target repo.
- Browser calls are rate-limited by GitHub (60/hour unauthenticated) and a simple per-browser cooldown.
- Cache TTL is 30 minutes in `localStorage`.

## Deployment

GitHub Actions on `main`: Node 22, `npm ci`, `npm run validate`, `astro build`, upload Pages artifact, deploy.

Do not enable `cache: npm` without a committed `package-lock.json`.

## Security model

See [SECURITY.md](SECURITY.md). README, source and issues are untrusted input and are never rendered as HTML without escaping.

## Limitations

- Catalogued `/agents/owner/repo/` pages are prebuilt. Arbitrary GitHub repos 404 on Pages; use `/verify/`.
- Verdicts are heuristics.
- Auth cannot be verified in CI without a live Supabase project.
