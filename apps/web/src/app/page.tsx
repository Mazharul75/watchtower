import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AmbientBackground } from "@/components/site/background";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/alert";

const FEATURES = [
  {
    title: "Auto-built engineering graph",
    description:
      "Watchtower reads your repo's real issues, PRs, commits and CI runs and builds a living requirement → code → test graph automatically. No manual intake, no spreadsheets.",
  },
  {
    title: "Cited root-cause analysis",
    description:
      "When CI fails or a bug is filed, Watchtower investigates with hybrid retrieval over your own history and cites the exact evidence for every claim — or explicitly abstains when it isn't sure.",
  },
  {
    title: "Incident memory that compounds",
    description:
      "Every resolved incident becomes a permanent, searchable record tied to the code it touched, so the next similar bug surfaces its predecessor instead of starting from zero.",
  },
  {
    title: "Human approval, always",
    description:
      "Watchtower never merges anything on its own. A suggested fix opens as a draft pull request; a maintainer reviews and approves it like any other PR.",
  },
  {
    title: "Zero required cost",
    description:
      "Runs on free-tier infrastructure end to end, with a self-hosted local model by default — bring your own paid API key only if you choose to.",
  },
  {
    title: "Built like production software",
    description:
      "Argon2id password hashing, server-enforced roles, audit-logged admin actions, and a public benchmark instead of marketing claims.",
  },
];

const STEPS = [
  { step: "01", title: "Create your account", description: "Sign up with email, GitHub, or Google. Verify your email and you're in." },
  { step: "02", title: "Create an organization", description: "Organizations group your repos and teammates, with owner/admin/member/viewer roles enforced on every request." },
  { step: "03", title: "Connect a repository", description: "Install the Watchtower GitHub App and watch your engineering graph populate automatically from real issues, PRs, and CI history." },
  { step: "04", title: "Review and approve", description: "Coming in Phase 3: every AI-suggested fix arrives as a draft PR you approve — never an autonomous merge." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <Navbar />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex">
            <Badge tone="info">Phase 2 · GitHub Ingestion</Badge>
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            An AI engineering memory
            <br />
            <span className="text-brand-gradient">for your GitHub repos.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-[var(--color-foreground-muted)] md:text-lg">
            Watchtower finds the root cause, cites the evidence, remembers every incident, and waits for your
            approval before touching anything — built free, end to end.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href="/signup" size="lg">Get started free</ButtonLink>
            <ButtonLink href="/login" variant="outline" size="lg">Log in</ButtonLink>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Everything a maintainer actually needs</h2>
            <p className="mt-3 text-[var(--color-foreground-muted)]">
              No confidence theatre. Every claim Watchtower makes is grounded in evidence you can click through to,
              or it says nothing at all.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-6">
                <h3 className="font-semibold text-[var(--color-foreground)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">{f.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-3 text-[var(--color-foreground-muted)]">
              Built in four phases. Phase 1 — the platform you can use right now — is complete.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="relative">
                <span className="text-brand-gradient text-3xl font-bold">{s.step}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-4xl px-6 pb-28">
          <Card className="p-10 text-center">
            <h2 className="text-2xl font-semibold">Free, on purpose</h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--color-foreground-muted)]">
              Watchtower runs on free-tier infrastructure by design — self-hosted local models by default, your own
              API key only if you want a hosted one. No credit card to sign up.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/signup" size="lg">Create your free account</ButtonLink>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
