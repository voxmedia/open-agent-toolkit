# File-Type Pattern Discovery Checklist

Systematic methodology for identifying glob-scoped rule opportunities. These are cross-cutting file-type patterns that span multiple directories and are best addressed with glob-scoped rules rather than directory-level AGENTS.md files.

File-type patterns are often the **highest-value** glob-scoped rules because they directly prevent agents from producing broken code across many files.

## Discovery Process

### 1. Scan for Common File-Type Suffixes

Search the repo for files matching common naming patterns. For each pattern with **5+ files**, proceed to sampling.

**Naming patterns to check:**

- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `*.test.js`, `*.test.jsx`
- Story files: `*.stories.tsx`, `*.stories.ts`, `*.stories.jsx`, `*.stories.js`
- Style files: `styles.ts`, `*.styles.ts`, `*.module.css`, `*.module.scss`, `*.styled.ts`
- Schema/type files: `*.schema.ts`, `*.types.ts`, `*.d.ts`
- Hook files: `*.hooks.ts`, `use*.ts` (in hooks directories)
- Utility files: `*.utils.ts`, `*.helpers.ts`, `*.constants.ts`
- Mock/fixture files: `*.mock.ts`, `*.fixture.ts`, `*.fixtures.ts`
- Config files: `*.config.ts`, `*.config.js`, `*.config.mjs`
- E2E/integration files: `*.e2e.ts`, `*.integration.ts`, `*.e2e-spec.ts`
- Generated files: `*.generated.ts`, `*.gen.ts`, `*.graphql.ts`

**Also check for co-located naming conventions:**

- Component directories: `Component.tsx` + `styles.ts` + `Component.stories.tsx` + `Component.test.tsx`
- Feature modules: `index.ts` + `types.ts` + `utils.ts` + `*.test.ts`

### 2. Sample and Assess Consistency

For each pattern with 5+ files, sample **3–5 representative files** (mix of directories, not just one location):

- **Structural consistency:** Do they share the same import pattern, export pattern, or boilerplate?
- **Required wrapping:** Do they require specific providers, decorators, or setup that isn't obvious from the framework?
- **Naming conventions:** Do they follow naming rules beyond what the file extension implies?

**Quantify consistency:** Count how many files follow the pattern vs total files matching the glob.

- `>80%` consistency = strong rule candidate
- `50–80%` = moderate candidate (note the exceptions)
- `<50%` = not a pattern, skip

### 3. Check for Exception Patterns

**This is the highest-value check.** Look for file-type patterns that require an **exception** to a project-wide rule:

- Storybook files needing `export default` when the project bans default exports
- Test files needing specific imports/setup that bypass normal module rules
- Config files that use CommonJS (`module.exports`) in an ESM project
- Generated files that should never be hand-edited despite appearing in source

Exception-to-rule patterns are the most important to capture because agents will follow the general project rule and produce incorrect code.

### 4. Assess Correctness Impact

For each pattern, determine what happens when an agent writes a new file of this type **without** the rule:

| Impact Level               | Description                                      | Examples                                                                |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| **Crashes/breaks**         | Code won't compile, tests won't run, app crashes | Missing test providers, wrong export type, missing required boilerplate |
| **Visual/behavioral bugs** | Code runs but produces wrong results             | Hardcoded colors breaking dark mode, missing accessibility wrappers     |
| **Lint/CI failures**       | Code works but fails automated checks            | Wrong export style, missing eslint-disable for known exceptions         |
| **Style inconsistency**    | Code works but doesn't match conventions         | Different file structure, inconsistent naming                           |

## Assessment Output

For each discovered pattern, record:

| Field                          | Description                                |
| ------------------------------ | ------------------------------------------ |
| **Pattern**                    | Glob pattern (e.g., `**/*.stories.tsx`)    |
| **File count**                 | Total files matching                       |
| **Consistency**                | `N/M files follow pattern` (e.g., `72/72`) |
| **Convention summary**         | Brief description of what agents must do   |
| **Correctness impact**         | What breaks without the rule               |
| **Exception to project rule?** | Yes/No — if yes, which rule is overridden  |
| **Evidence**                   | 2–3 representative file paths              |
| **Severity**                   | See calibration below                      |

## Severity Calibration

Glob-scoped rule severity should account for:

1. **File count** — More files = more likely an agent encounters this pattern
2. **Correctness impact** — Will code crash, produce wrong output, or fail lint?
3. **Exception patterns** — Does this contradict a project-wide rule?

| Criteria                                                  | Severity   |
| --------------------------------------------------------- | ---------- |
| Exception to project-wide rule AND code breaks/fails lint | **High**   |
| >20 files AND correctness impact (crashes, visual bugs)   | **High**   |
| >20 files AND lint/CI failures                            | **Medium** |
| 5–20 files with any correctness impact                    | **Medium** |
| Style consistency only, no correctness impact             | **Low**    |

## Co-Location Conventions

Beyond individual file types, check for **co-location patterns** — conventions about which files must exist together in a directory:

- Does every component directory require a `styles.ts`?
- Does every feature module require an `index.ts` barrel export?
- Are test files always co-located with source files, or in a separate `__tests__/` directory?
- Do component directories follow a category system with different rules per category?

Co-location patterns often indicate the need for a glob-scoped rule at the directory pattern level (e.g., `src/components/**/*.tsx`).
