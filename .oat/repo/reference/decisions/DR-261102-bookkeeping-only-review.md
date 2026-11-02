---
id: DR-261102-bookkeeping-only-review
title: Bookkeeping-only review findings settle at receive without a rerun
date: 2026-11-02
status: accepted
legacy_id: null
---

# Bookkeeping-only review findings settle at receive without a rerun

## Context

Gate and review loops treated every blocking finding alike. A blocking review or gate whose only findings were tracking-record defects (a stale Reviews cell, a derived counter, a progress label, a resume pointer) still cost a fix round, a re-review and a gate attempt, and a gate could exhaust its attempts on records alone (issue #233). The review-gate-integrity goal first built a mechanical verifier with closed repair kinds and distinct records. A complexity review of that verifier on 2026-11-02 found its cost (about nine reader and skill edits for a new resolved status, plus the verifier) far exceeded the reruns it saved.

## Decision

One shared definition, .agents/docs/bookkeeping-findings.md, vendored into each skill that receives or settles a review, says what a bookkeeping finding is. Inclusions: a Reviews row cell, a derived counter, a task-SHA list, a progress label, provenance wording, and a resume pointer when the fix copies state the journal already records. Exclusions: a missing review, a requirement change, an approval, a new receipt, completion of unfinished work, and edits to Status acceptance markers, a Reviewed Head or another set-once field; a pointer or completion inferred from commits is never bookkeeping. Limits: the fix touches tracking files only; on goal paths it stays within brief contract section 12.8 (with the delivery check as fallback); and a Reviews Status becomes passed only through the review-receive branch, monotonically, with a missing row not counted as a stale cell. A doubtful finding is not bookkeeping. When every finding qualifies, review-receive applies the fixes in one tracking-file commit and records the round passed with a note (no new status). The settling owner then counts it as passing: no re-review, no fix round, no retry or cycle, no gate attempt and no relaunch. This holds at the receive branch, implement (per-phase loop, phase gate, final review, implement exit gate, goal milestone exit gate), the shared artifact-review loop in plan-writing, and the Gate Execution of discover, design, quick-start, plan, import-plan, brief, goal and lite. The raw verdict and counts stay in the receipt. The rule is enforced by the receiving agent judging against the definition, not mechanically.

## Consequences

Verified settlement (a verifier, closed repair kinds, distinct records, a resolved status) was dropped; the accepted cost is that classification rests on agent judgment, bounded by the exclusions, limits and the doubtful-means-no rule. Readers need no change because the outcome is an ordinary passed row and exit-gate effective-delta v2 already excludes project and repository records, so a tracking-only fix leaves the exit-gate generation fresh. A bookkeeping repair never infers completion, waives HiLL, grants approval or accepts an unresolved Critical. The #233 walkthrough (p11-t04) showed that incident does not qualify: its ledger finding demanded a missing review beside five content findings, so it still costs an attempt; the qualifying case is a blocking result whose findings are all records, such as the wave-skills-promotion p05 phase gate.
