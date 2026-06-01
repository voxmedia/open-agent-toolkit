---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-31
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # pause after final implementation phase (from workflow.hillCheckpointDefault=final)
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # fully sequential — see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: archive-cli-updates

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Split the archive command surface so the pull lives at `oat repo archive sync` and the push becomes a real `oat project archive` command backed by the already-tested `archiveProjectOnCompletion()`, keep `oat project archive sync` as a deprecated shim, and rewrite `oat-project-complete` Step 8 to call the new command instead of ~150 lines of inline bash.

**Architecture:** Thin commander command handlers delegate to a shared sync runner module (extracted from today's `project/archive/index.ts`) and to the existing `archive-utils.ts` push helper. New `oat repo archive` namespace under the existing `oat repo` command; `oat project archive` gains a bare push action plus a deprecated `sync` alias.

**Tech Stack:** TypeScript ESM, commander, vitest. CLI package `@open-agent-toolkit/cli`.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — e.g. `refactor(p01-t01): extract archive sync runner`

## Planning Checklist

- [x] Configured HiLL checkpoints from workflow default (pause after p06)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

The plan is **fully sequential** (`oat_plan_parallel_groups: []`). Reasoning:

- **Shared write set.** Phases 1–3 all edit `packages/cli/src/commands/project/archive/index.ts` and its sibling modules; concurrent worktrees would conflict on the same files.
- **Behavioral dependency.** Phase 2 (`oat project archive` push) and Phase 3 (deprecated `sync` shim) depend on the shared sync runner extracted in Phase 1. Phase 5 (skill Step 8 rewrite) depends on the `oat project archive` command existing (Phase 2). Phase 4 (error strings/docs) and Phase 6 (version bumps) depend on the final command names being settled.
- No phase is file-disjoint with independent verification, so declaring parallel groups would only create merge conflicts.

---

## Phase 1: Shared sync runner + `oat repo archive sync`

Relocate the pull to its scope-correct home without changing behavior. Extract the sync engine so both the new `repo archive sync` and the later deprecated `project archive sync` shim share one implementation.

### Task p01-t01: Extract archive sync runner into a shared module

**Files:**

- Create: `packages/cli/src/commands/project/archive/sync-runner.ts`
- Create: `packages/cli/src/commands/project/archive/sync-runner.test.ts`
- Modify: `packages/cli/src/commands/project/archive/index.ts` (import the extracted runner instead of inline definitions)

Extract the sync internals currently inline in `index.ts` — `ArchiveSyncOptions`, `resolveSyncAwsEnv`, `buildArchiveSyncArgs`, `runArchiveSync`, `ArchiveSnapshotEntry`, `listArchiveSnapshots`, `compareSnapshotEntries`, `selectLatestSnapshots`, `readLocalSnapshotName`, `syncArchiveSnapshot`, `resolveLocalArchiveRoot`, and a single `runArchiveSyncCommand(deps, projectName, options, context)` orchestrator that holds the current `.action()` body (config read, `s3Uri` guard, access preflight, target selection, JSON/text output, exit codes). Keep the `ProjectArchiveCommandDependencies` shape exported for reuse.

**Step 1: Write test (RED)**

```typescript
// sync-runner.test.ts — assert the orchestrator behavior currently covered by index.test.ts
// moves intact: latest-per-project selection, --force requires project name, missing s3Uri error,
// dry-run output, skip-when-current, JSON contract shape, exit codes.
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/sync-runner.test.ts`
Expected: Test fails (RED) — module/exports not present yet.

**Step 2: Implement (GREEN)**

Move the logic out of `index.ts` into `sync-runner.ts`; have `index.ts` import and call `runArchiveSyncCommand`. No behavior change.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/sync-runner.test.ts src/commands/project/archive/index.test.ts`
Expected: Both pass (GREEN) — existing `index.test.ts` still green against the delegating command.

**Step 3: Refactor**

Ensure imports follow `./` + alias policy (no `../`, `src/`, `@/*`). Keep handler thin.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/
git commit -m "refactor(p01-t01): extract archive sync runner into shared module"
```

---

### Task p01-t02: Add `oat repo archive sync` command

**Files:**

- Create: `packages/cli/src/commands/repo/archive/index.ts`
- Create: `packages/cli/src/commands/repo/archive/index.test.ts`
- Modify: `packages/cli/src/commands/repo/index.ts` (register `createRepoArchiveCommand()`)

Build `createRepoArchiveCommand()` returning an `archive` namespace with a `sync [project-name]` subcommand whose `.action()` delegates to `runArchiveSyncCommand` from `project/archive/sync-runner.ts`. Carry over every option: `--dry-run`, `--force`, `--profile`, `--region`, and the same JSON/text output + exit semantics.

**Step 1: Write test (RED)**

```typescript
// index.test.ts — `oat repo archive sync` parses options, forwards to the runner,
// emits the same JSON contract, and enforces `--force requires project name`.
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/repo/archive/index.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement the command + register it in `repo/index.ts`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/repo/archive/index.test.ts`
Expected: Pass (GREEN).

**Step 3: Refactor**

Confirm `oat repo --help` lists `archive` and `oat repo archive --help` lists `sync`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors; full CLI suite green.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/repo/
git commit -m "feat(p01-t02): add oat repo archive sync command"
```

---

## Phase 2: `oat project archive` push command

Give the orphaned `archiveProjectOnCompletion()` its first real caller.

### Task p02-t01: Add `oat project archive` push action

**Files:**

- Create: `packages/cli/src/commands/project/archive/push-runner.ts`
- Create: `packages/cli/src/commands/project/archive/push-runner.test.ts`
- Modify: `packages/cli/src/commands/project/archive/index.ts` (attach a bare `.action()` push to the `archive` command)

Add a bare action on `oat project archive [project-path]` that:

- Resolves the target project path from the arg, falling back to `activeProject` config when omitted.
- Reads `archive.*` config and builds `ArchiveProjectOnCompletionOptions` (s3Uri, s3SyncOnComplete, summaryExportPath, awsProfile/awsRegion, projectsRoot, projectName).
- Calls `archiveProjectOnCompletion()` and reports `archivePath`, `s3Path`, `summaryExportFile`, and warnings (text + JSON contract).
- Supports `--dry-run` (preview the resolved archive target + S3 destination without copying/removing/syncing — guard the mutating calls).
- **No `--yes`.** Preserves the worktree-durability behavior already inside `archiveProjectOnCompletion` (`resolveArchiveRepoRoot`/`resolvePrimaryRepoRoot`); surfaces the local-only warning when the primary-repo archive path is unavailable.
- Honors `archive.s3SyncOnComplete` exactly as today (no S3 push unless configured).

**Step 1: Write test (RED)**

```typescript
// push-runner.test.ts — injected deps: archive runs, reports archivePath; --dry-run mutates nothing;
// S3 push skipped when s3SyncOnComplete=false; project-path arg vs activeProject fallback; JSON contract.
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/push-runner.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

Implement `push-runner.ts` and wire the bare action in `index.ts`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/`
Expected: Pass (GREEN).

**Step 3: Refactor**

Keep the handler thin; all logic in `push-runner.ts` + `archive-utils.ts`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/
git commit -m "feat(p02-t01): add oat project archive push command"
```

---

## Phase 3: Deprecated `oat project archive sync` shim

### Task p03-t01: Deprecated `sync` alias + help pointer

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts`

Re-add a `sync` subcommand under `oat project archive` that: prints a deprecation notice to stderr (`oat project archive sync is deprecated; use oat repo archive sync`), then delegates to the same `runArchiveSyncCommand` so behavior is identical. Add `addHelpText('after', …)` on the `archive` command noting the relocated pull. The notice must not corrupt the `--json` contract (route the warning so JSON stdout stays parseable).

**Step 1: Write test (RED)**

```typescript
// index.test.ts — `oat project archive sync` still forwards correctly AND emits the deprecation notice;
// --json stdout remains valid JSON (notice on stderr).
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts`
Expected: New assertions fail (RED).

**Step 2: Implement (GREEN)**

Add the deprecated subcommand + help text.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts`
Expected: Pass (GREEN).

**Step 3: Refactor**

Manually confirm: `oat project archive` (push), `oat project archive sync` (deprecated→forwards), `oat repo archive sync` (canonical) all behave.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Full CLI suite green.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/
git commit -m "feat(p03-t01): add deprecated oat project archive sync shim"
```

> **Milestone:** all three command surfaces now exist before touching skill/docs/versions. The configured HiLL checkpoint is after Phase 6.

---

## Phase 4: Error strings + docs alignment

### Task p04-t01: Update error strings and docs references

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts` (sync error strings at the AWS-CLI-missing / not-configured branches — currently reference `oat project archive sync`)
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts` (if it asserts those strings)
- Modify: docs under `apps/oat-docs/docs/**` that reference `oat project archive sync`
- Regenerate: `apps/oat-docs/index.md` via `oat docs generate-index` (do not hand-edit)

Update the two sync-mode error messages to reference `oat repo archive sync`. Grep docs for `oat project archive` and update pull references to the new command (note the deprecated alias where helpful).

**Step 1: Locate references**

Run: `grep -rn "oat project archive sync" packages/cli/src apps/oat-docs/docs`
Expected: Enumerated hit list to update.

**Step 2: Implement**

Update strings + docs; then:

Run: `pnpm run cli -- docs generate-index`
Expected: `apps/oat-docs/index.md` regenerated.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts apps/oat-docs
git commit -m "docs(p04-t01): point archive pull references at oat repo archive sync"
```

---

## Phase 5: Rewrite `oat-project-complete` Step 8 + skill version bump

### Task p05-t01: Replace inline archive bash with `oat project archive`

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md` (Step 8 body + `version:` frontmatter bump from 1.4.8)

Replace the ~150-line inline archive bash (the `ARCHIVED_ROOT`/`git check-ignore`/`mv`/manual `aws s3 sync` block and the "Canonical helper behaviors" / "AWS credential handling" / "Worktree durability guard" prose that duplicate `archive-utils.ts`) with a single `oat project archive "$PROJECT_PATH"` invocation. Keep the skill-level concerns the command does **not** own: ordering (archive after PR-description generation, before commit+push), `IS_SHARED_PROJECT`/`SHOULD_ARCHIVE` gating, the post-archive `PROJECT_PATH` reassignment for Step 10/11.5, and surfacing the command's reported S3 profile/region in the Step 12 summary. Bump `version:`.

**Step 1: Edit skill**

Rewrite Step 8; update step-indicator counts only if they change; bump `version:`.

**Step 2: Verify**

Run: `pnpm run cli -- sync --scope all` (refresh provider skill views) then `grep -n "oat project archive" .agents/skills/oat-project-complete/SKILL.md`
Expected: Step 8 invokes the command; no leftover inline `aws s3 sync`/`mv "$PROJECT_PATH"` archive block; `version:` incremented.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .claude .cursor .codex .oat/sync 2>/dev/null
git commit -m "feat(p05-t01): rewrite oat-project-complete Step 8 to call oat project archive"
```

---

## Phase 6: Lockstep version bumps + release validation

### Task p06-t01: Bump public packages and validate release

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`

Bump all five public package versions together (same semver step) per the AGENTS.md lockstep guardrail — required because shipped CLI functionality and bundled skill/docs assets changed.

**Step 1: Bump versions**

Apply the matching version bump across the five `package.json` files.

**Step 2: Verify (full gates)**

Run: `pnpm build && pnpm test && pnpm lint && pnpm type-check && pnpm release:validate`
Expected: All pass. `release:validate` is the definition-of-done gate for publishable-package changes.

**Step 3: Commit**

```bash
git add packages/*/package.json
git commit -m "chore(p06-t01): lockstep version bump for archive CLI changes"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status  | Date       | Artifact                                            |
| ------ | -------- | ------- | ---------- | --------------------------------------------------- |
| p01    | code     | passed  | 2026-06-01 | reviews/p01-review-2026-06-01.md                    |
| p02    | code     | passed  | 2026-06-01 | reviews/p02-review-2026-06-01-v2.md                 |
| p03    | code     | passed  | 2026-06-01 | reviews/p03-review-2026-06-01.md                    |
| p04    | code     | passed  | 2026-06-01 | reviews/p04-review-2026-06-01.md                    |
| p05    | code     | passed  | 2026-06-01 | reviews/p05-review-2026-06-01.md                    |
| p06    | code     | passed  | 2026-06-01 | reviews/p06-review-2026-06-01.md                    |
| final  | code     | pending | -          | -                                                   |
| plan   | artifact | passed  | 2026-06-01 | reviews/archived/artifact-plan-review-2026-06-01.md |
| spec   | artifact | pending | -          | -                                                   |
| design | artifact | pending | -          | -                                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — extract sync runner + `oat repo archive sync`
- Phase 2: 1 task — `oat project archive` push command
- Phase 3: 1 task — deprecated `oat project archive sync` shim
- Phase 4: 1 task — error strings + docs alignment
- Phase 5: 1 task — rewrite completion Step 8 + skill version bump
- Phase 6: 1 task — lockstep version bump + release validation

**Total: 7 tasks**

All implementation tasks are complete. The project is at the final code review checkpoint before merge.

---

## References

- Design: N/A (quick mode — architecture captured in `discovery.md`)
- Spec: N/A (quick mode)
- Discovery: `discovery.md`
- Key code: `packages/cli/src/commands/project/archive/index.ts`, `…/archive/archive-utils.ts`, `packages/cli/src/commands/repo/index.ts`
- Skill: `.agents/skills/oat-project-complete/SKILL.md` (Step 8)
