---
oat_status: complete
oat_ready_for: oat-implement
oat_blockers: []
oat_last_updated: 2026-02-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p01", "p02", "p03", "p04", "p05"]
oat_generated: false
oat_template: false
---

# Implementation Plan: provider-interop-cli

> **Optional:** If using Claude Code with superpowers plugin, you can use `superpowers:executing-plans` to execute this plan. Otherwise, execute tasks step-by-step.

**Goal:** Build the `oat` CLI that manages provider interoperability — establishing `.agents/` as the canonical source of truth and syncing skills/agents to Claude Code, Cursor, and Codex directories via symlinks (with copy fallback).

**Architecture:** Layered CLI with command-factory pattern (commander), sync engine, provider adapters, manifest manager, and drift detector. Centralized logger (chalk/ora) with non-interactive contract for JSON/CI mode.

**Tech Stack:** TypeScript 5.8.3, Node.js 22.17.0, commander, @inquirer/prompts, chalk, ora, zod, vitest, Biome

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add manifest schema and types`

---

## Phase 1: Foundation — Scaffold, Types, Config

**Goal:** Establish project scaffolding, shared types, CLI logger, commander wiring, and vitest setup. After this phase the CLI responds to `oat --help` and has a working test harness.

---

### Task p01-t01: Add vitest and test scripts

**Files:**
- Modify: `packages/cli/package.json`
- Create: `packages/cli/vitest.config.ts`

**Step 1: Write test (RED)**

No test file yet — this task sets up the test runner itself.

**Step 2: Implement (GREEN)**

- Add `vitest` as a devDependency in `packages/cli/package.json`
- Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`
- Create `packages/cli/vitest.config.ts`:
  ```typescript
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { passWithNoTests: true },
  });
  ```

**Step 3: Verify**

Run: `cd packages/cli && pnpm test`
Expected: vitest runs with `--passWithNoTests`, exits cleanly (0 tests, exit code 0)

> **Note:** Vitest exits non-zero when no test files are found by default. Add `passWithNoTests: true` to vitest.config.ts or use the `--passWithNoTests` flag for bootstrap validation.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/cli/vitest.config.ts pnpm-lock.yaml
git commit -m "chore(p01-t01): add vitest and test scripts to @oat/cli"
```

---

### Task p01-t02: Configure path aliases in tsconfig

**Files:**
- Modify: `packages/cli/tsconfig.json`

**Step 1: Write test (RED)**

N/A — config change only. Verified by type-check.

**Step 2: Implement (GREEN)**

Add `paths` mapping to `packages/cli/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@commands/*": ["src/commands/*"],
      "@providers/*": ["src/providers/*"],
      "@engine/*": ["src/engine/*"],
      "@manifest/*": ["src/manifest/*"],
      "@drift/*": ["src/drift/*"],
      "@ui/*": ["src/ui/*"],
      "@config/*": ["src/config/*"],
      "@shared/*": ["src/shared/*"],
      "@fs/*": ["src/fs/*"],
      "@errors/*": ["src/errors/*"],
      "@app/*": ["src/app/*"],
      "@validation/*": ["src/validation/*"]
    }
  }
}
```

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/tsconfig.json
git commit -m "chore(p01-t02): configure path aliases in @oat/cli tsconfig"
```

---

### Task p01-t03: Scaffold directory structure

**Files:**
- Create: All skeleton directories and barrel files under `packages/cli/src/`

**Step 1: Write test (RED)**

N/A — scaffold only.

**Step 2: Implement (GREEN)**

Create the directory tree with minimal barrel `index.ts` files (empty exports or placeholder comments) for:
- `src/app/` — `create-program.ts`, `command-context.ts`
- `src/commands/` — `index.ts` + subdirs: `init/`, `status/`, `sync/`, `providers/`, `doctor/`
- `src/providers/` — `claude/`, `cursor/`, `codex/`, `shared/`
- `src/engine/`
- `src/manifest/`
- `src/drift/`
- `src/ui/`
- `src/config/`
- `src/shared/`
- `src/validation/`
- `src/fs/`
- `src/errors/`

Each file can be a minimal placeholder (e.g., `// placeholder`) to establish the structure.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "chore(p01-t03): scaffold CLI directory structure"
```

---

### Task p01-t04: Implement CliError class

**Files:**
- Create: `packages/cli/src/errors/cli-error.ts`
- Create: `packages/cli/src/errors/cli-error.test.ts`

**Step 1: Write test (RED)**

```typescript
// cli-error.test.ts
describe('CliError', () => {
  it('stores message and exit code');
  it('defaults to exit code 1 for user errors');
  it('accepts exit code 2 for system errors');
  it('is instanceof Error');
});
```

**Step 2: Implement (GREEN)**

```typescript
export class CliError extends Error {
  constructor(message: string, public readonly exitCode: 1 | 2 = 1) {
    super(message);
    this.name = 'CliError';
  }
}
```

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/errors/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/errors/
git commit -m "feat(p01-t04): implement CliError with exit code mapping"
```

---

### Task p01-t05: Implement CliLogger

**Files:**
- Create: `packages/cli/src/ui/logger.ts`
- Create: `packages/cli/src/ui/logger.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('CliLogger', () => {
  it('info() writes to stdout in human mode');
  it('warn() writes to stderr in human mode');
  it('error() writes to stderr in human mode');
  it('success() writes to stdout in human mode');
  it('json() outputs single JSON document to stdout');
  it('suppresses colors when json mode is true');
  it('debug() only outputs when verbose is true');
  it('info/warn/success/debug are no-ops in json mode');
  it('error() emits structured JSON to stderr in json mode');
});
```

**Step 2: Implement (GREEN)**

- `createLogger(options: { json: boolean; verbose: boolean }): CliLogger`
- Uses `chalk` for coloring in human mode
- `json()` method writes `JSON.stringify(payload, null, 2)` to stdout
- In `--json` mode: `info`/`warn`/`success`/`debug` are no-ops; `error()` still emits structured JSON to **stderr** (per design error contract); only `json()` writes to stdout
- `debug()` gated by `verbose` flag

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/ui/logger`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/ui/
git commit -m "feat(p01-t05): implement CliLogger with chalk and json mode"
```

---

### Task p01-t06: Implement spinner wrapper

**Files:**
- Create: `packages/cli/src/ui/spinner.ts`
- Create: `packages/cli/src/ui/spinner.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('createSpinner', () => {
  it('returns an ora instance in TTY mode');
  it('returns a no-op spinner in non-TTY mode');
  it('returns a no-op spinner in json mode');
});
```

**Step 2: Implement (GREEN)**

- `createSpinner(text: string, options: { json: boolean; interactive: boolean }): Spinner`
- Wraps `ora` — returns real ora instance when interactive + not json, otherwise a stub with no-op methods

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/ui/spinner`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/ui/
git commit -m "feat(p01-t06): implement spinner wrapper with non-TTY auto-disable"
```

---

### Task p01-t07: Implement CommandContext and runtime config

**Files:**
- Create: `packages/cli/src/app/command-context.ts`
- Create: `packages/cli/src/config/runtime.ts`
- Create: `packages/cli/src/app/command-context.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('buildCommandContext', () => {
  it('creates context with default scope "all"');
  it('sets interactive=true when TTY and json=false');
  it('sets interactive=false when json=true');
  it('resolves cwd to absolute path');
  it('resolves home from os.homedir()');
});
```

**Step 2: Implement (GREEN)**

- `CommandContext` interface as defined in design
- `buildCommandContext(opts: GlobalOptions): CommandContext`
- `isInteractive()` helper in `config/runtime.ts` — checks `process.stdin.isTTY` and `!json`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/app/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/app/ packages/cli/src/config/
git commit -m "feat(p01-t07): implement CommandContext with interactive detection"
```

---

### Task p01-t08: Wire up commander program with global flags

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/app/create-program.ts`
- Create: `packages/cli/src/commands/index.ts`

**Step 1: Write test (RED)**

```typescript
describe('createProgram', () => {
  it('creates a commander program named "oat"');
  it('registers --json global flag');
  it('registers --verbose global flag');
  it('registers --scope global option with choices');
  it('registers --cwd global option');
});
```

**Step 2: Implement (GREEN)**

- `createProgram(): Command` — builds commander instance with global flags
- `registerCommands(program: Command)` — placeholder that registers stub commands (init, status, sync, providers, doctor) with `action(() => { logger.info('Coming soon...'); })`
- Update `src/index.ts` to call `createProgram()` + `registerCommands()` + `program.parse()`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli build && node packages/cli/dist/index.js --help`
Expected: Shows `oat` help with all 5 commands listed and global flags

**Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(p01-t08): wire commander program with global flags and stub commands"
```

---

### Task p01-t09: Define shared types and zod schemas

**Files:**
- Create: `packages/cli/src/shared/types.ts`
- Create: `packages/cli/src/shared/types.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('shared types', () => {
  it('ContentType allows skill and agent');
  it('SyncStrategy allows symlink, copy, auto');
  it('Scope allows project, user, all');
});
```

**Step 2: Implement (GREEN)**

Define and export core zod schemas + inferred types:
- `ContentTypeSchema` → `ContentType`
- `SyncStrategySchema` → `SyncStrategy`
- `ScopeSchema` → `Scope`
- `SCOPE_CONTENT_TYPES` constant

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/shared/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/shared/
git commit -m "feat(p01-t09): define shared types and zod schemas"
```

---

### Task p01-t10: Define provider adapter types and shared utilities

**Files:**
- Create: `packages/cli/src/providers/shared/adapter.types.ts`
- Create: `packages/cli/src/providers/shared/adapter.utils.ts`
- Create: `packages/cli/src/providers/shared/adapter.types.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('ProviderAdapter types', () => {
  it('PathMapping has required fields');
  it('ProviderAdapter has required fields');
  it('getActiveAdapters filters by detection');
  it('getAdapterMappings filters nativeRead entries');
});
```

**Step 2: Implement (GREEN)**

- `PathMapping` interface: `contentType`, `canonicalDir`, `providerDir`, `nativeRead`
- `ProviderAdapter` interface: `name`, `displayName`, `defaultStrategy`, `projectMappings`, `userMappings`, `detect()`, `detectVersion?()`
- `getActiveAdapters(adapters, scopeRoot)` — runs detection, returns detected adapters
- `getSyncMappings(adapter, scope)` — returns mappings for scope, filtering out `nativeRead: true`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/shared/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/providers/shared/
git commit -m "feat(p01-t10): define provider adapter types and shared utilities"
```

---

### Task p01-t11: Implement Claude adapter

**Files:**
- Create: `packages/cli/src/providers/claude/adapter.ts`
- Create: `packages/cli/src/providers/claude/paths.ts`
- Create: `packages/cli/src/providers/claude/adapter.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('claudeAdapter', () => {
  it('has name "claude" and displayName "Claude Code"');
  it('project mappings: skills → .claude/skills, agents → .claude/agents');
  it('user mappings: skills → .claude/skills');
  it('all mappings have nativeRead: false');
  it('detect returns true when .claude/ exists');
  it('detect returns false when .claude/ is absent');
});
```

**Step 2: Implement (GREEN)**

- `claudeAdapter: ProviderAdapter` — configuration object with path mappings per design table
- `detect()` checks `fs.access(path.join(scopeRoot, '.claude'))` existence

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/claude/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/providers/claude/
git commit -m "feat(p01-t11): implement Claude adapter with path mappings"
```

---

### Task p01-t12: Implement Cursor adapter

**Files:**
- Create: `packages/cli/src/providers/cursor/adapter.ts`
- Create: `packages/cli/src/providers/cursor/paths.ts`
- Create: `packages/cli/src/providers/cursor/adapter.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('cursorAdapter', () => {
  it('has name "cursor" and displayName "Cursor"');
  it('project skills map to .cursor/skills (not .claude/skills)');
  it('project agents map to .cursor/agents');
  it('user mappings: skills → .cursor/skills');
  it('all mappings have nativeRead: false');
  it('detect returns true when .cursor/ exists');
});
```

**Step 2: Implement (GREEN)**

- `cursorAdapter: ProviderAdapter` — always syncs to `.cursor/skills/`, never `.claude/` fallback
- Detection via `.cursor/` directory existence

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/cursor/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/providers/cursor/
git commit -m "feat(p01-t12): implement Cursor adapter — always syncs to .cursor/"
```

---

### Task p01-t13: Implement Codex adapter

**Files:**
- Create: `packages/cli/src/providers/codex/adapter.ts`
- Create: `packages/cli/src/providers/codex/paths.ts`
- Create: `packages/cli/src/providers/codex/adapter.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('codexAdapter', () => {
  it('has name "codex" and displayName "Codex CLI"');
  it('project skills mapping has nativeRead: true');
  it('project agents map to .codex/agents with nativeRead: false');
  it('user skills mapping has nativeRead: true');
  it('detect returns true when .codex/ exists');
});
```

**Step 2: Implement (GREEN)**

- `codexAdapter: ProviderAdapter` — skills are nativeRead (Codex reads `.agents/` directly), agents sync to `.codex/agents/`
- Detection via `.codex/` directory existence

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/codex/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/providers/codex/
git commit -m "feat(p01-t13): implement Codex adapter with native skill reads"
```

---

### Task p01-t14: Implement manifest types and zod schema

**Files:**
- Create: `packages/cli/src/manifest/manifest.types.ts`
- Create: `packages/cli/src/manifest/manifest.types.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('manifest schema', () => {
  it('validates a well-formed manifest');
  it('rejects manifest with unknown version');
  it('rejects entry with missing canonicalPath');
  it('rejects entry where copy strategy has null contentHash');
  it('rejects duplicate (canonicalPath, provider) pairs');
  it('accepts empty entries array');
});
```

**Step 2: Implement (GREEN)**

Define zod schemas:
- `ManifestEntrySchema` — validates all fields per design
- `ManifestSchema` — `version: z.literal(1)`, `oatVersion`, `entries`, `lastUpdated`
- Inferred types: `Manifest`, `ManifestEntry`
- Custom refinement: copy strategy requires non-null contentHash

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/manifest/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/manifest/
git commit -m "feat(p01-t14): define manifest types and zod validation schema"
```

---

### Task p01-t15: Implement manifest manager (load, save, CRUD)

**Files:**
- Create: `packages/cli/src/manifest/manager.ts`
- Create: `packages/cli/src/manifest/manager.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('manifest manager', () => {
  describe('loadManifest', () => {
    it('loads valid manifest from disk');
    it('returns empty manifest when file does not exist');
    it('throws CliError on corrupt JSON');
    it('throws CliError on schema validation failure');
  });
  describe('saveManifest', () => {
    it('writes manifest atomically (temp + rename)');
    it('creates parent directories if needed');
  });
  describe('findEntry', () => {
    it('finds entry by canonicalPath + provider');
    it('returns undefined when not found');
  });
  describe('addEntry', () => {
    it('adds new entry to manifest');
    it('replaces existing entry with same canonicalPath + provider');
  });
  describe('removeEntry', () => {
    it('removes entry by canonicalPath + provider');
    it('is a no-op when entry does not exist');
  });
});
```

**Step 2: Implement (GREEN)**

- `loadManifest(manifestPath)` — read JSON, parse with zod, return Manifest. If file missing → return empty manifest. If corrupt → throw CliError with recovery guidance.
- `saveManifest(manifestPath, manifest)` — write to `${manifestPath}.tmp`, then `fs.rename`
- `findEntry`, `addEntry`, `removeEntry` — pure functions on Manifest object
- `createEmptyManifest()` — factory for new empty manifest

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/manifest/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/manifest/
git commit -m "feat(p01-t15): implement manifest manager with atomic saves"
```

---

### Task p01-t16: Implement directory hash computation

**Files:**
- Create: `packages/cli/src/manifest/hash.ts`
- Create: `packages/cli/src/manifest/hash.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('computeDirectoryHash', () => {
  it('produces deterministic SHA-256 for a directory');
  it('hash changes when file content changes');
  it('hash is stable regardless of filesystem readdir order');
  it('throws CliError when directory does not exist');
});
```

**Step 2: Implement (GREEN)**

- `computeDirectoryHash(dirPath)` — recursively reads all files (sorted by relative path), concatenates `relativePath + content` for each, produces SHA-256 hex digest via `node:crypto`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/manifest/hash`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/manifest/
git commit -m "feat(p01-t16): implement deterministic directory hash computation"
```

---

### Task p01-t17: Implement canonical directory scanner

**Files:**
- Create: `packages/cli/src/engine/scanner.ts`
- Create: `packages/cli/src/engine/scanner.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('scanCanonical', () => {
  it('discovers skills under .agents/skills/');
  it('discovers agents under .agents/agents/ for project scope');
  it('skips agents for user scope (skills only)');
  it('returns empty array when .agents/ does not exist');
  it('ignores non-directory entries');
  it('populates canonicalPath as absolute path');
});
```

**Step 2: Implement (GREEN)**

- `scanCanonical(basePath, scope)` — reads directories based on `SCOPE_CONTENT_TYPES[scope]`, returns `CanonicalEntry[]`
- Reads `.agents/skills/` subdirectories → type `'skill'`
- Reads `.agents/agents/` subdirectories → type `'agent'` (only for project scope)

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/scanner`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "feat(p01-t17): implement canonical directory scanner with scope filtering"
```

---

### Task p01-t18: Implement sync config loader

**Files:**
- Create: `packages/cli/src/config/sync-config.ts`
- Create: `packages/cli/src/config/sync-config.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('loadSyncConfig', () => {
  it('returns defaults when no config file exists');
  it('loads and validates config from disk');
  it('merges per-provider overrides');
  it('rejects invalid config with CliError');
});
```

**Step 2: Implement (GREEN)**

- `SyncConfigSchema` (zod) matching design's `SyncConfig` interface
- `loadSyncConfig(configPath)` — reads optional `.oat/sync/config.json`, validates with zod, returns config or defaults
- Default: `{ version: 1, defaultStrategy: 'auto' }`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/config/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/config/
git commit -m "feat(p01-t18): implement sync config loader with zod validation"
```

---

### Task p01-t19: Implement filesystem helpers (io.ts, paths.ts)

**Files:**
- Create: `packages/cli/src/fs/io.ts`
- Create: `packages/cli/src/fs/paths.ts`
- Create: `packages/cli/src/fs/io.test.ts`
- Create: `packages/cli/src/fs/paths.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('fs/io', () => {
  it('createSymlink creates a directory symlink');
  it('createSymlink with copy fallback copies directory when symlink fails');
  it('copyDirectory recursively copies all files');
  it('atomicWriteJson writes to temp then renames');
  it('ensureDir creates directory recursively');
});
describe('fs/paths', () => {
  it('resolveProjectRoot finds nearest .git parent');
  it('resolveScopeRoot returns cwd for project, homedir for user');
  it('validatePathWithinScope rejects paths outside scope root');
});
```

**Step 2: Implement (GREEN)**

- `createSymlink(target, linkPath)` — `fs.symlink(target, linkPath, 'dir')` with try-catch fallback to copy
- `copyDirectory(src, dest)` — recursive file copy
- `atomicWriteJson(filePath, data)` — write to `.tmp`, `fs.rename`
- `ensureDir(dirPath)` — `fs.mkdir(dirPath, { recursive: true })`
- `resolveProjectRoot(cwd)` — walk up to find `.git/`
- `resolveScopeRoot(scope, cwd, home)` — project→cwd, user→home
- `validatePathWithinScope(p, scopeRoot)` — `path.resolve` + startsWith check

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/fs/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/fs/
git commit -m "feat(p01-t19): implement filesystem helpers with symlink and copy"
```

---

### Task p01-t20: Phase 1 verification

**Files:**
- No new files

**Step 1: Full verification**

Run:
```bash
pnpm --filter=@oat/cli test
pnpm --filter=@oat/cli type-check
pnpm --filter=@oat/cli lint
pnpm --filter=@oat/cli build && node packages/cli/dist/index.js --help
```

Expected:
- All unit tests pass
- Type-check clean
- Lint clean
- `oat --help` shows 5 commands + global flags

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(p01-t20): phase 1 verification — all foundation tests pass"
```

---

### Task p01-t21: (review) Prevent duplicate test execution from dist artifacts

**Files:**
- Modify: `packages/cli/vitest.config.ts`
- Modify: `packages/cli/tsconfig.json`

**Step 1: Understand the issue**

Review finding: test suites currently run from both `src/` and `dist/`, causing duplicate execution and noisy verification.
Location: `packages/cli/vitest.config.ts`, `packages/cli/tsconfig.json`

**Step 2: Implement fix**

- Add explicit Vitest include patterns (`src/**/*.test.ts`) so test discovery ignores compiled `dist/` tests
- Optionally exclude test files from TypeScript build output if needed for cleaner `dist/` (`src/**/*.test.ts`)
- Keep bootstrap behavior with `passWithNoTests: true`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test`
Expected: tests execute once per source suite (no duplicate `dist/` runs)

**Step 4: Commit**

```bash
git add packages/cli/vitest.config.ts packages/cli/tsconfig.json
git commit -m "fix(p01-t21): prevent duplicate vitest execution from dist artifacts"
```

---

### Task p01-t22: (review) Log and surface symlink fallback behavior

**Files:**
- Modify: `packages/cli/src/fs/io.ts`
- Modify: `packages/cli/src/fs/io.test.ts`

**Step 1: Understand the issue**

Review finding: `createSymlink` silently falls back to copy mode, violating the design expectation for explicit fallback diagnostics.
Location: `packages/cli/src/fs/io.ts`

**Step 2: Implement fix**

- Update `createSymlink` to expose fallback behavior (e.g., return strategy and/or callback hook on fallback error)
- Ensure callers can log when copy fallback is used
- Extend tests to validate fallback signaling behavior

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/fs/io.test.ts`
Expected: fallback path remains functional and now emits fallback signal/metadata

**Step 4: Commit**

```bash
git add packages/cli/src/fs/io.ts packages/cli/src/fs/io.test.ts
git commit -m "fix(p01-t22): surface symlink fallback diagnostics"
```

---

### Task p01-t23: (review) Consolidate Scope type to shared source

**Files:**
- Modify: `packages/cli/src/app/command-context.ts`
- Modify: `packages/cli/src/app/command-context.test.ts`

**Step 1: Understand the issue**

Review finding: `Scope` is defined in multiple modules, creating drift risk.
Location: `packages/cli/src/app/command-context.ts`, `packages/cli/src/shared/types.ts`

**Step 2: Implement fix**

- Remove local `Scope` literal type from command context module
- Import and use shared `Scope` type from `src/shared/types.ts`
- Confirm command-context tests still pass with shared type wiring

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/app/command-context.test.ts && pnpm --filter=@oat/cli type-check`
Expected: tests pass and `Scope` has single source of truth

**Step 4: Commit**

```bash
git add packages/cli/src/app/command-context.ts packages/cli/src/app/command-context.test.ts
git commit -m "fix(p01-t23): unify Scope type usage with shared schema types"
```

---

### Task p01-t24: (review) Clarify all-scope content semantics in shared types

**Files:**
- Modify: `packages/cli/src/shared/types.ts`
- Modify: `packages/cli/src/shared/types.test.ts`

**Step 1: Understand the issue**

Review finding: `SCOPE_CONTENT_TYPES.all` duplicates project values and obscures intent for future scope unions.
Location: `packages/cli/src/shared/types.ts`

**Step 2: Implement fix**

- Derive `all` semantics explicitly from scope unions (or document invariant clearly in code)
- Keep current runtime behavior unchanged for v1 while removing ambiguity
- Add test assertions that capture intended `all` semantics

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/shared/types.test.ts`
Expected: tests pass and `all` semantics are explicit/documented

**Step 4: Commit**

```bash
git add packages/cli/src/shared/types.ts packages/cli/src/shared/types.test.ts
git commit -m "fix(p01-t24): clarify all-scope content semantics"
```

---

### Task p01-t25: (review) Define all-scope behavior for adapter mappings

**Files:**
- Modify: `packages/cli/src/providers/shared/adapter.utils.ts`
- Modify: `packages/cli/src/providers/shared/adapter.types.test.ts`

**Step 1: Understand the issue**

Review finding: `getSyncMappings(scope='all')` concatenates mappings and can produce duplicates.
Location: `packages/cli/src/providers/shared/adapter.utils.ts`

**Step 2: Implement fix**

- Choose and enforce one behavior for `'all'` scope in mapping utilities:
  - deduplicate by mapping identity, or
  - disallow `'all'` and force per-scope iteration
- Document the chosen contract inline
- Add tests for `'all'` behavior and duplicate safety

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/shared/adapter.types.test.ts`
Expected: tests validate deterministic non-duplicated `'all'` behavior

**Step 4: Commit**

```bash
git add packages/cli/src/providers/shared/adapter.utils.ts packages/cli/src/providers/shared/adapter.types.test.ts
git commit -m "fix(p01-t25): harden all-scope adapter mapping behavior"
```

---

### Task p01-t26: (review) Correct scope-root resolution contract for all scope

**Files:**
- Modify: `packages/cli/src/fs/paths.ts`
- Modify: `packages/cli/src/fs/paths.test.ts`
- Modify: scope callers as needed (engine/config command flow)

**Step 1: Understand the issue**

Review finding: `resolveScopeRoot('all')` currently returns project cwd, which is ambiguous/incorrect for user-scope operations.
Location: `packages/cli/src/fs/paths.ts`

**Step 2: Implement fix**

- Narrow `resolveScopeRoot` contract to concrete scopes (`project` | `user`) or return explicit multi-root structure for `'all'`
- Update affected call sites to iterate scopes intentionally when `'all'` is requested
- Expand tests for positive and `'all'`-related path/scope behavior

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/fs/paths.test.ts && pnpm --filter=@oat/cli type-check`
Expected: scope root behavior is explicit, deterministic, and tested

**Step 4: Commit**

```bash
git add packages/cli/src/fs/paths.ts packages/cli/src/fs/paths.test.ts packages/cli/src/engine/ packages/cli/src/config/
git commit -m "fix(p01-t26): make all-scope root resolution explicit"
```

---

### Task p01-t27: (review) Enforce concrete scope contract in scanner

**Files:**
- Modify: `packages/cli/src/engine/scanner.ts`
- Modify: `packages/cli/src/engine/scanner.test.ts`

**Step 1: Understand the issue**

Review finding: scanner accepts `scope === 'all'`, which blurs project/user scope boundaries and can include incorrect content types for a given root.
Location: `packages/cli/src/engine/scanner.ts`

**Step 2: Implement fix**

- Narrow `scanCanonical` scope parameter to concrete scopes (`project` | `user`)
- Ensure scanner call sites iterate scopes explicitly when `all` is requested upstream
- Add or update tests to validate concrete-scope behavior and maintain existing project/user coverage

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/scanner.test.ts && pnpm --filter=@oat/cli type-check`
Expected: scanner behavior is unchanged for project/user and scope contract is explicit

**Step 4: Commit**

```bash
git add packages/cli/src/engine/scanner.ts packages/cli/src/engine/scanner.test.ts
git commit -m "fix(p01-t27): enforce concrete scope contract in scanner"
```

---

### Task p01-t28: (review) Reclassify project root resolution failure as system error

**Files:**
- Modify: `packages/cli/src/fs/paths.ts`
- Modify: `packages/cli/src/fs/paths.test.ts`

**Step 1: Understand the issue**

Review finding: inability to resolve a git project root is currently surfaced with exit code `1`; classify as environment/system failure (`2`) for consistency with error contract.
Location: `packages/cli/src/fs/paths.ts`

**Step 2: Implement fix**

- Update `resolveProjectRoot` to throw `CliError(..., 2)` when `.git` cannot be resolved
- Add a test that asserts exit code classification for the failure path

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/fs/paths.test.ts`
Expected: tests pass and failure path asserts `exitCode === 2`

**Step 4: Commit**

```bash
git add packages/cli/src/fs/paths.ts packages/cli/src/fs/paths.test.ts
git commit -m "fix(p01-t28): classify project-root lookup failure as system error"
```

---

### Task p01-t29: (review) Remove ambiguous adapter mapping alias

**Files:**
- Modify: `packages/cli/src/providers/shared/adapter.utils.ts`
- Modify: `packages/cli/src/providers/shared/adapter.types.test.ts`
- Modify: `packages/cli/src/providers/shared/index.ts`

**Step 1: Understand the issue**

Review finding: `getAdapterMappings` is an unexplained alias of `getSyncMappings` and creates naming confusion.
Location: `packages/cli/src/providers/shared/adapter.utils.ts`

**Step 2: Implement fix**

- Remove alias export and keep `getSyncMappings` as the canonical API
- Update tests and exports/imports to use one consistent name

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/shared/adapter.types.test.ts && pnpm --filter=@oat/cli type-check`
Expected: provider shared tests pass and no alias references remain

**Step 4: Commit**

```bash
git add packages/cli/src/providers/shared/adapter.utils.ts packages/cli/src/providers/shared/adapter.types.test.ts packages/cli/src/providers/shared/index.ts
git commit -m "fix(p01-t29): remove ambiguous adapter mapping alias"
```

---

### Task p01-t30: (review) Remove unnecessary sync strategy cast

**Files:**
- Modify: `packages/cli/src/config/sync-config.ts`

**Step 1: Understand the issue**

Review finding: `normalizeConfig` uses an unnecessary `as SyncStrategy` cast for `defaultStrategy`.
Location: `packages/cli/src/config/sync-config.ts`

**Step 2: Implement fix**

- Remove redundant cast and keep inferred type-safe assignment
- Keep runtime behavior unchanged

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli type-check && pnpm --filter=@oat/cli test src/config/`
Expected: type-check and config tests pass without cast

**Step 4: Commit**

```bash
git add packages/cli/src/config/sync-config.ts
git commit -m "refactor(p01-t30): remove unnecessary sync strategy cast"
```

---

### Task p01-t31: (review) Improve manifest validation diagnostics

**Files:**
- Modify: `packages/cli/src/manifest/manager.ts`
- Modify: `packages/cli/src/manifest/manager.test.ts`

**Step 1: Understand the issue**

Review finding: manifest validation failures do not include field-level issue details, limiting actionable diagnostics.
Location: `packages/cli/src/manifest/manager.ts`

**Step 2: Implement fix**

- Include concise zod issue details in manifest validation error messages
- Add or update tests that assert detailed validation guidance appears

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/manifest/manager.test.ts`
Expected: validation-error tests pass with richer diagnostics

**Step 4: Commit**

```bash
git add packages/cli/src/manifest/manager.ts packages/cli/src/manifest/manager.test.ts
git commit -m "fix(p01-t31): include manifest validation issue details"
```

---

## Phase 2: Sync Engine — Diff, Plan, Execute

**Goal:** Core sync logic — compute what needs to change, create symlinks/copies, update manifest. After this phase `computeSyncPlan` and `executeSyncPlan` are fully functional and integration-tested.

---

### Task p02-t01: Implement sync plan types

**Files:**
- Create: `packages/cli/src/engine/engine.types.ts`
- Create: `packages/cli/src/engine/engine.types.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('engine types', () => {
  it('SyncOperationType includes all 6 operation types');
  it('SyncPlanEntry has all required fields');
  it('SyncPlan has scope, entries, and removals');
  it('SyncResult tracks applied + failed counts');
});
```

**Step 2: Implement (GREEN)**

Define types per design: `CanonicalEntry`, `SyncOperationType`, `SyncPlanEntry`, `SyncPlan`, `SyncResult`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/engine.types`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "feat(p02-t01): define sync plan types"
```

---

### Task p02-t02: Implement computeSyncPlan

**Files:**
- Create: `packages/cli/src/engine/compute-plan.ts`
- Create: `packages/cli/src/engine/compute-plan.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('computeSyncPlan', () => {
  it('creates create_symlink entry when canonical exists but provider path missing');
  it('creates skip entry when symlink already correct');
  it('creates update_symlink when symlink target wrong');
  it('creates remove entry for manifest item whose canonical was deleted');
  it('filters out nativeRead mappings');
  it('respects scope content types (user scope: skills only)');
  it('uses copy strategy when adapter specifies copy');
});
```

**Step 2: Implement (GREEN)**

- `computeSyncPlan(canonical, adapters, manifest, scope, config)` → `SyncPlan`
- For each adapter mapping (filtering nativeRead + scope content types):
  - For each canonical entry matching the content type:
    - Check provider path: absent → `create_symlink`/`create_copy`
    - Check manifest + filesystem: in-sync → `skip`, drifted → `update_*`
  - Check manifest for entries whose canonical was deleted → `remove`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/compute-plan`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "feat(p02-t02): implement computeSyncPlan with drift-aware diffing"
```

---

### Task p02-t03: Implement executeSyncPlan

**Files:**
- Create: `packages/cli/src/engine/execute-plan.ts`
- Create: `packages/cli/src/engine/execute-plan.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('executeSyncPlan', () => {
  it('creates symlinks for create_symlink entries');
  it('copies directories for create_copy entries');
  it('re-creates symlink for update_symlink entries');
  it('re-copies for update_copy entries');
  it('removes provider path for remove entries');
  it('skips skip entries (no filesystem changes)');
  it('updates manifest after successful operations');
  it('continues on error and reports partial failure');
  it('returns SyncResult with counts');
});
```

**Step 2: Implement (GREEN)**

- `executeSyncPlan(plan, manifest, manifestPath)` → `Promise<SyncResult>`
- Iterate plan entries, execute each operation using `fs/io.ts` helpers
- For each success: `addEntry` or `removeEntry` on manifest
- At end: `saveManifest`
- On individual failure: log warning, increment `failed` count, continue

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/execute-plan`
Expected: All tests pass (against temp directory fixtures)

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "feat(p02-t03): implement executeSyncPlan with partial failure handling"
```

---

### Task p02-t04: Implement generated view markers for copy mode

**Files:**
- Create: `packages/cli/src/engine/markers.ts`
- Create: `packages/cli/src/engine/markers.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('generated view markers', () => {
  it('insertMarker adds OAT-managed comment to SKILL.md');
  it('hasMarker detects existing marker');
  it('marker text includes canonical source path');
});
```

**Step 2: Implement (GREEN)**

- `insertMarker(filePath, canonicalPath)` — prepends a comment line to SKILL.md: `<!-- OAT-managed: do not edit directly. Source: {canonicalPath} -->`
- `hasMarker(filePath)` — checks for marker prefix

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/markers`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "feat(p02-t04): implement generated view markers for copy mode"
```

---

### Task p02-t05: Integration test — sync round-trip

**Files:**
- Create: `packages/cli/src/engine/engine.integration.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('sync engine integration', () => {
  it('full sync: scan → plan → execute creates correct symlinks');
  it('idempotent: second run produces all skip entries');
  it('dry-run: computeSyncPlan without execute makes zero fs changes');
  it('removal: delete canonical → plan shows remove → execute cleans provider');
  it('copy mode: creates copies with correct hashes in manifest');
  it('scope filtering: user scope skips agents');
});
```

**Step 2: Implement (GREEN)**

Each test creates a temp dir, seeds `.agents/skills/`, `.agents/agents/`, provider directories, runs scan → plan → execute, asserts filesystem state.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/engine.integration`
Expected: All integration tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "test(p02-t05): add sync engine integration tests"
```

---

### Task p02-t06: (review) Integrate copy-mode markers into sync execution

**Files:**
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/engine.integration.test.ts`

**Step 1: Understand the issue**

Review finding: marker primitives exist (`insertMarker`, `hasMarker`) but copy-mode execution does not invoke marker insertion.
Location: `packages/cli/src/engine/execute-plan.ts`

**Step 2: Implement fix**

- Call `insertMarker` during `create_copy` and `update_copy` execution after directory copy completes
- Ensure marker target is deterministic for skill/agent directories (inline marker strategy used in current engine)
- Extend integration coverage to assert marker presence for copy-mode sync results

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/execute-plan.test.ts src/engine/engine.integration.test.ts`
Expected: copy-mode execution creates managed markers and tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/engine.integration.test.ts
git commit -m "fix(p02-t06): integrate copy-mode markers into sync execution"
```

---

### Task p02-t07: (review) Reorder symlink drift checks in classifyOperation

**Files:**
- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`

**Step 1: Understand the issue**

Review finding: symlink classification checks target mismatch before broken-target detection, leaving a branch effectively unreachable and out of order with design intent.
Location: `packages/cli/src/engine/compute-plan.ts`

**Step 2: Implement fix**

- Reorder symlink checks to test target existence before mismatch classification
- Keep behavior aligned with design table (`broken` before `replaced`)
- Update/add tests for symlink branch ordering and expected operation outcomes

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/compute-plan.test.ts`
Expected: tests pass with explicit broken/mismatch branch coverage

**Step 4: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts
git commit -m "fix(p02-t07): reorder symlink drift checks in classifyOperation"
```

---

### Task p02-t08: (review) Remove unused path import in compute plan

**Files:**
- Modify: `packages/cli/src/engine/compute-plan.ts`

**Step 1: Understand the issue**

Review finding: `relative` import is unused and triggers lint noise.
Location: `packages/cli/src/engine/compute-plan.ts`

**Step 2: Implement fix**

- Remove unused import(s) and keep module imports lint-clean

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli lint`
Expected: no lint errors from engine module imports

**Step 4: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts
git commit -m "chore(p02-t08): clean unused imports in compute plan"
```

---

### Task p02-t09: (review) Harden inferScopeRoot path normalization

**Files:**
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/execute-plan.test.ts`

**Step 1: Understand the issue**

Review finding: `inferScopeRoot` depends on separator-specific string matching and is fragile across path formats.
Location: `packages/cli/src/engine/execute-plan.ts`

**Step 2: Implement fix**

- Normalize canonical paths before scope-root extraction
- Make marker/prefix detection robust across separator variants
- Add/adjust tests that assert stable scope-root inference with normalized paths

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/execute-plan.test.ts`
Expected: scope-root inference remains deterministic across normalized inputs

**Step 4: Commit**

```bash
git add packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/execute-plan.test.ts
git commit -m "fix(p02-t09): harden inferScopeRoot path normalization"
```

---

### Task p02-t10: (review) Clarify auto strategy planning behavior

**Files:**
- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`

**Step 1: Understand the issue**

Review finding: `auto` resolution behavior is correct but implicit; planning uses symlink-first while runtime may fall back to copy.
Location: `packages/cli/src/engine/compute-plan.ts`

**Step 2: Implement fix**

- Add explicit code comment/documentation in planning logic clarifying `auto` semantics
- Add/update test assertions where useful to lock expected planning behavior

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/compute-plan.test.ts && pnpm --filter=@oat/cli type-check`
Expected: tests and types pass; auto strategy behavior is explicit in code

**Step 4: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts
git commit -m "docs(p02-t10): clarify auto strategy planning behavior"
```

---

### Task p02-t11: (review) Fix copy-mode removal manifest update bug

**Files:**
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/execute-plan.test.ts`
- Modify: `packages/cli/src/engine/engine.integration.test.ts`

**Step 1: Understand the issue**

Review finding: remove-path manifest updates for copy strategy can trigger hash computation on deleted canonical paths, causing partial failure and stale manifest entries.
Location: `packages/cli/src/engine/execute-plan.ts`

**Step 2: Implement fix**

- Avoid content-hash computation for `remove` operations
- Derive only the relative manifest key material needed for `removeEntry`
- Add regression tests for copy-mode removal ensuring provider cleanup + manifest removal both succeed

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/execute-plan.test.ts src/engine/engine.integration.test.ts`
Expected: copy-mode removal path succeeds without stale manifest entries

**Step 4: Commit**

```bash
git add packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/execute-plan.test.ts packages/cli/src/engine/engine.integration.test.ts
git commit -m "fix(p02-t11): remove hash dependency from copy-mode removals"
```

---

## Phase 3: Drift Detection and Output

**Goal:** Drift detector classifies sync state for each mapping. Output formatters render status tables, sync plans, and doctor results. After this phase, `detectDrift` and `detectStrays` are functional and output is formatted for both human and JSON modes.

---

### Task p03-t01: Implement drift detector

**Files:**
- Create: `packages/cli/src/drift/detector.ts`
- Create: `packages/cli/src/drift/drift.types.ts`
- Create: `packages/cli/src/drift/detector.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('detectDrift', () => {
  it('returns missing when provider path absent');
  it('returns in_sync when symlink target matches');
  it('returns drifted:broken when symlink target does not exist');
  it('returns drifted:replaced when provider path is not a symlink');
  it('returns drifted:replaced when symlink target differs');
  it('returns in_sync when copy hash matches');
  it('returns drifted:modified when copy hash differs');
});
```

**Step 2: Implement (GREEN)**

- `DriftState`, `DriftReport` types per design
- `detectDrift(entry, scopeRoot)` — checks provider path existence first (→ missing), then mode-specific checks
- Uses `fs.readlink` + `fs.stat` for symlink mode, `computeDirectoryHash` for copy mode

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/drift/detector`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/drift/
git commit -m "feat(p03-t01): implement drift detector with missing-first check"
```

---

### Task p03-t02: Implement stray detector

**Files:**
- Create: `packages/cli/src/drift/strays.ts`
- Create: `packages/cli/src/drift/strays.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('detectStrays', () => {
  it('returns stray for provider entry not in manifest or canonical');
  it('does not flag manifest-tracked entries as strays');
  it('does not flag canonical entries as strays');
  it('returns empty array when provider dir is empty');
  it('returns empty array when provider dir does not exist');
});
```

**Step 2: Implement (GREEN)**

- `detectStrays(providerDir, manifest, canonicalEntries)` — scan providerDir, filter out known entries, return DriftReport[] with status `stray`

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/drift/strays`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/drift/
git commit -m "feat(p03-t02): implement stray detection"
```

---

### Task p03-t03: Implement output formatters

**Files:**
- Create: `packages/cli/src/ui/output.ts`
- Create: `packages/cli/src/ui/output.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('output formatters', () => {
  it('formatStatusTable renders aligned table with status markers');
  it('formatSyncPlan renders operation list with reasons');
  it('formatSyncPlan indicates dry-run vs applied');
  it('formatDoctorResults renders pass/warn/fail with fixes');
  it('formatProviderDetails renders provider inspection');
});
```

**Step 2: Implement (GREEN)**

- `formatStatusTable(reports)` — renders DriftReport[] as aligned table with ✓/⚠/✗ markers
- `formatSyncPlan(plan, applied)` — renders operation list
- `formatDoctorResults(checks)` — renders check results
- `formatProviderDetails(adapter, detected, version?)` — renders provider detail
- All use `chalk` for coloring, `String.padEnd` for alignment

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/ui/output`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/ui/
git commit -m "feat(p03-t03): implement output formatters for status, sync, doctor"
```

---

### Task p03-t04: Implement shared prompt primitives

**Files:**
- Create: `packages/cli/src/shared/prompts.ts`
- Create: `packages/cli/src/shared/prompts.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('shared prompts', () => {
  it('confirmAction returns true when user confirms');
  it('confirmAction returns false when user declines');
  it('selectWithAbort returns selected option');
  it('selectWithAbort returns null on abort');
});
```

**Step 2: Implement (GREEN)**

- `confirmAction(message, ctx)` — wraps `@inquirer/prompts` confirm; returns false in non-interactive mode
- `selectWithAbort(message, choices, ctx)` — wraps select prompt; throws CliError in non-interactive mode

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/shared/prompts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/shared/
git commit -m "feat(p03-t04): implement shared prompt primitives with non-interactive contract"
```

---

### Task p03-t05: (review) Fix ANSI-aware status table alignment

**Files:**
- Modify: `packages/cli/src/ui/output.ts`
- Modify: `packages/cli/src/ui/output.test.ts`

**Step 1: Understand the issue**

Review finding: `formatStatusTable` width/padding logic uses colorized strings and can misalign columns in TTY mode when ANSI escapes inflate `.length`.
Location: `packages/cli/src/ui/output.ts`

**Step 2: Implement fix**

- Compute state column width from plain text (or ANSI-stripped text), not colorized strings
- Use visual-width-aware padding for table rows so marker + label alignment is stable in colorized output
- Add regression tests asserting aligned table output in both color-enabled and non-color contexts

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/ui/output && pnpm --filter=@oat/cli lint`
Expected: formatter tests pass and lint stays clean

**Step 4: Commit**

```bash
git add packages/cli/src/ui/output.ts packages/cli/src/ui/output.test.ts
git commit -m "fix(p03-t05): correct ANSI-aware status table alignment"
```

---

### Task p03-t06: (review) Normalize manifest path comparison in stray detection

**Files:**
- Modify: `packages/cli/src/drift/strays.ts`
- Modify: `packages/cli/src/drift/strays.test.ts`

**Step 1: Understand the issue**

Review finding: `isManifestTracked` mixes absolute/relative matching with an `endsWith` fallback, which is fragile and can create false positives.
Location: `packages/cli/src/drift/strays.ts`

**Step 2: Implement fix**

- Remove suffix-based path matching
- Normalize compared paths into the same representation (scope-relative, normalized separators)
- If needed, pass `scopeRoot` explicitly through stray detection helpers to produce deterministic relative comparisons
- Add tests that cover relative vs absolute input handling and prevent suffix false positives

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/drift/strays && pnpm --filter=@oat/cli type-check`
Expected: stray detection tests and type-check pass

**Step 4: Commit**

```bash
git add packages/cli/src/drift/strays.ts packages/cli/src/drift/strays.test.ts
git commit -m "fix(p03-t06): normalize manifest path matching in stray detection"
```

---

### Task p03-t07: (review) Replace provider-name path heuristics in stray reports

**Files:**
- Modify: `packages/cli/src/drift/strays.ts`
- Modify: `packages/cli/src/drift/strays.test.ts`
- Modify: `packages/cli/src/drift/drift.types.ts`

**Step 1: Understand the issue**

Review finding: stray detection infers provider name from dot-prefixed path segments (`inferProvider`), which is brittle and environment-dependent.
Location: `packages/cli/src/drift/strays.ts`

**Step 2: Implement fix**

- Refactor `detectStrays` API to accept provider identity from adapter/caller context
- Remove or deprecate heuristic provider inference logic
- Update tests to pass provider name explicitly and assert stable provider attribution

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/drift/strays src/drift/detector`
Expected: drift/stray tests pass with explicit provider context

**Step 4: Commit**

```bash
git add packages/cli/src/drift/strays.ts packages/cli/src/drift/strays.test.ts packages/cli/src/drift/drift.types.ts
git commit -m "fix(p03-t07): remove provider inference heuristics from stray detection"
```

---

### Task p03-t08: (review) Make stray content-type filtering explicit

**Files:**
- Modify: `packages/cli/src/drift/strays.ts`
- Modify: `packages/cli/src/drift/strays.test.ts`

**Step 1: Understand the issue**

Review finding: `inferContentType` fallback to `null` can over-broaden canonical matching by name alone, causing false negatives for future content types.
Location: `packages/cli/src/drift/strays.ts`

**Step 2: Implement fix**

- Avoid name-only fallback matching when content type is unknown
- Use explicit mapping metadata (or an explicit content type parameter) for canonical filtering
- Add defensive behavior for unsupported directory mappings (e.g., skip + annotate reason or debug path)
- Add tests for unknown mapping/content-type behavior

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/drift/strays`
Expected: all stray detector tests pass including unknown-content-type cases

**Step 4: Commit**

```bash
git add packages/cli/src/drift/strays.ts packages/cli/src/drift/strays.test.ts
git commit -m "fix(p03-t08): harden stray content-type filtering semantics"
```

---

### Task p03-t09: (review) Standardize stray report path representation

**Files:**
- Modify: `packages/cli/src/drift/strays.ts`
- Modify: `packages/cli/src/drift/drift.types.ts`
- Modify: `packages/cli/src/drift/strays.test.ts`
- Modify: `packages/cli/src/ui/output.ts`

**Step 1: Understand the issue**

Review finding: `DriftReport.providerPath` is relative for managed drift reports but absolute for stray reports, creating inconsistent downstream formatting behavior.
Location: `packages/cli/src/drift/strays.ts`

**Step 2: Implement fix**

- Choose one canonical representation for `DriftReport.providerPath` (scope-relative preferred per manifest conventions)
- Update stray reports and any dependent formatting/tests to use the unified representation
- Add tests to assert consistent path shape across drift + stray report generation

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/drift src/ui/output && pnpm --filter=@oat/cli type-check`
Expected: drift/output tests pass and path consistency assertions hold

**Step 4: Commit**

```bash
git add packages/cli/src/drift/strays.ts packages/cli/src/drift/drift.types.ts packages/cli/src/drift/strays.test.ts packages/cli/src/ui/output.ts
git commit -m "fix(p03-t09): standardize drift report provider path semantics"
```

---

## Phase 4: Commands — init, status, sync, providers, doctor

**Goal:** Wire up all 5 CLI commands. After this phase the full CLI is functional end-to-end.

---

### Task p04-t01: Implement `oat status` command

**Files:**
- Create: `packages/cli/src/commands/status/index.ts`
- Create: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('createStatusCommand', () => {
  it('reports all in_sync when no drift');
  it('reports drifted entries with reasons');
  it('reports missing entries');
  it('reports strays with remediation text');
  it('outputs JSON when --json flag set');
  it('does not prompt in non-interactive mode');
  it('exits 0 when all in sync');
  it('exits 1 when drift or strays detected');
});
```

**Step 2: Implement (GREEN)**

- `createStatusCommand(): Command` — commander factory
- Action: build context → load manifest → detect providers → run drift detection per adapter → detect strays → format output (human or JSON) → prompt for adoption if interactive
- Non-interactive: include `remediation` field in JSON output

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/status/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/status/
git commit -m "feat(p04-t01): implement oat status command"
```

---

### Task p04-t02: Implement `oat sync` command

**Files:**
- Create: `packages/cli/src/commands/sync/index.ts`
- Create: `packages/cli/src/commands/sync/apply.ts`
- Create: `packages/cli/src/commands/sync/dry-run.ts`
- Create: `packages/cli/src/commands/sync/sync.types.ts`
- Create: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('createSyncCommand', () => {
  it('dry-run: shows plan without making changes');
  it('--apply: creates symlinks and updates manifest');
  it('--apply idempotent: second run reports nothing to do');
  it('handles partial failure gracefully');
  it('outputs JSON plan when --json set');
  it('exits 0 on success, 1 on partial failure');
});
```

**Step 2: Implement (GREEN)**

- `createSyncCommand(): Command` — registers `--apply` flag
- Dry-run path: compute plan → format plan → display
- Apply path: compute plan → execute plan → format results → display

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/sync/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/sync/
git commit -m "feat(p04-t02): implement oat sync command with dry-run and apply"
```

---

### Task p04-t03: Implement `oat init` command

**Files:**
- Create: `packages/cli/src/commands/init/index.ts`
- Create: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('createInitCommand', () => {
  it('creates .agents/skills/ and .agents/agents/ directories');
  it('creates manifest file');
  it('detects strays and prompts for adoption in interactive mode');
  it('skips adoption in non-interactive mode with remediation text');
  it('adoption moves file to .agents/ and creates symlink back');
  it('is idempotent — re-run on initialized repo is no-op');
  it('supports --scope flag');
  it('prompts for git hook consent in interactive mode');
  it('installs hook when user consents');
  it('skips hook in non-interactive mode with guidance text');
  it('does not re-prompt for hook if already installed');
});
```

**Step 2: Implement (GREEN)**

- `createInitCommand(): Command`
- Action: ensure canonical dirs → scan providers for strays → interactive adoption flow → create/update manifest → prompt for hook consent → install hook if consented → report summary
- Hook consent: in interactive mode, ask "Install optional pre-commit hook for drift warnings?" (default: no). If hook already installed, skip prompt.
- Non-interactive: skip prompts (adoption + hook), report strays and hook status with guidance
- Supports `--hook` / `--no-hook` flags to skip the interactive prompt

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/init/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "feat(p04-t03): implement oat init command with adoption flow"
```

---

### Task p04-t04: Implement `oat providers list` command

**Files:**
- Create: `packages/cli/src/commands/providers/index.ts`
- Create: `packages/cli/src/commands/providers/list.ts`
- Create: `packages/cli/src/commands/providers/providers.types.ts`
- Create: `packages/cli/src/commands/providers/list.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('oat providers list', () => {
  it('lists all registered adapters with detection status');
  it('shows sync status summary per provider');
  it('outputs JSON array when --json flag set');
  it('supports --scope flag');
});
```

**Step 2: Implement (GREEN)**

- `createProvidersCommand(): Command` — parent command with `list` and `inspect` subcommands
- `list` action: enumerate adapters → detect each → compute sync summary → format table

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/providers/list`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/providers/
git commit -m "feat(p04-t04): implement oat providers list command"
```

---

### Task p04-t05: Implement `oat providers inspect` command

**Files:**
- Create: `packages/cli/src/commands/providers/inspect.ts`
- Create: `packages/cli/src/commands/providers/inspect.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('oat providers inspect', () => {
  it('shows detailed provider info with path mappings');
  it('shows per-mapping sync state');
  it('shows CLI version when available');
  it('exits 1 when provider name not found');
  it('resolves provider name case-insensitively');
  it('outputs JSON when --json set');
});
```

**Step 2: Implement (GREEN)**

- `inspect` action: resolve adapter by name → detect → load manifest → run drift per mapping → format detail → display
- Uses `formatProviderDetails` from output module

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/providers/inspect`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/providers/
git commit -m "feat(p04-t05): implement oat providers inspect command"
```

---

### Task p04-t06: Implement `oat doctor` command

**Files:**
- Create: `packages/cli/src/commands/doctor/index.ts`
- Create: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('createDoctorCommand', () => {
  it('checks canonical directory existence');
  it('checks manifest existence and validity');
  it('checks symlink creation capability');
  it('checks provider detection and version');
  it('reports pass/warn/fail with fix suggestions');
  it('outputs JSON when --json set');
  it('exits 0 for all pass, 1 for warnings, 2 for failures');
});
```

**Step 2: Implement (GREEN)**

- `createDoctorCommand(): Command`
- Action: run check suite → format results → display
- Checks: canonical dir, manifest, symlink test, provider detection, provider structure

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/doctor/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/
git commit -m "feat(p04-t06): implement oat doctor command with diagnostic checks"
```

---

### Task p04-t07: Register all commands and update entrypoint

**Files:**
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/app/create-program.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Write test (RED)**

```typescript
describe('command registration', () => {
  it('program has init command');
  it('program has status command');
  it('program has sync command');
  it('program has providers command with list and inspect');
  it('program has doctor command');
  it('--help shows all commands');
});
```

**Step 2: Implement (GREEN)**

- Update `commands/index.ts` to import and register all `createXCommand()` factories
- Update `create-program.ts` to wire everything together
- Update `index.ts` to be the thin bootstrap entrypoint

**Step 3: Verify**

Run:
```bash
pnpm --filter=@oat/cli build && node packages/cli/dist/index.js --help
pnpm --filter=@oat/cli test
```
Expected: Help shows all 5 commands. All tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(p04-t07): register all commands in CLI entrypoint"
```

---

### Task p04-t08: Integration test — full command flows

**Files:**
- Create: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('CLI command integration', () => {
  it('init → status → sync → status: full workflow');
  it('init on empty repo creates directories and empty manifest');
  it('sync --apply creates symlinks for all detected providers');
  it('status --json outputs valid JSON with no prompts');
  it('doctor on healthy setup reports all pass');
  it('providers list shows all registered adapters');
  it('idempotency: init + sync twice produces same state');
});
```

**Step 2: Implement (GREEN)**

Integration tests execute actual commands against temp directory setups. Assert filesystem state and command output.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/commands.integration`
Expected: All integration tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/
git commit -m "test(p04-t08): add CLI command integration tests"
```

---

### Task p04-t09: (review) Fix hook install to produce executable script

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Understand the issue**

Review finding: Hook file created by `oat init --hook` is non-functional because a new hook may be written without a shebang and without executable permissions.
Location: `packages/cli/src/commands/init/index.ts`

**Step 2: Implement fix**

- Ensure new pre-commit hook content starts with `#!/bin/sh` when bootstrapping an empty hook file.
- After writing the hook file, set executable permissions (`chmod 0o755`) so Git executes it.
- Keep append behavior idempotent for existing hooks.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/init/`
Expected: init tests pass and hook install tests assert shebang + executable mode behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "fix(p04-t09): make installed pre-commit hook executable"
```

---

### Task p04-t10: (review) Preserve drift warning output in installed hook

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Understand the issue**

Review finding: Installed hook suppresses all `oat status` output (`>/dev/null 2>&1`), violating warning visibility requirements.
Location: `packages/cli/src/commands/init/index.ts`

**Step 2: Implement fix**

- Update generated hook snippet to keep warning output visible while remaining non-blocking (`|| true`).
- Ensure the hook message clearly guides remediation (`oat sync --apply`) when drift is detected.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/init/`
Expected: tests pass and hook snippet assertions confirm drift warnings are not fully suppressed.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "fix(p04-t10): surface drift warnings from pre-commit hook"
```

---

### Task p04-t11: (review) Implement per-stray adoption flow in `oat status`

**Files:**
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Understand the issue**

Review finding: `oat status` does not perform per-stray interactive adoption and only redirects to `oat init`, which deviates from FR8.
Location: `packages/cli/src/commands/status/index.ts`

**Step 2: Implement fix**

- Add per-stray interactive adoption handling in `status` for interactive mode.
- Reuse existing adoption mechanics used by `init` (move to canonical + recreate provider view) or extract shared logic if needed.
- Keep non-interactive behavior unchanged (no prompts, include remediation guidance).

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/status/`
Expected: tests pass, including coverage for per-stray prompt/adopt/skip behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/status/
git commit -m "fix(p04-t11): add per-stray adoption support to oat status"
```

---

### Task p04-t12: (review) Add provider strategy/content metadata to `providers list`

**Files:**
- Modify: `packages/cli/src/commands/providers/list.ts`
- Modify: `packages/cli/src/commands/providers/providers.types.ts`
- Modify: `packages/cli/src/commands/providers/list.test.ts`

**Step 1: Understand the issue**

Review finding: `providers list` output is missing `defaultStrategy` and `contentTypes`, which are required by FR12.
Location: `packages/cli/src/commands/providers/providers.types.ts`, `packages/cli/src/commands/providers/list.ts`

**Step 2: Implement fix**

- Extend provider list item contracts to include `defaultStrategy` and supported `contentTypes`.
- Populate new fields from adapter metadata.
- Surface fields in both human and JSON output paths.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/providers/list`
Expected: tests pass and assert strategy/content-type presence in outputs.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/providers/
git commit -m "fix(p04-t12): include strategy and content types in providers list"
```

---

### Task p04-t13: (review) Add JSON summary output to `oat init`

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Understand the issue**

Review finding: `oat init --json` currently emits no structured output.
Location: `packages/cli/src/commands/init/index.ts`

**Step 2: Implement fix**

- Add JSON-mode summary emission at the end of init execution.
- Include key fields: scope, directory initialization result, stray counts/adoptions, and hook status.
- Ensure human output behavior is unchanged.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/init/`
Expected: tests pass with explicit assertions for `--json` output payload.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "fix(p04-t13): add json summary output for oat init"
```

---

## Phase 5: Git Hook, Polish, and E2E

**Goal:** Optional git hook, edge case handling, contract tests, and full e2e workflow tests. After this phase the CLI is ready for initial release.

---

### Task p05-t01: Implement git pre-commit hook

**Files:**
- Create: `packages/cli/src/engine/hook.ts`
- Create: `packages/cli/src/engine/hook.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('git hook', () => {
  it('installHook creates hook file in .git/hooks/');
  it('installHook preserves existing hook content');
  it('installHook is idempotent — does not duplicate OAT section');
  it('uninstallHook removes OAT section only');
  it('uninstallHook is no-op when hook not installed');
  it('isHookInstalled detects existing OAT hook section');
  it('runHookCheck returns drift warnings');
  it('runHookCheck does not block (warning only)');
});
```

**Step 2: Implement (GREEN)**

- `installHook(gitDir)` — appends OAT section to `.git/hooks/pre-commit` (idempotent)
- `uninstallHook(gitDir)` — removes only the OAT-marked section (no-op if absent)
- `isHookInstalled(gitDir)` — returns boolean for consent-flow gating in `oat init`
- `runHookCheck(cwd)` — runs quick drift detection, prints warning to stderr

> **Integration with `oat init`:** p04-t03 calls `installHook`/`isHookInstalled` from this module. Uninstall is exposed via `oat init --no-hook` (removes existing hook if present).

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/hook`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/engine/
git commit -m "feat(p05-t01): implement optional git pre-commit hook"
```

---

### Task p05-t02: Handle edge cases

**Files:**
- Modify: various engine/manifest/drift files
- Create: `packages/cli/src/engine/edge-cases.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('edge cases', () => {
  it('handles empty .agents/ directory gracefully');
  it('handles permission denied on provider dir');
  it('recovers from corrupt manifest with clear error message');
  it('handles concurrent manifest read/write safely');
  it('handles .agents/skills/ with nested non-directory entries');
});
```

**Step 2: Implement (GREEN)**

Add defensive checks to existing modules:
- Empty canonical dirs → report "nothing to sync"
- Permission errors → CliError with fix guidance
- Corrupt manifest → CliError with `"delete manifest and re-run oat sync"` message
- Non-directory entries in skills/agents dirs → skip with debug log

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/engine/edge-cases`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "fix(p05-t02): handle edge cases in engine, manifest, and drift"
```

---

### Task p05-t03: Contract tests for adapter conformance

**Files:**
- Create: `packages/cli/src/providers/shared/adapter-contract.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('adapter contract', () => {
  // Reusable test suite run against each adapter
  for (const adapter of [claudeAdapter, cursorAdapter, codexAdapter]) {
    describe(adapter.displayName, () => {
      it('has a non-empty name');
      it('has a non-empty displayName');
      it('has valid defaultStrategy');
      it('projectMappings have valid contentType and paths');
      it('userMappings have valid contentType and paths');
      it('detect function is callable');
    });
  }
});
```

**Step 2: Implement (GREEN)**

Reusable assertion suite that validates the ProviderAdapter interface contract across all adapters.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/providers/shared/adapter-contract`
Expected: All adapters pass contract tests

**Step 4: Commit**

```bash
git add packages/cli/src/providers/shared/
git commit -m "test(p05-t03): add adapter contract conformance tests"
```

---

### Task p05-t04: Snapshot tests for help output

**Files:**
- Create: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('help output snapshots', () => {
  it('root --help matches snapshot');
  it('init --help matches snapshot');
  it('status --help matches snapshot');
  it('sync --help matches snapshot');
  it('providers --help matches snapshot');
  it('providers list --help matches snapshot');
  it('doctor --help matches snapshot');
});
```

**Step 2: Implement (GREEN)**

Execute `program.helpInformation()` for each command, assert against vitest inline snapshots.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/commands/help-snapshots`
Expected: Snapshots created on first run, match on subsequent runs

**Step 4: Commit**

```bash
git add packages/cli/src/commands/
git commit -m "test(p05-t04): add help output snapshot tests"
```

---

### Task p05-t05: End-to-end workflow tests

**Files:**
- Create: `packages/cli/src/e2e/workflow.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('e2e workflow', () => {
  it('fresh repo: init → sync → providers list → status (all in sync)');
  it('drift scenario: sync → modify provider file → status reports drift → sync fixes it');
  it('adoption: create provider-local skill → init detects and adopts');
  it('copy fallback: force copy strategy → sync creates copies with hashes');
  it('removal: delete canonical → sync removes provider view');
});
```

**Step 2: Implement (GREEN)**

Full end-to-end tests that exercise the complete CLI workflow in temp directories. Each test seeds a realistic repo structure and runs the full command sequence.

**Step 3: Verify**

Run: `pnpm --filter=@oat/cli test src/e2e/`
Expected: All e2e tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/e2e/
git commit -m "test(p05-t05): add end-to-end workflow tests"
```

---

### Task p05-t06: Final verification and build polish

**Files:**
- Modify: `packages/cli/package.json` (bin entry verification)

**Step 1: Full verification**

Run:
```bash
pnpm --filter=@oat/cli test
pnpm --filter=@oat/cli type-check
pnpm --filter=@oat/cli lint
pnpm --filter=@oat/cli build
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js doctor
```

Expected:
- All tests pass (unit + integration + e2e)
- Type-check clean
- Lint clean
- Build succeeds
- `oat --help` shows all commands
- `oat doctor` runs diagnostic checks

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(p05-t06): final verification — CLI ready for initial release"
```

---

## Reviews

{Track reviews here after running /oat:request-review and /oat:receive-review.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | passed | 2026-02-13 | reviews/p01-re-review-2026-02-13.md |
| p02 | code | passed | 2026-02-13 | reviews/p02-re-review-2026-02-13.md |
| p03 | code | passed | 2026-02-13 | reviews/p03-re-review-2026-02-13.md |
| p04 | code | fixes_added | 2026-02-14 | reviews/p04-code-review.md |
| p05 | code | pending | - | - |
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

## Planned Scope Summary

- Phase 1: 31 tasks — Foundation (scaffold, types, logger, commander, adapters, manifest, scanner, config, fs helpers, review fixes)
- Phase 2: 11 tasks — Sync Engine (plan types, compute plan, execute plan, markers, integration tests, review fixes)
- Phase 3: 9 tasks — Drift Detection and Output (drift detector, stray detector, output formatters, shared prompts, review fixes)
- Phase 4: 13 tasks — Commands (status, sync, init, providers list, providers inspect, doctor, registration, integration tests, review fixes)
- Phase 5: 6 tasks — Git Hook, Polish, and E2E (hook, edge cases, contract tests, snapshot tests, e2e tests, final verification)

**Total: 70 tasks**

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- CLI structure proposal: `reviews/cli-structure-proposal.md`
- Design review: `reviews/design-review.md`
