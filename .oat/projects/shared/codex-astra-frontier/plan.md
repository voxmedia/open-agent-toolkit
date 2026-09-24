---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-24
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: codex-astra-frontier

**Goal:** Ship a separate Codex Frontier recommendation of Sol xhigh, Astra high,
and Astra xhigh, with exact supported agent variants and an honest vault-guidance
comparison.

**Architecture:** Extend the Codex supported model/effort catalog, then update
the bundled ordered recommendation and its human guidance. Rebuild the CLI
bundle and project-scoped Codex agent projections from the canonical sources.

**Tech stack:** TypeScript ESM, Vitest, JSON recommendation asset, TOML agent
projections, Markdown guidance, pnpm workspace.

## Planning Checklist

- [x] Discovery synthesized from the conversation and validated by the CLI.
- [x] Source and generated ownership identified; accepted vault policy kept
      distinct from review-pending research.
- [x] Phase dependencies and write sets evaluated.
- [x] No parallel phase group; no additional cross-runtime phase review gate.
- HiLL implementation checkpoints are resolved at implementation entry.

## Parallelism

The one phase is sequential. Catalog support must exist before the recommended
candidates can validate. Agent projections and bundle output depend on the
final catalog and recommendation. There is no independent, file-disjoint phase
boundary worth a worktree merge.

## Phase 1: Codex Astra Frontier

### Task p01-t01: Admit Astra to the Codex supported catalog

**Files:** `packages/cli/src/providers/codex/codec/shared.ts`, catalog and
resolver tests under `packages/cli/src/providers/codex/codec/` and
`packages/cli/src/commands/project/dispatch-ceiling/`.

1. Add verified Astra low, medium, high, xhigh, and max catalog pairs; keep Sol
   max supported and ultra unsupported. Test exact generated variant names and
   lower preferred efforts beneath an Astra xhigh Frontier ceiling.
2. Format changed source and tests with `pnpm exec oxfmt --write <changed paths>`.
3. Verify with `pnpm --filter @open-agent-toolkit/cli exec vitest run
src/providers/codex/codec/catalog.test.ts
src/commands/project/dispatch-ceiling/index.test.ts`.
4. Commit as `feat(p01-t01): support Codex Astra effort variants`.

### Task p01-t02: Update the Frontier recommendation and guidance

**Files:** `packages/cli/config/dispatch-matrix-recommendation.json`,
recommendation/config tests, `.agents/skills/oat-project-plan-writing/SKILL.md`,
`.agents/skills/subagent-orchestration/` references and entrypoint,
`apps/oat-docs/docs/` model-guidance and dispatch-ceiling pages.

1. Set Codex Frontier order to Sol xhigh, Astra high, Astra xhigh and bump the
   recommendation version. Test exact adoption output and Frontier resolution;
   preserve explicitly configured Sol max cells and other provider ladders.
2. Align the copied planning table and Codex guidance. State that Astra's
   task advantage remains unmeasured locally and its Frontier inclusion is a
   user-directed preference, not vault-policy acceptance. Bump each changed
   canonical skill version once.
3. Format changed files with `pnpm exec oxfmt --write <changed paths>`.
   Verify with `pnpm --filter @open-agent-toolkit/cli exec vitest run
src/commands/config/index.test.ts
src/commands/project/dispatch-ceiling/index.test.ts
src/validation/autonomy-gate-inventory.test.ts` and
   `pnpm oat:validate-skills`. Assert both the bundled candidate order and
   preservation of a populated user-owned Frontier cell.
4. Commit as `feat(p01-t02): recommend Astra in Codex Frontier`.

### Task p01-t03: Regenerate projections and validate the release

**Files:** Generated `packages/cli/assets/config/` recommendation,
`.codex/agents/` Astra roles, `.codex/config.toml`, five public package
manifests and `pnpm-lock.yaml`.

1. Bump the five lockstep publishable package versions. Run `pnpm build`,
   `pnpm run cli -- sync --scope project --json`, then
   `pnpm run cli -- sync --scope project --dry-run --json`; require zero planned
   operations on the dry run.
2. Verify exact Astra model and effort in both role types. Run
   `pnpm --filter @open-agent-toolkit/cli exec vitest run
src/providers/codex/codec/sync-extension.test.ts
src/commands/init/tools/shared/bundle-consistency.test.ts
src/commands/config/index.test.ts`.
3. Run required gates in repository order: `pnpm check`, `pnpm type-check`,
   `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, fetch `origin/main`,
   `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`;
   also run `pnpm lint` and `pnpm format` for skill changes. Record exits and
   cache replay honestly.
4. Commit as `chore(p01-t03): bundle Astra agents and release versions`.

### Task p01-t04: Record the model-guidance alignment audit

**Files:** `implementation.md` final summary and the follow-up PR body.

1. Compare all current Codex, Claude, and Cursor bundled tiers and dated
   task-class guidance with the accepted September 8 model-selection matrix,
   its durable qualification rules and changelog, and the September 23 packet's
   explicit review-pending status. Identify exact model/effort disagreements,
   intentional user-directed changes, unverified harness selectors, and
   accepted versus draft policy boundaries. Do not copy private vault paths or
   unpublished benchmark details into the public PR.
2. Record a concise findings table in `implementation.md` and the PR body,
   with a detailed source-aware explanation in the user-facing final response.
   Classify each difference as intentional, pending evidence, or a separate
   follow-up; make no unrelated ladder change in this PR.
3. Verify the summary contains Codex, Claude, and Cursor rows plus the
   accepted/draft distinction with `rg -n 'Codex|Claude|Cursor|accepted|draft'
.oat/projects/shared/codex-astra-frontier/implementation.md`, and inspect
   the exact PR body with `gh pr view --json body --jq .body` after creation.
4. Format the project artifact with `pnpm exec oxfmt --write
.oat/projects/shared/codex-astra-frontier/implementation.md`. Commit as
   `docs(p01-t04): record model-guidance audit`.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| p01    | code     | pending         | -          | -                                                           | -             | -          | -                        |
| final  | code     | pending         | -          | -                                                           | -             | -          | -                        |
| spec   | artifact | pending         | -          | -                                                           | -             | -          | -                        |
| design | artifact | pending         | -          | -                                                           | -             | -          | -                        |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T144531Z.md | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | received        | 2026-09-24 | reviews/artifact-plan-review-2026-09-24T145158Z.md          | -             | -          | -                        |

## Implementation Complete

- Phase 1: 4 tasks — Codex support, recommendation/guidance, generated
  outputs and validation, model-guidance audit.
- Total: 4 tasks.

## References

- Discovery: `discovery.md`.
- Official Astra model documentation and the local Codex model catalog are the
  capability sources; the separately maintained vault is a dated policy
  comparison, not a catalog source.
