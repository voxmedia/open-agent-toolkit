---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
oat_current_task_id: p01
oat_generated: false
oat_template: true
oat_template_name: implementation-brief
---

# Implementation: {Project Name}

**Started:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

> This journal records execution of the Project Brief in `plan.md` and is used
> to resume interrupted sessions.
>
> Conventions:
>
> - Progress counts phase-units: each `## Phase pNN:` in `plan.md` is one unit,
>   accepted only by the exact line `**Status:** completed` in its section here.
>   A provisional phase never counts as complete.
> - `oat_current_task_id` points at the **next unit to do**: a phase ID (`p02`)
>   or an open execution record (`p02-t03`). Set it to `null` when every phase
>   is accepted.
> - Marker lines are exact, one per line, directly under the phase heading:
>   `**Status:** pending | in_progress | completed | failed | extracted`,
>   `**Base:** <full SHA>`, `**Head:** <full SHA>`, and
>   `**Executor:** root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled`.
>   `**Status:** extracted` always pairs with `**Extracted to:** <slug>` naming
>   the linked project; without it the phase reads as `pending`.
>   Phase ownership ends at the next heading, so a task record's status is never
>   read as its phase's status.
> - `### Task pNN-tNN:` blocks are execution records, opened when work starts
>   and closed at commit with the SHA or a terminal status
>   (`completed | failed | cancelled | no-change`). They never change phase totals.
> - Reviews are **not** units. Track review status in `plan.md` under `## Reviews`.

## Progress Overview

| Phase | Status  | Units | Accepted |
| ----- | ------- | ----- | -------- |
| p01   | pending | 1     | 0/1      |
| p02   | pending | 1     | 0/1      |

**Total:** 0/[N] phases accepted

---

## Phase p01: [Phase Name]

**Status:** pending
**Base:** [full base SHA, recorded when the phase starts]
**Head:** [full head SHA, recorded when the phase's work ends, before its review]
**Executor:** [root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled]

[Summary prose: verification, review disposition, authority changes, deviations, next action.]

<!-- Execution records follow the summary. Replace this example with real records when work starts: -->

```markdown
### Task p01-t01: [Execution record name]

**Status:** completed
**Commit:** [full commit SHA]
**Executor:** worker:w1

Intent, files, proof command, result.
```

---

## Phase p02: [Phase Name]

**Status:** pending

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### YYYY-MM-DD

**Session Start:** [time]

- [x] p01: [Phase name] - [head SHA]
- [ ] p02: [Phase name] - in progress

**What changed (high level):**

- [short bullets suitable for PR/docs]

**Decisions:**

- [Decision made and rationale]

**Follow-ups / TODO:**

- [anything discovered during implementation that should be captured for later]

**Blockers:**

- [Blocker description] - [status: resolved/pending]

**Session End:** [time]

---

## Deviations from Plan / Design

Document any intentional deviations from the brief. Include accepted review findings where the shipped implementation is source of truth and the brief needs alignment.

| Phase / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| -------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -              | -               | -                    | -                 | -      | -               | -         |

## Final Summary (for PR/docs)

**What shipped:**

- [capability 1]

**Behavioral changes (user-facing):**

- [bullet]

**Key files / modules:**

- `[path]` - [purpose]

**Verification performed:**

- [tests/lint/typecheck/build/manual steps]

**Outcomes audit:**

- Outcome 1: [observed evidence (accepted phase, commit, or verification result) or the recorded deferral]

**Brief deltas (if any):**

- [what changed vs plan.md and why]

## References

- Brief: `plan.md`
- Research: `references/research/`
