---
oat_generated: true
oat_generated_at: 2026-08-19
oat_source_head_sha: e0408f4676a7b84e4240b4c568b78265f1d5cd0a
oat_source_main_merge_base_sha: 6f443c0843d75b704168b8ca739b5bcf7f406f07
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

<!--
Vendored from: https://github.com/glittercowboy/get-shit-done
License: MIT
Original: agents/gsd-codebase-mapper.md (embedded template)
Modified: 2026-01-27 - Adapted for OAT (added frontmatter)
-->

# Coding Conventions

**Analysis Date:** 2026-08-19

## Naming Patterns

**Files:**

- TypeScript files use lowercase kebab-case names such as `create-program.ts`, `tool-bundle-update-guard.ts`, and matching `.test.ts` files in `packages/cli/src/app/`.
- Package entry/barrel modules are named `index.ts`, for example `packages/cli/src/manifest/index.ts` and `packages/docs-transforms/src/index.ts`.

**Functions:**

- Functions and variables use camelCase, including `createBacklogItem`, `normalizeInputs`, and `renderBacklogItem` in `packages/cli/src/commands/backlog/new.ts:95-227`.
- Boolean predicates commonly use `is`, `has`, or `detect` prefixes, such as `isProjectStatePhase` in `packages/cli/src/commands/shared/frontmatter.ts:52-66` and `detectBoundaryTier` in `packages/control-plane/src/recommender/boundary.ts`.

**Variables:**

- Constants use `UPPER_SNAKE_CASE` for fixed values (`PRIORITIES`, `SCOPES`, and `SCOPE_ESTIMATES` in `packages/cli/src/commands/backlog/new.ts:14-18`).
- Local variables and options are camelCase; options are represented by named interfaces such as `CreateBacklogItemOptions` in `packages/cli/src/commands/backlog/new.ts:20-31`.

**Types:**

- Interfaces, classes, and type aliases use PascalCase (`CreateBacklogItemResult`, `CliLogger`, and `ProjectState` in `packages/cli/src/commands/backlog/new.ts:33-44`, `packages/cli/src/ui/logger.ts:3-10`, and `packages/control-plane/src/types.ts:84-113`).
- Literal unions are frequently derived from `as const` arrays, as shown by `ProjectStateKind` and `ProjectStatePhase` in `packages/cli/src/commands/shared/frontmatter.ts:6-49`.

## Code Style

**Formatting:**

- `oxfmt` is the formatter, with 80-column output, two spaces, no tabs, semicolons, single quotes, trailing commas, and sorted imports in `.oxfmtrc.jsonc:1-27`.
- Package `check` and `format` scripts run `oxfmt --check`, for example `packages/cli/package.json:32-39` and `packages/docs-transforms/package.json:28-35`.

**Linting:**

- `oxlint` enables TypeScript rules and treats correctness/suspicious categories as errors in `.oxlintrc.json:1-38`.
- The repository explicitly checks `prefer-const`, `prefer-template`, smart `eqeqeq`, empty blocks, shadowing, floating promises, misused promises, and unnecessary type constraints in `.oxlintrc.json:14-31`.
- Test files receive overrides that permit explicit `any` and unsafe optional chaining in `.oxlintrc.json:32-44`; package scripts exclude tests from the type-aware production lint pass, as in `packages/cli/package.json:32-39`.

## Import Organization

**Order:**

1. Node built-ins are first, followed by a blank line (`node:fs/promises`, `node:path`) in `packages/cli/src/commands/backlog/new.ts:1-3`.
2. External packages and configured workspace aliases follow (`@commands/...`, `yaml`) in `packages/cli/src/commands/backlog/new.ts:4-5`.
3. Local relative imports are last, as in `packages/cli/src/commands/backlog/new.ts:7-12`.
4. Type-only dependencies use explicit `import type`, as in `packages/control-plane/src/project.ts:13-18` and `packages/docs-transforms/src/remark-links.ts:3-4`.

**Path Aliases:**

- The CLI defines domain aliases such as `@commands/*`, `@providers/*`, `@engine/*`, `@manifest/*`, and `@ui/*` in `packages/cli/tsconfig.json:7-20`; Vitest mirrors those aliases in `packages/cli/vitest.config.ts:7-23`.
- Relative extension style differs by package: CLI and control-plane imports commonly omit `.js` (`packages/cli/src/commands/backlog/new.ts:7-12`, `packages/control-plane/src/project.ts:4-18`), while docs packages use `.js` (`packages/docs-transforms/src/index.ts:4-10`).

## Error Handling

**Patterns:**

- Input validation throws descriptive `Error` instances before filesystem mutation, for example `normalizeInputs` in `packages/cli/src/commands/backlog/new.ts:111-189`.
- Filesystem errors are inspected by `code`; expected `ENOENT` cases are normalized while unexpected errors are rethrown in `packages/cli/src/commands/backlog/new.ts:51-65` and `packages/cli/src/commands/backlog/new.ts:76-93`.
- Command-facing failures use the typed `CliError` with an explicit exit code in `packages/cli/src/errors/cli-error.ts:1-9`.
- Multi-step mutations use rollback with `Promise.allSettled` and preserve both original and rollback failures using `AggregateError` in `packages/cli/src/commands/backlog/new.ts:253-274`.

## Logging

**Framework:** `chalk` plus direct `process.stdout`/`process.stderr` writes in `packages/cli/src/ui/logger.ts:1-30`.

**Patterns:**

- Production code depends on the `CliLogger` interface (`debug`, `info`, `warn`, `error`, `success`, and `json`) defined in `packages/cli/src/ui/logger.ts:3-10`.
- Human output is colorized and routed by severity; JSON mode suppresses human messages and emits structured error records in `packages/cli/src/ui/logger.ts:32-76`.
- Commands commonly receive logger/context dependencies and tests capture messages through `createLoggerCapture` in `packages/cli/src/commands/__tests__/helpers.ts:3-49`.

## Comments

**When to Comment:**

- Comments explain non-obvious invariants, compatibility behavior, or safety boundaries, such as argv normalization in `packages/cli/src/index.ts:24-37` and rollback semantics in `packages/cli/src/commands/backlog/new.ts:255-273`.
- Tests also document why an assertion protects a contract, as in the timezone explanation in `packages/cli/src/commands/shared/frontmatter.test.ts:43-49`.

**JSDoc/TSDoc:**

- Public or complex APIs use TSDoc for semantics and constraints, for example `parseGeneratedTime` in `packages/cli/src/commands/shared/frontmatter.ts:116-130` and capability types in `packages/cli/src/review-remote/capability-probe.ts:1-83`.
- JSDoc is not present on every function; short, local helpers such as `normalizeChoice` in `packages/cli/src/commands/backlog/new.ts:95-109` are self-describing.

## Function Design

**Size:** No explicit maximum-size rule is configured. Larger operations are decomposed into focused helpers (`pathExists`, `resolveBacklogTemplate`, `normalizeInputs`, and `renderBacklogItem`) in `packages/cli/src/commands/backlog/new.ts:51-225`.

**Parameters:** Related inputs are grouped in options interfaces, and seams for filesystem/command behavior are represented by dependency interfaces such as `CreateBacklogItemDependencies` in `packages/cli/src/commands/backlog/new.ts:41-49`.

**Return Values:** Functions use explicit Promise and object result types, nullable values for absent data (`parseFrontmatterField` in `packages/cli/src/commands/shared/frontmatter.ts:132-155`), and discriminated result objects in validation modules such as `packages/cli/src/validation/project-state.ts:67-87`.

## Module Design

**Exports:** Modules generally use named exports; public package entry points re-export selected APIs from barrel files such as `packages/cli/src/manifest/index.ts:1-11`, `packages/control-plane/src/index.ts:1-3`, and `packages/docs-config/src/index.ts:1-3`.

**Barrel Files:** Domain directories use `index.ts` to expose stable public surfaces (`packages/cli/src/providers/codex/index.ts:1-5` and `packages/cli/src/validation/index.ts:1-8`). Default exports are used for app/config integration where required, including `apps/oat-docs/next.config.js` and `packages/cli/vitest.config.ts:25-30`.

---

_Convention analysis: 2026-08-19_
