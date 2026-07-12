---
oat_status: complete
oat_ready_for: oat-project-summary
oat_blockers: []
oat_last_updated: 2026-07-12
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Retrospective Implementation Plan: Dispatch Subagent Abstraction

> Historical record only. The user explicitly chose direct skill authoring
> with Claude review instead of `oat-project-implement`; this plan was
> backfilled after implementation commit `bb3a942a` landed.

**Goal:** Separate reusable provider-neutral OAT subagent dispatch from
project lifecycle policy so analytical skills can fan out bounded work without
importing project phase, task, gate, commit, or worktree semantics.

**Architecture:** `oat-dispatch-subagents` owns generic selection, launch,
evidence, and recovery. `oat-project-dispatch-subagents` resolves project
lifecycle context and translates it into the generic dispatch contract.

**Tech Stack:** Agent Skills Markdown, provider-specific reference files,
OAT CLI skill distribution, pnpm workspace release validation.

**Implementation Commit:** `bb3a942a7f0a79c6d60e1786b38673bba46a519c`

## Execution Note

This task breakdown describes the work that actually shipped. It is not
represented as a pre-execution plan and must not be passed to
`oat-project-implement`.

## Phase 1: Dispatch Contracts

### Task p01-t01: Create the reusable dispatch engine

**Files:**

- Create: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Create: `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`
- Create: `.agents/skills/oat-dispatch-subagents/references/provider-codex.md`
- Create: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Create: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`

**Delivered behavior:**

- Defines provider-neutral dispatch inputs, capability states, candidate
  selection, launch acceptance, continuation, and fail-closed recovery.
- Adds generic role classes including economical read-only reconnaissance and
  homogeneous recon-wave evidence.
- Loads exactly one provider reference after provider resolution.
- Preserves exact route/model/effort/authority evidence without importing
  project lifecycle state.

**Verification:**

- `pnpm oat:validate-skills`
- Claude architectural and implementation review

### Task p01-t02: Add the OAT project lifecycle adapter

**Files:**

- Create: `.agents/skills/oat-project-dispatch-subagents/SKILL.md`

**Delivered behavior:**

- Resolves active project, phase/task scope, dispatch policy, gates, write
  boundaries, and project-specific role semantics.
- Composes with `oat-dispatch-subagents` instead of duplicating provider
  catalogs, selection, launch, or recovery logic.
- Fails closed with installation guidance when the utility-pack engine is
  unavailable.

**Verification:**

- Static boundary review against the lightweight design
- Claude implementation review with no remaining Critical or Important findings

## Phase 2: Distribution and Adoption Readiness

### Task p02-t01: Register, bundle, and expose the skills

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `.oat/sync/manifest.json`
- Create: `.claude/skills/oat-dispatch-subagents`
- Create: `.claude/skills/oat-project-dispatch-subagents`
- Create: `.cursor/skills/oat-dispatch-subagents`
- Create: `.cursor/skills/oat-project-dispatch-subagents`
- Modify: five public package manifests and bundled version metadata

**Delivered behavior:**

- Places the generic engine in the utility pack and the project adapter in the
  workflows pack.
- Bundles both skills into CLI assets and synchronizes Claude/Cursor provider
  views.
- Applies the required lockstep public-package bump to `0.1.53`.

**Verification:**

- `pnpm run cli -- sync --scope all`
- `pnpm release:validate`

### Task p02-t02: Prepare the improve consumer and finalize review evidence

**Files:**

- Modify: `.agents/skills/oat-repo-improve/SKILL.md`
- Modify: `.oat/projects/shared/dispatch-subagents-abstraction/discovery.md`
- Modify: `.oat/projects/shared/dispatch-subagents-abstraction/design.md`

**Delivered behavior:**

- Adds OAT-compatible metadata and progress conventions to the preliminary
  improve skill without performing the substantive improve redesign.
- Records pack ownership, source provenance, cross-worktree drift handling,
  missing-engine behavior, and provider filename safety.
- Incorporates Claude's review findings before the implementation commit.

**Verification:**

- `git diff --check`
- `pnpm oat:validate-skills` — 56 OAT skills validated
- `pnpm release:validate` — five public packages validated

## Reviews

| Scope  | Type     | Status | Date       | Artifact                                              |
| ------ | -------- | ------ | ---------- | ----------------------------------------------------- |
| design | artifact | passed | 2026-07-12 | Live Claude/Codex collaboration review                |
| final  | code     | passed | 2026-07-12 | Claude session `35331219-1cd2-4997-a032-68f5c33f701b` |

## Implementation Complete

- Phase 1: 2 tasks — reusable engine and project adapter
- Phase 2: 2 tasks — distribution, validation, and adoption readiness
- Total: 4 retrospective tasks, shipped in `bb3a942a`

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Implementation: `implementation.md`
