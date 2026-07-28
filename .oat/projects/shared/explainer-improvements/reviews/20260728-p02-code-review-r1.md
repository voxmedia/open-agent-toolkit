---
oat_generated: true
oat_generated_at: 2026-07-28T14:33:49Z
oat_review_scope: p02-remediation-r1
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
oat_review_request_id: explainer-improvements-p02-review-r1-20260728T142000Z
oat_phase_base: b54863f19d5db6df47b1538e791adadaf76f0306
oat_original_reviewed_head: 86fc4b6acc737a995783210699cee055e7860a45
oat_remediation_base: 5f973c8685d34add573f79695c2fc9d2060d34d2
oat_reviewed_head: 4c469ea8eda39971c742e29a6a33b84db41607b6
oat_review_range: 5f973c8685d34add573f79695c2fc9d2060d34d2..4c469ea8eda39971c742e29a6a33b84db41607b6
oat_tracking_baseline: c4f5f68e86c46356fb079087158176e376a3a240
oat_launch_intent_commit: 0c78f6e245df8ac77b9bec72ef906f0b06888c20
oat_remediation_attempt: 1/3
oat_tasks: [p02-t08, p02-t09, p02-t10, p02-t11, p02-t12]
oat_reviewer_target: oat-reviewer-gpt-5-6-sol-high
---

# Code Re-review: Phase p02 Remediation Attempt 1

**Reviewed:** 2026-07-28T14:33:49Z  
**Phase:** p02 — Set-level visual authoring runtime  
**Review request:** `explainer-improvements-p02-review-r1-20260728T142000Z`  
**Authoritative remediation range:** `5f973c8685d34add573f79695c2fc9d2060d34d2..4c469ea8eda39971c742e29a6a33b84db41607b6`  
**Reviewed remediation head:** `4c469ea8eda39971c742e29a6a33b84db41607b6`  
**Current HEAD inspected:** `0c78f6e245df8ac77b9bec72ef906f0b06888c20`  
**Original Phase p02 range:** `b54863f19d5db6df47b1538e791adadaf76f0306..86fc4b6acc737a995783210699cee055e7860a45`  
**Files in remediation diff:** 20  
**Commits:** 5  
**Reconnaissance:** not-attempted

## Verdict

**BLOCKED.** Four of the five original Important findings are resolved. The
retained set-plan records are now complete in final manifest coverage and
single-record tampering is rejected, but coordinated post-pause mutation of the
set-plan result and its mutable hash/projection records is still accepted on
resume. Remediation attempt 1/3 therefore does not yet clear Phase p02.

Findings: 0 critical, 1 important, 0 medium, 0 minor

**Blocking threshold:** Critical or Important.  
**Blocking fixes required:** Yes — resolve I3-R1 before Phase p02 can close.

## Scope and Evidence

The project uses import workflow mode. Evidence sources used:

- `.oat/projects/shared/explainer-improvements/references/imported-plan.md`
- `.oat/projects/shared/explainer-improvements/plan.md`
- `.oat/projects/shared/explainer-improvements/implementation.md`
- `.oat/projects/shared/explainer-improvements/state.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p02-code-review.md`
- All five commits and all 20 files in the authoritative remediation range
- Current committed core and OAT adapter code at the launch-intent HEAD

The exact range contains, in order:

1. `1ba70b5079b0ad2952359fa52b35c56771441318` — p02-t08
2. `5e97d1d3b688e69ea3d9aa2663879bfc021e925a` — p02-t09
3. `92254004673aac65705bf128fca651c33e4ebd12` — p02-t10
4. `5f57e7437ecdebb3c5be7e9b0c4261d3b0ad90a7` — p02-t11
5. `4c469ea8eda39971c742e29a6a33b84db41607b6` — p02-t12

The range is an ancestor of current HEAD, the worktree was clean before this
artifact was written, and `git diff --check` passed.

## Original Finding Resolution

| Original finding                                          | Resolution     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 — Complete reconciled-source coverage                  | **Resolved**   | `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs:107-142` requires the plan source set to equal every reconciled non-critic source and requires every declared source to cover at least one portfolio artifact. Focused omission and unmapped-source tests pass.                                                                                                                                                                                          |
| I2 — Visual review binds the exact rendered set           | **Resolved**   | `.agents/skills/explainer-kit/scripts/lib/contracts.mjs:511-619` rejects missing, extra, and duplicate rendered IDs, requires result IDs to equal the reviewed request set, rejects detached findings, and enforces disposition/finding consistency. Detached result validation without its request also fails.                                                                                                                                                 |
| I3 — Retained set-plan immutability across resume         | **Unresolved** | Final manifests now cover all five records (`.agents/skills/explainer-kit/scripts/run.mjs:1406-1430`), and resume validates individual records and projections. However, the pre-approval path returns before a manifest is written (`run.mjs:184-197`), while `readSetPlanRecords` derives trust only from the same mutable record set (`.agents/skills/explainer-kit/scripts/lib/records.mjs:322-418`). A coordinated mutation remains undetected; see I3-R1. |
| I4 — Bundled guidance reaches core and OAT authors        | **Resolved**   | `.agents/skills/explainer-kit/scripts/run.mjs:1058-1102` loads the bundled visual-authoring reference into the required closed author request. The OAT adapter passes direct and module callbacks to the actual core, and its integration test confirms receipt of all required guidance topics. The callback reference now makes expansion planner-owned.                                                                                                      |
| I5 — Artistic default and explicit deterministic fallback | **Resolved**   | `.agents/skills/explainer-kit/scripts/run.mjs:402-409` persists `artistic` as the default; `.agents/skills/explainer-kit/scripts/lib/recipes.mjs:90-113` selects Markdown only for the declared explicit fallback; the recipe keeps the same adaptive portfolio. Tests prove artistic HTML by default, explicit reproducible Markdown selection, retained mode/path identity, and no automatic downgrade after author failure.                                  |

## Findings

### Critical

None.

### Important

- **I3-R1 — The retained set-plan hash has no immutable pre-pause anchor**
  (`.agents/skills/explainer-kit/scripts/lib/records.mjs:322`)
  - Issue: Resume reads all five set-plan records together and checks the
    result against `request.planHash`, but that request and all canonical
    projections are mutable files from the same paused run. Before approval,
    `runExplainer` returns without writing the manifest that would carry
    `immutableHashes`. Therefore a coordinated edit can replace the plan,
    update `request.planHash`, and update the portfolio/drafts projections
    while preserving internal consistency.
  - Verified impact: A read-only temporary-directory probe changed the first
    planned draft, recomputed the mutable request hash, and updated the
    portfolio and drafts projections. Resume returned `built-not-durable` with
    no errors; planner calls remained 1 and author calls remained 3. The
    tampered draft was accepted and then blessed by the newly written final
    manifest.
  - Requirement: p02-t10 steps 2-4 and acceptance — retained set-plan records
    must remain immutable across resume, and post-pause mutation must not alter
    the resumed package.
  - Fix: Persist a pre-pause hash checkpoint for all five set-plan records
    outside those records, then validate every byte hash before hydrating any
    retained plan, approval, author, or content state. Add a coordinated-tamper
    integration test that updates `result.json`, `request.planHash`,
    `portfolio.json`, and `drafts.json` consistently and still requires
    `E_APPROVAL_RESUME`.

### Medium

None.

### Minor

None.

## Required Fixes

1. **Anchor and verify the paused set-plan hashes**
   - Affected:
     `.agents/skills/explainer-kit/scripts/lib/records.mjs`,
     `.agents/skills/explainer-kit/scripts/run.mjs`
   - Record a complete five-path hash checkpoint before returning an
     incomplete approval result. On resume, compare the retained bytes with
     that checkpoint before accepting cross-record projections or invoking
     later lifecycle work.
2. **Cover coordinated tampering**
   - Affected:
     `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
   - Extend the resume tamper matrix with a mutation that keeps every current
     internal hash/projection consistent. Assert failure occurs before planner,
     author, durability, or publish callbacks.
3. **Retain final package completeness**
   - Affected:
     `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
   - Preserve the passing assertion that all five set-plan paths remain in
     final manifest immutable coverage while adding the pre-pause checkpoint.

## Verification Commands and Results

| Command / check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Result                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git log --reverse --format='%H %s' 5f973c8685d34add573f79695c2fc9d2060d34d2..4c469ea8eda39971c742e29a6a33b84db41607b6`                                                                                                                                                                                                                                                                                                                                                                                                                 | Passed — exactly five ordered commits, p02-t08 through p02-t12.                                                                                                     |
| `git diff --name-status 5f973c8685d34add573f79695c2fc9d2060d34d2..4c469ea8eda39971c742e29a6a33b84db41607b6`                                                                                                                                                                                                                                                                                                                                                                                                                             | Passed — exactly 20 touched remediation files within the declared fix surfaces.                                                                                     |
| `git diff --check 5f973c8685d34add573f79695c2fc9d2060d34d2..4c469ea8eda39971c742e29a6a33b84db41607b6`                                                                                                                                                                                                                                                                                                                                                                                                                                   | Passed with no output.                                                                                                                                              |
| `node --test .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs` | Passed 138/138 in 23.7 seconds.                                                                                                                                     |
| Temporary-directory coordinated set-plan mutation probe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **Failed acceptance:** resume incorrectly returned `built-not-durable` with no errors after the plan, mutable plan hash, and projections were changed consistently. |

## Recommended Next Step

Run `oat-project-review-receive` to convert I3-R1 into one bounded p02-t10
remediation task. Phase p02 must remain open and proceed to remediation attempt
2/3; no root escalation is required unless the implementation cannot establish
a pre-pause hash checkpoint without changing the approval-resume contract.
