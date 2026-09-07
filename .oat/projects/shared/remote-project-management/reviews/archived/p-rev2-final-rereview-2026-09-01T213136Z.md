---
oat_generated: true
oat_generated_at: 2026-09-01T21:31:36Z
oat_review_scope: p-rev2
oat_review_type: code
oat_review_invocation: review-3
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 5a15f738df8e7d5ab467b94a1e28a77ca5df420c
date: 2026-09-01
status: passed
verdict: PASS
oat_dispatch_request_id: remote-project-management-p-rev2-review-3-20260901T213136Z
oat_dispatch_role: oat-reviewer-gpt-5-6-sol-high
oat_dispatch_model_axis: selected:gpt-5.6-sol
oat_dispatch_effort_axis: selected:high
oat_dispatch_policy: high
oat_dispatch_ceiling: high
---

# Code Re-review: p-rev2

**Reviewed:** 2026-09-01
**Scope:** Revision 2 verification-handoff restart safety and incomplete
project-create provenance closure, including both review-fix loops
**Commit range:**
`5cf7bd848ca4448007a0ff4a8b0b0f0d2004c127..5a15f738df8e7d5ab467b94a1e28a77ca5df420c`
**Reviewed tasks:** `prev2-t01`, `prev2-t02`
**Task commits:**
`4a02c866e64ac72ba22bdf44ad14c132a377ea2b`,
`1af99a23b5cb67142cd06f37c3b3b0bc648e941e`
**Fix commits:**
`e79732b6cef1b996a54334e308860a121cdd989d`,
`5a15f738df8e7d5ab467b94a1e28a77ca5df420c`
**Prior reviews:**
`reviews/p-rev2-review-2026-09-01T202947Z.md`,
`reviews/p-rev2-rereview-2026-09-01T210901Z.md`
**Files reviewed:** 12 files changed in the authoritative phase range, the
eight-file focused verification union, the unchanged external-action contract,
and five governing/prior-review artifacts
**Current clean head at review start:**
`1566f5308904d1c05b0374cf6ba5fe99984ae5ef`
**Verdict:** PASS — zero Critical and zero Important findings satisfy the
`p-rev2` exit gate

## Summary

Revision 2 now satisfies its blocking restart-safety and provenance contracts.
The runtime fix fails closed at every pre-journal boundary, atomically persists
one canonical verification action with its accepted mutation evidence, rejects
contradictory durable records, and preserves provider-neutral safety; the final
test fix proves exact durable-action equality through both service and real
Commander crash recovery. No Critical, Important, Medium, or Minor findings
remain in the reviewed phase range.

Findings: 0 critical, 0 important, 0 medium, 0 minor

**Reconnaissance:** not-attempted

## Prior-Finding Disposition

| Prior finding                                                                                      | Disposition | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review 1 Critical: accepted mutation observation could restart through the stale create action     | Closed      | `service.ts:1129-1136` rejects continuation of an `attempt-started` create without an observation; `service.ts:1191-1193` and `service.ts:1287-1289` expose the early crash boundaries, while `service.test.ts:1178-1315` and `index.test.ts:365-608` prove restart is reconcile-required with no external action. The shared update path likewise returns no action without a required observation (`service.ts:1150-1157`).                                                                                                                                                                                               |
| Review 1 Critical: `verification-pending` journal could coexist with a stale create pointer        | Closed      | `service.ts:1287-1324` writes append-only verification action evidence, retires the stale pointer, then makes `currentAction`, `verificationHandoff`, completed attempt, committed observation, and `verification-pending` durable in one journal transition. `schema.ts:1421-1498` and `store.ts:549-632` reject contradictory or mutable handoff/action evidence.                                                                                                                                                                                                                                                         |
| Review 2 Important: service and Commander regressions asserted only a read-shaped recovered action | Closed      | The service regression reopens the store and proves `currentAction` exactly equals `verificationHandoff.verificationAction`, then proves the recovered `externalAction` exactly equals that canonical action (`service.test.ts:1470-1496`). The real Commander regression performs the same three-way equality check (`index.test.ts:575-607`). Full object equality covers step ID, digest, provider context, capability evidence, expected field set, identity, and outbound/preview evidence; schema/store mismatch cases at `schema.test.ts:984-1107` and `store.test.ts:639-728` prove deliberate contradictions fail. |

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:**
`.oat/projects/shared/remote-project-management/spec.md`, `design.md`,
`plan.md`, `implementation.md`, `state.md`, both prior `p-rev2` review
artifacts, the full authoritative phase diff, the runtime and test fix commits,
and the current schema/store/service/Commander implementation and tests.

### Requirements Coverage

| Requirement        | Status               | Notes                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prev2-t01`        | Implemented          | Early crash boundaries fail closed without returning an external action; the stale pointer is retired before the journal transition; the exact verification read and accepted mutation evidence become canonical atomically; restart returns only that durable read; contradictory or incomplete handoffs are rejected.                        |
| `prev2-t02`        | Implemented          | Legacy project-create intent without `localProjection` parses as `reconcile-required` (`schema.ts:1654-1667`), fails before materialization (`service.ts:1592-1605`, `store.ts:831-840`), and blocks later mutation (`service.ts:3019-3035`); generated project and backlog paths retain complete explicit projections (`service.ts:651-665`). |
| FR11 / FR14        | Implemented in scope | Mutation attempts remain one-attempt/read-back workflows, blind create retry is blocked, and incomplete create provenance cannot synthesize remote fields into local provenance.                                                                                                                                                               |
| NFR2 / NFR3        | Implemented in scope | Ambiguous interrupted states fail closed; a fresh process recovers the exact canonical verification action from durable journal evidence without relying on in-memory state.                                                                                                                                                                   |
| FR16 / NFR1 / NFR8 | Preserved            | The phase adds only provider-neutral semantic action/evidence fields. Added production and test code contains no repository/secret scan, credential parser, general-DLP claim, native MCP schema or tool name, captured catalog, or provider-specific CLI dialect.                                                                             |

### Extra Work (not in declared requirements)

None. The known five-package lockstep version concern is intentionally outside
this phase review and is not counted as a finding.

## Safety and Architecture Constraints

- An accepted-observation crash cannot re-emit a create or update. A create in
  `attempt-started` fails explicitly to reconciliation, while the generic
  update continuation returns no external action without its observation.
- The pre-journal crash cases remain durably `reconcile-required`; the real
  Commander assertions prove no external action is returned and therefore no
  create is exposed for replay.
- Post-journal recovery reads `verificationHandoff.verificationAction` only
  after verifying exact equality with the operation's canonical
  `currentAction`; schema parsing independently enforces the same invariant.
- Incomplete project-create provenance never treats observed remote title,
  description, or priority as `explicit-project-publication` local evidence.
- The approved live-discovery boundary remains intact: the host chooses a live
  connector or configured CLI from current descriptions/help, while OAT owns
  only provider-neutral intent, sanitized observations, durable state, and
  verification.

## Verification Evidence

The reviewer independently ran:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/pjm/remote/service.test.ts \
  src/commands/pjm/remote/schema.test.ts \
  src/commands/pjm/remote/store.test.ts \
  src/commands/pjm/remote/external-action.test.ts \
  src/commands/pjm/remote/index.test.ts \
  src/commands/pjm/remote/__integration__/lifecycle.test.ts \
  src/commands/pjm/remote/local-projection.test.ts \
  src/commands/pjm/remote/outbound-projection-safety.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
git diff --check \
  5cf7bd848ca4448007a0ff4a8b0b0f0d2004c127..5a15f738df8e7d5ab467b94a1e28a77ca5df420c
git diff --check \
  e79732b6cef1b996a54334e308860a121cdd989d..5a15f738df8e7d5ab467b94a1e28a77ca5df420c
git diff --name-status \
  5a15f738df8e7d5ab467b94a1e28a77ca5df420c..HEAD -- \
  packages/cli/src/commands/pjm/remote
```

Results: all eight focused test files and 138 tests passed live; CLI type-check
passed; both diff checks passed; the test-only fix changes exactly
`index.test.ts` and `service.test.ts`; and no remote implementation/test file
drift exists after the reviewed code head. The reviewed head is an ancestor of
the current clean head.

## Disposition

**PASS.** `p-rev2` has zero Critical and zero Important findings and therefore
satisfies its explicit exit gate. Both prior blocking findings are closed.
Medium and Minor counts are also zero.

## Recommended Next Step

Return to the root implementation session and continue the authorized OAT
lifecycle from this passing `p-rev2` review result.
