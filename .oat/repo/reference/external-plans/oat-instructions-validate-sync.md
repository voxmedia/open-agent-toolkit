# Plan: `oat instructions validate` and `oat instructions sync`

## Context

Every AGENTS.md file in the repo should have a sibling CLAUDE.md containing `@AGENTS.md\n` as a pointer. Today this is manually maintained and has no validation — drift is invisible until an agent reads the wrong instructions. These two CLI commands add automated integrity checks (validate) and repair (sync), following the same dry-run/apply pattern as `oat sync` and `oat cleanup`.

Backlog item: B08 from `.oat/repo/reference/backlog.md`. Rated as a **Wave 1 quick win** in the backlog review (`.oat/repo/reviews/backlog-and-roadmap-review-2026-02-19.md`) — low effort, high daily impact, CI readiness improvement. No dependencies on other backlog items.

## Design Decisions

### Scope: narrow (AGENTS.md → CLAUDE.md only)

The `oat-agent-instructions-analyze` skill already discovers instruction files across all providers (AGENTS.md, `.claude/rules`, `.cursor/rules`, `.github/copilot-instructions`, etc.) via bash scripts in `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh`. The existing `oat sync` command handles syncing canonical files to provider views. This command is scoped narrowly to the AGENTS.md → CLAUDE.md pointer relationship only — other provider instruction files are handled by existing tooling. Clean separation of concerns.

### Naming: `oat instructions` (not `oat context`)

The backlog originally proposed `oat context sync` / `oat context validate`. We chose `oat instructions` because:
- Aligns with the existing `oat-agent-instructions-analyze` / `oat-agent-instructions-apply` skill family naming
- Avoids confusion with `oat sync` (which syncs canonical files to provider views — different scope)
- "Instructions" is more specific than "context" about what's being managed

### Architecture: two separate subcommands (not single command with flags)

Three approaches were considered:
1. **Two subcommands** (`validate` + `sync`) — clean separation, CI-friendly validate, matches existing CLI conventions
2. **Single command with `--fix`** — simpler surface but breaks the existing pattern where scan and mutation are separate commands
3. **Fold into `oat doctor`/`oat sync`** — no new command surface but mixes concerns (`doctor` is environment diagnostics, not file integrity; `sync` is canonical → provider views)

Chose Approach 1: follows the `oat cleanup` pattern (parent command with subcommands), `validate` is immediately useful for CI pipelines.

### Scan scope: recursive with hardcoded exclusions (no config)

Recursively walk the repo, find all AGENTS.md files, check each has a sibling CLAUDE.md. Skip `.git`, `.oat`, `.worktrees` (root only) and `node_modules` (any depth). This matches the exclusion patterns in `resolve-instruction-files.sh`. No configuration needed — the scan is simple and comprehensive.

## Current State of Instruction Files

As of 2026-02-21, the repo has 2 AGENTS.md + 2 CLAUDE.md pairs:

| Location | AGENTS.md | CLAUDE.md | Content |
|---|---|---|---|
| Root (`/`) | Full repo instructions (skills discovery, dev commands, architecture) | `@AGENTS.md\n` (11 bytes) | Valid pointer |
| `packages/cli/` | CLI-specific conventions (test patterns, import policy, exit codes) | `@AGENTS.md\n` (11 bytes) | Valid pointer |

All CLAUDE.md files contain exactly `@AGENTS.md\n` — no custom content, no CRLF variants, no edge cases today.

## Key Reference Files for Implementation

| File | Why it matters |
|---|---|
| `packages/cli/src/commands/cleanup/index.ts` | **Primary structural template** — parent command with subcommands pattern |
| `packages/cli/src/commands/cleanup/project/project.ts` | **DI pattern template** — two-tier dependencies, default factories, partial overrides, error handling, exit codes |
| `packages/cli/src/commands/cleanup/cleanup.types.ts` | **Type pattern template** — Status/Mode/ActionType/ActionResult/Summary/Payload structure |
| `packages/cli/src/commands/cleanup/cleanup.utils.ts` | **Utility pattern template** — payload construction, action normalization, path helpers |
| `packages/cli/src/commands/sync/index.ts` | **Dry-run/apply pattern** — `--apply` flag, conditional execution, output formatting |
| `packages/cli/src/commands/index.ts` | **Only existing file to modify** — command registration |
| `packages/cli/src/commands/__tests__/helpers.ts` | **Test helper** — `createLoggerCapture()` for capturing logger output in tests |
| `packages/cli/src/app/command-context.ts` | **Reuse** — `buildCommandContext()`, `GlobalOptions`, `CommandContext` |
| `packages/cli/src/commands/shared/shared.utils.ts` | **Reuse** — `readGlobalOptions()` |
| `packages/cli/src/fs/paths.ts` | **Reuse** — `resolveProjectRoot()` for finding repo root |
| `packages/cli/src/errors/cli-error.ts` | **Reuse** — `CliError` for typed exit codes |
| `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh` | **Reference** — exclusion patterns for directory scanning |

### CLI conventions to follow (from `packages/cli/AGENTS.md`)

- Keep command handlers thin; push logic into utils modules
- Named command files (`validate.ts`, `sync.ts`) with `index.ts` for registration only
- Import policy: `./` for same-directory, TypeScript aliases (`@app/`, `@commands/`, `@fs/`, `@errors/`) for cross-directory
- Dry-run-first and non-interactive/JSON contracts
- Exit semantics: 0 success, 1 actionable/user error, 2 system/runtime error
- Route output through CLI logger utilities (no `console.*`)

## File Structure

All new files under `packages/cli/src/commands/instructions/`:

```
instructions/
  index.ts                          # Parent command registration
  index.test.ts                     # Subcommand registration tests
  instructions.types.ts             # Shared types
  instructions.utils.ts             # Core scanning + formatting logic
  instructions.utils.test.ts        # Scanner unit tests
  validate/
    validate.ts                     # validate subcommand
    validate.test.ts                # validate unit tests
  sync/
    sync.ts                         # sync subcommand
    sync.test.ts                    # sync unit tests
  instructions.integration.test.ts  # End-to-end filesystem tests
```

**One existing file to modify:** `packages/cli/src/commands/index.ts` — add `createInstructionsCommand()` registration.

## Implementation Steps

### Step 1: Types (`instructions.types.ts`)

Define shared types following the `cleanup.types.ts` pattern:

- `InstructionStatus`: `'ok' | 'missing' | 'content_mismatch'`
- `InstructionEntry`: `{ agentsPath, claudePath, status, detail }`
- `InstructionActionType`: `'create' | 'update' | 'skip'`
- `InstructionActionResult`: `'planned' | 'applied' | 'skipped'`
- `InstructionActionRecord`: `{ type, target, reason, result }`
- `InstructionsMode`: `'validate' | 'dry-run' | 'apply'`
- `InstructionsSummary`: `{ scanned, ok, missing, contentMismatch, created, updated, skipped }`
- `InstructionsJsonPayload`: `{ mode, status, summary, entries, actions }`
- DI interfaces: `InstructionsScanDependencies`, `InstructionsValidateCommandDependencies`, `InstructionsSyncCommandDependencies`

### Step 2: Scanning + Utilities (`instructions.utils.ts` + tests)

**`scanInstructionFiles(repoRoot, overrides?)`** — BFS directory walk:
1. Walk from repoRoot using `readdir({ withFileTypes: true })`. **Skip directory symlinks** — use `dirent.isSymbolicLink()` to prevent cycle/escape risks. Only descend into real directories.
2. Exclude: `node_modules` (any depth), `.worktrees`/`.git`/`.oat` (root only)
3. Collect directories containing `AGENTS.md`
4. For each, check sibling `CLAUDE.md`:
   - Missing → `status: 'missing'`
   - Content (after CRLF normalization) === `@AGENTS.md\n` → `status: 'ok'`
   - Content differs → `status: 'content_mismatch'`
5. Return sorted `InstructionEntry[]`

**CRLF handling:** Normalize content with `content.replace(/\r\n/g, '\n')` before comparison. Always write canonical `\n` on sync. This prevents false positives on Windows checkouts with CRLF conversion.

The exclusion list matches `resolve-instruction-files.sh` (`.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh`).

**Helpers:**
- `buildInstructionsSummary(entries, actions)` — count aggregation
- `buildInstructionsPayload({mode, entries, actions})` — construct JSON payload
- `formatInstructionsReport(payload)` — aligned table with ✓/✗/⚠ markers

**Constant:** `EXPECTED_CLAUDE_CONTENT = '@AGENTS.md\n'`

FS dependencies (`readdir`, `readFile`, `stat`) injected via `InstructionsScanDependencies` for testability.

### Step 3: Validate Command (`validate/validate.ts` + tests)

```
oat instructions validate [--json]
```

- Read-only. Never writes.
- Calls `scanInstructionFiles(repoRoot)`, builds payload with `mode: 'validate'`, empty actions.
- Exit 0 if all ok, exit 1 if issues found.
- Text mode: table + success/warning summary with fix guidance.
- JSON mode: `InstructionsJsonPayload`.

**DI pattern:** `InstructionsValidateCommandDependencies` with `buildCommandContext`, `resolveProjectRoot`, `scanInstructionFiles`. Default factory + partial overrides.

**Reuse:** `readGlobalOptions` from `@commands/shared/shared.utils`, `buildCommandContext` from `@app/command-context`, `resolveProjectRoot` from `@fs/paths`, `CliError` from `@errors/cli-error`.

### Step 4: Sync Command (`sync/sync.ts` + tests)

```
oat instructions sync [--apply] [--force] [--json]
```

- Dry-run by default. `--apply` to write. `--force` to overwrite non-pointer CLAUDE.md.
- **Planning phase** (`planSyncActions`):
  - `missing` → action `create` (planned)
  - `content_mismatch` + force → action `update` (planned)
  - `content_mismatch` + no force → action `skip` (skipped)
  - `ok` → no action
- **Execution phase** (only with `--apply`): write `@AGENTS.md\n` to each planned target.
- Exit 0 if no remaining issues after sync, exit 1 if skipped entries remain.
- Dry-run output includes `Apply changes with: oat instructions sync --apply`.

**DI pattern:** `InstructionsSyncCommandDependencies` — same as validate plus `writeFile`.

### Step 5: Parent Command + Registration (`index.ts`)

```typescript
export function createInstructionsCommand(): Command {
  return new Command('instructions')
    .description('Manage AGENTS.md and CLAUDE.md instruction file integrity')
    .addCommand(createInstructionsValidateCommand())
    .addCommand(createInstructionsSyncCommand());
}
```

**Modify** `packages/cli/src/commands/index.ts`: import and add `program.addCommand(createInstructionsCommand())`.

### Step 6: Integration Tests (`instructions.integration.test.ts`)

Real filesystem tests with `mkdtemp`:
- AGENTS.md with no CLAUDE.md → validate finds issue → sync --apply creates it → validate passes
- AGENTS.md with custom CLAUDE.md → sync skips (exit 1) → sync --force --apply overwrites (exit 0)
- Nested AGENTS.md (e.g. `packages/foo/AGENTS.md`) → discovered correctly
- AGENTS.md inside `node_modules/` → excluded
- Directory symlink cycle → scanner skips symlinked dirs, no infinite recursion
- CLAUDE.md with CRLF content (`@AGENTS.md\r\n`) → validate reports ok
- Sync mismatch without --force: assert exit code 1 + JSON payload shape (dry-run and apply modes)

## Edge Cases

- **Content comparison**: normalize CRLF before comparing (`content.replace(/\r\n/g, '\n') === '@AGENTS.md\n'`). Accepts both `\n` and `\r\n` variants.
- **Sync always writes `\n`**: portable regardless of platform
- **Empty CLAUDE.md**: treated as `content_mismatch`
- **Directory symlinks**: skipped during BFS walk (`dirent.isSymbolicLink()` check). Prevents cycles and repo-escape. File symlinks (AGENTS.md/CLAUDE.md themselves being symlinks) are followed normally via `readFile`.
- **Permission errors**: log debug, continue scanning (graceful degradation)

## Verification

1. `pnpm --filter @oat/cli test` — all new tests pass
2. `pnpm lint && pnpm type-check` — no regressions
3. `pnpm build && pnpm run cli -- instructions validate` — reports all ok on this repo
4. Manual test: delete `packages/cli/CLAUDE.md`, run `oat instructions validate` (exit 1), run `oat instructions sync --apply` (creates it), run validate again (exit 0)
5. Manual test: write custom content to a CLAUDE.md, run sync without --force (skips), with --force (overwrites)
6. `pnpm run cli -- instructions validate --json` — structured JSON output
