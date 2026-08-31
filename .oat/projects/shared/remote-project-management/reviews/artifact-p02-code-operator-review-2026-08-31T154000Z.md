---
oat_generated: true
oat_generated_at: 2026-08-31T15:40:00Z
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 4daa8013a328da23f357161869fa6234b2ce1bcc
oat_review_range: 734a15f492e1f3e7cb5340245382da3c0633d47e..4daa8013a328da23f357161869fa6234b2ce1bcc
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/artifact-p02-code-final-review-2026-08-31T150500Z.md
oat_prior_review_head_sha: 734a15f492e1f3e7cb5340245382da3c0633d47e
oat_phase_code_head_sha: 831e110beff1aa8065926409f4819fec834cfc3c
oat_phase_code_range: 062ad12d5abefad2ec52c6db0603f3bb47bdabbd..831e110beff1aa8065926409f4819fec834cfc3c
oat_review_fix_range: f72717fdf..831e110beff1aa8065926409f4819fec834cfc3c
---

# Code Operator Review: p02

**Reviewed:** 2026-08-31T15:40:00Z
**Scope:** Phase p02, Reconciliation and Safety Engine, tasks p02-t01 through p02-t09
**Files reviewed:** 20 phase source/test files, four project artifacts, and three prior review artifacts
**Commits:** Complete phase range `062ad12d5abefad2ec52c6db0603f3bb47bdabbd..831e110beff1aa8065926409f4819fec834cfc3c`; operator-fix range `f72717fdf..831e110beff1aa8065926409f4819fec834cfc3c`
**Review head:** `4daa8013a328da23f357161869fa6234b2ce1bcc`
**Phase code head:** `831e110beff1aa8065926409f4819fec834cfc3c`

## Summary

The operator fix closes the previously reported punctuation-prefix bypass and
preserves the intended ASCII identifier-substring negative controls. Phase p02
still cannot pass: the shared scanner can redact only the first segment of a
detected shell/YAML credential value, and JavaScript-style bracket assignments
bypass the shared detector entirely. Both cases leave credential bytes in a
persisted snapshot; bracket assignments also render in concise previews and
are accepted as approval evidence.

Findings: 2 critical, 0 important, 2 medium, 0 minor

## Review Scope and Dispatch

- Request: `review-p02-r4-operator-20260831T1540Z`
- Caller/action/role: `oat-project-implement` / `review` / `reviewer`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Model/effort/service: `gpt-5.6-sol` / `high` / `priority`
- Task class/model floor: `consequential` / `consequential`; floor satisfied
- Authority: read-only except this review artifact
- Artifacts used: `spec.md`, `design.md`, `plan.md`, `implementation.md`, and
  all three prior p02 review artifacts

Delegated reviewer-local reconnaissance was not attempted. The complete phase
range, operator-fix range, phase artifacts, all p02 source/tests, and
load-bearing credential probes were checked directly.

## Findings

### Critical

- **C1: Detected multi-segment credential values are only partially redacted before persistence**
  (`packages/cli/src/commands/pjm/remote/credential-safety.ts:32`)
  - Issue: quoted handling stops at the first closing quote, while unquoted
    handling stops at the first whitespace or comma without honoring escapes
    or the remainder of a valid YAML scalar. Direct probes produced
    `password=[REDACTED:CREDENTIAL] SECRET_SUFFIX` from both
    `password: SECRET_PREFIX SECRET_SUFFIX` and
    `password=SECRET_PREFIX\\ SECRET_SUFFIX`, and produced
    `password="[REDACTED:CREDENTIAL]"'SECRET_SUFFIX'` from the valid shell
    concatenation `password="SECRET_PREFIX"'SECRET_SUFFIX'`.
    `sanitizeRemoteSnapshot()` persisted the surviving suffix with
    `contentRedacted: true`, creating a false impression that the complete
    credential value was removed. This violates the hard FR12/NFR1 persistence
    boundary and the operator review's escaped-value objective.
  - Fix: make assignment-value scanning syntax-aware enough to consume escaped
    unquoted characters and adjacent quoted/unquoted shell segments, and define
    a fail-closed line/value boundary for YAML plain scalars. Alternatively,
    redact the entire containing field when a high-confidence assignment cannot
    be consumed unambiguously. Add snapshot regressions that assert no prefix or
    suffix survives escaped whitespace, adjacent quote segments, multiline line
    continuations, or multiword/comma-bearing plain values.
  - Requirement: FR12, NFR1

- **C2: Bracket-notation credential assignments bypass every p02 evidence boundary**
  (`packages/cli/src/commands/pjm/remote/credential-safety.ts:1`)
  - Issue: the prefix expression requires `:` or `=` immediately after the
    credential key's optional closing quote. Common JavaScript-style assignment
    `config["password"]="BRACKET_SECRET"` inserts `]` between the quoted key
    and operator, so `containsCredentialAssignment()` returns false. A direct
    probe showed `sanitizeRemoteSnapshot()` retaining the entire value with
    `contentRedacted: false`; `buildBindingPreview()` rendered it verbatim; and
    `validatePreviewApproval()` accepted the same string as `source` evidence.
    This is a punctuation/quoted-key assignment, not an identifier substring,
    and violates FR8, FR12, NFR1, and NFR2.
  - Fix: extend the shared scanner's key/operator grammar to recognize validated
    bracket-property forms such as `["password"] = value` and
    `['api_key'] = value` without matching larger identifier keys. Exercise the
    shared detector, all retained core fields, allowlisted extensions, concise
    previews, and both approval evidence fields with positive bracket-notation
    fixtures and neighboring-key negative controls.
  - Requirement: FR8, FR12, NFR1, NFR2

### Important

None.

### Medium

- **M1: Near-miss malformed managed markers are still treated as absent**
  (`packages/cli/src/commands/pjm/remote/managed-markdown.ts:33`)
  - Issue: sentinel discovery still recognizes only the exact space before
    `-->`; edited near-miss markers can be classified as absent and followed by
    a second managed block.
  - Fix: detect sentinel-like malformed target markers separately and return
    `choice-required`; add spacing, casing, truncation, and edited-ID fixtures.
  - Requirement: FR7, NFR2

- **M2: Preview canonicalization remains locale-dependent**
  (`packages/cli/src/commands/pjm/remote/preview.ts:259`)
  - Issue: object keys remain sorted with `localeCompare`, so canonical digests
    can vary across host locales.
  - Fix: use locale-independent code-unit/code-point ordering or a documented
    canonical JSON implementation and add a cross-locale regression.
  - Requirement: FR8, NFR3

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`,
`implementation.md`, all three prior p02 review artifacts, all 20 p02
source/test files, the complete phase and operator-fix diffs, and direct runtime
probes against the scanner, snapshot, preview, and approval functions.

| Task    | Requirements/design                   | Status      | Notes                                                                                         |
| ------- | ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| p02-t01 | FR3 purpose intersection              | inherited   | Complete-range inspection and the focused phase suite found no regression.                    |
| p02-t02 | FR6/FR18 bounded local projection     | inherited   | The recovered strict p01-schema projection remains intact.                                    |
| p02-t03 | FR12/NFR1 bounded non-secret snapshot | partial     | The prior punctuation prefix is fixed, but C1 and C2 still persist credential bytes.          |
| p02-t04 | FR7 managed content                   | partial     | Prior nonblocking M1 remains.                                                                 |
| p02-t05 | FR6/FR9 three-way reconciliation      | implemented | Complete-range inspection and phase tests found no regression.                                |
| p02-t06 | FR7/FR8/NFR2 authority                | implemented | Exact precedence and immutable floors remain covered.                                         |
| p02-t07 | FR8/NFR1/NFR2/NFR6 preview/approval   | partial     | Prior freshness and punctuation fixtures pass, but C2 bypasses rendering and approval safety. |
| p02-t08 | FR11/FR14/FR15/NFR3 operation state   | implemented | Transition and reduction coverage remains green.                                              |
| p02-t09 | FR11/NFR2 postcondition verification  | implemented | Accepted all-mismatch read-back remains reconciliation-required.                              |

### Extra Work

None. The reviewed code maps to declared p02 tasks and the bounded operator
repair.

## Previous Blocking-Finding Disposition

| Prior finding                                                  | Disposition  | Evidence                                                                                                                             |
| -------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Round 1 C1: quoted JSON snapshot credentials                   | **Resolved** | Single and multiline quoted JSON/YAML/config fixtures redact completely when the value is one syntactic segment.                     |
| Round 1 I1: approval predates or detaches from preview         | **Resolved** | Preview creation participates in the digest; earlier, future, expired, and regenerated-preview evidence fails validation.            |
| Round 1 I2: accepted all-mismatch read-back bypasses reconcile | **Resolved** | The result remains `uncertain`, `reconcile-required`, and `requiresReconciliation: true`.                                            |
| Round 2 C1: multiline/escaped quoted snapshot assignments      | **Resolved** | Backslash-escaped and doubled quotes inside one quoted segment redact through its matching quote; C1 is a distinct segmentation gap. |
| Round 2 C2: quoted preview and approval credential evidence    | **Resolved** | Direct quoted JSON/YAML/config fixtures redact concise fields and reject actor/source evidence.                                      |
| Round 3 C1: punctuation-delimited assignment prefix bypass     | **Resolved** | Parenthesis, bang, angle, period, slash, and JSON punctuation fixtures pass; identifiers such as `compassword` remain negative.      |

## Verification Assessment

- `git status --short`: clean before this review artifact write.
- `git diff --check 062ad12d5..831e110be`: passed.
- Complete p02 phase suite: 10 files passed, 123/123 tests.
- Direct probes verified all six prior Critical/Important findings and
  reproduced C1 and C2 against the current functions.
- The implementation record reports format, CLI type-check, lint, check, build,
  and an uncached full CLI run of 4,838/4,838 tests with zero cached tasks. Those
  broad gates were not rerun by this reviewer.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/purpose-policy.test.ts src/commands/pjm/remote/local-projection.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/reconcile.test.ts src/commands/pjm/remote/authority.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/operation-state.test.ts src/commands/pjm/remote/verification.test.ts src/commands/pjm/remote/credential-safety.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/credential-safety.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/preview.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

## Terminal Outcome

**BLOCK** — Phase p02 does not pass because two Critical credential-safety
findings remain. This is the single operator-authorized fourth review; normal
governance and the one-cycle exception are exhausted, so the result is terminal
and no fifth fix/review cycle is authorized.
