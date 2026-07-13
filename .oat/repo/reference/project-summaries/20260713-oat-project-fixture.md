---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: true
oat_summary_last_task: p06-t09
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: oat-project-fixture

## Overview

This project created a safe acceptance surface for cross-cutting OAT workflow
changes after dispatch, gate-provenance, provider-model, and orchestration work
interacted in ways that unit tests and real-project dogfooding did not expose
cheaply. Originating from `BL-260711-add-live-workflow-smoke`, it now provides a
disposable fixture, an opt-in live-provider runner, durable evidence, and public
operator guidance.

## What Was Implemented

- A version-controlled quick-mode fixture with three phases, parallel
  `p01`/`p02` worktrees, `p03` fan-in, five deterministic task commits, and
  implementation-ready and pre-review presets.
- A smoke runner with local-build freshness checks, provider and independent-gate
  readiness preflight, isolated provisioning, safe cleanup, failure recovery,
  terminal dispatch publication, and approval-aware closeout isolation.
- A collector, assertion engine, and atomic report publisher covering Git
  history, task outcomes, phase reviews, root-owned dispatch, gate evidence,
  topology, and formatter-stable report digests.
- Root-owned phase-agent execution: one phase implementer directly executes and
  commits its phase tasks; the root independently dispatches the reviewer and
  returns bounded fixes to the original phase scope. Specialized nested work is
  optional and must have isolated write ownership.
- Progressive-disclosure dispatch contracts shared across Codex, Claude, and
  Cursor, with project lifecycle policy separated from provider-neutral
  selection and one provider-mechanics reference loaded per launch boundary.
- Automated, operator, and negative-control protocols for Codex, Claude, Cursor
  IDE, and Cursor CLI, plus a retained canonical Codex implementation packet.
- Public orchestration, review, evidence-layer, programmatic-execution, and smoke
  runbook documentation, along with project and Vault knowledge capture.
- Root verification now includes direct smoke lint/lint-fix, formatting, and all
  123 smoke tests. All five public packages shipped lockstep at `0.1.59`.

The final retained Codex implementation report passes 10/10 assertions. Both
workspace builds, lint, formatting, type checking, all package tests, docs
generation, canonical report checks, and `pnpm release:validate` passed.

## Key Decisions

- **Restore phase-agent implementation topology.** Mandatory
  coordinator-to-task-worker nesting was functionally valid but dominated the
  trivial fixture work. Direct phase implementation restores the proven default
  while preserving optional, evidenced nesting.
- **Configured invocation is separate from runtime identity.** Launcher-selected
  target, model, effort, and source remain immutable configured evidence;
  runtime identity stays `not-reported` unless independently observed.
- **Generic dispatch remains separate from project lifecycle policy.**
  Provider-neutral selection, launch, recovery, and evidence live in the generic
  engine; the project adapter adds phase, task, gate, commit, and worktree
  semantics.
- **Provider mechanics remain load-one-only references.** The dispatcher resolves
  the active provider first and loads only that provider's volatile catalog and
  native-control guidance.

## Design Deltas

- The original mandatory root → coordinator → task-worker design was replaced by
  root → phase implementer plus root → reviewer. The final five-task run took
  26m21s and seven launches, versus 38m22s and fourteen launches for the
  preserved passing three-tier baseline.
- The live ship gate narrowed from a full cross-provider matrix to one revised
  automated Codex implementation run. Claude, Cursor IDE, Cursor CLI,
  automated-versus-interactive comparisons, and cross-harness synthesis moved
  to the documented post-ship operator campaign.
- The fixture's task count was reduced while retaining the three-phase parallel
  isolation and fan-in behavior that exercises the orchestration contract.

## Notable Challenges

- Exact model catalogs differ between native subagent APIs and provider CLIs.
  The workflow now distinguishes explicit pre-start selector rejection from an
  accepted launch, which is terminal even when it returns `BLOCKED`.
- Fixed review/gate timeouts killed healthy work, and long-running or
  disconnected workers sometimes survived their controlling session. Durable
  run ownership, invalid-run aborts, terminal publication, and cleanup guards
  prevented those runs from replacing canonical evidence.
- Formatting initially invalidated report digests. Publication now formats the
  staged evidence before hashing and has tracked-packet regression coverage.
- The final review exposed missing review-artifact history binding, failed-run
  recovery acceptance, cross-runtime preflight, docs drift, and root lint
  enrollment. Five bounded fixes closed all findings, and an exact-target
  re-review passed with 0C/0I/0M/0m.

## Tradeoffs Made

- The retained schema-v1 live packet stays valid and explicitly cannot prove
  direct-root ownership; all new records require schema v2. A fresh schema-v2
  live packet was deferred rather than spending another provider run before
  ship.
- Smoke tests are enrolled in normal lint, formatting, and test commands, but
  authenticated provider execution is not default CI.
- Provider-specific guidance remains separate despite the extra reference hop;
  this prevents volatile harness mechanics from becoming false universal
  policy.

## Integration Notes

- Codex requires depth 1 for the default root-to-phase topology; depth 2 is only
  required when optional nested dispatch is actually selected.
- Canonical reports live under `tools/smoke/reports/`; failed-run diagnostics are
  retained under ignored recovery roots and never published as acceptance
  packets.
- Use `apps/oat-docs/docs/contributing/smoke-testing.md` for operator runs and
  update the executable contract tests whenever fixture cardinality or topology
  changes.
- The fixture-2 documentation patch was already incorporated as patch-equivalent
  commit `2441b65d`; the current branch contains later topology corrections.

## Follow-up Items

- Run the post-ship Claude, Cursor IDE, Cursor CLI, cross-harness, remaining
  negative-control, and automated-versus-interactive operator matrix; refresh the
  live packet to schema v2 during that campaign.
- `BL-260711-add-activity-aware-gate`: replace fixed review timeouts with
  activity-aware liveness and artifact-aware recovery.
- `BL-260712-trim-dispatch-and-dry-run`: reduce the largest implementation
  reference and isolate dry-run-only context.
- `BL-260712-per-project-override`: allow a project to disable configured external
  gates without mutating shared user configuration.
- `BL-260711-add-root-owned-dispatch-broker`: retain as a possible exact-launch
  substrate for specialized nested work.
- Add journal completion timestamps and persisted gate-liveness elapsed values
  before the next orchestration-cost comparison.
- Remove the `oat-project-fixture-2` worktree and branch after the final PR merges.
