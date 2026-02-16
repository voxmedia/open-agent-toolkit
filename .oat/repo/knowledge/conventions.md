---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

# Coding Conventions

**Analysis Date:** 2026-02-16

## Naming Patterns

**Files:**
- kebab-case for file names (e.g., `sync-config.ts`, `command-context.ts`)
- Module files use descriptive names (e.g., `logger.ts`, `spinner.ts`)
- Test files follow source file naming with `.test.ts` suffix (e.g., `logger.test.ts`)
- Index files use `index.ts` as barrel exports for modules

**Functions:**
- camelCase for function names (e.g., `createLogger`, `computeDirectoryHash`, `getActiveAdapters`)
- Factory functions use `create*` prefix (e.g., `createProgram`, `createSpinner`, `createLogger`)
- Detect functions use `detect*` prefix (e.g., `detectCursor`, `detectClaude`)
- Async functions follow camelCase convention (e.g., `loadManifest`, `loadSyncConfig`)

**Variables:**
- camelCase for variables and constants (e.g., `workDir`, `manifestPath`, `scopeRoot`)
- Constant values (configuration) use UPPER_SNAKE_CASE when exported (e.g., `PROGRAM_NAME`, `SCOPE_CHOICES`, `PROJECT_SCOPE_CONTENT_TYPES`)
- Use descriptive names: `accumulated` arrays, `detected` results, `resolved` paths

**Types:**
- PascalCase for type and interface names (e.g., `CliLogger`, `CommandContext`, `ProviderAdapter`)
- Schemas and validators use `*Schema` suffix (e.g., `ManifestSchema`, `SyncConfigSchema`)
- Union types use PascalCase (e.g., `Scope`, `ContentType`, `SyncStrategy`)
- Optional types wrapped in `Partial<T>` or nullable fields explicitly typed

## Code Style

**Formatting:**
- Tool: Biome 2.3.11
- Indentation: 2 spaces
- Line width: 80 characters
- Line ending: LF (Unix)
- Quote style: Single quotes for JavaScript (e.g., `'hello'`)
- Trailing commas: All (including function parameters)
- Semicolons: Always required
- Arrow function parentheses: Always (e.g., `(x) => x`)
- Bracket spacing: Enabled (e.g., `{ key: value }`)

**Linting:**
- Tool: Biome 2.3.11
- Base: recommended rule set
- Key rules enforced:
  - `noUnusedVariables` (error): All variables must be used
  - `useConst` (error): Prefer `const` over `let`
  - `noDoubleEquals` (error): Use strict equality (`===`)
  - `noDebugger` (error): No debugger statements
  - `noExplicitAny` (warn): Avoid `any` types (relaxed in test files)
  - `noUndeclaredVariables` (error): All variables must be declared
  - `noUnreachable` (error): No unreachable code
- Test override: `noExplicitAny` disabled in `*.test.ts` files for flexibility with mocks

## Import Organization

**Order:**
1. Node.js built-in imports (e.g., `import { readFile } from 'node:fs/promises'`)
2. External packages (e.g., `import chalk from 'chalk'`, `import { z } from 'zod'`)
3. Type imports from internal modules (e.g., `import type { Manifest } from '@manifest/manifest.types'`)
4. Internal imports (e.g., `import { CliError } from '@errors/index'`)
5. Relative imports from same directory or parent (use explicit aliases instead)

**Path Aliases:**
- Mandatory: All imports outside current directory use TypeScript path aliases
- Never use relative paths (`../...`) or `src/...` imports
- Standard aliases defined per package:
  - `@ui/*` → `src/ui/*`
  - `@config/*` → `src/config/*`
  - `@errors/*` → `src/errors/*`
  - `@manifest/*` → `src/manifest/*`
  - `@providers/*` → `src/providers/*`
  - `@shared/*` → `src/shared/*`
  - `@app/*` → `src/app/*`
  - `@commands/*` → `src/commands/*`
  - `@drift/*` → `src/drift/*`
  - `@engine/*` → `src/engine/*`
  - `@fs/*` → `src/fs/*`
  - `@validation/*` → `src/validation/*`
- Biome's `organizeImports` assist (enabled) auto-sorts imports

## Error Handling

**Patterns:**
- Custom error class: `CliError` extends `Error` with optional `exitCode` (1 or 2)
- Error throwing: Always throw `CliError` with descriptive message for user-facing errors
- Exit codes: `1` (default) for general errors, `2` for fatal/unrecoverable errors
- Try-catch with type guards: Check error structure explicitly
  ```typescript
  try { /* async work */ }
  catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      throw new CliError(`File not found: ${path}`);
    }
    throw new CliError(
      `Operation failed: ${error instanceof Error ? error.message : 'unknown'}`,
      2,
    );
  }
  ```
- Never silently swallow errors; always log or re-throw with context
- Schema validation errors: Use Zod's `safeParse()` and extract error details

## Logging

**Framework:** Custom `CliLogger` interface with `createLogger` factory

**Patterns:**
- Info messages: stdout, cyan color (user-facing status)
- Warn messages: stderr, yellow color (non-critical issues)
- Error messages: stderr, red color (failures); JSON mode outputs structured data to stderr
- Success messages: stdout, green color (positive outcomes)
- Debug messages: stdout, gray color; only shown with `--verbose` flag
- JSON output: Pretty-printed to stdout (2-space indentation)
- Never mix styled output in JSON mode (JSON mode outputs machine-readable data only)

## Comments

**When to Comment:**
- Document non-obvious algorithm choices or workarounds
- Explain WHY, not WHAT (code should express WHAT clearly)
- Mark TODO/FIXME items with rationale
- Avoid redundant comments that restate code

**JSDoc/TSDoc:**
- Optional for public functions and exports
- Required for complex type parameters or overloads
- Example:
  ```typescript
  /**
   * Computes deterministic SHA-256 hash of directory contents.
   * Hash is stable regardless of readdir filesystem order.
   */
  export async function computeDirectoryHash(dirPath: string): Promise<string> { /* ... */ }
  ```

## Function Design

**Size:** 
- Prefer small, focused functions (< 50 lines typical)
- Extract helper functions for reusable logic
- Example: `collectFiles()` extracted from `computeDirectoryHash()`

**Parameters:**
- Maximum 3-4 positional parameters; use object/interface for more
- Use type-safe options interfaces for configuration
  ```typescript
  interface CreateLoggerOptions {
    json: boolean;
    verbose: boolean;
  }
  export function createLogger(options: CreateLoggerOptions): CliLogger { /* ... */ }
  ```

**Return Values:**
- Prefer explicit return types on public functions
- Use TypeScript inference for small helpers
- Return early to reduce nesting
- Async functions return `Promise<T>`

## Module Design

**Exports:**
- Export both types (`export type`) and values (`export const`, `export function`)
- Explicitly export what's public; don't use catch-all exports
- Factory functions are primary public API (e.g., `createLogger`)
- Implementation details kept private (no export)

**Barrel Files:**
- Canonical pattern: `index.ts` re-exports types and key functions from module
- Example (`src/ui/index.ts`):
  ```typescript
  export type { CliLogger } from './logger';
  export { createLogger } from './logger';
  export type { Spinner } from './spinner';
  export { createSpinner } from './spinner';
  ```
- Enables clean imports: `import { createLogger } from '@ui'` instead of `@ui/logger`

---

*Convention analysis: 2026-02-16*
