# Privacy Policy (template)

**This is a template, not legal advice.** Have a lawyer review it before
publishing, especially if you'll handle EU users' data (GDPR) or
California residents' data (CCPA) — this template covers the common
substance but isn't jurisdiction-specific compliance language.

_Last updated: [DATE]_

## What we collect

- **Account data**: name, email, username, hashed password (we never store
  your plaintext password), profile image (if provided via OAuth).
- **OAuth data**: if you sign in with GitHub or Google, we receive your
  name, email, and profile image from that provider — never your password.
- **GitHub repository data**: once you connect a repository, we ingest
  issue, pull request, and CI check-run metadata (titles, bodies, authors,
  status) via GitHub's webhook system, to build the engineering graph and
  power root-cause analysis.
- **Usage data**: audit logs of security-relevant actions (login, role
  changes, admin actions) for security and support purposes.
- **AI provider data**: if you configure an LLM provider, evidence text
  from your connected repos is sent to that provider (self-hosted Ollama:
  stays on your own infrastructure, nothing leaves it; Anthropic: subject
  to Anthropic's own data handling terms) to generate root-cause hypotheses.

## What we don't do

- We never sell your data.
- We never train any model on your repository content.
- We never post to GitHub on your behalf without your explicit approval
  (see the approval-gated fix-proposal flow) — informational comments and
  draft PRs only happen after a human clicks Approve.

## How long we keep it

- Account data: until you delete your account.
- Audit logs: retained for security/compliance purposes; see your
  deployment's specific retention configuration.
- Session tokens: expire automatically (see the app's session lifetime)
  and are deleted immediately on logout or password reset.
- One-time tokens (email verification, password reset): deleted on use, or
  automatically purged after expiry by the scheduled cleanup job.

## Your rights

- Access, export, or delete your account data on request — contact
  [SUPPORT EMAIL].
- Disconnect a repository at any time from your organization's settings —
  this stops future ingestion immediately (existing graph data can be
  deleted on request).

## Third parties we use

Depending on how this instance is deployed: Vercel/Render (hosting),
Supabase (database), Resend or your own SMTP (email delivery), Sentry
(error monitoring), Backblaze B2 (encrypted backups), GitHub (OAuth login
and repository integration), and optionally Anthropic (AI analysis, only
if configured). Each has its own privacy policy governing data they
process on our behalf.

## Contact

Questions about this policy: [SUPPORT EMAIL].
