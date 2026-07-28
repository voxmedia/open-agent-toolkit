---
oat_generated: true
oat_generated_at: 2026-07-28T00:42:22Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/rereview-scope-narrowing
oat_gate_headless: true
oat_gate_run_id: 7f2cd01a-32da-48cb-98b4-bec23a0c2a39
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-28T00:42:22Z
**Scope:** Current quick-mode implementation plan and its discovery requirements
**Files reviewed:** 2
**Commits:** N/A (artifact review)

## Summary

The plan covers the requested default inversion, guarded narrowing, classification, documentation, and release work, but it is not implementation-ready. Five Important gaps would either break review-ledger parsing, weaken gate lineage isolation, disable narrowing on normal scoped invocations, conflate incompatible local and remote provenance sources, or leave generated provider views stale; the gate is therefore blocked at its `important` threshold. The explicit Dispatch Profile is valid and imposes no named ceiling.

Findings: 0 critical, 5 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

- **Plan the review-ledger schema migration through every parser and writer** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:243`)
  - Issue: Task p02-t02 adds a sixth `reviewed-head` column only to the template and local receive contract. The shipped control-plane parser currently rejects every row whose cell count is not exactly five (`packages/control-plane/src/state/reviews.ts:89`), so plans produced from the new template would expose an empty Reviews ledger to `oat project status` and downstream routing. The plan also omits other canonical writers, notably `oat-project-review-provide` and `oat-project-review-receive-remote`, that must preserve or populate the new column.
  - Fix: Expand p02-t02 or add a dedicated task covering `packages/control-plane/src/state/reviews.ts`, its tests and public type, plus every local/remote ledger writer. Require backward-compatible tests for old five-column rows and new rows carrying a validated optional full SHA; bump every changed canonical skill once.

- **Make durable gate provenance target-qualified** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:279`)
  - Issue: The plan falls back from an artifact to a tracked row that records only the reviewed head. That row cannot distinguish lifecycle reviews from gate reviews or distinguish two gate targets, yet discovery requires a gate to narrow only from its own prior run on the same target (`discovery.md:265`). Once the artifact is archived or absent in a fresh worktree, the proposed fallback can select a lifecycle or different-target head and violate the independence guarantee.
  - Fix: Either persist invocation kind and gate target with the durable row, or route gate narrowing exclusively through target-qualified gate-owned state. Add archived/missing-artifact tests proving lifecycle-to-gate, gate-to-lifecycle, and different-target narrowing all fail open to full scope.

- **Clarify that nominal phase/final scopes remain eligible for narrowing** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:312`)
  - Issue: p03-t02 says “explicit scope tokens” force full scope. Normal invocations necessarily supply `pNN`, `pNN-pMM`, or `final`; implementing this wording literally would bypass narrowing on every ordinary re-review and defeat the feature. Discovery names an explicit base commit or exact SHA range—not the nominal scope token—as the one-off escape hatch (`discovery.md:211`).
  - Fix: State precisely that `base_sha=<sha>` and explicit `<sha1>..<sha2>` ranges override automatic narrowing, while nominal task/phase/range/final scope identifiers remain eligible. Add tests or contract checks for both paths.

- **Separate rail-specific provenance from shared narrowing semantics** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:491`)
  - Issue: p06-t03 requires all four surfaces, including the ad-hoc remote rail, to use “artifact, then tracked plan row” resolution. The ad-hoc rail has no project plan, and both remote skills use prior GitHub marker blocks as their durable source while prohibiting local lifecycle mutations. Applying the stated parity check would either be impossible or push remote implementations outside their ownership contract.
  - Fix: Define parity over the shared lineage match, existence/ancestry guard, fallback reasons, classification, and preference behavior. Document provenance separately for local lifecycle artifacts/rows, project/ad-hoc GitHub markers, and target-qualified gates; update p04 and p06 verification accordingly.

- **Run parity reconciliation before the final provider sync and release validation** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:478`)
  - Issue: p06-t02 syncs provider views and runs the full release validation, then p06-t03 may edit canonical `.agents` skills or CLI source. Such a correction would stale the generated `.claude`/`.cursor`/`.codex` views and invalidate the already-recorded release result, with no later sync or `release:validate`.
  - Fix: Move cross-surface parity ahead of the provider-sync/version/release task, or make the final task rerun `oat sync --scope all`, all affected checks, and `pnpm release:validate` after any correction.

### Medium

- **Use exact staging paths in the release and parity commits** (`.oat/projects/shared/rereview-scope-narrowing/plan.md:472`)
  - Issue: The plan says unrelated changes must not ride into the commit but stages `packages/*/package.json`, and p06-t03 stages the entire `.agents/` tree. Those patterns can include unrelated package manifests or canonical assets.
  - Fix: List the five lockstep public manifests explicitly and stage only the canonical/source files actually changed by parity reconciliation, along with the generated paths produced by the scoped sync.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md` (lifecycle context), the plan template, and the directly affected parser/skill contracts needed to validate plan executability.

### Requirements Coverage

| Requirement                                                        | Status  | Notes                                                                                           |
| ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| Unset and `true` narrow; `false` opts out                          | Covered | p01-t02 and p05-t01 include behavior and config tests.                                          |
| Guarded prior-head range with full-scope fallback                  | Partial | Core tests are planned, but provenance sources are conflated across rails.                      |
| Durable reviewed-head provenance                                   | Partial | Artifact and row writes are planned, but the ledger migration omits strict parsers and writers. |
| Gate lineage isolation by target                                   | Missing | The proposed durable fallback is not target-qualified.                                          |
| Honest narrowed-review coverage disclosure                         | Covered | p02-t01 and p03-t02 carry the disclosure contract.                                              |
| Empty/bookkeeping/substantive classification remains informational | Covered | p01-t03 and rail tasks preserve dispatch for every class.                                       |
| Provider parity and release readiness                              | Partial | A parity-fix task runs after the final sync and validation.                                     |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising and implementing the plan:

```bash
pnpm --filter @open-agent-toolkit/control-plane test
pnpm --filter @open-agent-toolkit/cli test
pnpm format
pnpm release:validate
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan revision tasks.
