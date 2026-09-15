# PARADOX production audit

Date: 2026-09-15  
Repository: https://github.com/PRADHUMAN-SINGH-1/paradox  
Production: https://paradox.engineer  
Default branch: `main`  
Audit method: local clone of `main`, source inspection, live HTTP probes, GitHub Actions run history. **No implementation changes were made before this document.**

## Current status

PARADOX is a **static Astro 7.3.2** site on **GitHub Pages** (`output: 'static'`, site `https://paradox.engineer`). The latest `main` deploy **succeeded** (run `34960892090`, 2026-09-15 ~11:00 UTC) after a prior `main` failure caused by `actions/setup-node` `cache: npm` without a lockfile.

The **product identity is split**. `FEATURE_PLAN.md` and the current homepage describe **AI agent intelligence**. Large remaining surfaces still describe **PARADOX Makers**, **PARADOX AGENT OS**, generators, daily quizzes, world tools, and an in-browser AI studio.

The **core product UI is deployed as HTML but is not functional in production**, because client scripts are requested from `/scripts/*.js` and those files **404**.

## What works

- GitHub Pages + custom domain (`CNAME` = `paradox.engineer`). Live homepage returns HTTP 200 with title `PARADOX — Discover and verify AI agents`.
- Deploy workflow on `main`: checkout → Node 22 → `npm install` (no npm cache) → `node --check` on three scripts → `astro build` → upload Pages artifact → `deploy-pages`.
- Last successful Actions run after removing `cache: npm`.
- Contact email and LinkedIn on the current contact page and `BaseLayout` footer are correct.
- GA4 (`G-5V0LJN6HTS`) and AdSense snippets are present.
- `public/robots.txt` and `public/sitemap.xml` exist and are served.
- Auth **UI** exists (`/auth/`, `/account/`) with email/password, GitHub OAuth button, forgot-password copy, and a graceful “Supabase not configured” message.
- Analyzer **logic exists** in `src/scripts/agent-core.js` (URL parse limited to `github.com`, metadata fetch, shallow file reads, heuristic scores, escaped HTML rendering).
- `.env.example` only has public Supabase placeholders (no committed secrets found in source).
- `supabase/schema.sql` enables RLS on `saved_agents` and `scan_history` with per-user select/insert (saved agents also update/delete).

## What is broken or incomplete

### Critical product failure

| Issue | Evidence |
| --- | --- |
| Verify / search / compare / auth client JS not shipped | Production `https://paradox.engineer/scripts/verify.js` (and `auth.js`, `agents.js`, `agent-core.js`) return **404**. Pages load `/scripts/*.js` as public URLs. Files live in `src/scripts/` and are **not** copied to `public/scripts/` and **not** bundled by Astro (absolute `/scripts/` URLs skip Vite). |
| Even if copied, `auth.js` uses `import.meta.env` | That only substitutes when Vite processes the module. A raw public file would never receive `PUBLIC_SUPABASE_*`. |

### Analysis engine (code review; not live-tested because scripts 404)

- Browser-side unauthenticated GitHub REST only. **No Edge Function**, **no cache TTL**, **no ETag**, **no rate-limit UX** beyond generic `GitHub API error ${status}`.
- Unauthenticated GitHub limit is **60 req/hour/IP**. One analysis issues many requests (repo, languages, tree, several files).
- File inspection is shallow: `README.md`, `package.json`, `requirements.txt`, `pyproject.toml`, `Dockerfile`, `.github/workflows/ci.yml` only. Misses Cargo/Go/Gradle, compose, other workflow names, `.env.example`, scripts.
- Risk regexes are coarse and lack file/evidence/reason objects. `.env` / `process.env` will false-positive on ordinary apps.
- Verdict uses **`PARADOX VERIFIED`** instead of **`VERIFIED`**, and can mark “verified” without checking purpose/docs consistency.
- No model/tool detection with evidence paths.
- `scan_history` is never written. Save is upsert to `saved_agents` only.
- Compare is two cards, not a side-by-side evidence table; query params `left`/`right` not supported.
- Search always appends ` AI agent`, always auto-runs `ai agent` on load (burns rate limit), results have no health/freshness/risk, and **do not open a public profile** (only `/verify/?url=`).
- No `/agents/owner/repo/` routes. No 404 page. No `/dashboard/` (account is `/account/`). No `/terms/`.
- Homepage has **no search field** on first screen (CTAs only). No featured/trending/categories.

### Auth / data

- No `profiles` table.
- `scan_history` has **no delete policy** and **no UI to delete/clear**.
- Schema uses `bigint` identity + `repo_url`/`repo_name` (usable, but not the UUID/`repository_full_name` shape in the spec).
- No analysis cache table.
- GitHub OAuth and email confirmation **cannot be verified here** without Supabase secrets.
- Account page is indexable (`robots.txt` disallows `/account/` but not `/auth/`; layout always sends `index,follow`).

### SEO / identity fragmentation

- `README.md` still describes **“PARADOX Tools” image/PDF utilities**.
- `about/` and `privacy/` use **MakerLayout** and **PARADOX Makers** copy. Privacy contact is **`hello@paradox.engineer`** (not the owner email).
- `MakerLayout` nav: Agent Atlas, Studio, Signals, Daily, World, Trending, **AGENT OS**.
- Live leftover routes (200): `/studio/`, `/trending/` (demand radar / generators), `/daily/`, `/world/`, `/ai/`, `/ai-studio/`, `/ai-radar/`, `/utilities/`, generator pages.
- Checked 404s: `/terms/`, `/dashboard/`.
- `public/sitemap.xml` lists **homepage + generators + guides**, **not** `/agents/`, `/verify/`, `/compare/`.
- `scripts/build-sitemap.mjs` also omits agent-intelligence URLs; it is **not** in the GitHub Actions build steps.
- MakerLayout JSON-LD types leftover pages as `SoftwareApplication` / `AIApplication` regardless of page.
- No Open Graph image. BaseLayout has no `og:site_name`. No breadcrumbs. No dedicated 404.

### Analytics

- GA4 pageviews only. **No product events** (`search`, `verify_started`, etc.).

### Dependencies / CI / repo hygiene

- **No `package-lock.json`**. Workflow correctly avoids `cache: npm` now. Reproducible installs are still weak (`npm install` floats the Astro tree).
- **No `tsconfig.json`**. TypeScript files exist (`src/lib/opportunity-scoring.ts`, `tailwind.config.ts`, leftover Next files) but are unused by the Astro build.
- **Astro is the only runtime dependency**. Tailwind is configured but **not installed**; React/Next remnants are **not** wired into Astro.
- Leftover Next.js: `src/app/layout.tsx`, `src/app/tools/[slug]/page.tsx`, `src/components/tools/*.tsx`, `AdSlot.tsx`.
- No tests.
- `package.json` has no `test` / `validate` scripts. CI `node --check` covers three **SEO demand scripts**, not the analyzer.
- Scheduled deploys historically succeeded (pre-rebuild). The agent-intelligence push first failed on npm cache, then succeeded.

### Security notes (current code)

- Good: GitHub hostname check; HTML escaping in analysis render; no service-role key in frontend; no code execution of fetched repos.
- Gaps: client-only GitHub (abuse/rate limit); README never rendered as HTML (good) but also never shown; risk rules too broad; no SSRF beyond URL parse (no other fetch targets); `www.github.com` rejected; no size limits on `atob` file bodies beyond a 120k concat slice; Supabase client from `esm.sh` CDN.

## What should remain

- Astro static + GitHub Pages architecture.
- Node 22 in CI, **no `cache: npm` unless a lockfile is committed**.
- Visual language (DM Sans / Instrument Serif / DM Mono, acid yellow, dark hero) — retargeted to usability, not decoration.
- Contact identity (email + LinkedIn).
- GA4 property already on the site.
- Working deploy pipeline shape.
- Demand/SEO scripts and generator pages as **legacy URLs** (do not 404) until a later deprecation, but **remove from primary nav and sitemap of the new product** except where still useful.
- `.env.example` public-only pattern.
- RLS-on-by-default direction in `schema.sql`.

## What should be removed or hidden

- Conflicting positioning: “AI agent OS”, “PARADOX Makers” as the homepage story, “Run an agent”, generic AI studio as the product.
- Primary nav items: Studio, Daily, World, Utilities, Agent Atlas (rename to Discover), AI Lab.
- Next.js leftovers that cannot build in this package.
- Unused Tailwind config as an implied stack (or install Tailwind — **do not** unless CSS needs it; native CSS already exists).
- Fake or over-claimed JSON-LD on maker pages.

## Migration risks

1. **GitHub rate limits** if analysis stays in the browser. Edge Functions + `GITHUB_TOKEN` are required for production-quality verify; app must still build and degrade without that secret.
2. **Supabase not configured in this environment**. Auth/save/history cannot be end-to-end tested without `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. **GitHub Pages cannot host SSR**. Public agent pages must be **prebuilt from a curated catalog** and/or client-hydrated shells. Arbitrary `/agents/{owner}/{repo}/` URLs 404 on Pages unless generated at build or handled via a 404 fallback.
4. **SEO conflict**: generators still indexed; new product pages missing from sitemap. Sudden mass 301 of old URLs may drop existing impressions.
5. **Reintroducing `cache: npm` without lockfile** will fail CI again.
6. **Locking Astro** after `npm install` may bump the tree; pin and commit the lockfile after a green local build.

## Production probes (2026-09-15)

```
200  /
200  /verify/  /agents/  /compare/  /auth/  /account/  /studio/  /trending/
404  /scripts/verify.js  /scripts/auth.js  /scripts/agents.js  /scripts/agent-core.js
404  /terms/  /dashboard/
```

Homepage last-modified: Tue, 15 Sep 2026 11:00:30 GMT (GitHub Pages).

## Definition-of-done vs current

Almost every product/auth/analysis/SEO checklist item is **not done**. Closest: static hosting works, contact info on one page, GA4 snippet present, RLS sketched in SQL, homepage *copy* is directionally right but missing search and live data.

## Not tested (credentials / services unavailable)

- Supabase signup, login, email verification, password reset, OAuth, RLS against a live project.
- GitHub Actions secrets `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (whether they are set).
- Authenticated GitHub API / Edge Functions (none exist).
- Google Search Console queries.
- Actual verify/search in production (blocked by 404 scripts).
