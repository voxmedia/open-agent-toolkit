---
title: Skills
description: 'User-facing guide to OAT skill families, recommended entry points, and where contributor-facing skill authoring docs live.'
---

# Skills

Use this section when you want to choose the right OAT skill for a task. If you are writing or changing skills, jump to the contributor docs instead.

## Contents

- [Research and Evaluate a Decision](research.md) - Research, compare, challenge and synthesize evidence.
- [Brainstorm Before Choosing a Workflow](brainstorm.md) - Explore an idea before deciding how to track it.
- [Diagnose Your OAT Setup](diagnostics.md) - Inspect prerequisites and choose a safe repair.
- [Summarize What Shipped](session-closeout.md) - Produce a verified digest across projects and merged work.
- [Explainer Kit](explainer-kit.md) - Agent-authored generation flow, direct and lifecycle callers, verification ladder, run package, and outcomes.
- [Repo Improve](repo-improve.md) - Source modes, external-plan boundaries, optional tracking, and OAT import handoff.
- [Recon Evidence Packets](recon.md) - Approved worker profiles, validated claim states, packet layout, partial outcomes, and directory-only handoff.

## How to run a skill

A skill is a set of written instructions that your coding agent (Claude Code,
Codex, Cursor and similar tools) follows. An `oat` command is a program you run
in a terminal; a skill may run `oat` commands for you. To run a skill, type its
name with a slash in your agent's chat, for example `/oat-docs-analyze`. Codex
uses `$` instead: `$oat-docs-analyze`. Some guides show arguments or a short
request after the name.

Some skills start only when you type their name; the agent will not choose them
on its own. In the catalog below, these show `model disabled: true` under
Visibility. Follow a skill's name to its guide, which says whether it needs an
active project (an OAT project already open in this checkout) and what it does
without asking you.

**Example.** Your docs are stale: several pages describe commands that have
changed. In the [catalog](#supported-skill-catalog), the Docs workflows table
lists `oat-docs-analyze`. Its [guide](../docs-tooling/workflows.md#oat-docs-analyze)
says it needs no active project and, without asking, writes a report under
`.oat/repo/analysis/` and updates `.oat/tracking.json`; it does not edit your
pages. Type `/oat-docs-analyze`, read the report, then run `/oat-docs-apply` to
make only the changes you approve.

## Key Skills by Use Case

- Start a new tracked project: `oat-project-new`, `oat-project-quick-start`, or `oat-project-lite` for a single-sitting change with one batched interview and one approval (quick start accepts a project name plus optional description; if you omit the description it should ask before discovery begins)
- Resume an existing project: `oat-project-open` to select it,
  `oat-project-progress` to see where it stands, then `oat-project-next` to
  continue. See
  [Resume work on this machine](../workflows/projects/execution/picking-up-projects.md#resume-work-on-this-machine).
- Execute a ready plan: `oat-project-implement`
- Import an existing plan: `oat-project-import-plan`
- Split a broad discovery or brainstorm into child projects: `oat-project-split`
- Retroactively capture existing work: `oat-project-capture`
- Run or receive reviews: `oat-project-review-provide`, `oat-project-review-receive`, or the non-project review variants
- Generate an evidence-grounded project retrospective, apply approved repo
  improvements, or file tracker feedback: `oat-project-retro` and
  `oat-project-retro-file`. See
  [Project Retrospectives](../workflows/projects/closeout/retro.md).
- Capture a scoped, shippable backlog item: `oat-pjm-add-backlog-item` directly when the work is already scoped, or `oat-brainstorm` when the thought hasn't converged yet — the brainstorm dispatcher's "scoped backlog item" destination pre-fills the title / description / acceptance criteria / scope estimate / priority from the conversation and then runs `oat-pjm-add-backlog-item` with confirmed inputs
- Manage the repo backlog and reference docs: `oat-pjm-update-repo-reference`, `oat-pjm-review-backlog`
- Operate an explicit GitHub, Linear, or Jira planning-record binding through a
  live host capability: `oat-pjm-remote`. The OAT CLI retains policy, preview,
  approval, journal, and verification authority; the skill discovers and
  invokes only the exact host action emitted for one durable operation.
- Turn a repo audit, maintainability review, backlog review, backlog directory, or backlog item into standalone external implementation plans: `oat-repo-improve`. Plans land under `.oat/repo/reference/external-plans/`; execute them directly or optionally pass one to `oat-project-import-plan` for tracked OAT execution.
- Choose what to delegate and route bounded work by task class across Codex, Claude, or Cursor: `subagent-orchestration`. It is self-contained and usable without OAT; live catalogs and current instructions take precedence over its dated provider examples.
- Build visual project explainers and final project recaps: `oat-explainer-kit`, backed by the destination-neutral `explainer-kit` core. See [Explainer Kit](explainer-kit.md).
- Work on docs surfaces: `authoring-docs` (general documentation baseline), `oat-docs-authoring` (targeted OAT/Fumadocs authoring), `oat-docs-bootstrap` (guided bootstrap of a new docs app), `oat-docs-analyze`, `oat-docs-apply`, and `oat-project-document`
- Generate a shipping digest or scheduled recap: `oat-wrap-up`
- Run a wave program over a corpus of external plans: `oat-wave-program` (durable program artifact: new/refresh/wave-close) and `oat-wave-execute` (one wave as a wrapper project) — see [Wave Workflows](../workflows/waves/wave-workflows.md)
- Research a topic in depth: `deep-research`
- Acquire and validate bounded evidence for another workflow: `recon`
- Analyze an artifact, codebase, or document: `analyze`
- Compare options with domain-aware dimensions: `compare`
- Verify a claim adversarially: `skeptic`
- Merge multiple analysis artifacts: `synthesize`
- Capture or refine ideas: `oat-idea-new` (capture a new idea), `oat-idea-ideate` (resume an existing tracked idea or expand a scratchpad seed — not for blank-slate brainstorms; use `oat-brainstorm` for those), `oat-idea-scratchpad`, `oat-idea-summarize`
- Run a project-independent brainstorming conversation: `oat-brainstorm` — entry point with an explicit activation contract. Hard Activation fires only on the `brainstorm` verb ("let's brainstorm", "brainstorm this", "can we brainstorm X", "help me brainstorm X", or `/oat-brainstorm`); ambiguous exploratory phrasing answers conversationally without the banner and offers structured mode only after sustained exploration. Once entered, runs a structured design conversation (one question at a time, 2-3 approaches with a recommendation) and routes to inline / doc-to-path / idea / backlog item / project handoffs based on installed packs. See [Tool Packs](../getting-started/tool-packs.md) for the brainstorm pack details.

## Remote host execution loop

Use `oat-pjm-remote` only for an explicit remote lifecycle request. Its loop is
deliberately narrow:

1. Before the first provider-contacting command, inspect currently granted MCP
   or connector descriptions for a semantic and exact-context match.
2. If no capable connector is available, inspect an already configured
   provider CLI's live help before the first attempt. Do not install a tool,
   retain its dialect, or switch execution surfaces mid-attempt.
3. Construct only bounded provider-neutral capability evidence and pass it to
   the requested command with `--capability-evidence-stdin`. Treat the CLI's
   policy, preview, approval, safety, and durable state as authoritative.
4. When the CLI returns `pending` with `externalAction`, execute that exact
   semantic action at most once and submit one bounded,
   sanitized observation with `oat pjm remote operation continue`.
5. Continue only when the CLI emits another exact action for the same durable
   operation. Stop on its terminal envelope.

The skill cannot broaden the normalized projection, bypass effective policy,
binding clamps, purpose field grants, hard approval floors, or caller-owned
authority evidence, read credential values, persist native provider data, or
declare remote success. A connector result, process exit, or visible remote
change is only evidence. Success requires an OAT `ok` envelope after
authoritative read-back.
See [Remote Project Management](../workflows/backlog-and-planning/remote-project-management.md)
for policy, storage, approval, and recovery details.

## If You Are Trying To...

- choose the right skill for a task, stay in this guide page
- write or update a skill, use [Writing Skills](../contributing/skills.md)
- understand how docs-specific skills fit with docs commands, use [Docs Workflows](../docs-tooling/workflows.md)

## Full Catalog

=== "Project lifecycle"

    - `oat-project-new`
    - `oat-project-quick-start`
    - `oat-project-lite`
    - `oat-project-import-plan`
    - `oat-project-promote-spec-driven`
    - `oat-project-open`
    - `oat-project-clear-active`
    - `oat-project-discover`
    - `oat-project-spec`
    - `oat-project-design`
    - `oat-project-plan`
    - `oat-project-plan-writing`
    - `oat-project-split`
    - `oat-project-implement`
    - `oat-project-progress`
    - `oat-project-next`
    - `oat-project-capture`
    - `oat-project-reconcile`
    - `oat-project-review-provide`
    - `oat-project-review-provide-remote`
    - `oat-project-review-receive`
    - `oat-project-review-receive-remote`
    - `oat-project-pr-progress`
    - `oat-project-pr-final`
    - `oat-project-document`
    - `oat-project-retro`
    - `oat-project-retro-file`
    - `oat-explainer-kit`
    - `oat-wrap-up`
    - `oat-project-complete`
    - `oat-wave-program`
    - `oat-wave-execute`

=== "Ideas"

    - `oat-idea-new`
    - `oat-idea-ideate`
    - `oat-idea-scratchpad`
    - `oat-idea-summarize`

=== "Brainstorming"

    - `oat-brainstorm`

=== "Docs and instructions"

    - `authoring-docs`
    - `oat-docs-authoring`
    - `oat-docs-bootstrap`
    - `oat-docs-analyze`
    - `oat-docs-apply`
    - `oat-agent-instructions-analyze`
    - `oat-agent-instructions-apply`

=== "Review, backlog, and maintenance"

    - `oat-review-provide`
    - `oat-review-provide-remote`
    - `oat-review-receive`
    - `oat-review-receive-remote`
    - `oat-repo-knowledge-index`
    - `oat-repo-maintainability-review`
    - `oat-repo-improve`
    - `oat-pjm-add-backlog-item`
    - `oat-pjm-update-repo-reference`
    - `oat-pjm-review-backlog`
    - `oat-pjm-remote`
    - `docs-completed-projects-gap-review`

=== "Research"

    - `recon`
    - `deep-research`
    - `analyze`
    - `compare`
    - `skeptic`
    - `synthesize`

=== "Scaffolding and utility"

    - `subagent-orchestration`
    - `explainer-kit`
    - `oat-worktree-bootstrap`
    - `oat-worktree-bootstrap-auto`
    - `create-oat-skill`
    - `create-agnostic-skill`
    - `create-pr-description`
    - `create-ticket`
    - `codex-skill`

## Discovery Source

`AGENTS.md` is the session-facing registry. It should stay aligned with skill frontmatter and the canonical skill directories under `.agents/skills/`.

Legacy compatibility note: `review-backlog` and `update-repo-reference` may still exist in some environments, but prefer the `oat-pjm-*` family for the current file-backed backlog/reference workflow.

## Related Guides

- [Writing Skills](../contributing/skills.md) - Contributor guide to skill authoring, contracts, and governance.
- [Docs Workflows](../docs-tooling/workflows.md) - How docs CLI helpers and docs skills work together.
- [Repository PR Comment Analysis](../reference/repository-pr-comments.md) - Repo-wide PR comment collection and triage.

## Supported Skill Catalog

<!-- oat:skill-catalog:start -->

Generated from canonical skill metadata and the reviewed guide mapping. Do not edit this block; run `pnpm docs:skills:generate` after changing those sources.

Follow a skill name for its invocation, prerequisites, scenario and output. “Needs an active project?” says whether the skill needs an OAT project (a tracked unit of work under `.oat/projects/`) to be already open in this checkout: “Yes” means it does, “Optional” means it works with or without one, and “No” means it does not need one. Conditional details are in each guide.

Visibility reports source metadata: “user” is `user-invocable` and “model disabled” is `disable-model-invocation`. “Not declared” is not an explicit visibility setting.

### Agent instructions

| Skill                                                                                                    | Description                                                                                                                                                                                                 | Visibility                       | Needs an active project? |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-agent-instructions-analyze`](../docs-tooling/agent-instructions.md#oat-agent-instructions-analyze) | Run when you need to evaluate agent instruction file coverage, quality, and drift. Produces a severity-rated analysis artifact. Run before oat-agent-instructions-apply to identify what needs improvement. | user: true; model disabled: true | No                       |
| [`oat-agent-instructions-apply`](../docs-tooling/agent-instructions.md#oat-agent-instructions-apply)     | Run when you have an agent instructions analysis artifact and want to generate or update instruction files. Creates a branch, generates files from templates, and optionally opens a PR.                    | user: true; model disabled: true | No                       |

### Autonomous execution

| Skill                                                                                | Description                                                                                                                                                                                                                      | Visibility                       | Needs an active project? |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-project-autonomous`](../workflows/advanced/autonomy.md#oat-project-autonomous) | Use when a user explicitly asks to run an OAT project autonomously end-to-end. Activates session-only autonomy, resumes the correct lifecycle phase, and drives the existing OAT skills through final PR or a reported boundary. | user: true; model disabled: true | No                       |

### Backlog and planning

| Skill                                                                                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                     | Visibility                        | Needs an active project? |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-pjm-add-backlog-item`](../workflows/backlog-and-planning/backlog-lifecycle.md#oat-pjm-add-backlog-item)           | Use when the user requests or confirms adding a new repo backlog item — e.g. "add a backlog item for X", "capture that as backlog", "track that follow-up", "file a backlog ticket", or confirms a previously offered backlog capture. Do NOT auto-invoke when a follow-up is mentioned. Creates the item file in the file-per-item backlog structure, regenerates the index, and prompts for curated overview updates.                         | user: true; model disabled: false | No                       |
| [`oat-pjm-decision`](../workflows/backlog-and-planning/backlog-lifecycle.md#oat-pjm-decision)                           | Use when the user requests or confirms recording a durable repo decision — e.g. "capture that as a decision", "write an ADR for X", "record this architectural choice", or confirms a previously offered decision capture. Creates a file-per-record decision under reference/decisions/ via &#96;oat decision new&#96; and refreshes the generated decision index. Do NOT auto-invoke for routine choices that do not warrant durable history. | user: true; model disabled: false | No                       |
| [`oat-pjm-remote`](../workflows/backlog-and-planning/backlog-lifecycle.md#oat-pjm-remote)                               | Use when explicitly intaking, publishing, refreshing, reconciling, or continuing an OAT PJM remote binding through a live host capability. Keeps policy, approval, state, and success verdicts in the OAT CLI while the host discovers and invokes currently granted execution capabilities.                                                                                                                                                    | user: true; model disabled: false | No                       |
| [`oat-pjm-review-backlog`](../workflows/backlog-and-planning/backlog-lifecycle.md#oat-pjm-review-backlog)               | Use when prioritizing the file-backed repo backlog or evaluating roadmap alignment. Produces value-effort ratings, dependency mapping, execution recommendations, and an optional external-plan handoff.                                                                                                                                                                                                                                        | user: true; model disabled: true  | No                       |
| [`oat-pjm-update-repo-reference`](../workflows/backlog-and-planning/backlog-lifecycle.md#oat-pjm-update-repo-reference) | Use when repo reference artifacts need updating — roadmap, decision records, backlog status, or completed history. Frequently invoked at project completion, often chained from &#96;oat-project-document&#96;, to ensure active &#96;.oat/repo/pjm/&#96; state and durable &#96;.oat/repo/reference/&#96; records reflect what shipped.                                                                                                        | user: true; model disabled: false | Optional                 |

### Brainstorm

| Skill                                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Visibility                        | Needs an active project? |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------ |
| [`oat-brainstorm`](brainstorm.md#oat-brainstorm) | Use when the user explicitly invokes the &#96;brainstorm&#96; verb, including &#96;/oat-brainstorm&#96;, "let's brainstorm", "brainstorm this", "can we brainstorm X", or "help me brainstorm X". For ambiguous exploratory phrasing &#40;"I've been thinking", "what if", "help me think through"&#41;, do NOT auto-enter; respond conversationally and offer mode only after ≥2 sustained exploratory turns. Do NOT use for review, debug, PR, status, implementation, or active-workflow questions. | user: true; model disabled: false | Optional                 |

### Cursor Cloud

| Skill                                                                                          | Description                                                                                                                                                                                                                      | Visibility                        | Needs an active project? |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-cursor-cloud-projects`](../workflows/advanced/cursor-cloud.md#oat-cursor-cloud-projects) | Use when OAT work is mentioned in a Cursor Cloud environment. Orients agents to cloud detection, repo-rooted project homes, user-first assets, CLI availability, and Cursor dispatch context without owning lifecycle execution. | user: true; model disabled: false | Optional                 |

### Docs workflows

| Skill                                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Visibility                        | Needs an active project? |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`authoring-docs`](../docs-tooling/workflows.md#authoring-docs)         | Use when creating, restructuring, migrating, auditing, or reviewing technical documentation for software projects. Provides evidence-first, provider-portable Markdown authoring standards.                                                                                                                                                                                                                                                                                        | user: true; model disabled: false | No                       |
| [`oat-docs`](../docs-tooling/workflows.md#oat-docs)                     | Use when a user asks questions about OAT workflows, CLI commands, skill authoring, configuration, or project lifecycle. Answers questions by reading locally-bundled OAT documentation.                                                                                                                                                                                                                                                                                            | user: true; model disabled: false | No                       |
| [`oat-docs-analyze`](../docs-tooling/workflows.md#oat-docs-analyze)     | Run when you need to evaluate documentation structure, navigation, and coverage against the OAT documentation contract. Produces a severity-rated analysis artifact for oat-docs-apply.                                                                                                                                                                                                                                                                                            | user: true; model disabled: true  | No                       |
| [`oat-docs-apply`](../docs-tooling/workflows.md#oat-docs-apply)         | Run when you have a docs analysis artifact and want to generate or update documentation structure and content. Creates a branch, applies approved changes, and optionally opens a PR.                                                                                                                                                                                                                                                                                              | user: true; model disabled: true  | No                       |
| [`oat-docs-authoring`](../docs-tooling/workflows.md#oat-docs-authoring) | Use when authoring or restructuring targeted content inside an existing OAT Markdown surface or OAT/Fumadocs docs app. Preserves OAT docs navigation, generated indexes, and validation boundaries.                                                                                                                                                                                                                                                                                | user: true; model disabled: false | No                       |
| [`oat-docs-bootstrap`](../docs-tooling/workflows.md#oat-docs-bootstrap) | Use when bootstrapping or adopting an OAT documentation surface in a repo. Guides the user through preflight detection, richer input gathering than the raw CLI, &#96;oat docs init&#96; invocation with gated post-patches for open CLI gaps, build verification, post-scaffold config inspection, and an educational walkthrough. Supports plain Markdown &#40;file-level path&#41;, Fumadocs &#40;full path&#41;, and MkDocs &#40;lean path with defined minimum contract&#41;. | user: true; model disabled: true  | Optional                 |

### Explainer Kit

| Skill                                                     | Description                                                                                            | Visibility                               | Needs an active project? |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------ |
| [`explainer-kit`](explainer-kit.md#explainer-kit)         | Use when building destination-neutral visual explainer artifacts from explicit, versioned inputs.      | user: true; model disabled: not declared | No                       |
| [`oat-explainer-kit`](explainer-kit.md#oat-explainer-kit) | Use when building project explainers or recaps from OAT configuration, state, and lifecycle artifacts. | user: true; model disabled: false        | Optional                 |

### Ideas

| Skill                                                                        | Description                                                                                                                                                                                                                | Visibility                       | Needs an active project? |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-idea-ideate`](../workflows/ideas/lifecycle.md#oat-idea-ideate)         | Use when continuing an existing tracked idea or expanding an explicit scratchpad seed from &#123;IDEAS_ROOT&#125;/scratchpad.md. Do NOT use to start a brand-new, destinationless brainstorm; use oat-brainstorm for that. | user: true; model disabled: true | No                       |
| [`oat-idea-new`](../workflows/ideas/lifecycle.md#oat-idea-new)               | Use when starting ideation for a new concept or problem. Creates an idea directory for lightweight capture and handoff to ongoing ideation.                                                                                | user: true; model disabled: true | No                       |
| [`oat-idea-scratchpad`](../workflows/ideas/lifecycle.md#oat-idea-scratchpad) | Use when you need quick idea capture or want to review scratchpad entries. Manages lightweight idea seeds and optional notes.                                                                                              | user: true; model disabled: true | No                       |
| [`oat-idea-summarize`](../workflows/ideas/lifecycle.md#oat-idea-summarize)   | Use when an idea is mature enough to move from brainstorming into the backlog. Generates a summary document and adds the idea to the backlog.                                                                              | user: true; model disabled: true | No                       |

### Project closeout

| Skill                                                                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                           | Visibility                        | Needs an active project? |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-project-complete`](../workflows/projects/closeout/closeout-skills.md#oat-project-complete)       | Use when all implementation work is finished and the project is ready to close. Marks the OAT project lifecycle as complete.                                                                                                                                                                                                                                                                                                          | user: true; model disabled: true  | Yes                      |
| [`oat-project-document`](../workflows/projects/closeout/closeout-skills.md#oat-project-document)       | Use when the user requests or confirms documenting an active OAT project — e.g. "document the project", "update the docs", "run oat-project-document", or confirms a previously offered documentation run. Do NOT auto-invoke when implementation completes. Analyzes project artifacts, presents a documentation delta plan, and applies approved changes.                                                                           | user: true; model disabled: false | Yes                      |
| [`oat-project-pr-final`](../workflows/projects/closeout/closeout-skills.md#oat-project-pr-final)       | Use when the user requests or confirms opening the final PR for an active OAT project — e.g. "open the final PR", "ship it", "run oat-project-pr-final", or confirms a previously offered final-PR step. Do NOT auto-invoke when phases are marked complete. Generates the final lifecycle PR description from artifacts and creates the PR.                                                                                          | user: true; model disabled: false | Yes                      |
| [`oat-project-pr-progress`](../workflows/projects/closeout/closeout-skills.md#oat-project-pr-progress) | Use when an active OAT project needs a mid-project PR for a completed phase &#40;pNN&#41;. Generates a phase-scoped progress PR description from OAT artifacts and commit history, with optional PR creation.                                                                                                                                                                                                                         | user: true; model disabled: true  | Yes                      |
| [`oat-project-retro`](../workflows/projects/closeout/closeout-skills.md#oat-project-retro)             | Use when the user requests or confirms a project retrospective — e.g. "run the project retro", "write project-retro.md", "retrospective this project", or confirms a previously offered retro. Do NOT auto-invoke merely because implementation or summary completed. Produces references/project-retro.md from project logs, execution learnings, and session/transcript evidence, with repo improvements and OAT upstream feedback. | user: true; model disabled: false | Yes                      |
| [`oat-project-retro-file`](../workflows/projects/closeout/closeout-skills.md#oat-project-retro-file)   | Use when the user requests or confirms filing proposed feedback from a project retro into repository or upstream GitHub issues and OAT backlog items. Runs destination capability, duplicate, approval, and sanitization checks before filing, then writes destinations and statuses back to the retro artifact.                                                                                                                      | user: true; model disabled: false | Yes                      |
| [`oat-project-revise`](../workflows/projects/closeout/closeout-skills.md#oat-project-revise)           | Use when a project has an open PR and human feedback needs to be incorporated. Creates revision tasks and re-enters implementation.                                                                                                                                                                                                                                                                                                   | user: true; model disabled: true  | Yes                      |
| [`oat-project-summary`](../workflows/projects/closeout/closeout-skills.md#oat-project-summary)         | Use when the user requests or confirms summarizing an active OAT project — e.g. "summarize the project", "generate the summary", "run oat-project-summary", or confirms a previously offered summary run. Do NOT auto-invoke when implementation completes. Generates summary.md from project artifacts as institutional memory.                                                                                                      | user: true; model disabled: false | Yes                      |

### Project entry

| Skill                                                                                                    | Description                                                                                                                                                                                                         | Visibility                       | Needs an active project? |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-project-capture`](../workflows/projects/planning/starting-projects.md#oat-project-capture)         | Use when work happened outside the OAT project workflow and needs retroactive project tracking. Creates a full project from an existing branch and conversation context.                                            | user: true; model disabled: true | No                       |
| [`oat-project-import-plan`](../workflows/projects/planning/starting-projects.md#oat-project-import-plan) | Use when you have an external markdown plan to execute with OAT. Preserves the source plan and normalizes it into canonical plan.md format.                                                                         | user: true; model disabled: true | No                       |
| [`oat-project-lite`](../workflows/projects/planning/starting-projects.md#oat-project-lite)               | Use when a single-sitting change needs a critical interview, an approved single-phase plan, and resumable OAT implementation with minimal ceremony.                                                                 | user: true; model disabled: true | No                       |
| [`oat-project-new`](../workflows/projects/planning/starting-projects.md#oat-project-new)                 | Use when starting a spec-driven OAT project from scratch. Scaffolds a new project under PROJECTS_ROOT and sets it active.                                                                                           | user: true; model disabled: true | No                       |
| [`oat-project-quick-start`](../workflows/projects/planning/starting-projects.md#oat-project-quick-start) | Use when a task is small enough for quick mode or rapid iteration is preferred. Scaffolds a lightweight OAT project from discovery directly to a runnable plan, with optional brainstorming and lightweight design. | user: true; model disabled: true | No                       |
| [`oat-project-split`](../workflows/projects/planning/starting-projects.md#oat-project-split)             | Use when a discovery or brainstorm should split one broad scope into coordinated OAT child projects.                                                                                                                | user: true; model disabled: true | No                       |

### Project execution

| Skill                                                                                                | Description                                                                                                                                                                                               | Visibility                       | Needs an active project? |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-project-implement`](../workflows/projects/execution/execution-skills.md#oat-project-implement) | Use when plan.md is ready for execution. Dispatches one phase implementer per phase, owns independent phase review and bounded fix routing, and supports plan-declared worktree-isolated parallel phases. | user: true; model disabled: true | Yes                      |
| [`oat-project-reconcile`](../workflows/projects/execution/execution-skills.md#oat-project-reconcile) | Use when human-implemented commits need to be mapped back to planned tasks. Reconciles implementation.md and state.md after manual work outside the OAT workflow.                                         | user: true; model disabled: true | Yes                      |

### Project planning

| Skill                                                                                                                  | Description                                                                                                                                                                                                                                                                                                      | Visibility                        | Needs an active project? |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-project-design`](../workflows/projects/planning/planning-skills.md#oat-project-design)                           | Use when discovery is complete and implementation-ready decisions are needed. Runs a collaborative, selective collaborative, or draft-and-review design flow, confirms requirements and produces both &#96;spec.md&#96; and &#96;design.md&#96;, and commits artifacts before the user-review gate.              | user: true; model disabled: true  | Yes                      |
| [`oat-project-discover`](../workflows/projects/planning/planning-skills.md#oat-project-discover)                       | Use when the user explicitly asks to continue discovery for an active spec-driven OAT project — e.g. "continue discovery", "run discovery", or confirms a previously offered discovery step. Do NOT auto-invoke for new ideas or quick/lite-mode projects. Gathers requirements and context before spec/design.  | user: true; model disabled: false | Yes                      |
| [`oat-project-plan`](../workflows/projects/planning/planning-skills.md#oat-project-plan)                               | Use when design.md is complete and executable implementation tasks are needed. Breaks design into bite-sized TDD tasks in canonical plan.md format.                                                                                                                                                              | user: true; model disabled: true  | Yes                      |
| [`oat-project-promote-spec-driven`](../workflows/projects/planning/planning-skills.md#oat-project-promote-spec-driven) | Use when a quick or imported project now needs Spec-Driven lifecycle rigor. Backfills missing discovery, spec, and design artifacts in place.                                                                                                                                                                    | user: true; model disabled: true  | Yes                      |
| [`oat-project-spec`](../workflows/projects/planning/planning-skills.md#oat-project-spec)                               | Use when discovery is complete but you're not ready to design yet, and you want to formalize requirements into a structured spec.md as an optional standalone step. Independent of the design workflow — oat-project-design confirms requirements automatically and does not require this skill to be run first. | user: true; model disabled: true  | Yes                      |

### Project state and resume

| Skill                                                                                                         | Description                                                                                                                                                                                                                                                                         | Visibility                        | Needs an active project? |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-project-clear-active`](../workflows/projects/execution/picking-up-projects.md#oat-project-clear-active) | Use when switching context or cleaning up project state. Clears the active OAT project.                                                                                                                                                                                             | user: true; model disabled: true  | Optional                 |
| [`oat-project-next`](../workflows/projects/execution/picking-up-projects.md#oat-project-next)                 | Use when continuing work on the active OAT project. Reads project state, determines the next lifecycle action, and invokes the appropriate skill automatically.                                                                                                                     | user: true; model disabled: true  | Yes                      |
| [`oat-project-open`](../workflows/projects/execution/picking-up-projects.md#oat-project-open)                 | Use when switching to or resuming a specific OAT project. Delegates to &#96;oat project open&#96; for validation and activation.                                                                                                                                                    | user: true; model disabled: true  | No                       |
| [`oat-project-progress`](../workflows/projects/execution/picking-up-projects.md#oat-project-progress)         | Use when the user explicitly asks to check OAT project progress — e.g. "check progress", "what's next", "where are we", or confirms a previously offered progress check. Do NOT auto-invoke just because a workflow step completed. Reads project status and offers the next route. | user: true; model disabled: false | Optional                 |

### Reconnaissance

| Skill                     | Description                                                                                                                                                                                       | Visibility                       | Needs an active project? |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`recon`](recon.md#recon) | Use when a bounded investigation needs source-grounded evidence before analysis or implementation. Produces a validated evidence-packet directory through approved provider-neutral worker waves. | user: true; model disabled: true | No                       |

### Repository improvement

| Skill                                                                                | Description                                                                                                                                                                  | Visibility                        | Needs an active project? |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-repo-improve`](repo-improve.md#oat-repo-improve)                               | Use when auditing a repository or turning maintainability reviews, backlog reviews, backlog directories, or backlog items into self-contained external implementation plans. | user: true; model disabled: false | No                       |
| [`oat-repo-knowledge-index`](repo-improve.md#oat-repo-knowledge-index)               | Use when onboarding OAT to a repository or when knowledge artifacts are stale. Generates or refreshes the codebase knowledge index using parallel mapper agents.             | user: true; model disabled: true  | No                       |
| [`oat-repo-maintainability-review`](repo-improve.md#oat-repo-maintainability-review) | Use when you need a structured maintainability analysis for a repository or directory target with actionable findings and an optional external-plan handoff.                 | user: true; model disabled: true  | No                       |

### Research and analysis

| Skill                                        | Description                                                                                                                                                                                      | Visibility                               | Needs an active project? |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------ |
| [`analyze`](research.md#analyze)             | Multi-angle analysis of existing artifacts, codebases, documents, or systems. Examines what you have from six analysis angles and produces structured findings with prioritized recommendations. | user: true; model disabled: not declared | No                       |
| [`compare`](research.md#compare)             | Domain-aware comparative analysis with clear recommendations. Compares options across auto-detected or user-specified dimensions and produces a qualitative assessment with a clear winner.      | user: true; model disabled: not declared | No                       |
| [`deep-research`](research.md#deep-research) | Comprehensive research orchestrator that classifies topics, dispatches parallel research-angle workers, and produces structured artifacts using domain-specific schemas.                         | user: true; model disabled: not declared | No                       |
| [`skeptic`](research.md#skeptic)             | Use when the user questions or suspects an agent claim is wrong. Adversarially gathers evidence to verify or refute the claim using the best sources available in the current environment.       | user: true; model disabled: not declared | No                       |
| [`synthesize`](research.md#synthesize)       | Merge multiple analysis artifacts into a single coherent report with provenance tracking. Reads existing artifacts from /deep-research, /analyze, and /compare.                                  | user: true; model disabled: not declared | No                       |

### Review

| Skill                                                                                                                    | Description                                                                                                                                                                                                                                                                                                                 | Visibility                        | Needs an active project? |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-project-review-provide`](../workflows/projects/reviews/review-flavors.md#oat-project-review-provide)               | Use when the user explicitly asks to review an OAT project — e.g. "review project", "review the project", "run project review", or confirms a previously offered review. Do NOT auto-invoke on completed work alone. Resolves a project review scope and offers before running.                                             | user: true; model disabled: false | Yes                      |
| [`oat-project-review-provide-remote`](../workflows/projects/reviews/review-flavors.md#oat-project-review-provide-remote) | Use when reviewing a GitHub PR opened on another machine for an active OAT project and posting findings back as a single PR review. Resolves the project from the PR diff, reads project artifacts for mode-aware review, and posts via gh api.                                                                             | user: true; model disabled: true  | Yes                      |
| [`oat-project-review-receive`](../workflows/projects/reviews/review-flavors.md#oat-project-review-receive)               | Use when the user explicitly asks to receive review findings for an OAT project — e.g. "receive review", "process review", "process the project review", or confirms a previously offered review-receive step. Do NOT auto-invoke merely because a review file exists. Resolves the latest review and offers before acting. | user: true; model disabled: false | Yes                      |
| [`oat-project-review-receive-remote`](../workflows/projects/reviews/review-flavors.md#oat-project-review-receive-remote) | Use when processing GitHub PR review comments within project context. Fetches PR comments, creates plan tasks, and updates project artifacts.                                                                                                                                                                               | user: true; model disabled: true  | Yes                      |
| [`oat-review-provide`](../workflows/projects/reviews/review-flavors.md#oat-review-provide)                               | Use when you need an ad-hoc review outside an active OAT project lifecycle. Reviews code or artifacts without project phase state, unlike oat-project-review-provide.                                                                                                                                                       | user: true; model disabled: true  | No                       |
| [`oat-review-provide-remote`](../workflows/projects/reviews/review-flavors.md#oat-review-provide-remote)                 | Use when reviewing a GitHub PR opened on another machine and posting findings back as a single PR review, outside any OAT project context. Fetches the PR via gh, reviews it, and posts via gh api.                                                                                                                         | user: true; model disabled: true  | No                       |
| [`oat-review-receive`](../workflows/projects/reviews/review-flavors.md#oat-review-receive)                               | Use when processing review findings outside project context. Converts local review artifacts into actionable task lists.                                                                                                                                                                                                    | user: true; model disabled: true  | No                       |
| [`oat-review-receive-remote`](../workflows/projects/reviews/review-flavors.md#oat-review-receive-remote)                 | Use when processing GitHub PR review comments outside project context. Fetches PR comments via agent-reviews and converts them into actionable task lists.                                                                                                                                                                  | user: true; model disabled: true  | No                       |

### Session closeout

| Skill                                            | Description                                                                                                                                                                                                                | Visibility                        | Needs an active project? |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-wrap-up`](session-closeout.md#oat-wrap-up) | Use when preparing a shipping digest or weekly/biweekly wrap-up summarizing OAT projects and merged PRs over a time window. Reads local summary files and GitHub PR metadata; writes a version-controlled markdown report. | user: true; model disabled: false | No                       |

### Setup diagnostics

| Skill                                     | Description                                                                                                                                                                                                                                                                                                                                 | Visibility                       | Needs an active project? |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-doctor`](diagnostics.md#oat-doctor) | Use when you want to check the health of your OAT setup in one place — config, project management &#40;PJM&#41;, agent instructions, docs, and installed tools — and then work through what it finds. Sweeps read-only, reports by area, and dives into an area on request, teaching from the bundled docs and offering exact fix commands. | user: true; model disabled: true | No                       |

### Skill authoring

| Skill                                                                      | Description                                                                                                                                | Visibility                       | Needs an active project? |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------ |
| [`create-agnostic-skill`](../contributing/skills.md#create-agnostic-skill) | Use when adding a reusable workflow skill for AI coding agents. Scaffolds a new .agents/skills skill using the Agent Skills open standard. | user: true; model disabled: true | No                       |

### Subagent orchestration

| Skill                                                                                           | Description                                                                                                                                                                                                                    | Visibility                               | Needs an active project? |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------ |
| [`subagent-orchestration`](../workflows/advanced/orchestration-model.md#subagent-orchestration) | Use when delegating work to subagents or choosing a model for a task — routing by task class, selecting provider-specific models and effort, and verifying subagent claims. Covers OpenAI/Codex, Anthropic/Claude, and Cursor. | user: true; model disabled: not declared | No                       |

### Waves

| Skill                                                                       | Description                                                                                                                                                                                                                                    | Visibility                        | Needs an active project? |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| [`oat-wave-execute`](../workflows/waves/wave-workflows.md#oat-wave-execute) | Use when executing a wave of external implementation plans as a wrapper OAT project — scaffolding, drift refresh, parallel worktree groups, briefs, gates, merge choreography, and closeout.                                                   | user: true; model disabled: false | No                       |
| [`oat-wave-program`](../workflows/waves/wave-workflows.md#oat-wave-program) | Use when decomposing a corpus of external implementation plans into an ordered wave program — coverage inventory, dependency mapping, wave composition, and the durable execution-program artifact that oat-wave-execute consumes and updates. | user: true; model disabled: false | No                       |

### Worktree bootstrap

| Skill                                                                                          | Description                                                                                                                         | Visibility                       | Needs an active project? |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| [`oat-worktree-bootstrap`](../workflows/advanced/worktree-bootstrap.md#oat-worktree-bootstrap) | Use when creating or resuming a git worktree for OAT implementation. Creates or validates a worktree and runs OAT bootstrap checks. | user: true; model disabled: true | Optional                 |

<!-- oat:skill-catalog:end -->
