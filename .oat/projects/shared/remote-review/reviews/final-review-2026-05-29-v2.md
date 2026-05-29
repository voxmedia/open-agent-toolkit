---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/remote-review
---

# Code Review: final (independent)

**Reviewed:** 2026-05-29
**Scope:** final whole-branch review for `remote-review`
**Diff reviewed:** `f51a3d7496c2b9873bc6cfec56ef2065a106869c..HEAD` plus the live uncommitted docs delta in `apps/oat-docs/docs/workflows/projects/reviews.md`
**Files reviewed:** 57 committed files plus 1 uncommitted docs file

## Summary

The remote-review implementation is broadly coherent: the two provide-remote skills are registered, bundled, and validated; the marker/body/narrowing/line-mapping/worktree helpers are covered by focused tests; `oat-reviewer` structured-output mode matches the project rail dispatch wrapper; and the public package lockstep bump validates at `0.1.12`.

This independent pass is **not ready to pass final** because the project review ledger is stale enough that OAT still routes the project back to review-receive, and because the posted-body helper does not provide a structured way to preserve out-of-diff findings even though both skills claim those findings are downgraded into the top-level body.

## Findings

### Critical

None

### Important

- **Project review bookkeeping still advertises unresolved review work after final pass** (`.oat/projects/shared/remote-review/plan.md:823`)
  - Issue: `oat project status --project-path .oat/projects/shared/remote-review --json` reports `recommendation.skill = oat-project-review-receive` with reason `Unprocessed review feedback exists`, even though `implementation.md` marks all 18 tasks complete and records the prior final review as passed. The ledger drift is visible in three places: `p06` remains `pending`; the `plan` artifact row is still `received` and points at `reviews/artifact-plan-review-2026-05-29.md`, but the file has been archived at `reviews/archived/artifact-plan-review-2026-05-29.md`; and the failed first-pass `p02`/`p05` artifacts remain top-level beside their passed `-v2` artifacts, so status treats them as outstanding received review feedback. A final review cannot be trusted while the lifecycle state still tells the next agent to process old review findings.
  - Fix guidance: Reconcile the review ledger before passing final: archive or otherwise mark the superseded first-pass `p02`/`p05` artifacts as consumed, align the `plan` artifact row with its archived/passed disposition, and either mark `p06` as covered by final or remove/update that pending row according to OAT convention. Re-run `oat project status --project-path .oat/projects/shared/remote-review --json` and ensure it no longer recommends `oat-project-review-receive` for stale feedback.

### Medium

- **Out-of-diff findings have no structured path through the posted-review-body builder** (`packages/cli/src/review-remote/body-builder.ts:23`)
  - Issue: The design requires any finding whose `file:line` cannot be posted inline to be downgraded into a top-level "Findings outside the PR diff" subsection with the original reference and body. Both provide-remote skills repeat that guarantee, then say out-of-diff findings are "already downgraded into `$REVIEW_BODY`" before posting. But the shared `buildReviewBody` helper only accepts severities, summary, and optional verification commands; it emits markers, counts, the minor nudge, and verification, with no field for out-of-diff finding details. The current tests prove counts and markers, not the never-drop downgrade path. A caller that follows the helper contract literally can preserve the counts while omitting the actual out-of-diff finding content from both `comments[]` and the review body.
  - Fix guidance: Extend `BuildInput` with an optional out-of-diff finding/details section, render the exact subsection required by `design.md`, and add a test that classifies a finding as out-of-diff, passes it into the body builder, and asserts the posted body includes `file:line` plus the finding body. If the intent is that agents hand-edit `$REVIEW_BODY` outside the helper, document that explicitly and add a skill-level example so the no-drop guarantee is executable.

### Minor

None

## Requirements / Design Alignment

Reviewed against `discovery.md`, `design.md`, `plan.md`, `implementation.md`, the committed branch diff, and the live docs delta. The core implementation covers the planned provide-remote scope:

- `oat-review-provide-remote` and `oat-project-review-provide-remote` exist, validate, and are registered for install/bundling.
- `marker-parser`, `body-builder`, `line-mapper`, `narrowing`, `project-resolver`, `capability-probe`, `worktree`, and `reviewer-dispatch` have focused tests and integration coverage.
- `oat-reviewer` structured-output mode and project-rail dispatch use the same `oat_output_mode: structured` contract.
- Receive-skill minor disposition now defaults to `convert` with rationale required for defer/dismiss.
- The live docs delta accurately names the remote provide/receive loop and the updated minor-default policy; it was reviewed but intentionally not staged by this review.

The remaining gaps are lifecycle-state correctness and the explicit preservation path for out-of-diff findings.

## Carry-Forward Debt Disposition

The prior final review's minor `$EPHEMERAL_PATH` wording issue is resolved in the current provide-remote skills. The stale review-ledger issue above is new in this independent pass because it compares the final state against `oat project status` and the actual review artifact layout.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts
pnpm oat:validate-skills
pnpm lint
pnpm type-check
pnpm release:validate
pnpm format
pnpm test
```

All commands passed. Full `pnpm test` passed the workspace suite, including CLI 191 files / 1694 tests plus control-plane, docs-config, docs-transforms, and the docs build.

## Recommended Next Step

Run `oat-project-review-receive` for this final review artifact and convert both findings to tracked fix tasks. Do not mark final as passed until `oat project status` no longer reports stale unprocessed review feedback.
