---
name: oat-project-complete-auto
description: Use when a workflow step names this skill, or an OAT_AUTONOMOUS lifecycle run must close a project, to complete one or more OAT projects without prompts. Non-interactive companion to oat-project-complete; requires workflow.autonomousComplete.
argument-hint: '--requested-by <requesting-step> [--completion-before-merge --reason <text>] [--batch --program-checkpoint <ledger-ref>] [<project-path>...]'
disable-model-invocation: false
user-invocable: false
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
metadata:
  version: 1.0.0
---

# Autonomous Project Completion

Non-interactive project completion for workflow steps and autonomous lifecycle
runs. It decides every answer the interactive completion flow would ask for
from config and recorded project state, refuses whenever an answer would need a
human, and then runs the interactive completion steps unchanged.

This skill is **model-invocable** (`disable-model-invocation: false`) so that
orchestrators such as `oat-wave-execute` can run it as a named step. It is
**not** user-invocable (`user-invocable: false`): it has no interactive surface
and is never offered as a slash command. A person completing a project uses
`oat-project-complete`.

## Relationship to oat-project-complete

This skill is the **autonomous companion** to `oat-project-complete`, which
stays user-invocable and model-invisible so its human gate is preserved where
it is wanted. The companion does not copy the completion process: after its
guards pass it loads the interactive skill's current `SKILL.md` and follows its
steps, supplying the answers resolved below.

| Concern       | oat-project-complete (interactive)     | oat-project-complete-auto (autonomous)                                |
| ------------- | -------------------------------------- | --------------------------------------------------------------------- |
| Invocation    | User-invocable, model-invisible        | Model-invocable, never user-invocable                                 |
| Authorization | The user's confirmation                | `workflow.autonomousComplete: true` plus a recognized requesting step |
| Prompts       | One batched prompt, gate confirmations | None; any answer that needs a human refuses the project               |
| Scope         | The active project                     | One project, or a batch of wave-wrapper projects at program close     |
| Provenance    | The user                               | The requesting step, in the run report and the completion commit body |

## Progress Indicators (User-Facing)

When this skill is executed, provide concise status updates:

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ COMPLETE PROJECT AUTO
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before major phases, print compact indicators, for example:
  - `[1/5] Checking the autonomous completion opt-in…`
  - `[2/5] Checking the activation contract…`
  - `[3/5] Preflighting {project}…`
  - `[4/5] Completing {project}…`
  - `[5/5] Returning the run report…`

## Inputs

| Input                               | Required                 | Meaning                                                                                                                   |
| ----------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `--requested-by <requesting-step>`  | Always                   | The step that names this skill (see Recognized requesting steps). Recorded as provenance.                                 |
| `--completion-before-merge`         | Only from such a step    | The requesting step completes the project before its PR merges. Permits an open, tracked PR through a recorded exception. |
| `--reason <text>`                   | With the flag above      | Why completion runs before the merge; written into the exception.                                                         |
| `--batch`                           | Program close only       | Complete several wave-wrapper projects in one invocation.                                                                 |
| `--program-checkpoint <ledger-ref>` | With `--batch`           | The program ledger entry recording the operator's yes at the program-end checkpoint.                                      |
| `<project-path>...`                 | Batch: one or more paths | Projects to complete. A single run without a path uses `oat config get activeProject`.                                    |

### Recognized requesting steps

| `--requested-by` value                           | Requesting step                                                                    | Completion before merge |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------- |
| `oat-wave-execute:closeout-step-8`               | `oat-wave-execute` closeout step 8, completing a wave before its merge handoff     | yes                     |
| `oat-wave-program:program-completion-checkpoint` | `oat-wave-program` `wave-close` step 6, after the operator's yes, with `--batch`   | no                      |
| `oat-autonomous-lifecycle:<skill-name>`          | A lifecycle skill running under `OAT_AUTONOMOUS=1` that names this skill as a step | no                      |

`--completion-before-merge` is accepted only with a value whose "Completion
before merge" column is `yes`.

## Process

Steps 1 through 3 are read-only. Nothing is written — no exception record,
active-project pointer, summary, retro, project-log entry, review move, or
lifecycle state — until every guard for that project has passed.

### Step 1: Opt-in Guard

```bash
AUTONOMOUS_COMPLETE=$(oat config get workflow.autonomousComplete 2>/dev/null || true)
if [[ "$AUTONOMOUS_COMPLETE" != "true" ]]; then
  echo "interactive completion required: workflow.autonomousComplete is not true; run oat-project-complete." >&2
  exit 1
fi
```

The opt-in is standing authorization set in config, never inferred from the
request. Without it, stop with `interactive completion required`, report the
projects as not started, and write nothing.

### Step 2: Activation Contract

Run only when the invocation carries a recognized `--requested-by` value:

- `oat-wave-execute:closeout-step-8` and
  `oat-wave-program:program-completion-checkpoint` are steps that name this
  skill.
- `oat-autonomous-lifecycle:<skill-name>` additionally requires
  `OAT_AUTONOMOUS=1` in the environment of this run.

Refuse, writing nothing, when `--requested-by` is missing or unrecognized, when
`--completion-before-merge` comes from a step whose column above is `no`, or
when `--batch` arrives without `--program-checkpoint` or from any step other
than the program completion checkpoint. Never invoke this skill on your own
initiative: noticing a finished, unarchived, or lingering project is not a
request, and self-initiated cleanup is refused. The requesting step is the
provenance recorded in the run report (Step 6) and in the completion commit
body (Step 5).

### Step 3: Objective Preflight (Per Project)

Preflight each project on its own. Any failed check refuses that project with
the failing check named; never assume an answer, and never repair the state
to make a check pass.

```bash
PROJECT_PATH="<project path>"
CLOSEOUT_CHECK_EXIT=0
CLOSEOUT_CHECK_JSON=$(oat project closeout-check "$PROJECT_PATH" --json --autonomous) || CLOSEOUT_CHECK_EXIT=$?
PROJECT_STATUS_JSON=$(oat project status --project-path "$PROJECT_PATH" --json)
PROJECT_LOG_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value)
```

Hard-fail the project when any of these holds:

1. **Post-implement sequence incomplete:** `closeout-check` exits non-zero or
   reports a `status` other than `complete` or `not_required`. Report its
   `invariant` and `nextOwner`.
2. **Incomplete tasks:** `project.progress.total` is zero or
   `project.progress.completed` is less than `project.progress.total`.
3. **Final review not passed:** the latest appended review event whose Scope is
   `final` and Type is `code` in the plan's `## Reviews` ledger (the
   `oat-project-complete` Step 3.1 read) is missing or not `passed`.
4. **PR precondition unmet:** see the PR-merge precondition below.
5. **Unresolved blockers:** `project.blockers` is non-empty.
6. **Project-log gate unsatisfied:** `oat project log check` reports
   `status: "ambiguous"` or fails. An `absent` log, a sealed log, and a log
   whose roll-up the completion steps will perform are satisfied.
7. **A completion question has no recorded answer:** see the answer table
   below. For example, a durable (`shared` or `synced`) project with
   `workflow.archiveOnComplete` unset, deferred Medium findings that the
   interactive gate confirmation would ask about, or a documentation gate that
   `documentation.requireForProjectCompletion: true` makes blocking.

#### PR-merge precondition

OAT supports completing a project before its PR merges
(`oat-project-complete`; `oat-wave-execute` closeout step 8 completes each wave
before its merge handoff). This skill composes with that ordering through one
recorded exception and no other.

Read the tracked PR from `project.prStatus` and `project.prUrl`, then read its
state from GitHub:

```bash
PR_STATE=$(gh pr view "$PR_URL" --json state --jq .state)
```

| Requested by        | Completion before merge | GitHub PR state | `oat_pr_status` | `oat_pr_url` | Final review | Result                   |
| ------------------- | ----------------------- | --------------- | --------------- | ------------ | ------------ | ------------------------ |
| a recognized step   | any                     | `MERGED`        | any             | set          | `passed`     | pass, no exception       |
| a before-merge step | yes                     | `OPEN`          | `open`          | set          | `passed`     | pass, exception recorded |

Every other combination is refused: an open PR invoked without a
completion-before-merge step, an open PR the project does not track, a closed
or absent PR, a PR state `gh` cannot read, and any final review row that is not
`passed`. A merged program-end batch passes with no exception.

When the exception applies, write it into the project's `implementation.md`
before any completion write (Step 4), and repeat it in the run report.

#### Answer table

Every question or confirmation in `oat-project-complete` resolves as follows.
A row marked "refuse" is checked during this preflight, so the completion
steps never reach it.

| `oat-project-complete` question or gate  | Resolution                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Confirm completion (Step 2)              | Yes, from the opt-in plus the recognized requesting step (and the program checkpoint in batch mode).                                     |
| Archive (Step 2)                         | `workflow.archiveOnComplete` when set; local projects never archive; unset on a durable project: refuse.                                 |
| Generate or refresh summary (Step 2)     | Yes when `summary.md` is missing or stale.                                                                                               |
| Generate project retro (Step 2)          | Never offered: this run is non-interactive.                                                                                              |
| Final project recap (Step 2)             | The persisted decision, else the lifecycle intent resolver in autonomous mode; a result that still needs a prompt: refuse.               |
| Open PR (Step 2)                         | No. The precondition requires an existing merged or tracked open PR; `workflow.createPrOnComplete` is read and reported, never acted on. |
| Final review not passed (Step 3.1)       | Refuse (preflight check 3).                                                                                                              |
| Deferred Medium findings (Step 3.2)      | Unresolved items: refuse.                                                                                                                |
| Documentation sync (Step 3.3)            | Blocking gate: refuse. Soft suggestion: continue without writing `oat_docs_updated`.                                                     |
| Recap generation failure (Step 3.6)      | The interactive autonomy rule: retry once, then persist `skip/failed_attempt`.                                                           |
| Retirement sweep findings (Step 3.7)     | The interactive autonomy rule: record `deferred advisory`.                                                                               |
| Project-log synthesis pending (Step 3.7) | Warn and continue, as the interactive step does.                                                                                         |

### Step 4: Record a Completion-Before-Merge Exception

Only when the PR-merge precondition passed through the exception row, append
this block to the project's `implementation.md` before any other write. Place
it at the end of the `## Implementation Log` section, or at the end of the file
when that section is absent, and do not append a second block for the same PR
and requesting step:

```markdown
### Completion-before-merge exception ({UTC timestamp})

- Requesting workflow: {--requested-by value}
- PR: {oat_pr_url} (open)
- Reason: {--reason value}
- Recorded by: oat-project-complete-auto
```

The completion bookkeeping commit carries this file with the rest of the
completion changes.

### Step 5: Complete the Project

For each project that passed Steps 3 and 4, in the order given:

1. Point the active project at it: `oat config set activeProject "$PROJECT_PATH"`.
2. Export `OAT_AUTONOMOUS=1` and `OAT_NON_INTERACTIVE=1` for the completion
   steps so their autonomous branches apply (`closeout-check --autonomous`,
   `complete-state --autonomous`, the recap retry, and the retirement sweep).
3. Resolve `oat-project-complete/SKILL.md` from the sibling skill directory
   (`$(dirname "$SKILL_DIR")/oat-project-complete`), then
   `${HOME}/.agents/skills`, then `<repo-root>/.agents/skills`, and bind
   `SKILL_DIR` to the directory that matched. If none matches, refuse the
   project with `oat-project-complete unavailable`.
4. Load the current `oat-project-complete/SKILL.md` and follow its Steps 1
   through 12, supplying the answer table above wherever it would ask. Never
   complete from a remembered version of that skill. Its own guards still run,
   including the Step 1.5 closeout gate and the Step 5 closeout re-check.
5. Add the provenance to the completion bookkeeping commit body that Step 10
   creates: a `Requested-by: {--requested-by value}` line and, when an exception
   was recorded, a `Completion-before-merge exception: {oat_pr_url}` line. When
   the archive owns the lifecycle commit (a synced archive), the run report
   alone carries the provenance and says so.

If a completion step fails after it has written anything, stop the whole run,
report the step and the state left behind, and do not start further projects.
The interactive skill's resume branches recover the project on the next run.
Never improvise a partial completion.

### Batch Mode

At program close, `oat-wave-program` asks the operator one program completion
question; that answer is the human gate for the batch. On yes it invokes this
skill once with
`--requested-by oat-wave-program:program-completion-checkpoint --batch --program-checkpoint <ledger-ref>`
and every deferred wave-wrapper project path.

Batch mode does not lower any guard. The opt-in is checked once; each project
is preflighted individually (Step 3) and a failed preflight refuses only that
project, which stays deferred while the others complete. Program close follows
every wave merge, so each project needs a merged PR; the completion-before-merge
exception is not available in batch mode. A completion-step failure after a
write stops the batch, as in Step 5.

### Step 6: Run Report

Return a structured report, one entry per project:

```yaml
oat_project_complete_auto:
  requested_by: '{--requested-by value}'
  mode: single | batch
  program_checkpoint: '{ledger ref or -}'
  opt_in: workflow.autonomousComplete=true
  projects:
    - path: '{project path}'
      status: completed | refused | failed
      reason: '{failing check, or -}'
      pr: '{oat_pr_url} ({GitHub state})'
      exception: '{requesting workflow; PR URL; reason} | none'
      archive: '{true|false} (from workflow.archiveOnComplete | local default)'
      completion_commit: '{sha or -}'
```

A refused or failed project lists the check that stopped it. The caller records
the outcome in its own ledger; a refused wave wrapper stays deferred.
