---
oat_generated: true
oat_generated_at: 2026-04-27
oat_review_scope: p-rev2
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/skill-cli-migration
---

# Code Review: p-rev2 (Revision 2 — `prev2-t01` through `prev2-t04`)

**Reviewed:** 2026-04-27
**Scope:** Revision 2 of skill-cli-migration — added `oat project status --field`, `--shell`, and `--project-path`; swept skills to use the concise CLI-owned reads; documented the shim contract.
**Files reviewed:** 17 (8 skills, 2 docs, 3 cli sources/tests, 4 project artifacts)
**Commits:** 5 (`db63209c..HEAD`: `9b81be89`, `0949dccc`, `2e776a76`, `a768f474`, `dcadee1c`)
**Workflow mode:** quick (no spec/design — discovery + plan only)

## Summary

Revision 2 cleanly delivers the three new CLI read APIs (`--field`, `--shell`, `--project-path`) on `oat project status`, sweeps all eight migrated skills to the concise contract, and documents the runtime shim. Implementation is small (~150 LOC of well-factored code in `status.ts`), with thirteen targeted vitest cases covering scalar, nested, null, missing, object, invalid-shell-var, unset-project, and explicit project-path (relative + absolute) behavior. The `oat-project-review-provide` Step 2 path-directed read now uses `--project-path` instead of the prev1-t01 fallback `grep | awk`, fully retiring the path-directed exception introduced under p-rev1. No critical or important issues found; a small number of minor polish observations are listed below.

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Help-snapshot test does not lock the new `oat project status --options`** (`packages/cli/src/commands/help-snapshots.test.ts:592`)
  - Issue: The `db63209c..HEAD` diff only updates the parent `project --help` listing (`status` → `status [options]`). There is no dedicated `project status --help` snapshot covering `--field`, `--project-path`, and `--shell`. Future renames or removals of these flags would not be detected by the help-snapshot suite.
  - Suggestion: Add a snapshot test (`getCommandByPath(program, ['project', 'status']).helpInformation()`) so the public option contract is locked the same way the parent listing is.
  - Verification: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts -u` after adding the case.
- **`--field` silently wins when combined with `--shell`** (`packages/cli/src/commands/project/status.ts:182-206`)
  - Issue: `writeProjectStatusOutput` checks `options.field` before `options.shell`. If a caller passes both, only the field is printed and shell assignments are dropped without warning.
  - Suggestion: Reject the combination explicitly (exit 1 with a clear message) or document the precedence in `cli-reference.md` and the contract notes in `create-oat-skill/SKILL.md`.
  - Note: No skill in this PR exercises the combination, so impact is theoretical — minor.
- **Empty `--shell` list still suppresses normal output** (`packages/cli/src/commands/project/status.ts:188`)
  - Issue: The check `options.shell?.length` correctly skips when `--shell` is absent. Commander's variadic parsing means `--shell` followed only by another flag would yield an empty array. In that case the code falls through to the json/text branch, which is correct, but the contract is not asserted by a test.
  - Suggestion (optional): Add a test case for `--shell` followed by no assignments to lock the fall-through behavior, or have the CLI reject `--shell` with no values.
- **`resolveProjectRoot` is invoked even when an absolute `--project-path` is given** (`packages/cli/src/commands/project/status.ts:120-128`)
  - Issue: For absolute `--project-path`, the resolved `repoRoot` is computed but unused (the absolute path passes through `resolveTargetProjectPath` unchanged). If the caller's `cwd` happens to live outside any git checkout, the CLI throws before consulting the absolute path. This is unlikely in skill use (always inside a worktree) but is an avoidable surprise.
  - Suggestion: Skip the `resolveProjectRoot` call when `options.projectPath` is an absolute path, or only require it when `--project-path` is relative.
- **`SHELL_ASSIGNMENT_RE` accepts `=` in the path portion** (`packages/cli/src/commands/project/status.ts:94`)
  - Issue: Pattern `^([A-Za-z_][A-Za-z0-9_]*)=(.+)$` greedily captures everything after the first `=` as the dot path. `--shell NAME=foo=bar` walks dot path `foo=bar` (treating `=bar` as part of the second segment). Harmless today (returns `null` because no such field exists), but undocumented.
  - Suggestion (optional): Either tighten the regex to forbid `=` in the path (`(.+?)$` is identical here, but `[^=]+` would reject embedded `=`) or document that `--shell` paths cannot contain `=`.

## Requirements/Plan Alignment (quick mode)

**Evidence sources used:** `discovery.md`, `plan.md` (Phase p-rev2), `implementation.md` (revision 2 section). No spec/design (quick mode).

### Task Coverage

| Task      | Status      | Notes                                                                                                                                                                                                                              |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prev2-t01 | implemented | `--field`, `--shell`, and `--project-path` added in `status.ts`; 13 vitest cases including the 8 specified in scope. `formatRawValue`/`shellQuote`/`SHELL_ASSIGNMENT_RE` cleanly factored.                                         |
| prev2-t02 | implemented | All 8 skills sweep verified: no leftover `STATUS_JSON=` or per-skill `command -v oat`/`npx @open-agent-toolkit/cli` blocks (only `create-oat-skill` retains the canonical shim docs and `oat-docs-bootstrap` keeps its own probe). |
| prev2-t03 | implemented | `apps/oat-docs/docs/contributing/skills.md` updated with `--field`/`--shell`/`--project-path` and the shim recipe; `cli-reference.md` adds three bullet entries for the new flags. Both files lint clean.                          |
| prev2-t04 | implemented | `implementation.md`, `summary.md`, and `state.md` refreshed; revision 2 outcome and verification recorded. State returned to `pr_open`. Cited verification runs (`pnpm test`, `pnpm release:validate`) all pass.                   |

### Discovery Alignment

| Discovery item                                                    | Status                 | Notes                                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrated skills no longer hand-parse `state.md` with `grep`/`awk` | implemented            | Confirmed; `oat-project-review-provide` Step 2 grep was retired by `--project-path`.                                                                                            |
| Read path only; writes untouched                                  | implemented            | Diffs touch only the `WORKFLOW_MODE=...`/`DOCS_UPDATED=...`/`PHASE=...` read lines and the canonical `state.md` reads in `oat-project-review-provide`. No write-path mutations. |
| Token efficiency / less duplication                               | implemented            | Each skill drops 12-16 lines of preamble for 1-4 lines of CLI invocation. Visible in every diff in scope.                                                                       |
| Cloud/`npx` fallback                                              | implemented            | Replaced per-skill fallback with the documented `oat` shim contract; runtime stays operative when `oat` is provided via `npx`-backed shim.                                      |
| Skill `version:` frontmatter bumped per-skill in PR               | implemented (PR-scope) | Per AGENTS.md ("PR-scoped, not edit-scoped"), each touched skill is bumped exactly once between `origin/main` and HEAD. p-rev2 commits add no further bumps — correct policy.   |
| Lockstep public-package version bump                              | implemented (PR-scope) | All five public packages went `0.0.52 → 0.0.53` earlier in the PR; p-rev2 ships shipped functionality but does not require a second bump within the same PR.                    |

### Lock-the-Contract Test (`status.test.ts`)

| Required case                           | Test                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| scalar `--field`                        | `prints a scalar field by arbitrary dot path`                        |
| nested `--field`                        | `prints a nested field by arbitrary dot path`                        |
| null and missing fields                 | `prints null for null or missing fields`                             |
| object `--field`                        | `prints object fields as compact json`                               |
| invalid `--shell` variable name         | `rejects invalid shell assignment variable names`                    |
| unset active project                    | `reports unset status when no active project is configured`          |
| explicit `--project-path` (relative)    | `prints a field from an explicit relative project path...`           |
| explicit `--project-path` (absolute)    | `prints shell assignments from an explicit absolute project path`    |
| `MIGRATED_FIELDS` contract preservation | `emits every JSON field migrated skills depend on when status is ok` |

### Skill Sweep Verification

Searched all skills under `.agents/skills/` for residual JSON preamble patterns:

- `STATUS_JSON=` → no matches in skills (clean).
- `command -v oat` → only in `create-oat-skill/SKILL.md` (canonical shim docs prose) and `oat-docs-bootstrap/SKILL.md` (out of scope).
- `npx @open-agent-toolkit/cli` → only in `create-oat-skill/SKILL.md` (the documented shim recipe).

The eight migrated skills now invoke `oat project status` directly, in line with the revision contract.

## Extra Work (not in declared plan)

None. Every code/doc change in scope maps to a prev2 task. Bookkeeping commits adjust state/summary/implementation only.

## Verification Commands

Run these to verify the implementation:

```bash
# Targeted CLI tests
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts
pnpm --filter @open-agent-toolkit/cli type-check

# Skill sweep
grep -RIn "STATUS_JSON" .agents/skills/
grep -RIn "command -v oat" .agents/skills/
grep -RIn "npx @open-agent-toolkit/cli" .agents/skills/

# Full local checks + release validate
pnpm lint
pnpm format
pnpm type-check
pnpm test
pnpm release:validate

# Live CLI smoke
oat project status --field project.workflowMode
oat project status --shell WORKFLOW_MODE=project.workflowMode PHASE=project.phase
oat project status --project-path .oat/projects/shared/skill-cli-migration --field project.workflowMode
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the minor findings into plan tasks (or defer them, since none are blocking). All five minors are polish-level — none warrants elevation to fix tasks unless the user specifically wants the help-snapshot lock for the new options before merge.
