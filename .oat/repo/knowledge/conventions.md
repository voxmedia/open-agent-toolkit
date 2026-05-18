---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Coding Conventions

**Analysis Date:** 2026-05-17

## Naming Patterns

**Files:**

- Source files and test files use `camelCase` names: `logger.ts`, `create-program.ts`, `sync-config.ts`
- Test files follow the pattern `<module>.test.ts` and are colocated with source files in the same directory (`packages/cli/src/ui/logger.test.ts`, `packages/cli/src/ui/spinner.test.ts`)
- Type definition files named with `.types.ts` suffix: `packages/cli/src/manifest/manifest.types.ts`, `packages/cli/src/drift/drift.types.ts`
- Utility/helper modules use descriptive names: `command-context.ts`, `create-logger.ts`, `bundle-consistency.test.ts`

**Functions:**

- Factory/creation functions use `create*` or `build*` prefix: `createProgram()` (`packages/cli/src/app/create-program.ts`), `createLogger()` (`packages/cli/src/ui/logger.ts`), `buildCommandContext()` (`packages/cli/src/app/command-context.ts`), `createSpinner()` (`packages/cli/src/ui/spinner.ts`)
- Helper/utility functions use descriptive verbs: `normalizeArgv()`, `stateLabel()`, `serializeMeta()` (see `packages/cli/src/ui/logger.ts`)
- Async functions return `Promise<T>` with no special naming prefix (distinction is by type signature)
- Private functions typically use `camelCase` with lowercase start (example: `writeStdout()`, `writeStderr()` in `packages/cli/src/ui/logger.ts`)

**Variables:**

- `camelCase` for local variables and parameters: `json`, `verbose`, `cwd`, `repoRoot`, `projectDir`
- `UPPER_SNAKE_CASE` for compile-time constants: `PROGRAM_NAME`, `PROGRAM_DESCRIPTION`, `SCOPE_CHOICES` (see `packages/cli/src/app/create-program.ts`)
- Boolean variables/parameters often prefixed with `is*` or `has*`: `interactive`, `dryRun`
- Array variables use plural names: `tempDirs`, `options`, `entries`

**Types:**

- Interfaces named with `PascalCase`: `CliLogger`, `CommandContext`, `GlobalOptions`, `DoctorCheck`, `Spinner` (see `packages/cli/src/ui/logger.ts`, `packages/cli/src/app/command-context.ts`)
- Type aliases use `PascalCase`: `CheckStatus`, `ResolvedConfigSource`, `WorkflowHillCheckpointDefault`
- Interface names often reflect their purpose: `<Domain><Purpose>Config`, `<Action><Result>Options`, `<Entity><Descriptor>`
- No `I` prefix convention for interfaces (example: `CliLogger` not `ICliLogger`)

## Code Style

**Formatting:**

- Tool: `oxfmt` (v0.36.0+)
- Configuration: `.oxfmtrc.jsonc`
- Key settings:
  - Print width: 80 characters
  - Indentation: 2 spaces (not tabs)
  - Semicolons: enabled
  - Quotes: single quotes for JS/TS (`'string'`), single quotes in JSX (`jsxSingleQuote: true`)
  - Trailing commas: all (even in function parameters)
  - Arrow function parens: always (even single params)
  - Line ending: LF
  - Import sorting: enabled
  - JSON formatting: enabled (via `oxfmt`)
  - Markdown formatting: enabled (via `oxfmt`)
- Run locally: `pnpm format` to check, `pnpm format:fix` to auto-fix
- Git hooks enforce formatting via `lint-staged` on `*.{ts,tsx,js,jsx,json,md}` files

**Linting:**

- Tool: `oxlint` (v1.51.0+)
- Configuration: `.oxlintrc.json`
- Key rules:
  - Correctness violations: **error**
  - Suspicious patterns: **error**
  - `eslint/prefer-const`: error
  - `eslint/prefer-template`: error (enforce template literals over string concatenation)
  - `eslint/eqeqeq`: error with `"smart"` mode (allow `==` for null checks)
  - `eslint/no-empty`: error
  - `typescript/no-explicit-any`: warning (relaxed in test files)
  - `typescript/no-non-null-assertion`: off (allows `!` operator)
  - `typescript/no-extra-non-null-assertion`: off
  - `typescript/no-unnecessary-type-constraint`: error
  - Test files (`.test.ts`, `.spec.ts`) exempt from `no-explicit-any` and `no-unsafe-optional-chaining` rules
- Run locally: `pnpm lint` to check, `pnpm lint:fix` to auto-fix
- Git pre-commit hooks run `oxlint --fix` via lint-staged on staged files
- Language targets: `node: true`, `es2024: true` environment

## Import Organization

**Order:**

1. Node.js built-in imports (`import { ... } from 'node:...'`)
2. Third-party dependencies (`import chalk from 'chalk'`)
3. TypeScript aliases (`import type { ... } from '@ui/...'`, `import { createLogger } from '@config/...'`)
4. Relative imports (`./.../`) — not used in CLI source per convention (see below)

Evidence from files:

- `packages/cli/src/ui/logger.ts`: Node imports, then third-party (chalk), then no local imports
- `packages/cli/src/app/command-context.ts`: Node imports, then third-party, then aliases
- `packages/cli/src/config/sync-config.ts`: Node imports, third-party (zod), then aliases

**Path Aliases:**

Defined in `packages/cli/tsconfig.json`:

- `@app/*` → `src/app/*`
- `@commands/*` → `src/commands/*`
- `@config/*` → `src/config/*`
- `@drift/*` → `src/drift/*`
- `@engine/*` → `src/engine/*`
- `@errors/*` → `src/errors/*`
- `@fs/*` → `src/fs/*`
- `@manifest/*` → `src/manifest/*`
- `@providers/*` → `src/providers/*`
- `@agents/*` → `src/agents/*`
- `@rules/*` → `src/rules/*`
- `@shared/*` → `src/shared/*`
- `@ui/*` → `src/ui/*`
- `@validation/*` → `src/validation/*`

**Import Convention Policy:**

Per `packages/cli/AGENTS.md`:

- Use only `./...` relative imports for modules in the same directory
- Use TypeScript aliases for anything outside the current directory
- **Never use** `../...` parent-relative imports
- **Never use** `src/...` absolute path imports
- **Never use** catch-all aliases like `@/*`

## Error Handling

**Patterns:**

- Custom error class: `CliError` extends `Error` (`packages/cli/src/errors/cli-error.ts`)
- `CliError` takes:
  - `message: string` (required)
  - `exitCode: 1 | 2` (optional, defaults to 1)
  - Exit code 1 = actionable user error
  - Exit code 2 = system/runtime error
- Example usage:
  ```typescript
  throw new CliError('bad input', 2); // system error
  throw new CliError('user provided invalid value'); // defaults to exit code 1
  ```
- Schema validation errors use `zod` with custom error messages: `SyncConfigSchema.parse(data)` throws `ZodError`
- File I/O errors propagate as-is (not wrapped)
- Async functions do not suppress errors; they propagate naturally through `Promise` chain
- Error handling in tests: use `expect(() => { ... }).not.toThrow()` or `expect(() => { ... }).toThrow(...)`

## Logging

**Framework:** Custom `CliLogger` implementation (not `console` directly)

**Patterns:**

- All CLI output routed through injected `CliLogger` instance (from `@ui/logger` via `CommandContext`)
- Logger methods:
  - `debug(message, meta?)`: Gray text to stdout (only when `--verbose`)
  - `info(message, meta?)`: Cyan text to stdout
  - `warn(message, meta?)`: Yellow text to stderr
  - `error(message, meta?)`: Red text to stderr
  - `success(message, meta?)`: Green text to stdout
  - `json(payload)`: Pretty-printed JSON to stdout (2-space indent)
- When `--json` flag passed: info/warn/success messages suppressed, errors output as structured JSON objects
- Metadata (second parameter) is optional and serialized as JSON inline: `logger.info('msg', { code: 'E_TEST' })`
- Never use direct `console.*` calls in commands; always use injected logger

Evidence: `packages/cli/src/ui/logger.ts` implements this pattern; `packages/cli/src/ui/logger.test.ts` validates behavior.

## Comments

**When to Comment:**

- JSDoc/TSDoc blocks for public functions and types (especially those exported from modules)
- Inline comments for complex logic or non-obvious intent (not for obvious code)
- "Why" comments preferred over "what" comments (the code shows what, comments explain why)

**JSDoc/TSDoc:**

- Used extensively for public APIs and complex functions
- Example patterns from codebase:

  ```typescript
  /**
   * Single source of truth for all bundled skill/asset lists per pack.
   *
   * Runtime installers and tests import from here.
   * `bundle-assets.sh` maintains its own bash array — `bundle-consistency.test.ts`
   * validates that it stays in sync with these lists.
   */
  export const SKILL_MANIFEST = { ... }
  ```

  (from `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`)

- `@internal` tag used to mark exported functions that are internal implementation details (example: `packages/cli/src/commands/tools/update/index.ts`)
- Parameter and return types documented when not self-evident

## Function Design

**Size:** Functions kept relatively short and focused

- Small utility functions (3-20 lines): trivial helpers like `stripAnsi()`, `stateLabel()` (see `packages/cli/src/ui/ansi.ts`, `packages/cli/src/ui/output.ts`)
- Medium functions (20-50 lines): feature implementations like `createLogger()` (see `packages/cli/src/ui/logger.ts`)
- Larger functions (50+ lines): complex logic broken into helpers or refactored into separate modules

**Parameters:**

- Keep parameter count low (3-5 typical)
- When many options needed, use an options object: `interface CreateLoggerOptions { json: boolean; verbose: boolean }`
- Use destructuring to extract options in function body
- Optional parameters use `?:` syntax in interface definitions

**Return Values:**

- Functions return specific types (not `any`)
- Async functions return `Promise<T>` where `T` is the specific result type
- Functions that don't return a value explicitly return `void`
- Error conditions throw `CliError` (not return error objects)

## Module Design

**Exports:**

- One primary export per module when possible
- Factory functions exported as named exports: `export function createLogger(...) { ... }`
- Types/interfaces exported as named exports: `export interface CliLogger { ... }`
- Barrel files (`index.ts`) re-export related functionality: `export { createLogger }; export type { CliLogger };`
- Use explicit `export type { ... }` for types to enable tree-shaking

Evidence: `packages/cli/src/ui/index.ts` exports both types and implementations:

```typescript
export type { CliLogger } from './logger';
export { createLogger } from './logger';
export type { Spinner } from './spinner';
export { createSpinner } from './spinner';
```

**Barrel Files:**

- Used at domain boundaries to control public API surface
- Example: `packages/cli/src/ui/index.ts` exposes logger, spinner, output formatters
- `packages/cli/src/config/index.ts` exposes config management functions
- Barrel files simplify imports: `import { createLogger } from '@ui'` instead of `import { createLogger } from '@ui/logger'`

---

_Convention analysis: 2026-05-17_
