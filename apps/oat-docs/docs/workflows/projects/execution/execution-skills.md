---
title: Execution and Reconciliation Skills
description: Execute an approved OAT plan or reconnect manually committed work to its task ledger without repeating implementation.
---

# Execute a Plan or Reconcile Existing Work

Use implementation when planned work still needs to happen. Use reconciliation
when the work has already been committed outside the OAT execution flow and
the project ledger needs to catch up. Both require an existing project; neither
is a way to start an unplanned feature.

| Your situation                                   | Skill                   | What changes                                                       |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------------------ |
| An approved plan has pending tasks               | `oat-project-implement` | Code, verification evidence, project tracking and possibly a PR    |
| Manual commits are missing from project tracking | `oat-project-reconcile` | Tracking artifacts only, after you confirm the commit-task mapping |

If you are unsure which situation applies, start with
[project progress](picking-up-projects.md#oat-project-progress). The broader
[implementation execution guide](implementation-execution.md) explains dispatch,
worktrees and review boundaries.

**Terms used on this page:**

- **Active project:** the project OAT works on in this checkout when you do
  not name one. Its path is stored as `activeProject` in
  `.oat/config.local.json`, a local file that is not committed.
- **Synced project:** a project whose artifacts travel on their own Git ref
  on `origin` (`refs/oat/projects/<name>`) instead of on your branch. OAT
  saves its tracking changes with `oat project push`, which pushes to
  `origin`. See [Picking up projects](picking-up-projects.md).
- **Bookkeeping commit:** a commit that contains only OAT tracking files such
  as `plan.md`, `implementation.md` and `state.md`, kept separate from code
  commits.
- **Dispatch policy:** the project's rule for which models and effort levels
  OAT may use when it launches subagents, such as phase implementers and
  reviewers. See [Dispatch Policy](../../advanced/dispatch-ceiling.md).
- **HiLL checkpoint** (human-in-the-loop): a plan phase after which
  implementation stops and waits for you before continuing. See
  [HiLL Checkpoints](../planning/hill-checkpoints.md).
- **Gate:** a configured check, usually an independent review run by another
  model, that must pass before the workflow continues. The _implementation
  exit gate_ runs after the final code review. See
  [Workflow gates](../../advanced/workflow-gates.md).

## oat-project-implement

Run the approved plan. OAT works through the plan's phases (groups of tasks in
`plan.md`) in order, has each phase implemented and then independently
reviewed, and records progress in the project's tracking files. The plan,
rather than the number of available agents, decides the order and which
phases, if any, may run in parallel in separate worktrees.

**Needs an active OAT project:** yes. If none is set, the skill asks for the
project name and saves it as the active project.

**Invocation:**

```text
/oat-project-implement --dry-run
/oat-project-implement
```

The first invocation resolves the project, checks which subagents are
available, reads the plan and prints the proposed schedule and the worktrees it
would create. It does not dispatch phases, merge, commit or write project
artifacts, although it may still set the active project pointer or pull a
synced project. It is not proof that implementation or its tests have passed.
The second begins execution. These are agent skill invocations, not `oat`
terminal subcommands; use the invocation syntax your host supports.

The number of fix attempts after a failed review comes from
`oat_orchestration_retry_limit` in the project's `state.md` (default 2, range
0–5). The skill's argument hint also lists `--retry-limit`, but no step reads
that flag, so passing it changes nothing.

**Prerequisites:** Select an existing project with an approved, complete
`plan.md` whose readiness points to `oat-project-implement`. The lifecycle
artifacts needed by its workflow mode must be available. Finish a quick plan
that is not implementation-ready through quick-start planning; having task
headings alone does not make it ready. The dispatch skills it relies on
(`oat-project-dispatch-subagents`, `oat-dispatch-subagents` and
`subagent-orchestration`) must be installed; if one is missing, the skill
stops and prints the install command.

A dispatch policy must be set before any phase work. OAT reads it from config
(`workflow.dispatchPolicy.*`, or the older `workflow.dispatchCeiling` keys) or
from `oat_dispatch_policy` in the project's `state.md`. If none is set, an
interactive run asks you to choose one and saves your choice to `state.md`;
choosing `Leave Unresolved` stops the run. A non-interactive run stops with
`BLOCKED: … dispatch policy is unresolved`. On Codex, if launching subagents
needs your authorization, the skill asks once before any work; if you decline,
it runs the phases inline in the current session instead.

**Questions on the first run:** Except in a lite project, the first run lists
the plan's phases and asks which checkpoint behavior you want: stop after
every phase (the default), after specific phases, or only after the final
phase. Setting `workflow.hillCheckpointDefault` to `every` or `final` answers
this in advance. It then asks whether to run an extra lifecycle review
automatically at each checkpoint, unless `workflow.autoReviewAtHillCheckpoints`
is set. Both answers are written to `plan.md` and are not asked again when you
resume. A lite project has no checkpoints and skips both questions.

**What it does without asking:** After those questions, the run continues
until a checkpoint, a blocker or the end of the plan without asking again. It:

- dispatches a phase implementer subagent (`oat-phase-implementer`) for each
  phase and an `oat-reviewer` subagent to review each phase and the finished
  work, without a prompt per launch (when the host cannot run those subagents,
  it does the same work inline);
- has the implementer commit once per task, and adds a bookkeeping commit
  after task commits and at every phase and review boundary;
- sends a phase with blocking review findings back to its implementer for
  fixes and reviews it again, up to the retry limit;
- for phases the plan marks as a parallel group, creates one worktree per
  phase, runs them at the same time and merges the passing phases into your
  branch with `git merge --no-ff`;
- for a synced project, pushes each bookkeeping update to the project's ref on
  `origin` instead of committing it on your branch;
- runs final verification, the final code review and, if one is configured,
  the implementation exit gate;
- can push your branch and open a pull request at the end, as described next.

**Finishing can open a pull request:** In a lite project, once the final
review and the implementation exit gate pass, implementation runs
`oat-project-pr-final` with no approval step. That skill pushes the current
branch to `origin` (`git push -u origin <branch>`) and opens a GitHub pull
request with `gh pr create`, without asking you to confirm either step. A lite
project always ends this way; no setting removes the PR step. A non-lite
project does the same when `workflow.postImplementSequence` is `pr` or
`docs-pr` (or a structured value that includes `pr`), and in an autonomous run
(`OAT_AUTONOMOUS=1`) where that setting is unset. With `pr`, `docs-pr` or an
autonomous run, the summary step (and, for `docs-pr` and autonomous runs, the
documentation step) runs first, and the PR is opened before the final
checkpoint asks for your approval. Otherwise no PR is opened automatically:
when the setting is unset and the run is interactive, the skill offers the
summary, documentation and final-PR steps and waits for your choice; when it
is `wait`, the skill only reminds you to run them yourself. Implementation
never merges the pull request or releases anything.

To avoid a pull request you did not want:

1. Run implementation on a feature branch, never on your default branch: the
   push goes to whatever branch is checked out.
2. Before starting a non-lite project, check
   `oat config get workflow.postImplementSequence`. Leave it unset or set it to
   `wait` if you want to open the PR yourself, and do not run with
   `OAT_AUTONOMOUS=1`. See [Configuration](../../../reference/configuration.md).
3. Use the lite workflow only when a PR at the end is what you want.

**Example scenario:** Your checkout-hardening project uses the quick workflow
and has an approved plan with three phases: validate input, update callers,
document the behavior. Run the dry run to check the order and the selected
dispatch tier. Start implementation: because no dispatch policy is configured,
the skill asks you to choose one, then asks which phases should be
checkpoints, and you choose the final phase only. The agent dispatches an
implementer for p01, which commits each task, then dispatches a reviewer. The
reviewer reports a blocking finding, so p01 goes back to its implementer for a
bounded fix and is reviewed again before p02 starts. After p03, the final
review passes and the skill stops at your final checkpoint. After you
approve, because `workflow.postImplementSequence` is unset and the run is
interactive, it offers the closeout steps instead of opening a PR.

**Expected output:** Verified task commits, recorded phase outcomes and
independent review results, with project tracking committed (or, for a synced
project, pushed) at each bookkeeping boundary. A configured HiLL checkpoint or
a real blocker may stop the run before the whole plan is complete. Depending on
the workflow and `workflow.postImplementSequence`, the run may end with a
pushed branch and an open pull request, as described above.

**Next step:** Follow the reported checkpoint or blocker. After an interrupted
run, invoke the skill again against the same project: it cross-checks recorded
task state, commit history and existing subagent and review records before
resuming. Do not mark tasks complete by hand to skip a failed check. If you
implemented additional commits yourself, use reconciliation before resuming.
Finishing the last task is not the end: the final review and the
implementation exit gate must still pass. When they do in an interactive,
non-lite run with `workflow.postImplementSequence` unset, the skill offers the
closeout chain `oat-project-summary` →
`oat-project-document` → `oat-project-pr-final`. You can run all three, run
summary and PR only, or exit and run them later. Project completion comes only
after the PR is open.

## oat-project-reconcile

Reconciliation reconnects existing Git history to the approved task list. It
does not implement unfinished work, change production code or rewrite history.
Use it after manual implementation, not as a substitute for planning or
verification.

**Needs an active OAT project:** yes. If no valid active project is set, the
skill asks which project to use and sets it as the active project. You can
make the target explicit beforehand with
[project open](picking-up-projects.md#oat-project-open).

**Invocation:**

```text
/oat-project-reconcile
```

**Prerequisites:** The project has task definitions in `plan.md` and is either
in implementation or has completed its planning phase. There must be commits
not yet recorded in `implementation.md`. If every relevant commit is already
tracked, the result is “nothing to reconcile,” not duplicate task entries.

**What it does without asking:** Nothing is written until you confirm the
proposed mapping. After you confirm, it updates `implementation.md`,
`state.md` and, when changed, `plan.md`, and records them in a single
`chore(oat): reconcile manual implementation (…)` commit. A synced project
pushes that change to its project ref on `origin` instead.

**Example scenario:** You manually committed a parser fix and its tests while
pairing with a teammate. OAT still lists that task as pending, and a separate
documentation commit does not clearly belong to a planned task. Reconciliation
shows the post-checkpoint commits and proposes mappings using task IDs, changed
files and other evidence. You confirm the parser task, mark a partially
finished documentation task in progress, and decide whether unrelated work is
logged as unplanned or skipped. Only then does the skill update tracking.

**Expected output:** A commit-to-task report with confidence levels, unmatched
commits and remaining tasks. After confirmation, it appends implementation
evidence without overwriting prior task entries, updates progress pointers and
saves the tracking changes in one bookkeeping commit. Synced-project
bookkeeping uses the project's sync flow rather than staging its artifacts on
the implementation branch.

Before confirming the report:

1. Check the proposed checkpoint and commit range. Merge commits,
   bookkeeping-only changes and already-recorded commits are filtered out.
2. Review uncertain mappings rather than accepting a filename match as proof
   of completion. Multiple commits can belong to one task.
3. Choose completed or in-progress status for each mapped task. A commit can
   represent only part of the planned work.
4. Decide explicitly what happens to unmatched work; reconciliation does not
   silently invent a new task or claim it satisfied a requirement.

**Next step:** Run implementation for remaining tasks, or request a
[project review](../reviews/review-flavors.md#oat-project-review-provide) that
includes the reconciled changes. Reconciliation leaves implementation in
progress even if every planned task has a commit: review and finalization must
still establish whether the project is ready to close.
