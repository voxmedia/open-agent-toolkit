---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-27
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # final phase only (from workflow.hillCheckpointDefault)
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # sequential; see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: cli-help-flag-coverage

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make CLI help honest about flags: surface the true global options (`--json`/`--verbose`/`--cwd`) on every subcommand, demote `--scope` to a per-command option on the commands that consume it, fix the broken `oat providers set` default, and make `--json` output symmetric across the five offending commands.

**Architecture:** Commander.js v12 program. Global options live on the root program (`packages/cli/src/app/create-program.ts`); commands register via `registerCommands` (`packages/cli/src/commands/index.ts`, 89/99 via `.addCommand()`); context is built from `command.optsWithGlobals()` via `readGlobalOptions` (`packages/cli/src/commands/shared/shared.utils.ts`).

**Tech Stack:** TypeScript ESM, commander 12.1.0, vitest, oxlint/oxfmt.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `fix(p01-t01): show global options in subcommand help`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (pause after each phase)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phase 1 (visibility + scope demotion) and Phase 2 (`--json` contract) are write-disjoint: Phase 1 touches `create-program.ts`, `commands/index.ts`, a new `withScopeOption` helper, and the scope-consuming command registrations (`sync`, `status`, `doctor`, `init`/`tools`/`providers`/`remove`); Phase 2 touches non-consumer handlers (`project/validate-plan`, `project/split/*`, `repo/pr-comments/*`). They could run in parallel worktrees.

**Chosen: sequential.** Both phases regenerate inline help snapshots in the shared `packages/cli/src/commands/help-snapshots.test.ts`, and the Phase 3 version bump + `release:validate` must follow both. The size is small enough that the worktree/merge overhead outweighs the wall-clock gain. Phase 3 is strictly sequential after 1 and 2.

---

## Phase 1: Global-flag visibility + `--scope` demotion

Resolves audit findings P1-1, P1-2, P1-3, P0-1.

### Task p01-t01: Surface true globals; remove `--scope` from globals

**Files:**

- Modify: `packages/cli/src/app/create-program.ts`
- Modify: `packages/cli/src/commands/index.ts` (apply help config recursively after registration)
- Create: `packages/cli/src/app/help-config.ts` (recursive `applyHelpConfiguration`) — dedicated module keeps `shared.utils.ts` focused on context/options

**Step 1: Write test (RED)**

Add a test asserting that a leaf subcommand's `helpInformation()` contains a `Global Options:` section listing `--json`, `--verbose`, `--cwd`, and does NOT list `--scope` as a global. (Extend `packages/cli/src/commands/help-snapshots.test.ts` or `packages/cli/src/app/create-program.test.ts`.)

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`
Expected: Test fails (RED).

**Step 2: Implement (GREEN)**

- Remove the `--scope` `addOption` from `createProgram()`, leaving `--json`, `--verbose`, `--cwd` as globals.
- Add `program.configureHelp({ showGlobalOptions: true })`.
- Add a recursive `applyHelpConfiguration(command)` that walks `command.commands` and sets `configureHelp({ showGlobalOptions: true })` on each (because `.addCommand()` does not inherit help config). Call it once at the end of `registerCommands(program)`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`
Expected: Global Options section appears on subcommands (GREEN). Update inline snapshots intentionally.

**Step 3: Refactor**

Keep the global option list and the recursive walk in one obvious place; document why the recursive apply is needed (addCommand non-inheritance).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): show global options on every subcommand; drop --scope from globals"
```

---

### Task p01-t02: Add `withScopeOption` helper; apply to scope consumers

**Files:**

- Create: `packages/cli/src/commands/shared/scope-option.ts` (`withScopeOption(cmd): Command`)
- Modify: registrations for consumers — `sync`, `status`, `doctor`, `init` (+ `init tools` ideas/docs/workflows/utility/research/brainstorm), `tools list/outdated/info/update/remove` + `tools install`, `providers list/inspect/set`, `remove skill/skills`.

**Step 1: Write test (RED)**

Test that `oat sync --help` and `oat providers set --help` include `--scope <scope>` (choices project|user|all) as a LOCAL option, while `oat config set --help`, `oat init tools core --help`, and `oat instructions sync --help` do NOT include `--scope`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`
Expected: Fails (RED).

**Step 2: Implement (GREEN)**

- `withScopeOption` adds `new Option('--scope <scope>', 'Limit execution scope').choices(['project','user','all']).default('all')`.
- Apply only to the consumer commands listed above. Do NOT apply to the `core` or `project-management` pack registrations — this exclusion covers both the `init tools <pack>` and `tools install <pack>` entry paths, which share pack registrations — nor to `instructions validate`/`sync` (they hardcode scope — P1-3).
- No change needed to `buildCommandContext`/`readGlobalOptions`: `optsWithGlobals()` already surfaces a per-command `--scope` into `context.scope`. Confirm non-consumers default to `'all'`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`
Expected: GREEN.

**Step 3: Refactor**

None needed — registration-only change.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors; existing scope-driven command tests still pass.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t02): demote --scope to a per-command option on scope consumers"
```

---

### Task p01-t03: Fix `oat providers set` broken default (P0-1)

**Files:**

- Modify: `packages/cli/src/commands/providers/set/index.ts`

**Step 1: Write test (RED)**

Test that invoking `providers set` with `--enabled <provider>` and the default scope (no explicit `--scope`) succeeds against the project scope rather than throwing the "Re-run with --scope project" error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/providers`
Expected: Fails (RED).

**Step 2: Implement (GREEN)**

- Make `providers set` operate project-scoped by default (since it only supports `project`): either default its local `--scope` to `project`, or treat the default `all` as `project` for this command. Keep an explicit non-project `--scope` rejected with a clear, accurate message that now references the documented local flag.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/providers`
Expected: GREEN.

**Step 3: Refactor**

None needed — localized handler change.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t03): make oat providers set work on its default invocation"
```

---

## Phase 2: `--json` contract pass

Resolves audit findings P1-4 … P1-8. Principle: emit JSON iff `--json`; otherwise route human output through `context.logger`.

### Task p02-t01: `project validate-plan` + `project split run` honor `--json`

**Files:**

- Modify: `packages/cli/src/commands/project/validate-plan/index.ts`
- Modify: `packages/cli/src/commands/project/split/run.ts`

**Step 1: Write test (RED)**

Tests asserting both commands emit a structured JSON payload on stdout when `--json` is set (currently they never do).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project`
Expected: Fails (RED).

**Step 2: Implement (GREEN)**

Add a `context.json` branch that emits the result as JSON; keep logger output for the human path.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project`
Expected: GREEN.

**Step 3: Refactor**

None needed — adds a JSON branch alongside existing logger output.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t01): emit JSON from project validate-plan and split run under --json"
```

---

### Task p02-t02: Gate `project split evaluate-signals` + `split validate-plan` JSON on `--json`

**Files:**

- Modify: `packages/cli/src/commands/project/split/evaluate-signals.ts`
- Modify: `packages/cli/src/commands/project/split/validate-plan.ts`

**Step 1: Write test (RED)**

Tests asserting these commands emit JSON ONLY when `--json` is set, and a human-readable summary otherwise (currently they always emit raw JSON via unconditional `logger.json()`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split`
Expected: Fails (RED).

**Step 2: Implement (GREEN)**

Branch on `context.json`; add a logger-based human summary for the non-JSON path.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split`
Expected: GREEN.

**Step 3: Refactor**

None needed — adds a `context.json` branch plus a human summary path.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t02): gate split evaluate-signals/validate-plan JSON output on --json"
```

---

### Task p02-t03: `repo pr-comments triage-collection` non-interactive/JSON path

**Files:**

- Modify: `packages/cli/src/commands/repo/pr-comments/triage-collection/triage-comments.ts`
- Modify (if registration wiring changes): `packages/cli/src/commands/repo/pr-comments/triage-collection/index.ts`

**Step 1: Write test (RED)**

Test that `triage-collection --json` produces a JSON result in a non-interactive context instead of throwing "Triage requires an interactive terminal."

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/repo`
Expected: Fails (RED).

**Step 2: Implement (GREEN)**

Provide a non-interactive code path: when `--json`/non-TTY, emit the collection's triage state as JSON (and route any summary through the logger, not `process.stderr.write`). Reserve the interactive prompt flow for TTY sessions only.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/repo`
Expected: GREEN.

**Step 3: Refactor**

None needed — gates existing output behind interactivity/`--json`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t03): add non-interactive/JSON path to triage-collection"
```

---

## Phase 3: Release bookkeeping

### Task p03-t01: Lockstep version bump + release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (and any changeset/release metadata the repo uses).

**Step 1: Implement**

Bump all five lockstep public packages together (shipped CLI functionality changed). Follow the repo's existing release/changeset convention (mirror the most recent `chore(release): bump public packages` commit).

**Step 2: Verify**

Run: `pnpm release:validate`
Expected: Passes.

Run: `pnpm test && pnpm lint && pnpm type-check`
Expected: No errors.

**Step 3: Commit**

```bash
git commit -m "chore(p03-t01): bump public packages for CLI help/flag changes"
```

---

## Reviews

| Scope | Type     | Status  | Date       | Artifact                                            |
| ----- | -------- | ------- | ---------- | --------------------------------------------------- |
| plan  | artifact | passed  | 2026-06-27 | reviews/archived/artifact-plan-review-2026-06-27.md |
| p01   | code     | passed  | 2026-06-27 | in-memory (structured; verdict pass, 1 Med/3 Min)   |
| p02   | code     | passed  | 2026-06-27 | in-memory (structured; verdict pass, 1 Med/3 Min)   |
| final | code     | pending | -          | -                                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — global-flag visibility, `--scope` demotion, `providers set` fix
- Phase 2: 3 tasks — `--json` contract pass across 5 commands
- Phase 3: 1 task — lockstep version bump + release validation

**Total: 7 tasks**

Ready for code review and merge.

---

## References

- Audit: `references/audit.md` (P0–P3 prioritized findings + per-command matrix)
- Discovery: `discovery.md`
- Globals: `packages/cli/src/app/create-program.ts`
- Registration: `packages/cli/src/commands/index.ts`
- Context wiring: `packages/cli/src/commands/shared/shared.utils.ts`, `packages/cli/src/app/command-context.ts`
- Help snapshots: `packages/cli/src/commands/help-snapshots.test.ts`
