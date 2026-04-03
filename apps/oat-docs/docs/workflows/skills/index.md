---
title: Skills
description: 'User-facing guide to OAT skill families, recommended entry points, and where contributor-facing skill authoring docs live.'
---

# Skills

Use this section when you want to choose the right OAT skill for a task. If you are writing or changing skills, jump to the contributor docs instead.

## Contents

- [Writing Skills](../../contributing/skills.md) - Contributor guide to skill authoring, contracts, and governance.
- [Docs Workflows](../../docs-tooling/workflows.md) - How docs CLI helpers and docs skills work together.

## Key Skills by Use Case

- Start a new tracked project: `oat-project-new` or `oat-project-quick-start`
- Resume an existing project: `oat-project-open` and `oat-project-progress`
- Execute a ready plan: `oat-project-implement`
- Import an existing plan: `oat-project-import-plan`
- Retroactively capture existing work: `oat-project-capture`
- Run or receive reviews: `oat-project-review-provide`, `oat-project-review-receive`, or the non-project review variants
- Manage the repo backlog and reference docs: `oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-pjm-review-backlog`
- Work on docs surfaces: `oat-docs-analyze`, `oat-docs-apply`, and `oat-project-document`
- Research a topic in depth: `deep-research`
- Analyze an artifact, codebase, or document: `analyze`
- Compare options with domain-aware dimensions: `compare`
- Verify a claim adversarially: `skeptic`
- Merge multiple analysis artifacts: `synthesize`
- Capture or refine ideas: `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`

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
    - `oat-project-implement`
    - `oat-project-subagent-implement`
    - `oat-project-progress`
    - `oat-project-next`
    - `oat-project-capture`
    - `oat-project-reconcile`
    - `oat-project-review-provide`
    - `oat-project-review-receive`
    - `oat-project-review-receive-remote`
    - `oat-project-pr-progress`
    - `oat-project-pr-final`
    - `oat-project-document`
    - `oat-project-complete`

=== "Ideas"

    - `oat-idea-new`
    - `oat-idea-ideate`
    - `oat-idea-scratchpad`
    - `oat-idea-summarize`

=== "Docs and instructions"

    - `oat-docs-analyze`
    - `oat-docs-apply`
    - `oat-agent-instructions-analyze`
    - `oat-agent-instructions-apply`

=== "Review, backlog, and maintenance"

    - `oat-review-provide`
    - `oat-review-receive`
    - `oat-review-receive-remote`
    - `oat-repo-knowledge-index`
    - `oat-repo-maintainability-review`
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
