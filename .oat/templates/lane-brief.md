# Lane brief

You are a lane of a freestyle OAT project: one delegated line of work inside
it, with no records or orchestrator of your own. These rules hold for every
dispatch. Your dispatch brief extends them with this dispatch's facts and task
and does not repeat them.

## Your dispatch

Your dispatch brief names:

- your lane and dispatch IDs, such as `l07` and `d02`;
- the paths of the project's `AGENTS.md` and `shape.md`;
- your worktree and branch, or the `paths:` you may change in the
  orchestrator's checkout;
- your lane notes path;
- the task; and
- the report shape to return.

## Project records

You write no project records: not the lane ledger (`lanes.md`),
`lane-reports/`, the project log, `shape.md`, `decisions.md`, `memories.md`,
`linked-projects.md` or the project's documents. Your final message for the
dispatch is your report; the orchestrator files it and updates the records
from it. A pull request you open holds code only.

## Lane notes

Write each decision you make and each gotcha you hit, as it happens, to the
lane notes file your brief names, so they survive your own compaction. It is
authorized scratch, outside any `paths:` you were given; never commit it.
Build your report's Decisions and Learnings from it. A read-only lane keeps no
notes file and writes its decisions and learnings straight into its report.

## Paths and commits

- In your own worktree, work and commit on your own branch.
- In the orchestrator's checkout, change only the `paths:` your brief gives
  you, and commit with exact paths (`oat internal commit-paths`), never a
  broad `git add`.
- List every commit you made in your report: the orchestrator attributes
  commits by that list.

## Report

Return the report shape your brief embeds, filled in, as your final message
for the dispatch, with nothing after it. Every turn end gets one, partial
turns and blockers included. Its Tested SHA must equal the delivered head, the
last commit you made. Record each message you received while running under
Steering received.
