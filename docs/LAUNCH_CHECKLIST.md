# Launch checklist

Everything below is either done in code/CI already (marked ✅, with proof)
or is a manual step for you, the operator, before going live (marked ☐).

## Already done (this repository)

- ✅ CI runs lint, typecheck, unit tests, e2e tests (including an automated
  WCAG 2.1 AA accessibility scan), and a security scan (npm audit, Semgrep,
  Dependabot) on every push and PR.
- ✅ Two real accessibility bugs found and fixed during the Phase 4 audit
  (insufficient text contrast; a link indistinguishable from surrounding
  text without color) — see `e2e/accessibility.spec.ts`.
- ✅ A real backup/restore drill was performed and passed (204 rows across
  20 tables, exact match) — see `docs/BACKUP_RESTORE_RUNBOOK.md`.
- ✅ A threat model documenting mitigations and honest known gaps — see
  `docs/THREAT_MODEL.md`.
- ✅ MIT license, Privacy Policy and Terms of Service templates.
- ✅ Full RBAC test coverage across two independent services (Next.js +
  FastAPI) agreeing on the same authorization decisions.

## Manual steps before going live

### Accounts to create (see README's full walkthrough for each)
- ☐ GitHub OAuth App (login)
- ☐ Google OAuth App (login)
- ☐ GitHub App (repo ingestion — separate from the OAuth App)
- ☐ Supabase project (production Postgres + enable pgvector if/when you
  migrate off the Float[] embedding storage — see ADR-003)
- ☐ Vercel project (hosts `apps/web`)
- ☐ Render or Fly.io service (hosts `apps/api`)
- ☐ Resend account (transactional email) or your own SMTP
- ☐ Sentry project (error monitoring)
- ☐ Backblaze B2 bucket + application key (encrypted backups)
- ☐ A domain name, if you want one instead of the free `*.vercel.app` subdomain

### Configuration
- ☐ Every env var in `apps/web/.env.example` and `apps/api/.env.example`
  set in your hosting platform(s) with real values.
- ☐ OAuth callback URLs updated to your real domain (both the login OAuth
  Apps and the GitHub App's webhook/setup URLs).
- ☐ `AUTH_SECRET` generated fresh for production (`npx auth secret`) —
  never reuse the value from local `.env`.
- ☐ Fill in `[DATE]` and `[SUPPORT EMAIL]` placeholders in
  `docs/PRIVACY_POLICY.md` and `docs/TERMS_OF_SERVICE.md`, and have a
  lawyer review both before publishing them.
- ☐ Decide on and configure `LLM_PROVIDER` — `none` (default, zero cost,
  honest abstention) is a completely valid launch choice; enable
  `ollama` or `anthropic` (with the `phase3.ai_rca` feature flag) only
  when you're ready.

### Verification, once deployed
- ☐ Sign up, verify email, log in, reset password — all for real, against
  the deployed URL, not just localhost.
- ☐ Install the GitHub App on a real repo and confirm a webhook actually
  reaches `/api/webhooks/github` (check the Repository's "last ingested"
  timestamp in the UI).
- ☐ Run `.github/workflows/backup.yml` once manually ("Run workflow") and
  confirm a file actually lands in your B2 bucket.
- ☐ Trigger a test error and confirm it appears in Sentry.
- ☐ Run an OWASP ZAP baseline scan against the live URL (see
  `.github/workflows/` — add a ZAP scan job pointed at your deployed URL;
  not run automatically since there's nothing deployed for CI to scan yet).
- ☐ Run `k6 run scripts/load-test.js` (see that file) against the deployed
  URL to sanity-check it holds up under light concurrent load.

### Ongoing
- ☐ Review the audit log periodically (CSV export available in `/admin`).
- ☐ Re-run the backup/restore drill quarterly.
- ☐ Keep Dependabot PRs merged promptly.
