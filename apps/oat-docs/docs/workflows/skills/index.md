---
title: Skills
description: 'User-facing guide to OAT skill families, recommended entry points, and where contributor-facing skill authoring docs live.'
---

# Skills

Use this section when you want to choose the right OAT skill for a task. If you are writing or changing skills, jump to the contributor docs instead.

## Contents

- [Writing Skills](../../contributing/skills.md) - Contributor guide to skill authoring, contracts, and governance.
- [Docs Workflows](../../docs-tooling/workflows.md) - How docs CLI helpers and docs skills work together.
- [Explainer Kit](explainer-kit.md) - Core and OAT adapter usage, recipes and expansion profiles, the two authoring paths, warnings and QA severity, themes, lifecycle policy, durability, and publishing.
- [Repo Improve](repo-improve.md) - Source modes, external-plan boundaries, optional tracking, and OAT import handoff.

## Key Skills by Use Case

- Start a new tracked project: `oat-project-new` or `oat-project-quick-start` (quick start accepts a project name plus optional description; if you omit the description it should ask before discovery begins)
- Resume an existing project: `oat-project-open` and `oat-project-progress`
- Execute a ready plan: `oat-project-implement`
- Import an existing plan: `oat-project-import-plan`
- Split a broad discovery or brainstorm into child projects: `oat-project-split`
- Retroactively capture existing work: `oat-project-capture`
- Run or receive reviews: `oat-project-review-provide`, `oat-project-review-receive`, or the non-project review variants
- Capture a scoped, shippable backlog item: `oat-pjm-add-backlog-item` directly when the work is already scoped, or `oat-brainstorm` when the thought hasn't converged yet — the brainstorm dispatcher's "scoped backlog item" destination pre-fills the title / description / acceptance criteria / scope estimate / priority from the conversation and then runs `oat-pjm-add-backlog-item` with confirmed inputs
- Manage the repo backlog and reference docs: `oat-pjm-update-repo-reference`, `oat-pjm-review-backlog`
- Turn a repo audit, maintainability review, backlog review, backlog directory, or backlog item into standalone external implementation plans: `oat-repo-improve`. Plans land under `.oat/repo/reference/external-plans/`; execute them directly or optionally pass one to `oat-project-import-plan` for tracked OAT execution.
- Choose what to delegate and route bounded work by task class across Codex, Claude, or Cursor: `subagent-orchestration`. It is self-contained and usable without OAT; live catalogs and current instructions take precedence over its dated provider examples.
- Build visual project explainers and final project recaps: `oat-explainer-kit`, backed by the destination-neutral `explainer-kit` core. See [Explainer Kit](explainer-kit.md).
- Work on docs surfaces: `authoring-docs` (general documentation baseline), `oat-docs-authoring` (targeted OAT/Fumadocs authoring), `oat-docs-bootstrap` (guided bootstrap of a new docs app), `oat-docs-analyze`, `oat-docs-apply`, and `oat-project-document`
- Generate a shipping digest or scheduled recap: `oat-wrap-up`
- Run a wave program over a corpus of external plans: `oat-wave-program` (durable program artifact: new/refresh/wave-close) and `oat-wave-execute` (one wave as a wrapper project) — see [Wave Workflows](../wave-workflows.md)
- Research a topic in depth: `deep-research`
- Analyze an artifact, codebase, or document: `analyze`
- Compare options with domain-aware dimensions: `compare`
- Verify a claim adversarially: `skeptic`
- Merge multiple analysis artifacts: `synthesize`
- Capture or refine ideas: `oat-idea-new` (capture a new idea), `oat-idea-ideate` (resume an existing tracked idea or expand a scratchpad seed — not for blank-slate brainstorms; use `oat-brainstorm` for those), `oat-idea-scratchpad`, `oat-idea-summarize`
- Run a project-independent brainstorming conversation: `oat-brainstorm` — entry point with an explicit activation contract. Hard Activation fires only on the `brainstorm` verb ("let's brainstorm", "brainstorm this", "can we brainstorm X", "help me brainstorm X", or `/oat-brainstorm`); ambiguous exploratory phrasing answers conversationally without the banner and offers structured mode only after sustained exploration. Once entered, runs a structured design conversation (one question at a time, 2-3 approaches with a recommendation) and routes to inline / doc-to-path / idea / backlog item / project handoffs based on installed packs. See [Tool Packs](../../cli-utilities/tool-packs.md) for the brainstorm pack details.

## If You Are Trying To...

- choose the right skill for a task, stay in this guide page
- write or update a skill, use [Writing Skills](../../contributing/skills.md)
- understand how docs-specific skills fit with docs commands, use [Docs Workflows](../../docs-tooling/workflows.md)

## Full Catalog

=== "Project lifecycle"

    - `oat-project-new`
    - `oat-project-quick-start`
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
    - `docs-completed-projects-gap-review`

=== "Research"

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
