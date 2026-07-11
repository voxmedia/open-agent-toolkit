---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_generated: true
oat_summary_last_task: p03-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Codex Subagent Maximum Depth

## Overview

OAT-materialized Codex phase coordinators could not reliably use native nested
task workers because Codex defaults to a subagent depth of one. The project
established the configuration, diagnostics, dispatch contracts, documentation,
and release assets needed for a coordinator at depth one to launch exact task
workers at depth two.

## What Was Implemented

- Added a shared Codex configuration merge that writes or raises
  `agents.max_depth` to `2`, preserves equal or higher values and unrelated
  configuration, and remains idempotent.
- Applied the depth policy to project- and user-scoped sync plus direct Codex
  materialization, including inherited user-depth handling and zero-role partial
  sync behavior.
- Added doctor and managed dispatch-preflight diagnostics with executable,
  scope-correct remediation.
- Updated implementation and review orchestration contracts to attempt exact
  native `agent_type` first, retain launcher-owned configured invocation, and
  permit a pinned child only after explicit pre-start role-selection rejection.
- Integrated those contracts with Dispatch Report V1, keeping configured
  invocation separate from runtime producer identity.
- Regenerated all 14 Codex phase-implementer roles and project Codex
  configuration, updated provider/workflow documentation, and released the five
  public packages in lockstep at `0.1.51`.

## Key Decisions

- **Managed Codex roles require depth two.** OAT enforces a minimum rather than
  an exact value so existing higher project or inherited user limits are never
  reduced.
- **Native exact role dispatch precedes fallback.** Missing telemetry or
  self-report is not selection failure; fallback is valid only after the native
  launcher explicitly rejects the requested role before startup.
- **Configured invocation is separate from runtime identity.** Resolver output
  and the constructed launcher payload own selected target/model/effort, while
  runtime producer identity remains independently observed.

## Design Deltas

- PR #136 introduced Dispatch Report V1 during implementation. Semantic rebase
  resolution preserved its producer-identity separation while retaining this
  project's native-first and explicit-rejection-only fallback rules.
- Phase reviews added two p01 and five p02 repair tasks for executable
  remediation, zero-role no-op behavior, and distributed dispatch-contract
  consistency.

## Notable Challenges

- Native workers initially lacked write access to shared Git metadata and
  canonical `.agents` paths. Narrow writable roots resolved both blockers
  without granting `danger-full-access`.
- Concurrent asset bundling and docs builds raced on shared generated
  directories; serial execution removed the transient failures.
- Release cleanup left stale TypeScript incremental metadata after removing
  package outputs. Forced non-incremental dependency-chain builds restored the
  outputs before the complete validation suite passed.

## Tradeoffs Made

- Agent self-report is optional and non-authoritative. This avoids blocking
  native workers on telemetry they cannot provide while preserving stronger
  launcher-owned evidence.
- Accepted children returning `BLOCKED` or timing out remain outcomes on the
  accepted native route; they do not silently switch execution provenance by
  triggering fallback.

## Integration Notes

- Codex project configuration now contains `agents.max_depth = 2`; user-scoped
  materialization writes only the user configuration and project-scoped
  materialization writes only the project configuration.
- Validation passed with 424 focused tests, 2,656 CLI tests, all workspace
  package tests, lint, formatting, type checking, workspace and 55-page docs
  builds, and release validation for all five public packages.
