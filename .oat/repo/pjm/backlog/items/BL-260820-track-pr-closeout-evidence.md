---
id: BL-260820-track-pr-closeout-evidence
title: Track PR-closeout evidence freshness against the current head
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - closeout
  - freshness
  - reviews
  - gates
assignee: null
created: 2026-08-20T00:51:34.444Z
updated: 2026-11-02T00:00:00.000Z
associated_issues: []
external_plans: []
---

## Description

PR closeout evidence can become stale after the reviewed or tested head changes,
yet completion may still proceed without proving that every required closeout
check covers the current head. Persist source-head identity for closeout evidence
and fail closed when the evidence no longer matches the current PR head. Source:
[GitHub issue #201](https://github.com/voxmedia/open-agent-toolkit/issues/201).

**Delivery status (2026-10-31):** Landed: exit-gate freshness. The exit gate
persists an effective-delta implementation fingerprint against the logical
integration base and survives base-only updates (#164;
`.agents/skills/oat-project-implement/references/completion-and-closeout.md:505-548`).
Remaining: the other closeout receipts (reviews, checks, and the summary,
document and PR steps) are not bound to the head they covered, and PR progress
and final closeout do not compare them with the current head.

**Delivery status (2026-11-08):** Planned as review-gate-integrity p09 (Outcome 6) and deferred when the operator declared that goal met after m03; it stays open for a separate project.

## Acceptance Criteria

- Every closeout-relevant review, check, and gate receipt beyond the exit gate
  records the exact source head (or an equivalent immutable revision identity)
  that it covered; the exit gate keeps its effective-delta fingerprint.
- PR progress and final closeout compare every required receipt with the current
  head and report which evidence became stale after subsequent commits.
- Terminal completion fails closed while required evidence is absent or stale;
  rerunning the affected check against the current head restores eligibility.
- Head changes caused only by explicitly classified lifecycle bookkeeping are
  handled through a documented, deterministic rule rather than a broad freshness
  exemption.
- Tests cover current evidence, stale evidence, mixed receipts, post-review
  commits, and recovery after rerun across configured closeout sequences.

## Markdown docs bootstrap retrospective evidence

[RP-03: late documentation](../../../reference/project-summaries/20261002-markdown-docs-bootstrap.md#rp-03-add-a-late-documentation-case-to-closeout-freshness-tracking)
provides a real post-review control: accepted gate
`39b33a8d-8a63-41e5-af34-145a5d525935` was followed by public-docs commit
`420bceded`. The shipped documentation changed the gate fingerprint after
summary/document/PR closeout steps had already completed.

Resume must classify changed completed-step outputs, identify stale exact
receipts, and refresh affected evidence before approval while preserving the
completed sequence instead of resetting or reordering it. Public bundled docs
must not inherit the project/reference bookkeeping exemption. This strengthens
the existing freshness contract; it does not establish that current resume
incorrectly approves stale work.

## Merged from BL-261013-documentation-sync-after (2026-11-02 triage)

Same head-freshness problem: documentation written after the closeout snapshot leaves the passed exit gate not covering HEAD, silently. Its acceptance criteria apply here.

#### Description

OAT workflow feedback from the artifact-cleanup retrospective (UP-03). Running oat-project-document after the closeout snapshot is complete writes documentation outside the effective-delta exclusion set, so the passed implementation exit gate no longer covers HEAD. oat project closeout-check still reports complete and oat-project-complete does not re-check gate freshness, so the drift is silent unless the operator notices. In artifact-cleanup a two-sentence CLI-reference update needed an operator waiver to keep the gate's pass valid. Related: BL-260820-track-pr-closeout-evidence (closeout evidence vs current head) and BL-260903-project-document-should-prompt (re-running document after contract changes).

#### Acceptance Criteria

- Documentation written by `oat-project-document` after the closeout snapshot is complete either counts as a closeout-only descendant when a corroborating transition owns it, or the skill detects a passed exit gate whose freshness it would break and offers the operator waiver before committing
- `oat-project-complete` (or `closeout-check`) reports a passed gate that no longer covers HEAD instead of passing silently
- A fixture covers a docs-only commit after a passed gate: the stale state is reported, and a recorded waiver clears it
