---
oat_generated: true
oat_generated_at: 2026-09-08T09:06:11Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/migrate-skill-versions
oat_gate_headless: true
oat_gate_run_id: ccc5d92e-4ae9-43e6-8722-5d97ea1b8749
oat_gate_target: codex-5-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-09-08T09:06:11Z
**Scope:** Quick-mode plan readiness against discovery, live repository state, and the referenced backlog item
**Files reviewed:** 2 primary artifacts
**Commits:** Not applicable (artifact review)

## Review Scope

- Workflow mode: `quick`
- Primary artifacts: `plan.md`, `discovery.md`
- Supporting evidence: `implementation.md`, `state.md`, `BL-260904-migrate-bundled-skills-from`, root/PJM/plan-writing instructions, current reader and test sources, operator RC instructions, and live `origin/main`
- Dispatch Profile advisory: the optional section is absent, which is normal; there are no phase ceiling rows to validate.
- Gate route: inline (`runtime=codex`, `cliRoot=/Users/tstang/orca/workspaces/open-agent-toolkit/repo-improve-wave`)
- Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

## Summary

The plan accurately captures the 82-skill migration, the known raw readers, the backlog closeout, and the lockstep release bump; the live branch and remote still match its base/version assumptions. It is not ready for implementation because every artifact-writing task omits the required concrete write/fix formatting step, and the RC-builder task permits an import placement that breaks the builder's current clean-checkout self-build path. Two additional plan/repository mismatches should be corrected in the same revision.

Findings: 0 critical, 2 important, 2 medium, 0 minor

## Findings

### Critical

None

### Important

- **Every task omits the required concrete write/fix formatting step** (`.oat/projects/shared/migrate-skill-versions/plan.md:82`)
  - Issue: All five tasks move from implementation/refactor directly to check-only verification and commit. The planning contract requires a concrete repository write/fix command in the `Format` step of every artifact-writing task (`.agents/skills/oat-project-plan-writing/SKILL.md:66-79`); `pnpm format` in p01-t02 and p02-t01 is a check, not a write/fix command. As written, an implementer can follow every task exactly and commit unformatted TypeScript, MJS, Markdown, generated indexes, and provider projections.
  - Fix: Add a pre-commit `Format` step to p01-t01 through p02-t02 using the repository-documented write/fix path. Prefer file-scoped `pnpm exec oxfmt --write ...` invocations that enumerate each task's created/edited files; use the broader documented `pnpm format:fix` only where generated scope cannot be bounded. Keep `pnpm format` as the subsequent check.

- **The RC-reader task permits loading `dist` before the builder creates it** (`.oat/projects/shared/migrate-skill-versions/plan.md:77`)
  - Issue: p01-t01 allows the canonical resolver import “at module top” and treats absent `dist` as a caller error. The current builder runs `pnpm build` itself before reading bundled skill versions (`tools/release/build-explainer-rc.mjs:83-84`), and the operator RC instructions invoke the builder without a preceding `pnpm build` (`.agents/skills/oat-explainer-kit/references/migration.md:62-71`). Because `packages/cli/dist` is untracked, the allowed top-level import makes that documented clean-checkout command fail before the builder reaches its own build. Existing tests run after a workspace build and do not prove this path.
  - Fix: Remove the top-level-import option. Require a lazy import of the built resolver only after the existing internal `pnpm build` succeeds, await the now-async read in the skill loop, and add a control proving the builder reaches and uses its internal build when no pre-existing CLI `dist` is available. If the project intentionally adds a pre-build prerequisite instead, update every operator RC instruction and test that contract explicitly.

### Medium

- **The plan demands parser diagnostics that the canonical resolver does not expose** (`.oat/projects/shared/migrate-skill-versions/plan.md:70`)
  - Issue: The malformed-frontmatter test must “name the parse failure,” and Step 2 says to report “the resolver's detail.” The current `parseSkillFrontmatter` returns only `malformed` and `unusableVersionDeclaration` flags plus resolved values (`packages/cli/src/commands/shared/frontmatter.ts:369-408`); `resolveSkillVersion` returns `null` for malformed input and carries no parser diagnostic (`packages/cli/src/commands/shared/frontmatter.ts:419-444`). The declared p01-t01 file boundary therefore cannot produce a parser-specific detail without reparsing YAML or changing the shared contract outside scope.
  - Fix: Either specify a generic `E_SKILL_VERSION` malformed-frontmatter message derived from the existing flag and test that exact category, or explicitly add the shared parser/API files and their tests to p01-t01 so a canonical diagnostic can be exposed. Do not add a second YAML parse solely to manufacture the detail.

- **The Phase 2 commit recipes can stage unrelated work** (`.oat/projects/shared/migrate-skill-versions/plan.md:210`)
  - Issue: p02-t01 stages whole trees such as `.agents/skills`, `packages/cli/src`, `.github`, and every provider directory while suppressing path errors; p02-t02 stages `packages/*/package.json`. This conflicts with the plan's own instruction to stage exactly the rewritten provider paths and can absorb unrelated edits present when the task runs.
  - Fix: Have the transformation and `oat sync` produce the exact changed-file manifest, verify it contains no unexpected deletion/path, and stage only those paths plus the explicitly named test/manifest files. In p02-t02, list the five public package manifests literally. Remove `2>/dev/null` so a missing expected projection remains visible.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, `.oat/repo/pjm/backlog/items/BL-260904-migrate-bundled-skills-from.md`, root/PJM/plan-writing instructions, current implementation/test sources, operator RC instructions, and live local/remote repository state. No spec or design artifact is required or present for this quick-mode project.

### Requirements Coverage

| Requirement                                                          | Status  | Notes                                                                                                                                                                            |
| -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrate all 82 bundled skills, bump each once, and repoint every pin | planned | p02-t01 covers the canonical tree, every inventoried skill-version assertion, provider projections, the sync manifest, structural assertions, and categorical negative controls. |
| Update both non-resolver production readers before migration         | partial | Both readers and red/green cases are owned, but p01-t01 permits an import placement that breaks the builder's documented clean-checkout path.                                    |
| Run after the execution-program skill-editing waves                  | met     | Local and remote `main` both resolve to `5b3b821513330c80a165534c30b44c1e34c72fe2`; all five public packages remain at `0.2.64`.                                                 |
| Record the alias retirement schedule and create its follow-up        | planned | p02-t02 supplies the decision workflow, decision inputs, accepted exception, and follow-up backlog creation.                                                                     |
| Archive the source backlog item with an outcome summary              | planned | p02-t02 owns the acceptance sweep, atomic archive command, completed ledger/index updates, and shipping commit.                                                                  |
| Run the repository Definition of Done                                | planned | The final phase lists the eight CI gates in order, then the required cache-replay and supplemental checks.                                                                       |
| Format every task's created/edited files before commit               | missing | No task contains the planning-contract-required concrete write/fix formatting step; see Important finding 1.                                                                     |

### Extra Work (not in declared requirements)

None. Agent-role migration remains explicitly deferred, and the self-contained installed `check-core.mjs` reader is documented as an accepted, parity-tested exception.

## Verification Commands

```bash
pnpm run --silent cli -- project validate-plan --project-path .oat/projects/shared/migrate-skill-versions --json
rg -n 'Step [0-9]+: Format|oxfmt --write|format:fix' .oat/projects/shared/migrate-skill-versions/plan.md
rg -n 'at module top|resolver.s detail|git add \.agents/skills|packages/\*/package.json|2>/dev/null' .oat/projects/shared/migrate-skill-versions/plan.md
pnpm exec oxfmt --check .oat/projects/shared/migrate-skill-versions/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the two Important and two Medium findings into plan tasks or artifact revisions before implementation.
