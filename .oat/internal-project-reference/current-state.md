# OAT Current State (This Repo)

This document is a birdseye view of where OAT is *right now* in `open-agent-toolkit`: what exists, where it lives, how to run it, and what’s next.

**Last Updated:** 2026-01-29

## Canonical References

- Roadmap: `.oat/internal-project-reference/roadmap.md`
- Deferred phases: `.oat/internal-project-reference/deferred-phases.md`
- Implementation deep-dive: `.oat/internal-project-reference/dogfood-workflow-implementation.md`
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

### Templates / Scripts

- Templates: `.oat/templates/`
  - `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `project-index.md`
- Scripted thin index generation: `.oat/scripts/generate-thin-index.sh`

### State + Conventions

- Local active project pointer:
  - `.oat/active-project` (single line; path to the active project directory)
  - All `oat-*` skills attempt to resolve the project from this file first (fallback: prompt + write).
  - Gitignored via `.gitignore`.
- Stable task IDs:
  - Plan tasks use `pNN-tNN` (e.g., `p01-t03`)
  - Agent commit convention uses Conventional Commit scope: `feat(p01-t03): ...`
- Plan review tracking:
  - `plan.md` has a `## Reviews` table with status progression documented:
    - `pending` → `received` → `fixes_added` | `passed`

## Canonical Paths (Where Things Live)

- Skills: `.agent/skills/<skill-name>/SKILL.md`
- Subagent prompts: `.agent/agents/*.md`
- Templates: `.oat/templates/*.md`
- Knowledge: `.oat/knowledge/repo/*.md`
- Project artifacts (current dogfood layout): `.agent/projects/<project>/`

## Quickstart (Dogfood)

1. Generate repo knowledge:
   - `/oat:index`
2. Start a project:
   - `/oat:discovery`
   - This creates `.agent/projects/<project>/...` artifacts and writes `.oat/active-project`.
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

## Known Gaps / Next Steps

- PR automation:
  - `oat-pr-progress` (phase/progress PRs) (not yet implemented)
  - `oat-pr-project` (final PR into main) (not yet implemented)
- Repo-level dashboard:
  - `.oat/state.md` summary view (active project + phase + blockers + knowledge freshness) (not yet implemented)
- Multi-project model:
  - `.oat/projects/**` and `oat project ...` switching (deferred; current dogfood uses `.agent/projects/`)
- Parallel execution + reconciliation:
  - Worktrees/subagents executing tasks in parallel and reconciling back into canonical artifacts (deferred)

## Notes / Caveats

- `.agent/projects/**` is gitignored in this repo by default. That means project artifacts (including review artifacts under `reviews/`) are local-only unless you change ignore rules or copy artifacts elsewhere.
- `.oat/active-project` is local-only (gitignored). It won’t exist until you run a skill that creates/selects a project.

