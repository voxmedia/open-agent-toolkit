---
oat_generated: true
oat_generated_at: 2026-07-08T21:53:36Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/codex-family-subagents
---

# Artifact Review: plan (re-review)

**Reviewed:** 2026-07-08T21:53:36Z
**Scope:** `plan.md` (quick mode; upstream requirements source: `discovery.md`) — gate re-review after fixes from `reviews/archived/artifact-plan-review-2026-07-08T214156Z.md`
**Files reviewed:** 2 in-scope artifacts (`plan.md`, `discovery.md`) plus filesystem verification of every Create/Modify path in the two new/changed tasks and grep sweeps of `.agents/` and `apps/oat-docs/docs` for old pinned-variant references
**Commits:** N/A (artifact review)

## Summary

All 8 prior findings are fixed in the revised 14-task plan: the new p02-t05 closes the critical bundled-contract gap (both `.agents/skills/oat-project-implement/SKILL.md` and `.agents/agents/oat-reviewer.md` are in scope with contract tests and version bumps), the Phase 2 intro now records explicit compatibility and policy-mapping decisions (with `discovery.md` updated to match), p03-t04 adds the Codex model-availability validation, and all four smaller fixes landed as claimed. Only three new minor issues remain — a line-level gap in p04-t01's verification grep, one residual discovery open sub-question without an explicit plan deferral, and a pre-existing Files-list omission in p01-t01 of the same class as prior finding 6 — none of which block implementation readiness.

Findings: 0 critical, 0 important, 0 medium, 3 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **p04-t01 Step 4 verification grep misses `-medium`/`-high` variant lines** (`plan.md:987`)
  - Issue: The verify command greps only for `oat-phase-implementer-low`, `oat-phase-implementer-xhigh`, `oat-reviewer-low`, and `oat-reviewer-xhigh`, but the actual stale docs lines include `oat-phase-implementer-medium` (`apps/oat-docs/docs/workflows/projects/implementation-execution.md:140`) and `oat-phase-implementer-high` (`apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md:237`, `apps/oat-docs/docs/provider-sync/providers.md:45`). Today every affected file also contains a `-low`/`-xhigh` hit so all five files surface, but once those lines are fixed the grep goes clean while `-medium`/`-high` mentions can linger, giving a false GREEN. (Step 1's prose instruction "Grep all docs for old effort-pinned role references" is complete; only the runnable command is narrower.)
  - Suggestion: Widen the Step 4 command, e.g. `grep -rnE "oat-phase-implementer-(low|medium|high|xhigh)|oat-reviewer-(low|medium|high|xhigh)" apps/oat-docs/docs`.

- **Residual "Cursor Agent Shape" open sub-questions have no explicit plan deferral** (`discovery.md:287-292`; plan has no corresponding note)
  - Issue: Discovery marks the model-axis question resolved but leaves two sub-questions "Still open": whether OAT should generate `model` frontmatter for default/fallback behavior, and whether `readonly`/`is_background` should be generated from canonical/OAT role metadata. The plan neither addresses nor explicitly defers these; every other open question is now decided in the Phase 2 intro or recorded as deferred in discovery.
  - Suggestion: Add a one-line explicit deferral to the plan (Phase 3 intro or References), e.g. "Cursor frontmatter generation for `model` default/fallback and `readonly`/`is_background` is deferred; dispatch-time Task `model` args are the shipped mechanism."

- **p01-t01 Step 4 runs a test file not in the task's Files list** (`plan.md:133` vs `plan.md:64-69`)
  - Issue: Step 4 runs `src/providers/codex/codec/export-to-codex.test.ts`, but Files lists only `export-to-codex.ts` (source), not its test. Same class as prior finding 6 (fixed for p02-t02): if the `exportCanonicalAgentToCodexRole` reuse changes observable behavior, the test file will need edits the task does not declare.
  - Suggestion: Add `packages/cli/src/providers/codex/codec/export-to-codex.test.ts` to the Files list.

## Prior-Findings Disposition

| #   | Prior finding (severity)                                                  | Disposition | Evidence in current artifacts                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bundled dispatch contracts not updated for pinned-role removal (Critical) | fixed       | New task p02-t05 (`plan.md:572-641`): Files include `.agents/skills/oat-project-implement/SKILL.md`, `.agents/agents/oat-reviewer.md`, `review-skill-contracts.test.ts`, `bundle-consistency.test.ts`, `validation/skills.test.ts`; RED tests assert no old `agent_type` variants and require resolver-returned role names; skill/agent `version:` bumps instructed (`plan.md:615-617`; `oat-reviewer.md` does carry `version: 1.1.4`). All Modify paths verified to exist. |
| 2   | Legacy compatibility semantics undecided (Important)                      | fixed       | "Compatibility decision" paragraph (`plan.md:295-301`): no compatibility branch ships; bare effort-only targets resolve unresolved for model-aware dispatch; full sync removes stale effort-only roles. Conditional wording removed from p02-t01 Step 2 (`plan.md:356-358`, now unconditional) and p02-t02 Step 1 (`plan.md:398-402`, no "unless legacy branch enabled" clause). Consistent with p02-t03's RED test (`plan.md:468-469`).                                    |
| 3   | p04-t01 docs list missed three pages (Important)                          | fixed       | Files now include `provider-sync/config.md`, `workflows/projects/implementation-execution.md`, `workflows/projects/dispatch-ceiling.md` (`plan.md:937,940-941`); grep acceptance requirement added (`plan.md:961-962`) and grep verify step added (`plan.md:987`). Independent grep confirms all five docs files with stale references are now in the Files list. Residual line-level grep-pattern gap recorded as new Minor.                                               |
| 4   | Codex-side preview/unavailable model validation unplanned (Medium)        | fixed       | New task p03-t04 (`plan.md:858-922`): mockable `codex debug models` catalog probe, `unknown-value` for absent models, `unvalidated` + doctor warning when the probe is unavailable, model/effort validated independently, shared result shapes with Cursor. Phase 3 intro updated (`plan.md:648-650`). All Modify paths exist.                                                                                                                                              |
| 5   | Policy-mapping open question neither resolved nor deferred (Medium)       | fixed       | "Policy mapping decision" paragraph (`plan.md:303-307`): no default policy-to-family mapping ships; policy rungs stay abstract; model families come from matrix targets; backlog item gates recommended mappings. `discovery.md:282-285` updated in lockstep to record the deferral — no upstream drift.                                                                                                                                                                    |
| 6   | p02-t02 verify ran status test not in Files (Minor)                       | fixed       | Files now include both `packages/cli/src/commands/status/index.ts` and `packages/cli/src/commands/status/index.test.ts` (`plan.md:391-392`); Step 4 (`plan.md:433`) and commit paths (`plan.md:441`) are consistent.                                                                                                                                                                                                                                                        |
| 7   | p04-t02 commit staged over-broad paths (Minor)                            | fixed       | Commit now stages exactly the five `packages/*/package.json` files, `packages/cli/assets/public-package-versions.json`, and `pnpm-lock.yaml` (`plan.md:1059`) — matching the task's Files list.                                                                                                                                                                                                                                                                             |
| 8   | Reviews table marked quick-mode N/A rows `pending` (Minor)                | fixed       | `spec` and `design` rows now carry status `passed` with artifact "N/A quick mode" (`plan.md:1075-1076`); no gate reads as outstanding; all prior review rows preserved, and the plan row correctly reflects `fixes_completed` with the archived artifact path (`plan.md:1077`).                                                                                                                                                                                             |

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (artifact under review), `discovery.md` (upstream requirements — quick mode; missing `spec.md`/`design.md` is expected and not flagged), prior archived review artifact, `implementation.md`/`state.md` available as context, filesystem checks of all new/changed Create/Modify paths, and grep sweeps of `.agents/` and `apps/oat-docs/docs`.

### Requirements Coverage (discovery → plan)

| Discovery requirement / decision                                                          | Status  | Notes                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| Generic Codex materialization primitive (Decision 5, Success Criteria 1-2)                | covered | Phase 1 (p01-t01..t03): codec, CLI command, write/merge                                                    |
| Replace hard-coded effort pins incl. bundled contracts (Decision 5, Constraint)           | covered | p02-t01..t04 code paths + new p02-t05 for skill/agent dispatch contracts (prior Critical closed)           |
| Compatibility explicit and temporary (Constraint)                                         | covered | Compatibility decision paragraph (`plan.md:295-301`): none ships; removal via full sync                    |
| Matrix as source of truth for model+effort targets (Option A)                             | covered | p02-t01                                                                                                    |
| Dispatch to materialized roles with accurate stamps (Success Criterion 5)                 | covered | p02-t03 (registry, dispatch-ceiling, identity/stamp)                                                       |
| Managed roles not treated as strays; doctor awareness (Constraint)                        | covered | p02-t04                                                                                                    |
| Cursor Task-level model dispatch, subagent allow-list validation (Decision 4, Constraint) | covered | p03-t01; dispatch-time routing pre-exists from `multi-family-dispatch`                                     |
| Prompt safety: enum-generated option lists (Decision 6)                                   | covered | p03-t02, p03-t03                                                                                           |
| Behavior-level policy wording incl. `frontier`, uncapped/inherit/unresolved (Decision 7)  | covered | p03-t02 canonical descriptions match discovery wording                                                     |
| Preview-only/unavailable model IDs fail or warn clearly (Success Criterion 7)             | covered | p03-t01 (Cursor) + new p03-t04 (Codex) — prior Medium closed                                               |
| Docs, lockstep versions, release validation (Constraint, Success Criterion 6)             | covered | p04-t01 (expanded file list + grep step), p04-t02 (lockstep five packages + `release:validate`)            |
| `max`/`ultra` effort deferred behind provider evidence (Option B, Out of Scope)           | aligned | Plan correctly omits; discovery Option B records the deferral                                              |
| Policy→model-family mapping (Open Question)                                               | aligned | Explicitly deferred in both `plan.md:303-307` and `discovery.md:282-285`                                   |
| Cursor Agent Shape residual sub-questions (Open Question)                                 | partial | `model` frontmatter default and `readonly`/`is_background` generation not deferred in plan (Minor finding) |
| Managed `high` dispatch policy for this project (Decision 8)                              | aligned | Planning Checklist records managed `high`                                                                  |

### Extra Work (not in declared requirements)

None. Both new tasks (p02-t05, p03-t04) trace directly to prior review findings rooted in discovery constraints/success criteria. The sequential-only parallelism claim remains consistent with the overlapping file surfaces (p03-t01/p03-t04 share availability/config/doctor files; p02-t05/p03-t03 share `oat-project-implement/SKILL.md`), matching `oat_plan_parallel_groups: []`.

### Structure Check

- Task IDs remain monotonic per phase; new tasks appended as p02-t05 and p03-t04 without reusing or renumbering prior IDs. Phase/task totals in Implementation Complete (3+5+4+2 = 14) are accurate.
- Every Modify path in the new/changed tasks exists in the repo; all Create paths (`materialize.ts`, `commands/providers/codex/`, `dispatch-policy-options.ts`) are genuinely new.
- Repo policy alignment: skill `version:` bumps instructed in p02-t05 and p03-t03; lockstep five-package bump + `pnpm release:validate` in p04-t02; docs index regenerated only via tooling (p04-t01 Step 3).
- No `## Dispatch Profile` section — normal, not flagged; no override rows to evaluate.
- `## Reviews`, `## Implementation Complete`, and `## References` present; all existing review rows preserved.

## Verification Commands

Run these to verify fixes to the three minor findings:

```bash
# Minor 1: widened grep should be the one in p04-t01 Step 4
grep -rnE "oat-phase-implementer-(low|medium|high|xhigh)|oat-reviewer-(low|medium|high|xhigh)" apps/oat-docs/docs

# Minor 2: confirm an explicit Cursor agent-shape deferral appears in the plan
grep -n -i "readonly\|is_background\|frontmatter.*fallback\|agent shape" .oat/projects/shared/codex-family-subagents/plan.md

# Minor 3: confirm p01-t01 Files list declares the export-to-codex test it runs
grep -n "export-to-codex.test.ts" .oat/projects/shared/codex-family-subagents/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
