---
oat_generated: true
oat_generated_at: 2026-07-08T21:41:56Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/codex-family-subagents
---

# Artifact Review: plan

**Reviewed:** 2026-07-08T21:41:56Z
**Scope:** `plan.md` (quick mode; upstream requirements source: `discovery.md`)
**Files reviewed:** 2 in-scope artifacts (`plan.md`, `discovery.md`) plus repo verification of every path the plan marks Create/Modify and grep sweeps for old pinned-role references
**Commits:** N/A (artifact review)

## Summary

The plan is well structured, sequential with sound dependency ordering, and its 12 tasks are atomic with concrete RED/GREEN/verify/commit steps and runnable commands. Every Modify path in the plan exists in the repo. However, Phase 2 removes the effort-pinned Codex role generation while no task updates the bundled dispatch contracts (`oat-project-implement` skill, `oat-reviewer` agent) that hard-require the old role names, which would ship a self-contradictory workflow; the legacy-compatibility story and two discovery follow-ups (Codex-side preview-model validation, policy-to-model mapping) are also left ambiguous rather than decided or explicitly deferred.

Findings: 1 critical, 2 important, 2 medium, 3 minor

## Findings

### Critical

- **Phase 2 removes pinned Codex roles but no task updates the bundled dispatch contracts that require them** (`plan.md:287` Phase 2; evidence: `.agents/skills/oat-project-implement/SKILL.md:212,455-491,576-578,935-936,943,985,1000,1025,1046` and `.agents/agents/oat-reviewer.md:71`)
  - Issue: p02-t02 stops generating `oat-phase-implementer-{low,medium,high,xhigh}` / `oat-reviewer-{low,medium,high,xhigh}` and p02-t03 dispatches materialized model+effort role names. But the shipped `oat-project-implement` skill contains MUST-level contracts binding `agent_type` to the old variant names (e.g., "the argument map MUST use the matching `agent_type`: `oat-phase-implementer-low` ..."), and the canonical `oat-reviewer` agent's Dispatch Control section names the old pinned reviewer variants. No task file list includes `.agents/agents/oat-reviewer.md`, and p03-t03 touches `oat-project-implement/SKILL.md` only for dispatch-policy option menus, not the dispatch-target naming contract. Executing the plan as written would make every capped Codex dispatch instruct the orchestrator to spawn roles that no longer exist.
  - Fix: Add a task (in Phase 2 after p02-t03, or expand p03-t03's scope) to rewrite the Codex dispatch-target contract in `.agents/skills/oat-project-implement/SKILL.md` and `.agents/agents/oat-reviewer.md` to the materialized role-name mechanism (resolver-returned role name, not hardcoded variant strings), bump each changed skill/agent `version:`, and extend `review-skill-contracts.test.ts` to fail on stale pinned-variant `agent_type` requirements.
  - Requirement: Discovery Key Decision 5 (remove hard-coded pins) + Success Criterion "Dispatch stamps/reporting preserve model axis, effort axis, policy, target, and provenance accurately."

### Important

- **Legacy compatibility semantics are referenced but never decided** (`plan.md:341-344` p02-t01 Step 2; `plan.md:384-385` p02-t02 Step 1)
  - Issue: p02-t01 says bare effort values are "a legacy compatibility path only when explicitly retained by the resolver" and p02-t02 tests that old roles are not generated "unless a legacy compatibility branch is explicitly enabled." The plan never states whether the compatibility branch exists at all, what enables it (flag, config key, resolver condition), or when it is removed. Discovery constrains this directly: "Compatibility, if any is required during the migration, must be explicit and temporary." A fresh implementer must re-derive this decision, and p02-t01/p02-t02/p02-t03 could each resolve it differently.
  - Fix: State the decision in the plan (Phase 2 intro or p02-t01): either "no compatibility branch — bare effort targets are rejected/reported unresolved, and old managed roles are removed on full sync" or define the exact enablement mechanism and its removal condition.

- **p04-t01 docs file list misses pages that document the mechanism being removed** (`plan.md:778-786` p04-t01 Files; evidence: `apps/oat-docs/docs/provider-sync/config.md`, `apps/oat-docs/docs/workflows/projects/implementation-execution.md`, `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`)
  - Issue: Grep confirms three docs pages outside the task's file list reference the old effort-pinned variant names/mechanism. p04-t01 lists only `configuration.md`, `config-and-local-state.md`, `providers.md`, `manifest-and-drift.md`, and `oat-directory-structure.md`, so the docs build would pass while shipped docs still describe the removed hard-coded pin generation.
  - Fix: Add the three pages to p04-t01's file list, or add an acceptance step: "grep `apps/oat-docs/docs` for `oat-reviewer-{low..xhigh}` / `oat-phase-implementer-{low..xhigh}` / effort-variant references and update or intentionally retain each hit."

### Medium

- **Codex-side preview/unavailable model validation is unplanned** (`plan.md:559-628` — validation work exists only for Cursor in p03-t01)
  - Issue: Discovery success criterion "Preview-only or unavailable model IDs fail or warn clearly rather than being silently treated as host defaults" applies to both providers, and the False Determinism risk's mitigation calls for a live Codex smoke or catalog check. The plan validates Cursor subagent eligibility (p03-t01) but no task makes config/doctor warn when a Codex matrix target names a model absent from the local Codex catalog (e.g., `gpt-5.6-sol` while local Codex advertises only `gpt-5.5`).
  - Fix: Add a validation/warning path for Codex model IDs (doctor or config validation against `codex debug models` output, mockable in tests), or record an explicit deferral in the plan with rationale (e.g., "materialized TOML pins are written as-configured; availability checking deferred to the backlog item").

- **Open question "Policy Mapping" is neither resolved nor explicitly deferred** (`plan.md:295-366` p02-t01; upstream `discovery.md` Open Questions: Policy Mapping)
  - Issue: Discovery leaves open whether policy rungs map to model families by default (balanced→Terra, frontier→Sol, economy→Luna) or stay effort-only. The plan builds the matrix-target machinery but never states what a capped Codex policy does when no matrix model target is configured, which p02-t02 (desired-role computation) and p02-t03 (dispatch resolution) both need to know.
  - Fix: Add a short decision note to Phase 2: e.g., "no default policy→model mapping ships in this project; a capped Codex policy without a matrix model target resolves as unresolved/legacy-effort per p02-t01's rule" — or explicitly defer the mapping question with a pointer to where it will be decided.

### Minor

- **p02-t02 verification runs a test file not in the task's file list** (`plan.md:420` vs `plan.md:372-378`)
  - Issue: Step 4 runs `src/commands/status/index.test.ts`, but Files only lists `src/commands/status/index.ts`. If status behavior changes, its test file will need edits the task doesn't declare.
  - Suggestion: Add `packages/cli/src/commands/status/index.test.ts` to the Files list.

- **p04-t02 commit step stages over-broad paths** (`plan.md:897`)
  - Issue: `git add package.json pnpm-lock.yaml packages apps .agents` sweeps directories whose changes belong to earlier task commits (docs in p04-t01, skills in p03-t03) and risks committing unintended files.
  - Suggestion: Stage only the version-bump surfaces: the five `packages/*/package.json` files, `pnpm-lock.yaml`, and `packages/cli/assets/public-package-versions.json` if regenerated.

- **Reviews table marks quick-mode N/A rows as `pending`** (`plan.md:913-914`)
  - Issue: The `spec` and `design` rows carry status `pending` with artifact "N/A quick mode." `pending` reads as an outstanding gate to tooling/readers even though these reviews can never occur in quick mode.
  - Suggestion: Use a terminal marker (e.g., status `passed` with note, or `n/a`) so no gate appears outstanding. Do not delete the rows.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (artifact under review), `discovery.md` (upstream requirements — quick mode, no spec.md/design.md), `implementation.md`/`state.md` (available, consulted for context only), repo filesystem checks for all Create/Modify paths, and grep sweeps across `.agents/`, `packages/cli/src`, and `apps/oat-docs/docs` for old pinned-variant references.

### Requirements Coverage (discovery → plan)

| Discovery requirement / decision                                                          | Status        | Notes                                                                                      |
| ----------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| Generic Codex materialization primitive (Decision 5, Success Criterion 2)                 | covered       | Phase 1 (p01-t01..t03): codec, CLI command, write/merge                                    |
| Replace hard-coded effort pins (Decision 5, Constraint)                                   | partial       | Phase 2 covers code; bundled skill/agent dispatch contracts not covered (Critical finding) |
| Compatibility explicit and temporary (Constraint)                                         | partial       | Referenced but undecided (Important finding)                                               |
| Matrix as source of truth for model+effort targets (Option A)                             | covered       | p02-t01                                                                                    |
| Dispatch to materialized roles with accurate stamps (Success Criterion 5)                 | covered       | p02-t03 (registry, dispatch-ceiling, identity/stamp)                                       |
| Managed roles not treated as strays; doctor awareness (Constraint)                        | covered       | p02-t04                                                                                    |
| Cursor Task-level model dispatch, subagent allow-list validation (Decision 4, Constraint) | covered       | p03-t01; dispatch-time routing itself pre-exists from `multi-family-dispatch`              |
| Prompt safety: enum-generated option lists (Decision 6)                                   | covered       | p03-t02, p03-t03                                                                           |
| Behavior-level policy wording incl. `frontier`, uncapped/inherit/unresolved (Decision 7)  | covered       | p03-t02 canonical descriptions match discovery wording                                     |
| Preview-only/unavailable model IDs fail or warn clearly (Success Criterion 7)             | partial       | Cursor only (p03-t01); Codex side unplanned (Medium finding)                               |
| Docs, lockstep versions, release validation (Constraint, Success Criterion 6)             | partial       | Phase 4 present; docs file list incomplete (Important finding)                             |
| `max`/`ultra` effort deferred behind provider evidence (Option B, Out of Scope)           | aligned       | Plan correctly omits; discovery records the deferral                                       |
| Managed `high` dispatch policy for this project (Decision 8)                              | aligned       | Planning Checklist records managed `high`                                                  |
| Policy→model-family mapping (Open Question)                                               | not addressed | Neither resolved nor explicitly deferred (Medium finding)                                  |

### Extra Work (not in declared requirements)

None. All 12 tasks trace to discovery decisions, constraints, or success criteria. The sequential-only parallelism claim is consistent with the overlapping file surfaces the phases share, matching `oat_plan_parallel_groups: []`.

### Structure Check

- Frontmatter complete and mode-consistent (`oat_plan_source: quick`, `oat_ready_for: oat-project-implement`).
- Task IDs `pNN-tNN` are monotonic per phase; each task is independently committable with bounded file scope, runnable verification, and a commit message.
- `## Reviews`, `## Implementation Complete`, and `## References` sections present; existing review rows preserved.
- No `## Dispatch Profile` section — normal, not flagged (per gate advisory); no override rows to evaluate.
- All Create/Modify paths verified to exist (Modify) or be genuinely new (Create).

## Verification Commands

Run these to verify fixes to the plan artifact:

```bash
# Critical/Important: confirm no bundled contract or docs page still hard-requires old pinned variant names
grep -rn "oat-phase-implementer-low\|oat-phase-implementer-xhigh\|oat-reviewer-low\|oat-reviewer-xhigh" .agents apps/oat-docs/docs

# Confirm the plan enumerates the skill/agent contract updates and the three missing docs pages
grep -n "oat-project-implement/SKILL.md\|oat-reviewer.md\|implementation-execution.md\|provider-sync/config.md\|dispatch-ceiling.md" .oat/projects/shared/codex-family-subagents/plan.md

# Confirm legacy-compatibility and policy-mapping decisions are written down
grep -n -i "legacy\|compatib\|policy.*mapping\|no default.*mapping" .oat/projects/shared/codex-family-subagents/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
