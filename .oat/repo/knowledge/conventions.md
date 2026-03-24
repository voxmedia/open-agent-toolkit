---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 539d8ac2b1ba2d2315bac69753ded87509967c6b
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**

- Mostly kebab-case or descriptive lowercase file names such as `command-context.ts`, `search-config.ts`, and `remark-links.ts`.
- Tests are generally co-located and use `.test.ts` suffix.
- Barrel exports use `index.ts`.

**Functions:**

- camelCase for runtime helpers and factories, for example `createDocsConfig`, `createProgram`, `generateThinIndex`.
- `create*`, `resolve*`, `read*`, and `detect*` prefixes are common.

**Variables:**

- camelCase in implementation code.
- UPPER_SNAKE_CASE is reserved for constant tables or config-like values.

**Types:**

- PascalCase for interfaces and type aliases such as `CommandContext`, `BrandingConfig`, and `SearchConfig`.

## Code Style

**Formatting:**

- Primary tools: `oxfmt` and `oxlint`
- Indentation is 2 spaces.
- The codebase uses ESM, single quotes, trailing commas, and semicolons.

**Linting:**

- `oxlint` is the repo-wide linter.
- `typescript-eslint/no-explicit-any` is occasionally suppressed with a local rationale when library typings are awkward.
- Formatting and linting are wired into per-package scripts and root Turbo tasks.

## Import Organization

**Order:**

1. Node built-ins
2. Third-party packages
3. Internal type/value imports
4. Local relative imports inside the same package

**Path Aliases:**

- `packages/cli` relies heavily on TypeScript path aliases such as `@commands/*`, `@providers/*`, `@ui/*`, and `@fs/*`.
- The repo guidance prefers same-directory `./...` imports locally and aliases for anything outside the current directory.
- Parent-relative imports are intentionally discouraged in repo instructions.

## Error Handling

**Patterns:**

- CLI code uses `CliError` for expected user-facing failures and exit-code control.
- Build/test/library code generally relies on thrown `Error` objects or framework defaults.
- Commands tend to convert thrown errors into logger output at the command boundary.

## Logging

**Framework:** Custom logger/spinner layer in the CLI; framework defaults elsewhere.

**Patterns:**

- CLI output is intentionally structured for human and JSON modes.
- The docs packages are small libraries and generally avoid their own logging.
- CI relies on command output from pnpm scripts and GitHub Actions.

## Comments

**When to Comment:**

- Comments are used sparingly to explain non-obvious transforms, runtime assumptions, or linter suppressions.
- Repo-level instructions emphasize comments that explain why, not trivial line-by-line behavior.

**JSDoc/TSDoc:**

- Public library and plugin code uses concise docblocks where behavior is subtle, especially in remark plugins and React wrappers.
- Many internal helpers rely on clear naming instead of heavy annotation.

## Function Design

**Size:** Most functions are modest in size, with larger orchestration modules in the CLI command and state-generation areas.

**Parameters:** Object parameters are common for config-style APIs; smaller helpers still use positional arguments.

**Return Values:** Explicit interfaces are common for factory/config results, especially in the docs packages.

## Module Design

**Exports:** Each package exposes a small `index.ts` barrel and keeps implementation files private behind that boundary.

**Barrel Files:** Barrels are the default package entrypoints in `packages/docs-*` and many CLI submodules.

## Repo-Specific Guidance

- Root `AGENTS.md` requires same-directory imports where possible and explicit aliases otherwise.
- OAT workflow artifacts are markdown-first and meant to stay readable to humans and tools.
- Manual edits to generated content should be avoided; regenerate instead.

---

_Convention analysis: 2026-03-24_
