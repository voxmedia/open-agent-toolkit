---
title: Picking Up Projects
description: Continue a synced OAT project on another machine or from another user through its dedicated Git ref.
---

# Picking Up a Project on Another Machine or From Another User

Synced projects travel through ordinary Git refs on `origin`. Their artifact
history is independent from the implementation branch, so a teammate or a
second machine can continue the project even before the branch carrying its
record file merges.

## Resume work on this machine

If the project already exists in this checkout, you do not need the
cross-machine steps on the rest of this page. Run these three agent skills in
order (type them in your coding agent's chat, not a terminal; Codex uses `$`
instead of `/`):

1. **Open the project.** `/oat-project-open <project>` makes it the active
   project in this checkout (the one OAT works on when you do not name one)
   and resumes it if it was paused. See
   [oat-project-open](#oat-project-open).
2. **See where it stands.** `/oat-project-progress` is a read-only status
   check: it reports the phase, blockers and recommended next skill, and does
   not commit, push or start that skill. It only refreshes the generated
   `.oat/state.md` dashboard and, for a synced project (one whose artifacts
   travel on a Git ref, as described above), pulls the latest artifacts. See [oat-project-progress](#oat-project-progress).
3. **Continue.** `/oat-project-next` starts the next lifecycle skill without
   asking you first, and that skill can commit, push your branch or open a
   pull request. See [oat-project-next](#oat-project-next).

## Discover and adopt

From any checkout with access to `origin`:

```bash
oat project list --remote
oat project pull <project>
```

`list --remote` discovers `refs/oat/projects/*` directly. `pull` can adopt a
remote project that has no local record yet: it writes the record and creates
the nested checkout. When the selected project is a coordination parent, pull
also discovers and pulls its child projects by default. Pass `--no-children`
only when you intentionally want the selected project alone.

Completed projects are not adoption candidates. Their authoritative ref is
`refs/oat/completed/<project>`; both `pull` and `open` return a terminal
diagnosis instead of recreating an archived checkout or record. A same-SHA
active ref may remain as an inert alias and is ignored. Differing active and
completed SHAs require repair before lifecycle work continues. The same guard
applies to coordination children: a terminal child discovered while pulling
its parent is reported and skipped rather than adopted.

After adoption, set or open the project through the normal lifecycle command
you are using. Arrival-aware project skills pull before reading its artifacts.

An adopted quick-workflow project whose `plan.md` is not implementation-ready
resumes through `oat-project-quick-start`, which continues it in place without
re-scaffolding, rather than through `oat-project-implement`. `oat-project-plan`,
`oat-project-progress`, and `oat-project-next` all route by the single **quick
plan readiness** predicate that `oat-project-quick-start` defines; readiness is
never inferred from the presence of tasks alone.

`oat project status` and `oat project list` apply the same predicate. For a
quick project at the `plan` phase they recommend `oat-project-quick-start`, with
the unmet clause in the reason, until the plan carries ready frontmatter, a
durable `## Reviews` disposition, and a substantive task; only then do they
recommend `oat-project-implement`. Recommendations for lite, spec-driven, and
import projects are unchanged, because the predicate is quick-workflow policy.

## What travels

- The project ref carries the complete active artifact tree and its history.
- The tracked JSON record travels once the branch containing it is shared or
  merged.
- Coordination relationships travel in the artifacts and records pulled with
  the project.

## What does not travel automatically

- `local` projects never leave their original machine.
- GitHub forks copy branches and tags, but not the `refs/oat/*` namespace. A
  fork collaborator needs access to the upstream remote or an explicit ref
  transfer.
- A normal `git clone` fetches branches and tags, not custom OAT refs. OAT
  handles remote discovery with `ls-remote` and explicitly fetches the selected
  project ref during sync operations such as `pull`; do not expect a generic
  clone or `git fetch` to materialize the checkout.

## Why completed refs remain durable

`refs/oat/completed/<project>` is a real Git ref locally and on `origin`. The
objects reachable from it remain garbage-collection roots even when no nested
checkout exists. Branch pruning, remote-tracking-ref pruning, and
`git worktree prune` do not delete the completed ref. Completion deliberately
retains this terminal reachability root so pinned PR links remain valid.

Only the explicit destructive operation `oat project prune` removes the
completed ref and any matching active alias. Treat that as permanent Git
project-history reachability deletion and review its warnings before using
`--force`. Prune does not remove durable local or S3 archive snapshots, and it
refuses to delete either ref when their SHAs differ.

## Archive contents

When archive is selected, completion copies a synced project into
`.oat/projects/archived/<project>/` without the nested checkout's `.git`
pointer or `reviews/`. S3 snapshots also omit `pr/`, following the existing
archive policy. When archive is disabled or declined, the active synced
checkout remains in place. Successful archived closeout instead uploads the S3
snapshot first when configured, makes the completed ref authoritative, removes
the checkout, and deletes the tracked JSON record. The local archive metadata
retains the source-ref identity needed for recordless retries and later S3
restore without recreating active state.

If closeout is interrupted after terminal archive identity exists, rerun
completion so it can resume from the completed ref and archive metadata. Do not
use `pull` or `open` to recreate an active record or checkout.

For a `shared` project, archive moves the project into
`.oat/projects/archived/<project>/` and removes the source directory, while
completion keeps the `activeProject` pointer until the receipt validates.
Rerunning completion after an interruption between the archive and that clear
recognizes exactly this state — the pointer names a source directory that no
longer exists and the archive carries `oat_lifecycle: complete` plus the
`Lifecycle complete; archived locally` phase marker — so it validates the
discovered archive and clears the pointer without archiving a second time or
sealing the project log again. An interruption before the archive leaves the
source directory in place, so completion simply reruns from the start and skips
the work it already finished.

If the archive cannot be discovered — the source directory is gone and either
no archived project or several match the name — completion stops and leaves the
pointer untouched. Recover manually: locate the archive directory under
`.oat/projects/archived/`, confirm `oat_lifecycle: complete` in its `state.md`,
then clear the pointer with `oat config set activeProject ""`.

## Related

- [Reviewing OAT PRs](../reviews/reviewing-oat-prs.md)
- [Project Artifacts](../../../reference/project-artifacts.md)
- [Implementation Execution](implementation-execution.md#synced-projects-in-worktrees)

## Choosing a Resume Skill

Project selection, status inspection and lifecycle execution are different
actions. Use open to choose the project, progress to inspect it, and next when
you want the agent to invoke the next lifecycle skill. Clearing the active
project pauses the current context; it does not delete or complete the project.

The examples below are agent skill invocations, not terminal `oat`
subcommands. Use your host's supported skill-invocation syntax.

**Terms used in this section:**

- **Active project:** the project OAT works on in this checkout when you do
  not name one. Its path is stored as `activeProject` in
  `.oat/config.local.json`, a local file that is not committed.
- **Synced project:** a project whose artifacts travel on their own Git ref on
  `origin`, as described at the top of this page. OAT saves its tracking
  changes by pushing that ref.
- **HiLL checkpoint** (human-in-the-loop): a lifecycle point or plan phase
  where the workflow stops and waits for your approval. See
  [HiLL Checkpoints](../planning/hill-checkpoints.md).
- **Review artifact:** the Markdown file a project review writes into the
  project's `reviews/` directory. It counts as unprocessed until project
  review-receive has recorded what to do about its findings.
- **Gate:** a configured check, usually an independent review, that must pass
  before the workflow continues. The _implementation exit gate_ runs after the
  final code review. See [Workflow gates](../../advanced/workflow-gates.md).

## oat-project-open

Choose an existing project before continuing its lifecycle. This is useful
both when returning to a paused project and when switching from one project to
another. It activates the selected project; it does not start implementation.

**Needs an active OAT project:** no. Open is how you set one.

**Invocation:**

```text
/oat-project-open checkout-hardening
```

With no project name, the skill asks which project to open. It runs
`oat project open` rather than editing the active pointer by hand.

**Prerequisites:** No previously active project is required. The CLI checks
that the selected project resolves and that its `state.md` exists; it checks
the state content only when it resumes a paused project. For a synced project,
remote access may be needed. A completed synced project is refused with a
terminal diagnosis, and an archived project is not found. For shared and local
projects, open does not check lifecycle state, so do not open a project that
is already complete.

**What it does without asking:** It sets `activeProject` in
`.oat/config.local.json` and refreshes the generated `.oat/state.md`
dashboard. If the project is paused, it rewrites the project's `state.md` to
active and removes the pause fields; for a shared or local project that edit
is left uncommitted. For a synced project, open may fetch the project ref,
commit an adoption record (`chore(oat): adopt synced project <name>`) on your
current branch when this checkout has no record yet, and push a resume commit
to `origin` if the project was paused. If that push fails, the active pointer
is left unchanged.

**Example scenario:** You paused checkout-hardening yesterday to investigate
an unrelated issue. Today, open checkout-hardening by name. The CLI checks
that the project and its `state.md` exist, resumes it because it was paused and
makes it active in this checkout without re-scaffolding the plan or marking any
task finished.

**Expected output:** Confirmation of the active project and a refreshed state
dashboard. A paused project's pause metadata is cleared when it is resumed.
If the CLI reports an error, address the diagnosis instead of manually pointing
at an invalid or completed project.

**Next step:** Use progress if you want to inspect the current state before
acting, or next if you want to continue. Opening does not prove that a plan is
implementation-ready or that earlier review feedback has been processed.

## oat-project-next

Invoke the next appropriate lifecycle skill using current project state. This
is the action-oriented counterpart to progress, not merely another status
report.

**Needs an active OAT project:** yes, in practice. With no valid active
pointer, the router lists projects across supported scopes, hands off to open
so you can select one, then stops; invoke next again after selection. With no
projects at all, it reports that condition and suggests a project-creation
workflow instead of inventing a resume target.

**Invocation:**

```text
/oat-project-next
```

**Prerequisites:** An existing project must be available.

**What it does without asking:** Next invokes the skill it selects
immediately, without asking you to confirm, and reported blockers do not stop
it. Depending on state, it can start `oat-project-implement` (which dispatches
subagents and commits), run `oat-project-pr-final` (which pushes your branch
and opens a GitHub pull request with `gh pr create`; a lite project goes there
directly after a passed final review), or run `oat-project-complete`. For a
synced project, it first runs `oat project pull`, which updates the project's
checkout. The router itself does not edit project artifacts. Use progress when
you want to approve the route first.

**Example scenario:** Checkout-hardening is mid-implementation: phase p02 just
finished, and the review artifact from a p02 project review is still waiting
in the project's `reviews/` directory. You invoke next expecting it to continue
with p03. The router sees the unprocessed review and invokes project
review-receive first rather than advancing past the feedback. When that
workflow finishes, invoke next again to continue from the updated state.

**Expected output:** The selected project, current phase, target skill and
routing reason, followed by invocation of that skill. Pending HiLL
checkpoints, quick-plan readiness and unprocessed reviews affect the route.
Once implementation is marked complete, the router checks in this order: an
unresolved or stale implementation exit gate, an unfinished closeout sequence,
or pending revision tasks all route back to `oat-project-implement`; only then
does it look for unprocessed reviews, a final code review that has not passed,
a missing summary, a missing PR and finally project completion.

**Next step:** Follow the invoked workflow. If you only wanted a
recommendation, use progress instead. Blockers shown in the routing
announcement are warnings only; the router invokes the selected skill anyway.

## oat-project-progress

Inspect repository knowledge and project status before deciding what to do.
Unlike next, progress offers the recommended route rather than automatically
starting it.

**Needs an active OAT project:** no. Progress can report that none is active
and list the available projects.

**Invocation:**

```text
/oat-project-progress
```

You can also explicitly ask the agent to “check project progress.” Finishing
another workflow step does not automatically authorize this check.

**Prerequisites:** An active project is optional. The skill can report that
none is active and inspect available projects. It checks the repository
knowledge base first; if that is missing, it asks you to run the knowledge-index
skill and stops before the later project report. Synced-project arrival may
pull current artifacts, and the skill refreshes the generated dashboard; a
diagnostic invocation is not a guarantee of zero filesystem or network activity.

**What it does without asking:** For a synced active project it runs
`oat project pull`, and it regenerates the `.oat/state.md` dashboard. It does
not commit, push or invoke another skill; it offers the recommended skill and
waits for you.

**Example scenario:** You return after several days away and do not remember
whether checkout-hardening needs more implementation or a review. Progress
checks knowledge freshness and, when that prerequisite is available, reports
the project mode, phase, blockers, checkpoints and next recommended skill. If
manual commits appear ahead of the task ledger, it can suggest reconciliation
instead of presenting the ledger as unquestionable evidence.

**Expected output:** A knowledge-base status report and, when the check can
continue, project summaries with the active project highlighted. Configured
project gate overrides are reported explicitly. Recommendations do not pass
the gates or approve the next action for you.

**Next step:** Choose whether to run the recommendation. For manually committed
work missing from tracking, use
[reconciliation](execution-skills.md#oat-project-reconcile). When you are ready
for automatic lifecycle routing, invoke next. Progress and next can differ
because next also inspects execution boundaries and outstanding review events.

## oat-project-clear-active

Pause the current project and leave the checkout without an active OAT project.
This is a context switch, not an archive, deletion or completion action.

**Needs an active OAT project:** no. With nothing active, the skill says so
and exits successfully.

**Invocation:**

```text
/oat-project-clear-active
```

**Prerequisites:** An active project is optional. With an active pointer, the
skill delegates to `oat project pause`, which must be able to read the project
state. A pointer to a project directory that no longer exists fails with
“Project not found”, and the pointer is kept. With no pointer, the skill
reports that no project is active and exits successfully without trying to
pause a nonexistent target.

**What it does without asking:** `oat project pause` writes
`oat_lifecycle: paused` and a pause timestamp into the project's `state.md`,
then clears the active pointer. In a shared or local project that `state.md`
change is left uncommitted: commit it yourself, or it shows up as uncommitted
project bookkeeping. A synced project commits the pause and pushes it to
`origin`.

**Example scenario:** Checkout-hardening is still unfinished, but you want to
work on an untracked investigation without accidentally routing its changes
into that project. Clear the active project: OAT pauses checkout-hardening and
clears the pointer. Running the skill again with nothing active is a safe no-op,
not an error or a request to create a replacement project.

**Expected output:** Confirmation that the active project was cleared through
pause, or the no-active-project message. The project's artifacts and
implementation history remain available for later resumption. For synced
projects, pause publication can fail; a reported publication failure is not a
successful context switch, and the active pointer is retained for recovery.

**Next step:** Open a named project when you want to resume tracked work. Do
not use clear-active to stop a running agent or revoke work already in flight;
pausing project state is different from interrupting an execution process.
