---
oat_generated: true
oat_generated_at: 2026-02-02
oat_source_head_sha: d25643fb7a57fd977d1a9590690d26986d2d0ce8
oat_source_main_merge_base_sha: 6c147615ba8cf567d29814f1fe1d5667fc6e6fdf
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- TypeScript source files use `.ts` extension (e.g., `index.ts`, `validate-oat-skills.ts`)
- Script files use `.ts` extension with `#!/usr/bin/env tsx` shebang for direct execution
- Configuration files: `package.json`, `tsconfig.json`, `biome.json`, `turbo.json`
- Kebab-case for multi-word filenames (e.g., `validate-oat-skills.ts`, `new-oat-project.ts`, `new-agent-project.ts`)

**Functions:**
- camelCase for function names (e.g., `isDir()`, `readText()`, `validateProjectName()`)
- Descriptive, verb-first names indicating action (e.g., `parseArgs()`, `scaffoldFromTemplates()`, `promptYesNo()`)
- Async functions declared with `async` keyword, returning `Promise<T>`
- Helper functions for specific concerns (e.g., `fileExists()`, `dirExists()`, `applyTemplateReplacements()`)

**Variables:**
- camelCase for variable names (e.g., `projectName`, `force`, `withReviews`)
- Type-safe declarations with explicit types where possible
- Const-first approach for immutability (Biome rule: `useConst: "error"`)
- Meaningful names reflecting purpose (e.g., `templatesDir`, `projectPath`, `repoRoot`)

**Types:**
- TypeScript interfaces for structured data (e.g., `CreateProjectOptions`, `ParsedArgs`)
- Explicit type annotations on function parameters and returns
- Type definitions use PascalCase (e.g., `Args`, `Finding`, `ParsedArgs`)
- Comprehensive type coverage enforced by strict TypeScript config

## Code Style

**Formatting:**
- Tool: Biome 2.3.11 (configured in `biome.json`)
- Indent: 2 spaces
- Line width: 80 characters
- Line ending: LF (Unix)
- Quotes: Single quotes for JavaScript/TypeScript
- Semicolons: Always required
- Trailing commas: All (ES5 compatible)
- Bracket spacing: Enabled
- Arrow functions: Always use parentheses (e.g., `(arg) => {}`)
- JSX quote style: Single quotes

**Linting:**
- Tool: Biome 2.3.11
- Config: `biome.json` at repository root
- Extends: `recommended` rule set
- Key rules enforced:
  - `noDoubleEquals`: "error" (strict equality only)
  - `noExplicitAny`: "warn" (allowed with warnings)
  - `noExplicitAny` in tests: "off" (permissive in test files)
  - `noUnusedVariables`: "error"
  - `noUndeclaredVariables`: "error"
  - `useConst`: "error" (const-first pattern)
  - `useTemplate`: "error" (template literals over concatenation)
  - `noCommentText`: "error" (prevent unhelpful comments)
  - `noDebugger`: "error"
  - All correctness rules enabled (no unreachable code, no const reassignment, etc.)

## Import Organization

**Order:**
1. Node.js built-in modules (e.g., `import { readdir } from 'node:fs/promises'`)
2. Internal modules (e.g., `import { createInterface } from 'node:readline/promises'`)
3. No external dependencies observed in current codebase

**Path Aliases:**
- Not configured in current minimal codebase
- tsconfig.json allows for future alias configuration with `baseUrl` and `paths` options

## Error Handling

**Patterns:**
- Try-catch blocks for file I/O operations with early returns on error
- Error handler pattern: `error instanceof Error ? error.message : String(error)`
- Process exit codes: 
  - `exit(0)` for successful completion
  - `exit(1)` for user/validation errors
  - `exit(2)` for system/runtime errors
- Non-destructive error handling: warn on failure but continue (e.g., dashboard refresh failure)
- Function-level error handling via `.catch()` on Promise-based operations
