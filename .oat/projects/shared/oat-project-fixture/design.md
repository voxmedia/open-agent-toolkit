---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: oat-project-fixture

> Lightweight quick-mode design. Sections: Overview, Architecture, Component
> Design, Testing Strategy (required); Error Handling folded into components
> where relevant. Spec-driven-only sections intentionally omitted.

## Overview

This project delivers a live workflow smoke capability in three connected
parts. First, a version-controlled **fixture project template**: three phases
with three stable-ID tasks each, where phases 1 and 2 form a declared parallel
group (disjoint write boundaries, e.g. separate fixture log files) and phase 3
is a sequential fan-in phase that depends on both — every task performs a
bounded, deterministic append to a fixture log, so the implementation is
trivial while the orchestration is real. The parallel group deliberately
exercises worktree-based phase execution and its known gotchas: flat
collision-resistant phase branch naming, shared Git metadata writes
(`index.lock`), managed-path write surfaces (`.agents`), scoped writable roots
for commit-capable workers, and post-fan-in reconciliation of
`plan.md`/`implementation.md`/`state.md`. Second, an **opt-in smoke runner**
that copies the fixture into a disposable worktree and executes the normal OAT
lifecycle against real authenticated providers — managed dispatch resolution,
phase reviews, and the final lifecycle gate — while leaving the source
repository and the user's persisted OAT configuration untouched, then produces
an evidence report from launcher-owned dispatch records and gate artifacts.
Third, a **cross-harness orchestration validation pass**: running the smoke
workflow from this worktree on Codex, Cursor, and Claude, recording
per-harness evidence that the native-first orchestration model works (nested
native dispatch where supported), and capturing each harness's sanctioned
topology where it differs.

The design's central commitment is that evidence comes from the three-layer
model: policy resolution, launcher-owned configured invocation, and (optional)
runtime-observed identity. The smoke report asserts on the first two and
records the third as `not-reported` when absent. The dispatch-selection
contract from discovery — ceiling as budget maximum, coordinator
full-information selection from its native catalog, CLI only as a recorded
pre-start selection — is what the fixture is designed to make observable and
assertable.

## Architecture

### System Context

The smoke capability lives in the OAT repo as a version-controlled fixture
plus a documented opt-in runner, positioned as a manual/release-validation
surface (not default CI). It **consumes** the infrastructure the sibling
projects ship — the dispatch resolver and matrix, Dispatch Report V1, gate
review corroboration, `oat-project-implement` orchestration — and asserts on
their observable behavior; it reimplements none of them. The executable under
test is the local binary built from the worktree under test, with an explicit
guard against a stale global `oat` shadowing it (a prior real incident).

**Key Components:**

- **Fixture project template** — a complete quick-mode OAT project
  (state/discovery/plan/implementation artifacts) with three phases × three
  stable-ID tasks (`p01`–`p03`, `pNN-tNN`), `p01`+`p02` declared as a parallel
  group with disjoint write boundaries (separate fixture log files), `p03`
  sequential and dependent on both. Fixture-local dispatch policy declares a
  named ceiling with lower exact candidates beneath it (including a Cursor
  opaque model argument) so ceiling-vs-selection behavior is observable.
- **Smoke runner** — preflight (provider auth/runtime readiness, local-binary
  identity, fail-fast with a clear report; never starts a partial workflow),
  provisioning (copy fixture into a disposable worktree with isolated OAT
  config — the user's persisted config is never touched), execution (drive the
  normal lifecycle on the harness under test), and cleanup (interrupt-safe;
  never deletes unrelated worktrees or artifacts).
- **Evidence collector & report** — gathers launcher-owned dispatch records,
  phase review artifacts, gate artifacts with corroboration fields, fixture
  log contents, and the disposable worktree's git history (branch names,
  commits per task, fan-in merge); emits a per-harness smoke report structured
  on the three-layer provenance model.
- **Per-harness drive protocols** — a thin, documented invocation pattern for
  each of Codex, Cursor, and Claude describing how the root agent is started
  and what topology is expected (nested native where supported; each
  harness's sanctioned topology recorded as part of the evidence, not assumed
  identical).

### Data Flow

Fixture template → disposable worktree (isolated config) → lifecycle
execution (root → phase coordinators; p01/p02 in parallel worktrees → task
workers → deterministic log appends → fan-in merge → p03) → evidence
collection (dispatch records + reviews + gate + logs + git history) → smoke
report → cleanup. Each stage fails closed: preflight failure exits before
provisioning; execution failure still runs evidence collection and cleanup so
partial evidence is preserved.

### Scenario / Entry-Point Model (Hybrid "C")

The fixture is versioned implement-adjacent, and **scenarios** select how much
machinery a run exercises. The fixture ships with **two state presets**:

- **`pre-review` (canonical shipped state):** plan content-complete but
  persisted in the interruption-safe pre-review shape
  (`oat_status: in_progress`, `oat_template: true`, `oat_ready_for: null`,
  plan review row pending). Used by the `plan-review` scenario and the full
  workflow run.
- **`implementation-ready`:** plan marked reviewed/complete
  (`oat_status: complete`, `oat_ready_for: oat-project-implement`, review row
  passed). Used by the implement-only scenario so implementation preflight
  passes without running the review cycle first.

Scenarios:

1. **`plan-review`** — resume `oat-project-quick-start` against the
   `pre-review` preset. The skill's own interruption contract routes into the
   planning workflow at dispatch readiness and runs the real sequence:
   ladder/ceiling resolution preflight, phase-review setup contract, artifact
   review loop with an actually-dispatched reviewer, durable disposition
   recording, then the readiness flip. Asserts: resume discipline (no rewrite
   of the substantive plan — task IDs/parallel groups/content unchanged),
   review machinery (below-ceiling reviewer target on an appropriate runtime,
   corroborated artifact, durable row), and atomic state transitions.
2. **`implement`** — run `oat-project-implement` against the
   `implementation-ready` preset: parallel p01/p02 worktree phases, task
   workers, phase self-reviews, fan-in, p03, final gate.
3. **Full workflow** — `plan-review` followed by `implement` in one run (the
   real lifecycle sequence); cheap runs stop after `plan-review`.

Authoring-phase smoke (live discovery/design/plan generation) is explicitly
out of scope; documented as a possible future variant.

## Component Design

### 1. Fixture project template

- **Purpose:** the deterministic project-under-test.
- **Contents:** a complete quick-mode project artifact set (`state.md`,
  `discovery.md`, minimal `design.md`, `plan.md`, `implementation.md`) plus a
  tiny work surface: three fixture log files (`logs/p01.log`, `logs/p02.log`,
  `logs/p03.log`) giving the parallel phases provably disjoint write sets.
  Every task = one bounded append with a stable, assertable line format
  (task ID + timestamp + worker-declared target).
- **Dispatch policy:** fixture `state.md` declares a named ceiling (e.g.
  `high`) with a sparse matrix override providing lower exact candidates per
  provider — including a Cursor opaque model argument — so evidence can show a
  below-ceiling exact selection.
- **State presets:** canonical shipped state is `pre-review`; an
  `implementation-ready` frontmatter overlay (small patch applied at
  provisioning) flips plan/implementation state. One canonical fixture; no
  duplicated artifact trees to drift.
- **Location:** versioned in-repo (e.g. `tools/smoke/fixture/`), explicitly
  outside `.oat/projects/` so the repo's own project machinery never mistakes
  it for a live project.

### 2. Smoke runner

- **Purpose:** provision, drive, and tear down a smoke run without touching
  user state.
- **Shape:** documented runner script (consistent with the existing
  `tools/verification/` pattern) rather than a new `oat` CLI surface for now;
  promotable to `oat smoke` later if it earns it.
- **Responsibilities:**
  1. **Preflight** — per-provider auth/runtime checks; verify the local built
     binary is the one on PATH (stale-global guard); verify fixture
     integrity; exit with a readiness report; never start a partial workflow.
  2. **Provision** — create disposable worktree, copy fixture into
     `.oat/projects/`, write isolated `config.local`, apply the scenario's
     state preset, write a provisioning manifest (basis for safe cleanup).
  3. **Drive** — per-harness protocol (below); prints the canned root prompt
     or invokes the headless root where reliable.
  4. **Collect** — always runs, even after failure/interrupt.
  5. **Cleanup** — removes only what the provisioning manifest records;
     interrupt-safe by construction.

### 3. Evidence collector & report

- **Inputs:** Dispatch Report V1 output / launcher-owned dispatch records,
  `implementation.md` orchestration-run entries, review artifact frontmatter
  (gate target, run ID, corroboration fields), fixture logs, disposable
  worktree git history (flat phase branch names, per-task commits, fan-in
  merge).
- **Output:** per-run report (markdown + JSON) with a machine-checkable
  assertion table: phases/tasks dispatched; exact selected target per launch
  (below ceiling); parallel isolation proven (disjoint writes, separate
  worktrees); fan-in reconciliation completed; review/gate rows durable and
  corroborated; runtime identity recorded or `not-reported`. Reports land
  outside the disposable worktree so they survive cleanup.

### 4. Per-harness drive protocols

Each protocol is a short doc + canned root prompt; the runner prints the
right one at drive time. **Four harness targets** (Cursor counts twice —
IDE and CLI verifiably behave differently):

- **Codex:** native `spawn_agent` topology (root → coordinator → exact
  materialized workers), `agents.max_depth >= 2`, scoped writable roots per
  the max-depth learnings; headless root invocation acceptable.
- **Claude:** native Task subagents; whether coordinator→worker nesting is
  supported is an open question the first run answers and records — the
  protocol documents the sanctioned topology once observed.
- **Cursor IDE:** root session started manually with a canned prompt;
  coordinator applies the full-information selection contract against its
  native catalog; any CLI task dispatch must appear in evidence as a recorded
  pre-start selection.
- **Cursor CLI (`cursor-agent`):** same fixture driven through the headless
  CLI flavor; known open question whether Task events are observable at all
  in this flavor (prior structured probes saw none, even for controls) — the
  smoke run either produces the first positive evidence or documents the
  flavor's actual sanctioned topology.

### 5. Orchestration contract updates (cross-harness native-first selection)

- **Purpose:** land the discovery Decision #4 dispatch-selection contract in
  the workflow skills themselves — the piece neither sibling project ships.
  PR #136 (merged) provides matrix/report infrastructure; PR #137 provides the
  Codex native depth-2 topology and fallback discipline. What remains, and
  what this component owns:
  - **Coordinator full-information selection** in the phase-coordination
    contract: intersect configured ladder ∩ project ceiling ∩ the harness's
    native catalog (read from the coordinator's own tool spec at dispatch
    time); judge per task; substitute upward, never downward; task workers
    never silently inherit the root model.
  - **Recorded pre-start CLI selection:** provider-CLI task dispatch is a
    deliberate pre-start choice recorded with reason (e.g.
    `native-catalog-unsatisfying`) and candidates considered — the dispatch
    record fields the smoke evidence asserts on (they must exist to be
    assertable).
  - **Cursor/Claude native-first topology guidance** in the implementation
    and phase-coordination skills (Codex-specific guidance ships in #137;
    the other harnesses need their sanctioned native topology stated).
- **Review dispatch by phase (discovery Decision #11):** the invariant is
  "reviewer at or above ceiling." Planning-phase artifact self-reviews inherit
  the parent model (planning root already at/above ceiling); implementation-
  phase self-reviews resolve via the dispatch ceiling and dispatch at the
  ceiling's final candidate (tasks may run below ceiling; reviews must not
  inherit a below-ceiling worker model); gates pin cross-family CLI exec
  targets. The plan-writing reviewer contract's managed-pinning requirement
  for planning-phase self-reviews is corrected as part of this component.
- **Surfaces:** `.agents/skills/oat-project-implement/SKILL.md`,
  `.agents/skills/oat-project-plan-writing/SKILL.md`,
  `.agents/agents/oat-phase-implementer.md` (+ dispatch-language overlap in
  review-provide skills if drift checks flag it), skill contract tests,
  canonical skill version bumps per repo policy.
- **Constraint:** reconcile at contract level against PR #137's language after
  it merges (both touch the same skills); do not fork a third dialect of the
  dispatch contract.

### 6. Documentation & knowledge capture

- **OAT docs deliverable:** an orchestration/subagents/programmatic-execution
  documentation section in `apps/oat-docs`, covering the native-first
  dispatch model, coordinator/worker topology per harness, the
  dispatch-selection contract, the three-layer evidence model, and the smoke
  workflow — with mermaid diagrams (topology, selection flow, evidence
  layers, smoke data flow).
- **Vault capture:** start-of-project pass done 2026-07-11 (per-harness
  dossiers under `04 - Resources/Programmatic Agent Execution/Harnesses/`,
  Programmatic Cursor change-log entry). Closing pass at project end mirrors
  selected mermaid diagrams and smoke-evidence learnings into the Vault.

### Error handling (folded)

Preflight fails closed before provisioning; the provisioning manifest makes
cleanup safe after interrupts; evidence collection runs unconditionally so
failed runs still produce diagnosable reports.

## Testing Strategy

### Level 1 — Unit/static (no providers, runs in CI)

- **Fixture integrity:** plan format invariants (stable `pNN-tNN` IDs,
  parallel-group declaration, reviews table); preset overlays apply cleanly
  and are inverses of each other; fixture never drifts from the plan-writing
  canonical format (contract test against the plan-format validators).
- **Runner logic:** preflight checks, provisioning-manifest completeness,
  cleanup idempotence — via a dry-run mode with providers mocked.
- **Evidence collector:** assertion table computed correctly from golden
  inputs (recorded dispatch records, review artifacts with known
  corroboration fields, git histories with known shapes).

### Level 2 — Dry-run smoke (no providers, runnable locally anytime)

Full runner pass with a no-op drive step: provision → preset → collect
(empty evidence) → cleanup. Asserts the isolation guarantees directly: the
user's persisted OAT config is byte-identical before/after, the source repo
is untouched, and the disposable worktree is fully removed. Interrupt
control: kill the runner mid-provision and mid-drive; verify cleanup from
the manifest leaves no orphans and never touches unrelated worktrees.

### Level 3 — Live smoke (the deliverable itself, opt-in)

Per harness target (Codex, Claude, Cursor IDE, Cursor CLI): `plan-review` and
`implement` scenarios. Full-workflow runs (plan-review → implement in one
pass) are required on Codex and Cursor IDE; they are explicitly deferred for
Claude and Cursor CLI to bound live-provider cost, with the deferral recorded
in the cross-harness evidence summary. Two negative controls: preflight against a deliberately unavailable target (must
report and exit without provisioning), and — where cheap — one observed
reviewer/worker failure path confirming no-fallback-after-acceptance holds.
Evidence reports are committed as the project's acceptance artifacts (these
also record the per-harness topology answers, e.g. Claude nesting).

### Level 4 — Docs

`pnpm build:docs` green, mermaid diagrams render, generated docs index
regenerated through normal tooling; `pnpm release:validate` if shipped
surfaces change.

No requirement-to-test mapping (quick mode); the Level 3 assertion table in
the evidence report is the acceptance surface for the orchestration
requirements.
