---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-16
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["implementation"]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: cli-migrate-b13-b12

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Migrate `validate-oat-skills.ts` (B13) and `new-oat-project.ts` (B12) into first-class CLI commands with parity behavior and test coverage.

**Architecture:** Move script logic into typed, testable modules inside `packages/cli/src`, then expose them through Commander command trees. Keep behavior parity first, then switch skill/package callers to the CLI entrypoints.

**Tech Stack:** TypeScript, Commander, Vitest, Node.js fs/path/process APIs, existing OAT CLI command context and logger.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): extract skills validation core`

## Planning Checklist

- [x] Confirmed HiL checkpoints for quick mode.
- [x] Set `oat_plan_hil_phases` to implementation-only checkpointing.

---

## Phase 1: B13 - Migrate `validate-oat-skills.ts` to CLI

### Task p01-t01: Extract skill validation core to CLI module

**Files:**
- Create: `packages/cli/src/validation/skills.ts`
- Create: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/validation/index.ts`

**Step 1: Write tests for current validator behavior (RED)**

- Add test fixtures for:
  - missing `SKILL.md`
  - missing frontmatter
  - missing frontmatter keys (`disable-model-invocation`, `user-invocable`, `allowed-tools`)
  - missing `## Progress Indicators (User-Facing)`
  - missing banner snippet
  - passing case

Run: `pnpm --filter @oat/cli test src/validation/skills.test.ts`
Expected: failures because implementation is not migrated yet.

**Step 2: Implement pure validation module (GREEN)**

- Port logic from `.oat/scripts/validate-oat-skills.ts` into reusable functions.
- Return structured findings and summary counts (no direct process exit in core module).

Run: `pnpm --filter @oat/cli test src/validation/skills.test.ts`
Expected: pass.

**Step 3: Verify module exports and typing**

Run: `pnpm --filter @oat/cli type-check`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/validation/skills.ts \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/validation/index.ts
git commit -m "feat(p01-t01): extract oat skill validation core"
```

---

### Task p01-t02: Add `oat validate skills` command and wire into CLI

**Files:**
- Create: `packages/cli/src/commands/validate/index.ts`
- Create: `packages/cli/src/commands/validate/skills.ts`
- Create: `packages/cli/src/commands/validate/skills.test.ts`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Add command tests first (RED)**

- Verify command registration for `validate` + `skills` subcommand.
- Verify non-JSON output mirrors current script format and failure messaging.
- Verify exit codes:
  - `0` success
  - `1` validation failures
  - `2` unexpected/runtime error

Run: `pnpm --filter @oat/cli test src/commands/validate/skills.test.ts`
Expected: failures before implementation.

**Step 2: Implement command handlers (GREEN)**

- Build a `validate` command group and `skills` subcommand.
- Resolve repo root from command context `cwd`.
- Call validation core and print findings using existing logger patterns.

Run: `pnpm --filter @oat/cli test src/commands/validate/skills.test.ts`
Expected: pass.

**Step 3: Update command snapshots/integration tests**

Run: `pnpm --filter @oat/cli test src/commands/index.test.ts src/commands/help-snapshots.test.ts src/commands/commands.integration.test.ts`
Expected: pass with updated snapshots.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/validate \
  packages/cli/src/commands/index.ts \
  packages/cli/src/commands/index.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts \
  packages/cli/src/commands/commands.integration.test.ts
git commit -m "feat(p01-t02): add validate skills cli command"
```

---

### Task p01-t03: Switch callers from script to CLI and retire script entrypoint

**Files:**
- Modify: `package.json`
- Modify: `.oat/scripts/validate-oat-skills.ts` (temporary wrapper) or Delete: `.oat/scripts/validate-oat-skills.ts`

**Step 1: Redirect npm script**

- Update `oat:validate-skills` to invoke CLI (`pnpm run cli -- validate skills`).

**Step 2: Retire legacy script path**

- Prefer delete; if needed for compatibility during transition, keep as thin wrapper that delegates to CLI.

**Step 3: Verify both primary and CI-friendly paths**

Run: `pnpm oat:validate-skills`
Expected: same behavior as prior validator and correct exit code propagation.

Run: `pnpm --filter @oat/cli test src/commands/validate/skills.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add package.json .oat/scripts/validate-oat-skills.ts
git commit -m "chore(p01-t03): route skill validation through cli"
```

---

## Phase 2: B12 - Migrate `new-oat-project.ts` to CLI

### Task p02-t01: Extract mode-aware project scaffolding core with parity tests

**Files:**
- Create: `packages/cli/src/commands/project/new/scaffold.ts`
- Create: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Capture current behavior in tests (RED)**

- Test `projects-root` resolution order:
  - `$OAT_PROJECTS_ROOT`
  - `.oat/projects-root`
  - fallback `.oat/projects/shared`
- Test name validation and non-destructive scaffold behavior.
- Test template marker cleanup (`oat_template` keys removed).
- Test pointer update and optional dashboard refresh trigger.
- Add mode-aware scaffold tests:
  - `full` mode generates lifecycle docs (`state`, `discovery`, `spec`, `design`, `plan`, `implementation`).
  - `quick` mode generates only quick workflow docs (`state`, `discovery`, `plan`, `implementation`).
  - `import` mode generates import/minimum docs (`state`, `plan`, `implementation` + references path when needed).
  - no mode generates per-project `project-index.md`.

Run: `pnpm --filter @oat/cli test src/commands/project/new/scaffold.test.ts`
Expected: failures before core implementation.

**Step 2: Implement scaffold core (GREEN)**

- Port logic from `.oat/scripts/new-oat-project.ts` to pure/reusable functions.
- Keep flags and semantics parity:
  - `--force` (non-destructive)
  - `--no-set-active`
  - `--no-dashboard`
- Add explicit scaffold mode selection (`full` default, plus `quick` and `import`) so template creation is mode-specific.

Run: `pnpm --filter @oat/cli test src/commands/project/new/scaffold.test.ts`
Expected: pass.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts \
  packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "feat(p02-t01): extract project scaffold core"
```

---

### Task p02-t02: Add `oat project new <name>` command and register it

**Files:**
- Create: `packages/cli/src/commands/project/index.ts`
- Create: `packages/cli/src/commands/project/new/index.ts`
- Create: `packages/cli/src/commands/project/new/index.test.ts`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Add command registration/help tests first (RED)**

- Verify root includes `project`.
- Verify `project` includes `new`.
- Snapshot `oat project --help` and `oat project new --help`.
- Validate `--mode <full|quick|import>` option is exposed and parsed.

Run: `pnpm --filter @oat/cli test src/commands/index.test.ts src/commands/help-snapshots.test.ts`
Expected: failures before command implementation.

**Step 2: Implement command wiring (GREEN)**

- Wire new command to scaffold core.
- Match existing success output fields (`Created/updated...`, project path, active pointer message).
- Ensure mode option is forwarded to scaffold core and defaults to `full` for backward compatibility.

Run: `pnpm --filter @oat/cli test src/commands/project/new/index.test.ts src/commands/commands.integration.test.ts`
Expected: pass.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project \
  packages/cli/src/commands/index.ts \
  packages/cli/src/commands/index.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts \
  packages/cli/src/commands/commands.integration.test.ts
git commit -m "feat(p02-t02): add project new cli command"
```

---

### Task p02-t03: Update quick-start/new skills to pass mode and retire script caller

**Files:**
- Modify: `.agents/skills/oat-project-new/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.oat/scripts/new-oat-project.ts` (temporary wrapper) or Delete: `.oat/scripts/new-oat-project.ts`

**Step 1: Switch skill commands to CLI**

- Replace script invocations with mode-aware CLI calls:
  - quick-start: `pnpm run cli -- project new "{project-name}" --mode quick`
  - full new project flow: `pnpm run cli -- project new "{project-name}" --mode full`

**Step 2: Retire script path**

- Prefer delete after callers are moved; if temporary compatibility is needed, leave a wrapper with deprecation note.

**Step 3: Verify skill-triggered flow still works**

Run: `pnpm run cli -- project new plan-migration-smoke --no-dashboard`
Expected: project scaffolds correctly and updates active-project pointer.

Run: `bash .oat/scripts/generate-oat-state.sh`
Expected: dashboard regenerates cleanly.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-new/SKILL.md \
  .agents/skills/oat-project-quick-start/SKILL.md \
  .oat/scripts/new-oat-project.ts
git commit -m "chore(p02-t03): migrate project scaffolding callers to cli"
```

---

### Task p02-t04: Remove legacy per-project `project-index.md` scaffolding artifacts

**Files:**
- Delete: `.oat/templates/project-index.md`
- Modify: `.oat/repo/reference/current-state.md`
- Modify: `.oat/projects/shared/**/project-index.md` (shared projects only; keep archived history untouched)

**Step 1: Stop future generation**

- Remove per-project template source so new scaffolds cannot produce project-level `project-index.md`.
- Update docs that describe project templates to remove this artifact from lifecycle scaffolding.

**Step 2: Clean up existing shared project artifacts**

- Enumerate existing files under shared projects and remove `project-index.md` where present.
- Keep `.oat/projects/archived/**` unchanged to avoid rewriting historical artifacts.

Run: `find .oat/projects/shared -name project-index.md -type f`
Expected: no results after cleanup.

**Step 3: Commit**

```bash
git add .oat/templates/project-index.md \
  .oat/repo/reference/current-state.md \
  .oat/projects/shared
git commit -m "chore(p02-t04): remove per-project project-index artifacts"
```

---

### Task p02-t05: Final verification for both migrations

**Files:**
- Modify: `.oat/projects/shared/cli-migrate-b13-b12/implementation.md` (during execution tracking)

**Step 1: Run focused quality gates**

Run: `pnpm --filter @oat/cli test`
Expected: all CLI tests pass.

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: no lint/type errors.

Run: `pnpm oat:validate-skills`
Expected: passes using CLI route.

**Step 2: Run workspace smoke checks**

Run: `pnpm test`
Expected: no regressions in workspace tests.

**Step 3: Commit**

```bash
git add .
git commit -m "chore(p02-t05): verify b13 and b12 cli migrations"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| final | code | pending | - | - |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1 (B13): 3 tasks - migrate skill validation script to CLI and switch callers.
- Phase 2 (B12): 5 tasks - add mode-aware project scaffolding, migrate skill callers, and remove legacy project-index artifacts.

**Total: 8 tasks**

Ready for `oat-project-implement`.

---

## References

- Discovery: `discovery.md`
- Source backlog review: `.oat/repo/reviews/backlog-and-roadmap-review.md`
