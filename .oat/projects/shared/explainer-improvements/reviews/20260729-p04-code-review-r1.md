---
oat_generated: true
oat_generated_at: 2026-07-29T06:13:40Z
oat_review_scope: p04-remediation-r1
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p04 Remediation Re-review 1/3

**Reviewed:** 2026-07-29T06:13:40Z
**Scope:** Original C1, C2, I1, I2, and I3; p04-t05 through p04-t09; regression safety for accepted p04 behavior and p03 browser, critic, evidence, and package coverage
**Files reviewed:** 26 product files in the five task commits plus focused regression sources
**Commits:** `cf579ca39ba6b0bc7b22e2adb70287dc1e77049f..0158516be8f7dd844466295a2982a18bfebfee42`
**Verdict:** BLOCKED

## Summary

The remediation resolves the backlink normalization, reviewed-Git-blob,
catalog-root, and completion-fixture findings, and its normal changed-CWD resume
case succeeds. Phase p04 remains blocked because artistic graph validation
compares only node IDs and edge endpoints rather than the complete planner-owned
node and edge semantics, and resumable-run discovery follows a run-root symlink
outside the configured output root.

Findings: 1 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

- **C1-R1 — Artistic validation still permits semantic node and edge drift** (`.agents/skills/explainer-kit/scripts/lib/diagram.mjs:241`)
  - Issue: `assertAuthoredGraphSemantics()` reduces every observed edge to
    `from`/`to`, reduces every planned edge the same way at line 245, and reduces
    every planned node to `id` at line 244. The planner-owned contract requires
    node `label`, `shape`, and `explicit` fields and edge `kind` and `label`
    fields, but authored HTML need not expose or preserve any of them. A direct
    probe parsed a labeled arrow (`-->|approve|`) and an undirected line (`---`);
    endpoint-only HTML with empty node elements passed validation. An author can
    therefore remove or invert user-visible labels, change a decision diamond
    to a rectangle, or change directed and undirected relations while passing
    before visual review.
  - Fix: Extend the authored observation contract to carry canonical node label,
    shape, and explicitness plus edge kind and label, then compare complete node
    and edge multisets. Add pre-critic regressions that keep IDs/endpoints fixed
    while changing each semantic field. If artistic HTML cannot represent and
    validate the complete tuple, reject it with `E_DIAGRAM_TOPOLOGY`.
  - Requirement: Original C1 and p04-t05 steps 2-4/acceptance require exact
    planner-owned direction, node, edge, and topology semantics, not endpoint
    connectivity alone.

### Important

- **I4-R1 — Resume follows a run-root symlink outside the configured output root** (`.agents/skills/explainer-kit/scripts/run.mjs:802`)
  - Issue: `loadResumableRun()` calls `realpath(runRoot)` and adopts the result
    without rejecting a symbolic-link run root or proving the canonical result
    remains under the canonical configured output root. A direct probe paused a
    valid run, moved its package to a sibling outside the output root, replaced
    the original run path with a symlink, and resumed with the valid external
    token. The run completed as `built-not-durable` and returned the canonical
    sibling path outside the configured root. This bypasses the confinement
    invariant that `createConfinedRunRoot()` enforces for new runs.
  - Fix: Canonicalize the configured output root, reject a symbolic-link run
    root, and require the discovered canonical run root to remain within that
    canonical output root before reading or adopting retained paths. Preserve
    the p04-t09 changed-CWD behavior and existing request-identity checks. Add a
    resume regression that swaps the run directory for an out-of-root symlink
    and expects `E_APPROVAL_RESUME`.
  - Requirement: p04-t09 step 3 requires canonical resumed paths without
    weakening root confinement or request identity.

### Medium

None.

### Minor

None.

## Original Finding Disposition

| Original finding                     | Disposition    | Evidence                                                                                                                                                                             |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1 — artistic graph semantics        | **Unresolved** | Missing/extra/duplicate/rewired/ambiguous ID/endpoint mutations now fail and the graph input is frozen, but node labels/shapes/explicitness and edge kinds/labels remain unverified. |
| C2 — normalized backlink escape      | **Resolved**   | Canonical parser rejects literal/encoded dot, empty, decoded-separator, noncanonical-encoding, malformed-range, and moving-ref cases after normalization.                            |
| I1 — mutable bytes labeled as `HEAD` | **Resolved**   | Adapter reads `<sha>:<path>`, derives claims/ranges/hashes from those bytes, and rejects dirty and untracked mismatches.                                                             |
| I2 — catalog trusts candidate origin | **Resolved**   | Validator derives the exact URL from the normalized configured root and manifest path; wrong origin/base/encoding/query/fragment/credentials fail.                                   |
| I3 — completion fixtures regress     | **Resolved**   | Completion fixtures own real Git initialization, origin, commit, and provenance; all 17 completion cases and the p03/p04 union pass.                                                 |

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md`, `plan.md`,
`implementation.md`, `state.md`, the original p04 review, the five authoritative
task commits, current production sources, tests, and independent probes. This is
import mode; no `spec.md` or `design.md` is present or required.

### Requirements Coverage

| Requirement                          | Status      | Notes                                                                                                         |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| p04-t05 graph binding                | Partial     | Planner graph input is frozen and endpoint drift fails, but complete node/edge semantics are not observed.    |
| p04-t06 canonical reviewed backlinks | Implemented | One bundled contract binds exact canonical URLs and reviewed Git blob bytes across core, adapter, and CLI.    |
| p04-t07 exact catalog root           | Implemented | Complete artifact URLs derive from the normalized configured publish root and manifest.                       |
| p04-t08 completion provenance        | Implemented | Adapter-owned real Git provenance and prior completion/browser/critic behavior pass.                          |
| p04-t09 canonical resume paths       | Partial     | Normal changed-CWD resume and identity mismatch checks pass; out-of-root run-root symlinks remain accepted.   |
| Previously accepted p04 behavior     | Implemented | Linear inline rendering, publication/receipt behavior, archive parsing, and packaged provenance remain green. |
| p03 regression safety                | Implemented | Browser, critic, PNG/evidence, durability, completion, package-coverage, and smoke regressions pass.          |

### Extra Work

None in the five task commits. The authoritative remediation range also contains
root-owned OAT review/tracking updates; they were inspected for scope separation
but excluded from implementation quality findings.

## Independent Verification

- `git diff --check cf579ca3..0158516b` — passed.
- Complete explainer-kit and OAT adapter p03/p04 union — **421/421 passed**.
- CLI archive and public-package contracts — **77/77 passed**.
- Complete explainer smoke suite — **8/8 passed**.
- Original focused p04 core/adapter command — **123/123 passed**.
- Original focused CLI archive command — **60/60 passed**.
- Original completion plus package-smoke command — **23/23 passed**.
- `pnpm check`, lint, format, type-check, full test, build, and
  `release:validate` — passed; five public packages and 65 visual measurements
  validated.
- Direct graph probes:
  - missing, extra, duplicate, rewired, and ambiguous node/endpoint
    observations failed; exact endpoint observations passed;
  - the planner graph and nested edge array rejected mutation;
  - a linear graph remained inline-renderable;
  - a graph containing a labeled arrow and an undirected line nevertheless
    accepted endpoint-only HTML with empty node observations.
- Direct backlink probe derived the exact canonical URL from the complete tuple
  and rejected literal dot, encoded dot, empty, decoded slash, noncanonical
  encoding, and moving-ref URLs. `cmp` confirmed the core and bundled CLI
  contract modules are byte-identical.
- Direct Git probe matched revision, raw-blob SHA-256, claim text, and line
  range, then rejected both dirty and untracked source states.
- Direct catalog probe rejected wrong origin, wrong base, encoded path, query,
  fragment, and credentials against the exact configured publish root.
- Focused changed-CWD resume and changed-fact-base identity checks — **2/2
  passed**.
- Direct resume-confinement probe followed an in-root symlink to a valid package
  in a sibling directory outside the configured output root and completed there.

## Changed-file Confirmation

The five task commits contain exactly the declared p04-t05 through p04-t09
surfaces: 10 files in p04-t05, 17 in p04-t06, 3 in p04-t07, 1 in p04-t08, and 2
in p04-t09, for 26 unique product files. Current `HEAD`
`6d45b9ffde450afaf772eb592eb4530c977e5859` is after reviewed implementation
head `0158516be8f7dd844466295a2982a18bfebfee42`; that excluded delta contains only
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

Run `oat-project-review-receive` and add two bounded attempt-2 tasks: complete
artistic node/edge semantic validation and restore resume-time run-root
confinement. Do not close Phase p04 until a fresh re-review reports no Critical
or Important findings.
