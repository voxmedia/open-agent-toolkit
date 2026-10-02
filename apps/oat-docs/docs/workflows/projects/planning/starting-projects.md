---
title: Starting projects
description: 'Choose a project entry skill, import an existing plan, capture completed work, or split a confirmed broad scope.'
---

# Starting projects

Choose an entry path based on what you already know and what already exists.
These skills do not require an existing active project. They create or import
tracked work, although quick-start and lite resume an active project of their
own mode, and import writes into whichever project is active.

| Your situation                                                     | Entry skill               | Result                                                                         |
| ------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------ |
| Requirements need discovery and a full technical design.           | `oat-project-new`         | A spec-driven scaffold, ready to begin discovery.                              |
| The outcome is bounded, with optional design decisions to resolve. | `oat-project-quick-start` | Discovery and an executable plan, with lightweight design when needed.         |
| The change fits one implementation sitting.                        | `oat-project-lite`        | One approved plan with requirements and validation criteria.                   |
| You already have a Markdown plan.                                  | `oat-project-import-plan` | The original source preserved beside a normalized OAT plan.                    |
| Implementation happened without project tracking.                  | `oat-project-capture`     | Retroactive discovery and implementation records from the session and commits. |
| A confirmed scope contains several coordinated projects.           | `oat-project-split`       | A coordination parent and children that resume at discovery.                   |

For the broader mode decision, see [Choose a workflow](../../choose-workflow.md).
For an existing project's discovery, design, or plan, see
[Planning skills](planning-skills.md). The [skill catalog](../../../skills/index.md)
provides the complete supported-skill inventory.

A few terms recur on this page. The _active project_ is the project recorded as
`activeProject` in `.oat/config.local.json`, which project skills act on by
default. _Spec-driven_ is the full workflow: discovery, design, plan, then
implementation. An _artifact_ is a project file such as `discovery.md`,
`plan.md`, or `state.md`.

## Before your first project

Check these before you start. Each one can stop or misdirect a first project
in a fresh repository.

1. **Initialize the repository and install the workflows pack.** Run `oat init`,
   then install the pack that contains the project skills. Without
   `--scope project`, the pack installs to your user scope; add it to keep the
   skills in the repository:

   ```bash
   oat init
   oat tools install workflows --scope project
   ```

   See [Bootstrap](../../../getting-started/bootstrap.md) and
   [Tool packs](../../../getting-started/tool-packs.md).

2. **Decide where project files live.** New projects default to the `synced`
   scope. A synced project is stored on its own Git ref and pushed to a remote
   named `origin` every time a skill saves it. In a repository with no `origin`
   remote, creating a synced project fails with "Synced project creation
   requires a configured origin remote." Either add an `origin` remote, or
   change the default before you start:

   ```bash
   oat config set projects.defaultScope shared
   ```

   `shared` keeps project files in the repository and commits them on the
   current branch. `local` keeps them on this machine only; OAT adds a
   `.gitignore` rule for them. This command writes the repository's
   `.oat/config.json`. The `OAT_PROJECTS_DEFAULT_SCOPE` environment variable
   overrides the setting for one shell.

3. **Only `oat-project-new` takes a scope.** It accepts `--scope shared|local|synced`.
   Quick-start, lite, import, capture, and split have no scope argument.
   Quick-start, lite, import, and capture always create projects in the
   default scope. Split uses the active project's scope, or `shared` when no
   project is active. Set the default first if you do not want `synced`.

4. **Build the knowledge index before spec-driven discovery.** `oat-project-discover`
   refuses to start until `.oat/repo/knowledge/project-index.md` exists. Run
   `/oat-repo-knowledge-index` once before your first spec-driven project.
   Quick-start, lite, import, and capture do not check for it.

5. **Know what happens when a project is already active.** Check with
   `oat config get activeProject` before you start:
   - `oat-project-new` and `oat-project-capture` create a new project and make
     it active instead.
   - `oat-project-quick-start` resumes an active quick project and ignores the
     name and description you pass. If that plan is already
     implementation-ready, it goes straight into `oat-project-implement`.
   - `oat-project-lite` resumes an active lite project and ignores the name and
     description you pass. With any other project active, it creates a new lite
     project.
   - `oat-project-import-plan` writes into any active project, whatever its
     mode. It rewrites that project's `plan.md` and switches it to import mode.
   - `oat-project-split` makes its first child the active project.

   To start fresh work, run `/oat-project-clear-active` (or switch with
   `/oat-project-open`) first.

## Before invoking an entry skill

Examples beginning with `/` are skill requests sent to your agent, not terminal
commands. In a provider that uses `$` skill syntax, use `$oat-project-new` instead
of `/oat-project-new`, and apply the same substitution to the other names.
Blocks labelled `bash` contain terminal commands.

Project creation normally activates the new project in `.oat/config.local.json`.
Check the reported project path before continuing, especially when another
project is already active.

The new, quick-start, lite, and import skills check inherited Git changes before
scaffolding. Unrelated changes require an explicit disposition in interactive
runs. One exception: if the only change is `.oat/sync/manifest.json`, it is
committed automatically as `chore: run sync`. Capture does not run this check.
Do not assume starting a project also authorizes implementation or a PR.

**Dispatch policy.** Before a plan is marked ready, quick-start, lite, and
import ask you to choose a _dispatch policy_: the highest tier of models and
effort OAT may use when it dispatches implementation and review agents. The
choices come from `oat project dispatch-ceiling choices`. If your configuration
has no complete dispatch ladder (the list of models for each tier), the skill
shows the bundled recommendation and asks whether to adopt it into shared,
local, or user config. That writes a config file, so pick the scope
deliberately. The plan stays not ready until this resolves. See
[Dispatch policy](../../advanced/dispatch-ceiling.md).

**Approval checkpoints.** A _HiLL (human-in-the-loop lifecycle) checkpoint_ is
a point where a skill stops and waits for your explicit approval before it marks
a phase complete. Projects created by `oat-project-new` have checkpoints on
discovery and design by default. Quick, lite, import, and captured projects have
no workflow-phase checkpoints before implementation. Lite still asks you to
approve its plan once. See [HiLL checkpoints](hill-checkpoints.md).

Several skills also run a configured _exit gate_, an optional review or command
your repository configures to run before a skill marks its work complete. When
a gate produces a review the skill can accept, the skill hands it to
`oat-project-review-receive` without asking.

## oat-project-new

Use this entry when you need the spec-driven lifecycle but have not yet explored
the requirements. This skill creates the project structure. It does not conduct
discovery or draft the design.

**Invocation:** Send the project slug to your agent. Use `--scope` when the
project's storage scope must differ from the resolved default.

```text
/oat-project-new webhook-delivery --scope shared
```

**Prerequisites:** No active project is needed; this skill creates one. You
need an initialized repository (see [Before your first project](#before-your-first-project)).
The name accepts letters, numbers, dashes, and underscores. Omitted scope uses
`projects.defaultScope`, which defaults to `synced`. Synced projects need a Git
remote named `origin`, and creating one pushes the project to `origin`. In a
repository without `origin`, or if you do not want that push, pass
`--scope shared` or `--scope local`.

**Example scenario:** You need webhook delivery across several services, but
retry limits, ownership, and failure handling are still undecided. Create
`webhook-delivery` in shared scope so its artifacts live in the repository.
Choose this entry rather than quick-start because the requirements and component
boundaries need a full discovery and design pass.

**Expected output:** The scaffolder creates standard project artifacts, reports
their scope and path, sets the active project, and refreshes the local dashboard
when enabled. Templates resolve from the repository, then user scope, then the
bundle. The scaffold is not an approved plan. Its `state.md` sets HiLL
checkpoints on discovery and design.

**What it does without asking:** After the Git-changes check, it runs
`oat project new`, which creates the project directory and artifacts, makes the
new project active (replacing any active project), and refreshes `.oat/state.md`.
It also records the scaffold in Git: a commit in shared scope; in synced scope,
a push to `origin` plus a commit of the project record and of any `.gitignore`
rule it added; in local scope, a `.gitignore` rule that it leaves uncommitted.
It does not start discovery.

**Next step:** If `.oat/repo/knowledge/project-index.md` does not exist yet, run
`oat-repo-knowledge-index` first; discovery refuses to start without it. Then
invoke [oat-project-discover](planning-skills.md#oat-project-discover) to
explore the problem. The optional `--force` scaffold flag allows the same slug
to exist in another scope and fills missing files without overwriting existing
content. It is not a reset.

## oat-project-quick-start

Use quick-start to turn a bounded request into a runnable plan without requiring
separate spec and design phases. Discovery depth follows the ambiguity of the
request, not the number of files you expect to change.

**Invocation:** Supply a name and a substantive description. A bare name prompts
for the description before repository exploration begins.

```text
/oat-project-quick-start export-filter "Add a date-range filter to CSV exports, preserving the current default output."
```

**Prerequisites:** No active project is needed. The repository must contain
OAT scaffolding, including `.oat/` and `.agents/`, and you need a task
objective. The new project uses the default scope, because quick-start takes no
scope argument. If the active project is a quick project, quick-start resumes it
and ignores the name and description you pass. If that plan is already
implementation-ready, it goes straight into `oat-project-implement`. To start a
different piece of work, run `oat-project-clear-active` (or open another
project) first. The contract does not define what happens when the active
project uses another mode, so clear or switch it first in that case too.

**Example scenario:** The export endpoint works, and you know which date range
users need. You still need to decide where the filter belongs and how to verify
unchanged default exports. Quick-start captures those constraints and either
plans directly or adds lightweight design before writing tasks.

**Expected output:** A new or resumed quick project has `discovery.md`, an
execution-ready `plan.md`, and initialized `implementation.md`. The design
decision can select straight-to-plan, lightweight `design.md`, or promotion to
spec-driven. Lightweight design does not create `spec.md` and offers
collaborative or draft-and-review interaction, not selective collaborative.

Before marking the plan ready, the skill asks you to choose a dispatch policy
(and, if needed, where to adopt a dispatch ladder), then records the
plan-review result. It commits changed project artifacts and runs any
configured exit gate. If promotion is selected during discovery, it stops with a
design handoff instead of generating a quick plan.

**What it does without asking:** It creates the project through
`oat project new` in the default scope (commit or push as described under
oat-project-new) and makes it active. It commits the changed artifacts
(`discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`) before
every pause and again before handoff; in synced scope each commit is an
`oat project push` to `origin`. It runs the plan artifact review automatically,
usually in your current agent session, and may launch a separate reviewer agent
when the current model is unknown or below the reviewer tier. It applies
unambiguous Critical and High fixes to `plan.md`. It runs any configured exit
gate and passes an eligible result to `oat-project-review-receive`. When it
resumes a quick project whose plan is already ready, it starts
`oat-project-implement`. It asks before: proceeding with a dirty working tree,
choosing design depth (skipped for clear requests with no design questions),
confirming the requirements behind the plan, choosing a lightweight design
mode, adopting a dispatch ladder into config, choosing the dispatch policy,
enabling an extra phase gate review, and keeping or disabling configured gates
for this project.

**Next step:** Follow the reported handoff to `oat-project-implement` once the
quick plan is ready. If interrupted before readiness, run quick-start again to
continue in place. Do not use `oat-project-plan` to finish a quick plan.

## oat-project-lite

Use lite for a change that fits one implementation sitting and needs explicit
requirements, proof, and approval in one plan. Lite keeps resumable task commits
and review while removing separate discovery, spec, and design documents.

**Invocation:** Provide the slug and the intended change.

```text
/oat-project-lite retry-message "Show the failed request's retry delay in the CLI error message without changing retry behavior."
```

**Prerequisites:** No active project is needed. You need an OAT-initialized
repository and a change intended to fit one sitting. The new project uses the
default scope, because lite takes no scope argument. If the active project is a
lite project, lite resumes it and ignores the name and description you pass.
With any other project active, lite creates a new lite project and makes it
active. To start a different piece of work while a lite project is active, run
`oat-project-clear-active` first. Unresolved implementation-affecting design
decisions or a larger task list trigger promotion to quick mode.

**Example scenario:** Users cannot tell when the CLI will retry a failed
request. The retry algorithm is already correct, so the change only adds the
delay to the message. Lite asks one batched round of critical questions (plus a
short follow-up only if your answers raise new ones), records the message
behavior and its proof, and gives you one plan to approve.

**Expected output:** A single sequential phase in `plan.md`, with Summary,
Decisions, Assumptions, Out of Scope, and executable Validation Criteria. The
selected content shape adds Product Behavior, Technical Design, or both when
needed. This example changes visible behavior, so product content is required.

The skill persists the authored plan before approval, asks you to choose a
dispatch policy, records artifact review, and runs the configured exit gate
before marking readiness. It creates no `spec.md` or `design.md`, no parallel
group, and no phase-review or [HiLL checkpoint](hill-checkpoints.md) setup. If
it promotes instead, the authored plan remains available to quick-start.

**What it does without asking:** It creates the project through
`oat project new` in the default scope and makes it active. It writes
`plan.md`, `state.md`, and `implementation.md` and commits them three times:
after authoring (before approval), after artifact review, and at completion. In
synced scope each commit is an `oat project push` to `origin`. If its
escalation check finds that the work will not fit one sitting or a design
decision is unresolved, it runs `oat project promote --to quick` and stops,
pointing you to quick-start. Artifact review runs with no pause and applies only
unambiguous fixes. It runs any configured exit gate and passes an eligible result
to `oat-project-review-receive`. It asks before: proceeding with a dirty working
tree, the critical interview, approving the plan (approve, revise, or promote),
adopting a dispatch ladder into config, choosing the dispatch policy, and
keeping or disabling configured gates for this project.

**Next step:** Run `oat-project-implement` after the approved lite plan is ready.
If the scope grows, continue through `oat-project-quick-start` after promotion.

## oat-project-import-plan

Use import when the plan already exists, including one produced in a provider's
native plan mode. Import preserves the source before translating it into OAT
task and review structure.

**Invocation:** Provide the local Markdown path. The provider hint records where
the plan came from.

```text
/oat-project-import-plan ./plans/cache-refresh.md --provider codex --project cache-refresh
```

**Prerequisites:** No active project is needed. The external file must exist,
contain content, and use `.md` unless you explicitly confirm another Markdown
extension. OAT repository scaffolding must be available.

If any project is active, import writes into **that** project, whatever its
mode: it normalizes the plan into its `plan.md` and switches it to import mode.
That includes a spec-driven project in the middle of design. `--project` is read
only when no project is active. To import into a new project, run
`oat-project-clear-active` first.

In the default `synced` scope, the import contract can resolve the wrong
project directory for a new project: it looks for the new project under
`projects.root` (`.oat/projects/shared` by default) while the scaffolder creates
it under `.oat/projects/synced`. Until that is fixed, set `projects.defaultScope`
to `shared` before importing into a new project, or create the project first and
import into it while it is active. Confirm the reported project path afterwards.

**Example scenario:** You drafted cache-refresh work in Codex plan mode and now
want stable task IDs and tracked execution. Your repository's default scope is
`shared` and no project is active, so import creates `cache-refresh` and
imports the saved file into it. Choose import instead of quick-start because
the plan's intent and ordering already exist and need preservation, not another
discovery conversation.

**Expected output:** `references/imported-plan.md` preserves the source.
`plan.md` contains normalized phases, stable `pNN-tNN` tasks, verification,
review rows, and imported provenance. The source file remains unchanged.
Replacing an existing source snapshot requires confirmation. A timestamped
snapshot preserves a later import.

The skill asks you to choose a dispatch policy, records import-aware plan
review, initializes the implementation tracker, persists artifacts, and runs any
configured exit gate. A normalized single-phase plan with no parallel group can
offer lite execution. Accepting that offer preserves import provenance. A single
phase alone does not mean the work fits one sitting, so keep import mode for
longer-running work.

**What it does without asking:** With no active project, it creates one through
`oat project new --mode import` in the default scope, or activates an existing
project of that name under `projects.root`. It copies the source into
`references/`, writes the normalized `plan.md`, sets the project's workflow mode
to `import` (or `lite` if you accept the offer), creates `implementation.md` if
missing, makes the project active, and refreshes `.oat/state.md`. Plan review
runs automatically and applies unambiguous Critical and High conformance fixes.
It then commits `references/`, `plan.md`, `implementation.md`, and `state.md`;
in synced scope that is an `oat project push` to `origin`. It runs any
configured exit gate and passes an eligible result to `oat-project-review-receive`.
It asks before: proceeding with a dirty working tree, naming the project when no
project is active and `--project` is absent, picking a plan file when you gave
no path, accepting a non-`.md` extension, the lite offer, adopting a dispatch
ladder into config, choosing the dispatch policy, enabling an extra phase gate
review, and keeping or disabling configured gates for this project.

**Next step:** Use `oat-project-implement` after the import handoff completes.
Resolve missing verification detail before execution. Normalization can expose
TODO-style gaps rather than invent a proof for the external author.

## oat-project-capture

Use capture after implementation happened outside OAT tracking. Capture records
why the work happened from the conversation and what changed from Git history.
It does not invent a retroactive execution plan.

**Invocation:** Invoke the skill in the session that knows the work's context.
You can explain the goal in the same conversation.

```text
/oat-project-capture
Capture the retry middleware we implemented in this session as a project, ready for review.
```

**Prerequisites:** No active project is needed; capture creates a new one in
the default scope. You need a feature branch with at least one commit beyond its
base and available conversation context. If a project already tracks the
branch, use `oat-project-reconcile` instead. With no branch commits to capture,
this skill reports that there is nothing to capture yet.

**Example scenario:** A small retry fix grew into middleware and tests during
an untracked session. The commits explain the changes, but not why one retry
policy was rejected. Capture uses that conversation to preserve the reasoning
and groups related commits into implementation records for review.

**Expected output:** A quick-mode project with `oat_workflow_origin: captured`,
populated `discovery.md`, and `implementation.md` entries tied to commit SHAs.
You confirm the proposed project name and the discovery summary, and choose
whether the work is ready for review or still in progress. The scaffold's
`plan.md` template is acceptable, but capture writes no retroactive plan tasks,
spec, design, or new implementation.

**What it does without asking:** It runs `oat project new --mode quick` in the
default scope (commit or push as described under oat-project-new), which makes
the new project active and replaces any active project. It writes `state.md`,
`discovery.md`, and `implementation.md`, commits them (an `oat project push` in
synced scope), and refreshes `.oat/state.md`. It asks before: using the proposed
project name, accepting the discovery summary, and setting the work as ready for
review or still in progress.

**Next step:** For review-ready work, use `oat-project-review-provide` before
sharing it, or `oat-project-pr-final` to open a PR directly. For work still in
progress, continue implementation and reconcile new commits into the tracked
project.

## oat-project-split

Use split after a discovery or brainstorm has confirmed several coordinated
projects. The parent records their relationship. It does not become another
implementation project.

**Invocation:** Provide a persisted split-plan JSON file, not just child names.
The skill passes that file to the split orchestrator.

```text
/oat-project-split --plan-file ./split-plan.json
```

The corresponding terminal command is:

```bash
oat project split run --plan-file ./split-plan.json
```

**Prerequisites:** No active project is needed. You need a saved split-plan
file (a `SplitPlanDocument`) and a confirmed split trigger. An explicit
multi-project declaration, a confirmed discovery recommendation, or the
brainstorm split destination can supply the trigger. Detected recommendations in
non-interactive execution must fail fast, not silently choose a split.

A split confirmed during discovery or brainstorm does not produce this file.
Those skills hand split an in-conversation payload, and split currently accepts
only a saved file, so the file must be saved before split can run. You (or your
agent) write it as JSON with this shape:

```json
{
  "origin": "detected-convergence",
  "interactive": true,
  "plan": {
    "parentSlug": "billing-platform",
    "children": [
      {
        "slug": "billing-migration",
        "description": "Move invoicing onto the new billing service.",
        "inheritedContext": "Discovery decisions that apply to this child.",
        "knownDependencies": [],
        "order": 1
      },
      {
        "slug": "reporting-redesign",
        "inheritedContext": "Discovery decisions that apply to this child.",
        "knownDependencies": ["billing-migration"],
        "order": 2
      }
    ],
    "initialActiveChild": "billing-migration"
  }
}
```

`origin` is one of `declared`, `detected-mid-stream`, `detected-convergence`,
or `brainstorm-picker`. `foundationChild` and `integrationSketch` are optional
fields of `plan`. Check the file before running split:

```bash
oat project split validate-plan --plan-file ./split-plan.json
```

**Example scenario:** Discovery identifies a billing-service migration and an
independent reporting redesign. You confirm that each needs its own project
while keeping their integration context. Discovery's split offer does not save a
plan file, so you (or your agent) write the parent, children, and ordering to
`split-plan.json` in the shape above. Check it with
`oat project split validate-plan --plan-file ./split-plan.json`, then invoke
split with that file. Split creates a coordination parent, seeds the children in
order, and activates the initial child.

**Expected output:** The parent has `oat_kind: coordination`, ordered child
links, `references/split-plan.json`, and complete decomposition status. It has
no executable spec, design, plan, or implementation artifacts. Children are
created as quick projects. They retain parent, sibling, and dependency links, but
their discovery remains in progress. Inherited context needs revalidation, and
child plans remain template placeholders rather than implementation-ready plans.

**What it does without asking:** It runs `oat project split run`, which creates
the parent and every child in the active project's scope (`shared` when no
project is active). In synced scope it pushes each project to `origin`; in
shared and local scope it does not commit. It writes the parent's `state.md`,
`discovery.md`, and `references/split-plan.json`, removes the parent's
executable phase files, seeds each child, makes the initial child active, and
refreshes `.oat/state.md`. It asks for the plan file path when you give none,
and asks before resuming a partially completed split.

**Next step:** Revalidate the active child's inherited context through its
discovery path. Children are quick projects, so resume the active child with
`oat-project-quick-start`, which picks it up at discovery. If generation stopped
partway through, rerun the orchestrator using the persisted split plan rather
than rebuilding seed data from child slugs. See [Project splitting](splitting.md)
for the full coordination contract.
