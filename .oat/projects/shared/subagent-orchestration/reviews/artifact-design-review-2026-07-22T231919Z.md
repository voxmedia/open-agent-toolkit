---
oat_generated: true
oat_generated_at: 2026-07-22T23:19:19Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/subagent-orchestration
---

# Artifact Review: design (re-review)

**Reviewed:** 2026-07-22
**Scope:** `design.md` (quick mode — upstream artifact: `discovery.md`); re-review of amendments in commit `80a54e24` following review `reviews/archived/artifact-design-review-2026-07-22T225632Z.md`
**Files reviewed:** 2 (design.md full re-read, discovery.md)
**Commits:** 4b651393..80a54e24 (amendment diff) plus whole-artifact re-read
**Reviewer context:** Operator's laptop session over SSH, same reviewer as the prior cycle. Selection reason: inherit (pre-plan; no project policy).

## Summary

All prior findings are resolved or deliberately dispositioned with documented rationale, and the amendments introduce no new issues. The new Consumer Migration subsection fully addresses I1 with an inventory contract, explicit coverage list, and a validation approach that distinguishes selection-purpose from mechanics-purpose references. The design is ready for planning.

Findings: 0 critical, 0 important, 0 medium, 1 minor

## Prior Finding Disposition

| Prior finding                                   | Disposition           | Evidence                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 consumer migration missing                   | resolved              | New `### Consumer Migration` component: inventory, two-layer contract updates, coverage list (reviewer agent, planning/implementation skills, Cursor Cloud orientation, dispatch adapters, CLI validation), provenance exclusion, in-project scoping, selection-vs-mechanics validation distinction |
| M1 Opus-first reframing + downstream divergence | resolved              | Design decision reframing the cyber exception (Opus-first rule, Fable classifier as supporting evidence, capability caveat kept); References note for vault matrix + global-file record refresh, private-repo copies left to sync                                                                   |
| M2 test pinning of dated matrix                 | resolved              | Testing strategy now asserts structural invariants and durable policy without freezing incumbents; exact mappings confined to one refresh-owned fixture                                                                                                                                             |
| m1 discovery status drift                       | resolved              | `discovery.md` frontmatter `oat_status: complete`                                                                                                                                                                                                                                                   |
| m2 `oat_ready_for: null`                        | deliberately retained | Documented in design References and discovery Constraints: quick-mode design does not own implementation readiness; the reviewed plan does. Accepted as convention, no longer drift                                                                                                                 |

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

**m1. Plan Reviews row for the prior design review is stale.** The row still shows `received` and points at `reviews/artifact-design-review-2026-07-22T225632Z.md`, but the receive step moved that artifact to `reviews/archived/` and completed its fixes. Update the bound row's status (e.g., `fixes_completed`) and/or path per the receive skill's bookkeeping contract; this re-review is recorded as a separate appended row.

## Spec/Design Alignment

### Requirements Coverage

| Requirement (discovery decision)                        | Status      | Notes                                                  |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| 1. One canonical guidance skill, progressive disclosure | implemented | Unchanged from prior review                            |
| 2. Selection vs mechanics ownership                     | implemented | Strengthened by Consumer Migration validation          |
| 3. Imported dossier as review input                     | implemented | Unchanged                                              |
| 4. No rename                                            | implemented | Unchanged                                              |
| 5. Opus-first Claude routing                            | implemented | Reframing decision closes the prior partial            |
| 6. Invocation posture                                   | implemented | Unchanged                                              |
| 7. Lightweight draft-and-review design                  | implemented | Two review cycles completed                            |
| Constraint: safeguard preservation                      | implemented | Unchanged; verify at implementation review             |
| Constraint: co-installation                             | implemented | Unchanged                                              |
| Success criterion: boundary + co-install tests          | implemented | Consumer-migration validation closes the prior partial |

### Extra Work (not in requirements)

None

## Verification Commands

```sh
# During implementation, the consumer inventory acceptance input:
grep -rn "oat-dispatch-subagents/references" .agents/ packages/ --include="*.md" --include="*.ts"
```

## Recommended Next Step

Design passes re-review. Run the `oat-project-review-receive` skill to record the pass (and fix the stale prior review row), then proceed to planning.
