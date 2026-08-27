---
oat_generated: true
oat_generated_at: 2026-08-27T03:32:04Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/synced-project-scope
oat_gate_headless: true
oat_gate_run_id: ed4a9a8d-ee03-4a9a-b0db-3a895f19896c
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T03:32:04Z
**Scope:** Implementation-plan readiness and alignment with the spec-driven upstream artifacts
**Files reviewed:** 6
**Commits:** N/A (artifact review)

## Review Scope

**Project:** `.oat/projects/shared/synced-project-scope`
**Type:** artifact
**Scope:** plan
**Workflow mode:** spec-driven
**Gate route:** inline (runtime=cursor, cliRoot=`/Users/tstang/Code/open-agent-toolkit`)

**Primary files in scope:**

- `.oat/projects/shared/synced-project-scope/plan.md`
- `.oat/projects/shared/synced-project-scope/spec.md`
- `.oat/projects/shared/synced-project-scope/design.md`

**Supporting evidence used:**

- `.oat/projects/shared/synced-project-scope/discovery.md`
- `.oat/projects/shared/synced-project-scope/implementation.md`
- `.oat/projects/shared/synced-project-scope/state.md`
- Current repository command and type surfaces cited by the findings
- GitHub Actions `push` event documentation for the NFR2 spike contract

**Dispatch Profile advisory:** No `## Dispatch Profile` section is present. Its omission is normal and is not a finding.

**Project-policy dispatch audit:** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high`

The gate-configured target is recorded separately and authoritatively in frontmatter; the project-policy resolver output above is an audit surface, not a replacement for gate invocation metadata.

## Summary

The plan remains blocked. It still loses a P0 lifecycle mutation when a paused synced project is opened, and its NFR2 spike and archive retry algorithm cannot establish the guarantees they claim; two additional verification/recovery gaps should also be corrected before implementation.

Findings: 1 critical, 2 important, 2 medium, 0 minor

## Findings

### Critical

- **Opening a paused synced project resumes `state.md` without publishing it** (`.oat/projects/shared/synced-project-scope/plan.md:1074`)
  - Issue: p02-t11 makes `open` resolve and pull synced projects, but only `pause` injects `pushSynced`. The current `open` command changes `oat_lifecycle`, clears pause metadata, and writes `state.md` when it resumes a paused project (`packages/cli/src/commands/project/open/index.ts:80-119`). Under the plan, that authoritative state mutation remains only in one nested checkout, so another worktree or machine still sees the project as paused. This leaves the P0 FR6 lifecycle-integration requirement incomplete.
  - Fix: Make synced `open` publish when `maybeResumePausedProject` returns true, before reporting success. Add tests for a paused synced project, push failure, and an already-active synced project that must not create a commit; define whether a push failure leaves `activeProject` unchanged and make the test enforce that order.
  - Requirement: FR6

### Important

- **The custom-ref CI spike produces an invalid negative result** (`.oat/projects/shared/synced-project-scope/plan.md:565`)
  - Issue: the spike creates a parentless commit whose tree contains only `design.md`; it does not contain `.github/workflows/probe.yml`. A push of that commit cannot run the probe workflow regardless of whether the destination is a branch, tag, or custom ref, so an empty `gh run list` result does not prove that `refs/oat/*` pushes avoid Actions. The optional branch contrast uses the same workflow-less commit and is invalid for the same reason.
  - Fix: Build the spike commit from the workflow-bearing branch tip (or include the workflow file in its tree), push it to the custom ref first, assert no run for that ref, then push the same commit to a temporary branch and assert a run with the matching SHA and branch. Delete both refs and record both outputs.
  - Requirement: NFR2

- **The archive algorithm contradicts its retry-identity and idempotence tests** (`.oat/projects/shared/synced-project-scope/plan.md:1258`)
  - Issue: the RED contract says `record.archiveSnapshot` is persisted before copying, but the GREEN algorithm copies first and persists the identity afterward (`plan.md:1268`). A failure after copy but before that write can therefore select a suffixed target on retry—the exact behavior the test forbids. The GREEN branch also detects synced mode only with `isSyncedCheckout(source)`; after a successful archive removes the checkout, the required idempotent rerun cannot enter the synced path even though the record and prior snapshot remain.
  - Fix: Persist the stable snapshot identity before any copy and resolve synced archive mode from the scoped path/record, not only a present `.git` pointer. Specify the absent-checkout completed-record no-op path and add failure injection between identity persistence and copy, plus a real rerun after checkout removal.
  - Requirement: FR8, NFR5

### Medium

- **The skill dogfood still bypasses the arrival skill it claims to test** (`.oat/projects/shared/synced-project-scope/plan.md:1869`)
  - Issue: p04-t10 says to run `oat-project-progress`, but its executable sequence manually runs `oat project pull skill-dogfood` and never invokes the skill. The checkout is already materialized before any progress workflow could exercise pull-before-read, so the evidence cannot validate the rewritten arrival path.
  - Fix: In the linked worktree, set only the active-project pointer/record prerequisites, leave the checkout absent, then invoke the actual `oat-project-progress` skill and capture evidence that its own Step 0 materialized the checkout before reading state. Keep a manual pull only as a separate CLI check.
  - Requirement: FR6

- **Conflict recovery instructions are not valid for an explicitly targeted non-active project** (`.oat/projects/shared/synced-project-scope/plan.md:795`)
  - Issue: push/pull accept an explicit path or slug, but the documented recovery command is the targetless `oat project pull --continue`. When the conflicted project is not `activeProject`—including an adopting pull from another checkout—that command resolves the wrong project or fails, despite FR4 requiring actionable resolution instructions.
  - Fix: Require conflict output to print `oat project pull <same-path-or-slug> --continue` and the corresponding `--abort` command, preserving a shell-safe canonical target. Add a command-level test where `activeProject` points elsewhere and recovery succeeds only with the emitted target.
  - Requirement: FR4

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md`, `design.md`, `discovery.md`, `implementation.md`, `state.md`, the cited current command/type surfaces, and GitHub Actions push-event documentation.

### Requirements Coverage

| Requirement group | Status  | Notes                                                                                       |
| ----------------- | ------- | ------------------------------------------------------------------------------------------- |
| FR1-FR3           | covered | Scope, creation, and push are mapped to bounded tasks and tests.                            |
| FR4               | partial | Pull mechanics are mapped, but emitted conflict recovery is not target-safe.                |
| FR5               | covered | Record schema, branch footprint, and commit ownership are explicit.                         |
| FR6               | missing | Synced `open` drops its resume mutation; the arrival dogfood bypasses the actual skill.     |
| FR7               | covered | Link rendering, refresh, and PR integration are mapped.                                     |
| FR8               | partial | Completion behavior is mapped, but retry identity and post-removal idempotence conflict.    |
| FR9-FR18          | covered | Ignore, worktree, prune, migration, docs, adoption, coordination, and archive coverage map. |
| NFR1              | covered | Shared/local compatibility and deliberate exceptions have explicit tests.                   |
| NFR2              | missing | The planned GitHub experiment cannot distinguish custom-ref behavior.                       |
| NFR3-NFR4         | covered | Git-only operation and parent-checkout mutation invariants are explicit.                    |
| NFR5              | partial | Pull recovery is planned; archive retry/idempotence remains internally inconsistent.        |
| NFR6              | covered | Skill/package versioning and repository gates are enumerated.                               |

### Extra Work (not in declared requirements)

Listing `local` projects is an explicitly approved additive exception recorded in `spec.md`; it is not scope creep.

## Verification Commands

After revising the plan:

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/synced-project-scope
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/plan.md
rg -n "resume|pushSynced|archiveSnapshot|oat-project-progress|pull .*--continue|refs/oat/projects/spike" .oat/projects/shared/synced-project-scope/plan.md
oat gate review --review-type artifact --review-scope plan --exit-nonzero-on important
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
