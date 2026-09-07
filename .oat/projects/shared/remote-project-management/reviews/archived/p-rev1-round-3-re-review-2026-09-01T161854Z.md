---
oat_generated: true
oat_generated_at: 2026-09-01T16:18:54Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: manual
oat_review_round: 3
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 15332edbf1a88e41fa1d909bb767273d527dcc28
oat_review_range: 3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..15332edbf1a88e41fa1d909bb767273d527dcc28
---

# Code Re-review: p-rev1 Round 3

**Reviewed:** 2026-09-01T16:18:54Z
**Scope:** Corrective Revision 1, tasks `prev1-t01` through `prev1-t04`, including bounded fix commit `15332edbf1a88e41fa1d909bb767273d527dcc28`
**Reviewed base:** `3a304e20c995f6d10f7de5d76430ef7d7c3f93fe`
**Reviewed full head:** `15332edbf1a88e41fa1d909bb767273d527dcc28`
**Latest fix parent:** `dfec5f13b110cf186c49922c12efa91649d225a9`
**Files reviewed:** 17 implementation/test files plus 2 prior review artifacts as history
**Commits:** `3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..15332edbf1a88e41fa1d909bb767273d527dcc28` (8 commits)
**Verdict:** BLOCK — Phase 4 must remain blocked
**Dispatch:** request `remote-project-management-p-rev1-review-3-20260901T1112Z`; target `oat-reviewer-gpt-5-6-sol-high`; model axis `selected:gpt-5.6-sol`; effort axis `selected:high`; policy/ceiling `high`; configured invocation native; runtime identity not independently reported

## Summary

The round-2 managed-section baseline defect is closed: verified state keeps the
complete remote body in the snapshot and persists only validated governed
content in the baseline, while reconciliation ignores surrounding remote-owned
prose. The phase still does not pass. The new create-handoff recovery branch is
not reachable through the public CLI and can leave an interrupted unbound
create without a public operation handle or duplicate guard, and the structured
approval preview reports preview creation time as if it were the observed
remote revision time.

Findings: 1 critical, 1 important, 0 medium, 0 minor

**Reconnaissance:** not-attempted

## Findings

### Critical

- **Create-handoff restart recovery is unreachable through the public CLI and an interrupted direct-authorized create can be duplicated** (`packages/cli/src/commands/pjm/remote/index.ts:175`)
  - Issue: `resumeCreateActionHandoff()` is selected only when
    `request.observationStdin` is false (`service.ts:1047-1052`), but the public
    `operation continue` command declares `--observation-stdin` as a required
    option at `index.ts:175-178`. The new crash tests bypass Commander and call
    the injected runner directly without that flag at
    `service.test.ts:689-693`, so they do not prove a usable public recovery
    path. The gap is worse for direct-authorized creates interrupted before the
    first action envelope: the operation ID has never been emitted, a fresh
    publish allocates new random operation and binding IDs at
    `service.ts:536-539`, and `prepareCreate()` performs no target-scoped lookup
    for an active create intent. The existing operation therefore neither
    blocks nor binds the retry, and the retry can return a second create action.
    A direct deployed-command check confirms that
    `oat pjm remote operation continue --operation <id>` is rejected with
    `required option '--observation-stdin' not specified` before the recovery
    branch can run.
  - Impact: A process interruption after durable action/attempt state but before
    the caller receives the envelope cannot safely re-emit the exact action via
    the public surface. For direct-authorized creation, an interruption before
    any operation handle is emitted also permits an unbound retry with unrelated
    IDs and a second action. This violates the P0 create-provenance, one-attempt,
    fail-closed, and restart-safety contracts and leaves round-2 Critical
    finding 2 only partially closed.
  - Fix: Expose a public no-observation action-resume operation (or make
    observation optional and enforce the state-specific branch) that re-emits
    only the exact durable action for `planned`, `authorized`, or
    `attempt-started` creates. Add a deterministic target/provider/projection
    active-intent lookup so re-running the original direct-authorized publish
    discovers and resumes or blocks on the existing operation instead of
    allocating new IDs. Exercise every interruption boundary through the real
    Commander command, including the no-handle direct-authorized case, and
    assert one durable operation, one action digest, and no second host action.
  - Requirement: FR11, FR14, NFR2, NFR3

### Important

- **The structured preview mislabels preview creation time as remote revision freshness** (`packages/cli/src/commands/pjm/remote/service.ts:2143`)
  - Issue: `approvalPreviewEnvelope()` emits
    `revision.observedAt = operation.approvalPreview.createdAt`; that value is
    the invocation/preview creation time selected at `service.ts:860` and
    `service.ts:930`, not the snapshot revision's `updatedAt` or observation
    time supplied to `buildProductionMutationPreview()` at
    `service.ts:911-916`. The public regression makes the mismatch explicit:
    its snapshot revision was observed at `12:00` (`index.test.ts:204-225`),
    but it expects the emitted revision `observedAt` to be the invocation time
    `11:59` (`index.test.ts:532-536`). The digest remains bound to the real
    revision object, so apply freshness is mechanically guarded, but the user
    cannot interpret the displayed freshness evidence correctly.
  - Impact: JSON and human output now expose a bounded structured preview, but
    an approver is shown a false timestamp for the observed remote revision.
    This undermines the informed-approval and user-visible freshness contract
    and leaves round-2 Important finding 1 only partially closed.
  - Fix: Persist and emit the actual bounded revision freshness evidence used
    to build the preview (at minimum revision strength and the real
    `updatedAt`/observed time), distinguish unbound local-source revision
    evidence from remote revision evidence, and keep those values digest-bound.
    Change the public JSON/human regression so preview creation, invocation,
    capability observation, and remote revision times are deliberately
    different and approval consumes the correctly labeled remote timestamp.
  - Requirement: FR8, NFR6

### Medium

None

### Minor

None

## Round-2 Finding Closure

| Round-2 finding                                    | Disposition                 | Direct evidence                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Managed-section baseline uses the full remote body | Closed                      | `baselineFromSnapshot()` now extracts validated managed content and rejects absent/malformed boundaries (`service.ts:2581-2625`); the snapshot remains complete. Reconcile tests cover harmless surrounding prose and changed governed content (`service.test.ts:755-849`). |
| Create handoff records attempt before action       | Partial / Critical remains  | Exact action evidence is written before authorization/attempt transition (`service.ts:775-803`) with a deterministic step ID, but the public recovery and no-handle retry defects above prevent restart-safe closure.                                                       |
| Approval response omits structured preview         | Partial / Important remains | JSON and human output now expose affected fields, bounded values/hashes, authority, and revision digests (`output.ts:30-42`, `output.ts:75-92`), and approval tests consume the emitted preview (`index.test.ts:516-588`); the displayed revision time is incorrect.        |

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`,
`implementation.md`, `state.md`, prior reviews
`reviews/p-rev1-review-2026-09-01T020434Z.md` and
`reviews/p-rev1-round-2-re-review-2026-09-01T031049Z.md`, the authoritative
eight-commit range, the complete 17-file implementation/test change inventory,
and all seven files in the latest bounded fix.

### Requirements Coverage

| Requirement | Status               | Notes                                                                                                                                                   |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR4         | implemented in scope | Deliberate intake, publish, refresh, and reconcile paths remain provider-neutral and explicit.                                                          |
| FR5         | implemented in scope | Verified snapshots and governed baselines are durably separated and advanced through resumable materialization.                                         |
| FR7         | implemented in scope | Create/update description modes are enforced; managed snapshots retain surrounding content while baselines retain governed content.                     |
| FR8         | partial              | Preview/apply is durable and digest-bound, but the public preview misstates revision freshness.                                                         |
| FR9         | implemented in scope | Managed reconciliation compares governed content, ignores surrounding remote-owned prose, and blocks malformed/conflicting content.                     |
| FR11        | partial              | Action evidence precedes attempt state, but public restart recovery cannot re-emit it and a no-handle direct-create retry can allocate a second action. |
| FR12        | implemented in scope | Whole-field inbound suppression remains bounded, typed, and visibly incomplete without a credential parser or general-DLP claim.                        |
| FR14        | partial              | Create intent/action evidence is durable, but no public target-bound recovery prevents ambiguous/duplicate retry after a pre-envelope interruption.     |
| FR16        | implemented in scope | The implementation consumes provider-neutral live connector/configured-CLI capability evidence and retains no native provider catalog or dialect.       |
| FR18        | implemented in scope | Project publication consumes only the explicit normalized publication file; detailed project artifacts are not inferred or copied.                      |
| NFR1        | implemented in scope | Every create/update remains projection-gated; no repository/worktree/Git-history/arbitrary-file scan or general-DLP behavior was added.                 |
| NFR2        | partial              | Most unsafe paths fail closed, but interrupted create handoff cannot be recovered publicly and the original command does not bind/block the retry.      |
| NFR3        | missing in scope     | Direct service recovery exists, but the public process-restart path is unreachable and the no-handle direct-authorized boundary remains ambiguous.      |
| NFR6        | partial              | Structured preview content is emitted in JSON/human modes, but the revision observation timestamp is not the actual revision freshness evidence.        |
| NFR8        | implemented in scope | Core, skills, and tests hard-code no provider tool names, native schemas/catalogs, or provider CLI dialects.                                            |

### Extra Work (not in declared requirements)

None.

### Bounded Safety/Portability Check

The authoritative changed implementation/test surface was checked against the
approved boundary. It introduces no repository, worktree, Git-history, or
arbitrary-file secret scan; credential parser or general-DLP claim; provider
tool name, native schema/catalog, or provider CLI dialect. Outbound creates and
updates continue to consume explicit normalized projections and the single
provider-neutral safety gate; inbound sensitive allowlisted fields remain
whole-field suppressed and visibly incomplete.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/authority.test.ts src/commands/pjm/remote/service.test.ts src/commands/pjm/remote/index.test.ts src/commands/pjm/remote/schema.test.ts src/commands/pjm/remote/external-action.test.ts src/commands/pjm/remote/credential-safety.test.ts src/commands/pjm/remote/outbound-projection-safety.test.ts src/commands/pjm/remote/create-binding.test.ts src/commands/pjm/remote/lifecycle.test.ts src/commands/pjm/remote/purpose-policy.test.ts src/commands/pjm/remote/local-projection.test.ts src/commands/pjm/remote/reconcile.test.ts src/commands/pjm/remote/managed-markdown.test.ts src/commands/pjm/remote/association.test.ts src/commands/pjm/remote/snapshot.test.ts src/commands/pjm/remote/store.test.ts src/commands/pjm/remote/__integration__/lifecycle.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm run cli -- --json pjm remote operation continue --operation op_test
git diff --check 3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..15332edbf1a88e41fa1d909bb767273d527dcc28
```

Observed: the exact 17-file suite passed 234/234; CLI type-check passed; the
range diff check passed. The deployed CLI continuation command without an
observation failed before execution with
`required option '--observation-stdin' not specified`, confirming the public
recovery branch is unreachable.

## Recommended Next Step

Run `oat-project-review-receive` to convert the one Critical and one Important
finding into bounded corrective tasks. Do not begin Phase 4: this was the final
normal review slot and the zero-Critical/zero-Important pass criterion was not
met.
