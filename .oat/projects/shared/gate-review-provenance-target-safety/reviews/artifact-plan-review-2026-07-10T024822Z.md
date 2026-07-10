---
oat_generated: true
oat_generated_at: 2026-07-10T02:48:22Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/gate-review-provenance-target-safety
---

# Artifact Review: plan

**Reviewed:** 2026-07-10T02:48:22Z
**Scope:** Revised plan artifact (post-p00 prerequisite insertion), quick workflow
**Files reviewed:** 2 primary (`plan.md`, `discovery.md`) + `design.md` alignment context + repository source verification (dispatch-ceiling resolver, ceiling registry, config adoption, bundled recommendation asset, gate command, skills, docs, package manifests)

## Summary

The revised plan is coherent, well-bounded, and ready for implementation. The new p00 prerequisite phase stays strictly within the authorized dispatch-readiness repair (fail-closed resolution, non-destructive complete defaults, below-cap target retention, selected-role materialization) and its baseline claims were all verified against repository source, including the effort-only Codex recommendation cells, the destructive adoption path, and the below-cap target-dropping bug at `selectDispatchValue`. All four gate verification asks pass; only minor wording/coverage polish items were found.

Findings: 0 critical, 0 important, 0 medium, 4 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Unevidenced "Luna" model in the proposed default ladder** (`plan.md` p00-t01/p00-t02, line 85)
  - Issue: Step 1 of p00-t02 names a "provider-visible GPT-5.6 Luna/Terra/Sol ladder." `gpt-5.6-terra` and `gpt-5.6-sol` are evidenced in repo tests (`packages/cli/src/providers/identity/availability.test.ts:97-108`, `packages/cli/src/config/oat-config.test.ts:1333`), but `gpt-5.6-luna` appears nowhere in the repository. Three model names must also map onto four tiers (economy/balanced/high/frontier), and the exact tier -> (model, effort) mapping is left implicit.
  - Suggestion: During p00-t02 implementation, verify each ladder model against the live provider-visible model list before committing the recommendation asset, and record the exact tier -> model+effort mapping in the recommendation JSON. Step 4's "validate every recommended cell" already provides the safety net; making the mapping explicit in the plan step would remove the ambiguity.

- **p00-t01 regression coverage does not name a Cursor/model-arg case** (`plan.md` p00-t01 step 4, line 62)
  - Issue: The fail-closed change in `selectDispatchValue` (`packages/cli/src/commands/project/dispatch-ceiling/index.ts:1144-1247`) is provider-generic. Step 2 preserves "valid built-in compilation such as Claude `high -> opus` and `frontier -> fable`" and cross-harness advisory routes, but the step-4 coverage list (below/equal/above-cap, reviewer, uncapped) names no Cursor `model-arg` or existing-user-matrix regression case, even though the user's config carries a complete Cursor matrix (`discovery.md:61`) and Cursor compiles via the same `model-arg` mechanism as Claude (`packages/cli/src/providers/ceiling/registry.ts:136-140`).
  - Suggestion: Add an explicit Cursor (or generic model-arg cross-harness) preservation case to p00-t01 step 4's coverage list so the fail-closed tightening provably does not regress existing user matrix values on the resolution side.

- **Version-bump deferral wording omits the p00-t03 edits** (`plan.md` p04-t02 step 3, line 408; p02-t03 step 5, line 323)
  - Issue: p00-t03 step 5 correctly defers the PR-scoped skill bumps to "their final edits in p02-t03 and p04-t02," but p04-t02 step 3 says the bumps cover "both their p02 guidance edits and final p04 setup edits," and p02-t03 step 5 similarly mentions only its own task — neither mentions the p00-t03 dispatch-readiness edits introduced by the phase insertion. No functional impact (a PR-scoped bump covers all edits regardless), but the cross-reference is incomplete after the p00 insertion.
  - Suggestion: In p04-t02 step 3 and p02-t03 step 5, note that the single bumps also cover the p00-t03 preflight/materialization guidance edits.

- **Reviews table tracks a spec artifact review that cannot occur** (`plan.md` Reviews table, line 471)
  - Issue: The table carries `spec | artifact | pending`, but this quick-mode project has no `spec.md` (project directory contains only design/discovery/implementation/plan/state). The row can never progress past `pending`.
  - Suggestion: Annotate the row as not applicable for quick mode (e.g., status `n/a` or a dash with a note) rather than leaving it perpetually pending. Do not delete the row.

## Gate Verification Asks

1. **p00 scope containment — PASS.** All three p00 tasks map one-to-one onto the authorized prerequisite scope in `discovery.md:26` and the constraint at `discovery.md:85` (fail-closed readiness, defaults/adoption, selected-target resolution, materialization). No p00 task introduces route/policy/requested-controls schema, generalized renderer, or runtime-confirmation work; p00-t03's planning-skill edits are readiness/defaults guidance, matching discovery success criteria (`discovery.md:97-98`) and design's workflow contract tests (`design.md:452-453`). The design boundary statement (`design.md:91`) is respected.

2. **Claude built-in target preservation — PASS.** p00-t01 step 2 explicitly preserves Claude `high -> opus` / `frontier -> fable` compilation, inherit/default behavior, managed-uncapped reviewer behavior, and cross-harness advisory routes. p00-t02 steps 1-2 retain valid Claude native targets including `frontier: fable` (verified present in `packages/cli/config/dispatch-matrix-recommendation.json`) and change adoption to fill-missing while preserving explicit user values such as the Cursor matrix — directly repairing the currently destructive replace path (`packages/cli/src/commands/config/index.ts:1724-1734`, `--yes` replace at line 2204). No plan step invalidates or drops a currently-valid target or matrix entry. Minor finding 2 asks only for named resolution-side regression coverage.

3. **Codex tier semantics — PASS.** The below-cap bug is real and correctly targeted: `selectDispatchValue` nulls the matrix target whenever the selected value differs from the cap value (`packages/cli/src/commands/project/dispatch-ceiling/index.ts:1240-1247`, `target: selectedValue === policy.value ? policy.target : null`), and the existing test at `index.test.ts:1004` codifies the wrong "unresolved axes" expectation that p00-t01 step 4 replaces. Selecting a tier below the cap resolves the matching configured matrix target (t01 step 3), with below/equal/above-cap, reviewer, and uncapped coverage (t01 step 4), and the selected variant is materialized/synced/verified before spawn (t00-t03 step 3). Matrix-cell resolution lives in the same file (`resolveRouteMatrixCell`), so the declared file scope is sufficient.

4. **Downstream coherence — PASS.** p01-p04 task IDs, file lists, and content are unchanged in substance; the p00 insertion is reflected in the goal, architecture, Parallelism section (Phase 0 first), Reviews table (p00 row), and Implementation Complete summary (3+4+3+1+3 = 14 tasks, matches). Cross-task references resolve: p00-t03 step 5 -> p02-t03/p04-t02 both exist and are the true final edits of the named skills (`oat-project-implement` last touched in p02-t03; plan/quick-start/import-plan last touched in p04-t02); p01-t04 bumps `oat-reviewer`/`oat-project-review-provide`, which are not touched again; p04-t03's sync/lockstep-bump/release-validate ordering comes after all skill and asset edits. No scope overlap or gap between p00 and p01-p04 was found. Only the minor wording nit in finding 3 remains.

## Spec/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md` (all present; quick mode — no `spec.md`, which is expected and not a finding). Repository verification: `packages/cli/src/commands/project/dispatch-ceiling/index.ts` + `index.test.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/config/dispatch-matrix-recommendation.json`, `packages/cli/src/commands/gate/index.ts`, `packages/cli/src/app/create-program.ts`, skills under `.agents/skills/`, docs under `apps/oat-docs/docs/`, and the five public package manifests.

### Requirements Coverage (discovery.md Success Criteria -> plan tasks)

| Requirement (discovery.md:87-98)                                                                        | Coverage | Notes                                                                              |
| ------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Exec-target invocation metadata with unknown/provider-default semantics                                 | covered  | p01-t01; matches design `ExecTargetInvocation`                                     |
| Gate review injects target/runtime/invocation/source; artifacts + JSON carry same values                | covered  | p01-t03, p01-t04                                                                   |
| Configured invocation vs self-reported identity distinguished in guidance                               | covered  | p01-t04 steps 1, 3                                                                 |
| Declared project corroborated against artifact `oat_project`; mismatch cannot pass; ambient labeled     | covered  | p02-t01, p02-t02                                                                   |
| Final/range producer aggregation explicit; single-scope unchanged                                       | covered  | p03-t01                                                                            |
| Plan setup detects qualifying gate config; all/selected/disabled -> `oat_phase_review_gate`             | covered  | p04-t01, p04-t02; probe added in p01-t02                                           |
| Test coverage across Codex/Claude metadata, parser compat, mismatch, ambient, stamps, prompts           | covered  | distributed across all task step-4/coverage items; mirrors design Testing Strategy |
| Docs describe resulting contracts                                                                       | covered  | p01-t02/t04, p02-t03, p03-t01, p04-t02 docs files all exist                        |
| Managed Codex preflight fail-closed; Claude built-in remains runnable                                   | covered  | p00-t01                                                                            |
| Adoption preserves explicit values; complete targets materialize; below-cap resolves target             | covered  | p00-t02, p00-t01 step 3, p00-t03                                                   |
| Constraints: target-neutral lifecycle commands, no full dispatch schema, skill bumps, lockstep releases | covered  | p02-t03 step 2, p00 boundary, bump steps, p04-t03                                  |

### Format and Readiness Checks

- Frontmatter valid; `oat_plan_hill_phases: ['p04']` references a real phase; `oat_plan_parallel_groups: []` matches the sequential Parallelism rationale.
- Task IDs `pNN-tNN` are stable and monotonic; no ID reuse after the p00 insertion.
- Reviews table preserved (archived passed plan row retained, new pending plan row added); Implementation Complete and References sections present; no placeholder content.
- All 40+ referenced files exist in the repository; verification commands use valid package names (`@open-agent-toolkit/cli`), valid scripts (`oat:validate-skills`, `docs:check-links`, `release:validate`), and a valid global `--json` flag position for `pnpm run cli -- --json gate target list`.
- No `## Dispatch Profile` section (normal; not flagged). No override rows to evaluate.

## Verification Commands

```bash
# Confirm the below-cap target-drop baseline the plan repairs
grep -n "selectedValue === policy.value ? policy.target : null" packages/cli/src/commands/project/dispatch-ceiling/index.ts
grep -n "lower preferred codex matrix selections" packages/cli/src/commands/project/dispatch-ceiling/index.test.ts

# Confirm effort-only Codex recommendation cells and destructive adoption baseline
cat packages/cli/config/dispatch-matrix-recommendation.json
grep -n "Replace existing dispatch matrix" packages/cli/src/commands/config/index.ts

# Confirm all plan-referenced files exist and scripts resolve
pnpm run oat:validate-skills
pnpm --filter @open-agent-toolkit/cli type-check
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition the four minor findings (all non-blocking), then mark the revised plan artifact review row passed and proceed to `oat-project-implement` starting at p00-t01.
