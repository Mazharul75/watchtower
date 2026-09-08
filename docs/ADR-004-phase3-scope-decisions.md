# ADR-004: Phase 3 scope decisions — pipeline location, LLM provider, and what "draft PR" means

## Status
Accepted — Phase 3.

## Context
Three real design decisions came up building Phase 3 that the roadmap left
implementation-defined, plus one honest capability limit worth stating
plainly rather than overselling.

### 1. Investigation pipeline lives in `apps/web` (TypeScript), not `apps/api` (Python/LangGraph)
The roadmap's Phase 3 language ("LangGraph investigation state machine")
describes the pattern used by the reference repos this project's idea was
based on, not a hard requirement to use the LangGraph library specifically.
All of Phase 2's graph/retrieval code already lives in `apps/web` against
the Prisma-managed schema (see ADR-001). Re-implementing the reasoning
pipeline in `apps/api`/Python would mean either duplicating the retrieval
layer in SQLAlchemy or having Python call back into the Node service —
either way, real added complexity for zero functional benefit at this
scale. `lib/investigation.ts` implements the same *shape* LangGraph
encodes — an explicit sequence of named steps with a typed state object
passed between them (`detect → retrieve → hypothesize → verify → propose`)
— as a plain async pipeline. If Phase 3 volume or step complexity ever
justifies a real graph-execution engine, LangGraph's JS port
(`@langchain/langgraph`) is the natural next step, in the same language,
with no cross-service rewrite.

### 2. LLM provider is pluggable; local Ollama is the default, "none" is a real, honest state
`lib/llm/` defines an `LLMProvider` interface with three implementations:
`ollama` (calls a local Ollama server's HTTP API — free, no account, no
API key), `anthropic` (optional, user-supplied key), and `none` (always
abstains). Whichever is selected, an investigation whose evidence is thin
or whose model output fails citation verification lands in `ABSTAINED` —
matching the roadmap's "abstention is a first-class state" requirement.
Ollama could not be installed in the sandbox this was built in (no GUI,
large binary download); the `ollama` provider's HTTP-calling code is
real and correct against Ollama's documented API, but was verified in
this session only via a dependency-injected mock provider standing in for
a live model — the same limitation Phase 1/2 had with GitHub/Google OAuth
and the GitHub App: code is correct and unit-tested, live verification is
yours to do once you have Ollama (or an API key) configured.

### 3. "Draft PR" means an incident report, not generated code
Approving a fix proposal opens a real draft pull request via the GitHub
App's installation token — but its content is a Markdown incident report
(hypothesis, cited evidence with links, proposed approach) committed as a
new file on a new branch, **not an automatically generated code diff**.
Generating a working code fix would require a code-editing-capable LLM
call against real file contents and there is no honest way to fake that
with a local deterministic embedding function standing in for an LLM (see
ADR-003). This is still exactly the roadmap's non-negotiable structural
guarantee — no code path reaches GitHub without a human-approved row in
the database first — just scoped to what can honestly be delivered without
a real LLM in the loop. Swapping in a real code-generating model later
only changes what `openDraftPR()` commits to the branch; the approval gate
and audit trail around it are already the real thing.

## Consequences
- The pipeline, citation verification, abstention logic, and approval gate
  are all genuinely implemented and tested end-to-end (with a mock LLM
  provider standing in for a live model).
- The actual quality of a *hypothesis* — as opposed to the correctness of
  the pipeline that produces and verifies it — depends entirely on which
  LLM you configure. With `none` configured (the zero-setup default),
  Watchtower is honest about that: every incident is `ABSTAINED`, never a
  fabricated guess.
