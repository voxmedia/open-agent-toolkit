---
oat_generated: true
oat_generated_at: 2026-03-05
oat_review_scope: plan
oat_review_type: artifact
oat_project: .oat/projects/shared/oat-docs-platform
---

# Artifact Review: plan

**Reviewed:** 2026-03-05
**Scope:** plan.md artifact (import mode)
**Files reviewed:** 2
**Upstream reference:** references/imported-plan.md

## Summary

The normalized plan is well-structured across 3 phases and 12 tasks, faithfully covering the majority of the imported plan's requirements. Task granularity is appropriate and TDD discipline is consistently applied. However, there are a few gaps: reserved CLI entrypoints for `oat docs analyze` and `oat docs apply` are not addressed, the single-package repo scaffold scenario lacks explicit test coverage, and several tasks have vague file paths or RED steps that do not produce genuinely failing tests.

## Findings

### Critical

None

### Important

- **Reserved CLI entrypoints `oat docs analyze` / `oat docs apply` not planned** (`plan.md`)
  - Issue: The imported plan explicitly states "Reserve `oat docs analyze` and `oat docs apply` as later phase entrypoints that wrap the docs skill workflow and shared deterministic helpers." No task in the normalized plan registers these CLI subcommands. Phase 3 creates the skills but never wires them into the CLI namespace.
  - Fix: Add a task (or extend p03-t01) to register `oat docs analyze` and `oat docs apply` as CLI commands that delegate to the skills. Include help-snapshot tests for them.
  - Requirement: Imported plan, "CLI surface and defaults", bullet 4

- **Single-package repo scaffold scenario missing from test coverage** (`plan.md`, p01-t02 and p01-t03)
  - Issue: The imported plan's test plan explicitly requires "Scaffold integration test for a single-package repo fixture with no workspace" and states "Single-package repos must not be forced to become a workspace." The normalized plan mentions single-package detection in p01-t02 but no task includes an integration test fixture for scaffolding into a non-workspace repo, nor verifies the no-forced-workspace constraint.
  - Fix: Add explicit test expectations in p01-t03 (or a new sub-task) for scaffolding in a single-package repo fixture, verifying that no workspace file is created.
  - Requirement: Imported plan, "CLI surface and defaults" and "Test Plan"

- **p02-t01 RED step is not a real failing test** (`plan.md:209-213`)
  - Issue: The RED step is `test -d apps/oat-docs && exit 1 || exit 0`, which is a shell precondition check, not a test that will fail and then pass after implementation. This breaks TDD discipline -- there is no test artifact that captures the expected scaffold output.
  - Fix: Replace with a proper test or at minimum add a test expectation that verifies the scaffold output structure (file list, package.json scripts, mkdocs.yml presence) after running `oat docs init`.
  - Requirement: Plan convention (TDD RED-GREEN-REFACTOR)

- **p02-t04 RED step expects failure as success** (`plan.md:316-317`)
  - Issue: The RED step says "Expected: At least one issue surfaces during first dogfood pass if the scaffold or migration missed a detail." This is speculative -- if the scaffold is correct, there is no failing test to drive the GREEN step. This is not a valid RED step.
  - Fix: Reframe as a verification/hardening task rather than a TDD task, or define concrete known-gap assertions that will fail.
  - Requirement: Plan convention (TDD RED-GREEN-REFACTOR)

### Medium

- **Phase 3 tasks lack concrete file paths** (`plan.md:346-483`)
  - Issue: Tasks p03-t01 through p03-t04 use vague file paths like "Create/Modify: `.agents/skills/oat-docs-analyze/**`" and "Modify: OAT docs app content/templates/tests based on findings." This makes it hard for an implementing agent to know exactly what files to create.
  - Fix: Specify expected skill file names (e.g., `skill.md`, any template files) and the tracking artifact paths. Reference the existing agent-instructions skills as a concrete template for the file structure.

- **Phase 3 verification relies solely on skill validation** (`plan.md:368-369, 404, 440`)
  - Issue: Tasks p03-t01, p03-t02, and p03-t03 all use `pnpm run cli -- internal validate-oat-skills` as their only verification. This validates metadata structure but does not verify functional correctness of the skills' logic or output.
  - Fix: Add verification steps that exercise the skill logic directly (e.g., running analyze against a fixture docs tree, checking that output matches expected structure).

- **p03-t04 RED step invokes a skill name directly** (`plan.md:462-463`)
  - Issue: The RED step says `Run: oat-docs-analyze` which is not a valid shell command. Skills are invoked through the CLI or agent context, not directly.
  - Fix: Specify the actual invocation method (e.g., `pnpm run cli -- docs analyze --target-dir apps/oat-docs` or clarify this is an agent-driven step).

- **Monorepo scaffold integration test not explicitly planned** (`plan.md`)
  - Issue: The imported plan's test plan requires "Scaffold integration test for a monorepo fixture" but the normalized plan only includes unit-level tests for repo-shape detection. No task explicitly creates an integration test fixture for monorepo scaffolding.
  - Fix: Add integration test expectations in p01-t03 that scaffold into a temporary monorepo fixture and verify the output.

### Minor

- **Reviews table includes spec/design rows despite import mode** (`plan.md:499-500`)
  - Issue: The reviews table includes rows for `spec` and `design` artifact reviews, but state.md confirms these artifacts were skipped in import mode. These rows will never be actionable.
  - Suggestion: Remove the spec/design review rows or mark them as "n/a (import mode)" to avoid confusion.

- **`oat_plan_hill_phases` is empty** (`plan.md:8`)
  - Issue: The frontmatter has `oat_plan_hill_phases: []` and the planning checklist says "[x] Set `oat_plan_hill_phases` in frontmatter" but no phases are listed. If HiLL checkpoints were confirmed, they should be recorded.
  - Suggestion: Either populate with the confirmed hill checkpoint phase numbers or update the checklist to reflect that none were set.

- **p02-t02 verification uses `find` instead of project test infrastructure** (`plan.md:260-261`)
  - Issue: Verification is `find apps/oat-docs/docs -name 'overview.md'` which is a manual check, not a repeatable test assertion.
  - Suggestion: Wrap this in a test or script that can be re-run as part of CI.

- **Commit in p02-t03 step 2 references `rg` directly** (`plan.md:283`)
  - Issue: Step 1 uses `rg -n "docs/oat/" ...` as a test, which assumes ripgrep is installed. While likely available, this is a tool dependency not declared elsewhere.
  - Suggestion: Use grep or a Node-based check for portability, or document ripgrep as a dev dependency.

## Import Alignment

**Evidence sources used:** plan.md, references/imported-plan.md, state.md

### Requirements Coverage

| Requirement (from imported plan) | Status | Notes |
|----------------------------------|--------|-------|
| `oat docs` command group | covered | p01-t01 |
| `oat docs init` (interactive + flags) | covered | p01-t02, p01-t03 |
| `oat docs nav sync` | covered | p01-t04 |
| Reserve `oat docs analyze` CLI entrypoint | missing | Phase 3 adds skills but not CLI commands |
| Reserve `oat docs apply` CLI entrypoint | missing | Phase 3 adds skills but not CLI commands |
| Non-interactive flags (--app-name, --target-dir, --lint, --format, --yes) | covered | p01-t02 |
| Monorepo default placement (apps/<name>) | covered | p01-t02 |
| Single-package default placement (<name>/) | covered | p01-t02 |
| Single-package must not force workspace | partial | Mentioned in detection but no explicit test |
| Scaffolded app contract (mkdocs.yml, package.json, etc.) | covered | p01-t03 |
| MkDocs Material stack mirroring Honeycomb | covered | p01-t03 |
| contributing.md documenting plugins/extensions | covered | p01-t03 |
| index.md standard / overview.md deprecation | covered | p01-t04, p02-t02 |
| ## Contents reserved section contract | covered | p01-t04 |
| Scaffold OAT docs app in-repo | covered | p02-t01 |
| Migrate docs/oat/** content | covered | p02-t02 |
| Flatten redundant oat/ directory | covered | p02-t02 |
| Convert overview.md to index.md | covered | p02-t02 |
| Add ## Contents sections where missing | covered | p02-t02 |
| Regenerate nav from index contract | covered | p02-t03 |
| Update root links/references | covered | p02-t03 |
| oat-docs-analyze skill | covered | p03-t02 |
| oat-docs-apply skill | covered | p03-t03 |
| Analyze: full vs delta mode | covered | p03-t02 |
| Analyze: severity-rated findings | covered | p03-t02 |
| Apply: approval/skip flow | covered | p03-t03 |
| Apply: branch/PR creation | covered | p03-t03 |
| Apply: overview.md to index.md conversion | covered | p03-t03 |
| Dogfood analyze/apply on OAT docs | covered | p03-t04 |
| Scaffold integration test (monorepo fixture) | missing | Only unit tests for detection planned |
| Scaffold integration test (single-package fixture) | missing | Not in any task |
| Docs standards/reference content for index.md contract | covered | p01-t04 |

### Extra Work (not in imported plan)

None. The normalized plan stays within the scope of the imported plan.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
