---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-31
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03']
oat_auto_review_at_checkpoints: true
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .oat/repo/reference/external-plans/archive-sync-closeout-config-2026-03-31.md
oat_import_provider: codex
oat_generated: false
---

# Implementation Plan: archive-sync-closeout-config

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with review gates after major phases.

**Goal:** Add optional S3-backed archive sync, automatic closeout summary behaviors, summary export, and first-class config discoverability without breaking the current local-only archive workflow.

**Architecture:** Keep closeout behavior CLI-owned instead of skill-owned. Extend shared config and project commands, add reusable archive/S3 preflight helpers, then update lifecycle skills and docs to delegate to the canonical CLI surface.

**Tech Stack:** TypeScript, Commander, Vitest, OAT skill assets, OAT docs markdown.

**Commit Convention:** `{type}({scope}): {description}` - e.g. `feat(p02-t01): add archive sync command`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Archive Config And Helper Foundations

### Task p01-t01: Extend config schema and command support for archive settings

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Add failing tests covering:

- archive config normalization in `.oat/config.json`
- `oat config get/set` support for `archive.s3Uri`
- `oat config get/set` support for `archive.s3SyncOnComplete`
- `oat config get/set` support for `archive.summaryExportPath`
- regression coverage for any documented-but-missing config key support needed by the later config catalog work, including `git.defaultBranch`

Run: `pnpm --filter @tkstang/oat-cli test -- src/config/oat-config.test.ts src/commands/config/index.test.ts`
Expected: New archive-config assertions fail before implementation.

**Step 2: Implement (GREEN)**

Update OAT config types, normalization, and config-command key handling so the archive settings are first-class shared config values. Wire `git.defaultBranch` into the `ConfigKey` type, `KEY_ORDER`, `getConfigValue`, and `setConfigValue` in `packages/cli/src/commands/config/index.ts` so the later config catalog reflects actual supported keys.

**Step 3: Refactor**

Extract any repeated config-key metadata or normalization helpers that will be reused by `oat config describe`.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/config/oat-config.test.ts src/commands/config/index.test.ts`
Expected: Archive config tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t01): add archive config keys"
```

---

### Task p01-t02: Build reusable archive and AWS preflight helpers

**Files:**

- Create: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Create: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

Add failing tests for helper behavior covering:

- repo-scoped S3 archive path resolution
- local archive path resolution
- warning generation when archive sync is enabled but `aws` is missing
- warning/error generation when `aws` exists but the configured credentials/profile cannot be used

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/archive-utils.test.ts`
Expected: Tests fail because helper modules and contracts do not exist yet.

**Step 2: Implement (GREEN)**

Create reusable archive helpers that own:

- archive path resolution
- AWS CLI presence checks
- AWS CLI usability checks
- user-facing warning/error shaping for completion vs explicit sync commands

**Step 3: Refactor**

Keep preflight logic separate from command wiring so the helper can be reused by both completion and archive-sync commands.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/archive-utils.test.ts`
Expected: Archive helper tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p01-t02): add archive preflight helpers"
```

---

## Phase 2: Archive Sync And Closeout Automation

### Task p02-t01: Add `oat project archive sync [project-name]`

**Files:**

- Create: `packages/cli/src/commands/project/archive/index.ts`
- Create: `packages/cli/src/commands/project/archive/index.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

Add failing tests for:

- syncing all archived projects when no project name is provided
- syncing one archived project when a positional project name is provided
- dry-run output
- default skip/update behavior when local and remote copies both exist
- preserving unrelated local-only archives without deleting them during sync
- `--force` replacing a named local archive from remote
- failure when AWS CLI is missing
- failure when AWS CLI is present but unusable

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/index.test.ts`
Expected: Tests fail before the command exists.

**Step 2: Implement (GREEN)**

Implement `oat project archive sync [project-name]` with:

- no-arg full sync
- positional single-project sync
- `--dry-run`
- `--force`
- non-destructive `aws s3 sync` default behavior
- fail-fast behavior for explicit sync commands when AWS preflight fails

**Step 3: Refactor**

Consolidate shell invocation and result formatting so sync output is deterministic in text and JSON modes.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/index.test.ts`
Expected: Archive sync command tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.ts packages/cli/src/commands/project/archive/index.test.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p02-t01): add archive sync command"
```

---

### Task p02-t02: Move project completion archival into CLI-owned helpers

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.oat/repo/reference/backlog/items/project-complete-cli-helper.md`

**Step 1: Write test (RED)**

Add failing helper/contract tests covering:

- local archive copy always succeeding
- S3 upload on completion when `archive.s3SyncOnComplete=true` and `archive.s3Uri` is configured
- S3 upload skipped when `archive.s3SyncOnComplete` is false
- S3 upload skipped when `archive.s3Uri` is not configured
- summary export copy when `archive.summaryExportPath` is configured
- summary export skipped when `archive.summaryExportPath` is not configured
- warning-tolerant completion when S3 is enabled but AWS CLI is missing or unusable

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/archive-utils.test.ts`
Expected: Completion-specific archive assertions fail before helper expansion.

**Step 2: Implement (GREEN)**

Expand the CLI-owned archive helper to own completion-time archive side effects and update the completion skill contract to delegate to that CLI behavior instead of hardcoding archive/S3 logic. Update `.oat/repo/reference/backlog/items/project-complete-cli-helper.md` to reflect that the helper backlog item is addressed by this implementation.

**Step 3: Refactor**

Keep explicit command failures and completion warnings on separate code paths while sharing the same preflight checks.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/archive-utils.test.ts`
Expected: Completion archive helper tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts .agents/skills/oat-project-complete/SKILL.md .oat/repo/reference/backlog/items/project-complete-cli-helper.md
git commit -m "feat(p02-t02): delegate completion archive behavior"
```

---

### Task p02-t03: Auto-refresh summary during PR-final and completion flows

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `apps/oat-docs/docs/guide/workflow/pr-flow.md`
- Modify: `apps/oat-docs/docs/guide/workflow/lifecycle.md`

**Step 1: Write test (RED)**

Add failing contract/docs tests covering:

- `oat-project-pr-final` ensuring summary generation when missing or stale
- `oat-project-complete` ensuring summary generation instead of prompting
- updated closeout wording for summary and archive behavior

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Contract assertions fail before the skill/docs updates land.

**Step 2: Implement (GREEN)**

Update the lifecycle skill contracts and docs so summary generation is automatic during PR-final and completion, with warnings only when summary generation itself fails.

- In `oat-project-complete/SKILL.md` Step 3.5, replace the user prompt with automatic summary generation or refresh.
- In `oat-project-pr-final/SKILL.md` Step 3.0, ensure stale summaries are regenerated automatically without prompting.

**Step 3: Refactor**

Align docs and skill wording so the lifecycle description matches the new automatic behavior exactly.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Skill contract tests pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts apps/oat-docs/docs/guide/workflow/pr-flow.md apps/oat-docs/docs/guide/workflow/lifecycle.md
git commit -m "feat(p02-t03): automate closeout summary refresh"
```

---

## Phase 3: Config Discoverability And Documentation

### Task p03-t01: Add `oat config describe [key]`

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts`

**Step 1: Write test (RED)**

Add failing tests for:

- grouped config catalog output when no key is provided
- key-specific detail output
- coverage for shared repo config, local repo config, user config, and sync config surfaces
- metadata fields for scope, file location, type, default, mutability, and owning command

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/config/index.test.ts`
Expected: Describe-command assertions fail before implementation.

**Step 2: Implement (GREEN)**

Implement `oat config describe [key]` as the CLI discovery surface for supported config, reusing metadata structures introduced in earlier config tasks.

**Step 3: Refactor**

Centralize config metadata so `get`, `set`, `list`, and `describe` do not drift from each other.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/config/index.test.ts`
Expected: Config describe tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts packages/cli/src/config/oat-config.ts
git commit -m "feat(p03-t01): add config describe command"
```

---

### Task p03-t02: Update docs, help text, and reference material

**Files:**

- Modify: `apps/oat-docs/docs/guide/cli-reference.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/docs/reference/file-locations.md`
- Add or modify: config reference material under `apps/oat-docs/docs/guide/`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Add failing docs/help snapshot coverage for:

- config discovery guidance pointing to `oat config describe`
- archive config keys and warning semantics
- archive sync command naming and usage

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/help-snapshots.test.ts`
Expected: Snapshot or reference assertions fail before docs/help updates.

**Step 2: Implement (GREEN)**

Update docs and CLI reference surfaces so the new archive and config behaviors are documented in one consistent model.

**Step 3: Refactor**

Remove duplicated or outdated wording where config ownership or archive behavior is now documented elsewhere.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/help-snapshots.test.ts && pnpm build:docs`
Expected: Help snapshots pass and docs build succeeds.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs packages/cli/src/commands/help-snapshots.test.ts
git commit -m "docs(p03-t02): document archive sync and config discovery"
```

---

## Phase 4: Review Fixes

### Task p04-t01: (review) Add `--force` guard regression coverage

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.test.ts`

**Step 1: Understand the issue**

Review finding: The `--force` validation guard for `oat project archive sync` has no regression coverage.
Location: `packages/cli/src/commands/project/archive/index.ts:160`

**Step 2: Implement fix**

Add a command test that invokes `oat project archive sync --force` without a project name and asserts the expected user-facing error message plus exit code `1`.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/index.test.ts`
Expected: The new guard-coverage assertion passes.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.test.ts
git commit -m "fix(p04-t01): cover archive force guard"
```

---

### Task p04-t02: (review) Add missing archive URI regression coverage

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.test.ts`

**Step 1: Understand the issue**

Review finding: The fail-fast error path when `archive.s3Uri` is unset is not tested.
Location: `packages/cli/src/commands/project/archive/index.ts:172`

**Step 2: Implement fix**

Add a command test with shared config that omits `archive.s3Uri`, then assert the expected config error text and exit code `1`.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/index.test.ts`
Expected: The missing-config regression test passes.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.test.ts
git commit -m "fix(p04-t02): cover missing archive uri guard"
```

---

### Task p04-t03: (review) Deduplicate archive exec helper types

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/index.ts`

**Step 1: Understand the issue**

Review finding: `ExecFileLike` and `ExecFileResult` are duplicated across archive command files.
Location: `packages/cli/src/commands/project/archive/archive-utils.ts:17-26`, `packages/cli/src/commands/project/archive/index.ts:23-31`

**Step 2: Implement fix**

Export the shared exec helper types from `archive-utils.ts` and import them into `index.ts` so the archive command surface and helper layer use one canonical contract.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/index.test.ts`
Expected: Archive helper and command tests pass with the shared type contract.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/index.ts
git commit -m "fix(p04-t03): share archive exec helper types"
```

---

### Task p04-t04: (review) Normalize local archive root path semantics

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts`

**Step 1: Understand the issue**

Review finding: Local archive root resolution mixes platform `join` with `posix` helpers used elsewhere in archive path construction.
Location: `packages/cli/src/commands/project/archive/index.ts:74-76`

**Step 2: Implement fix**

Normalize local archive root resolution so the archive command uses consistent path semantics with the shared archive helpers, or document the rationale directly in code if the filesystem-specific path remains intentional.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/index.test.ts`
Expected: Archive sync tests continue to pass with the normalized path behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.ts packages/cli/src/commands/project/archive/index.test.ts
git commit -m "fix(p04-t04): normalize archive root path handling"
```

---

### Task p04-t05: (review) Add JSON coverage for config describe

**Files:**

- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Understand the issue**

Review finding: `oat config describe` has a JSON output path but no test coverage.
Location: `packages/cli/src/commands/config/index.test.ts`

**Step 2: Implement fix**

Add a JSON-mode test that exercises `oat config describe` and asserts the structured payload for the grouped or key-specific response.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/config/index.test.ts`
Expected: Config command tests pass with JSON describe coverage.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.test.ts
git commit -m "fix(p04-t05): cover config describe json output"
```

---

### Task p04-t06: (review) Add JSON coverage for archive sync

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.test.ts`

**Step 1: Understand the issue**

Review finding: `oat project archive sync` supports JSON output but no test covers that response shape.
Location: `packages/cli/src/commands/project/archive/index.test.ts`

**Step 2: Implement fix**

Add a JSON-mode archive sync test that asserts the emitted payload includes status, mode, source, target, and project context.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/project/archive/index.test.ts`
Expected: Archive sync tests pass with JSON output coverage.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.test.ts
git commit -m "fix(p04-t06): cover archive sync json output"
```

---

### Task p04-t07: (review) Add wildcard provider key describe coverage

**Files:**

- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Understand the issue**

Review finding: Wildcard provider key resolution in `matchesCatalogKey` is never exercised with a concrete provider key.
Location: `packages/cli/src/commands/config/index.test.ts`

**Step 2: Implement fix**

Add a describe test that uses a concrete key like `sync.providers.github.enabled` and asserts that it resolves to the wildcard provider catalog entry.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- src/commands/config/index.test.ts`
Expected: Config describe tests pass with wildcard provider coverage.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.test.ts
git commit -m "fix(p04-t07): cover wildcard provider describe"
```

---

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                            |
| ----- | -------- | --------------- | ---------- | --------------------------------------------------- |
| p01   | code     | pending         | -          | -                                                   |
| p02   | code     | pending         | -          | -                                                   |
| p03   | code     | pending         | -          | -                                                   |
| final | code     | passed          | 2026-03-31 | reviews/final-review-2026-03-31-v2.md               |
| plan  | artifact | fixes_completed | 2026-03-31 | reviews/archived/artifact-plan-review-2026-03-31.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - add archive config keys and reusable archive/AWS preflight helpers
- Phase 2: 3 tasks - add archive sync command and automate completion/summary closeout behavior
- Phase 3: 2 tasks - add config discovery command and update docs/help surfaces
- Phase 4: 7 tasks - address final review follow-up coverage and maintainability findings

**Total: 14 tasks**

Ready for implementation via `oat-project-implement`.

---

## References

- Imported Source: `references/imported-plan.md`
- Source Plan Path: `.oat/repo/reference/external-plans/archive-sync-closeout-config-2026-03-31.md`
- Design: `design.md` (optional in import mode)
- Spec: `spec.md` (optional in import mode)
- Discovery: `discovery.md` (optional in import mode)
