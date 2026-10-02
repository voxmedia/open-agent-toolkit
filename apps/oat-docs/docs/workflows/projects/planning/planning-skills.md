---
title: Planning skills
description: 'Continue discovery, formalize requirements, design a solution, write executable tasks, or promote an existing project.'
---

# Planning skills

These skills act on an existing project. They do not create one from a new
idea. Choose a [project entry skill](starting-projects.md) first if the work is
not yet tracked.

For a spec-driven project (one using the full workflow: discovery, design, plan,
then implementation), the usual path is discovery, then design, then plan.
Design confirms requirements and produces `spec.md` as well as `design.md`.
Standalone spec is optional when you want to review requirements before
designing. Quick, lite, and import workflows author their own plans through
their entry skills. Do not send those projects through spec-driven planning
just because they contain a file named `plan.md`.

| You need to resolve                                             | Skill                             |
| --------------------------------------------------------------- | --------------------------------- |
| The problem, scope, alternatives, and success criteria.         | `oat-project-discover`            |
| Formal requirements before technical design.                    | `oat-project-spec`                |
| Architecture, interfaces, and verification decisions.           | `oat-project-design`              |
| Executable phases and tasks from a completed design.            | `oat-project-plan`                |
| More lifecycle rigor for an existing quick or imported project. | `oat-project-promote-spec-driven` |

## Check the project before continuing

The examples are requests to your agent. `/oat-project-design` uses slash-command
syntax. A provider that uses `$` skill syntax accepts `$oat-project-design`
instead. Neither form is an `oat` terminal subcommand. Terminal commands below
use `bash` blocks.

Every skill on this page acts on the _active project_, the project recorded as
`activeProject` in `.oat/config.local.json`. Resolve it and inspect its
artifacts (project files such as `discovery.md`, `design.md`, and `state.md`)
before continuing:

```bash
oat config get activeProject
oat project status
```

Read the reported project's `state.md` and relevant artifact frontmatter.
An artifact that exists can still be a template or unfinished draft. Its
presence alone does not prove readiness. If another project is active, switch
to the intended project through `oat-project-open` before invoking these skills.

Planning writes and commits artifacts without asking, but it does not implement
the product. For synced-scope projects, each commit is pushed to `origin` with
`oat project push`. A committed draft is not necessarily approved.

A _HiLL (human-in-the-loop lifecycle) checkpoint_ is a point where a skill stops
and waits for your explicit approval before marking a phase complete. Projects
created with `oat-project-new` have HiLL approvals on discovery and design **by
default**: each skill stops after writing its artifact and waits for your
explicit approval before marking it complete. Quick, lite, and import projects
have no workflow-phase HiLL checkpoints. Configured exit gates (optional reviews
or commands your repository runs before a skill marks its work complete) can
also keep an artifact in progress. See [HiLL checkpoints](hill-checkpoints.md).
The [skill catalog](../../../skills/index.md) lists the broader lifecycle tools.

## oat-project-discover

Use discovery to clarify the problem before deciding how to implement it. The
skill explores alternatives and captures constraints without writing code,
technical specifications, or task lists.

**Invocation:** Explicitly request discovery for the active spec-driven project.
The skill confirms the project before continuing.

```text
/oat-project-discover
Continue discovery for webhook-delivery. Clarify delivery guarantees and which failures users need to investigate.
```

**Prerequisites:** Needs an active OAT project: yes, a spec-driven one. If none
is active, discovery stops and points you to `oat-project-new` or
`oat-project-open`. A missing workflow-mode field is accepted only for a legacy
spec-driven project. The repository knowledge index must exist at
`.oat/repo/knowledge/project-index.md`. If it is missing, run
`oat-repo-knowledge-index` first. The skill checks knowledge staleness and asks
whether to refresh or continue when the index is stale.

Quick, import, and lite projects use their own next step instead. Mentioning a
new idea does not authorize automatic discovery invocation.

**Example scenario:** The webhook-delivery project is active, but the team has
not agreed whether duplicate deliveries are acceptable or how operators detect
lost events. Discovery asks targeted questions, compares approaches, and records
the chosen direction and measurable outcomes. It leaves concrete component
design for the next phase.

**Expected output:** `discovery.md` records the request, clarifying answers,
approaches, decisions, constraints, success criteria, and exclusions. Deferred
ideas and open questions stay visible. The skill also evaluates whether the
scope is one cohesive project or needs a confirmed split. If you confirm a
split, `oat-project-split` still needs a saved split-plan JSON file. Discovery
does not write one. See [oat-project-split](starting-projects.md#oat-project-split).

By default, discovery is a HiLL checkpoint: the skill stops and asks you to
approve discovery before it continues. If you do not approve yet, discovery
stays in progress. After approval and any configured exit gate resolve,
discovery completes through the CLI validation boundary and becomes ready for
`oat-project-design`. A split child must revalidate inherited context before
discovery can complete.

**What it does without asking:** After you confirm it should continue with the
active project, its setup steps copy fresh `state.md` and `discovery.md`
templates into the project with `oat template resolve --output`, which
overwrites existing files of those names. At completion it runs
`oat project complete-discovery --ready-for oat-project-design`, updates
`state.md`, and commits `discovery.md` and `state.md` (an `oat project push` to
`origin` in synced scope). It runs any configured exit gate and passes an
eligible result to `oat-project-review-receive`. If you choose to split, it
hands off to `oat-project-split`. In non-interactive runs that detect a split,
it appends a "Detected Split Recommendation" section to `discovery.md` and
exits with an error. It asks before: continuing with the active project,
continuing on a stale knowledge index, choosing an approach, the scope check
(always shown in interactive runs), and the HiLL approval.

**Next step:** Run `oat-project-design` for requirements confirmation and full
design. If you want a standalone requirements review first, check
[oat-project-spec's readiness requirement](#oat-project-spec) before invoking it.

## oat-project-spec

Use standalone spec when discovery is complete but you want requirements
formalized before starting technical design. Running this skill is not a
mandatory step before design.

**Invocation:** Explain the requirements review you want for the active project.

```text
/oat-project-spec
Formalize the webhook delivery requirements and acceptance criteria before we decide on storage and worker design.
```

**Prerequisites:** Needs an active OAT project: yes. If none is active, the
skill asks for a project name and sets it as the active project. The existing
project's `discovery.md` must record `oat_status: complete` and
`oat_ready_for: oat-project-spec`. Discovery content must include the chosen
approach with rationale, constraints, measurable success criteria, and scope
boundaries. Relevant repository knowledge provides additional context.

Current behavior: standalone spec refuses any discovery completed the normal
way. Discovery records `oat_ready_for: oat-project-design`, and spec requires
`oat-project-spec`. There are two ways forward:

1. **Recommended:** skip standalone spec and run `oat-project-design`, which
   confirms requirements and writes `spec.md` for you.
2. **If you need a separate requirements review:** re-mark discovery as ready
   for spec, commit the change (with `oat project push` for a synced project),
   and then invoke spec. This command sets `oat_ready_for` in `discovery.md`'s
   frontmatter after validating the project:

   ```bash
   oat project complete-discovery <project-path> --ready-for oat-project-spec
   ```

**Example scenario:** Stakeholders need to agree on retention and delivery
guarantees before you choose infrastructure. With discovery complete and
re-marked as ready for spec, spec translates those outcomes into functional and
non-functional requirements, priorities, and testable acceptance criteria.
Choose it instead of design because the immediate decision is what the system
must do, not how its components work.

**Expected output:** `spec.md` contains the problem, goals, non-goals,
requirements, constraints, dependencies, proposed high-level approach, and
success metrics. Its Requirement Index gives each requirement a stable ID and
verification method. Planned tasks remain unassigned until planning.

The skill iterates on requirements with you and checks quality and boundaries.
It does not select new technology beyond discovery, design component internals,
or write implementation tasks. After the completion boundary, the spec is ready
for `oat-project-design`.

**What it does without asking:** It copies the spec template to `spec.md`
(overwriting an existing `spec.md`), writes the requirements, marks the spec
complete and ready for design, updates `state.md`, and commits `spec.md` and
`state.md` (an `oat project push` to `origin` in synced scope). It stops for
approval only if `spec` is a configured HiLL checkpoint, which it is not by
default. It runs no exit gate. It asks for a project name when none is active,
and asks you to confirm the requirements until you agree they are complete.

**Next step:** Run `oat-project-design`, which reuses the completed spec instead
of drafting the requirements again.

## oat-project-design

Use design to make the architecture and implementation decisions that a plan
needs. Requirements confirmation is part of this flow, so a separate spec phase
is usually unnecessary.

**Invocation:** Choose an interaction mode when you know how you want to review
the design.

```text
/oat-project-design --mode collaborative
```

Supported modes are `collaborative`, `selective`, and `draft`. Collaborative
presents each section for confirmation. Selective drafts routine sections and
walks you through sections that need review, after confirming a section review
plan. Draft writes the full design for review together. See
[Design modes](design-modes.md) for selection and precedence.

**Prerequisites:** Needs an active OAT project: yes. If none is active, the
skill asks for a project name and sets it as the active project. The existing
project needs completed discovery. A pre-existing `spec.md` must be complete and
ready for design. If that file is an incomplete draft, resolve it before
continuing. If no spec exists, design creates it from discovery. Repository
knowledge provides architecture and implementation context.

**Example scenario:** Webhook requirements are clear, but the queue, delivery
record, and retry worker need consistent responsibilities. Choose collaborative
mode to review those interfaces and failure cases section by section. Design
confirms requirements, reaffirms the chosen approach once, and checks that the
testing strategy covers each requirement.

**Expected output:** A completed or reused `spec.md` and a `design.md` covering
architecture, components, data, interfaces, security, failure handling, tests,
deployment, migration, and risks as applicable. Requirements map to verification
scenarios, and implementation phases give planning a starting point.

In collaborative mode, approved sections are assembled into the file after the
section pass. Draft mode writes the full file first. The skill self-reviews and
commits the design before its user-review prompt. By default, design is a HiLL
checkpoint on projects created with `oat-project-new`: after the commit, the
skill shows you where `design.md` and `spec.md` are and waits for your approval
or change requests. It marks design complete only after you approve and any
configured exit gate resolves. Committing the draft alone does not mean it is
approved.

**What it does without asking:** When it writes `spec.md`, it commits it
separately. It self-reviews `design.md` and `spec.md` and fixes issues inline
without a prompt, then commits `spec.md`, `design.md`, and `state.md` as a
draft, even when no HiLL checkpoint is configured. In selective mode, routine
sections are drafted without live confirmation. Each revision after your
feedback is a new commit. Without a `design` or `spec` HiLL checkpoint, it skips
the review prompt and continues to completion. It runs any configured exit gate,
passes an eligible result to `oat-project-review-receive`, then marks design
complete and commits `design.md` and `state.md`. In synced scope every commit is
an `oat project push` to `origin`. It asks before: choosing the interaction mode
(unless `--mode`, `OAT_DESIGN_MODE`, or `workflow.designMode` sets it),
confirming requirements, reaffirming the approach, confirming sections as the
mode requires, and the HiLL approval.

**Next step:** Run `oat-project-plan` when `design.md` is complete and ready for
planning. Quick projects that only need lightweight design stay in quick-start;
they do not use this full design flow.

## oat-project-plan

Use plan to convert a completed spec-driven design into tasks an implementer
can execute and verify. Planning preserves design decisions rather than
reopening architecture or adding scope.

**Invocation:** Request task decomposition for the active project. Name useful
constraints in the conversation rather than inventing planning flags.

```text
/oat-project-plan
Turn the completed webhook design into phases with exact files, requirement coverage, verification commands, and task commits.
```

**Prerequisites:** Needs an active OAT project: yes. If none is active, the
skill asks for a project name and sets it as the active project. The project
must use spec-driven mode, with `design.md` recording `oat_status: complete` and
`oat_ready_for: oat-project-plan`.

Quick, import, and lite projects never use this skill to author a plan. On a
quick project, it resumes quick-start if the plan is not ready, and **starts
`oat-project-implement` immediately** if the plan is ready. On an import project
with a plan, it points you to `oat-project-implement`. On a lite project, it
points you to `oat-project-lite`. Do not invoke it on those projects unless you
intend that handoff.

**Example scenario:** The webhook design now defines persistence, retries, and
operator reporting. Plan turns those decisions into testable milestones and
stable task IDs, each with a declared file scope and verification command.
It fills the spec's Planned Tasks column so you can trace a requirement to the
tasks that implement it.

**Expected output:** `plan.md` contains phases, stable `pNN-tNN` tasks,
implementation and proof steps, exact verification commands, commit messages,
review rows, and references. Existing review history remains intact. If a draft
plan exists, the skill offers resume, view, or explicit overwrite instead of
silently discarding it.

The skill resolves dispatch policy and review readiness, records artifact
review, and runs any configured exit gate. Implementation tracking begins when
you run `oat-project-implement`. Resolving dispatch policy means you are asked
to choose a _dispatch policy_, the highest tier of models and effort OAT may use
for implementation and review agents. If your configuration has no complete
dispatch ladder, you are offered the bundled one to adopt into shared, local, or
user config; see [Dispatch policy](../../advanced/dispatch-ceiling.md).
Implementation checkpoint selection is deferred to implementation start unless
already supplied and confirmed. The plan contains no product code.

**What it does without asking:** It writes `plan.md`, updates the spec's
requirement index, and records the dispatch policy you choose in `state.md`.
Plan artifact review runs automatically, usually in your current agent session,
and may launch a separate reviewer agent when the current model is unknown or
below the reviewer tier. It applies unambiguous Critical and High fixes to
`plan.md`. It runs any configured exit gate and passes an eligible result to
`oat-project-review-receive`. It then marks the plan complete and commits
`plan.md` and `state.md` (an `oat project push` to `origin` in synced scope). If
you chose a project explainer, it generates one after the commit. It does not
write `implementation.md`. It asks before: resuming, viewing, or overwriting an
existing plan; generating a project explainer (once); accepting the phase
breakdown; declaring parallel phase groups; adopting a dispatch ladder into
config; choosing the dispatch policy; enabling an extra phase gate review; and
keeping or disabling configured gates for this project.

**Next step:** Run `oat-project-implement` after the plan is ready. If task
decomposition exposes a missing design decision, resolve it in design instead
of making that decision inside the plan.

## oat-project-promote-spec-driven

Use promotion when an existing quick or imported project needs more lifecycle
rigor. Promotion works in place and preserves the plan and implementation
history. It is not a project reset or a fresh discovery run.

**Invocation:** Make the intended project active first (for example with
`oat-project-open`), then invoke the skill without a project-selector flag. The
skill's argument hint lists `--project`, but the skill currently ignores it and
always acts on the active project.

```text
/oat-project-promote-spec-driven
Promote the active cache-refresh project, keeping its imported plan and completed task history.
```

**Prerequisites:** Needs an active OAT project: yes. If none is active, the
skill asks for a project name and sets it as the active project. The active
project's `state.md` must record quick or import workflow mode. A spec-driven
project is already promoted, so the skill reports a no-op unless you request
artifact refresh. Lite must promote to quick first through the actual terminal
command:

```bash
oat project promote <lite-project-path> --to quick
```

Use the reported lite project path, for example
`.oat/projects/synced/retry-message` in the default synced scope. Then use this
skill against the active quick project.

**Example scenario:** The imported cache-refresh plan is partly implemented,
but its next stage requires explicit requirements and architecture rationale.
Promotion fills missing lifecycle artifacts from the existing plan,
implementation records, and imported source. It keeps completed tasks and the
original plan provenance rather than starting the project over.

**Expected output:** The project remains in the same directory and switches to
spec-driven mode. Missing discovery, spec, and design documents are drafted
from existing context. Existing artifacts are inspected rather than blindly
replaced. The skill preserves `oat_plan_source` unless you explicitly request
new spec-driven plan regeneration, and retains workflow origin and execution
history.

Backfilled drafts are not a claim that full discovery and design approval have
already happened. Promotion aligns state with actual progress, persists the
artifact changes, and reports created artifacts, retained provenance, and the
next action.

**What it does without asking:** It creates each missing `discovery.md`,
`spec.md`, and `design.md` from templates and fills them from the plan,
implementation records, and imported source. It switches `state.md` to
spec-driven mode and sets the phase to match actual progress, then commits
`discovery.md`, `spec.md`, `design.md`, and `state.md` (an `oat project push` to
`origin` in synced scope). There is no confirmation step before these writes,
and it runs no exit gate. It asks only for a project name when none is active.

**Next step:** Follow the reported phase and readiness. The handoff commonly
continues implementation or review for work already planned or executed.
Review missing requirements and design detail before treating new drafts as
completed lifecycle artifacts.
