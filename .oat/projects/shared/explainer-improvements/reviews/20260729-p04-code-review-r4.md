---
oat_generated: true
oat_generated_at: 2026-07-29T12:28:40Z
oat_review_scope: p04-remediation-r4
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p04 Remediation Re-review 4/4

**Reviewed:** 2026-07-29T12:28:40Z
**Scope:** p04-t13 correctness against its acceptance criteria plus regression
checks for previously resolved Phase p04 behavior
**Files reviewed:** 5 product files in the task commit plus mode-required
artifacts and focused regression sources
**Commits:** `3b7b43b24e6d14813963bdc97e17d6b6175a00ef..996229cfad5392a45681e91e0084b4684acbcb47`
**Verdict:** BLOCKED — final operator-authorized review cap exhausted

## Summary

The new `ekrt2` token deterministically binds the run ID, canonical output root,
exact retained request bytes, and raw-byte set-plan hashes; the exact I4-R3
retarget-plus-request-rewrite attack now fails before callbacks. Phase p04
remains blocked because the legacy branch decides that a package is legacy
solely from mutable `run-request.json.outputRoot`: a current absolute-root
package that issued `ekrt2` can rewrite that field to relative and successfully
resume with a matching `ekrt1`, contrary to p04-t13's explicit downgrade
prohibition.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **I4-R4 — Mutable relative-root text enables an `ekrt1` downgrade for current packages** (`.agents/skills/explainer-kit/scripts/lib/records.mjs:587`)
  - Issue: `verifySetPlanResumeToken()` accepts a matching `ekrt1` and then
    classifies it as eligible legacy state solely when the retained
    `outputRoot` string is relative at lines 605-625. That field is mutable and
    is not authenticated by v1. The added records test demonstrates the gap:
    it creates a current absolute-root package, derives a matching v1 token,
    rewrites only `run-request.json.outputRoot` to relative, and expects
    verification to succeed (`tests/records.test.mjs:840-881`). An independent
    end-to-end probe paused a current absolute-root run that issued `ekrt2`,
    derived the deterministic matching `ekrt1` from its run ID and retained
    set-plan bytes, changed only the retained root to
    `rewritten-relative-output`, and resumed with that v1 token. Resume returned
    `built-not-durable` and invoked durability once. Current absolute-root runs
    therefore do not require the new token version after a retained-field
    rewrite.
  - Fix: Do not infer genuine legacy provenance from an unauthenticated
    relative field. Reject `ekrt1` for current packages using an externally
    trusted migration signal or explicit operator-authorized legacy path, or
    migrate genuinely legacy packages to an authenticated v2 token before
    normal resume. With only the v1 digest and mutable retained files, rewritten
    current and genuine legacy packages are indistinguishable, so secure
    compatibility requires external provenance or dropping transparent v1
    acceptance. Replace the current acceptance assertion with a regression
    that pauses a current absolute-root run, rewrites its retained root to
    relative, supplies a matching `ekrt1`, and expects `E_APPROVAL_RESUME`
    before hydration or callbacks.
  - Requirement: p04-t13 step 4 requires `ekrt1` compatibility only for
    genuinely legacy relative retained roots and requires a rewritten current
    absolute-root request to use `ekrt2` and fail closed. The documented
    contract also states that v1 cannot authorize current absolute-root
    packages.

### Medium

None.

### Minor

None.

## Finding Disposition

| Finding                                             | Disposition                                           | Evidence                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I4-R3 — canonical root not externally authenticated | **Exact attack resolved; downgrade remains as I4-R4** | The original `ekrt2` rejects coordinated configured-root retarget plus canonical retained-root rewriting before planner, author, hydration, or durability. Rewriting a current package's root to relative and supplying a matching `ekrt1` is still accepted. |
| I4-R2 — configured-root retarget                    | **Remains resolved for `ekrt2`**                      | Unchanged and coordinated canonical-root rewrites fail with the original v2 token; stable configured-root v2 resume passes.                                                                                                                                   |
| I4-R1 — run-root symlink escape                     | **Remains resolved**                                  | Run-root symlink, canonical containment, request identity, token mismatch, and retained set-plan tampering fail closed in focused and complete core tests.                                                                                                    |
| C1-R1 — complete artistic graph semantics           | **Remains resolved**                                  | Complete direction, node, and edge semantic mutation coverage remains green in the phase union.                                                                                                                                                               |
| Original C2 — normalized backlink escape            | **Remains resolved**                                  | Canonical backlink and CLI archive normalization cases remain green.                                                                                                                                                                                          |
| Original I1 — mutable bytes labeled as reviewed Git | **Remains resolved**                                  | Reviewed Git-blob provenance and dirty/untracked rejection remain green in the union.                                                                                                                                                                         |
| Original I2 — catalog trusts candidate origin       | **Remains resolved**                                  | Exact publish-root catalog validation remains green.                                                                                                                                                                                                          |
| Original I3 — completion fixtures regress           | **Remains resolved**                                  | Completion, browser critic, evidence, durability, and package coverage remain green across core, phase, CLI, smoke, and release validation.                                                                                                                   |

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md`, `plan.md`,
`implementation.md`, source review
`reviews/20260729-p04-code-review-r3.md`, authoritative task commit
`996229cfad5392a45681e91e0084b4684acbcb47`, current implementation,
contracts, tests, focused suites, complete phase regression suites, and
independent probes. This is import mode; no `spec.md` or `design.md` is present
or required.

### Requirements Coverage

| Requirement                           | Status      | Notes                                                                                                                                  |
| ------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated deterministic `ekrt2`   | Implemented | V2 binds run ID, canonical root, exact request-byte hash, and raw-byte set-plan hashes and uses fixed-format timing-safe verification. |
| Current absolute packages require v2  | Missing     | A current package accepts derived v1 after its mutable retained root is rewritten to relative.                                         |
| Genuine legacy relative compatibility | Partial     | Relative v1 resume works, but the implementation cannot distinguish genuine legacy state from rewritten current state.                 |
| Stable resume and callback ordering   | Implemented | Stable v2 and changed-CWD compatibility pass; the exact v2 coordinated attack fails before planner, author, hydration, or durability.  |
| Earlier p04/p03 behavior              | Implemented | Diagram, backlink, Git provenance, catalog, completion, browser-review, package, CLI, smoke, and release regressions remain green.     |

### Extra Work

None in p04-t13. The authoritative range also contains three root-owned
review/tracking commits; those files were inspected for scope separation and
excluded from implementation-quality findings.

## Independent Verification

- `git diff --check 3b7b43b..996229cf` — passed.
- Records contract tests — **24/24 passed**.
- Complete core integration file — **63/63 passed**.
- Focused resume invariants — **8/8 passed**.
- Three new p04-t13 token/tamper tests passed, but the legacy test encodes the
  incorrect current-package downgrade acceptance described in I4-R4.
- Complete p03/p04 explainer-kit and OAT adapter union — **431/431 passed**.
- CLI archive and public-package contracts — **77/77 passed**.
- Complete explainer smoke suite — **8/8 passed**.
- `pnpm release:validate` passed five public packages and 65 visual
  measurements.
- Exact I4-R3 probe: coordinated configured-root retarget plus canonical
  retained-root rewrite rejected the original `ekrt2` with
  `E_APPROVAL_RESUME`; planner and author counts were unchanged, and durability
  was not called.
- Current-package downgrade probe: a run issued `ekrt2`; after only its retained
  root was rewritten to relative, a matching deterministic `ekrt1` was accepted,
  the run completed `built-not-durable`, and durability was called once.
- Complete union coverage reconfirmed graph semantics, canonical backlinks,
  reviewed Git blobs, exact catalog roots, completion, browser critic, evidence,
  durability, and package behavior.

## Changed-file Confirmation

Task commit `996229cfad5392a45681e91e0084b4684acbcb47` changes exactly the five
declared p04-t13 files: `references/contracts.md`, `scripts/lib/records.mjs`,
`scripts/run.mjs`, `tests/records.test.mjs`, and
`tests/run.integration.test.mjs` under `.agents/skills/explainer-kit`. The
authoritative range contains four commits: that task commit and three root-owned
review/tracking commits. Current `HEAD`
`fb1dc451f9309e193cfa19366846a74cee695d21` is after reviewed head
`996229cfad5392a45681e91e0084b4684acbcb47`; that excluded delta contains only
`.oat/projects/shared/explainer-improvements/implementation.md` and
`.oat/projects/shared/explainer-improvements/state.md`. The worktree was clean
before this review artifact was written.

## Verification Commands

```bash
node --test .agents/skills/explainer-kit/tests/records.test.mjs
node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs
node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/release/public-package-contract.test.ts
node --test tools/smoke/explainer-kit/*.test.mjs
pnpm release:validate
```

## Recommended Next Step

The final operator-authorized 4/4 review cap is exhausted. Return this blocked
result for explicit operator disposition; do not schedule another automatic p04
remediation. Any future authorized change must resolve the v1 compatibility
ambiguity with external trusted provenance or remove transparent v1 acceptance.
