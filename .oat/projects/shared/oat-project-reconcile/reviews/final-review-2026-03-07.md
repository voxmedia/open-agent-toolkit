---
oat_generated: true
oat_generated_at: 2026-03-07
oat_review_scope: final
oat_review_type: code
oat_project: /tmp/oat-review-R05hW/.oat/projects/shared/oat-project-reconcile
---

# Code Review: final

**Reviewed:** 2026-03-07
**Scope:** Final project review (`8daef654e2fd2cf078a487a7302801be66530035..554c4bf`)
**Files reviewed:** 13
**Commits:** `284d63b` through `554c4bf`

## Summary

The branch adds the new `oat-project-reconcile` skill, wires it into provider sync, and updates project tracking artifacts for the quick-mode project used to ship it. The overall direction is sound, but there are several workflow correctness gaps: the project state is marked as implementation-complete before final review has passed, the reconcile skill can overwrite existing implementation history, and two promised reconciliation aids (temporal task mapping and progress-router drift handling) are either missing or only partially implemented.

## Findings

### Critical

None.

### Important

1. **Implementation phase state is advanced past the review gate**
   - `state.md` sets `oat_phase_status: complete` while the same artifact still says the project is "awaiting final review" (`.oat/projects/shared/oat-project-reconcile/state.md:8`, `.oat/projects/shared/oat-project-reconcile/state.md:26`).
   - `implementation.md` simultaneously remains `oat_status: in_progress` despite `10/10 tasks completed` and `oat_current_task_id: null` (`.oat/projects/shared/oat-project-reconcile/implementation.md:2`, `.oat/projects/shared/oat-project-reconcile/implementation.md:32`).
   - The canonical implementation flow keeps project state `implement/in_progress` until final review passes, so these conflicting statuses can cause downstream lifecycle skills to route as if the review gate were already cleared.

2. **Reconciliation instructions violate the append-only requirement**
   - Step 5 says to find the existing `### Task {task_id}` section in `implementation.md` and "replace the placeholder content" (`.agents/skills/oat-project-reconcile/SKILL.md:473`).
   - That contradicts the spec's non-destructive requirement to preserve existing task entries and never overwrite logged history (`.oat/projects/shared/oat-project-reconcile/spec.md:75`).
   - In a real reconcile run, partially logged/manual task notes would be lost instead of being augmented.

### Medium

1. **The required temporal-ordering mapping signal is not implemented**
   - The spec requires temporal ordering as the fourth mapping signal and low-confidence tiebreaker (`.oat/projects/shared/oat-project-reconcile/spec.md:30`).
   - The shipped skill stops after task ID, file overlap, and keyword matching, then falls directly to `unmapped` (`.agents/skills/oat-project-reconcile/SKILL.md:273`).
   - This weakens reconciliation exactly in ambiguous manual ranges where commit order is the only remaining signal.

2. **`oat-project-progress` integration is incomplete**
   - The implementation plan for `p02-t02` requires a real routing case that detects stale/missing `implementation.md` entries relative to `plan.md` and suggests `oat-project-reconcile` only when drift is present (`.oat/projects/shared/oat-project-reconcile/plan.md:480`).
   - The actual change only adds advisory text to the spec-driven `implement/in_progress` row and leaves quick/import rows unchanged (`.agents/skills/oat-project-progress/SKILL.md:194`, `.agents/skills/oat-project-progress/SKILL.md:205`, `.agents/skills/oat-project-progress/SKILL.md:214`).
   - That means there is still no described detection step, and quick/import projects can reach the same drift state without being told about the reconcile workflow.

### Minor

1. **Root-based runs lose coverage for the permission-denied path**
   - The new early return in `edge-cases.test.ts` skips the permission-denied test entirely when the suite runs as UID 0 (`packages/cli/src/engine/edge-cases.test.ts:38`).
   - That avoids a false negative in root environments, but it also removes the only direct coverage of the `detectStrays()` permission-error translation path in root/container CI. A mocked `readdir` failure would keep the behavior covered without depending on filesystem permissions.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| R1 | implemented | Checkpoint detection and fallback paths are documented clearly. |
| R2 | implemented | Commit collection/filtering flow is present. |
| R3 | partial | Mapping omits the required temporal-ordering tiebreaker. |
| R5 | implemented | Confirmation gates are explicit before writes. |
| R8 | missing | Step 5b can overwrite existing `implementation.md` task history. |
| p02-t02 plan step | missing | Progress-router drift detection was not added; reconcile guidance is only partial. |

### Extra Work (not in requirements)

None.

## Verification Commands

- `pnpm --filter @oat/cli test -- --run packages/cli/src/engine/edge-cases.test.ts`
  - Result: the targeted file itself passed, but Vitest still ran the full `@oat/cli` package suite in this environment. Two unrelated baseline failures remained: `src/fs/assets.test.ts` (missing built assets) and `src/commands/commands.integration.test.ts` ("doctor on healthy setup reports all pass").

## Recommended Next Step

Run `oat-project-review-receive` and add follow-up fixes for the Important and Medium findings before opening the final PR.
