---
title: Choose a Workflow
description: Choose how to run tracked, resumable work in OAT, from no project to lite, quick, spec-driven, or imported projects, and what each mode does at the end.
---

# Choose a Workflow

Workflows are the part of OAT for tracked, resumable work. They are optional and sit on top of the CLI and provider sync.

Before you choose, read [Approvals and Automation](approvals-and-automation.md): it shows, for each mode, where a person approves, what an agent does without asking, and when OAT pushes or opens a pull request.

Use this section when you want explicit project artifacts, stable task IDs, review loops, and resumable execution across longer-running work. The workflow layer is optional; stay with direct CLI usage when the task is straightforward and the overhead of project artifacts would outweigh the value.

## Where to go from here

- [Ideas Workflow](ideas/index.md) - Lightweight idea capture, brainstorming, and promotion into tracked projects when the work becomes concrete.
- [Projects](projects/index.md) - Lifecycle, artifacts, reviews, PR flow, and repository analysis.
- [Wave Workflows](waves/wave-workflows.md) - Program-level coordination for executing a corpus of external plans as ordered wrapper projects.
- [Skills](../skills/index.md) - Workflow-oriented skill discovery and use-case routing.

## What This Section Is

This section explains when workflow mode is worth the overhead, how OAT projects move through lifecycle phases, and how ideas, skills, reviews, and PR flow fit into that model.

## Who It's For

- Teams doing multi-session or multi-phase work that benefits from tracked artifacts
- Users who want explicit discovery, planning, implementation, and review state
- Repos that need a repeatable human-in-the-loop execution model

## When To Use Workflow Mode

Use workflow mode when:

- the work spans multiple sessions or contributors
- you want explicit discovery, plan, implementation, and review artifacts
- you need stable task sequencing and resumable execution
- you want human-in-the-loop checkpoints around risky transitions

Stay with direct CLI usage when:

- the task is straightforward and bounded
- you mainly need provider sync or a utility command
- the overhead of project artifacts would outweigh the value

## Workflow Modes In Practice

- CLI only: direct commands, no tracked project artifacts
- Lite mode: a batched interview and one approval produce a single-phase `plan.md` for a single-sitting change
- Quick mode: tracked work with a lighter upfront planning path
- Spec-driven mode: explicit discovery, requirements, design, and plan artifacts
- Import mode: an externally-authored plan imported into OAT for tracked execution

## Start Here

- Use [Skills](../skills/index.md) when you want task-oriented guidance on the most useful workflow skills.
- Go to [Workflow & Projects](projects/index.md) when you need the lifecycle and artifact model in detail.
- Use [Ideas](ideas/index.md) when the work is still exploratory.

## Common Tasks

- Capture or refine early work in [Ideas](ideas/index.md).
- Understand how tracked projects progress in [Workflow & Projects](projects/index.md).
- Learn the artifact contract in [Artifacts](../reference/project-artifacts.md).
- Understand review and PR expectations in [Reviews](projects/reviews/index.md) and [PR Flow](projects/closeout/pr-flow.md).

## Go Deeper

- [Skills](../skills/index.md) - Workflow-oriented skill discovery and use-case routing.
- [Ideas](ideas/index.md) - Idea capture, refinement, and promotion flows.
- [Workflow & Projects](projects/index.md) - Lifecycle, artifacts, reviews, PR flow, and repository analysis.

## Which mode should I choose?

A mode decides how much planning happens before any code is written. You pick
it by running that mode's entry skill, and the skill creates the project for
you. An OAT project is a folder of tracked files (plan, state, reviews) that lets
an agent pick the work up again in a later session.

| Mode        | Start it with                                   | Choose it when                                                                 | What you give up                                                                                                | At the end                                                                                                                  |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| No project  | No skill; ask your agent or run CLI commands    | The work is small, or is just provider sync or a single CLI command            | Resuming later, a tracked plan, and lifecycle reviews. Ad-hoc reviews still work                                | OAT pushes nothing and opens no pull request                                                                                |
| Lite        | `/oat-project-lite`                             | The change fits in one sitting and the outcome is clear                        | Discovery and design documents, multiple phases, and approval pauses between phases. You approve one plan, once | Always pushes your current branch and opens a pull request by itself; no setting removes this step                          |
| Quick       | `/oat-project-quick-start`                      | The work is bounded and the requirements are clear                             | A formal requirements document (`spec.md`). Design is optional                                                  | Pushes your branch and opens a pull request only when `workflow.postImplementSequence` asks for it, or in an autonomous run |
| Spec-driven | `/oat-project-new`                              | The requirements are unclear, or the change cuts across many parts of the code | Speed: you approve discovery and design before any planning or code                                             | Same as quick                                                                                                               |
| Import      | `/oat-project-import-plan` with the plan's path | A plan already exists in another tool or document                              | OAT's own discovery and design steps                                                                            | Same as quick                                                                                                               |

Type the skill names in your coding agent's chat, not a terminal; Codex uses
`$` instead of `/`. No mode ever merges a pull request. Separately,
`oat-project-complete` opens a pull request without asking when
`workflow.createPrOnComplete` is `true`. Project files of a project in the
default _synced_ scope are also pushed to `origin` whenever a skill saves
them; see [Approvals and Automation](approvals-and-automation.md#what-oat-does-without-asking).

Decide by how clear the requirements are and how risky the design is, not by
how many tasks the work has. A large but well-understood change can still be a
quick project. If you run `oat project new` yourself without `--mode`, it
creates a spec-driven project, but it only creates the files; the entry skill
is what holds the planning conversation, so start with the skill.

- If you are a solo developer fixing one well-understood bug, choose lite, or
  skip the project entirely if you will not need to resume or review it later.
  Lite ends by pushing your current branch and opening a pull request without
  asking, so start it on a feature branch; if you do not want that, choose
  quick instead, which opens a pull request only when
  `workflow.postImplementSequence` asks for one or the run is autonomous.
- If your team is building a feature with agreed, bounded requirements, choose
  quick. A long task list alone does not call for a formal spec.
- If the change is high-risk or regulated, or its requirements are still being
  debated, choose spec-driven so discovery and design are agreed before
  implementation starts.
- If you already have an approved plan from another tool, import it rather than
  repeating discovery and design.
