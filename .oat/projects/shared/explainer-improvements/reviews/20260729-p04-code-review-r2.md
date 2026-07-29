---
oat_generated: true
oat_generated_at: 2026-07-29T07:04:09Z
oat_review_scope: p04-remediation-r2
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p04 Remediation Re-review 2/3

**Reviewed:** 2026-07-29T07:04:09Z
**Scope:** C1-R1 and I4-R1 remediation in p04-t10 and p04-t11, plus regression
checks for all original and previously resolved Phase p04 findings
**Files reviewed:** 7 unique product files in the two task commits plus
mode-required artifacts and focused regression sources
**Commits:** `0158516be8f7dd844466295a2982a18bfebfee42..f2d3ecc775fd9f85cfe8568afab8212da12305b3`
**Verdict:** BLOCKED

## Summary

The artistic graph remediation now fails closed on the complete planner-owned
direction, node, and edge tuples before visual review, so C1-R1 is resolved.
Phase p04 remains blocked because resumable-run discovery treats the configured
output-root symlink's current target as authoritative: retargeting that symlink
to a relocated valid package allows the package to resume with its valid token
instead of returning `E_APPROVAL_RESUME`.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **I4-R2 — Retargeting the configured output-root symlink adopts a relocated package** (`.agents/skills/explainer-kit/scripts/run.mjs:818`)
  - Issue: `loadResumableRun()` resolves `normalized.outputRoot` to the
    symlink's current target at line 760 and correctly confines the discovered
    run root beneath that current target. Its retained-request identity check,
    however, starts at line 818 and does not compare the persisted canonical
    `outputRoot`. A direct probe initialized a request through
    `configured-link -> original`, paused the run, renamed `original` to
    `relocated`, retargeted `configured-link -> relocated`, and resumed the
    unchanged lexical request with the valid external approval token. Resume
    completed as `built-not-durable` beneath `relocated`; it did not return
    `E_APPROVAL_RESUME`. This is a canonical-root mismatch and adopts a package
    moved outside its original canonical output root.
  - Fix: Add one bounded p04 task that binds resume identity to the canonical
    output root persisted when the run was created. For current absolute
    retained requests, compare `persistedRequest.outputRoot` with the current
    canonical output root before returning or hydrating the retained run and
    fail mismatches with `E_APPROVAL_RESUME`. If legacy relative requests must
    remain resumable, preserve the existing changed-CWD case explicitly without
    allowing that compatibility path to weaken absolute canonical-root
    identity. Add regressions for a stable configured-root symlink, a
    retargeted configured-root symlink, the existing run-root symlink escape,
    valid changed-CWD resume, and approval/request-identity mismatch.
  - Requirement: p04-t11 steps 2-4 require canonical-root mismatches and
    symlink escapes to return `E_APPROVAL_RESUME` before retained package paths
    are adopted while preserving a legitimate package at its original
    canonical location.

### Medium

None.

### Minor

None.

## Finding Disposition

| Finding                                             | Disposition                               | Evidence                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1-R1 — complete artistic graph semantics           | **Resolved**                              | Production observation and comparison include direction; node ID, label, shape, and explicitness; and edge from, to, kind, and label. Exact complete tuples pass, every independently mutated semantic field fails before critic invocation, omitted/duplicate/malformed/ambiguous/noncanonical observations fail, frozen planner input rejects mutation, and linear graphs remain inline-renderable. |
| I4-R1 — resume confinement                          | **Partially resolved / blocked as I4-R2** | A run-root symlink to an out-of-root relocated package now returns `E_APPROVAL_RESUME`, and ordinary canonical containment plus legitimate changed-CWD and identity checks pass. Retargeting the configured output-root symlink to the relocated package is still accepted.                                                                                                                           |
| Original C2 — normalized backlink escape            | **Remains resolved**                      | The canonical tuple round-trips and literal/encoded dot, empty segment, decoded separator, noncanonical encoding, and moving-ref mutations fail; core and bundled contract modules remain byte-identical.                                                                                                                                                                                             |
| Original I1 — mutable bytes labeled as reviewed Git | **Remains resolved**                      | A direct temporary-repository probe matched the reviewed commit, raw Git-blob SHA-256, claim text, and line range, then rejected dirty and untracked source states.                                                                                                                                                                                                                                   |
| Original I2 — catalog trusts candidate origin       | **Remains resolved**                      | The exact configured publish-root URL validates; wrong origin/base, encoded path, query, fragment, and credentials mutations fail.                                                                                                                                                                                                                                                                    |
| Original I3 — completion fixtures regress           | **Remains resolved**                      | Completion, browser, critic, evidence, durability, and package coverage remain green in the complete p03/p04 union and smoke suites.                                                                                                                                                                                                                                                                  |

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md`, `plan.md`,
`implementation.md`, `state.md`, source review
`reviews/20260729-p04-code-review-r1.md`, the two authoritative task commits,
current production sources, focused tests, complete regression suites, and
independent probes. This is import mode; no `spec.md` or `design.md` is present
or required.

### Requirements Coverage

| Requirement                          | Status      | Notes                                                                                                                                                       |
| ------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p04-t10 complete graph binding       | Implemented | Complete canonical graph tuples match exactly before visual review; all required drift and malformed observation classes fail closed.                       |
| p04-t11 canonical resume confinement | Partial     | Run-root symlink confinement works, but a configured-root symlink can be retargeted to the relocated valid package without a canonical-root mismatch error. |
| Previously resolved p04 findings     | Implemented | Backlink, reviewed Git blob, catalog-root, completion, CLI, package, and smoke behavior remain green.                                                       |
| p03 regression safety                | Implemented | Browser, critic, evidence, durability, completion, and package coverage pass in the complete union.                                                         |

### Extra Work

None in p04-t10 or p04-t11. The authoritative range also contains two
root-owned review/tracking commits; those files were inspected for scope
separation and excluded from implementation-quality findings.

## Independent Verification

- `git diff --check 0158516b..f2d3ecc7` — passed.
- Focused graph-semantic and resume tests — **30/30 passed**.
- Complete p03/p04 explainer-kit and OAT adapter union — **427/427 passed**.
- CLI archive and public-package contracts — **77/77 passed**.
- Complete explainer smoke suite — **8/8 passed**.
- Complete repository and release gates — passed: `pnpm check`, lint, format,
  type-check, full test, build, and `release:validate`; five public packages and
  65 visual measurements validated.
- Direct graph probes:
  - the exact direction, node ID/label/shape/explicitness, and edge
    from/to/kind/label tuple passed;
  - changing each semantic field while retaining the same IDs/endpoints failed
    with `E_DIAGRAM_TOPOLOGY`;
  - omitted, duplicate, malformed, ambiguously encoded, noncanonically encoded,
    and endpoint-only representations failed before visual review;
  - the planner graph rejected mutation, and a linear graph remained
    inline-renderable.
- Direct resume probes and focused regressions:
  - moving the valid package out of the configured root and replacing the
    original run root with a symlink returned `E_APPROVAL_RESUME`;
  - legitimate changed-CWD resume and approval token/request-identity checks
    passed;
  - retargeting the configured output-root symlink to the relocated package
    resumed successfully and completed `built-not-durable`, reproducing I4-R2.
- Direct backlink, reviewed Git-blob, and exact catalog-root probes passed all
  positive cases and rejected their representative escape/mutation cases.

## Changed-file Confirmation

Task commit `995c38a9936e9af0d4a5bbd02da59a1e45563713` changes the six declared
p04-t10 files. Task commit `f2d3ecc775fd9f85cfe8568afab8212da12305b3`
changes the two declared p04-t11 files, one of which overlaps p04-t10, for seven
unique product files. The authoritative range contains four commits: those two
task commits and two root-owned review/tracking commits. Current `HEAD`
`bf97435db591472799144aa6f635822e2da5aba4` is after reviewed head
`f2d3ecc775fd9f85cfe8568afab8212da12305b3`; that excluded delta contains only
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

Run `oat-project-review-receive` and add one bounded task to bind resume to the
original persisted canonical output root, with configured-root retarget
regressions. Phase p04 remains blocked until a fresh attempt-3 review reports no
Critical or Important findings.
