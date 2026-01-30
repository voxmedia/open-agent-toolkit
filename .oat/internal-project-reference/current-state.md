# OAT Current State (This Repo)

This document is a birdseye view of where OAT is *right now* in `open-agent-toolkit`: what exists, where it lives, how to run it, and what’s next.

**Last Updated:** 2026-01-29

## Canonical References

- Roadmap: `.oat/internal-project-reference/roadmap.md`
- Deferred phases: `.oat/internal-project-reference/deferred-phases.md`
- Implementation deep-dive: `.oat/internal-project-reference/dogfood-workflow-implementation.md`
- Backlog: `.oat/internal-project-reference/backlog.md`
- Decision record: `.oat/internal-project-reference/decision-record.md`
- Workflow user feedback (dogfood log): `.oat/internal-project-reference/temp/workflow-user-feedback.md`
- Review loop proposal: `.agent/projects/workflow-research/analysis/subagents/refined-subagent-proposal.md`
- Past artifacts (archival): `.oat/internal-project-reference/past-artifacts/`

## What’s Implemented

### Workflow Skills (Dogfood)

- Knowledge + routing:
  - `oat-index` (thin-first index + enrichment)
  - `oat-progress` (router / status)
- Artifact generation:
  - `oat-discovery` -> `oat-spec` -> `oat-design` -> `oat-plan` -> `oat-implement`
- Review loop:
  - `oat-request-review`
  - `oat-receive-review`
  - Reviewer prompt: `.agent/agents/oat-reviewer.md`
- PR skills:
  - `oat-pr-progress`
  - `oat-pr-project`

### Templates / Scripts

- Templates: `.oat/templates/`
  - `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `project-index.md`
- Scripted thin index generation: `.oat/scripts/generate-thin-index.sh`

### State + Conventions

- Local active project pointer:
  - `.oat/active-project` (single line; path to the active project directory)
  - All `oat-*` skills attempt to resolve the project from this file first (fallback: prompt + write).
  - Gitignored via `.gitignore`.
- User-facing progress indicators:
  - Key `oat-*` skills include guidance to print a phase banner plus a few short step indicators (GSD-style reassurance) during multi-step “finalize/commit” work.
- Stable task IDs:
  - Plan tasks use `pNN-tNN` (e.g., `p01-t03`)
  - Agent commit convention uses Conventional Commit scope: `feat(p01-t03): ...`
- Plan review tracking:
  - `plan.md` has a `## Reviews` table with status progression documented:
    - `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Canonical Paths (Where Things Live)

- Skills: `.agent/skills/<skill-name>/SKILL.md`
- Subagent prompts: `.agent/agents/*.md`
- Templates: `.oat/templates/*.md`
- Knowledge: `.oat/knowledge/repo/*.md`
- Project artifacts (current dogfood layout): `.oat/projects/shared/<project>/` (configurable via `.oat/projects-root`)

## Quickstart (Dogfood)

1. Generate repo knowledge:
   - `/oat:index`
2. Start a project:
   - `/oat:discovery`
   - This creates `{PROJECTS_ROOT}/<project>/...` artifacts (from `.oat/projects-root`) and writes `.oat/active-project`.
3. Move through phases (or run router anytime):
   - `/oat:progress`
   - `/oat:spec`
   - `/oat:design`
   - `/oat:plan`
   - `/oat:implement`
4. Final review loop (required before PR):
   - `/oat:request-review code final`
   - `/oat:receive-review`
   - `/oat:implement` (executes new fix tasks, if any)
   - Repeat until `final` review is `passed` (3-cycle cap per scope)
5. PR description generation:
   - `/oat:pr-progress pNN` (optional progress PR)
   - `/oat:pr-project` (final PR)

## Known Gaps / Next Steps

- PR automation enhancements:
  - PR opening automation beyond best-effort `gh pr create` guidance (optional; not required for v1 dogfood)
- Repo-level dashboard:
  - `.oat/state.md` summary view (active project + phase + blockers + knowledge freshness) (not yet implemented)
- Multi-project model:
  - `.oat/projects/**` and `oat project ...` switching (in progress; dogfood now uses `.oat/projects/shared` as the default projects root)
- Parallel execution + reconciliation:
  - Worktrees/subagents executing tasks in parallel and reconciling back into canonical artifacts (deferred)

## Notes / Caveats

- `.oat/projects-root` sets the default projects root (tracked). Default: `.oat/projects/shared` (checked in).
- `.oat/projects/local/**` and `.oat/projects/archived/**` are gitignored (local-only).
- Legacy `.agent/projects/**` is still gitignored in this repo by default; older dogfood artifacts may exist there locally.
- `.oat/active-project` is local-only (gitignored). It won’t exist until you run a skill that creates/selects a project.
