---
oat_generated: true
oat_generated_at: 2026-08-31T15:05:00Z
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 734a15f492e1f3e7cb5340245382da3c0633d47e
oat_review_range: 2be3bd5121038e6ef9f1e7a04b06808c17bfd352..734a15f492e1f3e7cb5340245382da3c0633d47e
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/artifact-p02-code-rereview-2026-08-31T145000Z.md
oat_prior_review_head_sha: 2be3bd5121038e6ef9f1e7a04b06808c17bfd352
oat_phase_code_head_sha: eed80d5ab6b297d19da4569ca9963e25fd53b57d
oat_phase_code_range: 062ad12d5abefad2ec52c6db0603f3bb47bdabbd..eed80d5ab6b297d19da4569ca9963e25fd53b57d
oat_review_fix_range: 40002cc5ba36f1c1754fcb530466e617bfd536a1..eed80d5ab6b297d19da4569ca9963e25fd53b57d
---

# Code Final Review: p02

**Reviewed:** 2026-08-31T15:05:00Z
**Scope:** Phase p02, Reconciliation and Safety Engine, tasks p02-t01 through p02-t09
**Files reviewed:** 18 phase source/test files and six project/review artifacts
**Commits:** Complete phase range `062ad12d5abefad2ec52c6db0603f3bb47bdabbd..eed80d5ab6b297d19da4569ca9963e25fd53b57d`; focused second-fix range `40002cc5ba36f1c1754fcb530466e617bfd536a1..eed80d5ab6b297d19da4569ca9963e25fd53b57d`
**Review head:** `734a15f492e1f3e7cb5340245382da3c0633d47e`
**Phase code head:** `eed80d5ab6b297d19da4569ca9963e25fd53b57d`

## Summary

All five blockers from the first two reviews are resolved: quoted and
multiline quoted snapshot assignments redact completely, previews and approval
evidence now reject the quoted fixtures, approvals are bound to a fresh preview
instance, and accepted all-mismatch read-back requires reconciliation. Phase
p02 nevertheless remains blocked because the same credential assignments pass
all three p02 safety boundaries when surrounded by ordinary non-JSON
punctuation. The two previously reported nonblocking Medium findings remain.

Findings: 1 critical, 0 important, 2 medium, 0 minor

## Review Scope and Dispatch

- Request: `review-p02-r3-20260831T1505Z`
- Caller/action/role: `oat-project-implement` / `review` / `reviewer`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Model/effort/service: `gpt-5.6-sol` / `high` / `priority`
- Task class/model floor: `consequential` / `consequential`; floor satisfied
- Authority: read-only except this review artifact
- Artifacts used: `spec.md`, `design.md`, `plan.md`, `implementation.md`,
  `reviews/artifact-p02-code-review-2026-08-31T135618Z.md`, and
  `reviews/artifact-p02-code-rereview-2026-08-31T145000Z.md`

Delegated reviewer-local reconnaissance was not attempted. The complete phase
range, focused fix range, artifacts, all p02 source/tests, and load-bearing
credential probes were checked directly.

## Findings

### Critical

- **C1: Punctuation-delimited credential assignments bypass snapshots, previews, and approval evidence**
  (`packages/cli/src/commands/pjm/remote/snapshot.ts:32`)
  - Issue: both snapshot assignment expressions require the credential key to
    begin at the string start or after whitespace, `{`, `,`, or `[`. The
    preview detector repeats the same restricted boundary at
    `packages/cli/src/commands/pjm/remote/preview.ts:89`. A direct probe with
    `(password=SECRET_PAREN)` retained the complete value with
    `contentRedacted: false` and rendered it verbatim in the concise preview;
    `(api_key=SECRET_APPROVAL)` was accepted as valid approval `source`
    evidence. Parenthesized assignments are still high-confidence
    credential-shaped values, so the current delimiter allowlist violates the
    P0 prohibition on credentials in snapshots, previews, and approval records.
  - Fix: define one shared credential-assignment boundary predicate/scanner for
    snapshot sanitization and preview/evidence detection. Recognize a key when
    it is not embedded in an identifier rather than enumerating a few allowed
    preceding delimiters, while retaining conservative value parsing. Add
    parenthesized and other ordinary punctuation-delimited fixtures across
    retained core fields, allowlisted extensions, concise previews, and both
    approval evidence fields; assert no credential bytes survive and approval
    validation fails closed.
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
  (`packages/cli/src/commands/pjm/remote/preview.ts:251`)
  - Issue: object keys are still sorted with `localeCompare`, so canonical
    digests can differ across host locales.
  - Fix: use locale-independent code-unit/code-point ordering or a documented
    canonical JSON implementation and add a cross-locale regression.
  - Requirement: FR8, NFR3

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`,
`implementation.md`, both prior p02 review artifacts, all 18 p02 source/test
files, and direct runtime probes against the shipped snapshot and preview
functions.

| Task    | Requirements/design                   | Status      | Notes                                                                                          |
| ------- | ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| p02-t01 | FR3 purpose intersection              | inherited   | No regression found in the complete-range inspection.                                          |
| p02-t02 | FR6/FR18 bounded local projection     | inherited   | The recovered strict p01-schema projection remains intact.                                     |
| p02-t03 | FR12/NFR1 bounded non-secret snapshot | partial     | Prior quoted/multiline blockers are resolved; C1 retains punctuation-delimited credentials.    |
| p02-t04 | FR7 managed content                   | partial     | Prior nonblocking M1 remains.                                                                  |
| p02-t05 | FR6/FR9 three-way reconciliation      | implemented | Complete-range inspection and phase tests found no regression.                                 |
| p02-t06 | FR7/FR8/NFR2 authority                | implemented | Exact precedence and immutable floors remain covered.                                          |
| p02-t07 | FR8/NFR1/NFR2/NFR6 preview/approval   | partial     | Prior quoted fixtures and freshness are fixed; C1 bypasses rendering/evidence, and M2 remains. |
| p02-t08 | FR11/FR14/FR15/NFR3 operation state   | implemented | Transition and reduction coverage remains green.                                               |
| p02-t09 | FR11/NFR2 postcondition verification  | implemented | Accepted all-mismatch read-back is uncertain and reconciliation-required.                      |

### Extra Work

None. The reviewed code maps to declared p02 tasks and bounded review repairs.

## Previous Blocking-Finding Disposition

| Prior finding                                                  | Disposition  | Evidence                                                                                                                    |
| -------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Round 1 C1: quoted JSON snapshot credentials                   | **Resolved** | Quoted JSON/YAML/config fixtures redact all retained core fields and no secret survives.                                    |
| Round 1 I1: approval predates or detaches from preview         | **Resolved** | Preview creation participates in the digest; earlier, future, expired, and regenerated-preview evidence fails validation.   |
| Round 1 I2: accepted all-mismatch read-back bypasses reconcile | **Resolved** | The all-mismatch result is `uncertain`, `reconcile-required`, and `requiresReconciliation: true`.                           |
| Round 2 C1: multiline/escaped quoted snapshot assignments      | **Resolved** | Multiline values with backslash-escaped and doubled quotes redact completely across title, description, priority, status.   |
| Round 2 C2: quoted preview and approval credential evidence    | **Resolved** | Quoted and unquoted JSON/YAML/config fixtures redact concise preview fields and reject both actor/source approval evidence. |

## Verification Assessment

- `git status --short`: clean before this review artifact write.
- `git diff --check 062ad12d5..eed80d5ab`: passed.
- Complete p02 phase suite: 9 files passed, 91/91 tests.
- CLI type-check: passed.
- Direct probes verified all five prior blockers and reproduced C1 in the
  current functions: the snapshot retained `(password=SECRET_PAREN)`, the
  preview rendered it verbatim, and approval validation accepted
  `(api_key=SECRET_APPROVAL)`.
- The implementation record reports format, CLI lint/check/build, and an
  uncached full CLI run of 4,806/4,806 tests with zero cached tasks. Those broad
  gates were not rerun by this reviewer.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/purpose-policy.test.ts src/commands/pjm/remote/local-projection.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/reconcile.test.ts src/commands/pjm/remote/authority.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/operation-state.test.ts src/commands/pjm/remote/verification.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/preview.test.ts src/commands/pjm/remote/verification.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

## Terminal Outcome

**BLOCK** — Phase p02 does not pass because one Critical credential-safety
finding remains. This is the third and final normal review cycle, so the block
is terminal for normal p02 governance. All previously reported Critical and
Important findings are resolved; any further repair requires an explicit
operator-directed exception or lifecycle decision.
