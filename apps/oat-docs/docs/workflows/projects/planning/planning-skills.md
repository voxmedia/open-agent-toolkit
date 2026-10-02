---
title: Planning skills
description: 'Continue discovery, formalize requirements, design a solution, write executable tasks, or promote an existing project.'
---

# Planning skills

These skills act on an existing project. They do not create one from a new
idea. Choose a [project entry skill](starting-projects.md) first if the work is
not yet tracked.

For a spec-driven project, the usual path is discovery, then design, then plan.
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

Resolve the current project and inspect its artifacts before continuing:

```bash
oat config get activeProject
oat project status
```

Read the reported project's `state.md` and relevant artifact frontmatter.
An artifact that exists can still be a template or unfinished draft. Its
presence alone does not prove readiness. If another project is active, switch
to the intended project through `oat-project-open` before invoking these skills.

Planning can write and commit artifacts, but it does not implement the product.
Configured lifecycle gates and [HiLL checkpoints](hill-checkpoints.md) can
keep an artifact in progress. A committed draft is not necessarily approved.
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

**Prerequisites:** Project applicability is `required`. An active spec-driven
project must exist. A missing workflow-mode field is accepted only for a legacy
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
scope is one cohesive project or needs a confirmed split.

After any configured approval and lifecycle gate resolves, discovery completes
through the CLI validation boundary and becomes ready for `oat-project-design`.
A split child must revalidate inherited context before discovery can complete.

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

**Prerequisites:** Project applicability is `required`. The existing project's
`discovery.md` must record `oat_status: complete` and
`oat_ready_for: oat-project-spec`. Discovery content must include the chosen
approach with rationale, constraints, measurable success criteria, and scope
boundaries. Relevant repository knowledge provides additional context.

The normal discovery handoff records readiness for `oat-project-design`, not
`oat-project-spec`. Do not assume a completed discovery automatically satisfies
the standalone spec check. Ask the agent to verify and resolve that readiness
before proceeding, or use design's built-in requirements confirmation.

**Example scenario:** Stakeholders need to agree on retention and delivery
guarantees before you choose infrastructure. With discovery complete and its
standalone-spec readiness resolved, spec translates those outcomes into
functional and non-functional requirements, priorities, and testable acceptance
criteria. Choose it instead of design because the immediate decision is what
the system must do, not how its components work.

**Expected output:** `spec.md` contains the problem, goals, non-goals,
requirements, constraints, dependencies, proposed high-level approach, and
success metrics. Its Requirement Index gives each requirement a stable ID and
verification method. Planned tasks remain unassigned until planning.

The skill iterates on requirements with you and checks quality and boundaries.
It does not select new technology beyond discovery, design component internals,
or write implementation tasks. After the completion boundary, the spec is ready
for `oat-project-design`.

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

**Prerequisites:** Project applicability is `required`. The existing project
needs completed discovery. A pre-existing `spec.md` must be complete and ready
for design. If that file is an incomplete draft, resolve it before continuing.
If no spec exists, design creates it from discovery. Repository knowledge
provides architecture and implementation context.

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
commits the design before any configured user-review checkpoint. It marks design
complete only after the required completion checks resolve. Committing the
draft alone does not mean it is approved.

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

**Prerequisites:** Project applicability is `required`. The project must use
spec-driven mode, with `design.md` recording `oat_status: complete` and
`oat_ready_for: oat-project-plan`. Quick, import, and lite workflows route to
their own plan-authoring entry skills. An unfinished quick plan resumes
quick-start instead of being handed to implementation.

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
review, initializes implementation tracking, and runs any configured exit
gate. Implementation checkpoint selection is deferred to implementation start
unless already supplied and confirmed. The plan contains no product code.

**Next step:** Run `oat-project-implement` after the plan is ready. If task
decomposition exposes a missing design decision, resolve it in design instead
of making that decision inside the plan.

## oat-project-promote-spec-driven

Use promotion when an existing quick or imported project needs more lifecycle
rigor. Promotion works in place and preserves the plan and implementation
history. It is not a project reset or a fresh discovery run.

**Invocation:** Select the intended active project, then invoke the skill without
a project-selector flag.

```text
/oat-project-promote-spec-driven
Promote the active cache-refresh project, keeping its imported plan and completed task history.
```

**Prerequisites:** Project applicability is `required`. The active project's
`state.md` must record quick or import workflow mode. A spec-driven project is
already promoted, so the skill reports a no-op unless you request artifact
refresh. Lite must promote to quick first through the actual terminal command:

```bash
oat project promote .oat/projects/local/retry-message --to quick
```

Replace that path with the reported lite project path. Then use this skill
against the active quick project.

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

**Next step:** Follow the reported phase and readiness. The handoff commonly
continues implementation or review for work already planned or executed.
Review missing requirements and design detail before treating new drafts as
completed lifecycle artifacts.
