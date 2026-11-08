# Bookkeeping-Only Review Findings

A review or gate result can block on findings that ask only to correct a
project's own records: a stale Reviews cell, an artifact path that should
point at `reviews/archived/`, a progress counter that disagrees with the
journal. Re-running a reviewer, counting a review cycle or consuming a gate
attempt for such a result spends independent review on nothing that can change
what ships. This document defines once which findings are bookkeeping and what
receiving an all-bookkeeping result permits. Every project review and gate path
that applies the rule names this definition rather than restating it.

The same receivers also record one class for every finding they receive
([Finding classes at receive](#finding-classes-at-receive)), so that a finding
no contract source requires reaches the operator before any fix work exists for
it. Bookkeeping is one of those classes, decided by the definition below.

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
   `implementation.md`, `project-log.md` and `summary.md`. Review artifacts
   are not tracking files: the fix may move one of the project's review
   artifacts, as receive does when it archives one, but never edits a review
   artifact's findings, frontmatter or provenance. Requirement artifacts
   (`discovery.md`, `spec.md`, `design.md`) are never tracking files.
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

## Finding classes at receive

Every project review and gate receive records exactly one class for each
finding of the result before it creates any fix task, execution record,
artifact edit or deferral for that finding. The receiving agent classifies, as
it does for bookkeeping; the reviewer's findings, severities, counts and
verdict are never changed.

| Class                  | Applies when                                                                                       | Citation            |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| `bookkeeping`          | The finding meets the definition above, its exclusions and its limits                              | none                |
| `regression`           | The reviewed change broke behavior that worked before it                                           | what broke          |
| `accepted-requirement` | A contract source requires what the finding asks for                                               | the contract source |
| `new-hardening`        | No contract source requires it: it asks for a guarantee, safeguard or behavior beyond the contract | none                |

When more than one class fits, the first in this order wins: `bookkeeping`,
`regression`, `accepted-requirement`, `new-hardening`. A doubtful finding is
not bookkeeping, and a finding the receiver cannot tie to a contract source is
`new-hardening`.

**Contract sources.** A contract source is an approved record the reviewed
work must satisfy:

- the project's requirement artifacts: `discovery.md`, `spec.md` and
  `design.md`; the imported plan in import mode; and, in lite, brief and goal
  modes, the requirement sections of `plan.md` (for a brief: Goal, Outcomes,
  Constraints and Out of Scope, Decisions, and the phase's Intent and Exit
  evidence);
- for a code review, the approved plan's tasks or phase blocks that cover the
  reviewed work;
- the backlog items the project closes and the decision records under
  `.oat/repo/reference/decisions/`; and
- the repository instructions every change must meet (the applicable
  `AGENTS.md` files).

A reviewed artifact is never its own contract source: a plan review cites what
the plan was built from, never the plan. A requirement the operator accepts at
receive is cited by that decision from then on.

**The record.** The receipt each path already writes carries one line beside
its `**Findings:**` line. It adds no Reviews column, status or record:

```markdown
**Finding classes:** H1 accepted-requirement (spec.md FR3) · M1 regression (first-run gate envelope) · M2 new-hardening · L1 bookkeeping
```

Entries are separated by `·`. An `accepted-requirement` entry names its
contract source and a `regression` entry names what broke, in parentheses;
`bookkeeping` and `new-hardening` entries carry no citation.

**Routing.** A finding becomes fix work (a fix task, an execution record or an
artifact edit) only when its recorded class is `bookkeeping`, `regression`, or
`accepted-requirement` with its source in parentheses. Every other finding (a
`new-hardening` finding, an `accepted-requirement` that cites no source, or a
finding with no recorded class) reaches the operator before any fix work,
edit or deferral exists for it. With `FINDING_CLASSES` set to the record line's
text after its label, this partition is exact:

```bash
printf '%s\n' "$FINDING_CLASSES" | awk '{
  n = split($0, entries, / · /)
  for (i = 1; i <= n; i++) {
    entry = entries[i]
    sub(/^ +/, "", entry); sub(/ +$/, "", entry)
    if (entry == "") continue
    split(entry, words, " ")
    if (entry ~ /^[^ ]+ bookkeeping$/ || entry ~ /^[^ ]+ regression( \(.+\))?$/ ||
        entry ~ /^[^ ]+ accepted-requirement \(.+\)$/) print "fix " words[1]
    else print "operator " words[1]
  }
}'
```

The operator decides each finding routed to it: accept it as a requirement (it
is then recorded `accepted-requirement` citing that decision and handled like
any other), defer it (one `## Deferred Findings` line that names the
operator), or reject it (recorded with the operator's reason). No receive mode
decides such a finding by its own defaults. In an interactive run the receiver
puts the question to the operator before creating fix work for it. Under
`OAT_AUTONOMOUS=1`, or with no operator channel, the receiver records the class,
creates no fix work for that finding, commits the receive's bookkeeping and
stops at a `product-judgment` boundary that lists each such finding with its
missing source; the operator's decision is recorded on resume. The result's
other findings follow their path unchanged.

Routing a finding to the operator changes no count, severity, verdict,
Reviews status rule, review-cycle count or gate attempt, and adds no
allowance: a blocking gate stays blocked, and its `onFailure` policy and
attempt count apply to the result as before. When a review or gate budget runs
out, the complexity review in `complexity-review-fallback.md` starts from these
recorded classes.
