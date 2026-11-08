<!--
Provenance: captured reviewer output. The m02 milestone exit gate of .oat/projects/shared/review-gate-integrity-goal (configured oat-project-implement gate, operator-routed scope p07-p13), run 93e1b0a1-9b04-4c31-9aa2-e032b9820a9d, target codex-6-sol-xhigh (gpt-6.1-sol, xhigh), wrote this review artifact; it is kept local-only at reviews/archived/range-review-2026-11-03T215601Z.md and the gate parsed it to 0/0/2/0 (critical/high/medium/low).
Derivation: everything from the opening frontmatter line through the end of the ## Findings section is byte-for-byte the archived artifact; the sections after ## Findings (Requirements/design alignment; Verification commands; Recommended next step) are omitted because the parser and the convergence key read only frontmatter and Findings.
Use: tests strip this comment and the blank line after it before parsing. Copied for p08 (rgi-p08-impl-20261107-01) on 2026-11-07.
-->

---
oat_generated: true
oat_generated_at: 2026-11-03T21:56:01Z
oat_review_scope: p07-p13
oat_review_type: code
oat_review_invocation: gate
oat_project: .oat/projects/shared/review-gate-integrity-goal
oat_review_requested_scope: p07-p13
oat_review_phase_ids: [p07, p12, p13]
oat_review_base_sha: eba04d813a4d342523a6235009019a0c31f880a3
oat_review_head_sha: 2375b77bd1b1326b5feec60ae7258f3bbeb7556a
oat_review_range: eba04d813a4d342523a6235009019a0c31f880a3..2375b77bd1b1326b5feec60ae7258f3bbeb7556a
oat_review_scope_source: anchors
oat_gate_headless: true
oat_gate_run_id: 93e1b0a1-9b04-4c31-9aa2-e032b9820a9d
oat_gate_target: codex-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-6.1-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Code review: p07-p13

**Reviewed:** 2026-11-03T21:56:01Z
**Scope:** p07, p12 and p13, in brief order.
**Files reviewed:** 73 changed paths, including code, tests, skills, templates, documentation and tracking evidence.
**Commits:** `eba04d813a4d342523a6235009019a0c31f880a3..2375b77bd1b1326b5feec60ae7258f3bbeb7556a`
**Dispatch audit (policy view):** `Dispatch: scope=p07-p13 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high`

## Summary

The implementation supplies the planned event ledger, gate-event resolver and pending-review listing. Two Medium defects remain at the new reader boundaries: malformed ledger heads bypass exact-head validation, and synced projects evaluate status ancestry in their tracking repository. No Critical or High findings.

Findings by severity: 0 critical, 0 high, 2 medium, 0 low

## Review scope

Workflow mode is `goal`; the project remains active at milestone m02. This is the requested phase-range exit review, not the subsequent integrated milestone review or a whole-project final review. The committed phase anchors resolve to p07, p12 and p13 with valid existence, ancestry and continuity. There are no integration merge commits in the range.

The narrowing preference resolves to `true`, but there is no prior completed `p07-p13` code review in gate lineage `codex-6-sol-xhigh`, so the full anchored range was reviewed. Working HEAD before bookkeeping was `0af0f507d739ecd6bdaf9f01627f19a4ea5d20d3`; its differences from the reviewed head are confined to this project's four tracking files.

**Journal check:** `ok` for `p07,p12,p13`, with no reasons or warnings.

Evidence sources used: committed `plan.md` Outcomes, Constraints and Out of Scope, Decisions, and the p07/p12/p13 Intent and Exit evidence; their `implementation.md` task records, anchors, probes and review receipts; `state.md`; and the brief contract sections 10 and 12. Discovery, spec, design and import-reference artifacts are absent by design in goal mode. The canonical `.agents/agents/oat-reviewer.md` supplied the review contract. Existing deferrals were inspected for scope context and were not promoted into new requirements.

The headless helper's `inline` route was validated against `OAT_GATE_CLI_ROOT`. It reported a matching runtime marker and unavailable model evidence. Gate invocation metadata above records the exact supplied configuration; the policy stamp is a separate resolver view and supplies no independent runtime telemetry. No delegated reconnaissance was attempted.

## Findings

### Critical

None

### High

None

### Medium

- **M1: Preserve invalid Reviewed Head cells for exact-event validation** (`packages/cli/src/commands/review/resolve.ts:430`)
  - Issue: `parseReviewTable` drops every non-full-SHA Reviewed Head value, so `!rowHead` treats an abbreviated SHA or `not-a-sha` exactly like the permitted `-` placeholder. A matching artifact/run with either malformed cell returns `status: ok`, exit 0 and `checks.reviewedHead: unavailable`, despite the cell differing from the event's full SHA. A transcription error therefore bypasses the new receive validation instead of producing a structured refusal.
  - Requirement: p12 requires exact equality against the event's reviewed head and specifically accepts a `-` cell as unavailable. The shipped CLI reference likewise says every other difference is `reviewed_head_mismatch`.
  - Fix: Retain the raw head cell at this boundary, distinguish an absent/placeholder head from a present invalid value, and refuse the latter with a structured diagnostic. Preserve compatibility for genuine placeholders and legacy absent columns. Add a resolver-boundary regression for abbreviated and malformed non-placeholder cells alongside the existing matching, wrong-full-SHA and `-` controls.

- **M2: Resolve synced-project review ancestry in the source repository** (`packages/cli/src/commands/review/head-ancestry.ts:65`)
  - Issue: `getProjectStateWithReviewAncestry` runs Git with `cwd: projectPath`. A synced project is a nested Git checkout containing its tracking history; Reviewed Head cells refer to the source repository's implementation commits. Those commits are unavailable in the tracking checkout, so the helper leaves the older event live. With source commits H1 → H2, an active received gate review at H1 and a later passed gate review at H2, `project status` recommends review-receive after a nested `.git` is added, while `review latest --actionable-project` returns null and `review check` reports the event superseded. This can repeatedly route a synced project to a receive step with no actionable artifact.
  - Requirement: p07 and Outcome 4 require readers selecting an event to ignore a superseded received row and require descendant-head supersession to agree across the CLI readers. Synced scope is an existing supported project scope, with no exclusion in the brief.
  - Fix: Pass or resolve the source repository root for the status reader's ancestry queries, rather than using the nested project checkout as the Git boundary. Keep the control-plane reader pure. Extend the existing real-Git wiring test with a nested synced checkout and source-repository head SHAs; require status, latest and check to agree, retaining the unresolved/non-descendant control.

### Low

None
