# Watchtower

> An AI engineering memory for GitHub repos — finds the root cause, cites the
> evidence, remembers every incident, and waits for your approval before
> touching anything.

This repository currently implements **all 4 phases**: platform/identity,
GitHub ingestion + engineering graph, AI root-cause analysis + incident
memory, and Phase 4's hardening (admin completion, accessibility, backups,
threat model, legal docs, launch checklist). It has not been deployed —
that requires accounts only you can create; see the completion report /
Launch checklist for the exact steps.

## What's actually working right now

- Email/password signup with mandatory email verification, GitHub OAuth,
  Google OAuth, and account linking across all three.
- Forgot/reset password with one-time, hashed, expiring tokens.
- Database-backed sessions (Postgres, not JWT) for **every** login method,
  including email/password — see [`docs/ADR-002`](docs/ADR-002-credentials-database-sessions.md)
  for why that needed a small workaround around an Auth.js limitation.
- An "active sessions" list with per-device revoke and "log out everywhere".
- Organizations with server-enforced OWNER/ADMIN/MEMBER/VIEWER roles.
- A platform admin console: user list, org list, feature flags, a full audit
  log, and user impersonation gated behind a consent dialog and logged to
  that same audit trail.
- Argon2id password hashing, per-route rate limiting, email-enumeration-safe
  responses, a nonce-based Content-Security-Policy, and RBAC enforced
  server-side (never just hidden in the UI).
- A polished, responsive, dark-themed UI: landing page, auth pages, dashboard
  shell, admin console, and branded 404/500 pages.
- A second backend service (FastAPI) proving the same RBAC boundary can be
  enforced independently, by reading the same session cookie.
- **Phase 2 — GitHub ingestion:** connect a repo via a real GitHub App
  installation; a webhook receiver with HMAC signature verification,
  duplicate-delivery detection, and a feature-flag kill switch turns real
  issue/PR/check-run events into an auto-built engineering graph (nodes +
  typed edges — `FIXES`, `REFERENCES`, `PART_OF` — detected from PR/issue
  text, e.g. "fixes #42"). Each node is embedded and searchable via a real
  hybrid BM25 + cosine-similarity retrieval function (Reciprocal Rank
  Fusion) — infrastructure Phase 3 will call for root-cause analysis. A
  graph viewer UI shows every ingested node and its relationships.
- **Phase 3 — root-cause analysis & incident memory:** a pluggable LLM
  provider (`none` honest-abstain default, self-hosted Ollama, or
  Anthropic) drives an investigation pipeline: retrieve evidence via Phase
  2's hybrid ranking → ask the model for a cited hypothesis → **verify every
  citation against what was actually retrieved** (a hallucinated citation is
  dropped, never trusted) → a confident, verified hypothesis becomes a fix
  proposal awaiting human approval. Approving one opens a real draft PR
  (an incident report committed to a new branch — see
  [ADR-004](docs/ADR-004-phase3-scope-decisions.md) for why that's not an
  auto-generated code diff); rejecting one just closes it out. "Incident
  memory" surfaces similar past incidents via embedding similarity. CI
  failures can auto-trigger an investigation (feature-flagged, off by
  default); any issue or check run can also be investigated manually from
  the UI.
- **Phase 4 — hardening:** user suspend/unsuspend (kills sessions and
  blocks every login path immediately), a system-health admin dashboard
  (real counts: users, orgs, repos, webhook health, incidents by status
  and by LLM provider), audit-log CSV export, an automated WCAG 2.1 AA
  accessibility scan (found and fixed two real issues — insufficient text
  contrast and a color-only-distinguished link), a k6 load test script, a
  documented threat model, Privacy Policy + Terms of Service templates,
  and a launch checklist. A real backup/restore drill was performed —
  204 rows across 20 tables, restored into a freshly-migrated database,
  every count matched exactly (`scripts/backup-restore-drill.mjs`, see
  `docs/BACKUP_RESTORE_RUNBOOK.md`).
- 83 backend unit tests (web) + 3 (worker), 18 end-to-end Playwright tests
  (including the accessibility scan), 10 FastAPI tests — all passing
  against a real Postgres database (not mocked) — plus live verification
  passes: real, correctly-signed webhook deliveries confirmed the Phase 2
  graph end-to-end; a real HTTP call to a stubbed Ollama-shaped server
  confirmed the full Phase 3 pipeline end-to-end (retrieval → hypothesis →
  citation verification → fix proposal → notification), including the
  approval gate correctly failing closed with a clear error when no real
  GitHub App credentials are configured; and the Phase 4 backup/restore
  drill above. See the completion reports for the exact walkthroughs.

## Monorepo layout

```
apps/
  web/      Next.js 16 app — the product itself (UI, auth, API routes)
  api/      FastAPI service — RBAC-protected endpoints sharing apps/web's DB
  worker/   Scheduled hygiene jobs (expired-session/token cleanup)
packages/
  ui/       Shared design tokens + the Watchtower logo component
  config/   Shared TypeScript config
docs/       Architecture decision records
scripts/    Local dev tooling (embedded Postgres for zero-Docker setup)
```

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Auth | Auth.js v5 (database session strategy), `@node-rs/argon2` |
| Database | PostgreSQL, Prisma ORM (owns all migrations — see [ADR-001](docs/ADR-001-shared-schema.md)) |
| Second backend | FastAPI + SQLAlchemy (async), reading the same DB |
| Email | Resend (prod) / SMTP (prod) / Ethereal (local dev, automatic) |
| Monitoring | Sentry (`@sentry/nextjs`, `sentry-sdk`) |
| Testing | Vitest (unit), Playwright (e2e), pytest (API) |
| CI | GitHub Actions |

### Deliberate deviations from the original stack decisions, and why

- **npm workspaces instead of pnpm.** The build sandbox this was developed
  in had no pnpm installed. npm workspaces provide the same monorepo
  capability with zero functional loss for Phase 1's scope.
- **Prisma 6.19.3, not the newest Prisma 7.** Prisma 7 removed the
  `datasource { url = env(...) }` pattern in favor of a mandatory
  `prisma.config.ts` + driver-adapter model, a breaking architectural change
  to how the ORM is wired up. Given how new and invasive that change is,
  Prisma 6 (still fully supported, not legacy) was the safer choice for the
  auth-critical piece of a production app.
- **Local Postgres via `embedded-postgres`, not `docker-compose up`,** for
  the environment this was built in, which had no Docker. A `docker-compose.yml`
  is still included and works identically for anyone who does have Docker.
- **Embeddings are a local, deterministic feature-hash function, not a
  transformer model, and are stored as a Postgres `Float[]`, not a pgvector
  column.** No model download, no API key, works everywhere Postgres does —
  see [ADR-003](docs/ADR-003-embeddings-without-pgvector.md) for the honest
  tradeoff and the documented upgrade path.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start a real local Postgres (no Docker required)

```bash
npm run db:test-up
```

This downloads and runs genuine community Postgres binaries on `localhost:55432`
(cached under `.embedded-postgres/`, gitignored) — not a mock, not SQLite.
Prefer Docker instead? `docker compose up -d` does the same job using the
`docker-compose.yml` in this repo. Leave this running in its own terminal.

### 3. Configure environment variables

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

The defaults work as-is for local dev: email goes to a free, automatically
created Ethereal test inbox (the preview link is printed to your terminal —
open it to click the real verification/reset link), and no OAuth
credentials are required to use email/password login. To test GitHub/Google
login locally, follow the instructions inside `apps/web/.env.example` to
create free OAuth apps and drop the client ID/secret in.

### 4. Migrate and seed the database

```bash
npm run prisma:generate
npm run prisma:migrate --workspace=apps/web   # creates + applies migrations
npm run prisma:seed --workspace=apps/web      # creates a super-admin account
```

The seed script prints the super-admin's email/password — change it
immediately in anything beyond local dev.

### 5. Run the app

```bash
npm run dev:web
```

Visit `http://localhost:3000`.

### 6. (Optional) Run the FastAPI service

```bash
cd apps/api
python -m venv .venv
./.venv/Scripts/activate   # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

### 7. (Optional) Connect a real GitHub repository

Phase 2's ingestion is off by default (`phase2.github_ingestion` feature
flag) until you've created a GitHub App:

1. `github.com/settings/apps` → New GitHub App. Webhook URL:
   `http://localhost:3000/api/webhooks/github` (use a tunnel like `ngrok` for
   local testing, since GitHub needs a reachable URL — or test signature
   verification directly, see below). Permissions: Repository contents
   (read), Issues (read), Pull requests (read), Checks (read). Subscribe to
   events: Issues, Pull request, Check run.
2. Copy the App ID, generate a private key (.pem), and set a webhook secret.
   Put all of them in `apps/web/.env` as `GITHUB_APP_ID`,
   `GITHUB_APP_PRIVATE_KEY` (replace real newlines with `\n`),
   `GITHUB_APP_WEBHOOK_SECRET`, and `GITHUB_APP_SLUG` (from the App's URL).
3. Log in as the seeded super-admin, go to `/admin` → Feature flags → enable
   `phase2.github_ingestion`.
4. From an org's page (`/dashboard/orgs/<id>`), click "Connect a
   repository" — this redirects to GitHub's install page and back.

To verify the webhook receiver itself without a live GitHub App or a
tunnel, sign a fixture payload yourself and POST it directly — this is
exactly how Phase 2 was verified end-to-end during development:

```js
const crypto = require("node:crypto");
const secret = "<your GITHUB_APP_WEBHOOK_SECRET>";
const body = JSON.stringify({
  action: "opened",
  repository: { id: 123 }, // must match a Repository.githubRepoId already in your DB
  issue: { number: 1, title: "Test issue", body: null, html_url: "u", state: "open", user: null },
});
const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
fetch("http://localhost:3000/api/webhooks/github", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-GitHub-Event": "issues", "X-GitHub-Delivery": crypto.randomUUID(), "X-Hub-Signature-256": signature },
  body,
}).then((r) => r.json()).then(console.log);
```

## Testing

```bash
# Unit tests
npm run test --workspace=apps/web
npm run test --workspace=apps/worker

# Lint + typecheck
npm run lint --workspace=apps/web
npm run typecheck --workspace=apps/web

# End-to-end (requires the app running against a seeded database)
npm run build --workspace=apps/web && npm run start --workspace=apps/web
npx playwright test --config=apps/web/playwright.config.ts

# FastAPI
cd apps/api && pytest -q && ruff check app tests && mypy app --ignore-missing-imports
```

CI (`.github/workflows/ci.yml`) runs all of the above automatically against
a real Postgres service container on every push and pull request.

## Deployment (production)

Every service below has a genuinely free tier sufficient for Phase 1's scale.
**Two things are not free**, stated plainly rather than glossed over:

1. **A custom domain** (~$10–15/yr) — everything else can run on the free
   subdomains the platforms below provide.
2. There is no cloud LLM cost yet in Phase 1 (no AI calls happen until
   Phase 3) — flagged here because it's the one cost Phase 3 will introduce,
   and it's avoidable by self-hosting a local model per the original roadmap.

| Service | Free tier used for | Setup |
|---|---|---|
| **Vercel** | Hosting `apps/web` | Import this repo, set root directory to `apps/web`, add the env vars below. |
| **Supabase** | Production Postgres | Create a free project, copy its connection string into `DATABASE_URL`. |
| **Render** or **Fly.io** | Hosting `apps/api` | Point at `apps/api/Dockerfile`. |
| **Resend** | Transactional email | Free tier: 3,000 emails/month. Set `RESEND_API_KEY`. |
| **Sentry** | Error monitoring | Free tier project (Next.js). Set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`. |
| **GitHub Actions** | CI + nightly backups | Already configured in `.github/workflows/`. |
| **Backblaze B2** | Encrypted DB backups | Free 10GB tier. See `.github/workflows/backup.yml` for required secrets. |
| **GitHub App** | Repo ingestion (Phase 2) | Free to create. See "Connect a real GitHub repository" above; separate from the OAuth App used for login. |

### Required production environment variables (`apps/web`)

See `apps/web/.env.example` for the full list with explanations. At minimum:
`DATABASE_URL`, `AUTH_SECRET` (generate with `npx auth secret`), `NEXTAUTH_URL`
(your real domain), `GITHUB_CLIENT_ID`/`SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`
(OAuth callback URLs must point at your real domain), and one of
`RESEND_API_KEY` or `SMTP_HOST`.

### GitHub/Google OAuth app callback URLs in production

- GitHub: `https://yourdomain.com/api/auth/callback/github`
- Google: `https://yourdomain.com/api/auth/callback/google`

## Security baseline

- Argon2id password hashing (OWASP-recommended parameters).
- Rate limiting on login, registration, forgot-password, and reset-password.
- Email-enumeration-safe responses on forgot-password and resend-verification.
- One-time, hashed (SHA-256), expiring tokens for email verification (24h)
  and password reset (15m); a reset invalidates every existing session.
- Nonce-based Content-Security-Policy (see `src/proxy.ts` and the comment in
  `src/app/layout.tsx` about why the nonce must be read via `headers()` for
  Next.js's own scripts to carry it).
- RBAC enforced server-side in every Server Component and Route Handler —
  proxy.ts's cookie-presence check is a UX optimization only, never the
  actual authorization boundary.
- Every privileged action (login, role changes, impersonation, feature-flag
  toggles) is written to an append-only audit log.

**Known, accepted limitation:** `npm audit --omit=dev` reports 0
vulnerabilities in production dependencies. A handful of moderate/high
advisories exist in dev-only tooling (`vitest`/`vite`/`esbuild`'s dev-server
CORS advisory) — these affect only `npm run dev`'s local dev server, never
the deployed app, and are common across the current JS tooling ecosystem.

## Roadmap — all 4 phases complete

Phase 1 (platform/identity) → Phase 2 (GitHub App install, webhook
ingestion, auto-built engineering graph, hybrid retrieval infrastructure) →
Phase 3 (pluggable-LLM root-cause analysis, citation verification,
incident memory, approval-gated draft-PR fix proposals) → **Phase 4 (this
repository, done): admin console completion, accessibility audit, backup/
restore drill, threat model, legal docs, launch checklist.** See
[ADR-004](docs/ADR-004-phase3-scope-decisions.md) for the real-data
benchmark scope note, [THREAT_MODEL.md](docs/THREAT_MODEL.md) for the
security review, and [LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) for
exactly what's left for you to do before going live.

## License

MIT — see [LICENSE](LICENSE).
