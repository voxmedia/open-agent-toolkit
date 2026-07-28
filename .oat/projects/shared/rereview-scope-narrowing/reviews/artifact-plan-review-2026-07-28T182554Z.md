---
oat_generated: true
oat_generated_at: 2026-07-28T18:25:54Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/rereview-scope-narrowing
oat_gate_headless: true
oat_gate_run_id: fff0ab42-f5dc-4d19-98e9-46ca4a10dc26
oat_gate_target: cursor-fable-5-xhigh
oat_gate_runtime: cursor
oat_invocation_model: claude-fable-5-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-28T18:25:54Z
**Scope:** Revised quick-mode implementation plan, re-reviewed after receiving all findings from the prior gate review (`reviews/archived/artifact-plan-review-2026-07-28T004222Z.md`, gate run `7f2cd01a-32da-48cb-98b4-bec23a0c2a39`)
**Files reviewed:** 2 (`plan.md`, `discovery.md`; `implementation.md` read for lifecycle context)
**Commits:** N/A (artifact review)

## Summary

All five Important findings and the one Medium finding from the prior gate review are resolved in the revised plan: the ledger migration now runs through the strict control-plane parser, its tests, the public type, and every canonical writer; durable provenance is lineage-qualified with gate targets and has explicit fail-open tests; nominal scope identifiers are explicitly narrowing-eligible with only `base_sha=`/SHA ranges as overrides; provenance is defined per rail rather than as one shared resolution order; and cross-surface parity (p06-t02) now precedes provider sync and release validation (p06-t03). Every load-bearing repo claim in the revised plan was verified against source (parser cell-count rejection, narrowing module symbols, config default and prompt language, skill/agent versions, docs paths). One new Medium remains — stale `oat_template: true` frontmatter that makes the recommender route the in-progress plan back to `oat-project-plan` — plus three Minors; there are no blocking findings at the gate's threshold.

Findings: 0 critical, 0 important, 1 medium, 3 minor

## Findings

### Critical

None

### Important

None

### Medium

- **Stale `oat_template: true` frontmatter misroutes the recommender** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:19`)
  - Issue: The authored plan still carries the template scaffold's `oat_template: true`. `detectBoundaryTier` (`packages/control-plane/src/recommender/boundary.ts:18`) forces any in-progress artifact with this flag to boundary tier 3, so quick-mode routing (`packages/control-plane/src/recommender/router.ts:66`) resolves `plan:in_progress:3` to `oat-project-plan` instead of `plan:in_progress:2` to `oat-project-implement`. Until the plan phase is marked complete, `oat project status` recommends regenerating the already-authored plan, which risks a fresh session overwriting it. Other authored plans in this repo set the flag to `false` or omit it (for example `.oat/projects/shared/subagent-orchestration/plan.md`).
  - Fix: Set `oat_template: false` in `plan.md` frontmatter.

### Minor

- **p02-t02 commit stages the whole `.agents/skills/` tree** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:287`)
  - Issue: The commit block runs `git add .agents/skills/` although the task modifies exactly three skill files. In clean sequential execution this is benign, but it is the same broad-staging pattern the prior review flagged as Medium for the p06 commits (now fixed there).
  - Suggestion: Stage the three modified skill paths explicitly, matching the exact-path convention the revised p06-t02/p06-t03 commit blocks now follow.

- **Phase 6 summary bullet lists tasks in the pre-revision order** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:659`)
  - Issue: The Implementation Complete bullet reads "documentation, provider sync and lockstep version bump, cross-surface parity verification", naming sync before parity — the ordering the prior review rejected and the revised tasks corrected (parity is p06-t02, sync/release is p06-t03).
  - Suggestion: Reword to "documentation, cross-surface parity verification, provider sync and lockstep version bump" so the summary cannot re-anchor the broken order.

- **p06-t03 staging example omits generated reviewer-variant views** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:608`)
  - Issue: The explicit `git add` block lists only the base `.claude`/`.cursor` view pairs, but `oat sync --scope all` also regenerates the `.cursor/agents/oat-reviewer-<variant>.md` and `.codex/agents/oat-reviewer*.toml` views, which embed the canonical reviewer instructions changed by p02-t01. The normative sentence above the block ("inspect `git diff --name-only` and stage only the lockfile and generated provider-view paths produced") does cover them, but the example set is incomplete and could anchor an implementer into staging only the listed pairs.
  - Suggestion: Note in the example that variant views (Cursor variant agents, Codex agent TOMLs) regenerated for the changed reviewer must be staged as revealed by the diff inspection.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md` (pre-implementation scaffold, lifecycle context), prior review artifact `reviews/archived/artifact-plan-review-2026-07-28T004222Z.md`, and directly verified repo sources: `packages/control-plane/src/state/reviews.ts`, `packages/control-plane/src/recommender/boundary.ts` and `router.ts`, `packages/cli/src/review-remote/narrowing.ts` and `reviewer-dispatch.ts`, `packages/cli/src/review-remote/marker-parser.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/commands/config/index.ts`, skill/agent frontmatter versions, `.oat/templates/plan.md`, docs paths under `apps/oat-docs/docs/`, and provider view directories (`.claude/`, `.cursor/`, `.codex/`).

### Prior Gate Findings Disposition

| Prior finding (2026-07-28T004222Z)                              | Severity  | Status   | Resolution evidence                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger schema migration through every parser and writer         | Important | Resolved | p02-t02 now modifies `reviews.ts`, `reviews.test.ts`, `types.ts`, `README.md`, the plan template, and all three canonical writers (local receive, remote receive, provide); tests cover legacy five-column rows, widened rows, empty new cells, invalid SHA rejection, and mixed-table ordering.          |
| Durable gate provenance target-qualified                        | Important | Resolved | p02-t02 persists invocation kind plus gate target on the row; new p02-t03 adds archived/missing-artifact tests proving lifecycle-to-gate, gate-to-lifecycle, different-target, and legacy head-only rows all fail open to full scope, with one shared predicate for artifact- and row-sourced candidates. |
| Nominal phase/final scopes remain narrowing-eligible            | Important | Resolved | p03-t02 states only `base_sha=<sha>` or explicit `<sha1>..<sha2>` override narrowing while `pNN`, `pNN-pMM`, `final`, and task IDs remain eligible, with rationale; p06-t02 re-verifies this across all four surfaces.                                                                                    |
| Rail-specific provenance separated from shared semantics        | Important | Resolved | p04-t01 preserves rail ownership (GitHub marker blocks for both remote rails, no lifecycle-table access); p04 and p06-t02 verification defines parity over shared semantics only and enumerates provenance per rail (local lifecycle, project remote, ad-hoc remote, configured gate).                    |
| Parity reconciliation before provider sync / release validation | Important | Resolved | Task order swapped: p06-t02 (parity, exact-file staging, conditional commit) now precedes p06-t03 (sync, lockstep bump, `pnpm release:validate`), which states no later task may edit canonical assets without repeating sync and validation.                                                             |
| Exact staging paths in release and parity commits               | Medium    | Resolved | p06-t03 stages the five lockstep manifests explicitly plus lockfile and enumerated view paths with diff inspection; p06-t02 stages exactly the task's files. Residual broad staging in p02-t02 is recorded as a Minor above.                                                                              |

### Requirements Coverage

| Requirement (discovery)                                            | Status  | Notes                                                                                                                        |
| ------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unset and `true` narrow; `false` opts out                          | Covered | p01-t02 behavior tests; p05-t01 flips the verified `null` default (`resolve.ts:112`) and updates metadata/prompt language.   |
| Guarded prior-head range with full-scope fallback                  | Covered | p01-t01/t02, p02-t03, p03-t01; provenance now defined per rail.                                                              |
| Durable reviewed-head provenance                                   | Covered | p02-t01 (full 40-char SHA, mirrors remote rail's `oat_review_head_sha` validation) plus p02-t02 ledger migration.            |
| Gate lineage isolation by target                                   | Covered | Lineage discriminator in p01-t01 tuple; target-qualified rows in p02-t02; fail-open tests in p02-t03; restated in p03/p04.   |
| Honest narrowed-review coverage disclosure                         | Covered | p02-t01 disclosure fields and no-restated-coverage rule; p03-t02 adds it to the reviewer payload.                            |
| Empty/bookkeeping/substantive classification remains informational | Covered | p01-t03 scopes the bookkeeping test to the project directory and records why path-based testing suffices; rails report it.   |
| Provider parity and release readiness                              | Covered | p06-t02 parity precedes p06-t03 sync/lockstep bump/`release:validate`; lockstep set matches the repo's five public packages. |

### Dispatch Profile Advisory (artifact plan)

The plan's `## Dispatch Profile` section declares no ceiling rows ("No explicit constraints. Runtime selection chooses the tier."). Per the named-ceiling advisory, an absent or empty profile is normal and imposes no named maximum; nothing to flag.

### Extra Work (not in declared requirements)

None

## Dispatch Audit

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

Gate route: inline (runtime=cursor, cliRoot=/Users/tstang/Library/pnpm/store/v11/links/@open-agent-toolkit/cli/0.2.20/39b9f53c380fd5a86097f5ffc56997c24fd191030490337f99ead8367d23a661/node_modules). The validated headless gate route helper selected inline execution in the gate target context; the resolver-selected managed reviewer target above is recorded as the audit surface per the dispatch report (`schemaVersion: 1`, ladder complete). Runtime identity is not-reported; configured invocation fields in frontmatter are gate-owned and copied verbatim.

## Verification Commands

After applying the Medium/Minor fixes:

```bash
pnpm exec oxfmt --check .oat/projects/shared/rereview-scope-narrowing/plan.md
oat project status --project-path .oat/projects/shared/rereview-scope-narrowing --field project.recommendation
pnpm --filter @open-agent-toolkit/control-plane test
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition the remaining Medium/Minor findings. The gate passed at its threshold: no Critical or Important findings remain.
