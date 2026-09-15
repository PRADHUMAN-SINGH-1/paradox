# PARADOX Agent Intelligence

## Product
PARADOX discovers and verifies public AI agents, skills and GitHub projects. It is not a generic AI workspace, chatbot, or utility mill.

## MVP flow
1. Search agents by capability.
2. Open a catalogued profile or paste a GitHub URL into Verify.
3. Inspect freshness, health, stack, models/tools, setup files and static risk indicators.
4. Compare two repositories.
5. Sign in to save a shortlist and scan history.

## Architecture (locked)
Astro static frontend on GitHub Pages. Supabase Auth + Postgres + RLS. Optional Edge Function for GitHub. No Node app server.

## Limitations to keep honest
VERIFIED ≠ secure. Static analysis only. Unknown when evidence is missing.
