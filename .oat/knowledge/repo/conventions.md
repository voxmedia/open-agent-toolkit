---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Coding Conventions

**Analysis Date:** 2026-01-28

## Code Style

**Formatting (Biome):**
- Indent: 2 spaces
- Line width: 80 characters
- Line ending: LF
- Quote style: Single quotes
- Trailing commas: Always
- Semicolons: Always
- Arrow parentheses: Always
- Bracket spacing: true

**TypeScript:**
- Strict mode enabled
- ES2022 target
- ESM modules (verbatimModuleSyntax)
- No unchecked index access
- No implicit returns
- No fallthrough in switch

## Naming Patterns

**Files:**
- Source: camelCase or kebab-case (`index.ts`, `my-file.ts`)
- Tests: `*.test.ts` or `*.spec.ts`

**Functions:**
- camelCase: `getUserData()`, `processRequest()`
- Prefix with `is/has/get/set` for accessors

**Variables:**
- camelCase: `userName`, `requestCount`
- Constants: camelCase or UPPER_CASE for true constants

**Types/Interfaces:**
- PascalCase: `UserData`, `RequestConfig`
- Prefix with `I` optional for interfaces

## Import Organization

**Order:**
1. Node.js built-ins
2. External dependencies
3. Internal/workspace packages
4. Relative imports

**Style:**
- Named imports preferred over namespace imports
- Explicit imports over wildcard

## Error Handling

**Patterns:**
- Never silently ignore errors
- Include descriptive error messages
- Exit with meaningful codes (0 success, 1 error)
- Log to stderr for errors

## Logging

**Framework:** console (built-in)

**Usage:**
- `console.log()` for normal output
- `console.error()` for errors
- Include context in messages

## Comments

**Guidelines:**
- Prefer self-documenting code
- Comments explain "why", not "what"
- TSDoc for exported functions
- Keep comments up-to-date

## Commit Messages

**Convention:** Conventional Commits

**Format:** `<type>(<scope>): <subject>`

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `perf:` - Performance
- `test:` - Tests
- `chore:` - Maintenance

**Example:**
```
feat(cli): add command parsing

Implements argument parsing for the main CLI entry point.
```

## Git Hooks

**Pre-commit (lint-staged):**
- TypeScript/JavaScript: `biome check --write`
- JSON: `biome format --write`
- Markdown: `biome format --write`

**Pre-push (optional):**
- Type checking
- Linting

**Management:**
- `pnpm hooks:status` - View status
- `pnpm hooks:enable-all` - Enable hooks
- `pnpm hooks:disable-all` - Disable hooks

---

*Conventions analysis: 2026-01-28*
