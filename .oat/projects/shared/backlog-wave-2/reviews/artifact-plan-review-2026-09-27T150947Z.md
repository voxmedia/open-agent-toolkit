---
oat_generated: true
oat_generated_at: 2026-09-27T15:09:47Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/backlog-wave-2
oat_gate_run_id: 8f69f414-ff48-4fc6-b22a-64dca2027e62
oat_gate_target: codex-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-6-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-09-27T15:09:47Z
**Scope:** Quick-mode implementation plan against discovery and source backlog criteria
**Files reviewed:** 2 core artifacts, 12 source backlog items, 1 decision record, and relevant instruction-sync source
**Commits:** Not applicable (artifact review)
**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-sol-high`

## Summary

The five-phase plan maps the approved wave to bounded tasks and concrete verification. Two gaps in the no-shim migration need resolution before implementation: a changed CLAUDE.md could be deleted after the initial shape check, and the plan leaves warning coverage for excluded paths optional despite the accepted criterion requiring it. One task boundary also exposes `none` before that value has working behavior.

Findings by severity: 0 critical, 2 high, 1 medium, 0 low

## Review Scope

- Workflow mode: quick; project phase: plan, in progress.
- Artifact plan advisory: no Dispatch Profile is present; omitted ceiling rows are allowed.
- Evidence sources: `plan.md`, `discovery.md`, all twelve selected backlog items, `DR-260927-claude-md-shims-are-opt.md`, and the existing instruction scanner and sync apply path.

## Findings

### Critical

None

### High

- **Recheck managed shape when removing a CLAUDE.md** (`.oat/projects/shared/backlog-wave-2/plan.md:582`)
  - Issue: p02-t02 classifies exact managed shapes and plans removal, but its implementation and negative controls do not cover a CLAUDE.md changed between scanning and deletion. The current apply path removes a planned target directly (`packages/cli/src/commands/instructions/sync/sync.ts:270`). A user or concurrent process can replace the shim with hand-written content after classification, which would violate the accepted preservation requirement and delete that content.
  - Fix: Require removal to fail closed when the target's identity or exact managed content has changed at apply time. Add a test that changes a planned shim to hand-written content before removal and proves the changed file remains byte-identical; cover symlink replacement as well.
  - Requirement: `BL-260927-make-claude-md-shims-opt` acceptance criterion 3; `DR-260927-claude-md-shims-are-opt`.

- **Make leftover warnings cover excluded and documentation paths** (`.oat/projects/shared/backlog-wave-2/plan.md:639`)
  - Issue: p02-t03 leaves coverage of excluded and documentation trees to a commit-body choice, while the accepted criterion requires a warning for every remaining CLAUDE.md, `.claude/CLAUDE.md`, and `CLAUDE.local.md` in the repository. p02-t02 intentionally leaves shims in excluded and documentation trees, and the current scanner skips excluded directories (`packages/cli/src/commands/instructions/instructions.utils.ts:472`); reusing that scanner alone would silently miss them.
  - Fix: Make repository-wide, read-only detection of remaining Claude instruction files mandatory for sync, JSON output, validate, and doctor, independent of the mutation exclusions. Add an excluded-directory and documentation-root case at those public command boundaries.
  - Requirement: `BL-260927-make-claude-md-shims-opt` acceptance criterion 4.

### Medium

- **Keep the first strategy commit behaviorally coherent** (`.oat/projects/shared/backlog-wave-2/plan.md:521`)
  - Issue: p02-t01 accepts and resolves `none` but commits before p02-t02 implements its behavior. The current sync path treats strategies other than `symlink` or `copy` as pointer creation (`packages/cli/src/commands/instructions/sync/sync.ts:275`), so `oat config set documentation.instructionSyncStrategy none` can report `none` while creating a CLAUDE.md at that committed task boundary. The plan itself requires independently committable tasks.
  - Fix: Add `none` resolution and behavior in the same commit, or defer accepting and exposing `none` until p02-t02. Test the config-level and command-level behavior at the chosen boundary.

### Low

None

## Requirements/Design Alignment

**Evidence sources used:** Quick-mode `discovery.md` and `plan.md`; the twelve source backlog items; `DR-260927-claude-md-shims-are-opt.md`. No spec or design artifact is required for this mode.

### Requirements Coverage

| Requirement                                 | Status  | Notes                                                                                                          |
| ------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| AGENTS.md guidance and installed-pack scope | Covered | p01-t01 through p01-t06 map the source criteria and commands.                                                  |
| CLAUDE.md no-shim migration                 | Partial | p02-t01 through p02-t06 cover the main behavior, with the two High and one Medium gaps above.                  |
| Lifecycle routing and bookkeeping           | Covered | p03 tasks map the source criteria; live multi-phase acceptance remains explicitly deferred with the item open. |
| Agent roles and recon validation            | Covered | p04 tasks include versioning, projection, and negative controls.                                               |
| CI, backlog archive, release fan-in         | Covered | p05 tasks include controls, archive checks, lockstep versions, and CI gates.                                   |

### Extra Work (not in declared requirements)

None found. The read-only guidance command is explicitly in the accepted AGENTS.md backlog criterion.

## Verification Commands

After revising the plan, review the new p02-t02 changed-file control and p02-t03 excluded-path scenarios against the source criteria. During implementation, use the plan's focused instruction tests with an isolated HOME and record failing-first evidence for these scenarios:

```bash
HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions
```

## Recommended Next Step

Run `oat-project-review-receive` to turn the findings into plan fixes, then rerun the plan gate.
