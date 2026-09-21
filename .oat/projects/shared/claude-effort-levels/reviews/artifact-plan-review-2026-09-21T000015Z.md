---
oat_generated: true
oat_generated_at: 2026-09-21T00:00:15Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/claude-effort-levels
oat_gate_headless: true
oat_gate_run_id: 4b0b73b8-93d9-4bd5-bfb3-0f43e55b9dfe
oat_gate_target: cursor-fable-5-1-high
oat_gate_runtime: cursor
oat_invocation_model: claude-fable-5-1-high
oat_invocation_reasoning_effort: unknown
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-09-21T00:00:15Z
**Scope:** `plan.md` for `claude-effort-levels` (quick workflow; upstream contract is `discovery.md`); re-gate after `oat-project-review-receive` resolved the prior gate review's M1/L1/L2 in-artifact
**Files reviewed:** 2
**Commits:** not applicable (artifact review)

**Dispatch audit:** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high`

**Gate route:** `inline` (runtime=cursor; reason: provider runtime marker matches expected runtime cursor; model evidence is unavailable). The gate exec target `cursor-fable-5-1-high` is the configured invocation for this review; the resolver's managed reviewer target above is recorded as audit context, not as the identity of this reviewer. Runtime identity is `not-reported`.

## Summary

The revised plan is complete, internally consistent, and aligned with `discovery.md`. All three prior gate findings are resolved in the artifact: p01-t02 now names the `.claude/agents/` destinations for both scopes, the deterministic `<canonical-role>-claude-<model-slug>-<effort>` name pattern, and an explicit cross-host eligibility/collision boundary; the Validation Coverage table lists SC1–SC9 in order; and p02-t04 enumerates three concrete prose invariants with an explicit-map-precedes-probing ordering rule. Independent re-verification confirmed the plan's load-bearing premises against the repository: every referenced source, test, skill, template, docs, and decision path resolves (the sole absent path, `packages/cli/src/providers/claude/codec/`, is correctly labeled new); every named `pnpm` script exists in the root and `oat-docs` manifests; the Claude ceiling adapter is currently model-only (`mechanism: 'model-arg'`, `selectionAxis: 'tier'`, `compileToDispatchArgs` returns `{ model }`); the route normalizer accepts `effort` for any harness while only Codex requires it; the bundled recommendation is `2026-07-27.1` with scalar Claude cells; the plan-writing display's Cursor row is stale relative to the JSON; exactly five skills declare `oat_gateable: true` and the shared gate contract probes every one without a relevance filter; and `oat project validate-plan` reports `valid: true`. No blocking findings; two low items.

Findings by severity: 0 critical, 0 high, 0 medium, 2 low

## Findings

### Critical

None

### High

None

### Medium

None

### Low

- **Mixed-host collision fixture should use Cursor's own `claude-*` model IDs** (`.oat/projects/shared/claude-effort-levels/plan.md:84`, `:88`)
  - Issue: The chosen Claude variant pattern `<canonical-role>-claude-<model-slug>-<effort>` yields names such as `oat-reviewer-claude-sonnet-high`. Cursor's materializer already derives names from opaque model IDs that begin with `claude-` (`packages/cli/src/providers/cursor/codec/catalog.ts:84`, `:125`, `:130` → `oat-reviewer-claude-sonnet-5-high`, `oat-reviewer-claude-fable-5-thinking-high`). The `-claude-` infix therefore does not by itself discriminate hosts, and the p01-t02 verify sentence "cross-host name collisions are refused without overwrites" does not say which colliding name the fixture exercises, so an implementer could satisfy it with an arbitrary unrelated name and never test the realistic near-miss.
  - Suggestion: In the p01-t02 verify text, name the fixture shape: a Cursor variant materialized from a `claude-*` catalog ID alongside a Claude effort variant for the same role, asserting both distinct-name coexistence and refusal when a normalized name would coincide.

- **p03-t01 fixture-provenance rule depends on p03-t02's capture but is sequenced before it** (`.oat/projects/shared/claude-effort-levels/plan.md:150`, `:160-168`)
  - Issue: p03-t01 says "Any new parser fixture must be derived from the live probe's captured output with provenance and redaction", but the live probe is p03-t02, which follows p03-t01 in the sequential phase. If p03-t01 does need a new identity/observation fixture ("only where needed"), the task as ordered cannot obtain compliant provenance and would either stall or tempt an invented fixture — the exact failure the repository's AGENTS.md evidence rule forbids.
  - Suggestion: Add one sentence to p03-t01 resolving the dependency: either restrict p03-t01 to fixtures already present under `packages/cli/src/providers/identity/` and defer any new captured fixture to p03-t02, or state that p03-t01's fixture-dependent controls are completed after p03-t02's capture lands.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (quick-mode upstream contract), `plan.md` (artifact under review), `state.md` and `implementation.md` (mode/phase context, prior structured-review and gate-review dispositions), `reviews/archived/artifact-plan-review-2026-09-20T235147Z.md` (prior gate review, for resolution verification). No `spec.md` or `design.md` exists; that is expected for quick mode and is not a finding.

### Prior Gate Finding Resolution

| Prior finding                                                       | Status   | Evidence                                                                                                                                                                      |
| ------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 — p01-t02 destination, name pattern, cross-host boundary unnamed | resolved | `plan.md:86` names `<project-root>/.claude/agents/` and `<injected-home>/.claude/agents/`, the shared name pattern with two examples, Cursor eligibility and collision rules. |
| L1 — Validation Coverage rows out of order                          | resolved | `plan.md:213-221` lists SC1 through SC9 ascending.                                                                                                                            |
| L2 — p02-t04 regression contract did not name its invariants        | resolved | `plan.md:138` enumerates invariants (1)–(3), requires explicit-map preservation to precede probing, and keeps the neutralize-and-fail proof targeted at the relevance clause. |

### Requirements Coverage

| Requirement                                    | Status  | Notes                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC1 distinct selection and policy semantics    | covered | p01-t01 (resolver/registry/ceiling command), p03-t01 (negative controls). Premise verified: `registry.ts:136-158` Claude adapter is model-only; `dispatch-matrix.ts:138-146,379-383` effort is Codex-required only.                                                                                      |
| SC2 generated roles and managed lifecycle      | covered | p01-t02 now names destinations (matches `CLAUDE_PROJECT_MAPPINGS`/`CLAUDE_USER_MAPPINGS` in `providers/claude/paths.ts`), pattern, scopes, idempotence, removal, and cross-host boundary (L1 refines fixture).                                                                                           |
| SC3 exact native launch and refusal boundaries | covered | p02-t01 (launch instructions), p03-t01 (variant/model mismatch controls), p03-t02 (live wiring probe). `.agents/agents/oat-reviewer.md:76` still states Claude effort is not-applicable and is in p02-t01's file list.                                                                                   |
| SC4 compatibility and other providers          | covered | Compatibility contract section plus unchanged Codex/Cursor assertions in p01-t01, p01-t02, p02-t02.                                                                                                                                                                                                      |
| SC5 awareness and actual task-based choice     | covered | p02-t01 guidance path; p03-t02 awareness probe with fail-and-investigate rule and explicit authority precondition.                                                                                                                                                                                       |
| SC6 recommendation and adoption                | covered | p02-t02; stale Cursor display row re-verified at `oat-project-plan-writing/SKILL.md:125` vs `dispatch-matrix-recommendation.json` cursor cells. Proposed Claude pairs are hedged on p02-t02 support verification and consistent with `subagent-orchestration/references/provider-claude.md:36-44,66-67`. |
| SC7 positive/negative/live evidence            | covered | p03-t01, p03-t02; guard-neutralization and captured-output provenance required (L2 notes the sequencing dependency).                                                                                                                                                                                     |
| SC8 decisions, docs, bumps, gates              | covered | p02-t03 (docs, superseding `DR-260706`, lockstep bump), p03-t03 (CI-order gates, isolated-HOME child recipe, separate smoke/skills/scripts/validate suites). All scripts verified in manifests.                                                                                                          |
| SC9 relevant workflow-gate prompts             | covered | p02-t04; premise re-verified: exactly five `oat_gateable: true` skills (quick-start, lite, import-plan, plan, implement); shared contract `plan-writing/SKILL.md:437-443` probes each with no relevance filter; all four callers invoke the shared contract.                                             |

**Discovery Key Decisions 1–8:** each maps to the Compatibility and Selection Contract section or to a task (1→p01-t02, 2→p01-t01, 3→contract, 4→p02-t01, 5→p02-t02, 6→contract + p02-t03, 7→p02-t04, 8→workflow mode). **Out of Scope** items are respected; no task introduces an Agent-schema change, broker, or migration command.

**Plan-specific checklist:** canonical frontmatter and sections present; task IDs `pNN-tNN` monotonic; Reviews table present with scaffold rows preserved, the structured-review pass row, and the prior gate review's `fixes_completed` row pointing at its archived artifact; `oat_plan_parallel_groups: []` consistent with the Parallelism section; `## Dispatch Profile` absent, which is normal and not flagged. Every proposed mechanism (Claude codec, recommendation parity test, smoke chain, live recipe) has a named consumer; no excess machinery.

### Extra Work (not in declared requirements)

None. p02-t04 (SC9) is an explicit user-approved scope addition recorded in `implementation.md` and `discovery.md` Question 4.

## Verification Commands

Run these to verify the low-severity suggestions once applied:

```bash
# L1: p01-t02 names the Cursor claude-* collision fixture shape
rg -n "claude-\*|claude-sonnet-5|catalog" .oat/projects/shared/claude-effort-levels/plan.md

# L2: p03-t01 resolves the fixture-provenance ordering against p03-t02
rg -n -A2 "parser fixture" .oat/projects/shared/claude-effort-levels/plan.md

# Plan still validates and is formatted after edits
oat project validate-plan --project-path .oat/projects/shared/claude-effort-levels --json
pnpm exec oxfmt --check .oat/projects/shared/claude-effort-levels/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
