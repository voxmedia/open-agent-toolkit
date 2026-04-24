---
oat_generated: true
oat_generated_at: 2026-04-24
oat_review_scope: plan
oat_review_type: artifact
oat_project: /Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coherent-josephson-3667/.oat/projects/shared/skill-cli-migration
---

# Artifact Review: plan

**Reviewed:** 2026-04-24
**Scope:** Quick-mode `plan.md` artifact review for `skill-cli-migration`
**Files reviewed:** 4 (2 in-scope artifacts, 2 context artifacts)
**Commits:** N/A (artifact review)

## Summary

The plan is mostly well-scoped to discovery: it targets the 7 skills that currently grep `state.md`, preserves write paths, and includes release/version validation. It is not ready for implementation as written because the canonical fallback command is syntactically broken for `npx @open-agent-toolkit/cli`, and some verification commands/expectations would either fail or miss behavior drift.

Evidence sources used: `discovery.md`, `plan.md`, `implementation.md`, `state.md`, plus source inspection of the current CLI/package command context for verification feasibility.

## Findings

### Critical

- **Canonical `npx` fallback cannot execute when quoted as a scalar command** (`plan.md:70`)
  - Issue: The plan documents `OAT_CMD=$(... || echo "npx @open-agent-toolkit/cli")` and then executes `"$OAT_CMD" --json project status`. When `oat` is absent, the shell looks for one executable literally named `npx @open-agent-toolkit/cli`, so the fallback branch fails before reaching the CLI. This directly violates discovery's selected fallback contract and success criterion for environments without `oat` on `$PATH` (`discovery.md:80`, `discovery.md:103`). The Phase 4 fallback check only prints the resolved string and then uses a different `pnpm ... exec oat` command, so it would not catch the broken canonical snippet (`plan.md:422`, `plan.md:437`).
  - Fix: Rewrite the canonical pattern to use an array or explicit branch, for example `if command -v oat ...; then STATUS_JSON=$(oat --json project status ...); else STATUS_JSON=$(npx @open-agent-toolkit/cli --json project status ...); fi`, or `OAT_CMD=(npx @open-agent-toolkit/cli)` with `"${OAT_CMD[@]}"`. Update p01-t01 and every migration task to reference that exact form, then change p04-t02 to execute the same fallback code path with `oat` removed from `PATH`.
  - Requirement: Discovery success criteria: fallback succeeds without `oat` on `$PATH`.

### Important

- **Null-value expectations contradict the proposed `jq` expression** (`plan.md:277`)
  - Issue: The plan tells implementers to replace `oat_docs_updated` reads with `jq -r '.project.docsUpdated // ""'`, but the task verification expects both JSON and `grep | awk` output to be `null` (`plan.md:286`). The Phase 4 checklist also says null fields should become empty strings (`plan.md:401`), while discovery requires unchanged status-reporting behavior and calls out error-path parity separately (`discovery.md:102`, `discovery.md:118`). Those are different contracts, and the current plan does not tell implementers which behavior is intentional.
  - Fix: Decide and document one null contract before implementation. If behavior parity is required, map null-valued state fields to the same sentinel the existing skills see, such as `jq -r '.project.docsUpdated // "null"'` where downstream logic expects `null`. If the migration intentionally normalizes null to empty, update the discovery success criteria and each affected task's expected output and downstream checks.

- **Filtered CLI test commands use repo-root paths from the package working directory** (`plan.md:127`)
  - Issue: The plan uses `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/project/status.test.ts` again in the combined verification command (`plan.md:140`). `pnpm --filter ... exec` runs from `packages/cli`, so the repo-root-prefixed path points at a non-existent nested path and can fail independently of the intended test.
  - Fix: Use a package-relative path with the filtered command, e.g. `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts`, or run from the repo root without filtered `exec`. Keep the type-check command as `pnpm --filter @open-agent-toolkit/cli type-check`.

- **Review ledger omits the plan artifact review and tracks optional quick-mode artifacts as pending** (`plan.md:486`)
  - Issue: The Reviews table has code rows plus `spec` and `design` artifact rows marked pending (`plan.md:493`, `plan.md:494`), but quick-mode state explicitly marks spec/design as N/A (`state.md:36`, `state.md:37`) and there is no `plan` artifact row for this review. That makes review-receive/bookkeeping ambiguous and can imply nonexistent spec/design gates.
  - Fix: Add a `plan | artifact | pending/received | 2026-04-24 | reviews/artifact-plan-review-2026-04-24.md` row, and either remove the optional `spec`/`design` rows or mark them clearly as N/A for quick mode.

### Minor

- **Verification-only phase tasks have inaccurate file scopes** (`plan.md:391`)
  - Issue: p04-t01 says `Files: none` but then appends results to `implementation.md` and commits it (`plan.md:405`, `plan.md:410`). p04-t02 also says `Files: none` but records verification via an empty commit (`plan.md:416`, `plan.md:445`). This is small, but it weakens the plan's scope guidance for implementers.
  - Suggestion: For p04-t01, list `implementation.md` as modified. For p04-t02, either record fallback verification in `implementation.md` and commit that file, or explicitly state that the task is verification-only and should not create a commit unless the project workflow requires one.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` and `plan.md` for quick-mode requirements; `state.md` and `implementation.md` for lifecycle context. Spec/design were optional in quick mode and were not present.

### Requirements Coverage

| Requirement                                     | Status              | Notes                                                                                                |
| ----------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| Migrate 7 skills that grep `state.md`           | implemented in plan | Plan covers all 7 skills listed in discovery and excludes non-`state.md` grep surfaces.              |
| Read path only for mixed read/write skills      | implemented in plan | Tasks repeatedly instruct implementers not to touch write paths.                                     |
| Use existing `oat --json project status`        | implemented in plan | Plan does not require CLI shape changes beyond a contract test.                                      |
| Provide `npx @open-agent-toolkit/cli` fallback  | partial             | Fallback intent is present, but the canonical command form cannot execute when fallback is selected. |
| Preserve behavior/error parity                  | partial             | Null-field behavior is internally inconsistent and needs a single explicit contract.                 |
| Bump skill and lockstep public package versions | implemented in plan | Phase 4 includes skill frontmatter and 5-package lockstep bump plus `pnpm release:validate`.         |

### Extra Work (not in declared requirements)

None significant. The CLI JSON contract test is reasonable support work for the migration.

## Verification Commands

Run these to verify the fixed plan before implementation:

```bash
pnpm --filter @open-agent-toolkit/cli exec pwd
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts
env PATH="/usr/bin:/bin" bash -lc 'if command -v oat >/dev/null 2>&1; then oat --json project status; else npx @open-agent-toolkit/cli --json project status; fi'
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
