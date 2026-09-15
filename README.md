# PARADOX

PARADOX helps developers discover public AI agents and inspect the repository behind them before they install or trust them.

## Product loop

**Discover → Inspect → Verify → Save → Share**

The first release focuses on public GitHub repositories. It reports repository freshness, release activity, stack/manifests, static permission signals and explicit verification checks. It never executes untrusted repository code.

## Stack

- Astro SSR + official Vercel adapter
- Supabase Auth + Postgres + Row Level Security
- GitHub REST API for public repository evidence
- Astro sitemap integration + canonical/robots/JSON-LD SEO
- Browser-side JavaScript for interactive verifier/discovery UI

Astro SSR is required for authenticated pages and server API routes; deploy the branch to Vercel rather than GitHub Pages. Astro documents Vercel SSR through `@astrojs/vercel`, and Supabase documents `@supabase/ssr` for Astro authentication. urlAstro Vercel SSR guidehttps://docs.astro.build/en/guides/deploy/vercel/

## Required setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_workspace.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to Vercel environment variables.
4. Optionally add `GITHUB_TOKEN` for higher GitHub API limits.
5. Import the repository into Vercel and attach `paradox.engineer`.
6. In Supabase Auth, add `https://paradox.engineer/account/` as an allowed redirect URL.

## Verification scope

The current analyzer is intentionally static. It checks public GitHub metadata, recent commits, releases, repository automation, manifests and sampled source files. It reports likely filesystem, shell, network, secret and installer signals. Those are heuristics, not a security audit.

## Contact

Pradhuman Singh — `pradhumansingh196@gmail.com`

LinkedIn: https://www.linkedin.com/in/pradhuman--singh/

Live site: https://paradox.engineer/
