---
oat_generated: true
oat_generated_at: 2026-08-27T03:20:56Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/synced-project-scope
oat_gate_headless: true
oat_gate_run_id: a5b73cc6-504d-43fb-8ad1-85c014f92bcf
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T03:20:56Z
**Scope:** Implementation-plan readiness and alignment with the spec-driven upstream artifacts
**Files reviewed:** 6
**Commits:** N/A (artifact review)

## Review Scope

**Project:** `.oat/projects/shared/synced-project-scope`
**Type:** artifact
**Scope:** plan
**Workflow mode:** spec-driven

**Primary files in scope:**

- `.oat/projects/shared/synced-project-scope/plan.md`
- `.oat/projects/shared/synced-project-scope/spec.md`
- `.oat/projects/shared/synced-project-scope/design.md`

**Supporting evidence used:**

- `.oat/projects/shared/synced-project-scope/discovery.md`
- `.oat/projects/shared/synced-project-scope/implementation.md`
- `.oat/projects/shared/synced-project-scope/state.md`
- Current command and skill surfaces cited by the findings

**Dispatch Profile advisory:** No `## Dispatch Profile` section is present. Its omission is normal and is not a finding.

## Summary

The plan is detailed and has strong requirement mapping, task IDs, verification commands, and release hygiene, but it is not ready to implement. Two P0 lifecycle gaps remain: synced completion drops the existing tracked project-recap durability transaction, and the lifecycle inventory omits several first-class commands and artifact-writing workflows that cannot work safely once `synced` becomes the default.

Findings: 2 critical, 1 important, 2 medium, 0 minor

## Findings

### Critical

- **Synced completion drops the existing project-recap durability transaction** (`.oat/projects/shared/synced-project-scope/plan.md:1646`)
  - Issue: p04-t05 makes Step 10 a no-op for synced projects, while p03-t04 commits only the record and optional summary export. The current completion contract requires the tracked recap export to be included in a lifecycle commit, uses that commit SHA to re-attest the recap, then records `manifest.json` and `build-record.json` in a second ordered evidence commit before one push (`.agents/skills/oat-project-complete/SKILL.md:588-680`). The plan neither allows the recap export paths through the branch-side commit helper nor preserves this two-commit protocol. A synced completion that generates a recap would therefore leave the tracked export uncommitted and cannot produce valid commit durability evidence.
  - Fix: Extend p03-t04 and p04-t05 with an explicit synced recap transaction. The archive report must expose exact tracked recap-export paths; the branch-side commit path must safely include the record, summary export, and complete recap export; the resulting lifecycle SHA must feed re-attestation; and the mutable evidence records must land in a second commit before the single push. Add tests for recap and no-recap completion, exact path containment, commit order, and failure recovery.
  - Requirement: FR8, NFR1

- **The lifecycle inventory omits first-class synced entry points and artifact writers** (`.oat/projects/shared/synced-project-scope/plan.md:1508`)
  - Issue: The p02/p04 task inventory does not cover `oat project open`, `oat project pause`, `oat-project-capture`, `oat-project-promote-spec-driven`, `oat-project-autonomous`, `oat-project-next`, or `oat-project-retro-file`. Today `open` resolves names only under `projects.root` (`packages/cli/src/commands/project/open/index.ts:129-143`); `pause` does the same and writes `state.md` before clearing the active pointer without publishing the artifact change (`packages/cli/src/commands/project/pause/index.ts:81-166`); capture creates a now-default synced project and then rewrites discovery/state/implementation without a push (`.agents/skills/oat-project-capture/SKILL.md:147-253`); and autonomous persists state/learnings outside an owning lifecycle commit (`.agents/skills/oat-project-autonomous/SKILL.md:240-281`). These paths either cannot resolve a synced project or leave authoritative artifacts local-only, violating the P0 lifecycle integration promise.
  - Fix: Add a complete checked-in inventory of every command, skill, and agent that resolves, reads on arrival, or writes project artifacts. Add bounded tasks and tests for synced-aware open/pause and dashboard/list discovery, pull-before-read for routing/orchestration entry points, and scope-aware push/writeback for every artifact writer. Include these sites in p04-t06's inventory validator so future additions cannot silently bypass synced durability.
  - Requirement: FR2, FR6

### Important

- **The archive state machine is not verified as retry-safe after partial failure** (`.oat/projects/shared/synced-project-scope/plan.md:1213`)
  - Issue: p03-t04 tests refusal, success, and a rerun only after full success. It does not inject failure after the archive copy, summary/S3 work, record commit, or checkout removal. The design claims each step is safe to retry, but the existing target resolver selects a new suffixed archive path whenever the first target already exists (`packages/cli/src/commands/project/archive/archive-utils.ts:472-483`). A failure after copying but before later steps can therefore produce duplicate snapshots/exports on retry rather than resume the same transaction.
  - Fix: Define the durable retry identity and recovery behavior, then add failure-injection tests at every state-machine boundary. A retry must reuse or safely reconcile the same snapshot/export, avoid duplicate branch commits, and remove the checkout only after all required durable writes succeed.
  - Requirement: FR8, NFR5

### Medium

- **The skill dogfood can bypass the actual workflow it claims to verify** (`.oat/projects/shared/synced-project-scope/plan.md:1821`)
  - Issue: p04-t10 permits pasting a bookkeeping snippet instead of running an actual rewritten lifecycle skill. That proves the shell fragment works but not that the skill resolves scope at the right time, publishes all of its mutations, and resumes correctly. It also proposes quick-start discovery capture against an already-created project even though quick-start is a project-creation workflow.
  - Fix: Choose one real artifact-writing lifecycle skill that can operate on the prepared active project and execute it end to end, plus one real arrival/routing skill in the linked worktree. Keep snippet-only execution as a separate mechanical check, not the acceptance path.
  - Requirement: FR6

- **p03-t04 omits the archive command runner from its declared file surface** (`.oat/projects/shared/synced-project-scope/plan.md:1203`)
  - Issue: The task assigns `--no-commit` and JSON-report changes to `archive/index.ts`, but `ArchivePushOptions`, report construction, and archive option plumbing live in `packages/cli/src/commands/project/archive/push-runner.ts`. The directory-wide format/commit commands would happen to include the file, but the task's bounded write set is incomplete.
  - Fix: Add `push-runner.ts` and its tests to the Files section, and state which layer owns the new option, report fields, and commit behavior.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md`, `design.md`, `discovery.md`, `implementation.md`, `state.md`, and the cited current command/skill surfaces.

### Requirements Coverage

| Requirement | Status  | Notes                                                                   |
| ----------- | ------- | ----------------------------------------------------------------------- |
| FR1         | covered | Scope/ref/worktree foundation is mapped to p01 and p02.                 |
| FR2         | partial | Creation is covered; open/pause and related discovery remain missing.   |
| FR3         | covered | Push behavior and integration tests are explicit.                       |
| FR4         | covered | Pull, conflict, continue, abort, and adoption paths are explicit.       |
| FR5         | covered | Record schema and branch commit behavior are mapped.                    |
| FR6         | missing | Multiple lifecycle and arrival surfaces are absent from the sweep.      |
| FR7         | covered | Link rendering, refresh, and PR integration are mapped.                 |
| FR8         | partial | Base archive flow is mapped; recap durability and retry safety are not. |
| FR9         | covered | Managed ignore behavior and self-heal are mapped.                       |
| FR10        | covered | Multi-worktree reconciliation has concrete tests.                       |
| FR11        | covered | Project-wide prune and guards are mapped.                               |
| FR12        | covered | Migration and rollback tests are detailed.                              |
| FR13        | covered | Doctor conditions have a dedicated task.                                |
| FR14        | covered | Required docs surfaces and docs build are mapped.                       |
| FR15        | covered | Shared rendering courtesy is mapped.                                    |
| FR16        | covered | Remote list and adoption tasks are present.                             |
| FR17        | covered | Coordination child pull is mapped.                                      |
| FR18        | covered | Review-artifact exclusion is included in archive tests.                 |
| NFR1        | partial | Shared/local coverage is strong, but recap completion parity regresses. |
| NFR2        | covered | A meaningful unfiltered-workflow spike is defined.                      |
| NFR3        | covered | Git-only operation has explicit test coverage.                          |
| NFR4        | covered | Mutation invariants and parent-index tests are explicit.                |
| NFR5        | partial | Pull is resumable; archive partial-failure retry is not defined.        |
| NFR6        | covered | Skill/package bumps and all repository gates are mapped.                |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan:

```bash
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/plan.md
rg -n "project (open|pause)|oat-project-(capture|promote-spec-driven|autonomous|next|retro-file)|projectRecapExport|failure.inject" .oat/projects/shared/synced-project-scope/plan.md
oat gate review --review-type artifact --review-scope plan --exit-nonzero-on important
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan tasks.
