---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Coding Conventions

**Analysis Date:** 2026-08-30

## Naming Patterns

**Files:**

- TypeScript source files use lowercase kebab-case names such as `packages/cli/src/commands/backlog/regenerate-index.ts` and `packages/cli/src/commands/backlog/shared/generate-id.ts`.
- Tests are co-located and use role suffixes: `*.test.ts`, `*.integration.test.ts`, and `*.readdir-order.test.ts`; grouped test helpers may live below `__tests__/`, as in `packages/cli/src/projects/split/__tests__/validation.test.ts`.
- Command registration boundaries commonly use `index.ts`, while dedicated implementation files retain descriptive names; this is prescribed and exemplified by `apps/oat-docs/docs/contributing/design-principles.md` and `packages/cli/src/commands/backlog/index.ts`.

**Functions:**

- Functions use camelCase and usually verb-led names: `fileExists`, `copyDirectory`, and `atomicWriteJson` in `packages/cli/src/fs/io.ts`; command factories use `createXCommand`, for example `createBacklogCommand` in `packages/cli/src/commands/backlog/index.ts`.
- Async functions declare `Promise<...>` return types in production code, for example `resolveProjectRoot(cwd: string): Promise<string>` in `packages/cli/src/fs/paths.ts`.

**Variables:**

- Local variables use camelCase; constants use camelCase for values (`DEFAULT_DEPENDENCIES` is an exception for a module-level constant object) and UPPER_SNAKE_CASE for environment/configuration constants such as `OAT_ASSETS_DIR` in `packages/cli/vitest.config.ts`.
- Boolean predicates read as questions, such as `isFile`, `isAbsolute`, and `isConsumer` in `packages/cli/src/fs/io.ts` and `packages/cli/src/e2e/workflow.test.ts`.

**Types:**

- Interfaces and classes are PascalCase (`CommandContext`, `CliLogger`, `CliError`), while unions use expressive PascalCase aliases such as `LinkStrategy`; see `packages/cli/src/app/command-context.ts`, `packages/cli/src/ui/logger.ts`, and `packages/cli/src/fs/io.ts`.
- Narrow string unions and derived types model finite states, for example `ScopeSelectionMode` in `packages/cli/src/app/command-context.ts` and `BacklogItemStatus` in `packages/cli/src/commands/backlog/shared/item-status.ts`.

## Code Style

**Formatting:**

- `oxfmt` is the formatter. `.oxfmtrc.jsonc` sets 80-column output, two spaces, semicolons, single quotes, trailing commas, and parenthesized arrow parameters.
- Imports are automatically sorted by the formatter (`"sortImports": {}` in `.oxfmtrc.jsonc`); staged TypeScript, JSON, and Markdown files are formatted through `.lintstagedrc.mjs`.

**Linting:**

- `oxlint` runs correctness and suspicious categories as errors and enables TypeScript rules in `.oxlintrc.json`; `prefer-const`, `prefer-template`, strict equality, and no-floating/misused-promises are enforced there.
- `any` is a warning in production but explicitly permitted in `*.test.ts` and `*.spec.ts` overrides in `.oxlintrc.json`.
- Package scripts apply an additional type-aware `oxlint` pass to production sources while excluding tests, for example `packages/cli/package.json`.

## Import Organization

**Order:**

1. Node built-in imports, for example `node:fs/promises` in `packages/cli/src/fs/io.ts`.
2. External package imports, for example `vitest` in `packages/cli/src/fs/io.test.ts`.
3. Workspace aliases, for example `@config/oat-config` in `packages/cli/src/config/resolve.test.ts`.
4. Same-directory relative imports, for example `./resolve` in `packages/cli/src/config/resolve.test.ts`.

**Path Aliases:**

- CLI aliases include `@app`, `@commands`, `@config`, `@engine`, `@errors`, `@fs`, `@providers`, `@shared`, `@ui`, and `@validation`, defined in `packages/cli/tsconfig.json` and mirrored for test resolution in `packages/cli/vitest.config.ts`.
- Same-directory imports use `./...`; `apps/oat-docs/docs/contributing/design-principles.md` specifies aliases for paths outside the current directory and prohibits parent-relative and catch-all aliases.

## Error Handling

**Patterns:**

- User/actionable and runtime failures use `CliError`, whose exit code is constrained to `1 | 2` in `packages/cli/src/errors/cli-error.ts`.
- Command handlers convert `unknown` errors to user-facing messages, select JSON or human output, and set `process.exitCode`; see `reportError` in `packages/cli/src/commands/backlog/index.ts`.
- Filesystem predicate helpers deliberately catch expected access/missing-file failures and return `false`, as implemented by `fileExists` and `dirExists` in `packages/cli/src/fs/io.ts`.
- Fallback behavior remains explicit: `createSymlink` calls an optional error callback, removes the unusable link, copies the target, and returns `'copy'` in `packages/cli/src/fs/io.ts`.

## Logging

**Framework:** Centralized `CliLogger` in `packages/cli/src/ui/logger.ts`.

**Patterns:**

- Command contexts construct the logger once through `buildCommandContext` in `packages/cli/src/app/command-context.ts`.
- Human output uses `info`, `warn`, `error`, `success`, and verbose-only `debug`; JSON mode suppresses human messages and emits JSON through `json` or an error payload in `packages/cli/src/ui/logger.ts`.
- CLI design guidance says command handlers use this logger instead of direct `console` calls in `apps/oat-docs/docs/contributing/design-principles.md`.

## Comments

**When to Comment:**

- Comments explain non-obvious behavior, constraints, or safety rationale. `packages/cli/src/fs/io.ts` documents why `chmod` follows `writeFile` and why symlink targets are made relative.
- Test configuration documents environment isolation: `packages/cli/vitest.config.ts` explains neutralizing ambient `OAT_ASSETS_DIR`.

**JSDoc/TSDoc:**

- TSDoc is used for exported contracts when semantics need explanation, such as the multi-mode `ScopeSelectionMode` documentation in `packages/cli/src/app/command-context.ts`; routine exported functions rely on clear types and names, as in `packages/cli/src/fs/io.ts`.

## Function Design

**Size:**

- Commands are intended to be thin orchestration layers; `apps/oat-docs/docs/contributing/design-principles.md` directs business logic to domain modules. `packages/cli/src/commands/backlog/index.ts` delegates to dependency functions and command-specific modules.

**Parameters:**

- Public operations use typed options/dependency objects for multi-input behavior, for example `ResolveEffectiveConfigDependencies` in `packages/cli/src/config/resolve.ts` and the optional `filter` callback in `packages/cli/src/fs/io.ts`.
- Defaults are expressed in parameters or module-level dependency objects, such as `sourceRoot = src` and `DEFAULT_DEPENDENCIES` in `packages/cli/src/fs/io.ts` and `packages/cli/src/config/resolve.ts`.

**Return Values:**

- Operations return explicit values or typed result objects rather than side-channel data: `createSymlink` returns `Promise<LinkStrategy>` and config resolution returns `Promise<ResolvedConfig>` in `packages/cli/src/fs/io.ts` and `packages/cli/src/config/resolve.ts`.

## Module Design

**Exports:**

- Modules predominantly use named exports for functions, types, interfaces, and classes, as shown by `packages/cli/src/fs/io.ts` and `packages/cli/src/providers/identity/dispatch-report.ts`.

**Barrel Files:**

- Barrels are used at module boundaries, for example `packages/cli/src/fs/index.ts` re-exports filesystem APIs and `packages/cli/src/commands/backlog/index.ts` exposes the command factory. Dedicated domain files retain their named exports.

---

_Convention analysis: 2026-08-30_
