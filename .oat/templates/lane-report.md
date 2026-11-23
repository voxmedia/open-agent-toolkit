# Lane report: {lane}-{dispatch}

Return this report, filled in, as your final message for this dispatch, with
nothing after it. Every turn end gets one, partial turns and blockers included.
The orchestrator files it verbatim and never edits it, so write it for a
reader who has only the project records. Replace each placeholder; write
"None." under a section with nothing to report. You are a lane: do not write
project records (the ledger, the project log, `shape.md`, `decisions.md`,
`memories.md` or the project's documents); this report is how your work
reaches them.

While you work, write each decision you make and each gotcha you hit to the
lane notes file your brief names, as it happens, so they survive your own
compaction; never commit it. Build the Decisions and Learnings sections below
from it. A read-only lane keeps no notes file and writes its decisions and
learnings straight into this report.

**Lane:** {lane ID, such as l07}
**Dispatch:** {dispatch ID, such as d02}
**Turn:** {complete | partial | blocked}

## Summary

### This round

{What this dispatch did, in two to four sentences.}

### Lane so far

{The lane's cumulative state across its dispatches: what is done, what is not.}

## Delivered

- **Branch:** {branch, or the orchestrator's branch for a lane in its checkout}
- **Head:** {full SHA of the last commit you made}
- **PR:** {URL or number, or none}
- **Commits:** one line per commit this dispatch made, `<full SHA> <subject>`;
  a lane in the orchestrator's checkout lists every one, because the
  orchestrator attributes commits by this list.

## Verification

- **Tested SHA:** {full SHA; it must equal the delivered head}
- {Each command run, with its exit code, and whether it ran or replayed a cache}
- {Any check skipped or unavailable, and why}

## Decisions

{Choices you made that the brief did not settle, each with its reason.}

## Deviations

{Where you departed from the brief, and why.}

## Steering received

{Each message received while running, and how you handled it.}

## Review findings

{Each finding, fixed (with the commit) or declined (with the reason).}

## Learnings

{What a later lane or session would otherwise get wrong.}

## Open items

{What is left, who should take it, and what it waits on.}

## Proposed log entries

{Entries the orchestrator may append to the project log, keyed by this
dispatch ID; it decides which to accept.}
