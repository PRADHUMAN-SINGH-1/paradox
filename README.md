# PARADOX

PARADOX is an AI-agent intelligence platform for discovering, understanding, verifying, comparing, and saving public AI-agent repositories and projects.

**Live:** https://paradox.engineer/

**Repository:** https://github.com/PRADHUMAN-SINGH-1/paradox

## Product at a glance

PARADOX is built around this workflow:

**Discover → Understand → Verify → Compare → Save**

The platform combines a static Astro frontend, GitHub repository intelligence, Supabase authentication/database/Edge Functions, deterministic repository analysis, and an LLM-assisted evidence investigation layer.

The central verification principle is:

> **Claim → repository evidence → evidence validation → adjudication → result**

PARADOX analyzes public repository evidence. It does **not** execute arbitrary target-repository code and it is **not** a security certification, penetration test, formal audit, or guarantee that software is safe.

---

# 1. What PARADOX does

PARADOX provides a collection of connected surfaces rather than a single repository scanner.

## Discovery and intelligence

- Public AI-agent discovery and catalog pages
- AI/agent-focused browsing
- Search and trending surfaces
- Category and use-case discovery
- Public agent/project profiles
- AI Radar
- AI Studio
- Daily intelligence surface
- World/intelligence surface

## Repository intelligence

- GitHub repository URL parsing and validation
- Repository metadata inspection
- Language detection
- Repository structure inspection
- Dependency/build-system inspection
- Implementation-signal detection
- Security-risk pattern detection
- Freshness/activity/documentation analysis
- Evidence-backed AI investigation
- Claim/evidence ledger
- Repository comparison
- Analysis caching
- Saved repositories
- Scan history for authenticated users

## Account and persistence

- Supabase authentication
- User profiles
- Saved agents/repositories
- Scan history
- Public analysis cache
- Row Level Security policies

## Additional site surfaces

The repository currently contains approximately 40 Astro page entry points covering the primary intelligence product plus supporting/legacy utility surfaces, including:

- `/`
- `/agents/`
- `/agents/[owner]/[repo]/`
- `/agents/view/`
- `/ai/`
- `/ai/[slug]/`
- `/ai-radar/`
- `/ai-studio/`
- `/categories/[slug]/`
- `/compare/`
- `/dashboard/`
- `/daily/`
- `/search/` via the client page logic
- `/trending/`
- `/verify/`
- `/about/`
- `/contact/`
- `/privacy/`
- `/terms/`
- `/auth/`
- `/account/` (redirects to `/dashboard/`)
- `/world/`
- `/use-cases/`
- `/utilities/`
- `/tools/`
- `/studio/`
- `/guides/`
- Legacy/utility generator surfaces such as bingo cards, certificates, decision wheels, random teams, seating charts, tournament brackets, raffle tickets, and word searches.

Some older utility/generator routes remain for compatibility; they are not the primary PARADOX intelligence workflow.

---

# 2. Verify: the core repository intelligence system

`/verify/` accepts a public GitHub repository URL and produces a repository analysis.

The production architecture is intentionally hybrid:

```text
Public GitHub repository
        ↓
Repository metadata + recursive tree
        ↓
Deterministic file selection
        ↓
Initial repository evidence set
        ↓
Deterministic implementation/security signals
        ↓
LLM investigation
        ↓
Targeted additional-file investigation
        ↓
Evidence-backed claims
        ↓
File/line/quote validation
        ↓
Adversarial evidence adjudication
        ↓
Deterministic safety/freshness gates
        ↓
Final verdict + PARADOX score + evidence ledger
```

## Why the system is not LLM-only

The LLM is responsible for repository reasoning and investigation. Deterministic code remains responsible for facts that should not depend on model memory or interpretation, such as whether a file exists, what repository metadata says, whether a quoted excerpt exists in an inspected file, and whether a deterministic security pattern matched.

This prevents an LLM-generated statement from automatically becoming a verified fact.

## LLM investigation

The Verify Edge Function currently defaults to:

```text
gemini-3.8-flash
```

The model can be overridden through the `GEMINI_MODEL` Edge Function environment variable.

The investigator receives repository metadata, the repository tree, initial file evidence, and deterministic findings. It can request targeted repository files for deeper investigation within bounded limits.

Current Verify investigation limits include:

- Maximum individual file size: **100,000 bytes**
- Initial file selection target: **40 files**
- Maximum combined analysis files: **64 files**
- Targeted investigation budget: **24 files**
- Maximum evidence context: **360,000 characters**
- GitHub request timeout: **12 seconds**
- AI request timeout: **18 seconds**
- Short-lived Edge Function analysis cache: **5 minutes**
- Edge Function rate limit: **24 requests/minute per request key**

These are safety/resource bounds, not a claim that every file in every repository is exhaustively analyzed.

## Repository file selection

The analyzer ranks repository files rather than blindly reading an arbitrary first N files.

Priority is given to files such as:

- `README.md`
- package/dependency manifests and lockfiles
- Python/Java/Go/Rust/PHP/Ruby/.NET build manifests
- Docker/Compose files
- Make/Just files
- GitHub Actions workflows
- application entry points
- `src`, `app`, `lib`, `server`, `api`, `cmd`, and `internal` code
- tests and specifications
- configuration files
- documentation

Known generated/dependency/build directories are excluded from normal selection, including `node_modules`, `.git`, `dist`, `build`, `coverage`, `vendor`, `target`, `.next`, `.astro`, `out`, `bin`, and `obj`.

Generated/vendor/third-party/fixture paths receive lower selection priority.

## Supported implementation signals

The deterministic detector currently recognizes signals including:

### Model providers

- OpenAI
- Anthropic
- Gemini / Google AI
- Hugging Face
- Ollama
- Mistral
- Groq
- OpenRouter

### AI frameworks

- LiteLLM
- LangChain
- LangGraph
- LlamaIndex

### Agent/tooling capabilities

- MCP
- Browser automation
- RAG/retrieval
- Vector databases
- Tool/function calling

Documentation-only references such as README text are intentionally not sufficient to create an implementation detection.

## Security indicators

The deterministic security layer looks for security-relevant patterns such as:

- Remote script execution
- Shell/process execution primitives
- Dynamic code execution (`eval`, `new Function`)
- Privileged Docker configuration
- Broad host filesystem mounts
- Credential/environment-variable access patterns
- Credential-file access
- SSH/private-key/token material indicators

These are **risk indicators**, not automatic proof of malicious behavior. Context and the evidence investigation matter.

## Evidence ledger

Verify results can expose claims with:

- Claim ID
- Claim text
- `CONFIRMED`, `CONTRADICTED`, or `UNCONFIRMED` status
- Confidence
- Repository file
- Line number
- Evidence quote

Evidence quotes are checked against the inspected repository files before claims are accepted into the evidence result.

Evidence validation is revision-aware: the production analyzer resolves the repository's default branch to an immutable commit SHA before collecting repository files, and the initial and targeted investigation reads are pinned to that same revision. This prevents a moving branch from changing the evidence between reads.

The Verify LLM path uses three distinct reasoning stages:

1. **Investigation planning** — selects exact additional repository paths and focus questions from the repository inventory.
2. **Evidence review** — produces the structured claim ledger from the inspected implementation/configuration.
3. **Adversarial adjudication** — audits the draft ledger and can downgrade unsupported, dependency-only, README-only, overbroad or quote-mismatched claims.

The model never has authority to override deterministic source-of-truth checks. A claim must survive evidence-quote validation before it can remain CONFIRMED or CONTRADICTED.

Before returning a result, deterministic security rules are run again across the complete initial + targeted evidence set. The final verdict still remains constrained by deterministic risk and freshness gates.

Evidence quotes are redacted before they are returned to the browser, and the analyzer treats repository content as untrusted data rather than instructions.

A model statement without repository evidence is not treated as confirmed evidence.

### Verify result interface

The Verify result page uses an evidence-first investigation hierarchy with a syntax-safe renderer:

1. **Verdict header** — repository identity, evidence-supported verdict, PARADOX Score, analyzed commit, agent-review state and repository-tree completeness.
2. **Evidence summary** — confirmed, contradicted, unconfirmed, high-risk, inspected-file count and evidence-quality metrics.
3. **Final adjudication** — concise explanation of why the result was reached, including revision locking, evidence validation and deterministic constraints.
4. **Primary evidence ledger** — the main result surface for claim → file → evidence.
5. **Agent adjudication** — model, confidence, targeted investigation and adversarial evidence pass.
6. **Security surface and implementation signals** — security indicators and observable model/tool implementation evidence.
7. **Repository health and profile** — freshness, activity, documentation and repository metadata as supporting context.
8. **Deep context** — inspected files and README/project context remain available as expandable sections.

This ordering deliberately puts evidence and adjudication ahead of secondary repository statistics so the result reads like an investigation report rather than a general-purpose dashboard.

## Verdicts

The current adjudication vocabulary is:

- **VERIFIED / EVIDENCE-SUPPORTED** — deterministic gates passed and the evidence investigation meets the current evidence requirements.
- **QUESTIONABLE / NEEDS REVIEW** — evidence is incomplete, conflicting, or does not meet the current verification gates.
- **STALE EVIDENCE** — repository activity/evidence is too old or the repository is archived for a current evidence-supported status.
- **HIGH-RISK SIGNALS** — deterministic security gates identify a high-risk cluster.

A verdict is an analytical product result, not a certification of the target software.

### Reproducibility and coverage gates

Every production Verify run records the analyzed commit SHA and branch ref. The frontend displays the abbreviated commit used for evidence collection.

A repository is not allowed to receive an evidence-supported verdict when the recursive Git tree is incomplete. In that case Verify returns a review state rather than implying that an incomplete repository view is exhaustive.

The server also applies bounded request, file, evidence, rate-limit and cache controls. Server caches are keyed by repository + immutable commit SHA rather than by repository name alone, and the cache has an explicit entry bound.

The Edge Function includes a checked-in `deno.json` runtime configuration and is deployed as the public Verify execution boundary. The function remains intentionally unauthenticated because Verify analyzes public repositories; abuse controls are implemented at the endpoint rather than relying on a user session.

Verify also uses a shared Supabase-backed rate-limit bucket in addition to an in-memory per-runtime limiter. Client identifiers are SHA-256-derived before storage, and the shared limiter is protected by RLS plus a service-role-only mutation function.

### Security analysis scope

- GitHub Actions injection surfaces
- Docker socket exposure
- host network mode
- privileged container configuration
- broad host filesystem mounts
- remote script execution
- shell/process execution
- dynamic code execution
- credential/environment access
- credential-file access
- strong private-key/token material indicators

These are static risk indicators, not proof of malicious intent. Context and the evidence ledger remain important.

---

# 3. PARADOX Score

The PARADOX Score is a bounded summary metric derived from repository health signals and, when available, validated evidence quality.

The score considers:

- Repository health
- Freshness
- Documentation
- Activity
- Deterministic risk signals
- Evidence quality from the investigation

Evidence quality considers factors such as:

- Evidence-backed claim coverage
- Confirmed claims
- Model confidence
- Repository/file coverage
- Targeted investigation depth
- Contradictions

When the LLM evidence investigator is unavailable, the PARADOX Score uses the deterministic repository baseline. When a validated agent review is available, the score blends **70% deterministic repository quality + 30% validated evidence quality**. Evidence quality includes evidence-backed claim coverage, confirmed/contradicted/unconfirmed status, model confidence, repository coverage and targeted investigation depth.

The evidence component is applied only after file/quote validation. A model cannot simply return a high score and override deterministic risk, freshness or incomplete-tree gates. Cache versioning is bumped whenever the scoring contract changes so an older browser result is not reused.

**The score is not a security score and should not be interpreted as a guarantee of software safety.**

---

# 4. GitHub integration

PARADOX accepts only public GitHub repository URLs from:

- `github.com`
- `www.github.com`

The production Verify path uses the Supabase `analyze-repo` Edge Function as the server-side GitHub proxy.

The proxy:

1. Validates the repository URL.
2. Reads repository metadata.
3. Reads language information.
4. Reads root contents.
5. Reads contributor information.
6. Reads recent commits.
7. Reads the latest release when available.
8. Reads the recursive Git tree.
9. Selects relevant files.
10. Fetches bounded file contents.
11. Runs deterministic analysis.
12. Runs the LLM investigation.
13. Returns the structured analysis to the frontend.

A configured `GITHUB_TOKEN` is kept server-side and can increase GitHub API capacity. It is never sent to the browser.

PARADOX does not run:

- `npm install` against the target repository
- target-repository Docker containers
- target-repository shell commands
- target-repository binaries
- arbitrary target-repository application code

This is a deliberate security boundary.

---

# 5. Frontend architecture

PARADOX uses:

- Astro `7.3.2`
- TypeScript `6.0.2`
- Supabase JS `2.57.4`
- Node.js `22+`

The site is configured as a static Astro build:

```text
output: static
build format: directory
site: https://paradox.engineer
```

There is no Express/Node application server in the frontend architecture.

The frontend contains reusable analysis modules for:

- analysis fetching
- caching
- deterministic scoring
- implementation detection
- security-risk detection
- GitHub URL parsing
- result rendering
- dashboard insights
- analytics
- local state
- catalog data
- opportunity scoring
- Supabase integration

---

# 6. Backend architecture

Supabase is used for backend services.

## Edge Functions

The repository contains Edge Functions for:

- `analyze-repo` — repository analysis and Verify intelligence
- `ai-radar` — AI radar data workflow
- `ai-router` — normalized server-side AI provider routing for AI Studio

The `ai-router` keeps model-provider credentials server-side and supports provider routing/fallback configuration for AI Studio.

Supported AI-router configuration includes providers/models for:

- Gemini
- Groq
- Cerebras
- Hugging Face
- Ollama

The Verify analyzer uses its own repository-investigation path and currently defaults to Gemini through `GEMINI_MODEL`.

---

# 7. Supabase database

The primary migration is:

```text
supabase/migrations/20260915_agent_intelligence.sql
```

It creates:

## `profiles`

Stores authenticated user profile information:

- `id`
- `email`
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

## `saved_agents`

Stores user-saved repositories/agents:

- repository URL
- repository full name
- verdict
- score
- owner/user ID
- creation timestamp

A user can only access their own saved records.

## `scan_history`

Stores authenticated analysis history:

- repository URL
- repository full name
- verdict
- score
- full analysis JSON
- user ID
- timestamp

A user can only access their own history.

## `analysis_cache`

Stores public repository analysis summaries for reuse:

- repository full name
- analysis timestamp
- repository head SHA
- summary JSON

The public cache is read-only from the frontend; privileged writes belong to backend/server-side workflows.

## Row Level Security

RLS is enabled on all four tables.

User-owned tables use `auth.uid()` policies so authenticated users cannot read or modify another user's profile, saved repositories, or scan history.

---

# 8. Authentication

Authentication is handled through Supabase Auth.

The intended configuration supports:

- Email/password authentication
- Optional GitHub OAuth

The production OAuth redirect is:

```text
https://paradox.engineer/dashboard/
```

Account routes redirect users into the dashboard experience where appropriate.

---

# 9. Client-side caching and limits

The browser analysis cache uses a versioned local cache with a **30-minute TTL**.

Search caching uses a shorter **5-minute TTL**.

Anonymous Verify usage is locally rate-limited to **8 attempts per 10-minute window** before another attempt is permitted.

The server-side Verify Edge Function has both a bounded local limiter and a shared database-backed limiter, plus a short-lived commit-keyed cache; client-side limits are therefore not the only protection.

Caches are performance mechanisms. They should never be treated as permanent truth about a repository.

---

# 10. Graceful degradation

The frontend has a GitHub REST fallback for situations where the Supabase analysis path is unavailable.

The fallback is intentionally degraded:

- It is subject to GitHub's public API limits.
- It does not provide the same server-side capacity as the production Edge Function.
- Production verification should use the Supabase path when configured.

---

# 11. Security model

PARADOX treats third-party repository content as **untrusted input**.

That includes:

- README files
- source code
- configuration
- issues
- documentation
- comments
- repository metadata

Repository content must not be allowed to become an instruction to the PARADOX analysis system.

Repository-derived content is escaped before being rendered into the interface.

Sensitive-looking credentials are redacted before AI evidence analysis.

Target repositories are never executed by PARADOX.

For the complete security policy, see [`docs/SECURITY.md`](docs/SECURITY.md).

---

# 12. SEO strategy

PARADOX separates indexable intelligence pages from dynamic analysis workflows.

Public catalogued agent pages can be prebuilt for SEO.

Dynamic verification/search surfaces are intentionally not treated as the primary SEO corpus because arbitrary repository analysis is runtime-generated.

Legacy utility surfaces remain available for compatibility but are not the primary agent-intelligence navigation.

The sitemap is generated during the build process.

---

# 13. Deployment

Production frontend deployment is handled by GitHub Actions and GitHub Pages.

Pull requests are also validated before merge through dedicated CI and dependency-review workflows. CodeQL analyzes the protected main branch on every push and on a weekly schedule, while Dependabot tracks npm and GitHub Actions updates.

Workflow:

```text
Push to main
    ↓
Checkout
    ↓
Node 22
    ↓
npm ci --no-audit --no-fund
    ↓
npm run validate
    ↓
npm run build
    ↓
Upload Pages artifact
    ↓
Deploy GitHub Pages
```

The workflow is:

```text
.github/workflows/pages.yml
```

GitHub Actions requires the public Supabase build-time secrets:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The Supabase Edge Function requires server-side secrets such as:

- `GITHUB_TOKEN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional override)

Secrets must never be committed to the repository or bundled into browser code.

---

# 14. Local development

Requirements:

- Node.js `22+`
- npm
- Git

Install:

```bash
npm ci
```

Optional local public configuration:

```bash
cp .env.example .env
```

Run tests:

```bash
npm test
```

Run the development server:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the full validation pipeline:

```bash
npm run validate
```

`validate` performs JavaScript checks, the test suite, and Astro type/project checks.

Production build output is written to:

```text
dist/
```

---

# 15. Environment variables

## Public/browser-safe

```text
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

These values are intended for the browser-side Supabase client.

## Server / Edge Function only

```text
GITHUB_TOKEN
GEMINI_API_KEY
GEMINI_MODEL
```

The AI Router has additional provider-specific server-side configuration:

```text
GEMINI_API_KEY
GEMINI_MODEL
GROQ_API_KEY
GROQ_MODEL
CEREBRAS_API_KEY
CEREBRAS_BASE_URL
CEREBRAS_MODEL
HF_API_KEY
HF_MODEL
OLLAMA_API_KEY
OLLAMA_BASE_URL
OLLAMA_MODEL
```

Only configure providers that are actually required by the deployment. Never expose these secrets through Astro public variables.

---

# 16. Testing

The repository contains automated tests covering core analysis behavior, including:

- Analysis behavior
- Cache behavior
- Dashboard insights
- GitHub URL validation
- Security-risk detection
- Score calculations
- Utility/guard behavior

Run all tests:

```bash
npm test
```

Run the complete validation command:

```bash
npm run validate
```

The production Pages workflow runs validation before deployment.

---

# 17. Repository structure

Important top-level areas:

```text
src/
├── pages/                 Astro route/page entry points
├── lib/
│   ├── analysis/          Repository analysis, scoring, detection, caching
│   ├── catalog.ts         Agent/catalog data
│   ├── dashboard-insights.ts
│   ├── github-url.ts      GitHub URL parsing/validation
│   ├── local-state.ts     Browser state helpers
│   ├── opportunity-scoring.ts
│   └── supabase.ts        Supabase client
├── scripts/pages/         Page-specific client workflows
└── styles/                Global/page styling

supabase/
├── functions/
│   ├── analyze-repo/      Verify repository intelligence
│   ├── ai-radar/          AI Radar backend workflow
│   └── ai-router/         AI Studio provider router
└── migrations/            Database/RLS migration

tests/                     Automated test suite
scripts/                   Build, SEO and demand-processing scripts
.github/workflows/         GitHub Pages CI/CD
```

The repository contains roughly **203 tracked files** on the current main tree; this number changes as the project evolves.

---

# 18. Build and release principles

PARADOX follows these implementation principles:

1. **Evidence over unsupported claims.**
2. **LLM reasoning with deterministic validation.**
3. **Never execute arbitrary target repositories.**
4. **Keep privileged credentials server-side.**
5. **Treat third-party repository content as untrusted.**
6. **Use bounded repository/file analysis rather than unbounded ingestion.**
7. **Separate public catalog data from runtime verification.**
8. **Use RLS for user-owned Supabase data.**
9. **Validate before production deployment.**
10. **Do not represent heuristics as formal certification.**

---

# 19. Known limitations

PARADOX is intentionally bounded.

- It does not execute target-repository code.
- It does not perform a full penetration test.
- It does not provide formal security certification.
- It does not guarantee that a repository is safe or malicious-free.
- Large files can be skipped by the analyzer.
- Analysis is bounded to a ranked subset of repository files plus targeted investigation files.
- A partial or truncated repository tree cannot produce an evidence-supported verification verdict.
- Verification is reproducible only for the immutable commit revision captured by the run; a later repository commit is a different evidence state.
- Dynamic verification results are not the same thing as prebuilt catalog pages.
- GitHub API availability/rate limits can affect degraded fallback behavior.
- AI provider availability can affect whether an LLM investigation is available for a specific run.
- The shared Verify rate limiter falls back to the bounded in-memory limiter when the database path is temporarily unavailable.
- Cached results can be older than the repository's current state until a fresh analysis is requested.

These limitations are part of the product's trust model rather than hidden behavior.

---

# 20. Responsible interpretation of Verify results

A PARADOX result should be read as an **evidence-backed repository intelligence report**.

For example:

- `CONFIRMED` means the claim has validated repository evidence supporting it.
- `CONTRADICTED` means repository evidence conflicts with the claim.
- `UNCONFIRMED` means the available evidence was insufficient to establish the claim.
- `HIGH-RISK SIGNALS` means deterministic risk rules identified a relevant high-risk pattern or cluster; it is not automatically a finding of malicious intent.
- `STALE EVIDENCE` means the repository's current evidence could not support a current status under the product's freshness gates.

This distinction is important: **PARADOX reports what the available repository evidence supports; it does not manufacture certainty where evidence is missing.**

---

# 21. Current technology stack

### Frontend

- Astro 7.3.2
- TypeScript 6.0.2
- Static HTML/CSS/TypeScript output

### Backend / platform

- Supabase
- Supabase Edge Functions
- Supabase Auth
- PostgreSQL through Supabase
- Row Level Security

### Repository intelligence

- GitHub REST API
- Recursive Git tree inspection
- Deterministic TypeScript analysis
- LLM evidence investigation
- Evidence validation/adjudication

### AI infrastructure

- Gemini for Verify investigation
- AI Router for AI Studio provider routing
- Optional provider integrations for Gemini, Groq, Cerebras, Hugging Face, and Ollama

### Deployment

- GitHub Actions
- GitHub Pages
- Node.js 22

---

# 22. Project status

PARADOX is an actively developed engineering project. The README describes the current repository architecture and bounded production behavior; individual provider availability, deployment secrets, GitHub API limits, and external service configuration can change independently of the frontend source tree.

For production troubleshooting, verify:

1. GitHub Pages deployment succeeded.
2. Public Supabase variables are configured in GitHub Actions.
3. Supabase Edge Functions are deployed.
4. `GITHUB_TOKEN` is configured where required.
5. `GEMINI_API_KEY` is configured for Verify LLM investigation.
6. The configured Gemini model is available to the project.
7. Supabase Auth redirect URLs match the production domain.
8. RLS policies are applied from the current migration.

---

# 23. License and contribution

Check the repository's current license and contribution files before redistributing or extending PARADOX.

When contributing, run:

```bash
npm run validate
```

before pushing changes to `main`.

---

# PARADOX in one sentence

**PARADOX is an evidence-driven AI-agent intelligence platform that uses deterministic repository analysis and LLM investigation to help users discover, understand, verify, compare, and track public AI-agent projects without executing the target code.**
