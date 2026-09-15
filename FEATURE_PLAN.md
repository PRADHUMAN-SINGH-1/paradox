# PARADOX Agent Intelligence

## Product direction
PARADOX is moving from a broad AI workspace to a focused discovery and verification product for public AI agents, skills, and developer workflows.

## MVP flow
1. Visitor searches agents by capability.
2. Visitor opens an agent/project profile.
3. PARADOX shows GitHub freshness, activity, stack, dependencies, model/tool signals, setup difficulty, and static permission/risk indicators.
4. Visitor pastes a public GitHub URL into **Verify an Agent**.
5. PARADOX generates an evidence-based verdict: VERIFIED, QUESTIONABLE, STALE, or HIGH-RISK.
6. Authenticated users can save agents/analyses and build a personal shortlist.

## Planned feature layers
- Agent discovery and search
- GitHub repository analyzer
- Agent health/freshness score
- Static risk indicators
- Model/tool/dependency detection
- Setup difficulty and compatibility hints
- Compare agents
- Save/bookmark agents for signed-in users
- Scan history for signed-in users
- SEO-friendly public agent pages
- Contact/about pages

## Deployment constraint
The site remains a static Astro site on GitHub Pages. Authentication is client-side through Supabase Auth; no server secrets are placed in the browser. The deploy workflow pins core dependencies and runs build validation before publishing.

## Success metrics
- Agent searches
- Analyzer starts/completions
- Saved agents
- Outbound GitHub clicks
- Return users
- Organic landing pages and Search Console clicks
