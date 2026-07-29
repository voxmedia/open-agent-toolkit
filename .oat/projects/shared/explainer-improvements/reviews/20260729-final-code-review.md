---
oat_generated: true
oat_generated_at: 2026-07-29T17:23:50Z
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
oat_review_verdict: BLOCKED
---

# Code Review: final

**Reviewed:** 2026-07-29T17:23:50Z
**Verdict:** BLOCKED
**Scope:** Complete effective product delta from merged foundation
`1151a0d7` through implementation head
`508da0b898e1a1e5f6545554b7d0715aa1f9ebd4`
**Files reviewed:** 301 changed paths in the authoritative range, including 282
paths outside project-local OAT tracking
**Commits:** 127 commits in the inclusive range; 60 exact task commits

## Summary

The implementation delivers the adaptive visual portfolio, exact topology and
source-link integrity, bounded browser/critic loop, three real-Chromium golden
cases, packaging, documentation, backlog, and lockstep release work. Independent
focused verification passed 362 tests, including all golden cases, and the
product-only diff is whitespace-clean.

The review is BLOCKED by two Important integrity gaps. A valid `ekrt2` token can
resume a run with security-relevant current-request fields changed and can
invoke durability or publish behavior not present in the authenticated retained
request. Separately, shipped immutable browser evidence retains deterministic
capture settings but not the trusted Chromium engine/version exposed by the
real browser session, leaving the explicit browser-runtime identity requirement
unmet outside the golden benchmark harness.

Findings: 0 critical, 2 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **I1 — Resume identity accepts changed durability and publication policy**
  (`.agents/skills/explainer-kit/scripts/run.mjs:851`)
  - Issue: `loadResumableRun()` authenticates the retained request bytes with
    `ekrt2`, but compares the current request against only slug, recipe,
    `recapMode`, mode, and fact-base binding. It then installs the entire current
    normalized request as the resumed run at line 868. Theme, render strategy,
    privacy, `publicBaseUrl`, durability strategy, and publish destination are
    not compared. The durability path consumes that unbound request at lines
    1205-1258.
  - Evidence: An independent probe paused an interactive request with
    `durability.strategy = "none"`, resumed it with the genuine `ekrt2` token
    but `durability.strategy = "commit"`, and observed
    `{"resumedOutcome":"built-not-durable","durabilityCalls":1}`. The changed
    request was accepted and the previously unauthorized callback ran.
  - Impact: Possession of a valid approval token does not prove that the request
    executed after resume matches the retained run request. A stale or modified
    caller can redirect post-approval side effects while immutable
    `run-request.json` still records the old policy, so the package can
    misrepresent the behavior it executed. This violates the documented
    same-request flow and request-tampering fail-closed requirement even though
    publication still requires a separate callback.
  - Fix: Compare the complete canonical privacy-safe current request with the
    authenticated retained `run-request.json` after applying the same output
    root and default normalization used by initialization. Alternatively bind a
    canonical hash of every immutable semantic request field into the approval
    token and approval record. Add table-driven tests that mutate every retained
    request field and assert `E_APPROVAL_RESUME` before hydration and before
    planner, author, durability, or publish callbacks.
  - Requirement: Secure resume closure and request-tampering rejection.

- **I2 — Production browser evidence omits the trusted runtime identity**
  (`.agents/skills/explainer-kit/scripts/lib/qa.mjs:822`)
  - Issue: `createBrowserProbeSession()` derives trusted Chromium name, version,
    and capture metadata from the launched browser at
    `.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs:162`, but the
    OAT adapter forwards only the bare probe callback at
    `.agents/skills/oat-explainer-kit/scripts/run.mjs:164`. The production
    `explainer-kit.browser-evidence/v1` record stores capture settings and probe
    metrics at lines 822-836 but no engine or version. The golden harness writes
    `session.runtime` into benchmark-only summaries, so the real-browser golden
    evidence does not close the shipped package contract.
  - Impact: Immutable package and archive validation can prove PNG structure,
    geometry, pixels, and capture settings, but cannot prove which browser
    runtime produced them. A deterministic callback emitting valid PNGs is
    indistinguishable from the required real-Chromium production path. This
    leaves p03-t08's explicit “retain browser-runtime identity ... without
    trusting a callback's assertion alone” step incomplete.
  - Fix: Promote the browser seam from a bare callback to a validated session
    descriptor whose runtime identity is derived from the launched browser,
    carry that identity into every browser-evidence record and visual-review
    binding, and require it in immutable package/archive coverage. Keep
    deterministic test sessions explicitly marked as fixtures; add a real
    Chromium integration asserting retained engine/version survive finalization
    and archive validation.
  - Requirement: Authentic browser evidence and complete immutable review
    evidence.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md` and normalized
`plan.md` as authoritative requirements; `implementation.md` for task and gate
traceability; prior phase review artifacts for remediation history; the complete
authoritative Git range and relevant shipped code, tests, schemas, docs,
notices, package manifests, backlog records, and golden evidence. Discovery,
spec, and design artifacts are not present and are optional in import mode, so
standalone design alignment is not applicable.

### Requirements Coverage

| Requirement                                                                                                      | Status                              | Notes                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 — MIT notices, payload, and release requirements                                                              | implemented                         | Full MIT bodies and provenance are in `NOTICES.md`; packed CLI contract tests require all three notices and canonical package assets; all five public manifests are `0.2.23`.                                                                                                           |
| R2 — Bundled guidance, adaptive portfolio, provider-neutral planning/composition                                 | implemented                         | Bundled medium-specific guidance is delivered to authors; one immutable set plan requires hub, architecture, and deck and bounds source-backed optionals; OAT supplies explicit planner/author seams.                                                                                   |
| R3 — Browser evidence, independent critic, one correction, handoff semantics, decoded PNG and immutable coverage | partial                             | Loop cap, independent critic, `built-needs-review`, decoded geometry/pixels, snapshot binding, and package coverage are implemented; trusted browser-runtime identity is missing from production immutable evidence (I2).                                                               |
| R4 — Exact topology, commit-pinned backlinks, catalog/publish-root validation                                    | implemented                         | Non-linear graphs are artistically routed and checked by exact node/edge semantic multisets; OAT source bytes are bound to reviewed Git blobs; canonical full-SHA backlinks and full catalog parity are enforced.                                                                       |
| R5 — Secure resume closure                                                                                       | partial                             | Only `ekrt2` is accepted and retained root/request/set-plan bytes are authenticated before hydration; current-request fields outside the narrow identity subset can still change post-approval behavior (I1).                                                                           |
| R6 — Three retained real-runtime golden cases                                                                    | implemented                         | Simple, non-linear, and archive-only cases passed through `runExplainer`, real Chromium, and an independent critic; each retained 3 artifacts × 3 viewports, one critic call, zero corrections, no machine paths, and no trailing whitespace.                                           |
| R7 — Versions, docs, backlog, payload, lockstep release, repository readiness                                    | implemented with final-review block | Docs cover adaptive sets, review semantics, topology, backlinks, and catalog; four critical-path backlog successors are archived and the P2 visual-workflow follow-up remains open; package/payload and exact-head full-gate evidence passed. Merge readiness remains blocked by I1-I2. |
| R8 — Traceability and scope control                                                                              | partial                             | All 60 task IDs map to exact commits and no material product scope drift was found. Two task-level acceptance details remain incomplete through I1-I2.                                                                                                                                  |

### Extra Work (not in declared requirements)

None material. The original umbrella deliberately retains the P2 additional
visual workflows item outside this recovery; the implementation did not absorb
that follow-up scope.

## Verification Evidence

### Independently run during this review

- `node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`
  — 20/20 passed; all three end-to-end cases launched real Chromium and used an
  independent critic.
- Focused records, run integration, PNG, and QA suite — 121/121 passed.
- Focused contracts, topology, fact-base, S3/catalog, core/OAT adapter, and
  completion suite — 136/136 passed.
- CLI archive and packed public-package contract suites — 77/77 passed.
- Packaged core/adapter/private-wrapper smoke suite — 8/8 passed.
- Combined focused verification — 362/362 passed.
- Product-only `git diff --check` across
  `1151a0d7^..508da0b898e1a1e5f6545554b7d0715aa1f9ebd4` passed.
- Golden output diff check passed; independent searches found zero POSIX user
  roots, Windows drive paths, UNC paths, or trailing horizontal whitespace in
  committed golden HTML/JSON/Markdown.
- Git traceability found exactly 60 `pNN-tNN` task commits. The only post-head
  commit (`06894f06`) modifies `plan.md`, `implementation.md`, and `state.md`;
  no product file changed after the reviewed implementation head.
- Adversarial resume probe reproduced I1 with a genuine `ekrt2` token and one
  unauthorized durability callback.

The unrestricted range-wide `git diff --check` reports trailing spaces only in
older project-local review artifacts. Those root-owned OAT tracking records are
outside product-quality findings; the 282-path product surface and the final
golden delta are clean.

### Authoritative exact-head evidence reused

At `508da0b898e1a1e5f6545554b7d0715aa1f9ebd4`, the recorded p05-t05
verification passed renderer 10/10, golden conformance 20/20, all repository,
docs, build, lint, formatting, type-check, and test gates, and
`pnpm release:validate` for all five public package tarballs plus 65 visual
measurements. Rerunning those complete gates would duplicate exact-head
evidence; this review independently reran the load-bearing 362-test subset and
packed payload tests instead.

## Deferred Medium/Minor Disposition

No new Medium or Minor finding requires a fix cycle. The already-open
`BL-260728-additional-visual-workflows` remains the correct explicit disposition
for lower-priority diff review, plan review, fact-check, dashboard, table, and
richer-composition enhancements. It must not trigger an additional review loop
for this project.

## Tracking Alignment Note

This is not a product finding and is outside the reviewed implementation head.
After the authorized fix pass, root-owned closeout should update the pending
review rows and the stale “Implementation is not complete” sentence in
`plan.md`, plus stale phase/task prose in `state.md`. These records should
reflect the final remediation outcome without altering the product-quality
finding counts.

## Verification Commands

Run these after the single authorized Critical/Important fix pass:

```bash
node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
node --test .agents/skills/explainer-kit/tests/browser-runtime.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs
node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/release/public-package-contract.test.ts
node --test tools/smoke/explainer-kit/*.test.mjs
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
git diff --check
```

## Recommended Next Step

Run `oat-project-review-receive` once to convert I1 and I2 into the imported
plan's single authorized Critical/Important remediation pass. Fix both
integrity gaps together, add the adversarial regressions described above, run
the focused and full release gates once, then perform mechanical closeout and
explicitly retain P2 visual enhancements in backlog rather than opening another
review cycle.
