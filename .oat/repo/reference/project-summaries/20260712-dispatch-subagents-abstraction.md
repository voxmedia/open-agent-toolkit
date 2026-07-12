---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-12
oat_generated: true
oat_summary_last_task: p02-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Dispatch Subagent Abstraction

## Overview

OAT workflows needed a reusable way to delegate bounded work without forcing
analytical callers to inherit project phases, task IDs, gates, commits, and
worktree policy. This project split provider-neutral dispatch mechanics from
project lifecycle adaptation so repository analysis and lifecycle execution
can share one auditable dispatch substrate while retaining distinct owners.

## What Was Implemented

- Added `oat-dispatch-subagents`, an internal utility-pack engine for bounded
  request validation, capability and authorization checks, live catalog
  evidence, model/effort/role/route selection, launch acceptance, continuation,
  recovery, and neutral dispatch records.
- Added provider references for Claude, Codex, and Cursor plus a generic request,
  record, and homogeneous reconnaissance-wave schema. The engine resolves the
  provider first and loads exactly one provider reference.
- Added `oat-project-dispatch-subagents`, an internal workflows-pack adapter
  that resolves project, phase/task, gate, write-boundary, commit, and worktree
  context before invoking the general engine.
- Registered and bundled both skills, synchronized Claude and Cursor provider
  views, and applied the required lockstep public-package bump to `0.1.53`.
- Added preliminary OAT metadata and progress conventions to the imported
  `oat-repo-improve` skill so its later redesign can compose with the generic
  engine. The substantive improve redesign was intentionally not performed in
  this prerequisite project.
- Documented the engine/adapter ownership boundary, incremental lifecycle
  adoption posture, and cross-pack installation requirement in the OAT docs
  and repository reference layer.

## Key Decisions

- **Generic dispatch remains separate from project lifecycle policy.** The
  general engine never reads active project state; project workflows translate
  lifecycle context through the adapter, while callers retain decomposition,
  synthesis, user dialogue, artifact writes, and verification of load-bearing
  child claims.
- **Provider mechanics remain load-one-only references.** The active provider
  is resolved before loading Claude, Codex, or Cursor mechanics so volatile
  catalogs and harness-specific controls are not merged into a false universal
  policy.
- **Accepted launches are not silently replaced.** Launch acceptance, child
  outcome, and runtime confirmation remain separate evidence. Automatic route
  replacement is allowed only after a recorded pre-start rejection, never
  after an accepted timeout, interruption, refusal, or task failure.

## Design Deltas

- The project used Quick discovery and lightweight design, but the user
  explicitly skipped upfront plan-driven execution and
  `oat-project-implement`. The plan and implementation artifacts were
  reconciled retrospectively after direct skill authoring and Claude review.
- Provider references use `provider-claude.md`, `provider-codex.md`, and
  `provider-cursor.md` rather than magic-looking harness instruction names.
- The workflows-pack adapter gained a fail-closed missing-engine check because
  utility and workflows packs can be installed independently.

## Tradeoffs Made

- The split introduces a two-skill loading chain, but prevents every analytical
  or lifecycle caller from maintaining its own provider catalog, selection,
  and recovery contract.
- Homogeneous read-only reconnaissance lanes may share one wave record to keep
  economical fan-out practical; any differing route, role, authority, model,
  effort, deadline, or fallback requires a separate record.
- Existing lifecycle skills may adopt the new adapter incrementally. Their
  reviewed process contracts remain authoritative until explicit wiring lands,
  avoiding documentation that overstates current integration.

## Integration Notes

- Install the utility pack for `oat-dispatch-subagents` and the workflows pack
  for `oat-project-dispatch-subagents`. The adapter blocks with installation
  guidance if the engine is absent.
- Calling skills own lane decomposition and result interpretation. The engine
  returns dispatch evidence and child output but never writes caller artifacts
  or makes user decisions.
- Fixture provenance was rechecked before handoff: the source skill hash was
  unchanged from intake, so the fixture can review and adopt implementation
  commit `bb3a942a` without reconciling source drift.

## Follow-up Items

- Perform the substantive `oat-repo-improve` redesign and compose its audit
  reconnaissance with the general dispatch engine.
- Review and adopt the abstraction in the fixture worktree.
- Evaluate later consumers such as docs analysis, deep research, and reviewer
  reconnaissance after the contracts stabilize.
- Consider deterministic validation for the request/record schema and
  installer-level handling of the workflows-to-utility pack dependency if
  prose checks prove insufficient.
