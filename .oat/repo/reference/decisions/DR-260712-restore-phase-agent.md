---
id: DR-260712-restore-phase-agent
title: Restore phase-agent implementation topology
date: 2026-07-12
status: accepted
legacy_id: null
---

# Restore phase-agent implementation topology

## Context

The mandatory coordinator-to-task-worker topology introduced in PR #132
multiplied wall-clock time far beyond useful work in a measured live smoke run,
while the phase-agent model it replaced had worked reliably for months. The
five trivial task edits took seconds, but the passing end-to-end run took
38m22s (`2,302,342 ms`).

## Decision

Restore the root → phase-agent implementation topology as the default,
using `oat-phase-implementer` v1.0.3 (last present at commit `3c244937`,
2026-07-09, before PR #132 introduced the coordinator/worker dual mode) as
the restoration baseline text:

- The root orchestrator dispatches one phase agent per phase. The phase
  agent implements all phase tasks directly in its own context — reads
  artifacts once, executes tasks sequentially, commits per task, and
  self-reviews inline between tasks (no dispatch or records needed for
  inline self-checks).
- The root dispatches the independent phase reviewer (`oat-reviewer`) at
  the resolved review ceiling and routes Critical/Important findings back
  to the same phase agent in fix mode. Producer/reviewer separation lives
  at the root, as it did before PR #132.
- Task-level sub-dispatch becomes explicit opt-in at the phase agent's
  discretion (reconnaissance or genuinely specialized tasks), never a
  requirement. Every opt-in launch routes through the
  `oat-project-dispatch-subagents` → `oat-dispatch-subagents` chain and
  produces a launcher-owned dispatch record: discretion over topology,
  none over evidence.

The restoration keeps every substrate improvement made since v1.0.3:
dispatch ladders/ceilings with full-information selection, the two-skill
dispatch engine/adapter with stable selection reasons and
`invalid-run-abort`, gate execution hardening (provenance pinning,
liveness telemetry, fail-closed independence), the three-layer evidence
model, repository-defined worktree bootstrap, parallel phase-worktree
groups with base-mismatch verification, and the smoke harness plus
deterministic contract tier.

## Consequences

- Wall-clock cost per phase drops from 1 coordinator + N workers + 1
  reviewer (plus N dispatch round-trips and N repo re-orientations) to
  1 phase agent + 1 reviewer. Measured evidence: the complete 2026-07-12 live
  Codex smoke run passed all nine assertions in 38m22s. Its task edits took
  seconds; nested-agent capacity, policy resolution, evidence recording,
  reviews, the final gate, and bookkeeping dominated elapsed time.
- Per-task model tiering is no longer the default; model control becomes
  phase-grained. Task-grained control remains available via opt-in
  dispatch. The at-ceiling phase reviewer remains the correctness net.
- Per-task launcher-owned dispatch records are replaced by one phase-level
  record plus one verified commit per task; the phase report becomes
  primary evidence rather than a summary derived from per-task records.
- Contract surfaces to rewrite (recon-verified blast radius, no CLI
  changes needed): `oat-phase-implementer.md` (restore v1.0.3 text plus
  enumerated substrate additions), `oat-project-implement`
  `references/phase-execution.md` root loop, the
  `oat-project-dispatch-subagents` lifecycle-role table (phase-implementer
  role, worker class at phase scope), the smoke `implement` assertion
  profile (one accepted launch per phase instead of per task), fixture
  protocols, and contract tests.
- Docs authored for the coordinator topology (`orchestration-model.md`,
  `review-flavors.md` on the docs branch) require a revision pass before
  merge.
- Execution: this restoration ships with the active `oat-project-fixture`
  project on its branch — it is in-plan work (recovery-task pattern), not
  deferred backlog. Live smoke evidence for the `implement` scenario must
  be recollected against the restored topology before release validation.
