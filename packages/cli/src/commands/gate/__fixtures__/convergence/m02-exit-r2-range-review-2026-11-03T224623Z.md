<!--
Provenance: captured reviewer output. The m02 milestone exit gate of .oat/projects/shared/review-gate-integrity-goal (configured oat-project-implement gate, operator-routed scope p07-p-rev2), run d738cd0e-5795-48ef-a387-e3ec184f90e5, target codex-6-sol-xhigh (gpt-6.1-sol, xhigh), wrote this review artifact; it is kept local-only at reviews/archived/range-review-2026-11-03T224623Z.md and the gate parsed it to 0/0/1/0 (critical/high/medium/low).
Derivation: everything from the opening frontmatter line through the end of the ## Findings section is byte-for-byte the archived artifact; the sections after ## Findings (Requirements/design alignment; Verification commands; Recommended next step) are omitted because the parser and the convergence key read only frontmatter and Findings.
Use: tests strip this comment and the blank line after it before parsing. Copied for p08 (rgi-p08-impl-20261107-01) on 2026-11-07.
-->

---
oat_generated: true
oat_generated_at: 2026-11-03T22:46:23Z
oat_review_scope: p07-p-rev2
oat_review_type: code
oat_review_invocation: gate
oat_project: .oat/projects/shared/review-gate-integrity-goal
oat_review_requested_scope: p07-p-rev2
oat_review_phase_ids: [p07, p12, p13, p-rev1, p-rev2]
oat_review_base_sha: eba04d813a4d342523a6235009019a0c31f880a3
oat_review_head_sha: d128a41181d86d258be802500c4129bf45ed0fa0
oat_review_range: eba04d813a4d342523a6235009019a0c31f880a3..d128a41181d86d258be802500c4129bf45ed0fa0
oat_review_scope_source: anchors
oat_gate_headless: true
oat_gate_run_id: d738cd0e-5795-48ef-a387-e3ec184f90e5
oat_gate_target: codex-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-6.1-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Code review: p07-p-rev2

**Reviewed:** 2026-11-03T22:46:23Z
**Scope:** p07, p12, p13, p-rev1 and p-rev2, in brief order.
**Files reviewed:** 75 scoped paths; production logic, consumer guidance, tests and documentation inspected, with generated copies and release metadata checked through the diff.
**Commits:** `eba04d813a4d342523a6235009019a0c31f880a3..d128a41181d86d258be802500c4129bf45ed0fa0`
**Dispatch audit (policy view):** `Dispatch: scope=p07-p-rev2 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high`

## Summary

The two previous exit-review defects are resolved: invalid ledger heads are refused, and the tested synced-project readers agree on descendant-head supersession. One Medium defect remains in p13: a waiver that became inactive after a recorded review applies again to a newly pending event, allowing the PR preflight to omit that required review.

Findings by severity: 0 critical, 0 high, 1 medium, 0 low

## Review scope

The workflow mode is `goal`, with m02 still implementing. This is the requested phase-range exit review, not the subsequent integrated milestone review or a whole-project final review. The canonical anchor resolver accepted the five phases above, including p-rev1 correcting p12 and p-rev2 correcting p07. All anchors exist and satisfy ancestry, sequential continuity and aggregate containment. There are no integration merge commits in the range.

`workflow.autoNarrowReReviewScope` resolves to `true`. No prior completed code review matches the exact `p07-p-rev2` scope and gate target `codex-6-sol-xhigh`, so the full anchored range was reviewed. Working HEAD before bookkeeping was `a1583d756aaa18a6bec7ff680aa50e4c5940dc3a`; only the project's tracking files differ between that commit and the reviewed head. Fetching `origin/main` revealed no new commits in the reviewed paths since the branch base.

Evidence sources used: committed `plan.md` Outcomes, Constraints and Out of Scope, Decisions, and the five selected phases' Intent and Exit evidence; `implementation.md` anchors, execution records, probes and review receipts; `state.md`; brief contract sections 10 and 12; and the canonical `.agents/agents/oat-reviewer.md`. Discovery, spec, design and imported-plan artifacts are absent by design. Existing deferrals were inspected as context and were not promoted into new requirements.

The gate-supplied executable returned `route: inline`, with a matching Codex runtime marker and unavailable model evidence. Its reported CLI root was checked against the module root of that exact executable. The outer environment supplies no `OAT_GATE_CLI_ROOT`; the executable resolves to the installed 0.3.45 package. Branch behavior was verified separately through `node packages/cli/dist/index.js`, version 0.3.46. The gate frontmatter preserves the supplied invocation configuration; the labeled policy stamp is a separate resolver view and supplies no independent runtime identity.

## Review Orchestration

| Wave           | Task class        | Classification rationale                                                                                                                               | Selected target                                                        | Acceptance / outcome                                                                                                                                                                                                    | Floor satisfaction                                                                                                                         | Fallback             |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| review-recon-1 | intelligent-recon | Bounded semantic checks of event consumption and pending-review selection can silently miss consumer disagreement; the primary retains final judgment. | Codex `default` role, `gpt-6.1-terra`, `medium`, native, fresh context | Both read-only lanes accepted and completed. `d738cd0e-resolver` inspected the event resolver and gate handoffs; `d738cd0e-pending` inspected the listing and PR consumers. No worker wrote files or launched children. | Satisfied by the live native selectors and provider guidance dated 2026-10-31. Configured payload accepted; runtime identity not reported. | None; retry limit 0. |

**Primary reconciliation:** Reopened the resolver's binding, scope/type/run/head checks, the gate output paths and the handoff instructions. Independently ran the waiver sequence below before accepting the pending lane's observation as M1. The event lane found no bypass. Its null-head wording observation does not change fail-closed behavior. The separate suggestion to reject waivers missing attribution fields was not promoted: the adopted CLI contract expressly requires a reason but establishes no additional machine validation guarantee. Supersession, scaffolds, the revision fixes, tests and documentation were inspected in the primary context. All child work completed before bookkeeping.

## Findings

### Critical

None

### High

None

### Medium

- **M1: Keep an expired waiver from hiding a later pending review** (`packages/cli/src/commands/review/pending.ts:329`)
  - Issue: Waiver applicability consults only the latest Scope + Type status. With an operator waiver dated November 1, a later passed event dated November 2 correctly makes the waiver inactive. Appending a new pending event for the same key makes that old waiver active again: the branch CLI returns `pending: []` and places row 3 in `waived`, using the November 1 reason. Both PR skills continue when pending and missing are empty, so an autonomous PR preflight can proceed without a review or a fresh waiver for the newly pending work. A later pending placeholder is a supported case, explicitly covered by `pending.test.ts:208`.
  - Requirement: p13 Intent and Exit evidence require a waiver to become inert once a later row records a review. The Reviews documentation also states that an earlier passed row must never hide a later pending row. This is a gap in that accepted behavior, not a request for a new approval system.
  - Fix: Ensure a waiver retired by a subsequent recorded review cannot apply to a later pending event. Retain enough ordering or applicability information to distinguish the waived obligation from a later one without altering previous ledger events. Add one regression at the pending-listing boundary covering waiver, recorded review, then new pending event. Keep controls for an active waiver and an inactive waiver after a recorded review.

### Low

None
