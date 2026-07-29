---
oat_generated: true
oat_generated_at: 2026-07-29T01:21:49Z
oat_review_scope: p03
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Re-review: Phase p03 Remediation Attempt 2/3

**Reviewed:** 2026-07-29T01:21:49Z  
**Authoritative remediation range:** `16395d2cdc22426f943b5c2fb9a87c81eed83490..8317ed30f02b6aac567db1975c6f8bbc2e3b9b93`  
**Implementation head:** `8317ed30f02b6aac567db1975c6f8bbc2e3b9b93`  
**Current tracking head excluded from implementation judgment:** `ccbf8a5d`  
**Scope:** C1-R1, I3-R1, M1-R1, and p03-t16 through p03-t20, plus regressions in their remediation surfaces  
**Files reviewed:** 42 files in the authoritative range, including root-owned tracking artifacts

## Verdict

**BLOCKED — remediation attempt 3/3 is required.**

The remediation now rejects undecodable pseudo-PNGs with a bounded full
decoder, exercises a real installed Chromium session through the actual core,
uses one versioned package-coverage enumerator across core, finalizer, CLI
archive, and push, limits partial review-chain coverage to
`built-needs-review`, completes the three missing failure-matrix cases, and
aligns packed release versions and assets.

One Critical authenticity gap remains. The value carried from browser QA to
visual review is named a decoded screenshot hash but hashes only the flat pixel
buffer. It omits decoded width and height. A valid `320x640` PNG can therefore
be replaced after QA by a valid `640x320` PNG containing the same flat pixel
bytes; visual review accepts the stale hash, binds the replacement bytes into
its request, and can return `pass`. The later immutable package then faithfully
retains the wrong-geometry screenshot rather than detecting the mutation.

Findings: 1 critical, 0 important, 0 medium, 0 minor

Phase p03 may not close or continue to p04-t01 until the Critical finding is
resolved and freshly re-reviewed.

## Evidence Sources

- `reviews/20260728-p03-code-review-r1.md`
- `plan.md`
- `implementation.md`
- `state.md`
- `references/imported-plan.md`
- Complete authoritative range
  `16395d2cdc22426f943b5c2fb9a87c81eed83490..8317ed30f02b6aac567db1975c6f8bbc2e3b9b93`
- Current production, adapter, CLI, smoke, release, and focused-test sources at
  tracking head `ccbf8a5d`; its tracking-only changes were not treated as
  implementation defects

## Incoming Finding Disposition

| Incoming finding                                                             | Disposition                                          | Exact evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1-R1 — screenshot validation accepts undecodable pseudo-PNGs                | **Partially resolved; superseded by Critical C1-R2** | `png.mjs:15-147` validates signature, chunk boundaries/types/CRCs, IHDR profile, contiguous IDAT, exact bounded zlib consumption, scanline length, filters, IEND, and reconstructs pixels. `png.test.mjs:30-158` covers the prior pseudo-PNG and malformed/bounded cases. `run.integration.test.mjs:1114-1167` runs the actual core with installed Chromium and passed locally. However, `png.mjs:139-147` hashes pixels without geometry, and `visual-review.mjs:88-105` checks only that hash. The independent geometry-swap probe was accepted.                                                                                                                                                                                  |
| I3-R1 — package coverage is duplicated and permits unintended partial chains | **Resolved**                                         | `package-coverage.mjs:1-73` is the single versioned path enumerator. `records.mjs:11-23,392-445` consumes/re-exports it after verified mode derivation. `finalize-tracked-run.mjs:32-36,257-341` dynamically loads the same contract from explicit `coreRoot`. `explainer-package-coverage.ts:19-55` loads the bundled generated copy, `archive-utils.ts:1019-1055` consumes it, and `push-runner.ts:261-265` uses the archive verifier. `package-coverage-consumers.test.mjs:22-149` passes one untouched actual-core package through finalizer, archive, and push. Direct truth-table probing required a complete attempt for partial `failed`, `incomplete`, and successful packages, while exempting only `built-needs-review`. |
| M1-R1 — integrated failure matrix omits screenshot, copy, and viewport cases | **Resolved**                                         | `run.integration.test.mjs:1359-1384` declares omitted-screenshot, evidence-copy-failure, and disallowed-override cases. Lines `1511-1555` assert exact `built-needs-review` manifest/build outcomes, zero durability/publish calls, bounded critic/correction counts, exact canonical widths for the override, retained available evidence, and structured immutable error records.                                                                                                                                                                                                                                                                                                                                                 |

## Findings

### Critical

- **C1-R2 — Decoded screenshot binding omits viewport geometry**
  (`.agents/skills/explainer-kit/scripts/lib/png.mjs:146`)
  - Issue: `decodeBrowserPng()` returns
    `pixelHash = sha256(pixels)` at `png.mjs:139-147`. Browser QA validates
    dimensions and retains only that pixel hash at `qa.mjs:810-847`.
    `buildVisualReviewRequest()` re-decodes the later file but compares only
    `decoded.pixelHash` with `item.decodedScreenshotHash` at
    `visual-review.mjs:88-105`; it neither compares the later decoded
    dimensions with the retained `width`/`height` nor hashes dimensions into
    the decoded identity.
  - Direct evidence: two valid decoded PNGs with dimensions `2x1` and `1x2`
    over the same RGBA bytes produced the same current `pixelHash`. A complete
    `runVisualReview()` probe then supplied a stale mobile hash from a
    `320x640` QA image while retaining a valid `640x320` PNG with the same
    decoded pixels. The critic observed `640x320`, returned `pass`, and
    `runVisualReview()` accepted it with `sameDecodedHash: true`.
  - Impact: an injected browser provider can replace a previously
    viewport-matched screenshot during later probe calls, before visual-review
    snapshotting, while preserving flat decoded bytes. The replacement becomes
    the raw-byte hash in the critic request and immutable manifest, so a
    wrong-geometry screenshot can authorize durability and archival. The
    p03-t16 exact-viewport and mutation-binding acceptance property remains
    false.
  - Fix: Bind the complete decoded image identity across QA and visual review.
    Either hash a canonical descriptor containing width, height, bit depth,
    color type/channels, and pixel bytes, or carry the validated dimensions and
    compare them again before critic invocation in addition to the pixel hash.
    Add a regression that swaps `320x640` for `640x320` with identical flat
    pixels between QA and visual review and requires failure before the critic
    runs. Preserve the existing raw-byte request and immutable-package hashes.
  - Requirement: p03-t16 steps 4-5 and acceptance; C1-R1 authenticity and
    viewport-paired evidence closure.

### Important

None.

### Medium

None.

### Minor

None.

## Remediation Task Alignment

| Task    | Status      | Notes                                                                                                                                                                                                   |
| ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p03-t16 | **blocked** | Full bounded PNG decoding, valid deterministic fixtures, and real Chromium core integration are present, but decoded identity does not bind geometry across the QA-to-critic boundary.                  |
| p03-t17 | implemented | Core, finalizer, CLI archive, and push consume one versioned canonical enumerator; packed CLI assets include its generated copy; only `built-needs-review` receives the partial review-chain exemption. |
| p03-t18 | implemented | All three missing integrated failure cases assert terminal handoff, retained evidence/errors, canonical widths, callback caps, and no external side effects.                                            |
| p03-t19 | implemented | Core `2.0.3`, adapter `1.0.5`, all five public packages `0.2.23`, CLI validation, smoke, generated metadata, and provider views are aligned.                                                            |
| p03-t20 | implemented | Rebuildability uses core `2.0.3` and passes verified unattended mode to the shared package-coverage contract.                                                                                           |

## Acceptance-Property Resolution

| Property                                                                | Resolution                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Strict full PNG decoding, malformed-input rejection, and bounded output | **Resolved**                                         |
| Decoded screenshot identity bound from QA through critic                | **Blocked** — pixel hash omits geometry              |
| Raw screenshot/request/result binding and immutable package hashing     | **Resolved for the bytes selected by visual review** |
| Real Chromium actual-core integration                                   | **Resolved** — ran locally without skip              |
| One canonical versioned package-coverage enumerator                     | **Resolved**                                         |
| Partial review-chain exemption only for `built-needs-review`            | **Resolved**                                         |
| Untouched actual-core package crosses finalizer/archive/push            | **Resolved**                                         |
| Missing screenshot/evidence-copy/viewport-override matrix               | **Resolved**                                         |
| Core/adapter/public release version alignment                           | **Resolved**                                         |
| Packed canonical package-coverage asset inclusion                       | **Resolved**                                         |

## Verification Commands and Results

```bash
git diff --check 16395d2cdc22426f943b5c2fb9a87c81eed83490..8317ed30f02b6aac567db1975c6f8bbc2e3b9b93
git log --format='%H %s' 16395d2cdc22426f943b5c2fb9a87c81eed83490..8317ed30f02b6aac567db1975c6f8bbc2e3b9b93
```

Result: clean diff; exact p03-t16 through p03-t20 task commits plus bounded
root tracking commits in the authoritative range. Current HEAD is exactly
`ccbf8a5d360926375b17c6948df0e7d8ec0d36d2` and was excluded from
implementation judgment.

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

Result: 228/228 passed, zero skipped. The installed-Chromium actual-core test
passed in 10.36 seconds.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/archive/archive-utils.test.ts \
  src/commands/project/archive/push-runner.test.ts \
  src/release/public-package-contract.test.ts \
  src/validation/skills.test.ts
```

Result: 192/192 passed, including real packed CLI payload validation.

```bash
pnpm --filter @open-agent-toolkit/cli build
node --test tools/smoke/explainer-kit/*.test.mjs
cmp -s \
  .agents/skills/explainer-kit/scripts/lib/package-coverage.mjs \
  packages/cli/assets/skills/explainer-kit/scripts/lib/package-coverage.mjs
pnpm release:validate
```

Result: CLI build passed; smoke 7/7 passed; bundled coverage module was
byte-identical to the canonical source; all five `0.2.23` public tarballs and
65 visual measurements passed release validation. The worktree remained clean.

```bash
# Decode the same RGBA bytes as 2x1 and 1x2 PNGs.
node --input-type=module -e '<decoded geometry/hash collision probe>'

# Run visual review with a stale 320x640 QA hash and a retained 640x320 PNG
# containing the same flat decoded pixels.
node --input-type=module -e '<QA-to-critic geometry mutation probe>'
```

Result: the two geometries had the same `pixelHash`; visual review accepted
`pass` with `qaGeometry: "320x640"`, `criticGeometry: "640x320"`, and
`sameDecodedHash: true`.

## Required Root Action

Add one bounded remediation-attempt-3 task that binds decoded geometry/profile
and pixels across QA and visual review, with the demonstrated reshape mutation
as a regression. Do not close p03 or advance to p04 until a fresh re-review
reports zero Critical and zero Important findings.
