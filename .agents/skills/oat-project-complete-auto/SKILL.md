---
name: oat-project-complete-auto
description: Use when a workflow step names this skill (oat-wave-execute closeout step 8 or the oat-wave-program completion checkpoint) to complete one or more OAT projects without prompts. Non-interactive companion to oat-project-complete; requires workflow.autonomousComplete.
argument-hint: '--requested-by <requesting-step> [--completion-before-merge --reason <text>] [--batch --program-checkpoint <ledger-ref>] [<project-path>...]'
disable-model-invocation: false
user-invocable: false
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
metadata:
  version: 1.0.2
---

# Autonomous Project Completion

Non-interactive project completion for workflow steps that name this skill.
It decides every answer the interactive completion flow would ask for
from config, recorded project state and existing explicit task authority,
refuses whenever an answer would need a human, and then runs the interactive
completion steps with those answers.

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

| Concern       | oat-project-complete (interactive)     | oat-project-complete-auto (autonomous)                                                                                              |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Invocation    | User-invocable, model-invisible        | Model-invocable, never user-invocable                                                                                               |
| Authorization | The user's confirmation                | `workflow.autonomousComplete: true` plus a recognized requesting step; merged follow-up also needs existing explicit task authority |
| Prompts       | One batched prompt, gate confirmations | None; any answer that needs a human refuses the project                                                                             |
| Scope         | The active project                     | One project, or a batch of wave-wrapper projects at program close                                                                   |
| Provenance    | The user                               | The requesting step, in the run report and the completion commit body                                                               |

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

### Execution-local follow-up authority handoff

For each merged project, the calling agent resolves existing explicit task
authority covering both preparation and publication of a separate bookkeeping
PR. Reuse a current task instruction or approved workflow authority that already
covers those actions; never invent a standing grant or require a new per-run
request when the authority already exists. Record its source in the run report.
Neither `workflow.autonomousComplete` nor `PR_ON_COMPLETE` grants follow-up
publication authority. A program-completion yes authorizes the completion
checkpoint; it covers follow-up publication only if its actual scope says so.

Pass the verified references in the execution-local shell value
`COMPLETION_FOLLOWUP_AUTHORITIES_JSON`, an array of objects with `projectPath`,
`originalPrUrl`, and `source`. For example, a current task explicitly authorizing
bookkeeping PRs for one named project supplies one entry for that path and its
original PR URL. This handoff records evidence, not authority: the caller must
verify that source against the existing task before adding an entry. Empty or
absent means no authority. Do not populate it from preferences, opt-in, inferred
intent, previous-run answers or an unrelated project's grant. It is not a new
config setting or persisted permission record.

For a batch, include only explicitly covered requested members. Resolve each
project independently; one project's reference cannot authorize another or add
a project to the requested batch. Missing authority refuses only that project
at preflight, leaving it deferred; the other existing batch rules still apply.

### Recognized requesting steps

| `--requested-by` value                           | Requesting step                                                                                             | Completion before merge |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------- |
| `oat-wave-execute:closeout-step-8`               | `oat-wave-execute` closeout step 8, completing a wave before its merge handoff                              | yes                     |
| `oat-wave-program:program-completion-checkpoint` | `oat-wave-program` `wave-close` step 6, after the operator's yes, with `--batch`                            | no                      |
| `oat-autonomous-lifecycle:<skill-name>`          | A lifecycle skill under `OAT_AUTONOMOUS=1` whose `SKILL.md` names this skill as a step (verified in Step 2) | no                      |

`--completion-before-merge` is accepted only with a value whose "Completion
before merge" column is `yes`.

## Process

Set `SKILL_DIR` to the absolute physical (`cd -P`) directory containing this
loaded `SKILL.md` before Step 1; Step 2 resolves sibling skills relative to it.

Steps 1 through 3 are read-only with respect to lifecycle decisions and
mutations. Step 3 may refresh a synced checkout with `oat project pull`, which
must succeed before any authoritative project artifact is read. No exception
record, active-project pointer, summary, retro, project-log entry, review move,
or lifecycle state is written until every guard for that project has passed.

### Step 1: Opt-in Guard

```bash
AUTONOMOUS_COMPLETE=$(oat config get workflow.autonomousComplete 2>/dev/null || true)
if [[ "$AUTONOMOUS_COMPLETE" != "true" ]]; then
  echo "interactive completion required: workflow.autonomousComplete is not true; run oat-project-complete." >&2
  exit 1
fi
```

The opt-in is standing lifecycle authorization set in config, never inferred
from the request; it grants no follow-up publication authority. Without it, stop with `interactive completion required`, report the
projects as not started, and write nothing.

### Step 2: Activation Contract

Run only when the invocation carries a recognized `--requested-by` value:

- `oat-wave-execute:closeout-step-8` and
  `oat-wave-program:program-completion-checkpoint` are steps that name this
  skill.
- `oat-autonomous-lifecycle:<skill-name>` additionally requires
  `OAT_AUTONOMOUS=1` in the environment of this run and a lifecycle skill that
  names this skill as a step. `<skill-name>` must match `oat-[a-z0-9-]+`;
  resolve its `SKILL.md` through the same sibling, user, then repository probe
  as the interactive skill below, and refuse unless that skill's current
  `SKILL.md` contains the exact invocation
  `--requested-by oat-autonomous-lifecycle:<skill-name>`. Running under
  `OAT_AUTONOMOUS=1` is not itself a request: until a lifecycle skill carries
  that invocation, this route refuses every claim. No lifecycle skill carries
  it today, so the two workflow steps above are the only working routes.

Refuse, writing nothing, when `--requested-by` is missing or unrecognized, when
`--completion-before-merge` comes from a step whose column above is `no`, or
when `--batch` arrives without `--program-checkpoint` or from any step other
than the program completion checkpoint. Never invoke this skill on your own
initiative: noticing a finished, unarchived, or lingering project is not a
request, and self-initiated cleanup is refused. The requesting step is the
provenance recorded in the run report (Step 6) and in the completion commit
body (Step 5).

Before any project is preflighted, resolve the interactive skill this run will
follow. A candidate must carry both `SKILL.md` and the `scripts/` directory its
steps call, so a partial install stops here instead of after the Step 4
exception write:

```bash
AUTO_FOLLOWUP_AUTHORITY_SCRIPT="$SKILL_DIR/scripts/resolve-followup-authority.mjs"
test -f "$AUTO_FOLLOWUP_AUTHORITY_SCRIPT" || {
  echo "complete-auto authority resolver unavailable; refusing before writes" >&2
  exit 1
}
COMPLETE_SKILL_DIR=""
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
for CANDIDATE in \
  "$(dirname "$SKILL_DIR")/oat-project-complete" \
  "${HOME}/.agents/skills/oat-project-complete" \
  "${REPO_ROOT:+$REPO_ROOT/.agents/skills/oat-project-complete}"; do
  [ -n "$CANDIDATE" ] || continue
  if [ -f "$CANDIDATE/SKILL.md" ] && [ -d "$CANDIDATE/scripts" ] && \
    [ -f "$CANDIDATE/scripts/prepare-completion-branch.mjs" ]; then
    COMPLETE_SKILL_DIR=$(cd -P "$CANDIDATE" && pwd -P)
    break
  fi
done
if [ -z "$COMPLETE_SKILL_DIR" ]; then
  echo "oat-project-complete unavailable: no installed copy with SKILL.md and scripts/" >&2
  exit 1
fi
```

An unavailable interactive skill stops the run as an `activation` refusal,
writing nothing.

### Step 3: Objective Preflight (Per Project)

Preflight each project on its own. Any failed check refuses that project with
the failing check named; never assume an answer, and never repair the state
to make a check pass.

Resolve scope first and accept only `shared`, `local`, or `synced`. For a
synced project, pull before `closeout-check`, status, log, review-ledger reads,
or any other authoritative artifact read or answer resolution. A failed scope
lookup, an unknown scope, or a failed pull refuses the project as
`preflight:1`; never continue from stale local state. If the pull fails and
the project directory is absent, report the archive-resume reason below and
leave recovery to `oat-project-complete`.

```bash
PROJECT_PATH="<project path>"
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || {
  echo "preflight:1: cannot resolve project scope for $PROJECT_PATH; refusing completion" >&2
  exit 1
}
case "$PROJECT_SCOPE" in
  shared|local|synced) ;;
  *)
    echo "preflight:1: unknown project scope '$PROJECT_SCOPE' for $PROJECT_PATH; refusing completion" >&2
    exit 1
    ;;
esac
if [[ "$PROJECT_SCOPE" == "synced" ]]; then
  oat project pull "$PROJECT_PATH" || {
    echo "preflight:1: project pull failed for $PROJECT_PATH; refusing completion" >&2
    if [[ ! -d "$PROJECT_PATH" ]]; then
      echo "project directory absent (archived?); resume with oat-project-complete" >&2
    fi
    exit 1
  }
fi
CLOSEOUT_CHECK_EXIT=0
CLOSEOUT_CHECK_JSON=$(oat project closeout-check "$PROJECT_PATH" --json --autonomous) || CLOSEOUT_CHECK_EXIT=$?
PROJECT_STATUS_JSON=$(oat project status --project-path "$PROJECT_PATH" --json)
PROJECT_LOG_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)
```

Hard-fail the project when any of these holds:

1. **Post-implement sequence incomplete:** `closeout-check` exits non-zero or
   reports a `status` other than `complete` or `not_required`. Report its
   `invariant` and `nextOwner`. When it reports `status: error` with
   `Project not found` (the project directory is gone, typically archived by
   an earlier run whose later step failed), report instead the reason
   `project directory absent (archived?); resume with oat-project-complete`:
   recovery belongs to the interactive skill, not to another companion run.
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
8. **Merged follow-up authority missing:** the original is live merged but no
   matching existing explicit authority covers this project's follow-up
   preparation and publication. The resolver below refuses as `preflight:8`
   before the exception, pointer, recap, docs-skip or any completion write.
   Refuse rather than asking in this non-interactive run; report the missing
   scope and route to `oat-project-complete` for the operator decision.

#### PR-merge precondition

OAT supports completing a project before its PR merges
(`oat-project-complete`; `oat-wave-execute` closeout step 8 completes each wave
before its merge handoff). This skill composes with that ordering through one
recorded exception and no other.

Read the tracked URL through the real status-shell producer, then use the
loaded completion skill's read-only observer. Empty and literal `null` URLs
retain the companion's existing absent-PR refusal; they do not become an
invented observation. Failed observation stops this project's preflight.

```bash
# Initialize the preflight result; Step 5 resets it again per completed member.
NEW_FOLLOWUP_CREATED="false"
AUTO_TRACKED_PR_FIELDS=$(oat project status --project-path "$PROJECT_PATH" --shell \
  oat_pr_url=project.prUrl) || exit 1
eval "$AUTO_TRACKED_PR_FIELDS" || exit 1
AUTO_OBSERVED_PR_FIELDS=$(node "$COMPLETE_SKILL_DIR/scripts/prepare-completion-branch.mjs" \
  --action observe --pr-url "${oat_pr_url:-}" --format shell) || {
  echo "preflight:4: tracked PR observation failed; refusing completion" >&2
  exit 1
}
eval "$AUTO_OBSERVED_PR_FIELDS" || exit 1
if [[ -z "$OBSERVED_PR_STATUS" ]]; then
  echo "preflight:4: no tracked PR; use oat-project-complete" >&2
  exit 1
fi
PR_STATE=$(printf '%s' "$OBSERVED_PR_STATUS" | tr '[:lower:]' '[:upper:]')

apply_auto_completion_pr_decision() {
  local AUTO_PR_DECISION_FIELDS
  AUTO_PR_DECISION_FIELDS=$(node "$AUTO_FOLLOWUP_AUTHORITY_SCRIPT" \
    --project-path "$PROJECT_PATH" --pr-url "$ORIGINAL_PR_URL" \
    --pr-status "$OBSERVED_PR_STATUS" \
    --authorities-json "${COMPLETION_FOLLOWUP_AUTHORITIES_JSON:-[]}" \
    --format shell) || return 1
  eval "$AUTO_PR_DECISION_FIELDS" || return 1
}
apply_auto_completion_pr_decision || {
  echo "preflight:8: follow-up authority or PR precondition unmet; no completion writes" >&2
  exit 1
}
```

Keep `AUTO_FOLLOWUP_AUTHORITY_SCRIPT` bound to this companion's physical path
when Step 5 temporarily binds `SKILL_DIR` to the interactive skill. The resolver
sets both `SHOULD_OPEN_PR` and `COMPLETION_FOLLOWUP_AUTHORITY` afresh for this
project, so batch answers cannot leak from a previous member. These decisions
are additional guards; they waive none of the table's PR/final-review conditions.

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

| `oat-project-complete` question or gate  | Resolution                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirm completion (Step 2)              | Yes, from the opt-in plus the recognized requesting step (and the program checkpoint in batch mode).                                                                                                    |
| Archive (Step 2)                         | `workflow.archiveOnComplete` when set; local projects never archive; unset on a durable project: refuse.                                                                                                |
| Generate or refresh summary (Step 2)     | Yes when `summary.md` is missing or stale.                                                                                                                                                              |
| Generate project retro (Step 2)          | Never offered: this run is non-interactive.                                                                                                                                                             |
| Final project recap (Step 2)             | The persisted decision, else the lifecycle intent resolver in autonomous mode; a result that still needs a prompt: refuse.                                                                              |
| Follow-up PR authority (Steps 1.75/2.5)  | Merged original: require the matching existing per-project explicit source from preflight; pass it as `COMPLETION_FOLLOWUP_AUTHORITY` before branch preparation. Missing: refuse before writes.         |
| Open PR (Step 2)                         | Merged original: yes for its separate authorized follow-up, or reuse the existing open follow-up. Tracked open original: no new PR. `workflow.createPrOnComplete` is read and reported, never acted on. |
| Final review not passed (Step 3.1)       | Refuse (preflight check 3).                                                                                                                                                                             |
| Deferred Medium findings (Step 3.2)      | Unresolved items: refuse.                                                                                                                                                                               |
| Documentation sync (Step 3.3)            | Blocking gate: refuse. Soft suggestion: continue without writing `oat_docs_updated`.                                                                                                                    |
| Recap generation failure (Step 3.6)      | The interactive autonomy rule: retry once, then persist `skip/failed_attempt`.                                                                                                                          |
| Retirement sweep findings (Step 3.7)     | The interactive autonomy rule: record `deferred advisory`.                                                                                                                                              |
| Project-log synthesis pending (Step 3.7) | Warn and continue, as the interactive step does.                                                                                                                                                        |

### Step 4: Record a Completion-Before-Merge Exception

Only when the PR-merge precondition passed through the exception row, append
this block to the project's `implementation.md` before any other write. Place
it under `## Deviations from Plan / Design`, after that section's existing
content and before the next `##` heading (never after `## References`), and do
not append a second block for the same PR and requesting step:

```markdown
### Completion-before-merge exception ({UTC timestamp})

- Requesting workflow: {--requested-by value}
- PR: {oat_pr_url} (open)
- Reason: {--reason value}
- Recorded by: oat-project-complete-auto
```

For `PROJECT_SCOPE="synced"`, publish the exception before Step 5 or any
further completion step: the delegated interactive skill's arrival pull must
not overwrite an unpublished exception. Run this even when the matching
exception already exists, so a retry publishes an earlier failed push without
duplicating the block:

```bash
if [[ "$PROJECT_SCOPE" == "synced" ]]; then
  oat project push "$PROJECT_PATH" \
    --message "chore(oat): record completion-before-merge exception" --json || {
    echo "completion-before-merge exception push failed for $PROJECT_PATH; stopping before completion" >&2
    exit 1
  }
fi
```

A push failure stops the whole run. Report Step 4 as failed and the exception
left in the local checkout; do not point the active project, delegate completion,
or start further projects. For shared and local projects, the completion
bookkeeping commit carries this file with the rest of the completion changes.

### Step 5: Complete the Project

For each project that passed Steps 3 and 4, in the order given:

Before item 1, reset this member's publication result. Batch preflights all
finish before any completion starts, so a preflight reset alone cannot clear
the preceding member's result. Run this once per member, before its completion
steps; preserve the result set by Step 11 through Step 11.5:

```bash
NEW_FOLLOWUP_CREATED="false"
```

1. Point the active project at it: `oat config set activeProject "$PROJECT_PATH"`.
2. Export `OAT_AUTONOMOUS=1` and `OAT_NON_INTERACTIVE=1` for the completion
   steps so their autonomous branches apply (`closeout-check --autonomous`,
   `complete-state --autonomous`, the recap retry, and the retirement sweep).
3. Bind `SKILL_DIR="$COMPLETE_SKILL_DIR"` (resolved in Step 2) only while
   following the interactive steps, so their `$SKILL_DIR/scripts/*.mjs`
   references resolve, and restore this skill's own directory afterwards.
4. Load the current `oat-project-complete/SKILL.md` and follow its Steps 1
   through 12, supplying the answer table above wherever it would ask. Never
   complete from a remembered version of that skill. Its own guards still run,
   including the Step 1.5 closeout gate and the Step 5 closeout re-check.
5. Apply the per-project PR decision with `apply_auto_completion_pr_decision`
   after the interactive Step 1.75 observation, again after its Step 2 answers
   and before Step 2.5, and immediately before Step 11. A failure stops before
   the next write. This supplies `COMPLETION_FOLLOWUP_AUTHORITY` to fresh-branch
   preparation and sets `SHOULD_OPEN_PR="true"` only for the merged original's
   explicitly authorized separate bookkeeping PR. Let the current Step 11
   create or reuse that follow-up. Do not force the answer false for a merged
   original or let a create-PR preference supply authority. For the tracked
   open/before-merge path it sets `SHOULD_OPEN_PR="false"`; archive-aware body
   sync still targets the existing original. Goal bookkeeping stays outside
   `oat_deliveries`/delivery coverage and never replaces the original projection.
   Never overwrite the original URL/status with a follow-up identity.
6. Add the provenance to the completion bookkeeping commit body that Step 10
   creates: a `Requested-by: {--requested-by value}` line and, when an exception
   was recorded, a `Completion-before-merge exception: {oat_pr_url}` line. When
   the archive owns the lifecycle commit (a synced archive), the run report
   alone carries the provenance and says so.

If a completion step fails after it has written anything, stop the whole run,
report the step and the state left behind, and do not start further projects.
A later companion run refuses at preflight once the project directory has been
archived; resume with `oat-project-complete`, whose archive-resume branches
finish the tail. Never improvise a partial completion.

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

After a merged member succeeds, keep its pushed follow-up branch and reported
PR intact. Before starting the next member, return the parent checkout to that
member's prepared base only after verifying the completed branch is clean and
its exact HEAD is pushed. This prevents the next fresh-base preparation from
mistaking the preceding member's unmerged bookkeeping commits for unrelated
work. This is batch sequencing, not permission to merge or discard anything:

```bash
if [[ "${COMPLETION_FOLLOWUP:-false}" == "true" ]]; then
  test -n "${FOLLOWUP_PR_URL:-}" || exit 1
  test "$(git branch --show-current)" = "$COMPLETION_BRANCH" || exit 1
  test -z "$(git status --porcelain --untracked-files=all)" || exit 1
  test "$(git rev-parse '@{upstream}')" = "$(git rev-parse HEAD)" || exit 1
  git switch --detach "$COMPLETION_BASE_HEAD" || exit 1
fi
```

If verification or switching fails, stop the batch and report the retained
branch/PR and recovery action. Do not start another member. Do not change batch
membership, treat the follow-up as a goal delivery, or replay archive receipts.
Absent-checkout and archived resumes still belong to `oat-project-complete`.

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
      refused_check: '{opt-in | activation | preflight:<n> | -}'
      reason: '{failing check, or -}'
      pr: '{oat_pr_url} ({GitHub state})'
      exception: '{requesting workflow; PR URL; reason} | none'
      followup_authority: '{existing explicit task source for this project and PR | none}'
      followup_pr: '{separate bookkeeping URL/branch/base | none}'
      archive: '{true|false} (from workflow.archiveOnComplete | local default)'
      completion_commit: '{sha or -}'
```

A refused or failed project lists the check that stopped it. `refused_check`
names the guard: `opt-in` (Step 1), `activation` (Step 2, including an
unavailable interactive skill), or `preflight:<n>` for check `<n>` of Step 3,
so a caller can tell a deferrable stop from an objective failure. The caller records
the outcome in its own ledger; a refused wave wrapper stays deferred.
