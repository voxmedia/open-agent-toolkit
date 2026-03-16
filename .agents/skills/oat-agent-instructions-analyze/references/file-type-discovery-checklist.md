# File-Type Pattern Discovery Checklist

Systematic methodology for identifying glob-scoped rule opportunities. These are cross-cutting file-type patterns that span multiple directories and are best addressed with glob-scoped rules rather than directory-level AGENTS.md files.

File-type patterns are often the **highest-value** glob-scoped rules because they directly prevent agents from producing broken code across many files.

The goal of this checklist is to **find ambiguity and hidden conventions**, not just to confirm that filenames look consistent. File counts are only the starting point. The actual signal comes from reading files and identifying semantic patterns, split conventions, and failure modes.

## Discovery Process

### 1. Scan for Common File-Type Suffixes and Directory Conventions

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
- Domain bundles: repeated directory structures containing metadata + implementation + template/rendering files
- Schema bundles: repeated directories where one file implies required siblings (schema + loader + tests + fixtures)

Treat directory-level co-location as a first-class investigation target. Some of the highest-value rules are not "all `*.x` files look the same" but "every directory matching this pattern must contain these files and use one of two competing structures."

### 2. Calibrate Sample Size to Detect Inconsistency

Use these minimum sample sizes:

- **5–10 matching files:** Read **all** files
- **11–30 files:** Sample **8–12** files across different directories and different git ages
- **30+ files:** Sample **12–15** files across directories; if any inconsistency appears, expand the sample until you can describe the split ratio with confidence

The goal is not to confirm a pattern with the smallest possible sample. The goal is to discover whether the repo contains a meaningful split that would cause an agent to guess wrong.

When sampling:

- Mix directories; do not sample from a single subtree
- Mix older and newer files when possible; convention changes often correlate with time
- If the first sample looks perfectly consistent, still pressure-test it with files from other directories before concluding

### 3. Deep-Read Investigation

For every pattern with **5+ files**, reading the sampled files is mandatory. Do not stop at naming consistency.

Inspect the sample for:

- **Structural consistency:** Do they share the same import pattern, export pattern, or boilerplate?
- **Required wrapping/setup:** Do they require specific providers, decorators, helper classes, test harnesses, or framework extensions that aren't obvious from the file suffix?
- **Behavioral consistency:** Do they use the same registration flow, setup/teardown style, instantiation pattern, schema version, or rendering mechanism?
- **Directory assumptions:** Do files assume the presence of sibling files or a repeated directory structure?
- **Security-sensitive behavior:** Do they contain escaping/sanitization, raw HTML insertion, raw SQL, shell execution, `phpcs:ignore`, or other exception-worthy safety patterns?

For each pattern, explicitly answer:

1. What non-obvious setup is required?
2. What would break if an agent copied the wrong example?
3. Are there competing sub-patterns inside the same suffix or directory structure?
4. Are there version splits or old/new style splits that matter for new files?

### 4. Quantify the Real Pattern, Including Splits

Quantify the behavior you found, not just the filename suffix:

- `12/14 files use Pages utility wrapper`
- `9/18 directories use static registration, 9/18 use instance registration`
- `7/10 block manifests use apiVersion 3, older files use apiVersion 2`

Interpret the result this way:

- `>80%` consistency = useful rule candidate
- `60–80%` consistency = pattern with notable exceptions; capture both dominant pattern and exceptions
- `40–60%` consistency = **highest-priority ambiguity**; agents are likely to choose wrong without guidance
- `<40%` consistency = may still matter if the split tracks security, framework version, or generation age; do not automatically discard without checking impact

### 5. Check for Exception Patterns

**This is the highest-value check.** Look for file-type or directory-level patterns that require an **exception** to a project-wide rule:

- Storybook files needing `export default` when the project bans default exports
- Test files needing specific imports/setup that bypass normal module rules
- Config files that use CommonJS (`module.exports`) in an ESM project
- Generated files that should never be hand-edited despite appearing in source
- Template/render files that require escaping/sanitization patterns different from the general codebase
- File types that use different instantiation, registration, or API-version rules than the surrounding project
- File types that intentionally carry lint suppressions (`phpcs:ignore`, `eslint-disable`, etc.) for narrow, documented reasons

Exception-to-rule patterns are the most important to capture because agents will follow the general project rule and produce incorrect code.

Do not reduce this check to "default export exception." Investigate any deviation from general project norms that is scoped to a particular file or directory pattern.

### 6. Assess Correctness and Security Impact

For each pattern, determine what happens when an agent writes a new file of this type **without** the rule:

| Impact Level               | Description                                      | Examples                                                                |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| **Crashes/breaks**         | Code won't compile, tests won't run, app crashes | Missing test providers, wrong export type, missing required boilerplate |
| **Visual/behavioral bugs** | Code runs but produces wrong results             | Hardcoded colors breaking dark mode, missing accessibility wrappers     |
| **Security vulnerability** | Code introduces unsafe output or dangerous flows | Missing escaping, unsafe HTML injection, raw SQL without safeguards     |
| **Lint/CI failures**       | Code works but fails automated checks            | Wrong export style, missing eslint-disable for known exceptions         |
| **Style inconsistency**    | Code works but doesn't match conventions         | Different file structure, inconsistent naming                           |

Security-sensitive file types deserve explicit scrutiny. In PHP/WordPress repos, inspect template/rendering files for escaping, sanitization, and `phpcs:ignore` directives. In React/JS repos, inspect `dangerouslySetInnerHTML`, raw HTML rendering helpers, and any documented exception zones.

## Assessment Output

For each discovered pattern, record:

| Field                          | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| **Pattern**                    | Glob pattern (e.g., `**/*.stories.tsx`)          |
| **File count**                 | Total files matching                             |
| **Consistency**                | `N/M files follow pattern` (e.g., `72/72`)       |
| **Competing sub-patterns**     | Split details when multiple valid patterns exist |
| **Convention summary**         | Brief description of what agents must do         |
| **Correctness impact**         | What breaks without the rule                     |
| **Exception to project rule?** | Yes/No — if yes, which rule is overridden        |
| **Evidence**                   | 2–3 representative file paths                    |
| **Severity**                   | See calibration below                            |

## Severity Calibration

Glob-scoped rule severity should account for:

1. **File count** — More files = more likely an agent encounters this pattern
2. **Correctness impact** — Will code crash, produce wrong output, or fail lint?
3. **Exception patterns** — Does this contradict a project-wide rule?
4. **Split ratio** — Will an agent effectively guess between competing patterns?
5. **Security sensitivity** — Could the wrong pattern create a vulnerability?

| Criteria                                                  | Severity   |
| --------------------------------------------------------- | ---------- |
| `40–60%` split with correctness or security impact        | **High**   |
| Security-sensitive exception pattern                      | **High**   |
| Exception to project-wide rule AND code breaks/fails lint | **High**   |
| >20 files AND correctness impact (crashes, visual bugs)   | **High**   |
| >20 files AND lint/CI failures                            | **Medium** |
| `40–60%` split with lint/behavioral differences only      | **Medium** |
| 5–20 files with any correctness impact                    | **Medium** |
| Style consistency only, no correctness impact             | **Low**    |

## Co-Location Conventions

Beyond individual file types, check for **co-location patterns** — conventions about which files must exist together in a directory:

- Does every component directory require a `styles.ts`?
- Does every feature module require an `index.ts` barrel export?
- Are test files always co-located with source files, or in a separate `__tests__/` directory?
- Do component directories follow a category system with different rules per category?
- Do repeated directories split between two structural approaches, and if so which one should new directories follow?
- Do metadata files imply required implementation siblings, templates, or registration code?
- Do older directories and newer directories use different schema/API versions?

Co-location patterns often indicate the need for a glob-scoped rule at the directory pattern level (e.g., `src/components/**/*.tsx`).
