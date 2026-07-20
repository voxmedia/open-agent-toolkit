---
oat_generated: true
oat_generated_at: 2026-07-20T15:45:06Z
oat_review_scope: p-rev4
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
---

# Code Review: p-rev4

**Reviewed:** 2026-07-20T15:45:06Z
**Scope:** Revision phase p-rev4, design-fidelity review of program-boundary recap and completion semantics
**Files reviewed:** 2 changed skill files; 5 project, prior-review, and docs artifacts cross-checked
**Commits:** 2 (`bc97ed2b806f92c61369666f270a17b7f1cb39f9..ec66872d`)
**Dispatch:** `Dispatch: scope=p-rev4 action=review role=reviewer producer=oat-phase-implementer-gpt-5-6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

## Summary

CHANGES REQUESTED. The revision faithfully implements the program-scope recap default, explicit deferral dispositions, autonomous archive-tail deferral, one human-gated program-end checkpoint, and the interactive-versus-autonomous ordering split. One bookkeeping sentence in the execute skill still directs the default program recap's manifest result to a wave ledger row, conflicting with the new program-scope semantics and the program skill's correct wave-or-program distinction.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

- **Program recap manifest is still directed only to a wave ledger row** (`.agents/skills/oat-wave-execute/SKILL.md:422`)
  - Issue: The caller is now explicitly a program-close caller and the default recap is synthesized from all wave records, but its consumption sentence still says to record `runId` and `outcome` in “the wave ledger row.” That conflicts with `oat-wave-program`, which correctly records the default program recap in the program ledger and reserves wave-ledger recording for explicitly requested per-wave recaps.
  - Fix: Match the program skill's distinction: record the default program recap's manifest `runId` and `outcome` in the program ledger, and use a wave ledger row only for an explicitly requested per-wave recap.
  - Requirement: p-rev4 t01

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (Phase p-rev4 and the operator-design phase introduction), `implementation.md`, `spec.md`, `design.md`, prior p-rev3 review artifacts, and `apps/oat-docs/docs/workflows/wave-workflows.md`.

### Requirements Coverage

| Requirement                          | Status      | Notes                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t01 program-scope recap default      | partial     | Final-pending-wave program close is the default recap boundary; per-wave recap is explicit-request-only; `recap: deferred to program close` and final `recap: not run — {reason}` dispositions preserve the p-rev3 no-silent-omission rule. The remaining ledger-target sentence is the Important finding. |
| t01 mechanical/judgment split        | implemented | Both Ownership Boundary sections are byte-identical to the range base. The orchestrator still synthesizes the fact base; the caller remains mechanical.                                                                                                                                                    |
| t02 archive-only autonomous deferral | implemented | Each wave still runs `complete-state` plus then-current bookkeeping. Only archive, configured S3 sync, pointer clear, and archive-completion bookkeeping may move to program close; every deferral uses the exact ledger disposition.                                                                      |
| t02 program-end checkpoint           | implemented | The exact one-question/all-N-wrapper checkpoint is present, explicitly HUMAN-GATED in autonomous runs, with full-tail execution and disposition flips on yes and an owned standing deferral on no. Interactive per-wave full-tail completion remains valid.                                                |
| p-rev3 S8 regression guard           | implemented | Passed-only-terminal language in plan gate and final gate is untouched by this range.                                                                                                                                                                                                                      |
| p-rev3 S10 full-tail semantics       | implemented | Full-tail content remains complete and explicitly named; deferral changes timing, not content or satisfaction criteria.                                                                                                                                                                                    |
| Complete-before-merge seam           | implemented | The standing review → complete → merge order is explicitly scoped to interactive runs. The autonomous branch requires complete-state/bookkeeping before merge and explicitly schedules only the deferred archive tail after the post-merge human gate.                                                     |
| Versions and scope hygiene           | implemented | Versions are exactly execute `1.7.1` and program `1.3.1`; only those two skill files changed; both Ownership Boundary sections are byte-identical to the range base.                                                                                                                                       |
| Docs consistency                     | implemented | `wave-workflows.md` describes closeout and ledger responsibilities but does not require a recap or archive tail after every wave; no semantic docs correction is needed for this revision.                                                                                                                 |

### Extra Work (not in declared requirements)

None.

## Verification Commands

```bash
git diff --check bc97ed2b806f92c61369666f270a17b7f1cb39f9..ec66872d
pnpm exec commitlint --from bc97ed2b806f92c61369666f270a17b7f1cb39f9 --to ec66872d
pnpm exec oxfmt --check .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md
pnpm oat:validate-skills
pnpm lint
pnpm run cli -- sync --scope all --dry-run --json
```

All listed checks passed when run serially; sync reported `plannedOperations: 0`. The known BL-260720 `release:validate` visual-gate environment failure was excluded as instructed and is not a finding.

## Recommended Next Step

Correct the execute caller's ledger target, then re-review the bounded fix.
