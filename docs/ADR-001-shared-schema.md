# ADR-001: Prisma owns migrations; FastAPI mirrors the schema

## Status
Accepted — Phase 1.

## Context
Watchtower's Phase 1 stack has two backend services sharing one Postgres
database: `apps/web` (Next.js + Auth.js, using Prisma) and `apps/api`
(FastAPI, using SQLAlchemy for future Phase 2/3 endpoints). Both need to
read the same `User`, `Session`, `Organization`, `OrganizationMember`, and
`AuditLog` tables — in particular, `apps/api` must be able to validate the
exact same Auth.js database-session cookie that `apps/web` issues, with no
shared secret beyond the Postgres connection itself.

Running two independent migration tools (Prisma migrations and Alembic)
against the same tables is a well-known source of drift: either tool can
apply a change the other doesn't know about, and a review of "did the schema
change" now requires checking two histories instead of one.

## Decision
**Prisma is the single source of truth for schema and migrations.**
`apps/web/prisma/schema.prisma` and its `prisma/migrations/` directory are
the only place table structure is defined and evolved. `apps/api/app/models.py`
declares SQLAlchemy models that **mirror** these tables exactly (same table
names — Prisma does not snake_case by default, so SQLAlchemy's
`__tablename__` values are the same PascalCase Prisma uses) but apps/api
**never runs a migration** and never creates a table Prisma doesn't already
own.

When apps/api needs new tables of its own (Phase 2's `graph_nodes`,
`graph_edges`, `webhook_events`, etc.), those will be added to the *same*
Prisma schema file and migrated the same way — not via a second, independent
Alembic history — for exactly the same reason.

## Consequences
- **One migration history to review, one place schema changes are made.**
- FastAPI's models must be kept in sync with schema.prisma by hand. This is
  a real maintenance cost, mitigated by keeping the mirrored subset small
  (only what apps/api actually queries) and by this ADR flagging the rule
  explicitly in both files' docstrings.
- ID generation: Prisma's `@default(cuid())` runs client-side in the Prisma
  Client library, not as a database default — so if/when apps/api needs to
  *insert* a User/Organization row itself, it cannot rely on the database to
  generate an ID. In Phase 1, apps/api never writes to these shared tables
  (it's read/query-only, via the session-cookie lookup and RBAC checks), so
  this hasn't come up. Phase 2's own new tables (owned by apps/api) will use
  a Python-generated UUID instead of cuid, sidestepping the issue entirely.
- Cross-service session auth: `apps/api/app/deps/auth.py` reads the
  `authjs.session-token` / `__Secure-authjs.session-token` cookie directly
  and queries the `Session` table via SQLAlchemy — no JWT, no shared secret,
  because both services ultimately trust the same Postgres row.
