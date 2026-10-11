# Astra v1.5 plan-revision round 2 (final plan round)

- **Date:** 2026-10-11
- **Reviewer:** Astra (gpt-6-astra, reasoning high, Codex provider, read-only delegate)
- **Reviewed head:** 58a721556 (design revision 4.0, plan revision 5 as first applied)
- **Verdict as returned:** NOT ALIGNED, with five paste-ready edits that remove every block; applied verbatim in the follow-up commit (round cap of two reached, so the edits were applied as Astra's own text rather than opening a third round)

## Per-item verdict

| Item | Verdict                  | Finding                                                                                                                                                             |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Applied with a deviation | review-receive still set `oat_current_task_id` and `oat_milestone_status: implementing` unconditionally, contradicting older-delivery recovery isolation            |
| A2   | Applied with a deviation | "`observed_head` differs from `reviewed_head` … marks … `stale`" survived in the Endpoint refresh paragraph, contradicting bookkeeping-successor freshness          |
| A3   | Applied with a deviation | endpoint refresh still ran "by the closeout boundary" (not read-only); the audit sample's scalar phase dispositions could not carry deferral reasons or references  |
| A4   | Faithfully applied       | transitive union, disjoint terminal scopes, inherited obligations counted once, full-scope evidence and historical bindings survived the table rewrite              |
| B1   | Faithfully applied       | shared membership reader, both project readers, validation, scaffold source and next-dispatch concreteness covered                                                  |
| B2   | Faithfully applied       | explicit semantic sets, no first–last expansion, immutable delivery scopes, integration-head evidence; the interleaving verification case was missing (added below) |
| B3   | Faithfully applied       | p10-t04 includes the boundary, refusals, archive preservation, source provenance and the shared readiness clause                                                    |
| B4   | Applied with a deviation | the `delivered → aligning` prerequisite still allowed "endpoint `open` agreed"; agreement alone is weaker than observed satisfaction                                |

The router ownership and coverage-table rewrites otherwise preserve the round-1 semantics; nullable `reviewed_head` carries a separate subject binding; declaration precedes coverage; the goal exceptions preserve landed v1 behavior through the winning brief contract.

## Edits applied (verbatim)

1. design.md "Endpoint refresh" replaced by "Endpoint observation and refresh": refresh persists observations; pr-progress runs it before registration, goal on entry at `delivered`; the closeout boundary obtains the same observations read-only without invoking the persisting command; all consumers derive freshness through the shared bookkeeping-successor evaluator; unequal heads alone do not invalidate evidence; reviewed revisions and gate outcome status unchanged.
2. design.md "Reconcile and review-receive": pointer → first incomplete unit within the active scope, except older-delivery goal recovery, which advances only `oat_goal_recovery` and preserves the active milestone, status and pointer; review-receive updates the pointer for ordinary brief execution and active-milestone goal fixes (which also set `implementing`), while older-delivery fixes update only the recovery scope and stage.
3. design.md audit YAML: `phases: { pNN: { disposition, reason, scope_decision_ref } }`; deferred and retired entries require non-empty `reason` and `scope_decision_ref`; audit validation enumerates the full phase inventory before extraction or execution-scope filtering.
4. design.md transition table, `delivered → aligning` prerequisite: "learnings captured; fresh observations establish the previous delivery at its agreed endpoint, including when that endpoint is `open`".
5. plan.md: the "Goal guard verification, p09–p12" supplement before p09-t01 naming ten guards with their counterexamples (`goal-activation-prerequisites`, `goal-recovery-evidence`, `goal-carrier-subject`, `goal-successor-inspection`, `goal-audit-integrity`, `goal-terminal-observation`, `goal-supersession-integrity`, `goal-explicit-review-scope`, `goal-registration-resume`, `goal-promotion-unsettled`), each exercised once at its owning public boundary and referenced by p12.
