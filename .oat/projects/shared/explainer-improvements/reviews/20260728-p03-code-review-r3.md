---
oat_generated: true
oat_generated_at: 2026-07-29T01:56:47Z
oat_review_scope: p03
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Re-review: Phase p03 Remediation Attempt 3/3

**Reviewed:** 2026-07-29T01:56:47Z  
**Authoritative implementation range:** `08565a93..df75722873638a957a24983974f9ce6087ae512c`  
**Implementation head:** `df75722873638a957a24983974f9ce6087ae512c`  
**Current tracking head excluded from implementation judgment:** `dbeca28d597317917e8ec3665fe2f456bb09633d`  
**Scope:** C1-R2 and p03-t21, plus regression checks for strict PNG decoding, raw-byte evidence binding, immutable package hashing, and canonical package coverage  
**Files changed in scope:** 6

## Verdict

**PASS — Phase p03 may close and proceed to p04-t01.**

C1-R2 is resolved. The decoded screenshot identity now commits to canonical
width, height, bit depth, color type, channel count, and reconstructed pixels.
Browser QA stores that identity, and visual review re-decodes snapshotted bytes
and compares the complete identity before invoking the critic. The valid
`320x640` to `640x320` identical-pixel reshape attack fails with
`E_VISUAL_REVIEW` and zero critic calls.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Evidence Sources

- `reviews/20260728-p03-code-review-r2.md`
- `plan.md`
- `implementation.md`
- `state.md`
- `references/imported-plan.md`
- Complete authoritative range
  `08565a93..df75722873638a957a24983974f9ce6087ae512c`
- Current production and test sources at tracking head `dbeca28d`; the only
  post-implementation changes are `implementation.md` and `state.md`, so no
  later implementation was included in the judgment

## C1-R2 Disposition

| Required property                                    | Disposition  | Exact evidence                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bind width and height                                | **Resolved** | `png.mjs:197-200` serializes both as fixed-width big-endian integers before hashing; `png.test.mjs:30-43` proves `2x1` and `1x2` images with identical reconstructed bytes have different decoded identities.                                     |
| Bind bit depth                                       | **Resolved** | `png.mjs:161-186` validates and retains the decoded bit depth; `png.mjs:197-205` places it at descriptor byte 8 before hashing.                                                                                                                   |
| Bind color type and channels                         | **Resolved** | `png.mjs:161-186` derives channels from the accepted RGB/RGBA color type; `png.mjs:201-205` includes both values in the domain-separated identity.                                                                                                |
| Bind reconstructed pixels                            | **Resolved** | `png.mjs:134-148` hashes the output of complete scanline reconstruction, and `png.mjs:203-207` appends those pixels after the canonical descriptor.                                                                                               |
| Carry identity from browser QA                       | **Resolved** | `qa.mjs:810-821` decodes the exact retained screenshot bytes and verifies viewport geometry; `qa.mjs:837-847` stores `decoded.decodedHash` with the evidence item.                                                                                |
| Re-decode immediately before critic                  | **Resolved** | `visual-review.mjs:80-105` snapshots and decodes the current screenshot bytes and compares `decoded.decodedHash`; `visual-review.mjs:26-43` completes request construction before the critic callback is invoked.                                 |
| Reject reshape before critic                         | **Resolved** | `run.integration.test.mjs:1114-1182` performs the real QA-to-review replacement and asserts `built-needs-review`, `visualCritic` call count 0, `640x320` retained geometry, and `E_VISUAL_REVIEW`. Independent probe reproduced the same failure. |
| Preserve raw-byte request binding                    | **Resolved** | `visual-review.mjs:120-136` keeps raw screenshot and metrics byte hashes in the canonical request and request hash; `visual-review.mjs:270-305` snapshots and hashes file bytes independently of decoded identity.                                |
| Preserve request/result and immutable package hashes | **Resolved** | `records.mjs:186-232` validates the bound request/result, copies evidence against request byte hashes, and writes both records; `run.mjs:1741-1769` hashes browser evidence and all visual-review records into `manifest.immutableHashes`.        |

## Independent Probe Evidence

The probe generated valid PNGs over the same `320 * 640 * 4` reconstructed
RGBA buffer, decoded the first as `320x640`, replaced it with `640x320`, carried
the original QA decoded identity into `runVisualReview()`, and instrumented the
critic callback.

```text
{"qaGeometry":"320x640","swappedGeometry":"640x320","sameReconstructedPixels":true,"sameDecodedIdentity":false,"descriptorFieldsChecked":["width","height","bitDepth","colorType","channels","pixels"],"failureCode":"E_VISUAL_REVIEW","criticCalls":0}
```

The probe also independently reconstructed the documented v1 preimage and
matched the production digest exactly. Mutating each descriptor position for
width, height, bit depth, color type, or channels changed the digest; mutating
one reconstructed pixel also changed it.

## Regression Checks

| Prior Phase p03 property                  | Result   | Evidence                                                                                                                                                                                                                    |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict full PNG decoding                  | **Pass** | `png.mjs:15-139,161-186,214-238` still enforces signature, chunk structure/CRCs, supported profile, bounded exact zlib consumption, scanline reconstruction, and final IEND. `png.test.mjs:45-179` remains green.           |
| Raw screenshot/request/result binding     | **Pass** | Decoded identity is additive; the request still carries raw screenshot/metrics hashes and the result must echo the canonical request identity. Focused and expanded suites passed.                                          |
| Immutable successful package coverage     | **Pass** | `records.mjs:403-445`, `run.mjs:1741-1769`, and the canonical enumerator continue to require and hash retained package bytes.                                                                                               |
| One canonical package-coverage enumerator | **Pass** | `package-coverage.mjs:1-73` remains the single versioned contract. The cross-consumer smoke passed an untouched core package through finalizer, archive, and push, and `cmp` proved the bundled CLI copy is byte-identical. |
| Partial review-chain exemption            | **Pass** | `package-coverage.mjs:51-73` exempts only `built-needs-review`; failed, incomplete, and successful packages with retained review material still require canonical complete attempts.                                        |
| Tracking-only current HEAD                | **Pass** | `df757228..dbeca28d` changes only project `implementation.md` and `state.md`; implementation judgment remains pinned to `df757228`.                                                                                         |

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** imported source, normalized plan, implementation,
state, prior re-review, authoritative commit range, production sources, tests,
and independent probes. Spec/design alignment is not applicable because this is
an import-mode project without spec or design artifacts.

| Requirement        | Status      | Notes                                                                                                                           |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| C1-R2              | implemented | Complete decoded identity crosses the QA-to-critic boundary and the demonstrated reshape attack fails before critic invocation. |
| p03-t21 step 1     | implemented | Integrated `320x640` to `640x320` identical-pixel regression is present and independently reproduced.                           |
| p03-t21 step 2     | implemented | Identity includes width, height, bit depth, color type, channels, and reconstructed pixels.                                     |
| p03-t21 step 3     | implemented | QA carries the decoded identity; visual review re-decodes snapshots while retaining independent raw-byte and package hashes.    |
| p03-t21 acceptance | implemented | Decoded geometry/profile cannot change while preserving authenticated identity.                                                 |

**Extra work:** None. The authoritative range contains one task commit and only
the six declared p03-t21 files.

## Verification Commands and Results

```bash
git diff --check 08565a93..df75722873638a957a24983974f9ce6087ae512c
git diff --name-only df75722873638a957a24983974f9ce6087ae512c..dbeca28d597317917e8ec3665fe2f456bb09633d
```

Result: clean implementation diff; the excluded tracking delta contains only
`implementation.md` and `state.md`.

```bash
node --test \
  .agents/skills/explainer-kit/tests/png.test.mjs \
  .agents/skills/explainer-kit/tests/qa.test.mjs \
  .agents/skills/explainer-kit/tests/run.integration.test.mjs
```

Result: **90/90 passed**, zero skipped. The installed-Chromium actual-core
integration passed.

```bash
node --test \
  .agents/skills/explainer-kit/tests/png.test.mjs \
  .agents/skills/explainer-kit/tests/browser-runtime.test.mjs \
  .agents/skills/explainer-kit/tests/qa.test.mjs \
  .agents/skills/explainer-kit/tests/run.integration.test.mjs \
  .agents/skills/explainer-kit/tests/records.test.mjs \
  .agents/skills/explainer-kit/tests/contracts.test.mjs \
  .agents/skills/explainer-kit/tests/durability.test.mjs \
  .agents/skills/explainer-kit/tests/rebuildability.test.mjs \
  .agents/skills/explainer-kit/tests/schemas.test.mjs \
  .agents/skills/explainer-kit/tests/e2e-recap.test.mjs \
  .agents/skills/oat-explainer-kit/tests/check-core.test.mjs \
  .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs \
  .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs \
  .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
```

Result: **230/230 passed**, zero skipped.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/archive/archive-utils.test.ts \
  src/commands/project/archive/push-runner.test.ts \
  src/release/public-package-contract.test.ts \
  src/validation/skills.test.ts
node --test tools/smoke/explainer-kit/*.test.mjs
cmp -s \
  .agents/skills/explainer-kit/scripts/lib/package-coverage.mjs \
  packages/cli/assets/skills/explainer-kit/scripts/lib/package-coverage.mjs
```

Result: CLI **192/192 passed**; smoke **7/7 passed**; canonical and bundled
package-coverage modules are byte-identical.

Root-recorded verification in `implementation.md` and `state.md` additionally
reports `pnpm check`, lint, format, type-check, build, full test, and release
validation passing for all five public packages and 65 visual measurements.

## Recommended Next Step

Close Phase p03 as passed and continue directly to p04-t01.
