---
oat_generated: true
oat_generated_at: 2026-07-29T07:36:03Z
oat_review_scope: p04-remediation-r3
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p04 Remediation Re-review 3/3

**Reviewed:** 2026-07-29T07:36:03Z
**Scope:** I4-R2 remediation in p04-t12 plus regression checks for every
previously resolved Phase p04 finding
**Files reviewed:** 2 product files in the task commit plus mode-required
artifacts and focused regression sources
**Commits:** `f2d3ecc775fd9f85cfe8568afab8212da12305b3..3b7b43b24e6d14813963bdc97e17d6b6175a00ef`
**Verdict:** BLOCKED — final authorized remediation retry exhausted

## Summary

The exact I4-R2 configured-output-root retarget attack now returns
`E_APPROVAL_RESUME` before durability, and stable symlink, legacy changed-CWD,
run-root confinement, token, identity, and retained-set-plan regressions pass.
Phase p04 nevertheless remains blocked because the new canonical-root check
trusts mutable `run-request.json` bytes that are not bound to the external
resume token: changing that retained field to the relocated canonical root
allows the same retargeted package and valid token to resume through durability.
This was the final authorized remediation attempt, so the 3/3 retry cap is
exhausted.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **I4-R3 — The canonical resume root is compared but not authenticated** (`.agents/skills/explainer-kit/scripts/run.mjs:791`)
  - Issue: `loadResumableRun()` reads `run-request.json` and accepts its
    `outputRoot` whenever that mutable value equals the configured symlink's
    current canonical target. The external `ekrt1` token still hashes only the
    set-plan records (`scripts/lib/records.mjs:519-525`), so it does not bind
    the original canonical root or the retained request bytes. An independent
    probe paused through `configured -> original`, renamed `original` to
    `relocated`, retargeted `configured -> relocated`, replaced only
    `run-request.json.outputRoot` with the canonical relocated path, and
    supplied the original valid token. Resume was accepted, completed
    `built-not-durable` beneath `relocated`, and invoked durability once. This
    bypasses the p04-t12 requirement that the original canonical root be bound
    before retained content is trusted.
  - Fix: Bind the canonical output root to an external trust anchor rather than
    trusting its retained projection. Issue a new resume-token version that
    covers the original canonical root (or the exact retained request bytes)
    together with the existing run ID and set-plan records, and require that
    token for absolute-root packages before adopting retained content. Preserve
    legacy `ekrt1` compatibility only for genuinely relative retained roots so
    it cannot authorize a current absolute-root package after that field is
    rewritten. Add a regression for configured-root retarget plus canonical
    `run-request.outputRoot` mutation that expects `E_APPROVAL_RESUME` and zero
    durability calls.
  - Requirement: p04-t12 steps 2-3 and acceptance require the original
    canonical root to be bound to retained identity and immutable coverage
    before retained package content is trusted. A comparison between two
    attacker-controlled filesystem values does not provide that binding.

### Medium

None.

### Minor

None.

## Finding Disposition

| Finding                                             | Disposition                                                 | Evidence                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I4-R2 — configured-root retarget                    | **Exact attack resolved; root binding incomplete as I4-R3** | Retargeting without retained-content edits returns `E_APPROVAL_RESUME` with zero durability calls. Rewriting the mutable retained root to the relocated canonical target preserves the valid external token and resumes through durability.                    |
| I4-R1 — run-root symlink escape                     | **Remains resolved**                                        | The out-of-root run-root symlink regression returns `E_APPROVAL_RESUME`; canonical containment and request identity remain green.                                                                                                                              |
| C1-R1 — complete artistic graph semantics           | **Remains resolved**                                        | Exact complete planner tuples pass; direction, node ID/label/shape/explicitness, and edge from/to/kind/label drift plus missing, duplicate, malformed, ambiguous, and noncanonical observations fail before visual review; linear rendering remains supported. |
| Original C2 — normalized backlink escape            | **Remains resolved**                                        | The canonical tuple round-trips and representative normalization/encoding/moving-ref mutations fail; core and bundled modules remain byte-identical.                                                                                                           |
| Original I1 — mutable bytes labeled as reviewed Git | **Remains resolved**                                        | The reviewed commit, raw Git-blob hash, claim text, and line range match, while dirty and untracked source states fail.                                                                                                                                        |
| Original I2 — catalog trusts candidate origin       | **Remains resolved**                                        | Exact configured publish-root URLs validate; wrong origin/base, encoded path, query, fragment, and credentials fail.                                                                                                                                           |
| Original I3 — completion fixtures regress           | **Remains resolved**                                        | Completion, browser, critic, evidence, durability, and package coverage remain green in the full core and p03/p04 suites.                                                                                                                                      |

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md`, `plan.md`,
`implementation.md`, source review
`reviews/20260729-p04-code-review-r2.md`, authoritative task commit
`3b7b43b24e6d14813963bdc97e17d6b6175a00ef`, current production sources,
focused tests, complete regression suites, and independent probes. This is
import mode; no `spec.md` or `design.md` is present or required.

### Requirements Coverage

| Requirement                           | Status      | Notes                                                                                                                                                                                     |
| ------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p04-t12 canonical resume-root binding | Partial     | The exact retained root is compared, but that mutable value is not authenticated by the external resume token and can be rewritten to authorize the relocated package.                    |
| Previously resolved resume invariants | Implemented | Stable configured symlink, legacy relative changed-CWD, run-root symlink rejection, canonical containment, token, request identity, and retained-set-plan mismatch behavior remain green. |
| Complete graph semantics              | Implemented | Complete canonical graph observations remain bound before visual review.                                                                                                                  |
| Previously resolved p04/p03 behavior  | Implemented | Backlink, reviewed Git blob, catalog, completion, browser, critic, evidence, package, CLI, smoke, and release checks remain green.                                                        |

### Extra Work

None in p04-t12. The authoritative range also contains two root-owned
review/tracking commits; those files were inspected for scope separation and
excluded from implementation-quality findings.

## Independent Verification

- `git diff --check f2d3ecc7..3b7b43b` — passed.
- Focused stable/retarget configured-root tests — **2/2 passed**.
- Resume confinement, compatibility, token, identity, and retained-tamper
  invariants — **6/6 passed**.
- Complete core integration file — **62/62 passed**.
- Complete p03/p04 explainer-kit and OAT adapter union — **429/429 passed**.
- CLI archive and public-package contracts — **77/77 passed**.
- Complete explainer smoke suite — **8/8 passed**.
- Complete repository and release gates — passed: `pnpm check`, lint, format,
  type-check, full test, build, and `release:validate`; five public packages and
  65 visual measurements validated.
- Exact I4-R2 direct probe: configured-root retarget with unchanged retained
  content and the valid external token returned `E_APPROVAL_RESUME`; durability
  was not called.
- Coordinated canonical-root direct probe: after the same retarget, changing
  only retained `run-request.json.outputRoot` to the relocated canonical path
  preserved the valid token, returned `built-not-durable` under the relocated
  root, and called durability once.
- Direct backlink, reviewed Git-blob, and exact catalog-root probes passed all
  positive cases and rejected their representative escape/mutation cases.
- Complete union coverage reconfirmed artistic graph semantics, completion,
  browser, critic, evidence, durability, and package behavior.

## Changed-file Confirmation

Task commit `3b7b43b24e6d14813963bdc97e17d6b6175a00ef` changes exactly
`.agents/skills/explainer-kit/scripts/run.mjs` and
`.agents/skills/explainer-kit/tests/run.integration.test.mjs`. The authoritative
range contains three commits: that task commit and two root-owned
review/tracking commits. Current `HEAD`
`7c6b92bcae2715ad55647639d59af6a02a57dcc8` is after reviewed head
`3b7b43b24e6d14813963bdc97e17d6b6175a00ef`; that excluded delta contains only
`.oat/projects/shared/explainer-improvements/implementation.md` and
`.oat/projects/shared/explainer-improvements/state.md`. The worktree was clean
before this review artifact was written.

## Verification Commands

```bash
node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/release/public-package-contract.test.ts
node --test tools/smoke/explainer-kit/*.test.mjs
pnpm check && pnpm lint && pnpm format && pnpm type-check && pnpm test && pnpm build && pnpm release:validate
```

## Recommended Next Step

The authorized 3/3 remediation retry cap is exhausted. Return this blocked
result to the root workflow for explicit operator disposition; do not schedule
another automatic p04 remediation review. Any future authorized fix should add
an externally authenticated canonical-root binding and the coordinated
retarget-plus-retained-root-mutation regression described above.
