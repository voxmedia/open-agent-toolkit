---
title: Execution and Reconciliation Skills
description: Execute an approved OAT plan or reconnect manually committed work to its task ledger without repeating implementation.
---

# Execute a Plan or Reconcile Existing Work

Use implementation when planned work still needs to happen. Use reconciliation
when the work has already been committed outside the OAT execution flow and
the project ledger needs to catch up. Both require an existing project; neither
is a way to start an unplanned feature.

| Your situation                                   | Skill                   | What changes                                           |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------ |
| An approved plan has pending tasks               | `oat-project-implement` | Code, verification evidence and project tracking       |
| Manual commits are missing from project tracking | `oat-project-reconcile` | Tracking artifacts only, after you confirm the mapping |

If you are unsure which situation applies, start with
[project progress](picking-up-projects.md#oat-project-progress). The broader
[implementation execution guide](implementation-execution.md) explains dispatch,
worktrees and review boundaries.

## oat-project-implement

Run the approved plan through its implementation and independent-review flow.
The project root coordinates phase producers, reviews and bookkeeping; each
phase producer implements its assigned tasks and creates verified task commits.
The plan, rather than the number of available agents, determines dependency
order and any worktree-isolated phase parallelism.

**Invocation:**

```text
/oat-project-implement --dry-run
/oat-project-implement
```

The first invocation checks dispatch readiness and reports the proposed
schedule without dispatching phases, merging them or writing execution
artifacts. It is not proof that implementation or its tests have passed.
The second begins execution. These are agent skill invocations, not `oat`
terminal subcommands; use the invocation syntax your host supports.

**Prerequisites:** Select an existing project with an approved, complete
`plan.md` whose readiness points to `oat-project-implement`. The lifecycle
artifacts needed by its workflow mode must be available. Finish a quick plan
that is not implementation-ready through quick-start planning; having task
headings alone does not make it ready. Required dispatch skills, exact targets and
verification capabilities must also resolve before execution can proceed.

**Example scenario:** Your checkout-hardening project has an approved plan:
first validate input, then update callers, then document the behavior. Run the
dry run to inspect the order and configured dispatch choices, then start
implementation. The agent executes the pending work, verifies it and routes
blocking review findings back into bounded corrections instead of treating a
completed code edit as a passed phase.

**Expected output:** Verified task commits, recorded phase outcomes and
independent review results, with project tracking committed at the workflow's
bookkeeping boundaries. A configured human checkpoint or a real blocker may
stop the run before the whole plan is complete. Successful execution is not
automatic authorization to publish, merge or release.

**Next step:** Follow the reported checkpoint or blocker. After an interrupted
run, invoke the skill again against the same project: it cross-checks recorded
task state, commit history and existing dispatch/review handles before resuming.
Do not mark tasks complete by hand to skip a failed check. If you independently
implemented additional commits, use reconciliation before resuming. Final
review and the implementation exit gate remain separate from simply finishing
the last task.

## oat-project-reconcile

Reconciliation reconnects existing Git history to the approved task list. It
does not implement unfinished work, change production code or rewrite history.
Use it after manual implementation, not as a substitute for planning or
verification.

**Invocation:**

```text
/oat-project-reconcile
```

If no valid active project is set, the skill asks which existing project to
use. You can make the target explicit beforehand with
[project open](picking-up-projects.md#oat-project-open).

**Prerequisites:** The project has task definitions in `plan.md` and is either
in implementation or has completed its planning phase. There must be commits
not yet recorded in `implementation.md`. If every relevant commit is already
tracked, the result is “nothing to reconcile,” not duplicate task entries.

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
persists the tracking changes in one bookkeeping operation. Synced-project
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
