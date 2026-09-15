# PARADOX v3 — Product Plan

## Core promise

**Discover an agent. Inspect the evidence. Decide before you run it.**

## User journeys

### 1. Discover
Search public GitHub repositories by job: coding agent, research agent, browser agent, data agent, DevOps agent, MCP server, etc.

### 2. Verify
Paste a repository URL. PARADOX fetches public GitHub evidence and produces a report covering repository health, freshness, release activity, stack, manifests, sampled source, static permission signals and limitations.

### 3. Share
Every repository gets a canonical `/agent/{owner}/{repo}/` report URL that can be shared and crawled.

### 4. Save
Signed-in users can save a report to their workspace. RLS ensures users only access their own analyses.

### 5. Compare (next phase)
Compare 2–4 repositories side by side across freshness, activity, stack, setup complexity, permissions and evidence quality.

### 6. Watch (next phase)
Allow users to watch repositories and notify them when a project becomes stale, releases a version, changes its permissions profile or changes materially.

## Verification rules

- Never execute repository code.
- Never claim a security audit from heuristic static scans.
- Show the evidence and the limitation next to every verdict.
- Prefer fresh GitHub metadata over cached assumptions.
- Fail safely when GitHub data is unavailable.

## SEO system

- Unique title, description and canonical URL per report.
- JSON-LD for the site and repository reports.
- XML sitemap through the Astro sitemap integration.
- `robots.txt` excludes account and API routes.
- Search intent pages must add unique utility, not doorway/thin content.
- Public report URLs are designed for sharing and discovery.

## Product analytics

Track: `discover_search`, `repo_open`, `verify_start`, `verify_success`, `verify_error`, `save_analysis`, `signup_start`, `signup_success`, `outbound_github`, `compare_start`, `watch_start`.

Primary KPI: **verified repositories per active user**.

Secondary KPIs: verification completion rate, save rate, return rate, outbound GitHub rate and organic landing growth.

## Release gates

Before each production release: build passes in CI, auth works against a real Supabase project, RLS prevents cross-user reads, verifier rejects non-GitHub URLs, analyzer returns a bounded response on GitHub API failure, report pages have canonical/JSON-LD markup, and no untrusted repository code is executed.

## Future monetization

Keep the public verifier free. Later options: team workspaces, repository watchlists, private repository verification through an explicit GitHub OAuth/GitHub App connection, exportable reports and organization-level policy checks.
