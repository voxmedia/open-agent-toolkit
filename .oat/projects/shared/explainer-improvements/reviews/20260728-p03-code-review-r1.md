---
oat_generated: true
oat_generated_at: 2026-07-28T23:09:29Z
oat_review_scope: p03
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Re-review: Phase p03 Remediation Attempt 1/3

**Reviewed:** 2026-07-28T23:09:29Z  
**Authoritative remediation range:** `4184b97c76de0fc1d3012ab91793b90e633839de..681369ac9cab9004494468b61b914f82bee2fc23`  
**Implementation head:** `681369ac9cab9004494468b61b914f82bee2fc23`  
**Current tracking head excluded from implementation judgment:** `6baeb07b`  
**Scope:** p03-t06 through p03-t15 against the four Critical and three Important findings in `20260728-p03-code-review.md`, plus regressions in their remediation surfaces  
**Files reviewed:** 38 files in the authoritative range, including three root-owned tracking artifacts

## Verdict

**BLOCKED — remediation attempt 2/3 is required.**

The remediation cryptographically binds review requests and results to the
rendered/evidence bytes, requires observed whole-set cohesion, preserves
bounded `built-needs-review` handoffs across the exercised core failure
branches, exposes first-class OAT review providers, and aligns the canonical
adapter version at `1.0.4`. It does not close the original screenshot
authenticity blocker: the runtime and successful integration fixtures accept a
45-byte pseudo-PNG that the platform image decoder cannot decode.

The package-coverage implementation also remains duplicated and behaviorally
inconsistent for partial review evidence outside successful outcomes. That
leaves original I3 only partially resolved and violates the narrowed
requirement that partial review evidence be valid only for terminal
`built-needs-review` handoffs.

Findings: 1 critical, 1 important, 1 medium, 0 minor

Phase p03 may not close or continue to p04-t01 until the Critical and Important
findings are resolved and freshly re-reviewed.

## Evidence Sources

- `.oat/projects/shared/explainer-improvements/reviews/20260728-p03-code-review.md`
- `.oat/projects/shared/explainer-improvements/plan.md`
- `.oat/projects/shared/explainer-improvements/implementation.md`
- `.oat/projects/shared/explainer-improvements/state.md`
- `.oat/projects/shared/explainer-improvements/references/imported-plan.md`
- Complete remediation range
  `4184b97c76de0fc1d3012ab91793b90e633839de..681369ac9cab9004494468b61b914f82bee2fc23`
- Current production, schema, lifecycle-consumer, and focused-test sources at
  tracking head `6baeb07b`; its tracking-only changes were not treated as
  implementation defects

## Original Blocking Finding Disposition

| Original finding                                               | Disposition                                          | Exact evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 — review result detached from request/bytes                 | **Resolved**                                         | `visual-review.mjs:25-55,72-134,246-280` snapshots rendered, screenshot, and metrics bytes, gives the critic a confined reader, rechecks bytes after the callback, and derives deterministic request identity/hash. `contracts.mjs:511-533,645-699` validates canonical request identity and exact result/request/set binding.                                                                                                                                                                 |
| C2 — empty synthetic cohesion accepted                         | **Resolved**                                         | `contracts.mjs:540-641` requires non-empty terminology/status/numeric ledgers, per-artifact observations, exact content-hash binding, matching claims, and whole-set claim coverage. `visual-review.mjs:167-223` derives observations from rendered bytes.                                                                                                                                                                                                                                     |
| C3 — browser/review evidence omitted from immutable hashes     | **Resolved for normal successful and handoff paths** | `run.mjs:1741-1770` hashes original screenshot/metrics evidence and every retained review/revision/error path. `records.mjs:401-447`, `finalize-tracked-run.mjs:254-346`, and `archive-utils.ts:756-785,1145-1189` verify mode-aware consumer coverage. I3-R1 below records the remaining cross-consumer contract drift.                                                                                                                                                                       |
| C4 — arbitrary non-empty screenshot bytes accepted             | **Unresolved — Critical C1-R1**                      | `qa.mjs:849-863` checks selected header/footer bytes and reads IHDR dimensions without decoding the image. Success fixtures in `run.integration.test.mjs:27-33`, `qa.test.mjs:47-53`, and `e2e-recap.test.mjs:20-26` emit the same invalid 45-byte structure. A direct probe returned `{width:320,height:640}` from `pngDimensions`, while `sips` returned `pixelWidth: <nil>` and `pixelHeight: <nil>`.                                                                                       |
| I1 — partial/malformed review failures became generic `failed` | **Resolved for the declared core provider branches** | `run.mjs:296-329,536-555,688-706` normalizes review/runtime/correction failures into the review gate, writes a structured error record, and leaves the top-level result error-free. `run.integration.test.mjs:1106-1425` covers thrown/malformed initial and final critics, malformed browser results, thrown browser callbacks, correction failure, bounded callback counts, exact outcomes, and zero durability/publish calls.                                                               |
| I2 — no first-class OAT browser/critic provider boundary       | **Resolved**                                         | `oat-explainer-kit/scripts/run.mjs:18-45,143-170,390-490` exposes direct/module browser and critic inputs, rejects `coreOptions` bypass, and validates results. Lines `530-553` enforce distinct underlying identities. Adapter tests at `run.integration.test.mjs:500-658` cover direct/module, missing, invalid, conflicting, and reused providers.                                                                                                                                          |
| I3 — CLI archive rejected a real passing core manifest         | **Partial — Important I3-R1**                        | The reduced exact-set equality check is gone and archive/finalizer/push tests pass, but the canonical package-coverage rule is independently reimplemented in core records, OAT finalization, and CLI archive code. Those implementations disagree for failed/incomplete packages with partial review evidence, and `archive-utils.test.ts:51-183` still constructs manifests by hand rather than feeding an actual successful `runExplainer` package to the CLI consumer as p03-t11 requires. |

## Findings

### Critical

- **C1-R1 — Screenshot validation still accepts undecodable pseudo-PNGs**
  (`.agents/skills/explainer-kit/scripts/lib/qa.mjs:849`)
  - Issue: `pngDimensions` accepts any 45-byte-or-longer buffer with a PNG
    signature, an IHDR marker and dimensions at fixed offsets, and `IEND` bytes
    at the end. It does not validate chunk boundaries, CRCs, color/bit-depth
    fields, image data, or successful decoding. The phase-wide success fixtures
    intentionally generate 45-byte buffers with no decodable image data
    (`run.integration.test.mjs:27-33`, `qa.test.mjs:47-53`,
    `e2e-recap.test.mjs:20-26`).
  - Direct evidence: the runtime returned `320x640` for the fixture buffer;
    macOS ImageIO via `sips` returned nil dimensions for the same bytes.
    `pnpm release:validate:visual` passed 65 real-browser measurements, but that
    separate release path does not prevent an injected production callback from
    satisfying the recap gate with the invalid fixture format.
  - Impact: A non-browser provider can still create a syntactically crafted
    `.png`, pair it with generated metrics, receive a passing critic result, and
    reach durability/publication. The original C4 acceptance property remains
    false.
  - Fix: Decode every screenshot with a real PNG decoder and reject invalid
    chunk structure/CRC/image data before trusting dimensions. Replace all
    deterministic success doubles with valid decodable PNGs that the critic
    reads, and add at least one actual `runExplainer` integration using the
    installed Chromium session. Retain the resolved byte/hash bindings.
  - Requirement: p03-t08 steps 1-3 and acceptance; original C4; load-bearing
    PNG authenticity and paired-metrics check.

### Important

- **I3-R1 — Package coverage is neither canonical nor limited to the intended
  partial-handoff outcome**
  (`.agents/skills/explainer-kit/scripts/lib/records.mjs:424`)
  - Issue: Core coverage adds complete browser/review paths only when
    `successfulRecap` is true (`records.mjs:424-446`), so a failed or incomplete
    recap retaining only one paired browser viewport does not require the rest
    of the chain. The OAT finalizer has another local implementation
    (`finalize-tracked-run.mjs:279-346`), while CLI archival requires a complete
    attempt whenever any review evidence is retained
    (`archive-utils.ts:756-785`). A direct core-contract probe for a failed
    recap with only mobile PNG/metrics returned no request, result, tablet, or
    desktop requirements.
  - Impact: Partial-chain acceptance is not restricted to terminal
    `built-needs-review`, and core writing can accept a package that the archive
    consumer later rejects. The three copies can drift again, which is the
    class of incompatibility original I3 exposed.
  - Fix: Define one shared/generated canonical path-enumeration contract used
    by core records, OAT finalization, CLI archive/export, and push. Make
    `built-needs-review` the sole partial-chain exemption; reject a partial
    retained chain for every other outcome. Add the required integration test
    that runs the actual core successfully and passes its untouched package
    through finalization and CLI archive verification, plus failed/incomplete
    partial-chain negatives.
  - Requirement: p03-t11 steps 1-4 and acceptance; p03-t14 steps 2-4; original
    I3; narrowed partial-evidence and canonical-consumer checks.

### Medium

- **M1-R1 — The promised error-branch matrix still omits three load-bearing
  cases**
  (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:1267`)
  - Issue: The integrated matrix now covers malformed browser results,
    thrown/malformed critics, and correction failure, but not one omitted
    screenshot, an evidence-copy failure in
    `records.mjs:204-230,298-318`, or a disallowed viewport override. The
    missing-screenshot behavior exists only at the lower-level QA test, and no
    integrated assertion proves its manifest handoff, callback cap, or zero
    external side effects.
  - Fix: Add the three p03-t09 cases with exact `built-needs-review` result,
    build-record and manifest outcomes; retained available evidence/error
    records; no durability/publish; at most two reviews and one correction; and
    exact 320/768/1440 requests.
  - Requirement: p03-t09 steps 1-4 and acceptance; original M1.

### Minor

None.

## Remediation Task Alignment

| Task    | Status      | Notes                                                                                                                                                                                     |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p03-t06 | implemented | Exact request identity/hash, confined evidence reads, result echo, and post-callback byte revalidation are present.                                                                       |
| p03-t07 | implemented | Non-empty ledger and per-artifact content-bound observations are enforced.                                                                                                                |
| p03-t08 | **blocked** | Immutable evidence coverage is present, but screenshot authenticity and the required real-browser core integration are not.                                                               |
| p03-t09 | partial     | Runtime normalization works for exercised branches; the declared missing-screenshot, evidence-copy, and width-override matrix is incomplete.                                              |
| p03-t10 | implemented | First-class direct/module seams, validation, and distinct role identity are present.                                                                                                      |
| p03-t11 | **blocked** | Consumers accept immutable extras, but coverage is duplicated/inconsistent and there is no actual core-to-CLI package test.                                                               |
| p03-t12 | implemented | Successful interactive recap packages may omit review evidence; retained partial chains fail closed.                                                                                      |
| p03-t13 | implemented | CLI validation expects `oat-explainer-kit@1.0.4`.                                                                                                                                         |
| p03-t14 | partial     | `built-needs-review` handoffs can retain partial evidence and successful packages remain strict, but the core coverage helper also permits partial chains for failed/incomplete outcomes. |
| p03-t15 | implemented | Wrapper smoke expects the same `1.0.4` adapter version.                                                                                                                                   |

## Acceptance-Property Resolution

| Property                                                                                                         | Resolution                                                                                |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Exact byte/hash binding across rendered artifacts, browser evidence, retained copies, request, and critic result | **Resolved**                                                                              |
| PNG authenticity and viewport-paired metrics                                                                     | **Blocked** — paired metrics and dimensions exist, but invalid pseudo-PNGs pass           |
| Non-empty observed whole-set cohesion                                                                            | **Resolved**                                                                              |
| Immutable inclusion of complete successful review records                                                        | **Resolved for generated success paths**                                                  |
| Bounded `built-needs-review` across missing/thrown/malformed core review providers                               | **Resolved for exercised branches**                                                       |
| No durability or publication on review failure                                                                   | **Resolved**                                                                              |
| First-class OAT provider seams and distinct role identity                                                        | **Resolved**                                                                              |
| Canonical finalizer/archive/push coverage                                                                        | **Blocked** — consumers are separately implemented and differ outside successful outcomes |
| Successful interactive recap compatibility                                                                       | **Resolved**                                                                              |
| Unattended fail-closed behavior                                                                                  | **Resolved except screenshot authenticity**                                               |
| Successful partial-chain rejection                                                                               | **Resolved**                                                                              |
| Partial evidence allowed only for `built-needs-review`                                                           | **Blocked**                                                                               |
| Canonical `oat-explainer-kit@1.0.4` validation and smoke alignment                                               | **Resolved**                                                                              |

## Verification Commands and Results

```bash
git diff --check 4184b97c76de0fc1d3012ab91793b90e633839de..681369ac9cab9004494468b61b914f82bee2fc23
git log --format='%H %s' 4184b97c76de0fc1d3012ab91793b90e633839de..681369ac9cab9004494468b61b914f82bee2fc23
```

Result: clean diff; ten exact p03-t06 through p03-t15 task commits plus three
root tracking commits in the authoritative range.

```bash
node --test .agents/skills/explainer-kit/tests/browser-runtime.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
```

Result: 211/211 passed.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/push-runner.test.ts src/validation/skills.test.ts
node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs
pnpm release:validate:visual
```

Result: CLI 173/173 passed; wrapper smoke 2/2 passed; real Chromium release
validation passed 65 measurements.

```bash
# Construct the exact 45-byte PNG helper used by phase success fixtures,
# call pngDimensions(), then inspect the same file with macOS ImageIO.
node --input-type=module -e '<45-byte fixture and pngDimensions probe>'
sips -g pixelWidth -g pixelHeight "$fixture"
```

Result: core helper accepted `320x640`; ImageIO reported nil width and height.

```bash
# Ask the core coverage helper what review paths a failed unattended recap
# retaining only mobile screenshot/metrics requires.
node --input-type=module -e '<requiredImmutablePackagePaths failed-package probe>'
```

Result: neither review request/result nor tablet/desktop evidence was required.

## Required Root Action

Add bounded remediation-attempt-2 tasks for:

1. real PNG decoding plus valid deterministic fixtures and one real-Chromium
   core review integration; and
2. one canonical consumer coverage contract with partial evidence exempted only
   for `built-needs-review`, backed by an actual core-to-finalizer/archive/push
   compatibility test.

Retain M1-R1 in the same bounded correction if practical. Do not close p03 or
advance to p04 until a fresh re-review reports zero Critical and zero Important
findings.
