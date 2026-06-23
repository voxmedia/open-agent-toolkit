---
oat_generated: true
oat_generated_at: 2026-06-23
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/pjm-refresh
---

# Code Review: final

**Reviewed:** 2026-06-23
**Scope:** Final code review for `022eb12279ec08446a87816b3cf150a3678c1a13..HEAD`
**Files reviewed:** 98
**Commits:** `022eb12279ec08446a87816b3cf150a3678c1a13..HEAD` (35 commits)
**Verdict:** Fail

## Summary

The implementation satisfies the main CLI behavior for deterministic backlog and decision IDs, file-per-record decisions, two-layer PJM scaffolding, doctor checks, migration mechanics, skill/doc repointing, asset registration, and lockstep package versions. Independent verification passed the focused changed-surface tests and the full repo quality gates. One shipped migration prompt still documents the wrong decision-index marker and omits the `Legacy` column, which can lead agents following the bundled prompt's manual fallback to create an index that the actual CLI will not recognize.

## Findings

### Critical

None

### Important

- **Bundled migration prompt teaches an incompatible decision index shape** (`packages/cli/assets/migration/pjm-restructure.md:416`)
  - Issue: The shipped `oat pjm migrate --print-prompt` asset tells agents to build a `| ID | Date | Status | Title |` table and to use `<!-- OAT DECISIONS-INDEX -->` / `<!-- END OAT DECISIONS-INDEX -->` markers in the manual fallback path. The implementation and design use `<!-- OAT DECISION-INDEX -->` / `<!-- END OAT DECISION-INDEX -->` and a five-column `ID | Date | Status | Title | Legacy` table. An agent following the bundled prompt when CLI regeneration is unavailable would produce an index missing migrated `legacy_id` values and incompatible with `oat decision regenerate`, which validates the singular marker pair.
  - Fix: Update the prompt's Step 3 and fallback notes to use the singular marker pair and the `ID | Date | Status | Title | Legacy` table. Add a bundle/asset regression assertion so `packages/cli/assets/migration/pjm-restructure.md` cannot drift from `packages/cli/src/commands/decision/regenerate-index.ts` again.
  - Requirement: FR5, FR7, NFR3

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, `summary.md`, changed files in `022eb12279ec08446a87816b3cf150a3678c1a13..HEAD`, and live verification commands.

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                                                                                                                                                          |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | implemented | Backlog and decision helpers generate `bl-YYMMDD-slug` and `dr-YYMMDD-slug`; generation paths avoid scan/hash/nonce allocation and collision paths surface direct filename ambiguity.                                                          |
| FR2         | implemented | `oat decision init/new/regenerate/migrate` are present with tests for creation, rollback, deterministic index regeneration, dry-run, legacy preservation, and guarded delete.                                                                  |
| FR3         | implemented | `oat pjm init` creates the two-layer `pjm/` plus durable `reference/decisions/` scaffold, strips template frontmatter, and emits the three AGENTS guides.                                                                                      |
| FR4         | implemented | `runPjmDoctorChecks` is shared by `oat pjm doctor` and project-scope `oat doctor`; tests cover pass/fail/warn cases.                                                                                                                           |
| FR5         | partial     | CLI migration behavior is implemented and tested, but the bundled migration prompt's manual fallback documents an incompatible decision index marker/table.                                                                                    |
| FR6         | implemented | Live PJM/lifecycle/content skills route active state to `pjm/`, durable decisions to `reference/decisions/`, research to `reference/research/`, and brainstorm docs to `reference/brainstorms/`; old path matches are legacy/migration-framed. |
| FR7         | partial     | Bundle arrays, PM manifest, package contract, and lockstep versions are in place, but the shipped migration prompt asset contains the stale decision-index contract.                                                                           |
| NFR1        | implemented | Backlog and decision regenerators sort directory entries and apply deterministic record sorting with tests for shuffled `readdir` and tie-break behavior.                                                                                      |
| NFR2        | implemented | Migration dry-runs write nothing, decision migration verifies before legacy delete, and destructive zero-section delete is rejected.                                                                                                           |
| NFR3        | partial     | Code preserves and renders `legacy_id`; the migration prompt fallback omits the `Legacy` column.                                                                                                                                               |
| NFR4        | implemented | Independent review ran full test, lint, type-check, build, docs build, format, and release validation successfully.                                                                                                                            |

### Extra Work (not in declared requirements)

None requiring action. The docs-accuracy fixes, provider view refresh, and follow-up summary/bookkeeping are within the requested final scope.

## Verification Commands

Run these to verify the implementation and the required fix:

```bash
git diff --check 022eb12279ec08446a87816b3cf150a3678c1a13..HEAD
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision src/commands/pjm src/commands/backlog src/commands/cleanup src/commands/init/tools src/release
pnpm format
pnpm lint
pnpm type-check
pnpm build
pnpm build:docs
pnpm test
pnpm release:validate
rg -n "OAT DECISIONS-INDEX|END OAT DECISIONS-INDEX|`\\| ID \\| Date \\| Status \\| Title \\|`" packages/cli/assets/migration/pjm-restructure.md
```

The final `rg` command should return no matches after the prompt is fixed.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
