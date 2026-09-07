---
oat_generated: true
oat_generated_at: 2026-08-31T14:50:00Z
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 2be3bd5121038e6ef9f1e7a04b06808c17bfd352
oat_review_range: ea0a596eef46b02fc8c5c024ff619ee6f1a237e6..2be3bd5121038e6ef9f1e7a04b06808c17bfd352
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/artifact-p02-code-review-2026-08-31T135618Z.md
oat_prior_review_head_sha: ea0a596eef46b02fc8c5c024ff619ee6f1a237e6
oat_phase_code_head_sha: bbbb3857cc793eb9a6def31e75cf6af65cccfa9f
oat_phase_code_range: 062ad12d5abefad2ec52c6db0603f3bb47bdabbd..bbbb3857cc793eb9a6def31e75cf6af65cccfa9f
oat_review_fix_range: 566500404..bbbb3857cc793eb9a6def31e75cf6af65cccfa9f
---

# Code Re-review: p02

**Reviewed:** 2026-08-31T14:50:00Z
**Scope:** Phase p02, Reconciliation and Safety Engine, tasks p02-t01 through p02-t09
**Files reviewed:** 18 phase source/test files, five project/review artifacts, and the p01 operation-preview persistence contract
**Commits:** Complete phase range `062ad12d5abefad2ec52c6db0603f3bb47bdabbd..bbbb3857cc793eb9a6def31e75cf6af65cccfa9f`; focused fix range `566500404..bbbb3857cc793eb9a6def31e75cf6af65cccfa9f`
**Review head:** `2be3bd5121038e6ef9f1e7a04b06808c17bfd352`
**Phase code head:** `bbbb3857cc793eb9a6def31e75cf6af65cccfa9f`

## Summary

The approval-freshness/preview-instance fix and accepted-all-mismatch
postcondition fix are correct, and the common single-line quoted credential
fixtures added for snapshot retention pass. Phase p02 remains blocked because
credential-shaped values can still survive two P0 safety boundaries: multiline
quoted assignments retain a secret suffix in snapshots, and quoted assignments
are neither redacted from concise previews nor rejected as approval evidence.
The two prior nonblocking Medium findings remain unchanged.

Findings: 2 critical, 0 important, 2 medium, 0 minor

## Review Scope and Dispatch

- Request: `review-p02-r2-20260831T1450Z`
- Caller/action/role: `oat-project-implement` / `review` / `reviewer`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Model/effort/service: `gpt-5.6-sol` / `high` / `priority`
- Task class/model floor: `consequential` / `consequential`; floor satisfied
- Authority: read-only except this review artifact
- Artifacts used: `spec.md`, `design.md`, `plan.md`, `implementation.md`, and
  `reviews/artifact-p02-code-review-2026-08-31T135618Z.md`

Delegated reviewer-local reconnaissance was not attempted. The phase range,
fix range, artifacts, all p02 source/tests, and load-bearing probes were checked
directly.

## Findings

### Critical

- **C1: Multiline quoted credential assignments retain their secret suffix in snapshots**
  (`packages/cli/src/commands/pjm/remote/snapshot.ts:32`)
  - Issue: `QUOTED_CREDENTIAL_ASSIGNMENT` uses `.*?` without dot-all behavior,
    so a quoted YAML/config value spanning a newline is only partially handled.
    The subsequent unquoted matcher stops at the newline. A direct probe with
    `password: "prefix\nACTUAL_SECRET_123"` produced
    `password: [REDACTED:CREDENTIAL]\nACTUAL_SECRET_123"`; lines 56-93 then
    place the surviving suffix into the persisted snapshot. The round-one fix
    therefore resolves the added single-line fixtures but not the P0 rule that
    high-confidence credential values are removed before persistence.
  - Fix: parse or scan quoted assignments through the matching quote across
    line boundaries, including escaped quotes, and replace the complete value.
    Add multiline JSON/YAML/config fixtures in every retained core field and
    assert that no prefix or suffix survives plus redaction metadata is set.
  - Requirement: FR12, NFR1

- **C2: Quoted credentials remain visible in concise previews and valid as approval evidence**
  (`packages/cli/src/commands/pjm/remote/preview.ts:89`)
  - Issue: `CREDENTIAL_EVIDENCE` still requires a credential key to be
    immediately followed by `:` or `=`, so quoted JSON-style keys bypass it.
    A title of `{"api_key":"abcdefghijklmnopqrstuvwxyz123456"}` is returned
    verbatim by `renderConcise()` at lines 191-199. The same value in
    `PreviewApproval.source` is accepted by `isSafeEvidence()` at lines 211-218,
    and `validatePreviewApproval()` returns `valid: true`. This violates the
    p02-t07 contract for safe preview rendering and non-secret approval
    evidence and the NFR1 prohibition on credentials in previews or approval
    records.
  - Fix: share the credential detector/sanitizer used for snapshot boundaries
    or otherwise cover quoted key forms consistently. Redact concise preview
    values and reject approval actor/source evidence for quoted and unquoted
    credential assignments; add representative JSON/YAML fixtures for both
    paths.
  - Requirement: FR8, NFR1, NFR2

### Important

None.

### Medium

- **M1: Near-miss malformed managed markers are still treated as absent**
  (`packages/cli/src/commands/pjm/remote/managed-markdown.ts:33`)
  - Issue: sentinel discovery still recognizes only the exact space before
    `-->`; edited near-miss markers can therefore be classified as absent and a
    second managed block can be inserted.
  - Fix: detect sentinel-like malformed target markers separately and return
    `choice-required`; add spacing, casing, truncation, and edited-ID fixtures.
  - Requirement: FR7, NFR2

- **M2: Preview canonicalization remains locale-dependent**
  (`packages/cli/src/commands/pjm/remote/preview.ts:251`)
  - Issue: object keys are still sorted with `localeCompare`, so canonical
    digests can differ across host locales.
  - Fix: use a locale-independent code-unit/code-point ordering or a documented
    canonical JSON implementation and add a cross-locale regression.
  - Requirement: FR8, NFR3

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`,
`implementation.md`, the prior p02 review artifact, all 18 p02 source/test
files, and the p01 strict operation-preview schema for composition context.

| Task    | Requirements/design                   | Status      | Notes                                                                             |
| ------- | ------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| p02-t01 | FR3 purpose intersection              | inherited   | No regression found in the complete-range check.                                  |
| p02-t02 | FR6/FR18 bounded local projection     | inherited   | Recovered p01-schema composition remains intact.                                  |
| p02-t03 | FR12/NFR1 bounded non-secret snapshot | partial     | Common single-line quoted forms are fixed; C1 retains multiline quoted suffixes.  |
| p02-t04 | FR7 managed content                   | partial     | Prior M1 remains nonblocking for this review gate.                                |
| p02-t05 | FR6/FR9 three-way reconciliation      | inherited   | No regression found in the complete-range check.                                  |
| p02-t06 | FR7/FR8/NFR2 authority                | inherited   | No regression found in the complete-range check.                                  |
| p02-t07 | FR8/NFR1/NFR2/NFR6 preview/approval   | partial     | Freshness and instance binding are fixed; C2 and prior M2 remain.                 |
| p02-t08 | FR11/FR14/FR15/NFR3 operation state   | inherited   | No regression found in the complete-range check.                                  |
| p02-t09 | FR11/NFR2 postcondition verification  | implemented | Accepted all-mismatch readback now becomes uncertain and requires reconciliation. |

### Extra Work

None.

## Previous Blocking-Finding Disposition

| Prior finding                              | Disposition            | Evidence                                                                                                                                                       |
| ------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 quoted snapshot credentials             | **Partially resolved** | Single-line quoted fixtures pass, but C1 above proves a valid multiline quoted value still persists a secret suffix.                                           |
| I1 approval predates/detaches from preview | **Resolved**           | `createdAt` participates in the digest; validation rejects approval-before-preview and future evidence; regenerated identical previews have different digests. |
| I2 accepted all-mismatch readback          | **Resolved**           | The result is now `uncertain` with `reconcile-required` and `requiresReconciliation: true`.                                                                    |

## Verification Assessment

- `git status --short`: clean before the review artifact write.
- `git diff --check 062ad12d5..bbbb3857c`: passed.
- Complete p02 phase suite: 9 files passed, 82/82 tests.
- Direct snapshot probe reproduced C1 with a surviving multiline secret suffix.
- Direct preview probes reproduced C2: quoted credential title rendered
  verbatim and quoted credential approval source accepted.
- Direct source/diff inspection verified the prior I1 and I2 repairs.
- The implementation record reports format, CLI type-check, lint, check, build,
  and uncached full CLI 4,797/4,797 passing. Those broad gates were not rerun by
  this reviewer.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/purpose-policy.test.ts src/commands/pjm/remote/local-projection.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/reconcile.test.ts src/commands/pjm/remote/authority.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/operation-state.test.ts src/commands/pjm/remote/verification.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/verification.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

## Terminal Outcome

**BLOCK** — Phase p02 does not pass because 2 Critical findings remain. The
prior approval-freshness and postcondition-classification blockers are resolved,
but credential safety is not yet complete. Run `oat-project-review-receive` to
convert the findings into one bounded credential-safety repair, then re-review
p02.
