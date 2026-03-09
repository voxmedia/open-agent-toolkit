# Skills Index

Project skills are stored in `.agents/skills`.

## Contents

- [Execution Contracts](execution-contracts.md) - Runtime expectations and conventions for OAT skills.
- [Docs Workflows](docs-workflows.md) - How the docs CLI helpers and docs skills work together.

## Lifecycle skills

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
- `oat-project-plan-writing` — Shared contract for authoring/mutating `plan.md`; defines format invariants, stable task IDs, and resume guardrails (used by multiple lifecycle skills)
- `oat-project-implement`
- `oat-project-subagent-implement`
- `oat-project-progress`
- `oat-project-reconcile` — Maps manual/human commits back to planned tasks and reconciles tracking artifacts after user confirmation; works across all workflow modes
- `oat-project-complete`

## Ideas skills

- `oat-idea-new`
- `oat-idea-ideate`
- `oat-idea-scratchpad`
- `oat-idea-summarize`

## Review and PR skills

- `oat-review-provide`
- `oat-review-receive`
- `oat-review-receive-remote`
- `oat-project-review-provide`
- `oat-project-review-receive`
- `oat-project-review-receive-remote`
- `oat-project-pr-progress`
- `oat-project-pr-final`

## Documentation skills

- `oat-project-document` — Reads project artifacts and implementation code, identifies documentation surfaces needing updates, presents a delta plan for approval, and applies changes. Integrates with `oat-project-complete` via `oat_docs_updated` state field.
- `oat-docs-analyze` — Analyze docs structure, coverage, drift, and `index.md` contract conformance
- `oat-docs-apply` — Apply approved, evidence-backed docs recommendations from a docs analysis artifact

## Utility and maintenance skills
- `oat-worktree-bootstrap`
- `oat-worktree-bootstrap-auto`
- `oat-repo-knowledge-index`
- `create-oat-skill`
- `create-agnostic-skill`
- `create-pr-description`
- `create-ticket`
- `update-repo-reference`
- `codex`
- `review-backlog` — Analyze a backlog document to produce value/effort ratings, dependency mapping, and execution recommendations
- `docs-completed-projects-gap-review` — Audit documentation for gaps left by completed OAT projects; produces a prioritized fix plan

## Discovery source

`AGENTS.md` is the host-facing registry and should match skill frontmatter.

## Reference artifacts

- `AGENTS.md`
- `.agents/skills/*/SKILL.md`
- `.oat/repo/reference/backlog.md` (naming and skill-family roadmap)
