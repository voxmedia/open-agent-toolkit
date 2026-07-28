---
oat_generated: true
oat_generated_at: 2026-07-28T17:50:29Z
oat_review_scope: p03
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p03

**Reviewed:** 2026-07-28T17:50:29Z  
**Review request:** `explainer-improvements-p03-review-20260728T172200Z`  
**Authoritative implementation range:** `665affc67df562c9e67acf733f41ba27bfbf8dbe..73469c565d6c07cf62a45abcb4fc8454c495fe8e`  
**Implementation head:** `73469c565d6c07cf62a45abcb4fc8454c495fe8e`  
**Committed context inspected:** `b9c73de83b15cf788026668dca06b03bd55b895d`  
**Tracking baseline before review launch:** `7ba59f6337b48f8596696aaeed918fe166402886`  
**Scope:** p03-t01 through p03-t05, including Phase p02 regression invariants and the p03 lifecycle consumers named by the plan  
**Files reviewed:** 27 implementation/test/documentation files in the authoritative range, plus scoped project artifacts, prior p02 reviews, schemas, and lifecycle consumers

## Verdict

**BLOCKED — remediation attempt 1/3 is required.**

The phase has a coherent non-recursive correction loop and correctly blocks the
direct missing-critic, missing-probe, and critic-`fail` cases. It does not yet
establish the stronger acceptance property that only a complete, authentic,
content-bound, immutable browser-plus-critic chain can publish or attest
durability. The retained contracts accept arbitrary screenshot bytes, accept
empty cohesion evidence, do not bind a visual result to the rendered/evidence
bytes, and omit the entire browser/review chain from immutable hashes.

The reported Phase p03 union is reproducibly green at 365/365, but direct probes
demonstrate acceptance gaps outside the assertions: partial browser evidence
returns `failed` with no manifest rather than `built-needs-review`, and the CLI
archive parser rejects a real passing core manifest.

Findings: 4 critical, 3 important, 1 medium, 1 minor

Phase p03 may not close and must not continue to p04-t01 until the Critical and
Important findings are resolved and re-reviewed.

## Evidence Sources

- `.oat/projects/shared/explainer-improvements/plan.md`
- `.oat/projects/shared/explainer-improvements/implementation.md`
- `.oat/projects/shared/explainer-improvements/state.md`
- `.oat/projects/shared/explainer-improvements/references/imported-plan.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p02-code-review.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p02-code-review-r1.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p02-code-review-r2.md`
- Every task commit and its complete diff in the authoritative range
- Current committed production/test/schema context at `b9c73de8`; the two
  commits after the implementation head modify only `implementation.md` and
  `state.md`

## Scope and Task-Boundary Evidence

The authoritative range contains the five task commits and bookkeeping commit
`63571756`. The bookkeeping commit was treated as lifecycle tracking rather
than implementation.

| Task    | Commit / subject                                                | Boundary result                                                                                                                            |
| ------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| p03-t01 | `5c10fdc3` — `feat(p03-t01): retain recap browser evidence`     | Exact subject and exact six-file plan boundary                                                                                             |
| p03-t02 | `8f0a6708` — `feat(p03-t02): add independent visual critic`     | Exact subject and exact five-file plan boundary                                                                                            |
| p03-t03 | `3343ea1a` — `feat(p03-t03): cap visual correction at one pass` | Exact subject and exact four-file plan boundary                                                                                            |
| p03-t04 | `9b9570d1` — `fix(p03-t04): block unreviewed recap publication` | Exact subject; 17 files changed. The plan-declared `rebuildability.test.mjs`, `push-runner.ts`, and `push-runner.test.ts` were not changed |
| p03-t05 | `73469c56` — `test(p03-t05): align visual review fixtures`      | Exact subject and exact three-file plan boundary                                                                                           |

## Findings

### Critical

- **C1 — A valid visual-review result is not bound to the request or reviewed
  bytes** (`.agents/skills/explainer-kit/schemas/visual-review-result.v1.schema.json:7`)
  - Issue: The result contract requires an arbitrary `reviewId`, artifact IDs,
    and findings, but no request ID/hash, plan hash, rendered-content hash,
    metrics hash, or screenshot hash. The request exposes only relative paths
    (`visual-review-request.v1.schema.json:29-51`) and no confined run root or
    bytes. Custom validation checks only set equality by artifact ID
    (`scripts/lib/contracts.mjs:576-592`). A stale or unconditional pass for the
    same artifact IDs therefore validates after rendered or evidence bytes
    change, and a provider-neutral callback cannot independently resolve the
    supplied relative paths from the request alone.
  - Impact: Publication can proceed without proof that the critic inspected the
    exact rendered set and browser evidence being published. Request/result IDs
    are not actually bound as required.
  - Fix: Give every request a deterministic request ID and canonical request
    hash. Include SHA-256 hashes for each rendered artifact, screenshot, and
    metrics record, plus a confined way for the provider adapter to read them.
    Require the result to echo the request ID/hash and validate all bindings
    before accepting any disposition. Add stale-result and byte-mutation tests.
  - Requirement: p03-t02 steps 1-2 and acceptance; load-bearing property 2.

- **C2 — Empty synthetic cohesion data is treated as valid evidence**
  (`.agents/skills/explainer-kit/scripts/lib/qa.mjs:429`)
  - Issue: `checkArtifactCohesion` defaults every missing cohesion group to an
    empty object and returns valid when all groups are empty
    (`qa.mjs:434-469`). `cohesionEvidenceFromLedger` similarly derives empty
    maps from an empty ledger (`visual-review.mjs:73-99`), while the visual
    request contains the plan but no per-artifact observed cohesion evidence
    (`visual-review.mjs:38-51`). An unattended adaptive recap with no
    terminology, numeric, or status observations can receive an unconditional
    passing result and reach durability/publish.
  - Impact: The implementation preserves the exact empty-object path that
    p03-t02 step 3 explicitly required replacing.
  - Fix: Require a non-empty, applicable shared ledger for unattended adaptive
    recaps; derive and retain per-artifact observations from rendered content;
    place those observations and their hashes in the visual-review request; and
    fail closed when the ledger is empty or expected claims are not observable.
    Add a structural-QA-pass/empty-cohesion critic-fail test.
  - Requirement: p03-t02 steps 2-3 and acceptance; load-bearing property 2.

- **C3 — Browser and visual-review evidence is excluded from immutable package
  hashes** (`.agents/skills/explainer-kit/scripts/run.mjs:1670`)
  - Issue: `immutableHashesFor` hashes the request, fact base, approval, set-plan
    records, author results, content, theme, and rendered artifacts, but omits
    `state.browserEvidence` and every `state.visualReviewPaths` entry
    (`run.mjs:1671-1686`). The omitted paths include original screenshots and
    metrics, copied per-attempt evidence, review request/result JSON, and the
    revision record. The successful direct probe confirmed these files exist
    while none appear in `manifest.immutableHashes`.
  - Impact: Evidence and findings can be changed or deleted after a passing
    review without invalidating the manifest, durability attestation, or
    rebuild verification. This violates p03-t01's immutable/rebuild requirement
    and p03-t04's complete evidence-chain gate.
  - Fix: Add all original browser evidence and all retained visual-review paths
    to immutable hashes before manifest creation. Make the manifest/schema
    require those hashes whenever visual review is required, and make
    durability, rebuild, finalization, and archive consumers verify them.
  - Requirement: p03-t01 steps 2-3; p03-t04 acceptance; load-bearing properties
    1 and 4.

- **C4 — Arbitrary non-empty bytes are accepted as screenshot evidence**
  (`.agents/skills/explainer-kit/scripts/lib/qa.mjs:721`)
  - Issue: Screenshot validation checks only that the path is a non-empty file
    below a size cap (`qa.mjs:730-747`); it does not verify a PNG signature or
    that a browser produced the image. All three p03-t05 success fixtures write
    UTF-8 strings such as `deterministic:...` to `.png` files and then return an
    unconditional pass
    (`explainer-kit/tests/e2e-recap.test.mjs:104-129`,
    `oat-explainer-kit/tests/completion.integration.test.mjs:504-545`, and
    `oat-explainer-kit/tests/run.integration.test.mjs:178-219`).
  - Impact: The 365/365 union proves only that paths contain bytes, not that
    reviewable screenshots or real browser evidence exist. The same injection
    is accepted in production, so a non-browser callback can satisfy the gate.
  - Fix: Validate the PNG magic bytes and decode dimensions against retained
    viewport metadata; preferably stamp evidence with the resolved browser
    runtime and deterministic capture settings. Replace at least one phase-wide
    success fixture with the installed Chromium probe and make the remaining
    deterministic doubles emit valid PNG fixtures that the critic actually
    reads. Add invalid-image and metadata/dimension mismatch tests.
  - Requirement: p03-t01 acceptance; p03-t05 steps 2 and 4; load-bearing
    properties 1 and 5.

### Important

- **I1 — Partial or malformed review evidence becomes `failed`, not
  `built-needs-review`** (`.agents/skills/explainer-kit/scripts/run.mjs:382`)
  - Issue: Missing screenshot evidence is emitted as a non-hard QA issue
    (`qa.mjs:550-568`), after which `runVisualReview` rejects the incomplete
    three-viewport request. The top-level catch converts the run to generic
    `failed` (`run.mjs:219-223`) before `reviewGateBlocked` is set. A direct run
    with one omitted screenshot returned `outcome: "failed"`, `manifest: null`,
    zero durability calls, and zero publish calls. Thrown visual-critic and
    invalid-result branches follow the same generic failure path. Noncanonical
    `options.widths` also reaches this path rather than the required review
    status.
  - Impact: The exact terminal status and preserved review handoff required by
    p03-t04 are lost for incomplete evidence. Downstream consumers cannot
    distinguish a review-incomplete built recap from a generic build failure.
  - Fix: Classify required-evidence and visual-critic contract/runtime failures
    as review-gate outcomes for unattended project recaps. Preserve partial
    evidence and structured findings/errors in a valid manifest/build record,
    set both outcomes to `built-needs-review`, and skip durability/publish.
    Force the exact `[320, 768, 1440]` widths for this tier. Add direct tests for
    one missing screenshot, malformed metrics, thrown critic, invalid critic
    result, and a disallowed width override.
  - Requirement: p03-t01 step 3; p03-t04 steps 1-3; load-bearing properties 1,
    3, and 4.

- **I2 — The OAT adapter has no first-class browser/visual-review provider
  boundary** (`.agents/skills/oat-explainer-kit/scripts/run.mjs:18`)
  - Issue: The public adapter exposes direct callback/module pairs for the set
    planner, author, and fact critic (`run.mjs:35-41`), but browser probing and
    visual criticism are available only as unvalidated `coreOptions` internals
    forwarded at `run.mjs:139-144`. The skill documents only the fact-critic
    callback/module contract. JSON/CLI callers therefore have no declared
    `browserProbeModulePath` or `visualCriticModulePath`, and the adapter cannot
    enforce that its visual role is provider-neutral and distinct. The p03-t05
    tests bypass the declared adapter boundary via `coreOptions`.
  - Impact: A normal OAT caller following the public contract cannot construct a
    passing unattended recap chain; it receives `built-needs-review` unless it
    knows core implementation details and can inject in-process functions.
  - Fix: Add explicit, validated browser-session and visual-critic callback or
    module entry points to the adapter, with mutual-exclusion and role-identity
    checks matching the other seams. Document their request/result contracts
    and change integration fixtures to use the public boundary.
  - Requirement: p03-t02 provider neutrality; p03-t05 integration acceptance;
    API compatibility check requested by the review brief.

- **I3 — CLI archive validation rejects a real passing core manifest**
  (`packages/cli/src/commands/project/archive/archive-utils.ts:650`)
  - Issue: The parser demands exact equality between `immutableHashes` and a
    locally reconstructed list that omits the five required immutable set-plan
    records (`archive-utils.ts:650-678`). A direct probe copied the successful
    core recap package into a temporary project and called
    `archiveProjectOnCompletion`; it rejected the package with
    `Selected project recap manifest immutable hashes do not cover the complete
v1 package.` This will become more divergent when C3 adds visual evidence.
  - Impact: The p03 built-needs-review rejection path works, but a genuinely
    passing recap cannot complete recap export/archive. The unit test uses a
    reduced hand-authored manifest and does not exercise core/CLI compatibility.
  - Fix: Define one canonical package-coverage contract shared by core and CLI.
    Validate required subsets and known evidence/control records without
    rejecting required extras. Add an integration test that feeds an actual
    successful `runExplainer` manifest into archive/export validation.
  - Requirement: p03-t04 step 3 and acceptance; load-bearing property 4.

### Medium

- **M1 — Error branches do not prove the state-machine cap or terminal review
  behavior** (`.agents/skills/explainer-kit/scripts/run.mjs:396`)
  - Issue: The tests cover first pass, one correction followed by pass/fail, and
    a final `correct` disposition. They do not cover a thrown first/final
    visual critic, malformed first/final result, throwing correction callback,
    or evidence-copy failure while asserting callback counts and retained
    attempts. Those branches fall through the generic catch and are precisely
    where a future retry could accidentally add a third review.
  - Fix: Add table-driven error-branch tests asserting no more than two critic
    calls, no more than one correction call/revision, no durability/publish
    callbacks, retained first-attempt evidence where available, and the
    required `built-needs-review` terminal status.
  - Requirement: p03-t03 acceptance and load-bearing property 3.

### Minor

- **m1 — p03-t04's committed file boundary does not match the normalized plan**
  (`.oat/projects/shared/explainer-improvements/plan.md:767`)
  - Issue: The task declared modifications to
    `tests/rebuildability.test.mjs`, `archive/push-runner.ts`, and
    `archive/push-runner.test.ts`, but commit `9b9570d1` changed none of them.
    Existing tests passed, yet no push-runner test asserts the new status and no
    rebuild test covers the visual evidence chain.
  - Suggestion: Resolve this through the bounded fixes for C3/M1: add the
    declared rebuild and push-path coverage, or align the plan boundary with an
    explicit rationale if those consumers are intentionally unchanged.

## Acceptance-Property Resolution

| Property                                                       | Resolution                                 | Evidence                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p03-t01 exact 320/768/1440 screenshot + metrics evidence       | **Partial / blocked**                      | Defaults and retained metadata use the exact widths; paths are confined and binary bytes stay out of JSON. Arbitrary bytes pass as screenshots, evidence is not immutable, and partial evidence becomes generic `failed`.                           |
| p03-t02 independent provider-neutral whole-set critic          | **Missing load-bearing binding / blocked** | The core enforces a distinct function identity and complete artifact-ID set, but the public OAT adapter lacks the seam, requests contain unresolved relative paths with no byte hashes, results have no request binding, and empty cohesion passes. |
| p03-t03 one correction and one final review                    | **Implemented with test gap**              | The loop is non-recursive; attempts are limited to 1/2; one revision file is enforced; only finding artifact IDs are re-authored. Error-branch proof is incomplete.                                                                                 |
| p03-t04 block durability/publication and preserve exact status | **Partial / blocked**                      | Direct missing probe, missing critic, and critic `fail` produce `built-needs-review` and invoke neither callback. Partial/malformed/thrown review paths become `failed`; evidence is unhashed; a passing core package cannot archive.               |
| p03-t05 phase-wide fixture alignment                           | **Green but insufficient / blocked**       | The 365/365 union is green and explicit missing/fail cases remain fail-closed. Success fixtures inject text as `.png`, unconditional critic passes, and adapter internals, so they do not prove genuine browser/review seams.                       |
| Phase p02 invariants                                           | **Preserved in reviewed range**            | Adaptive-three identity, approval resume-token checks, author guidance, explicit fallback, set-plan records, and no-silent-downgrade tests remain green; no p03 production diff removes them.                                                       |
| Task subjects and boundaries                                   | **Subjects pass; one boundary variance**   | All five subjects are exact. p03-t01/t02/t03/t05 match declared files; p03-t04 omits three plan-declared files.                                                                                                                                     |

## Direct Record and Lifecycle Inspection

The reviewer ran a core recap directly with two adaptive artifacts and inspected
the retained package:

- Each artifact retained mobile/tablet/desktop evidence metadata and files.
- The visual-review request named the complete two-artifact set.
- Passing review produced `built-not-durable`.
- Critic `fail` and missing visual critic each produced
  `built-needs-review`, with durability and publish callback counts both zero.
- Build record, manifest, and core result agreed on `built-needs-review`.
- Partial evidence produced `failed`, no manifest, and zero callbacks.
- Successful evidence/review files were absent from `immutableHashes`.
- Feeding the successful package to `archiveProjectOnCompletion` was rejected
  for immutable-package mismatch.

## Verification Commands and Results

```bash
git diff --check 665affc67df562c9e67acf733f41ba27bfbf8dbe..73469c565d6c07cf62a45abcb4fc8454c495fe8e
git log --format='%H %s' 665affc67df562c9e67acf733f41ba27bfbf8dbe..73469c565d6c07cf62a45abcb4fc8454c495fe8e
git show --format='%H%n%s' --name-only 5c10fdc3 8f0a6708 3343ea1a 9b9570d1 73469c56
```

Result: clean diff; five exact task subjects plus bookkeeping commit; boundaries
as recorded above.

```bash
node --test .agents/skills/explainer-kit/tests/browser-runtime.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs
node --test .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs
node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/push-runner.test.ts
```

Result: all focused commands passed; the CLI pair passed 40/40.

```bash
node --test .agents/skills/explainer-kit/tests/browser-runtime.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
```

Result: Phase p03 union passed 365/365.

```bash
pnpm release:validate:visual
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm release:validate
```

Result: all passed. The real browser visual validator passed both baseline
checks; the full browser-runtime test passed 13/13.

## Required Fixes for Remediation Attempt 1/3

1. Strengthen visual-review request/result contracts and validators with
   request/content/evidence hashes and resolvable confined evidence.
   - Affected:
     `schemas/visual-review-request.v1.schema.json`,
     `schemas/visual-review-result.v1.schema.json`,
     `scripts/lib/visual-review.mjs`,
     `scripts/lib/contracts.mjs`, and contract tests.
2. Make non-empty observed cohesion mandatory for unattended adaptive recaps.
   - Affected: `scripts/lib/visual-review.mjs`, `scripts/lib/qa.mjs`,
     set-plan/visual schemas, QA and integration tests.
3. Validate real screenshot files and bind all browser/review/revision records
   into immutable hashes and downstream durability/rebuild/archive validation.
   - Affected: `scripts/lib/qa.mjs`, `scripts/run.mjs`, manifest/build schemas,
     durability/rebuildability tests, and CLI archive validation/tests.
4. Normalize every incomplete/failed review-chain branch to preserved
   `built-needs-review`, including partial evidence and thrown/invalid critic
   paths, with no durability/publish calls.
   - Affected: `scripts/run.mjs`, `scripts/lib/records.mjs`, integration and
     lifecycle tests.
5. Expose and document first-class provider-neutral browser/visual critic seams
   at the OAT adapter boundary; stop using `coreOptions` as the integration
   contract.
   - Affected: `.agents/skills/oat-explainer-kit/scripts/run.mjs`,
     `.agents/skills/oat-explainer-kit/SKILL.md`, adapter/completion tests.
6. Add actual core-manifest-to-CLI archive compatibility coverage and the
   missing push/rebuild error-branch tests.

## Recommended Next Step

Run `oat-project-review-receive` to convert C1-C4 and I1-I3 into bounded Phase
p03 remediation tasks for attempt 1/3. Root escalation is required only if the
project intentionally wants to trust opaque callback assertions, arbitrary
non-empty screenshot bytes, or unhashed review evidence; that would require an
explicit plan/acceptance change rather than treating this review as passed.
