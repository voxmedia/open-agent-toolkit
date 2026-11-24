# Working with lanes

Read the project `AGENTS.md` and `shape.md` first. This guide holds the
orchestrator's lane rules; the lane brief holds the standing lane boundaries.

## Dispatch

A lane is one delegated line of work inside this project: a delegate in its
own worktree and branch with its own PR, or a subagent in the orchestrator's
checkout limited to the `paths:` its ledger entry gives it. A lane has no
records or orchestrator of its own. A dispatch is one request to a lane that
ends in one report: the first launch, then each follow-up after the lane's turn
ends. Lanes are numbered `l01`, `l02`, ...; dispatches are numbered per lane,
`d01`, `d02`, ...; ledger updates are `u001`, `u002`, ...

`lanes.md` is written only by `oat project lane set`, so a lane's state
survives compaction. Record each launch, change and observation as it
happens:

- `oat project lane set l01 --task <handle> --thread <handle> --worktree <path> --branch <branch> --base <sha> --next "<one line>" --owner <who>`
  creates the lane with dispatch `d01` open. Add `--provider`, `--model`,
  `--effort` and `--observed-model` when they are known, and `--wake` for what
  wakes you for this lane.
- `--state` is one of `dispatched`, `running`, `turn-finished`,
  `work-settled`, `review-accepted`, `merged`, `blocked` (with
  `--waiting-on owner|lane|linked-project|external` and `--blocker "<one line>"`)
  or `superseded` (with `--replaced-by <lane>`). Merged and superseded lanes
  move to the closed list and are not reopened.
- `--dispatch` opens the lane's next dispatch once its last one has closed.
- A message to a lane while it runs (a steer) amends the open dispatch: record
  it with `--steer "<one line>"`. Wakes are notifications, not dispatches.
- Every turn end, partial ones included, gets a report (see Lane reports). An
  interrupted turn closes its dispatch with `--no-report`.
- The ledger holds no reasoning beyond a one-line next action or blocker; an
  empty value (`--blocker ""`) clears a field.

Each dispatch brief extends the standing lane brief (see Lane brief) instead
of repeating its rules, and names the lane and dispatch IDs; the paths of the project `AGENTS.md`
and `shape.md`; the lane's worktree and branch, or the `paths:` it may
change in the orchestrator's checkout; its lane notes path and report path; the task; and the
report shape. Copy the shape with
`oat template resolve lane-report --output <path>` and embed it whole, with the
report route below: a local report file or the lane's final message.

A lane writes each decision it makes and each gotcha it hits, as it happens,
to an uncommitted notes file in its own checkout,
`.oat/analysis/lane-notes/<lane>-<dispatch>.md`, so they survive its own
compaction, and builds its report's Decisions and Learnings from it. The brief
names that path as authorized scratch, outside a same-checkout lane's
`paths:`. Confirm with `git check-ignore` that the notes path and, for a writable lane
on the orchestrator's machine, its report path beside it are ignored.
`oat init` ignores `.oat/analysis/lane-notes/`; where either path is not
ignored, the brief names paths outside the checkout instead, for example
under `$TMPDIR`. Authorize both as scratch outside a same-checkout lane's
`paths:`; the report path can be `<lane>-<dispatch>-report.md` beside the notes.
A read-only delegate keeps no notes: its brief tells it to return its
decisions and learnings in its final message.

On resume, read `lanes.md` before acting. For each active lane with an open
dispatch, check its task or thread handle and the forge (its PR, its branch
head) and record what you find with `lane set` before any redispatch: a lane
that is still running is waited on or steered, not dispatched again.

## Lane brief

The standing rules every lane follows ship as the bundled `lane-brief.md`:
the lane writes no project records and returns its report by the route below; it
keeps its decisions and gotchas in its lane notes file; it changes only its own
worktree and branch, or the `paths:` it was given in your checkout, where it
commits by exact path; and its report's Tested SHA equals the delivered head.
Copy it with `oat template resolve lane-brief --output <path>` and embed it
whole in every dispatch brief, which extends it with the dispatch's facts and
task (see Dispatch) and the report shape, never repeating its rules. A
`lane-brief.md` in the repository's `.oat/templates/` or the user's
`~/.oat/templates/` replaces the bundled one.

## Lane reports

A writable lane on the orchestrator's machine writes its filled report to the
authorized ignored file beside its notes, confirms it with `git check-ignore`
(or uses the authorized outside-checkout fallback), and names the file's
absolute path in its final message. A remote or read-only lane returns the
filled report as its final message. File it before acting on it and before
the lane's worktree is removed:

1. Use the local report file directly. For a remote or read-only lane, save
   its returned text verbatim to a file outside the project records, for
   example under `$TMPDIR`.
2. Run `oat project lane set <lane> --report <file> --head <delivered head>`:
   it copies the file into `lane-reports/<lane>-<dispatch>.md`, sets the lane's
   report pointer and head and closes the dispatch in one write. A filed report
   is never edited. In a repository whose commit hooks format Markdown, exclude
   `lane-reports/` from them so the committed report stays verbatim.
3. Append the accepted proposed log entries with `oat project log append`,
   keyed by the dispatch ID (for example `l01-d02`): `--source <dispatch ID>`
   for a judgment entry and `--ref <dispatch ID>` for a structural entry.
4. Promote what you accept from its Decisions and Learnings: a decision as a
   `decisions.md` entry, and a gotcha, user preference or still-true context
   as a `memories.md` bullet, each citing the dispatch ID (for example
   `l01-d02`) as its source.

When a lane merges, or another event matters to the project's story, append a
structural log entry (see the project `AGENTS.md` Records commands) whose `--ref` is the update ID that
`lane set` printed for the update recording the event; other ledger updates get
no log entry.

The ledger's `head` is the head the lane's last report delivered. For a lane
in its own worktree whose dispatch is closed, `oat project lane set` and
`oat project status` flag a branch head that has moved past it; while the
dispatch is `open` the lane is still working, so neither flags it. Do not merge unreported commits
unreviewed: dispatch the lane to report them, or review them yourself first.

After rebasing a lane's branch, record with `oat project lane set <lane> --head <sha>`
the rebased equivalent of the last reported commit, not the new branch tip.
When you cannot identify that commit, leave the warning in place.

## Lane placement

You decide per lane whether it works in its own worktree or as a subagent in
your checkout; OAT supports both and prescribes neither. `lane set` derives the
placement from `--worktree`: this checkout is `shared-worktree`, any other is
`own-worktree`.

- **Own worktree.** The lane has its own worktree, branch and PR. Record
  `--worktree`, `--branch` and `--base`; the head-ahead check above applies
  once its dispatch closes, and its
  work reaches the orchestrator's branch by the merge rules in `shape.md`.
- **Your checkout.** A subagent works in your worktree, on your branch,
  limited to the `--paths` its entry gives it. Its commits use exact paths
  (`oat internal commit-paths`), never a broad `git add`; attribution comes
  from the commit list in its report; you verify the combined head after its
  turn, and the head-ahead check does not apply.
