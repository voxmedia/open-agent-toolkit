---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-24
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p01']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
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
2. Format source and tests with
   `pnpm exec oxfmt --write packages/cli/src/providers/codex/codec/shared.ts packages/cli/src/providers/codex/codec/catalog.test.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`.
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
3. Format hand-edited files with
   `pnpm exec oxfmt --write packages/cli/config/dispatch-matrix-recommendation.json packages/cli/src/commands/config/index.test.ts .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/subagent-orchestration/SKILL.md .agents/skills/subagent-orchestration/references/provider-codex.md .agents/skills/subagent-orchestration/references/evidence-and-refresh.md apps/oat-docs/docs/contributing/updating-model-guidance.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`.
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
2. Format the five hand-edited manifests with
   `pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json`.
   Refresh `pnpm-lock.yaml` with `pnpm install --lockfile-only`; the generated
   TOML and CLI asset are formatted by their generators and controlled by the
   zero-operation sync check. Verify exact Astra model and effort in both role
   types. Run
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
3. Run this task-local table validator against the completed artifact:

   ```bash
   node <<'NODE'
   const fs = require('node:fs');
   const file = '.oat/projects/shared/codex-astra-frontier/implementation.md';
   const source = fs.readFileSync(file, 'utf8');
   const section = source.split(/^## Model Guidance Audit\s*$/m)[1]?.split(/^## /m)[0];
   if (!section) throw new Error('missing Model Guidance Audit section');
   const lines = section.split('\n').filter((line) => /^\|/.test(line.trim()));
   const cells = (line) => line.trim().slice(1, -1).split('|').map((value) => value.trim());
   const rows = lines.map(cells).filter((row) => !row.every((cell) => /^[-: ]+$/.test(cell)));
   const headers = rows.shift()?.map((header) => header.toLowerCase());
   const names = ['provider', 'oat route', 'accepted route', 'source status', 'classification'];
   const indexes = names.map((name) => headers?.indexOf(name) ?? -1);
   if (indexes.some((index) => index < 0)) throw new Error('missing required audit column');
   const seen = new Set();
   for (const row of rows) {
     const [provider, oat, accepted, status, classification] = indexes.map((index) => row[index]);
     if (!provider || !oat || !accepted || !status || !classification) throw new Error(`empty audit cell: ${row}`);
     if (!['Codex', 'Claude', 'Cursor'].includes(provider)) throw new Error(`unknown provider: ${provider}`);
     if (!/accepted|review-pending/.test(status)) throw new Error(`invalid source status: ${status}`);
     if (!['intentional', 'pending evidence', 'separate follow-up'].includes(classification)) throw new Error(`invalid classification: ${classification}`);
     seen.add(provider);
   }
   for (const provider of ['Codex', 'Claude', 'Cursor']) if (!seen.has(provider)) throw new Error(`missing provider: ${provider}`);
   NODE
   ```

4. Format the project artifact with `pnpm exec oxfmt --write
.oat/projects/shared/codex-astra-frontier/implementation.md`. Commit as
   `docs(p01-t04): record model-guidance audit`. The final PR handoff copies
   the public-safe audit summary into the PR body and verifies it with
   `gh pr view --json body --jq .body`; that PR does not exist during this task.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target           |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------- |
| p01    | code     | fixes_completed | 2026-09-24 | reviews/archived/p01-review-2026-09-24T155712Z.md           | 4440e2cb22b81693dc7016e432ae51383af8098a | manual     | -                     |
| final  | code     | passed          | 2026-09-24 | reviews/archived/final-review-2026-09-24T161719Z.md         | a0120f35150245d623748c0d2c55db71e11f66fd | manual     | -                     |
| final  | code     | passed          | 2026-09-24 | reviews/archived/final-review-2026-09-24T162937Z.md         | 066c5868658a500b5aa1949966ada5f0336f8d75 | gate       | cursor-fable-5-1-high |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                     |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T144531Z.md | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T145158Z.md | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T150001Z.md | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-24 | reviews/archived/artifact-plan-review-2026-09-24T150841Z.md | -                                        | -          | -                     |

The fourth plan artifact gate exited successfully with two Medium residuals:
concrete per-task format commands and a runnable audit-table validator. Both
were added before implementation; this is a fixes-completed disposition, not a
clean-review claim.

## Implementation Complete

- Phase 1: 4 tasks — Codex support, recommendation/guidance, generated
  outputs and validation, model-guidance audit.
- Total: 4 tasks.

## References

- Discovery: `discovery.md`.
- Official Astra model documentation and the local Codex model catalog are the
  capability sources; the separately maintained vault is a dated policy
  comparison, not a catalog source.
