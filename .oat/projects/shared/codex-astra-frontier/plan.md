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

1. **Before editing**, record capability evidence in `implementation.md`: the
   official `https://developers.openai.com/api/docs/models/gpt-6-astra` lists
   exact ID `gpt-6-astra` and low, medium, high, xhigh, max; run
   `jq -r '.fetched_at, .client_version, (.models[] | select(.slug == "gpt-6-astra") | .slug, (.supported_reasoning_levels[].effort))' ~/.codex/models_cache.json`
   and retain its observed timestamp, client version, ID, and effort list.
   Require both sources to agree on every admitted pair; absent or conflicting
   evidence blocks catalog admission. The cache also lists ultra, which this
   project excludes by explicit user decision and the published five-level
   contract. Then add Astra low, medium, high, xhigh, and max; keep Sol max
   supported. Test exact generated variant names and lower preferred efforts
   beneath an Astra xhigh Frontier ceiling. Self-authored tests verify the
   implementation, not provider capability.
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
2. Before changing docs, compare the existing `updating-model-guidance.md`
   and `dispatch-ceiling.md` against the project artifacts and implemented
   catalog/recommendation, and record the exact evidence-backed content delta
   in `implementation.md`. The user requested this model-guidance update and
   review; confine substantive docs content to that approved scope, and obtain
   user approval before any additional substantive content. Align the copied
   planning table and Codex guidance. State that Astra's
   task advantage remains unmeasured locally and its Frontier inclusion is a
   user-directed preference, not vault-policy acceptance. Bump each changed
   canonical skill version once. This updates existing pages, so compare
   their authored `## Contents` links before and after and keep navigation
   stable; `oat docs nav sync` is MkDocs-only and does not apply to this
   Fumadocs app. Regenerate its derived navigation/index with
   `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.
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

**Files:** `implementation.md` model-guidance audit and final summary.

1. Resolve the private policy evidence from the user's Model Selection vault
   README using these stable note titles: `Model Selection`, `Model Decision
Matrix`, `CHANGELOG`, and `September Frontier Releases Early Pass/README`.
   Compare each current Codex, Claude, and Cursor bundled tier and dated
   task-class reference with the September 8 accepted matrix and the September
   23 review-pending packet. Identify model/effort disagreements, unverified
   harness selectors, and accepted versus draft policy boundaries. Do not copy
   private absolute paths or unpublished benchmark details into this PR.
2. Record a `## Model Guidance Audit` table in `implementation.md` with a
   distinct row per provider, exact OAT and accepted routes, a source-status
   column, and a classification of intentional, pending evidence, or separate
   follow-up. Explain the requested Astra Frontier exception and the scope of
   any unverified route. Make no unrelated ladder change in this PR.
3. Parse the Markdown table in a one-off inline check. Require exactly one or
   more rows for each of Codex, Claude, and Cursor; for every such row, split on
   `|`, reject empty OAT route, accepted route, source status, or classification
   cells, and require source status to name `accepted` or `review-pending` and
   classification to be `intentional`, `pending evidence`, or `separate
follow-up`. Fail on a missing provider or malformed row. Run this check
   against the completed artifact; it is a task-local check, not a reusable
   script.
4. Format the project artifact with `pnpm exec oxfmt --write
.oat/projects/shared/codex-astra-frontier/implementation.md`. Commit as
   `docs(p01-t04): record model-guidance audit`. The final PR handoff copies
   the public-safe audit summary into the PR body and verifies it with
   `gh pr view --json body --jq .body`; that PR does not exist during this task.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending         | -          | -                                                           | -             | -          | -           |
| final  | code     | pending         | -          | -                                                           | -             | -          | -           |
| spec   | artifact | pending         | -          | -                                                           | -             | -          | -           |
| design | artifact | pending         | -          | -                                                           | -             | -          | -           |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T144531Z.md | -             | -          | -           |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T145158Z.md | -             | -          | -           |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T150001Z.md | -             | -          | -           |
| plan   | artifact | received        | 2026-09-24 | reviews/artifact-plan-review-2026-09-24T150841Z.md          | -             | -          | -           |

## Implementation Complete

- Phase 1: 4 tasks — Codex support, recommendation/guidance, generated
  outputs and validation, model-guidance audit.
- Total: 4 tasks.

## References

- Discovery: `discovery.md`.
- Official Astra model documentation and the local Codex model catalog are the
  capability sources; the separately maintained vault is a dated policy
  comparison, not a catalog source.
