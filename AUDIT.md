# PARADOX production audit

Date: 2026-09-15  
Repository: https://github.com/PRADHUMAN-SINGH-1/paradox  
Production: https://paradox.engineer  
Default branch: `main`

## Remediation status

The September 15 production audit was converted into an implementation backlog and the high-impact findings were remediated on `main`.

### Fixed

- **Dependency reproducibility:** deployment now bootstraps a `package-lock.json` when an older checkout does not have one, commits it, and then uses `npm ci`.
- **Supabase dependency duplication:** legacy `src/scripts/auth.js` no longer loads Supabase from `esm.sh`; it imports the pinned npm package.
- **GitHub API exposure:** production uses the Supabase Edge Function `analyze-repo` as the primary GitHub search/analysis proxy, with a short-lived cache and optional server-side `GITHUB_TOKEN`.
- **Product identity:** primary navigation and homepage are focused on Discover / Verify / Compare / Trending / About. Legacy Maker surfaces are deindexed by `MakerLayout` and excluded from the sitemap.
- **Risk false positives:** environment-variable detection now requires a likely secret/credential name or credential-file access instead of flagging every `process.env` or `.env` mention.
- **Next.js residue:** unused `src/app` files and the unused React `AdSlot.tsx` component were removed.
- **Testing:** the suite now covers URL validation, score/verdict behavior, risk evidence, and credential false-positive guards.
- **Audit accuracy:** this document is now rewritten as a remediation record rather than a stale description of pre-fix failures.
- **Large-file analysis:** repository files over the configured limit are rejected/skipped before base64 decoding.

## Current architecture

Astro 7 static site → GitHub Pages  
Supabase Auth/Postgres/Edge Functions → optional runtime services  
GitHub API → Edge Function proxy → bounded repository evidence  

The browser retains a direct GitHub fallback only when Supabase is not configured, so local development remains usable. That fallback is intentionally degraded and is subject to public GitHub rate limits.

## Security posture

- GitHub input is restricted to `github.com` / `www.github.com` repository URLs.
- Third-party repository content is treated as untrusted data.
- PARADOX never executes repository code, package installation scripts, Dockerfiles, or shell commands.
- Repository-derived HTML is escaped before rendering.
- Supabase service-role credentials and GitHub tokens are server-side only.
- Static risk analysis reports evidence and potential risk indicators; it is not a security certification.

## Known production prerequisites

The code can build without Supabase secrets. Full production auth, save/history persistence and the server-side GitHub proxy require:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GITHUB_TOKEN` configured as a Supabase Edge Function secret

These values are not committed to the repository.

## Remaining engineering work

- End-to-end Supabase auth/RLS tests require a live project.
- Search Console query validation requires the owner's Search Console data.
- Public catalog expansion is intentionally separate from the live verifier so SEO pages contain durable, useful content rather than infinite thin URLs.
- The legacy Maker routes remain available for backward compatibility but are `noindex,nofollow` and are not linked from the primary product navigation.

## Deployment verification

The GitHub Pages workflow must remain green through:

1. checkout
2. Node 22 setup
3. lockfile bootstrap when needed
4. `npm ci`
5. full test suite
6. Astro build
7. Pages artifact upload
8. Pages deployment

Any red workflow must be treated as a release blocker.
