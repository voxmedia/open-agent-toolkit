---
oat_generated: true
oat_generated_at: 2026-07-29T15:06:28Z
oat_review_scope: p04-closure-r5
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p04 Closure Re-review

**Reviewed:** 2026-07-29T15:06:28Z
**Scope:** I4-R4, p04-t14, and regression confirmation for all previously
resolved Phase p04 findings
**Files reviewed:** 4 p04-t14 product files, the resume call path, mode-required
artifacts, and focused regression sources
**Commits:** `996229cfad5392a45681e91e0084b4684acbcb47..9d7d650172fe40e5ddd8590ac2ea3078cc700ed4`
**Verdict:** PASS

## Summary

Secure closure is complete. Production resume verification accepts only a
fixed-format `ekrt2` token, binds it to the canonical output root, exact retained
request bytes, run identity, and all five retained set-plan records, and compares
the fixed-length value with `timingSafeEqual`. Genuine relative-root and
rewritten-current-package `ekrt1` attempts reject with `E_APPROVAL_RESUME`
before resumable-state hydration or planner, author, durability, and publish
callbacks; valid stable-root and changed-CWD `ekrt2` resumes still pass.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Finding Disposition

| Finding                                                      | Disposition          | Evidence                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I4-R4 — mutable relative-root text enables `ekrt1` downgrade | **Resolved**         | `verifySetPlanResumeToken()` has no v1 branch and rejects every non-v2 token before hashing or retained-request parsing. Both genuine relative-root and rewritten-current-package v1 integration regressions fail closed before callbacks. |
| I4-R3 — canonical root not externally authenticated          | **Remains resolved** | V2 hashing binds canonical root, exact request bytes, run ID, and all set-plan bytes. Coordinated root retarget plus retained-root rewrite rejects the original token.                                                                     |
| I4-R2 — configured-root retarget                             | **Remains resolved** | Stable configured-root symlink resume passes; retargeted roots and coordinated rewrites reject before durability.                                                                                                                          |
| I4-R1 — run-root symlink escape                              | **Remains resolved** | Run-root symlinks and canonical containment escapes reject before package adoption.                                                                                                                                                        |
| C1-R1 — complete artistic graph semantics                    | **Remains resolved** | Direction and complete node/edge semantic mutation coverage passed before critic invocation.                                                                                                                                               |
| Original C2 — normalized backlink escape                     | **Remains resolved** | Canonical backlink and CLI archive normalization suites passed, including literal and encoded dot segments.                                                                                                                                |
| Original I1 — mutable bytes labeled as reviewed Git          | **Remains resolved** | Adapter tests continue to bind reviewed Git blobs and reject dirty or untracked artifacts.                                                                                                                                                 |
| Original I2 — catalog trusts candidate origin                | **Remains resolved** | Catalog validation derives exact URLs from the configured normalized publish root and rejects origin/base/path drift.                                                                                                                      |
| Original I3 — completion fixtures regress                    | **Remains resolved** | Completion integration, package consumers, and explainer smoke coverage passed.                                                                                                                                                            |

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md`, `plan.md`,
`implementation.md`, source review
`reviews/20260729-p04-code-review-r4.md`, authoritative implementation range,
all four p04-t14 changed files, `scripts/run.mjs` resume ordering, focused test
suites, and an independent changed-CWD probe. This project uses import mode;
`spec.md` and `design.md` are absent and not required.

### Requirements Coverage

| Requirement                                       | Status      | Notes                                                                                                                                                                                |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reject every `ekrt1` token                        | Implemented | Both correctly derived relative-root and rewritten-current-package tokens fail with `E_APPROVAL_RESUME`.                                                                             |
| Reject before hydration and callbacks             | Implemented | `loadResumableRun()` verifies the token before parsing `run-request.json`; `runExplainer()` hydrates only after `loadResumableRun()` returns. Callback counters remain unchanged.    |
| Fixed-format authenticated `ekrt2` only           | Implemented | Production accepts exactly `ekrt2:` plus 64 lowercase hex characters.                                                                                                                |
| Bind root, request, run, and set plan             | Implemented | V2 hashes the canonical root, run ID, exact request bytes, and raw bytes for all five set-plan records with domain and path separation.                                              |
| Timing-safe comparison                            | Implemented | Fixed-format candidates have equal length and are compared with `timingSafeEqual`.                                                                                                   |
| Preserve valid stable-root and changed-CWD resume | Implemented | Stable root and stable configured-root symlink tests pass; an independent relative-root pause followed by absolute-root resume from a different CWD passed with the issued v2 token. |
| Reject malformed, mismatched, and tampered v2     | Implemented | Closed-format, one-byte token mutation, request-byte mutation, set-plan-byte mutation, coordinated plan mutation, root retarget, and symlink cases pass fail-closed coverage.        |
| Preserve earlier Phase p04 behavior               | Implemented | Graph, backlink, reviewed-blob, catalog-root, completion-provenance, and root-confinement suites all pass.                                                                           |

### Extra Work

None in p04-t14. Tracking commits after the implementation head were inspected
only to establish scope and excluded from product findings.

## Independent Verification

- `git diff --check 996229cf..9d7d6501` — passed.
- Records and core integration tests — **88/88 passed**.
- Focused graph, backlink, catalog, recap, adapter, and completion suites —
  **136/136 passed**.
- CLI archive and packed public-package contract tests — **77/77 passed**.
- Explainer cross-consumer and packaged-layout smoke tests — **8/8 passed**.
- Genuine relative-root `ekrt1` — rejected with `E_APPROVAL_RESUME`; planner
  and author counts unchanged; durability and publish remained at zero.
- Rewritten-current-package `ekrt1` — rejected with `E_APPROVAL_RESUME`; planner
  and author counts unchanged; durability and publish remained at zero.
- Valid stable-root `ekrt2` — passed and resumed the original run.
- Independent valid changed-CWD `ekrt2` probe — passed, resumed the original
  canonical run root, and completed `built-not-durable`.
- Malformed, mismatched, request-tampered, set-plan-tampered, root-retargeted,
  and symlink-relocated v2 cases — rejected before external callbacks.

## Changed-file and Call-order Confirmation

Task commit `9d7d650172fe40e5ddd8590ac2ea3078cc700ed4` changes exactly the
four declared p04-t14 files:

- `.agents/skills/explainer-kit/references/contracts.md`
- `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- `.agents/skills/explainer-kit/tests/records.test.mjs`
- `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

The relevant unchanged call path was also inspected. `runExplainer()` calls
`loadResumableRun()` before constructing resumable state.
`loadResumableRun()` confines the root, constructs the minimal run identity,
and calls `verifySetPlanResumeToken()` before reading retained
`run-request.json`. Only after successful verification and request-identity
checks can `runExplainer()` call `hydrateResumableState()`.

## Verification Commands

```bash
git diff --check 996229cfad5392a45681e91e0084b4684acbcb47..9d7d650172fe40e5ddd8590ac2ea3078cc700ed4
node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
node --test .agents/skills/explainer-kit/tests/diagram.test.mjs .agents/skills/explainer-kit/tests/fact-base.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/release/public-package-contract.test.ts
node --test tools/smoke/explainer-kit/*.test.mjs
```

## Recommended Next Step

Phase p04 passes this explicitly authorized closure review. Do not create
further remediation tasks; return closure control to the root project workflow.
