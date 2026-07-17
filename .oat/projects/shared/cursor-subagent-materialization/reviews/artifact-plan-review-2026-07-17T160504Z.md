---
oat_generated: true
oat_generated_at: 2026-07-17T16:05:04Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/cursor-subagent-materialization
oat_gate_headless: true
oat_gate_run_id: 3a9df012-d5f7-4eb6-a20f-81b478dea420
oat_gate_target: codex-5-6-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-17T16:05:04Z
**Scope:** Quick-mode implementation plan readiness
**Files reviewed:** 5
**Commits:** N/A (artifact review)

## Review Scope

**Project:** `.oat/projects/shared/cursor-subagent-materialization`
**Type:** artifact
**Scope:** plan
**Workflow mode:** quick
**Project state:** plan / in_progress

**Artifact files in scope (2):**

- `.oat/projects/shared/cursor-subagent-materialization/plan.md`
- `.oat/projects/shared/cursor-subagent-materialization/discovery.md`

**Supporting evidence used:**

- `.oat/projects/shared/cursor-subagent-materialization/design.md`
- `.oat/projects/shared/cursor-subagent-materialization/implementation.md`
- `.oat/projects/shared/cursor-subagent-materialization/state.md`
- Current canonical skills and source paths cited by the findings

**Dispatch Profile advisory:** The optional `## Dispatch Profile` section is absent. Omission is normal and was not treated as a finding.

**Dispatch audit:** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

**Gate route:** inline (runtime=codex, cliRoot=/Users/tstang/.nvm/versions/node/v22.17.0/lib/node_modules)

## Summary

The plan is structurally valid and covers the materializer, provider lifecycle, resolver, generated views, documentation, and release boundary. It is not implementation-ready because the dispatch-guidance migration omits active Cursor review consumers, and the live verification gate does not cover configuration-only mappings that the planned registry may ship.

Findings: 0 critical, 2 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

- **The dispatch migration leaves active Cursor review workflows on the old launch contract** (`.oat/projects/shared/cursor-subagent-materialization/plan.md:452`)
  - Issue: Task p04-t02 updates the shared plan-writing and local review/implementation guidance, but its file scope omits `.agents/skills/oat-project-plan/SKILL.md`, `.agents/skills/oat-project-quick-start/SKILL.md`, `.agents/skills/oat-project-import-plan/SKILL.md`, and `.agents/skills/oat-project-review-provide-remote/SKILL.md`. The first three still direct Cursor exceptions through `providers.<provider>.dispatchArgs.model` (`oat-project-plan/SKILL.md:492-497`, `oat-project-quick-start/SKILL.md:649-654`, and `oat-project-import-plan/SKILL.md:332-337`); the remote-review workflow still selects the base `/oat-reviewer` agent (`oat-project-review-provide-remote/SKILL.md:241-260`). Once p03-t05 changes managed Cursor resolution to `dispatchArgs.variant`, these paths can fail target preservation or launch an unpinned base reviewer instead of the resolver-selected native variant.
  - Fix: Add all four canonical skills to p04-t02, update each concrete managed Cursor path to use the exact resolver-returned native variant with the same pre-start rejection boundary, bump every changed skill version, and extend the validation tests to reject stale Cursor model-argument and base-reviewer launch clauses. Include `packages/cli/src/review-remote/reviewer-dispatch.ts` and its tests if the structured remote payload must carry the selected variant explicitly.
  - Requirement: Native materialized-variant dispatch in `discovery.md:63` and success criterion `discovery.md:77`.

- **g01 does not gate configuration-only mapping entries that the plan allows to ship** (`.oat/projects/shared/cursor-subagent-materialization/plan.md:81`)
  - Issue: Gate Step 4 requires mapping-specific approval for proposed catalogue/recommendation entries, while p02-t03 explicitly supports mapped entries outside the supported catalogue (`plan.md:213`) and the approved design allows the checked-in mapping registry to be broader than the catalogue (`design.md:134`). A configuration-only registry entry is still shipped TypeScript that can emit a Cursor `model:` pin, but the current evidence condition does not require that entry to have a mapping-specific live approval. That leaves a path around discovery's every-shipped-entry verification rule in the exact silent-fallback risk area the gate is meant to close.
  - Fix: Define g01's matrix and approval condition over every entry that may be added to the shipped mapping registry, with catalogue, recommendation, and configuration-only use recorded as classifications rather than evidence boundaries. Make p02-t02 require an approved mapping-specific evidence row for every registry entry, and keep p02-t03 fail-closed for any config-owned target without such an approved mapping.
  - Requirement: Mapping-specific live verification in `discovery.md:60` and success criterion `discovery.md:79`.

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, and the cited current canonical skills.

### Requirements Coverage

| Requirement                                                                       | Status  | Notes                                                                                                                       |
| --------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Provider-neutral materialization lifecycle and provider-owned codecs              | covered | p02 and p03 define the shared lifecycle, Cursor codec, ownership, sync, status, init, and doctor integration.               |
| Explicit bracket-form mapping with live evidence for every shipped entry          | partial | g01 is mapping-specific for catalogue/recommendation entries but does not explicitly gate configuration-only registry data. |
| Native Cursor variant dispatch with launcher-owned configured provenance          | partial | Resolver and primary guidance are planned, but four active review workflows remain outside the migration inventory.         |
| Multi-family recommendation, generated views, documentation, and release boundary | covered | p04 through p06 cover recommendation data, docs, generated outputs, lockstep versions, and release validation.              |
| Stable, verifiable, independently committable implementation tasks                | covered | Task IDs are stable and monotonic, file boundaries are explicit, and tasks provide concrete formatting, tests, and commits. |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan, run:

```bash
pnpm exec oxfmt --check .oat/projects/shared/cursor-subagent-materialization/plan.md
pnpm run cli:source -- project validate-plan --project-path .oat/projects/shared/cursor-subagent-materialization --json
rg -n 'oat-project-(plan|quick-start|import-plan|review-provide-remote)|configuration-only|mapping registry|mapping-specific' .oat/projects/shared/cursor-subagent-materialization/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important findings into plan revisions, then re-run the plan artifact gate.
