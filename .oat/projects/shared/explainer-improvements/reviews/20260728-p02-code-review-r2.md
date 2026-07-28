---
oat_generated: true
oat_generated_at: 2026-07-28T15:19:05Z
oat_review_scope: p02-remediation-r2
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
oat_review_request_id: explainer-improvements-p02-review-r2-20260728T150700Z
oat_remediation_base: e40c6a31e15460624bf4451aca73f449be45f3b7
oat_reviewed_head: 995468f31f9ff39f16be910abe26693a214afd28
oat_review_range: e40c6a31e15460624bf4451aca73f449be45f3b7..995468f31f9ff39f16be910abe26693a214afd28
oat_tracking_baseline: f607c1b431f57e4932c2395b4305da35778779ff
oat_launch_intent_commit: 95927c5a63688b7d2fad6a9ebc17cd57c13f47e7
oat_remediation_attempt: 2/3
oat_tasks: [p02-t13]
oat_reviewer_target: oat-reviewer-gpt-5-6-sol-high
---

# Code Re-review: Phase p02 Remediation Attempt 2

**Reviewed:** 2026-07-28T15:19:05Z  
**Phase:** p02 — Set-level visual authoring runtime  
**Task:** `p02-t13` only  
**Review request:** `explainer-improvements-p02-review-r2-20260728T150700Z`  
**Authoritative remediation range:** `e40c6a31e15460624bf4451aca73f449be45f3b7..995468f31f9ff39f16be910abe26693a214afd28`  
**Reviewed remediation head:** `995468f31f9ff39f16be910abe26693a214afd28`  
**Current expected HEAD inspected:** `95927c5a63688b7d2fad6a9ebc17cd57c13f47e7`  
**Files in remediation diff:** 6  
**Commits:** 1  
**Reconnaissance:** not-attempted

## Verdict

**PASS.** Remediation attempt 2/3 resolves I3-R1 under the declared trust
model: the run root may be mutated, but the caller-retained token echoed in
`reviewedSource.resumeToken` remains external and trusted. The token binds the
run identity to the raw bytes of all five retained set-plan records, is checked
before retained plan/author/content hydration, and rejects the previously
accepted coordinated mutation before any resume callback.

Findings: 0 critical, 0 important, 0 medium, 0 minor

**Blocking threshold:** Critical or Important.  
**Blocking fixes required:** No.  
**Phase disposition:** Remediation attempt 2/3 resolves the final Phase p02
blocker. Phase p02 may close.

## Scope and Evidence

The project uses import workflow mode. Evidence sources used:

- `.oat/projects/shared/explainer-improvements/references/imported-plan.md`
- `.oat/projects/shared/explainer-improvements/plan.md`, specifically p02-t13
- `.oat/projects/shared/explainer-improvements/implementation.md`
- `.oat/projects/shared/explainer-improvements/state.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p02-code-review.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p02-code-review-r1.md`
- The exact one-commit authoritative remediation diff and current committed
  context at `95927c5a63688b7d2fad6a9ebc17cd57c13f47e7`

The authoritative range contains only:

1. `995468f31f9ff39f16be910abe26693a214afd28` —
   `fix(p02-t13): anchor set plan resume`

The commit changes exactly the six p02-t13 files authorized by `plan.md`:

- `.agents/skills/explainer-kit/references/contracts.md`
- `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- `.agents/skills/explainer-kit/scripts/run.mjs`
- `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
- `.agents/skills/explainer-kit/tests/records.test.mjs`
- `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

The reviewed commit is an ancestor of current HEAD. The intervening committed
delta changes only `plan.md`, `implementation.md`, and `state.md`; it does not
alter the reviewed production or test surface.

## I3-R1 Resolution Evidence

| Required property                                                       | Status       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic token over run identity and exactly five retained records | **Resolved** | `SET_PLAN_RECORD_PATHS` enumerates request, result, ledger, portfolio, and drafts once (`records.mjs:24-30`). `createSetPlanResumeToken` domain-separates v1, includes `run.runId`, reads every path as bytes, hashes each byte buffer with SHA-256, and emits `ekrt1:` plus 64 lowercase hex characters (`records.mjs:310-329`). The record test proves stable regeneration and proves even a semantics-preserving raw-byte rewrite changes the token (`records.test.mjs:493-548`).                                                              |
| Incomplete and rejected results hand the token to the external caller   | **Resolved** | Interactive non-resumable approval states derive the token immediately before returning (`run.mjs:188-199`), and `resultFor` exposes it only as `approval.resumeToken` (`run.mjs:1468-1492`). Pending and rejected integration paths both assert the closed token form (`run.integration.test.mjs:210-232`, `347-363`).                                                                                                                                                                                                                           |
| Expected token is not persisted under the mutable run root              | **Resolved** | The token remains transient state and is generated only for the returned result. Approval persistence reconstructs the attempt and provenance from allowed fields, excluding `resumeToken` (`content-approval.mjs:79-100`, `313-349`). Integration coverage checks the request, build, approval, and all five set-plan records and confirms the echoed token is absent from persisted approval state (`run.integration.test.mjs:247-290`). Final immutable coverage explicitly contains no resume-token path (`rebuildability.test.mjs:130-178`). |
| Every recognized interactive resume verifies before hydration           | **Resolved** | Once `loadResumableRun` identifies a pending or rejected run, `verifySetPlanResumeToken` is the first operation in the resume branch and precedes `hydrateResumableState` (`run.mjs:53-100`). Hydration reads the fact base, set plan, author results, and content only afterward (`run.mjs:483-590`).                                                                                                                                                                                                                                            |
| Missing, malformed, mismatched, and coordinated tamper fail closed      | **Resolved** | The verifier rejects non-strings and every value outside `^ekrt1:[a-f0-9]{64}$`, recomputes from current bytes, length-checks, and then uses `timingSafeEqual`; all failures are `E_APPROVAL_RESUME` (`records.mjs:332-351`, `522-525`). Integration tests cover missing, malformed, mismatched tokens and assert no additional planner/author calls and zero durability/publish calls (`run.integration.test.mjs:294-345`).                                                                                                                      |
| Exact I3-R1 coordinated mutation is rejected before callbacks           | **Resolved** | The test independently inspected here changes the retained result draft, recomputes `request.planHash`, and updates portfolio and drafts projections consistently (`run.integration.test.mjs:1294-1352`). Resume returns `E_APPROVAL_RESUME`; planner and author counts remain at their pre-resume values and durability/publish stay at zero (`run.integration.test.mjs:1354-1373`). This directly closes the exploit demonstrated by the attempt-1 review.                                                                                      |
| Valid resume does not replan or reauthor; correction behavior remains   | **Resolved** | A valid corrected resume retains planner count 1 and author count 5 while completing from retained state (`run.integration.test.mjs:1035-1113`). The rejected-correction path still edits retained content, reopens render/QA, clears the corrected warning, preserves the audit marker, and completes with the external token (`run.integration.test.mjs:347-433`).                                                                                                                                                                              |
| Final immutable package still covers all five records                   | **Resolved** | `readSetPlanRecords` returns all five canonical paths (`records.mjs:354-465`), and final manifest hashing includes every `state.setPlanPaths` entry (`run.mjs:1413-1437`). Manifest contract coverage rejects removal of any set-plan record (`rebuildability.test.mjs:130-184`).                                                                                                                                                                                                                                                                 |
| Fixed-length comparison and documentation are accurate                  | **Resolved** | The closed regex guarantees the supplied token's fixed ASCII shape; the explicit byte-length guard short-circuits before `timingSafeEqual`, so unequal-length input cannot throw (`records.mjs:332-351`). `contracts.md:145-155` accurately documents external retention, echo through `reviewedSource.resumeToken`, pre-hydration validation, callback ordering, error code, and non-persistence.                                                                                                                                                |

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Required Fixes

None.

## Verification Commands and Results

| Command / check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Result                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git log --reverse --format='%H %s' e40c6a31e15460624bf4451aca73f449be45f3b7..995468f31f9ff39f16be910abe26693a214afd28`                                                                                                                                                                                                                                                                                                                                                                                                                 | Passed — exactly one commit, `995468f3 fix(p02-t13): anchor set plan resume`.                                                                                                         |
| `git diff --name-status e40c6a31e15460624bf4451aca73f449be45f3b7..995468f31f9ff39f16be910abe26693a214afd28`                                                                                                                                                                                                                                                                                                                                                                                                                             | Passed — exactly the six authorized p02-t13 files.                                                                                                                                    |
| `git diff --check e40c6a31e15460624bf4451aca73f449be45f3b7..995468f31f9ff39f16be910abe26693a214afd28`                                                                                                                                                                                                                                                                                                                                                                                                                                   | Passed with no output.                                                                                                                                                                |
| `node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs`                                                                                                                                                                                                                                                                                                                                                | Passed 56/56 in 19.5 seconds.                                                                                                                                                         |
| `node --test .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs` | Passed the complete Phase p02 union, 141/141 in 25.4 seconds.                                                                                                                         |
| `git diff --name-status 995468f31f9ff39f16be910abe26693a214afd28..95927c5a63688b7d2fad6a9ebc17cd57c13f47e7`                                                                                                                                                                                                                                                                                                                                                                                                                             | Passed — only the three expected project-tracking artifacts changed after the reviewed head.                                                                                          |
| Independent coordinated-tamper test inspection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Passed — the test performs the exact formerly accepted coordinated mutation, supplies the original external token, and verifies `E_APPROVAL_RESUME` before every prohibited callback. |

The working tree was clean before this review artifact was created.

## Root Escalation

None. The declared external-caller trust model is implemented without a
Critical or Important gap. Escalation is required only if the integration
owner cannot retain and echo `approval.resumeToken` outside the mutable run
root; that would violate the reviewed trust boundary rather than require
another in-scope core fix.

## Recommended Next Step

Receive this passing review, mark the p02 review row passed, close Phase p02,
and continue with p03-t01.
