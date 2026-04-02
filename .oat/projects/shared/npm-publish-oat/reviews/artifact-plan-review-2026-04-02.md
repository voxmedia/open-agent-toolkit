---
oat_generated: true
oat_generated_at: 2026-04-02
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/npm-publish-oat
---

# Artifact Review: plan.md

**Reviewed:** 2026-04-02
**Scope:** plan.md artifact review (spec-driven workflow)
**Files reviewed:** 1 (plan.md, with cross-reference to spec.md, design.md, discovery.md)
**Commits:** N/A (artifact review)

## Summary

The plan is well-structured with 9 tasks across 3 phases, clear verification steps, and good traceability to the spec requirement index. However, it has one critical gap: several files containing `@tkstang` references are not covered by any plan task, which means the plan will not fully satisfy NFR2 (public contract consistency across all repo-owned surfaces). The plan also has structural issues including an already-completed "Implementation Complete" section in a plan that has `oat_status: in_progress`, and missing coverage of derived artifacts like `pnpm-lock.yaml` regeneration.

## Artifacts Reviewed

- **discovery.md** - Available, read (spec-driven mode: optional but consulted)
- **spec.md** - Available, read (required for spec-driven mode)
- **design.md** - Available, read (required for spec-driven mode)
- **plan.md** - Under review
- **implementation.md** - Available, read (for context on current state)

## Findings

### Critical

- **Missing files: `.oat/templates/docs-app-fuma/` template files not covered by any task**
  - Issue: The docs-app-fuma template directory contains 5 files with `@tkstang` references that are not listed in any plan task:
    - `.oat/templates/docs-app-fuma/source.config.ts` (line 1: `@tkstang/oat-docs-config`)
    - `.oat/templates/docs-app-fuma/app/layout.tsx` (line 1: `@tkstang/oat-docs-theme`)
    - `.oat/templates/docs-app-fuma/package.json.template` (lines 18-20, 29: all four `@tkstang` packages)
    - `.oat/templates/docs-app-fuma/next.config.js` (line 1: `@tkstang/oat-docs-config`)
    - `.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx` (line 1: `@tkstang/oat-docs-theme`)
  - Fix: Add a new task (e.g., p02-t05) or expand p02-t02 to cover these template files. These are scaffold source templates and are critical to FR2 acceptance criterion: "Generated or scaffolded package references produced by the repository align with the `@open-agent-toolkit/*` contract."
  - Requirement: FR2 (P0), NFR2 (P0), NFR5 (P0)

- **Missing files: `packages/docs-transforms/src/remark-mermaid.ts` not covered**
  - Issue: This source file contains a comment referencing `@tkstang/oat-docs-theme` (line 12). While it is a code comment, it is inside a publishable package source file that will ship to npm consumers. Leaving it creates namespace drift in shipped source.
  - Fix: Add this file to an existing task (p01-t03 is the natural fit since it covers manifest alignment of publishable packages) or create a targeted cleanup task.
  - Requirement: NFR2 (P0)

- **Missing files: `packages/docs-config/src/source-config.ts` not covered**
  - Issue: This source file imports from `@tkstang/oat-docs-transforms` (line 5). This is a runtime import in a publishable package -- changing the package name in the manifest without updating this import will break the package at runtime.
  - Fix: Add this file to p01-t03 or create a dedicated task. This is a functional breakage risk if the manifest renames happen without updating this import.
  - Requirement: FR1 (P0), FR4 (P0)

### Important

- **Missing files: `packages/cli/AGENTS.md` not covered** (`packages/cli/AGENTS.md:16-18,35`)
  - Issue: Contains `@tkstang/oat-cli` filter references in development commands. While AGENTS.md is not consumer-facing, it is a repo-owned surface that shapes developer and agent workflows. Leaving old filter names means `pnpm --filter @tkstang/oat-cli test` commands will break after the rename.
  - Fix: Add to p02-t04 (docs/README task) or create a separate task for developer-facing reference alignment.

- **Missing files: `apps/oat-docs/docs/contributing/design-principles.md` not covered** (`design-principles.md:116-118`)
  - Issue: Contains `@tkstang/oat-cli` filter commands in docs. This is a consumer/contributor-facing doc page not listed in any plan task.
  - Fix: Add to p02-t04's file list.

- **Missing files: `.oat/repo/knowledge/` files not covered**
  - Issue: Three knowledge base files contain `@tkstang` references:
    - `.oat/repo/knowledge/architecture.md` (lines 93-95)
    - `.oat/repo/knowledge/testing.md` (lines 28-30, 110)
    - `.oat/repo/knowledge/concerns.md` (line 50)
  - Fix: Add a task or expand an existing task to update knowledge base references. These shape agent behavior for future development, so stale namespace references will cause incorrect commands to be suggested.

- **Missing `pnpm install` step after manifest renames** (`plan.md` p01-t03)
  - Issue: After renaming all four package.json `name` fields and the root `cli:link` script, `pnpm install` must be run to regenerate `pnpm-lock.yaml` with the new package names. The plan does not include this step. Without it, the lockfile will be out of sync with manifests, and subsequent `pnpm` commands may fail.
  - Fix: Add a `pnpm install` step between the manifest rename (Step 2) and the verify step (Step 4) of p01-t03, and include `pnpm-lock.yaml` in the commit.

- **Plan phase structure diverges from design phases without explanation** (`plan.md` Phase 2 heading)
  - Issue: Design.md defines Phase 2 as "Generator and Validation Alignment" (focused on scaffolding, tests, and validation). The plan's Phase 2 is "Consumer, Scaffold, And Docs Alignment" which merges the design's Phase 1 docs-app alignment task with Phase 2's scaffold/validation tasks and adds documentation updates. This reorganization may be reasonable but it is not documented as a design deviation.
  - Fix: Either add a brief note in the plan explaining the phase reorganization rationale, or align the plan phases with the design phases.

- **Premature "Implementation Complete" section** (`plan.md:514-524`)
  - Issue: The plan has `oat_status: in_progress` and `oat_phase_status: in_progress` in its frontmatter, yet contains a filled "Implementation Complete" section with a summary and task counts. This contradicts the current status and could mislead implementation tools into thinking the plan is done.
  - Fix: Either clear the "Implementation Complete" section content and leave it as a placeholder for when implementation finishes, or rename it to something like "Plan Summary" if it is meant to summarize the plan structure rather than implementation completion.

### Minor

- **p02-t03 verification references test files that may not exist** (`plan.md:314`)
  - Issue: The verification step references `src/commands/docs/migrate/fixtures.test.ts` and `src/commands/docs/migrate/frontmatter.test.ts`, but the plan only lists fixture markdown files and the e2e-pipeline test as modified files. If these test files do not exist, the verification command will fail.
  - Suggestion: Verify that these test file paths are correct, or adjust the verification command to reference the actual test files that exercise the fixture markdown files.

- **p01-t01 TDD flow is structurally awkward** (`plan.md:49-97`)
  - Issue: Steps 1 and 2 both produce a failing test, with Step 2 being the actual test code change and Step 4 also running the test expecting failure. The RED-GREEN-REFACTOR cycle is meant to have Step 1 produce a failing test, Step 2 make it pass. Here, the test stays red through Step 4 because the implementation happens in p01-t02. This is a cross-task TDD pattern that works but is unusual and could confuse implementers.
  - Suggestion: Consider noting explicitly that this task produces a deliberately-failing test that will turn green in p01-t02, or restructure so tests and implementation are in the same task.

- **design.md has duplicate template sections at the bottom** (`design.md:796-848`)
  - Issue: The design.md artifact contains unfilled template placeholders after line 795 (duplicate "Open Questions", "Implementation Phases", "Dependencies", "Risks and Mitigation", and "References" sections with `{placeholder}` text). While this is a design artifact issue rather than a plan issue, the plan references design.md and inherits its phase structure.
  - Suggestion: Clean up the design.md template remnants in a separate pass.

## Requirements/Design Alignment

**Evidence sources used:** spec.md (primary), design.md (secondary), discovery.md (context)

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                                                                                                                     |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | partial     | Plan tasks p01-t01/t02/t03 cover contract, validator, and manifests. Missing: `packages/docs-config/src/source-config.ts` has a runtime import using old namespace that will break after manifest rename. |
| FR2         | partial     | Consumer docs, scaffold tests, and release workflows covered. Missing: `.oat/templates/docs-app-fuma/` template files (scaffold source), `design-principles.md` doc page, knowledge base files.           |
| FR3         | implemented | Covered by p01-t02, p03-t01, p03-t02. Lockstep release, manual bootstrap, and GitHub workflow alignment all addressed.                                                                                    |
| FR4         | implemented | Covered by p01-t02 (contract validation) and p01-t03 (manifest metadata).                                                                                                                                 |
| FR5         | implemented | Covered by p02-t04 (consumer docs) and p03-t02 (bootstrap docs). CLI-primary positioning addressed.                                                                                                       |
| FR6         | implemented | Covered by p03-t01 (workflow update) and p03-t02 (bootstrap boundary docs).                                                                                                                               |
| NFR1        | implemented | Lockstep model preserved through contract registry and workflow updates.                                                                                                                                  |
| NFR2        | partial     | Most surfaces covered. Missing files enumerated under Critical and Important findings above leave residual `@tkstang` references.                                                                         |
| NFR3        | implemented | `pnpm release:validate` and test commands provide non-destructive validation.                                                                                                                             |
| NFR4        | implemented | Consumer docs and READMEs updated in p02-t04.                                                                                                                                                             |
| NFR5        | partial     | Monorepo compatibility mostly addressed. Missing template files in `.oat/templates/docs-app-fuma/` affect generated consumer dependency correctness.                                                      |

### Extra Work (not in declared requirements)

None. All plan tasks map to declared requirements.

## Structural Quality

### Task Granularity

Task granularity is appropriate. Each task targets a focused set of files with a clear purpose. The 9-task / 3-phase structure is manageable.

### Task Ordering and Dependencies

Task ordering is correct:

- p01-t01 (test expectations) before p01-t02 (implementation to make tests pass) follows TDD.
- p01-t03 (manifests) logically follows contract implementation.
- Phase 2 depends on Phase 1 manifest changes being complete.
- Phase 3 depends on the canonical names being established.

### Verification Steps

Each task includes explicit verification commands with expected outcomes. The verification approach is sound, using `rg` searches for drift detection and `pnpm test`/`pnpm build:docs`/`pnpm release:validate` for functional validation.

## Verification Commands

Run these to identify the full scope of `@tkstang` references that need coverage:

```bash
# Find all @tkstang references excluding .oat/projects (plan/spec/design artifacts)
rg -n '@tkstang' --glob '!.oat/projects/**' /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit

# Specifically check the missed template files
rg -n '@tkstang' /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit/.oat/templates/docs-app-fuma/

# Check the missed source files in publishable packages
rg -n '@tkstang' /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit/packages/docs-config/src/source-config.ts /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit/packages/docs-transforms/src/remark-mermaid.ts

# Check the missed documentation files
rg -n '@tkstang' /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit/packages/cli/AGENTS.md /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit/apps/oat-docs/docs/contributing/design-principles.md

# Check knowledge base files
rg -n '@tkstang' /Users/thomas.stang/.codex/worktrees/ca1c/open-agent-toolkit/.oat/repo/knowledge/
```
