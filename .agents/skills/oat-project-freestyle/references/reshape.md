# Freestyle Reshape: Changing How a Project Runs

Read this when a shaped freestyle project needs a change to its `shape.md`.
Reshaping is guidance, not a command: there is no reshape command and no
`status` flag. The project `AGENTS.md` points here.

## When a Reshape Is Due

- A checkpoint listed under `## Reshape checkpoints` is reached.
- The user asks to change how the project runs.
- The host or the execution shape changes (a new host app, a move from a
  single agent to lanes).
- An agreement stops working: a reviewer is unavailable, or a rule is bypassed
  repeatedly.
- An item under `## Undecided` comes due.

The reshape triggers to check on every resume, before acting on the shape:
reached checkpoints, Undecided items that are due, and agreements that stopped
working. `SKILL.md` Step 2 runs the same check.

## Checkpoint Questions

At every reshape checkpoint, and when a plan written after shaping is
accepted, ask two questions:

1. **Does the shape still fit?** Read each topic section against how the
   project runs now.
2. **Is the plan and its process proportionate to its value?** Test it by:
   - **process time against code time:** estimate both; process above about
     3x the code time needs a stated reason. This is a prompt to explain, not
     a hard rule;
   - **each safeguard:** what risk it covers, and whether that risk exists
     now;
   - **the lightest process that keeps the real gates:** the reviews and
     owner approvals the owner or the repository requires.

Answer both, each with its reason; a bare "no change" answers neither. A "no"
goes to the owner as a recommendation, with the lighter alternative, even in
an unattended run. The change itself follows the Procedure once the owner
agrees.

## Procedure

1. Name the trigger and the topic sections it affects. Read those sections and
   `## Undecided`. At a checkpoint, ask the Checkpoint Questions first.
2. Agree the change with the user, one affected topic at a time, with a
   recommendation and its tradeoff. Leave every unaffected section untouched.
3. Edit only the affected sections:
   - an Undecided item that comes due: write its answer into its topic
     section, replacing the `Deferred:` text, and delete its `## Undecided`
     line;
   - a review whose mechanism changes: keep its intent (when, independence,
     effort) and replace only the mechanism (tool or skill, host, source, date
     verified). A mechanism that disappeared with no replacement keeps the
     intent, records the mechanism as unavailable, and tells the user;
   - any other change: rewrite the agreement in place. `shape.md` holds the
     current shape, not its history.
4. Set `**Last shaped:**` to today's date (UTC, `YYYY-MM-DD`).
5. State when the change takes effect, in the edited section and to the user,
   for work already in flight: for example "from the next dispatch; lanes
   already running keep the previous rule until their next report".
6. Attempt a `decision` entry in the project log with what changed and why.
   Mint `RESHAPE_ID` once for this reshape decision: the UTC time the change
   was agreed, to the second, plus a random suffix, so two decisions never
   share it even within one second. Run the mint block once; reuse that same
   value only to retry this decision's append, by re-running the append block
   alone. Another reshape, even of the same topic on the same day, mints its
   own, so it is never read as a retry of this one:

   ```bash
   RESHAPE_ID="reshape-$(date -u +%Y%m%dT%H%M%SZ)-{topic-slug}-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
   echo "$RESHAPE_ID"
   ```

   ```bash
   oat project log append --json --project "{project-path}" \
     --type feedback --scope project --area "Reshape: {topic}" \
     --category decision --source "$RESHAPE_ID" \
     --idempotency-key "$RESHAPE_ID" \
     --body "{what changed and why; when it takes effect}"
   ```

   A `skipped` result means the project log is disabled; accept it and say so.
   A refusal is reported to the user, not retried in a loop. Either way,
   `shape.md` must stand on its own: never leave a change recorded only in the
   log.

7. Commit the edited `shape.md` only as `## Commits, PRs and merges` agrees,
   following the records rule for the project's scope in `AGENTS.md`. With
   that topic not yet shaped or deferred, commit and push nothing. Where it
   agrees to commit records now, `--commit` on the step 6 append commits the
   project log by exact path in the same command; it pushes nothing.

## Report

Tell the user which sections changed, the new `Last shaped:` date, when the
change takes effect, the log result (appended, skipped, or the refusal), and
whether `shape.md` is committed.
