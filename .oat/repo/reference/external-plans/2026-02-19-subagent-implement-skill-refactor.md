# Plan: Subagent Implementation Skill Refactor

## Context

The subagent orchestration workflow has three problems:

1. **Naming**: `oat-subagent-orchestrate` breaks the `oat-project-*` lifecycle convention
2. **Dead indirection**: `oat-execution-mode-select` was never wired into plan skills — it's a bridge to nowhere
3. **No mode-aware redirect**: `oat-project-implement` doesn't check execution mode, so users must remember which skill to invoke

The fix: rename the orchestration skill to `oat-project-subagent-implement`, delete the mode selector, add a CLI command to set mode, and make `oat-project-implement` mode-aware: when mode is `subagent-driven`, it redirects users to `oat-project-subagent-implement` and stops.

## Phase 1: Core Rename + Deletion (skill files only)

### p01-t01: Rename skill directory

```bash
git mv .agents/skills/oat-subagent-orchestrate .agents/skills/oat-project-subagent-implement
```

Verify old directory gone, new directory has SKILL.md + scripts/ + examples/ + tests/.

### p01-t02: Update `oat-project-subagent-implement/SKILL.md`

- **Frontmatter**: `name: oat-project-subagent-implement`, `user-invocable: true`
- **Add Step 0** (before current Step 1): Resolve active project + persist `oat_execution_mode: subagent-driven`; ensure orchestration policy defaults are written only when missing (never overwrite existing `oat_orchestration_*` values)
- **Remove** prerequisite line about execution mode being pre-set
- **Remove** the `oat-execution-mode-select` row from the relationship table
- **Replace** all remaining `oat-subagent-orchestrate` self-references → `oat-project-subagent-implement`
- **Remove** all `oat-execution-mode-select` references

Files: `.agents/skills/oat-project-subagent-implement/SKILL.md`

### p01-t03: Update script comment headers

Change line 2 comment in each from `oat-subagent-orchestrate` → `oat-project-subagent-implement`:
- `.agents/skills/oat-project-subagent-implement/scripts/dispatch.sh`
- `.agents/skills/oat-project-subagent-implement/scripts/reconcile.sh`
- `.agents/skills/oat-project-subagent-implement/scripts/review-gate.sh`

### p01-t04: Delete `oat-execution-mode-select` + stale test

```bash
git rm -r .agents/skills/oat-execution-mode-select
git rm .agents/skills/oat-project-subagent-implement/tests/test-mode-selector.sh
```

### p01-t05: Update cross-references in helper skills

- `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md` — change `oat-subagent-orchestrate` → `oat-project-subagent-implement` (line ~180)

### p01-t06: Update templates

- `.oat/templates/implementation.md` — change `oat-subagent-orchestrate` → `oat-project-subagent-implement` (line ~104)
- `.oat/templates/plan.md` — update intro text to mention both `oat-project-implement` and `oat-project-subagent-implement` (line ~20)

**Verify**: `grep -r 'oat-subagent-orchestrate' .agents/ .oat/templates/` returns 0 results; `grep -r 'oat-execution-mode-select' .agents/ .oat/templates/` returns 0 results.

## Phase 2: Mode-Aware Redirect in `oat-project-implement`

### p02-t01: Add execution mode guard to `oat-project-implement/SKILL.md`

Add a new **Step 0.5** (after project resolution, before plan validation) that reads `oat_execution_mode` from `state.md`:

```
If oat_execution_mode == subagent-driven:
  Tell user: "Execution mode is subagent-driven. Use oat-project-subagent-implement instead."
  STOP (do not proceed with sequential execution)
```

This is a simple guard+redirect clause — no complex logic and no automatic skill invocation.

File: `.agents/skills/oat-project-implement/SKILL.md`

### p02-t02: Update plan skills routing guidance

Each plan skill's "next step" output gets updated to present both options:

```
Next: Choose your implementation approach:
- oat-project-implement — Sequential task execution (default)
- oat-project-subagent-implement — Parallel worktree execution with autonomous review gates
```

Files:
- `.agents/skills/oat-project-plan/SKILL.md` (Step 16: Output Summary)
- `.agents/skills/oat-project-quick-start/SKILL.md` (Step 7: Output Next Action)
- `.agents/skills/oat-project-import-plan/SKILL.md` (Step 7: Output Next Action)

### p02-t03: Update `oat-project-progress/SKILL.md` routing matrix

- All three mode routing matrices (full/quick/import): when `oat_execution_mode: subagent-driven`, route to `oat-project-subagent-implement` instead of `oat-project-implement`
- Add execution mode check note after routing matrices
- Add `oat-project-subagent-implement` to the Available Skills list

File: `.agents/skills/oat-project-progress/SKILL.md`

### p02-t04: Update `oat-project-plan-writing/SKILL.md` contract

- Add note that `oat_execution_mode` in `state.md` controls runtime redirect behavior
- Keep `oat_ready_for` canonical (`oat-project-implement`); do not broaden it to include `oat-project-subagent-implement`

File: `.agents/skills/oat-project-plan-writing/SKILL.md`

## Phase 3: CLI Command + Tests

### p03-t01: Create `oat project set-mode` CLI command

New file: `packages/cli/src/commands/project/set-mode/index.ts`

Pattern follows `providers/set/index.ts`:
- Argument: `<mode>` (required, choices: `single-thread`, `subagent-driven`)
- Reads active project from `.oat/active-project`
- Resolves `state.md` path in the active project
- Uses existing `getFrontmatterBlock`/`getFrontmatterField` from `@commands/shared/frontmatter`
- Reads current `oat_execution_mode`, updates it (or inserts if missing)
- When setting `subagent-driven`, also persists orchestration policy defaults if absent:
  - `oat_orchestration_merge_strategy: merge`
  - `oat_orchestration_retry_limit: 2`
  - `oat_orchestration_baseline_policy: strict`
  - `oat_orchestration_unit_granularity: phase`
- JSON and text output modes
- Exit codes: 0 success, 1 error

Existing utilities to reuse:
- `@commands/shared/frontmatter.ts` — `getFrontmatterBlock`, `getFrontmatterField`, `parseFrontmatterField`
- `@fs/paths.ts` — `resolveProjectRoot`
- `@app/command-context.ts` — `buildCommandContext`
- `@commands/shared/shared.utils.ts` — `readGlobalOptions`

### p03-t02: Register command in project/index.ts

Update `packages/cli/src/commands/project/index.ts` to import and `.addCommand()` the new command.

### p03-t03: Write tests for `oat project set-mode`

New file: `packages/cli/src/commands/project/set-mode/index.test.ts`

Test cases:
- Sets `oat_execution_mode` when field doesn't exist
- Updates `oat_execution_mode` when field already exists
- Rejects invalid mode values
- Persists orchestration policy defaults when setting `subagent-driven`
- Does not overwrite existing orchestration policy values
- Errors when no active project
- Errors when state.md missing
- JSON output mode

### p03-t04: Update help snapshot tests

File: `packages/cli/src/commands/help-snapshots.test.ts` — add snapshot for `project set-mode`.

## Phase 4: Documentation + Sync

### p04-t01: Update `docs/oat/skills/index.md`

- Add `oat-project-subagent-implement` to Lifecycle skills (after `oat-project-implement`)
- Add `oat-worktree-bootstrap-auto` to Internal/utility skills if not listed

### p04-t02: Update `docs/oat/quickstart.md`

- All three workflow lanes: show both `oat-project-implement` (sequential) and `oat-project-subagent-implement` (parallel) at the implementation step

### p04-t03: Update `docs/oat/workflow/lifecycle.md`

- Add "Implementation modes" section explaining sequential vs parallel
- Update all lane diagrams to show both options at the implement step

### p04-t04: Update `.agents/README.md`

- Add mention of `oat-project-subagent-implement` in the Subagents section (lines 38-42), noting that subagent-driven implementation is available as an alternative to sequential execution
- Brief note: "For parallel implementation using subagent orchestration, see `oat-project-subagent-implement`."

File: `.agents/README.md`

### p04-t05: Update `docs/oat/cli/index.md` and `docs/oat/cli/provider-interop/commands.md`

- Add `oat project set-mode` to the CLI commands reference

### p04-t06: Run sync + full verification

```bash
pnpm run cli -- sync --scope all --apply
pnpm run cli -- internal validate-oat-skills
pnpm test && pnpm lint && pnpm type-check && pnpm build
```

Verify:
- `grep -r 'oat-subagent-orchestrate' .agents/ .oat/templates/ docs/` → 0 results
- `grep -r 'oat-execution-mode-select' .agents/ .oat/templates/ docs/` → 0 results
- All tests pass
- Sync clean

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| P1 | 6 | Core rename + deletion |
| P2 | 4 | Mode-aware redirect in implement + plan skills |
| P3 | 4 | CLI command `oat project set-mode` + tests |
| P4 | 6 | Documentation + README + sync |
| **Total** | **20** | |

Key design decisions:
- `oat_ready_for` in plan.md stays as `oat-project-implement` (the default consumer)
- `oat-project-implement` checks `oat_execution_mode` and emits a deterministic redirect to `oat-project-subagent-implement` when mode is `subagent-driven`
- CLI command `oat project set-mode <mode>` persists the choice; once set, `oat-project-implement` consistently enforces redirect behavior
- `oat-worktree-bootstrap-auto` unchanged except one reference update
