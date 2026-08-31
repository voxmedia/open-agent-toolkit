---
oat_generated: true
oat_generated_at: 2026-08-31T13:56:18Z
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: ea0a596eef46b02fc8c5c024ff619ee6f1a237e6
oat_phase_code_head_sha: c5be765e5fdabf175643994e93a2b5540e8fb1e4
oat_phase_code_range: 062ad12d5abefad2ec52c6db0603f3bb47bdabbd..c5be765e5fdabf175643994e93a2b5540e8fb1e4
---

# Code Review: p02

**Reviewed:** 2026-08-31T13:56:18Z
**Scope:** Phase p02, Reconciliation and Safety Engine, tasks p02-t01 through p02-t09
**Files reviewed:** 18 phase source/test files, five project artifacts, and the p01 strict schema contracts
**Commits:** 20 commits in `062ad12d5abefad2ec52c6db0603f3bb47bdabbd..c5be765e5fdabf175643994e93a2b5540e8fb1e4`
**Review head:** `ea0a596eef46b02fc8c5c024ff619ee6f1a237e6`
**Phase code head:** `c5be765e5fdabf175643994e93a2b5540e8fb1e4`

## Summary

Phase p02 is blocked. Purpose-policy intersection, local projection composition,
three-way classification, authority resolution, operation-state reduction, and
most verification behavior align with the specification and design, but the
phase has one credential-persistence vulnerability and two mutation-safety gaps
that violate P0 contracts. Two additional deterministic/managed-content gaps
should also be corrected before the phase is re-reviewed.

Findings: 1 critical, 2 important, 2 medium, 0 minor

## Review Scope and Dispatch

- Authoritative implementation range:
  `062ad12d5abefad2ec52c6db0603f3bb47bdabbd..c5be765e5fdabf175643994e93a2b5540e8fb1e4`
- Review-preparation range:
  `c5be765e5fdabf175643994e93a2b5540e8fb1e4..ea0a596eef46b02fc8c5c024ff619ee6f1a237e6`
- Request: `review-p02-20260831T135618Z`
- Caller/action/role: `oat-project-implement` / `review` / `reviewer`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Provider/context: `codex` / `root-native`
- Model/effort/service: `gpt-5.6-sol` / `high` / `priority`
- Policy/ceiling: `high` / `high`; selection was policy-resolved and matrix-pinned
- Task class/model floor: `consequential` / `consequential`; floor satisfied
- Retry/fallback: retry 0; caller-inline fallback; no below-floor downgrade
- Authority: p02 read plus this single review-artifact write

No delegated reviewer-local reconnaissance was attempted. All load-bearing
claims below were checked directly against the artifacts, phase code, tests,
and targeted runtime probes.

## Findings

### Critical

- **C1: Quoted credential assignments survive snapshot sanitization and are persisted**
  (`packages/cli/src/commands/pjm/remote/snapshot.ts:32`)
  - Issue: `CREDENTIAL_ASSIGNMENT` recognizes unquoted keys such as
    `api_key=value`, but the key pattern must be immediately followed by `:` or
    `=`. A common JSON value such as
    `{"api_key":"abcdefghijklmnopqrstuvwxyz123456"}` retains the credential
    byte-for-byte because the quote between `api_key` and `:` prevents a match,
    and the value has no provider-specific standalone prefix. A direct probe
    returned `contentRedacted: false`, `redactionCount: 0`, and the original
    credential in `issue.description`; lines 54-65 then place that value into
    the strict persisted snapshot. This violates FR12 and NFR1 and is a concrete
    secret-persistence vulnerability.
  - Fix: extend or replace the text redactor so high-confidence credential keys
    are detected in quoted JSON/YAML/config assignment forms, including optional
    quotes and whitespace around the key/operator. Add representative quoted
    `api_key`, `access_token`, `password`, and `authorization` fixtures across
    every retained core field and assert both value removal and visible
    redaction metadata before persistence.
  - Requirement: FR12, NFR1

### Important

- **I1: Approval evidence can predate the preview it supposedly approves**
  (`packages/cli/src/commands/pjm/remote/preview.ts:136`)
  - Issue: validation checks the approval against `now`, but never compares
    `approval.approvedAt` with `preview.createdAt`; the preview timestamp is also
    omitted from the digest at lines 111-117. A direct probe built a preview at
    `12:05Z`, supplied approval from `12:00Z`, and received
    `{ valid: true, reason: null }`. This does not satisfy FR8's requirement for
    fresh approval _after_ preview and permits replay of evidence from an older
    identical preview within the age window.
  - Fix: bind the approval to a specific preview instance (for example by
    including `createdAt` or a generated preview nonce in the digest) and reject
    approval timestamps earlier than the bound preview creation time. Add tests
    for approval-before-preview, exact-boundary time, regenerated identical
    previews, and expired/future evidence.
  - Requirement: FR8, NFR2

- **I2: An accepted attempt with wholly mismatched read-back bypasses reconciliation**
  (`packages/cli/src/commands/pjm/remote/verification.ts:172`)
  - Issue: when a provider outcome is `accepted`, revision evidence matches, and
    every requested field is present but mismatched, the function returns
    `rejected` with `retryDisposition: not-applicable` and
    `requiresReconciliation: false`. A direct two-field probe reproduced that
    result. Only an authoritative provider-declared non-commit belongs on the
    safe rejection path at lines 96-103; a post-attempt read-back mismatch may
    reflect silent field dropping, normalization, or another ambiguous effect.
    The current result leaves no durable blind-retry barrier despite FR11 and
    the design's no-retry-after-attempt rule.
  - Fix: classify accepted-but-mismatched postconditions as uncertain (or an
    equivalently explicit attempted/non-verified outcome) with
    `reconcile-required`. Reserve terminal `rejected` without reconciliation
    for authoritative provider non-commit evidence, and add all-mismatch tests
    that prove a new operation or transport cannot proceed before
    reconciliation.
  - Requirement: FR11, NFR2, NFR3

### Medium

- **M1: Near-miss malformed managed markers are treated as absent and duplicated**
  (`packages/cli/src/commands/pjm/remote/managed-markdown.ts:33`)
  - Issue: boundary recognition requires the exact space before `-->`. A body
    containing user-edited markers such as
    `<!-- OAT-MANAGED:bnd_binding_123:START-->` and the corresponding end marker
    is classified `absent`; `insertManagedMarkdown()` then appends a second OAT
    block instead of returning `choice-required`. This misses the design's
    malformed-sentinel safety case and can create two logically managed regions
    in one remote body.
  - Fix: detect OAT-managed sentinel-like structures separately from exact
    valid anchors and fail closed when any target or nested marker is malformed.
    Add spacing, casing, truncated-comment, and edited-binding-marker fixtures
    while preserving the exact-byte assertions for surrounding content.
  - Requirement: FR7, NFR2

- **M2: Canonical preview digests vary with the process locale**
  (`packages/cli/src/commands/pjm/remote/preview.ts:241`)
  - Issue: object keys are ordered with locale-sensitive `localeCompare`. The
    same preview input containing context keys `z` and `ä` produced different
    preview and target digests under `en_US.UTF-8` and `sv_SE.UTF-8`. That makes
    approval binding depend on host locale rather than only on the declared
    inputs, contrary to the deterministic digest and restart-safety design.
  - Fix: use a locale-independent canonical key order (code-unit/code-point
    comparison or a documented canonical JSON implementation) and add a test
    proving identical digests under different process locales.
  - Requirement: FR8, NFR3

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** `discovery.md`, `spec.md`, `design.md`, `plan.md`,
`implementation.md`, current p01 `schema.ts`, all 18 p02 source/test files, the
authoritative phase history, and targeted runtime probes.

| Task    | Requirements/design                   | Status                     | Notes                                                                                                                                                                |
| ------- | ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p02-t01 | FR3 purpose intersection              | implemented                | Field/lifecycle grants compose by intersection; incompatible closeout transition policy is choice-required.                                                          |
| p02-t02 | FR6/FR18 bounded local projection     | implemented after recovery | Output has exactly the p01 projection keys and parses successfully inside `RemoteBindingStateSchema`.                                                                |
| p02-t03 | FR12/NFR1 bounded non-secret snapshot | partial                    | Core allowlisting and extension bounds work, but C1 permits common quoted credential assignments to persist.                                                         |
| p02-t04 | FR7 managed content                   | partial                    | Valid anchors preserve surrounding bytes and exact malformed cases block, but M1 misses near-valid edited sentinels.                                                 |
| p02-t05 | FR6/FR9 three-way reconciliation      | implemented                | B/L/R classes, conflict choice, lifecycle/uncertainty blocking, description scopes, and optional priority mapping align.                                             |
| p02-t06 | FR7/FR8/NFR2 authority                | implemented                | Built-in, repository, provider, binding clamps, invalid-value fail-closed behavior, and hard floors match the design.                                                |
| p02-t07 | FR8/NFR2/NFR6 preview/approval        | partial                    | Load-bearing content changes invalidate digests and display is privacy-safe, but I1 breaks after-preview freshness; M2 breaks cross-locale determinism.              |
| p02-t08 | FR11/FR14/FR15/NFR3 operation state   | implemented                | Declared transition graph, dependency ordering, terminal states, partial reduction, and verified-step non-repetition align.                                          |
| p02-t09 | FR11/NFR2 postcondition verification  | partial                    | Exact, partial, ambiguous, missing-readback, revision-drift, and prior-verification paths are safe; I2 leaves the all-mismatch accepted path without reconciliation. |

### Extra Work

None. The reviewed code maps directly to p02 tasks.

## Recovery Disposition

The p02-t02 composition recovery is **recovered and independently validated**.
The original task commit is
`222d6e7986557d34b06479eb6e7c8dcb1bb3edaa`; reservation commit
`0a52ed8c215275fdf0bd426bcab2ab8f42292d75`; recovery commit
`c5be765e5fdabf175643994e93a2b5540e8fb1e4`. The recovered projection exposes
only `title`, `description`, `priority`, `source`, `sourceRevision`, and
`observedAt`, and a direct probe successfully parsed it as the
`localProjection` within the strict p01 `RemoteBindingStateSchema`. The recovery
ledger records one settled attempt with no pending marker.

## Verification Assessment

- Independently reran all nine task-focused suites: 9 files passed, 79/79 tests.
- Independently probed p01/p02 schema composition: passed.
- Independently reproduced C1, I1, I2, M1, and M2 with read-only runtime probes.
- The implementation record reports passing format, CLI type-check/lint/check/build,
  plus an uncached full CLI run of 326 files and 4,794 tests with zero cached
  tasks. Those broader commands were not rerun in this review; the passing
  focused suite does not cover the five reproduced gaps.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/purpose-policy.test.ts src/commands/pjm/remote/local-projection.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/reconcile.test.ts src/commands/pjm/remote/authority.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/operation-state.test.ts src/commands/pjm/remote/verification.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/verification.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

## Terminal Outcome

**BLOCK** — Phase p02 does not pass because the review found 1 Critical and 2
Important findings. Run `oat-project-review-receive` to convert the findings
into recovery tasks, then re-review p02 after the fixes and focused regression
tests are complete.
