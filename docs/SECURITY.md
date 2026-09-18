# Security

## Reporting

Email pradhumansingh196@gmail.com. Do not file public issues that include secrets.

## Model

- GitHub Pages hosts static files only.
- Browser code may contain the Supabase **anon/publishable** key.
- The Supabase **service role** key and `GITHUB_TOKEN` stay in Edge Functions / GitHub Actions secrets.

## Analysis

- Target repository files are untrusted. They are parsed as data.
- Do not execute cloned code, package installs, or Dockerfiles as part of analysis.
- URL intake must remain limited to `github.com` to prevent SSRF.
- README and source excerpts must be escaped before any HTML insertion.

## Auth

Enable RLS on all user tables. Policies must use `auth.uid()`. Never `allow all` on `saved_agents` or `scan_history`.
