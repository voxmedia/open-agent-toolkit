---
title: Starting projects
description: 'Choose a project entry skill, import an existing plan, capture completed work, or split a confirmed broad scope.'
---

# Starting projects

Choose an entry path based on what you already know and what already exists.
These skills do not require an existing active project. They create or import
tracked work, although quick-start can also resume an existing quick project.

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

## Before invoking an entry skill

Examples beginning with `/` are skill requests sent to your agent, not terminal
commands. In a provider that uses `$` skill syntax, use `$oat-project-new` instead
of `/oat-project-new`, and apply the same substitution to the other names.
Blocks labelled `bash` contain terminal commands.

Start in an OAT-initialized repository with the relevant skills installed.
Project creation normally activates the new project in `.oat/config.local.json`.
Check the reported project path before continuing, especially when another
project is already active. Quick-start resumes an active quick project, and
import can use the current active project rather than create another one.

The new, quick-start, lite, and import skills check inherited Git changes before
scaffolding. Unrelated changes require an explicit disposition in interactive
runs. Do not assume starting a project also authorizes implementation or a PR.

## oat-project-new

Use this entry when you need the spec-driven lifecycle but have not yet explored
the requirements. This skill creates the project structure. It does not conduct
discovery or draft the design.

**Invocation:** Send the project slug to your agent. Use `--scope` when the
project's storage scope must differ from the resolved default.

```text
/oat-project-new webhook-delivery --scope shared
```

**Prerequisites:** Project applicability is `none`. You need repository tooling
and templates, not an existing project. The name accepts alphanumeric
characters, dashes, and underscores. Omitted scope uses `projects.defaultScope`,
whose default is `synced`.

**Example scenario:** You need webhook delivery across several services, but
retry limits, ownership, and failure handling are still undecided. Create
`webhook-delivery` in shared scope so its artifacts live in the repository.
Choose this entry rather than quick-start because the requirements and component
boundaries need a full discovery and design pass.

**Expected output:** The scaffolder creates standard project artifacts, reports
their scope and path, sets the active project, and refreshes the local dashboard
when enabled. Templates resolve from the repository, then user scope, then the
bundle. The scaffold is not an approved plan.

**Next step:** Invoke [oat-project-discover](planning-skills.md#oat-project-discover)
to explore the problem. The optional `--force` scaffold flag fills missing
files and directories without overwriting existing content. It is not a reset.

## oat-project-quick-start

Use quick-start to turn a bounded request into a runnable plan without requiring
separate spec and design phases. Discovery depth follows the ambiguity of the
request, not the number of files you expect to change.

**Invocation:** Supply a name and a substantive description. A bare name prompts
for the description before repository exploration begins.

```text
/oat-project-quick-start export-filter "Add a date-range filter to CSV exports, preserving the current default output."
```

**Prerequisites:** Project applicability is `none`. The repository must contain
OAT scaffolding, including `.oat/` and `.agents/`, and you need a task objective.
An existing active quick project is optional. If one exists, the skill resumes
it rather than re-scaffold it.

**Example scenario:** The export endpoint works, and you know which date range
users need. You still need to decide where the filter belongs and how to verify
unchanged default exports. Quick-start captures those constraints and either
plans directly or adds lightweight design before writing tasks.

**Expected output:** A new or resumed quick project has `discovery.md`, an
execution-ready `plan.md`, and initialized `implementation.md`. The design
decision can select straight-to-plan, lightweight `design.md`, or promotion to
spec-driven. Lightweight design does not create `spec.md` and offers
collaborative or draft-and-review interaction, not selective collaborative.

The skill records the plan-review disposition and resolves dispatch readiness.
It commits changed project artifacts and runs any configured exit gate. If
promotion is selected during discovery, it stops with a design handoff instead
of generating a quick plan.

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

**Prerequisites:** Project applicability is `none`. You need an OAT-initialized
repository and a change intended to fit one sitting. An existing lite project
can be resumed. Unresolved implementation-affecting design decisions or a
larger task list trigger promotion to quick mode.

**Example scenario:** Users cannot tell when the CLI will retry a failed
request. The retry algorithm is already correct, so the change only adds the
delay to the message. Lite asks a batched set of critical questions, records the
message behavior and its proof, and gives you one plan to approve.

**Expected output:** A single sequential phase in `plan.md`, with Summary,
Decisions, Assumptions, Out of Scope, and executable Validation Criteria. The
selected content shape adds Product Behavior, Technical Design, or both when
needed. This example changes visible behavior, so product content is required.

The skill persists the authored plan before approval, resolves dispatch, records
artifact review, and runs the configured exit gate before marking readiness.
It creates no `spec.md` or `design.md`, no parallel group, and no phase-review or
HiLL setup. If it promotes instead, the authored plan remains available to
quick-start.

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

**Prerequisites:** Project applicability is `none`. The external file must exist,
contain content, and use `.md` unless you explicitly confirm another Markdown
extension. OAT repository scaffolding must be available. Check the active
project first. The skill uses `--project` to resolve a target when no valid
active project exists, so that argument is not an unconditional project switch.

**Example scenario:** You drafted cache-refresh work in Codex plan mode and now
want stable task IDs and tracked execution. With no valid active project, import
the saved file into `cache-refresh`. Choose import instead of quick-start
because the plan's intent and ordering already exist and need preservation,
not another discovery conversation.

**Expected output:** `references/imported-plan.md` preserves the source.
`plan.md` contains normalized phases, stable `pNN-tNN` tasks, verification,
review rows, and imported provenance. The source file remains unchanged.
Replacing an existing source snapshot requires confirmation. A timestamped
snapshot preserves a later import.

The skill resolves dispatch, records import-aware plan review, initializes the
implementation tracker, persists artifacts, and runs any configured exit gate.
A normalized single-phase plan with no parallel group can offer lite execution.
Accepting that offer preserves import provenance. A single phase alone does not
mean the work fits one sitting, so keep import mode for longer-running work.

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

**Prerequisites:** Project applicability is `none`. You need a feature branch
with at least one commit beyond its base and available conversation context.
If a project already tracks the branch, use `oat-project-reconcile` instead.
With no branch commits to capture, this skill reports that there is nothing to
capture yet.

**Example scenario:** A small retry fix grew into middleware and tests during
an untracked session. The commits explain the changes, but not why one retry
policy was rejected. Capture uses that conversation to preserve the reasoning
and groups related commits into implementation records for review.

**Expected output:** A quick-mode project with `oat_workflow_origin: captured`,
populated `discovery.md`, and `implementation.md` entries tied to commit SHAs.
You confirm the discovery summary and choose whether the work is ready for
review or still in progress. The scaffold's `plan.md` template is acceptable,
but capture writes no retroactive plan tasks, spec, design, or new implementation.

**Next step:** For review-ready work, use `oat-project-review-provide` before
sharing it. For work still in progress, continue implementation and reconcile
new commits into the tracked project.

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

**Prerequisites:** Project applicability is `none`. You need a persisted
`SplitPlanDocument` and a confirmed split trigger. An explicit multi-project
declaration, a confirmed discovery recommendation, or the brainstorm split
destination can supply the trigger. A pre-existing active project is not
required. Detected recommendations in non-interactive execution must fail fast,
not silently choose a split.

**Example scenario:** Discovery identifies a billing-service migration and an
independent reporting redesign. You confirm that each needs its own project
while keeping their integration context. Split consumes the approved JSON plan,
creates a coordination parent, seeds the children in order, and activates the
initial child.

**Expected output:** The parent has `oat_kind: coordination`, ordered child
links, `references/split-plan.json`, and complete decomposition status. It has
no executable spec, design, plan, or implementation artifacts. Children retain
parent, sibling, and dependency links, but their discovery remains in progress.
Inherited context needs revalidation, and child plans remain template
placeholders rather than implementation-ready plans.

**Next step:** Revalidate the active child's inherited context through its
workflow's discovery path. For a quick child, resume quick-start. For a
spec-driven child, continue discovery. If generation stopped partway through,
rerun the orchestrator using the persisted split plan rather than rebuilding
seed data from child slugs. See [Project splitting](splitting.md) for the full
coordination contract.
