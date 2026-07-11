---
oat_status: in_progress
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

_(pending)_

## Testing Strategy

_(pending)_
