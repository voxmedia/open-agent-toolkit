# Bookkeeping-Only Review Findings

A review or gate result can block on findings that ask only to correct a
project's own records: a stale Reviews cell, an artifact path that should
point at `reviews/archived/`, a progress counter that disagrees with the
journal. Re-running a reviewer, counting a review cycle or consuming a gate
attempt for such a result spends independent review on nothing that can change
what ships. This document defines once which findings are bookkeeping and what
receiving an all-bookkeeping result permits. Every project review and gate path
that applies the rule names this definition rather than restating it.

## Definition

A finding is **bookkeeping** when it only asks to correct a record of existing
evidence or state:

- a stale Reviews row cell or status label;
- an archived-artifact path reference;
- a derived counter;
- a task-SHA list;
- a progress label; or
- provenance wording.

A pointer such as `oat_current_task` or another resume pointer is bookkeeping
when the fix copies state the journal already records. A pointer or a
completion inferred from commits is never bookkeeping.

## Exclusions

A finding is never bookkeeping when it asks for:

- a missing review;
- a requirement change;
- an approval;
- a new receipt;
- completion of unfinished work; or
- an edit to a `**Status:**` acceptance marker, a Reviews row's
  `Reviewed Head`, or a set-once delivery field (brief contract section 12.8).

The `**Status:**` acceptance markers are the phase and task `**Status:**` lines
in `implementation.md`. The summary `**Status:**` line in `state.md` is a
progress label.

Severity and bookkeeping are separate dimensions. A High finding can be
bookkeeping, and a Low finding about content is still content.

## Limits on the fix

Three limits apply to the fix itself. A finding whose fix would break any of
them is not bookkeeping.

1. **Tracking files only.** The fix touches only the project's own tracking
   files under `.oat/projects/<scope>/<project>/`: `state.md`, the tracking
   sections of `plan.md` (its Reviews table and progress totals),
   `implementation.md`, `project-log.md`, `summary.md`, and the project's
   review artifacts. Requirement artifacts (`discovery.md`, `spec.md`,
   `design.md`) are never tracking files.
2. **Section 12.8 on goal paths.** On goal paths the fix is a change brief
   contract section 12.8 permits: a correcting journal line is appended rather
   than a recorded one rewritten, approved brief sections are never edited, and
   Reviews-row edits are limited to status and date cells or a move to the
   archived counterpart artifact.
3. **`passed` only from the receive branch.** A Reviews Status cell is set to
   `passed` only by the bookkeeping-only receive branch for the review being
   received. A bookkeeping fix never promotes any other review event. It may
   correct another existing event's stale non-`passed` Status, Date or
   Artifact cell, monotonically (never moving a status backward), but never
   that event's `Reviewed Head`. A missing row is not a stale cell: adding a
   row for another event is never bookkeeping. A structured `plan` review
   never passes through review-receive: for it, step 6 of the Auto
   Artifact-Review Loop in `oat-project-plan-writing` acts as that receive
   branch.

## Who classifies

The receiving agent classifies each finding against this definition. A
doubtful finding is not bookkeeping.

A reviewer may mark a finding `(bookkeeping)` inside its bold finding title,
for example `**M1 — Stale Reviews date cell (bookkeeping)**`. The mark is
advisory: it never changes a count, a severity or a verdict, the receiver
decides, a marked finding can still fail the definition, and an unmarked
finding can still meet it.

## What an all-bookkeeping result permits

When one review or gate result has at least one finding and every finding is
bookkeeping, the receiver:

- fixes them all in one commit and writes a one-line note per finding in the
  receipt;
- records the review's Reviews row `passed` with the note
  `bookkeeping-only fixes applied at receive`;
- dispatches no reviewer and counts no review cycle; and
- for a blocking gate result, uses no attempt and does not relaunch the gate.
  The gate counts as satisfied (carrier `status: allowed`,
  `disposition: passed`), while its receipt keeps the raw verdict and counts.

A result with any finding that is not bookkeeping follows the existing flow
unchanged, for every finding in it, including the bookkeeping ones.

The rule never rewrites raw findings, severities, counts or verdicts. A
bookkeeping repair never infers task or phase completion, waives a HiLL
checkpoint, grants an approval, or accepts an unresolved Critical finding.
Under `OAT_AUTONOMOUS=1` the rule applies without a stop.
