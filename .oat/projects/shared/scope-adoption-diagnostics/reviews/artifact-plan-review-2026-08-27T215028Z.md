---
oat_generated: true
oat_generated_at: 2026-08-27T21:50:28Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/scope-adoption-diagnostics
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T21:50:28Z
**Scope:** Quick-workflow discovery and implementation plan readiness
**Files reviewed:** 5 project/backlog artifacts plus referenced source and test surfaces
**Commits:** Not applicable (artifact review)
**Verdict:** NEEDS_FIXES

## Summary

The plan is well structured, canonical-format valid, acceptance-complete in broad
scope, and its p01-p03 parallel group has genuinely disjoint write sets. It is
not yet implementation-ready because two load-bearing decision matrices remain
implicit: PJM migration eligibility by adoption state, and the config-aware
definition of an active provider materialization extension.

Findings: 0 critical, 2 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **Define the migration-eligibility result for all four adoption states**
  (`.oat/projects/shared/scope-adoption-diagnostics/plan.md:104`)
  - Issue: p01-t02 requires coverage for `declared`, `inferred-legacy`,
    `partial-initialization`, and `none`, but refers only to unspecified
    "eligible" and "non-eligible" states. The resolver derives those states
    solely from the current canonical scaffold
    (`packages/cli/src/commands/pjm/adoption.ts:54-72`), while the command being
    fixed migrates old `reference/current-state.md`, `reference/roadmap.md`,
    `reference/backlog/`, and `reference/decision-record.md` layouts
    (`packages/cli/src/commands/pjm/migrate.test.ts:109-147`). Such a real legacy
    tree can therefore resolve as `none` or `partial-initialization`; treating
    either label as self-evidently ineligible can disable the migration for the
    exact repositories it serves.
  - Fix: add an explicit four-row eligibility/behavior matrix to discovery or
    p01-t02. State whether legacy-layout evidence is a separate migration
    precondition, the expected status/reason for every state, and the exact
    zero-write assertions. If the desired outcome cannot be derived from the
    existing adoption contract, record it as an explicit product decision
    before implementation.

- **Bind provider reachability to configured activation, not filesystem detection**
  (`.oat/projects/shared/scope-adoption-diagnostics/plan.md:162`)
  - Issue: the test matrix names Claude-only, Codex, Cursor, mixed, and
    no-provider roots, but does not cover a detected Codex/Cursor provider that
    is explicitly disabled or an explicitly enabled provider without detection.
    This distinction is load-bearing: sync uses the config-aware resolver
    (`packages/cli/src/commands/sync/index.ts:182-187`), whereas status currently
    calls detection-only `getActiveAdapters`
    (`packages/cli/src/commands/status/index.ts:691-710`). Reusing the current
    status signal would suppress `oat-reviewer.md` and
    `oat-phase-implementer.md` from the diagnostic even when their extension is
    disabled and will not materialize them, contradicting discovery's "actually
    supplies" boundary.
  - Fix: specify the authoritative per-scope capability input (the same
    config-aware provider resolution used by sync), then add configured-enabled,
    detected-unset, and detected-but-disabled Codex/Cursor cases to p02-t01.
    Require doctor and status to pass the same capability into inventory and
    assert identical human/JSON affected-agent sets.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`,
`state.md`, backlog item `BL-260827-correct-scope-and-adoption`, the prior
project's deferred-work/review evidence, and the referenced CLI source/tests.
No spec or design artifact is required for this straight-to-plan quick workflow.

### Acceptance Coverage

| Backlog acceptance area                        | Status  | Notes                                                                                                                                 |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical PJM adoption rather than pack intent | partial | Correct authority and files are named; exact four-state migration behavior is unresolved.                                             |
| Provider-aware `user-agent-unmaterialized`     | partial | Provider classes and shared inventory are covered; configured activation semantics are missing.                                       |
| Shared-owner attribution                       | covered | Installed/intended, both-owner, retained-asset, enumeration-order, and no-owner cases are planned.                                    |
| Status inventory failure and doctor delimiter  | covered | Asset/per-pack failures, redaction, human/JSON, hook bypass, and separator collision are planned.                                     |
| Two test-quality follow-up groups              | covered | Tautological/import-time assertions and unrealistic scope harnesses are directly mapped; exception safety is a bounded strengthening. |
| Versions and complete release gates            | covered | Five lockstep manifests, bundled version map, current `origin/main` floor, and the eight ordered gates are explicit.                  |

### Plan Quality

- Canonical plan validation passes.
- Task IDs are monotonic and all nine task headings are stable.
- Every task has bounded files, runnable verification, and a commit message.
- The Reviews, Implementation Complete, and References sections are present.
- The p01/p02/p03 parallel claim is valid: their declared source write sets do
  not overlap, and p04 alone owns integrated versions and release verification.
- No unrelated work is introduced beyond the accepted diagnostic/output and
  test-quality follow-ups.

## Verification Commands

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/scope-adoption-diagnostics --json
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts
```

Observed during review: plan validation returned `{"valid":true}` and the
current PJM suite passed 6 files / 60 tests.

## Recommended Next Step

Revise discovery/plan to resolve the two Important findings, then rerun the plan
artifact review before marking the project ready for `oat-project-implement`.
