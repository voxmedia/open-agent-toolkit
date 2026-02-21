# Plan: `oat instructions validate` and `oat instructions sync`

## Context

Every AGENTS.md file in the repo should have a sibling CLAUDE.md containing `@AGENTS.md\n` as a pointer. Today this is manually maintained and has no validation — drift is invisible until an agent reads the wrong instructions. These two CLI commands add automated integrity checks (validate) and repair (sync), following the same dry-run/apply pattern as `oat sync` and `oat cleanup`.

Backlog item: B08. Scoped narrowly to the AGENTS.md → CLAUDE.md pointer relationship only.

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
