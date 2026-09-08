# Watchtower — Complete Free Setup Guide

**Total cost: $0.** No domain purchase, no credit card required anywhere in
this guide. Every service used has a free tier that's genuinely enough for
this project.

Follow this top to bottom, in order. Don't skip ahead — later steps need
values from earlier ones (like your live website's address).

---

## Before you start

**What you'll have at the end of Part A:** a real, live website, on the
internet, that anyone can sign up to, with working email verification,
password reset, and "Sign in with GitHub/Google" — running on free hosting.

**Part B is optional** — extra features (connecting a GitHub repo, AI
analysis, automated backups) you can add later, whenever you want, still
for free. Skip it entirely for now if you just want the site live.

**Two free-tier quirks to know upfront, so they don't confuse you later:**
- Your free Supabase database **pauses itself after 7 days with no
  activity**. If your site suddenly can't log anyone in after a week of
  nobody visiting, go to your Supabase project dashboard and click
  **Resume** — that's all it is, nothing is broken.
- Your website's free address will look like
  `something.vercel.app` — that's normal and permanent, not a placeholder.
  You never need to buy a domain.

---

# PART A — Get the website live (required)

## A1. Put your code on GitHub

1. Go to **github.com**, log in (create a free account first if you don't
   have one — top right, **Sign up**).
2. Click the **+** icon top-right → **New repository**.
3. Repository name: `watchtower` (or anything you like).
4. Leave it **Public** or **Private**, your choice — both are free.
5. **Do not** check "Add a README" or any other checkbox — leave everything
   else unchecked, since your project already has these files.
6. Click **Create repository**. GitHub will show you a page with some
   commands — ignore it, use the commands below instead.

7. Open a terminal **in your project folder** (`E:\NEW_project`) and run
   these one at a time:

```bash
git init
git add .
git commit -m "Watchtower: complete build, phases 1-4"
```

8. Now connect it to the repository you just made on GitHub. Replace
   `YOUR-USERNAME` below with your actual GitHub username:

```bash
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/watchtower.git
git push -u origin main
```

If it asks you to log in, follow the prompt (it'll open a browser window
to confirm it's you). Once it finishes, refresh the GitHub page — your
files should all be there.

---

## A2. Create your free database (Supabase)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub
   (easiest) or email.
2. Click **New project**.
3. Fill in:
   - **Name**: `watchtower`
   - **Database Password**: click **Generate a password**, then **copy it
     somewhere safe right now** (a notes app, anywhere) — you'll need it
     in a minute and Supabase won't show it to you again.
   - **Region**: pick whichever is closest to you.
4. Click **Create new project**. Wait 1-2 minutes while it sets up.
5. Once it's ready, click **Connect** (top of the page, or in the left
   sidebar under Project Settings → Database).
6. You'll see a **Connection string** section with a dropdown. Select
   **Transaction pooler** (this one works best with the type of hosting
   we're using).
7. Copy the connection string shown. It looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-xxxxx.pooler.supabase.com:6543/postgres
   ```
8. Paste it somewhere temporary and **replace `[YOUR-PASSWORD]`** with the
   real password you copied in step 3. This full string is your
   **`DATABASE_URL`** — you'll need it in Part A4.

---

## A3. Generate your app's secret key

This is a random password the app uses internally to keep sessions secure.
In your terminal, in the project folder, run:

```bash
cd apps/web
npx auth secret
```

It will print out a value (or write it to a file) — either way, you need a
random string. If the command doesn't just print one directly, you can
generate one yourself instead:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy whatever string it gives you. This is your **`AUTH_SECRET`**. Save it
next to your `DATABASE_URL`.

---

## A4. Put the website online (Vercel)

1. Go to **vercel.com** → **Sign Up** → choose **Continue with GitHub**
   (this makes the next step much easier).
2. Once logged in, click **Add New...** → **Project**.
3. Find your `watchtower` repository in the list and click **Import**.
4. Before clicking Deploy, you need to fix two settings:
   - **Root Directory**: click **Edit** next to it, and select `apps/web`.
     This is important — your project has multiple apps inside it, and
     Vercel needs to know which one to build.
   - Scroll down to **Environment Variables**. Add these two for now
     (you'll add the rest in Part A9):
     | Name | Value |
     |---|---|
     | `DATABASE_URL` | the full string you saved in A2 |
     | `AUTH_SECRET` | the string you saved in A3 |
     | `NEXTAUTH_URL` | `http://localhost:3000` (temporary — fixed in the next step) |
5. Click **Deploy**. Wait a few minutes. It should finish with a green
   checkmark and a screenshot of your homepage — that means it worked.
6. Click **Continue to Dashboard**, then find your project's real web
   address at the top of the page — something like
   `https://watchtower-yourname.vercel.app`. **Copy this exact address.**
   This is your live website's permanent home. Write it down — you'll
   paste it in several places below.

---

## A5. Fix your website's address

Your app needs to know its own real address to work correctly (for
redirects, email links, etc.).

1. In your Vercel project, go to **Settings → Environment Variables**.
2. Find `NEXTAUTH_URL`, click the **⋯** menu next to it → **Edit**.
3. Change the value to your real address from A4 step 6, **with no
   trailing slash** — e.g. `https://watchtower-yourname.vercel.app`.
4. Save.
5. Go to the **Deployments** tab, click the **⋯** on the most recent
   deployment → **Redeploy** (so the new value takes effect).

---

## A6. Let people log in with GitHub

1. Go to **github.com/settings/developers** (while logged into GitHub).
2. Click **OAuth Apps** → **New OAuth App**.
3. Fill in:
   - **Application name**: `Watchtower`
   - **Homepage URL**: your real Vercel address from A4
   - **Authorization callback URL**: your real Vercel address **+**
     `/api/auth/callback/github` — e.g.
     `https://watchtower-yourname.vercel.app/api/auth/callback/github`
4. Click **Register application**.
5. On the next page, copy the **Client ID** shown.
6. Click **Generate a new client secret** → copy the secret shown
   immediately (it's only shown once).
7. Save both of these (Client ID and Client Secret) — you'll add them to
   Vercel in Part A9.

---

## A7. Let people log in with Google

1. Go to **console.cloud.google.com** and sign in with any Google account.
2. If this is your first time here, it may ask you to create a project —
   click **Select a project → New Project**, name it `Watchtower`, click
   **Create**, then make sure it's selected (top left dropdown).
3. In the search bar at the top, type **OAuth consent screen** and open it.
   - User Type: **External** → **Create**.
   - App name: `Watchtower`. User support email: your email. Developer
     contact email: your email. Click **Save and Continue** through the
     remaining steps (you can leave scopes and test users empty) until
     you reach the summary, then **Back to Dashboard**.
4. In the search bar, type **Credentials** and open it.
5. Click **+ Create Credentials → OAuth client ID**.
6. Application type: **Web application**. Name: `Watchtower`.
7. Under **Authorized redirect URIs**, click **+ Add URI** and enter your
   real Vercel address + `/api/auth/callback/google` — e.g.
   `https://watchtower-yourname.vercel.app/api/auth/callback/google`
8. Click **Create**. A popup shows your **Client ID** and **Client
   Secret** — copy both and save them.

---

## A8. Let the app send real emails (Resend)

Without this step, verification/reset emails silently go nowhere in
production — this step is required, not optional, for real users to be
able to sign up.

1. Go to **resend.com** → **Sign Up** (free tier: 3,000 emails/month, no
   card required).
2. Once logged in, go to **API Keys** in the left sidebar → **Create API
   Key**. Name it anything, permission "Full access" is fine.
3. Copy the key shown (starts with `re_`) — you only see it once. Save it.

That's enough to send real emails immediately, from Resend's own shared
sending address — good enough to get started. (Later, if you want emails
to come from your own name/domain, you can verify a domain under
**Domains** in Resend — not required for now.)

---

## A9. Add everything to Vercel and redeploy

Go back to your Vercel project → **Settings → Environment Variables**.
Add each of these (for `NEXTAUTH_URL`, edit the one you already added):

| Name | Value |
|---|---|
| `DATABASE_URL` | *(already set in A4)* |
| `AUTH_SECRET` | *(already set in A4)* |
| `NEXTAUTH_URL` | *(already fixed in A5)* |
| `GITHUB_CLIENT_ID` | from A6 |
| `GITHUB_CLIENT_SECRET` | from A6 |
| `GOOGLE_CLIENT_ID` | from A7 |
| `GOOGLE_CLIENT_SECRET` | from A7 |
| `RESEND_API_KEY` | from A8 |
| `EMAIL_FROM` | `Watchtower <onboarding@resend.dev>` (Resend's free shared sender — works immediately) |

After adding all of these: go to **Deployments** → **⋯** on the latest one
→ **Redeploy**, so the app picks them up.

---

## A10. Create your database tables and your admin account

This is a one-time step, run from your own computer, that sets up the
actual tables in your Supabase database and creates your first login.

1. Open a terminal in your project folder:
   ```bash
   cd apps/web
   ```
2. Set your live database address for just this terminal session
   (replace with your real A2 connection string):

   **If you're using Git Bash / Mac / Linux:**
   ```bash
   export DATABASE_URL="postgresql://postgres.xxxx:yourpassword@....supabase.com:6543/postgres"
   ```
   **If you're using Windows PowerShell:**
   ```powershell
   $env:DATABASE_URL = "postgresql://postgres.xxxx:yourpassword@....supabase.com:6543/postgres"
   ```

3. Create the tables:
   ```bash
   npx prisma migrate deploy
   ```
   You should see "All migrations have been successfully applied."

4. Create your admin account. First, set the email/password you actually
   want to log in with (still the same terminal session):

   **Git Bash:**
   ```bash
   export SEED_ADMIN_EMAIL="your-real-email@example.com"
   export SEED_ADMIN_PASSWORD="ChooseAStrongPassword123!"
   ```
   **PowerShell:**
   ```powershell
   $env:SEED_ADMIN_EMAIL = "your-real-email@example.com"
   $env:SEED_ADMIN_PASSWORD = "ChooseAStrongPassword123!"
   ```

5. Run the seed script:
   ```bash
   npx tsx prisma/seed.ts
   ```
   It will print out the admin email/password it created — confirm it
   matches what you just set.

6. Close that terminal (or just leave it — the env vars only affected that
   one window and don't change anything else on your computer).

---

## A11. Test your live website

1. Visit your real Vercel address in a browser.
2. Click **Log in**, enter the admin email/password from A10 — you should
   land on the dashboard, and see **Admin console** in the sidebar.
3. Open a private/incognito window and try **Sign up** with a different,
   real email address you can check — confirm you receive a real
   verification email (check spam folder too) and that clicking it works.
4. Try **Continue with GitHub** and **Continue with Google** from the
   login page — confirm both actually log you in.
5. Try **Forgot password** — confirm you get a real reset email.

**If something doesn't work:** go to your Vercel project → **Deployments**
→ click the latest one → **Runtime Logs**, which shows real error messages
from the live site.

**You're done with the required part.** You have a live, free,
fully-working website. Everything below is optional, add whenever you want.

---

# PART B — Optional extras (all still free)

You don't need any of these for the site to work. Add them whenever you
feel like it, in any order.

## B1. Error monitoring (Sentry)

Tells you when something breaks on the live site, automatically.

1. Go to **sentry.io** → sign up free.
2. **Create Project** → choose **Next.js** as the platform.
3. It'll show you a **DSN** (a URL starting with `https://...@...ingest...`)
   — copy it.
4. In Vercel, add:
   | Name | Value |
   |---|---|
   | `SENTRY_DSN` | the DSN |
   | `NEXT_PUBLIC_SENTRY_DSN` | the same DSN |
5. Redeploy.

## B2. Connect a GitHub repository (Phase 2 feature)

This lets Watchtower watch a real GitHub repo and build its "engineering
graph." Needs a **separate** thing from the login GitHub App you made in
A6 — this one is a **GitHub App**, not an OAuth App.

1. Go to **github.com/settings/apps** → **New GitHub App**.
2. Fill in:
   - **GitHub App name**: something unique, e.g. `watchtower-yourname` —
     **write this down exactly**, it's your `GITHUB_APP_SLUG`.
   - **Homepage URL**: your Vercel address.
   - **Webhook URL**: your Vercel address + `/api/webhooks/github`
   - **Webhook secret**: make up a random string yourself (or run
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     in a terminal and use that) — save it, this is `GITHUB_APP_WEBHOOK_SECRET`.
3. Scroll to **Repository permissions** and set:
   - **Contents**: Read and write
   - **Issues**: Read-only
   - **Pull requests**: Read and write
   - **Checks**: Read-only
4. Under **Subscribe to events**, check: **Issues**, **Pull request**,
   **Check run**.
5. "Where can this GitHub App be installed": choose whichever you prefer
   (Only on this account is simplest for personal use).
6. Click **Create GitHub App**.
7. On the app's settings page, copy the **App ID** near the top — this is
   `GITHUB_APP_ID`.
8. Scroll to **Private keys** → **Generate a private key**. A `.pem` file
   downloads. Open it in Notepad — you'll need its contents in the next
   step.
9. In Vercel, add:
   | Name | Value |
   |---|---|
   | `GITHUB_APP_SLUG` | from step 2 |
   | `GITHUB_APP_ID` | from step 7 |
   | `GITHUB_APP_WEBHOOK_SECRET` | from step 2 |
   | `GITHUB_APP_PRIVATE_KEY` | see below |

   For `GITHUB_APP_PRIVATE_KEY`: open the downloaded `.pem` file, select
   all the text, copy it. In Vercel's value box, paste it exactly as-is —
   Vercel's environment variable editor supports multi-line values, so you
   don't need to do anything special to the line breaks.
10. Redeploy.
11. Log into your live site as admin → **Admin console → Feature flags** →
    turn on `phase2.github_ingestion`.
12. Go to any organization page on your dashboard → **Connect a
    repository** → follow GitHub's install screen → pick a repo.

## B3. Automated backups (Backblaze B2)

1. Go to **backblaze.com/b2** → sign up free (10GB free storage).
2. **Create a Bucket** — name it anything, keep it **Private**.
3. Go to **App Keys** → **Add a New Application Key** → restrict it to the
   bucket you just made → **Create New Key**. Copy the **keyID** and
   **applicationKey** shown (only shown once).
4. On GitHub.com, go to your `watchtower` repository → **Settings →
   Secrets and variables → Actions → New repository secret**. Add each of
   these one at a time:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your real Supabase connection string from A2 |
   | `B2_APPLICATION_KEY_ID` | the keyID from step 3 |
   | `B2_APPLICATION_KEY` | the applicationKey from step 3 |
   | `B2_BUCKET` | your bucket's name |
   | `BACKUP_ENCRYPTION_PASSPHRASE` | make up a long random string, save it somewhere safe forever — you need it to ever restore a backup |
5. On GitHub, go to your repo's **Actions** tab → find **"Nightly backup &
   token cleanup"** → **Run workflow** to test it once manually. It'll also
   now run automatically every night for free.

## B4. AI root-cause analysis (optional, and here's the honest tradeoff)

By default, Watchtower is honest: with no AI configured, it says "not
enough evidence" instead of guessing — and this costs nothing. That's a
completely reasonable way to run it forever.

If you want real AI analysis, the genuinely free way is **Ollama**,
self-hosted — but it needs to run on a computer that's turned on and
reachable, which free web hosts don't really offer for free (they don't
keep a persistent, always-on server without paying). Two realistic options:

- **Run it on your own PC** when you want to test it: install Ollama from
  **ollama.com**, run `ollama pull llama3.1`, then on your PC's terminal
  run `ollama serve`. To let your deployed website reach your PC, use a
  free tunnel tool like **ngrok** (ngrok.com, free tier) — it gives you a
  temporary public address for your local Ollama. Set in Vercel:
  `LLM_PROVIDER=ollama` and `OLLAMA_BASE_URL=` (the ngrok address it gives
  you). This only works while your PC and the tunnel are running — fine
  for trying it out, not for 24/7 production.
- **Skip it entirely.** Leave `LLM_PROVIDER` unset. This is what most
  people should do for a free, always-on deployment.

Either way, also flip **Admin console → Feature flags → `phase3.ai_rca`**
on if you want CI failures to auto-trigger an investigation (manual
"Investigate" clicks work regardless of this flag).

## B5. The second demo service (`apps/api`) — genuinely optional

This is a separate small service that proves a second backend can share
the same login session. **Your website works completely fine without
deploying this.** Only do this if you're curious to see it running:

1. Go to **render.com** → sign up free with GitHub.
2. **New → Web Service** → connect your `watchtower` repo.
3. **Root Directory**: `apps/api`. Render will detect the `Dockerfile`
   automatically.
4. Add environment variables (from `apps/api/.env.example`):
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Supabase string, but starting with `postgresql+asyncpg://` instead of `postgresql://` (just change that one word at the start) |
   | `ENVIRONMENT` | `production` |
   | `CORS_ORIGINS` | your Vercel address |
5. Click **Create Web Service**. Free tier note: it goes to sleep after 15
   minutes of no traffic and takes ~30 seconds to wake back up on the next
   request — normal free-tier behavior, not a bug.

---

# Appendix — every environment variable, in one place

| Variable | Required? | Where you got it |
|---|---|---|
| `DATABASE_URL` | ✅ Required | Supabase (A2) |
| `AUTH_SECRET` | ✅ Required | Generated (A3) |
| `NEXTAUTH_URL` | ✅ Required | Your Vercel address (A4/A5) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ✅ Required | GitHub OAuth App (A6) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ Required | Google Cloud (A7) |
| `RESEND_API_KEY` | ✅ Required | Resend (A8) |
| `EMAIL_FROM` | ✅ Required | Any name + `onboarding@resend.dev` (A9) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry (B1) |
| `GITHUB_APP_SLUG` / `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` / `GITHUB_APP_WEBHOOK_SECRET` | Optional | GitHub App (B2) |
| `LLM_PROVIDER` / `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | Optional | Ollama (B4) |
| `ANTHROPIC_API_KEY` | Optional, and the only one that isn't free if used | Anthropic (skip unless you want this) |

Everything not listed here can stay blank.
