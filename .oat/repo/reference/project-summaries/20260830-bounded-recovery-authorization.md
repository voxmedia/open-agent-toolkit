---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: true
oat_summary_last_task: p-rev3-t02
oat_summary_revision_count: 3
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3]
---

# Summary: bounded-recovery-authorization

## Overview

OAT repeatedly requested authorization when phase verification found an obvious,
in-scope defect after a task commit. This project made prevention primary and
defined bounded same-target repair as part of existing phase authority while
preserving immutable commits, accepted-launch terminality, and every
consequential stop boundary.

## What Was Implemented

- Added a three-way dispatch taxonomy separating forbidden accepted-launch
  fallback, authorized same-target recovery, and scope-expanding work that
  requires new direction.
- Added tiered pre-commit verification and a dedicated
  `oat_phase_recovery_policy` with a default limit of 10 attempts per phase,
  optional `0`–`20` overrides, monotonic durable accounting, and explicit
  exhaustion behavior.
- Defined the complete append-only recovery protocol: reserve before editing,
  preserve the original task commit, create one recovery commit per successful
  attempt, emit one canonical recovery event per disposition, and validate the
  committed terminal handoff before root bookkeeping clears the ledger.
- Kept fresh recovery launches pinned to the exact accepted target and original
  request through continuation events; route escalation and fallback remain
  ineligible.
- Regenerated Claude, Codex, and Cursor provider views and added relational
  contract, provider-parity, and autonomy-inventory coverage.
- Published the workflow and migration guidance, then advanced all five public
  packages and bundled inventory in lockstep from `0.2.26` to `0.2.28` after
  merge-time release reconciliation.
- Closed PR feedback with direction-required pre-attempt handoff,
  committed-tree recovery verification, report-specific task validation, and
  event-distinct remote review evidence; PR #189 then merged with all checks
  green.

## Key Decisions

- **Immutable append-only same-target recovery:** A committed task is never
  amended or replaced. Mechanically bounded repair remains on the accepted
  target and produces separately validated recovery history; every other
  consumer remains default-deny unless it defines an equally complete standing
  authority contract.
- **Dedicated bounded recovery state:** Recovery uses its own per-phase numeric
  budget rather than the review-loop retry counter. Usage never resets, a
  reservation is consumed before editing, and terminal evidence remains
  committed until root validation authorizes clearing.
- **Tiered prevention with observable recovery:** Applicable discoverable checks
  run before task commits, while disproportionate repository-wide checks may
  remain phase-level. Any later post-commit disposition uses a canonical event
  so lower prompt volume cannot conceal unchanged defect volume.
- **Canonical policy with generated provider parity:** Shared skills and agent
  contracts are authoritative; provider-specific assets are generated views
  validated for equivalent behavior instead of independently maintained policy
  forks.

## Design Deltas

- Revision phase `p-rev1` clarified the final-attempt boundary: an already
  reserved, reconciled attempt may finish at `used == limit`, while exhaustion
  still forbids a new reservation.
- Revision phase `p-rev2` added three exact non-gate autonomy-inventory mappings
  exposed by full Phase 4 verification.
- Final lifecycle review found a circular validate/clear precondition. Phase 5
  split the committed pre-bookkeeping terminal handoff from the post-bookkeeping
  settled state and added ordered transition-matrix coverage.

## Notable Challenges

- Phase 1 exhausted its three-cycle review cap with one Important finding, so
  the terminal-attempt correction had to proceed through a separately
  authorized revision phase without rewriting failed review history.
- Phase 3's first review found a recovery-ledger ownership wording defect and
  its original fix continuation lacked required linkage; a bounded corrected
  launch preserved the same target and scope.
- Full Phase 4 verification surfaced autonomy gate-inventory drift outside that
  phase's authorized boundary. The release edits were restored, a narrow
  revision phase repaired the mappings, and Phase 4 reran from a clean baseline.

## Tradeoffs Made

- Broad tests and builds remain phase-level when their per-task cost is
  disproportionate; emitted-output and configuration changes still trigger
  discoverable scoped checks before commit.
- The default budget of 10 covers the observed nine-event disruption with one
  attempt of headroom. Hard bounds, non-resetting usage, and fail-closed
  ambiguity handling trade some autonomy for auditable safety.

## Integration Notes

- Released assets are in public package version `0.2.28`.
- Existing installations must run `oat tools update` and then
  `oat sync --scope all` before global phase agents use the new contracts.
- `oat_phase_recovery_policy` is independent of
  `oat_orchestration_retry_limit`; review/fix and gate-loop behavior is
  unchanged.

## Revision History

- **p-rev1 — final reserved-attempt boundary:** Superseded the unresolved Phase
  1 review finding without reopening the failed phase. It preserved consumed
  budget while allowing an already reserved attempt to reach a terminal state.
- **p-rev2 — autonomy inventory coverage:** Added the exact `NG` mappings
  required by new recovery-contract prompt-site prose, then allowed the
  unchanged release phase to rerun.
- **Phase 5 — final-review ledger handoff:** Closed the final Critical finding by
  validating committed terminal markers before clearing and treating only the
  post-clear null marker as settled.
- **p-rev3 — post-PR contract and review evidence:** Resolved four Bugbot
  recovery-contract findings, then preserved the original review event and
  three event-distinct archived remote-review artifacts in append-only order.

## Follow-up Items

- The unrelated session-observer transcript-prefix mismatch remains outside
  this project.
- Project-specific standing authorization for already-running projects remains
  deferred; this work intentionally shipped only the systemic OAT contract.

## Workflow Observations

### 2026-07-31 · structural · oat-project-implement · p-rev1

INVALID_RUN_ABORT before edit: accepted phase packet carried an incorrect full base SHA; preserved clean HEAD 5494dbfe98129193f1db46d86f12b768b7511f39 and stopped without fallback.

### 2026-07-31 · structural · oat-project-implement · p-rev1-corrected-launch

Operator explicitly authorized one new corrected p-rev1 run after the prior accepted invalid-run abort; preserve the same exact target and bounded revision scope.

### 2026-07-31 · structural · oat-project-implement · p-rev1

Phase outcome PASS after one task commit and one fresh review cycle with zero findings; review artifact: reviews/p-rev1-review-2026-07-31T191244Z.md; fix-loop count 0.

### 2026-07-31 · structural · oat-project-implement · p02-p03-bootstrap

Strict normal-mode bootstrap failed readiness because oat status reported unmanaged local Cursor entries; both worktrees preserve correct base 413cfe2f and sync commit c2a48a5b, no phase agent was launched, and the group degraded to sequential target-preserving execution.

### 2026-07-31 · structural · oat-project-implement · p02

Phase outcome PASS after one task commit and one fresh review cycle with zero findings; review artifact: reviews/p02-review-2026-07-31T193213Z.md; fix-loop count 0.

### 2026-07-31 · structural · oat-project-implement · p03-review1-fix1

Original Phase p03 handle returned NEEDS_CONTEXT before edit because the review-fix packet omitted its continuation event; root issued bounded-recovery-authorization-p03-review1-fix1 linked to the original request and preserved the same target and scope.

### 2026-07-31 · structural · oat-project-implement · p03

Phase outcome PASS after two task commits and review cycle 2/3; prior Important finding I1 resolved by continuation bounded-recovery-authorization-p03-review1-fix1; review artifact: reviews/p03-review-2026-07-31T200025Z.md; fix-loop count 1.

### 2026-07-31 · project · bug · autonomy gate-inventory drift

Phase p04 full verification exposed three unmapped prompt-site keys introduced by the earlier recovery-contract prose. Focused reproduction shows all three are non-gate occurrences requiring NG mappings in .agents/docs/autonomy-contract.md; p04 stopped without commit because that file is outside its authorized boundary.

### 2026-07-31 · structural · oat-project-implement · p-rev2-authorization

Operator authorized narrow revision phase p-rev2 for autonomy inventory coverage; root restored the six uncommitted p04 version fields to 0.2.26, retained exact NG keys 4d6c519131e5, 81db07214b06, and 4aa21120295f, and preserved p04's release target unchanged.

### 2026-07-31 · structural · oat-project-implement · p-rev2-outcome

Phase p-rev2 outcome PASS after one task commit and root-owned review cycle 1/3; zero Critical, Important, Medium, or Minor findings; fix-loop count 0; review artifact reviews/p-rev2-review-2026-07-31T213539Z.md; reconnaissance not attempted.

### 2026-07-31 · structural · oat-project-implement · p04-outcome

Phase p04 outcome PASS after one authorized rerun task commit and root-owned review cycle 1/3; zero Critical, Important, Medium, or Minor findings; fix-loop count 0; review artifact reviews/p04-review-2026-07-31T215112Z.md; reconnaissance not attempted; all five 0.2.27 public tarballs validated.

### 2026-07-31 · structural · oat-project-implement · final-review-cycle-1

Final lifecycle review cycle 1/3 FAIL at d7fb5652da797e3c3826f46adda42bd6f5caac3f with one Critical finding: root success required a post-bookkeeping settled ledger before validating the phase-agent's committed completed marker. Auto-disposition converted C1 to p05-t01 and shifted the configured final HiLL checkpoint to p05; no deferred findings.

### 2026-07-31 · structural · oat-project-implement · p05-implementation

Completed p05-t01 at 0eaaf85a1926607a3d864fca21791ee4637c91ce from base c8593262479127565a681ba9cfba548d743d82dc. Root validated the exact one-commit 36-file boundary, ordered pre-bookkeeping terminal-marker handoff, 163 focused tests, 61 skill validations, clean worktree, unchanged 0.2.27 versions, and zero recovery attempts. Final review cycle 1 status advanced to fixes_completed; Phase 5 review pending.

### 2026-07-31 · structural · oat-project-implement · p05-outcome

Phase p05 outcome PASS after task 0eaaf85a1926607a3d864fca21791ee4637c91ce and root-owned review cycle 1/3; zero findings; final-review C1 explicitly closed; fix-loop count 0; review artifact reviews/p05-review-2026-07-31T222411Z.md; reconnaissance not attempted.

### 2026-07-31 · structural · oat-project-implement · final-review-cycle-2

Final lifecycle review cycle 2/3 PASS at cd7fd7aef3d39c6c545ac8d4f62017ae710e7b1b with zero findings and no deferred Medium/Minor items. Cycle-1 C1 is closed by reviewed Phase 5 correction 0eaaf85a1926607a3d864fca21791ee4637c91ce. Initial concurrent reviewer checks hit the shared CLI asset-bundler race; identical sequential reruns passed and changed no tracked files.

### 2026-07-31 · structural · oat-project-implement · implement-exit-gate-generation

Persisted configured implementation exit-gate generation before launch: blocking semantic cross-family final review, maxAttempts 2, reviewed head cd7fd7aef3d39c6c545ac8d4f62017ae710e7b1b, base origin/main with unique merge base 721af62d641061870a71550ed2d487c69b8ea58d, config fingerprint sha256:bab3a74fc851ca974017112f07440aee9f6eca4a014c52cb460b003eb7e05b20, implementation fingerprint sha256:effective-delta-v1:609e85c2b566e739f7ce05022cbc3413cf8a7edd525173ce6c316edadfbd2cd8.

### 2026-07-31 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/bounded-recovery-authorization/reviews/final-review-2026-07-31T224851Z.md

### 2026-07-31 · structural · oat-project-implement · implement-exit-gate-completed

Configured exit gate run 2985cf13-b9ca-449a-8384-81e0a86f44eb passed with zero findings. Correlated gate event final/code/final-review-2026-07-31T224851Z.md was received in commit 0d9c2ec269c452c68ab6908f52663071d14a3da1, archived at its preselected path, and the durable gate state is allowed/passed.

### 2026-07-31 · structural · oat-project-implement · implementation-complete

Implementation completed after final lifecycle review, configured exit gate, correlated receive, and freshness validation passed. Lightweight design declares no approval_mode, so the final approval checkpoint was skipped; configured lifecycle sequence is summary, document, then PR.

### 2026-08-01 · structural · oat-project-implement · closeout-sequence-recovery

Corrected premature completion bookkeeping before docs edits: restored implementation to in_progress, persisted the configured immutable pre-approval sequence [summary, document, pr] with summary completed, and retained final p05 HiLL approval pending. No implementation behavior changed.

### 2026-08-01 · structural · oat-project-implement · closeout-document

Configured pre-approval document step completed at 98d03cd1425461a691fea80e7252b9db6116269b after user approval. pnpm check, pnpm build:docs, formatting, and diff validation passed; sequence now awaits pr.

### 2026-08-01 · structural · oat-project-implement · closeout-pr

Configured pre-approval pr step completed: opened https://github.com/voxmedia/open-agent-toolkit/pull/189 from append-only-disruptions into main. All pre-approval steps [summary, document, pr] are complete; final p05 HiLL approval remains pending.

### 2026-08-01 · structural · oat-project-implement · project-recap-gate

Interactive implementation-tail project-recap preference resolved to ask; user selected skip. No recap was attempted or reused, summary remains unchanged, and final p05 HiLL approval remains pending.

### 2026-08-01 · structural · oat-project-implement · final-p05-hill-approval

User approved the final p05 HiLL checkpoint after configured pre-approval steps [summary, document, pr] completed and the optional recap was skipped. The post-implementation sequence is complete; implementation is complete with PR #189 open.

### 2026-08-02 · structural · oat-project-revise · p-rev3-bugbot-feedback

Validated four PR #189 Bugbot findings and implemented revision p-rev3-t01: pre-attempt direction-required handoff, authoritative committed-tree recovery verification, report-specific task validation, and approval-source vocabulary. Focused contract/provider/autonomy verification passed; full validation and remote re-review pending.

### 2026-08-02 · structural · oat-project-implement · p-rev3-t01-complete

Revision p-rev3-t01 completed locally. Focused recovery-contract, provider-sync, and autonomy-inventory coverage passed 165 tests; 61 OAT skills validated; full repository CI, docs build, formatting, and release validation passed at 0.2.28. Remote Bugbot re-review remains pending.

### 2026-08-02 · structural · oat-project-review-receive-remote · p-rev3-bugbot-pass

PR #189 re-review passed at d5b830ec2676bb8ccf19a72c6fff51a309575fa8: CI, release dry-run, and Cursor Bugbot succeeded; all four original threads were resolved and no new unresolved findings remained. The refreshed final lifecycle gate and p-rev3 HiLL approval remain pending.

### 2026-08-02 · structural · oat-project-review-receive-remote · p-rev3-bugbot-pass-correction

Correction to p-rev3-bugbot-pass: the zero-unresolved observation remains factual, but that entry did not itself establish a valid remote receive because the Reviews event identity and archived evidence were incomplete. Task p-rev3-t02 restores the original row and records event-distinct evidence in reviews/archived/remote-pr-189-review-2026-08-02T004800Z.md, remote-pr-189-review-2026-08-02T011158Z.md, and remote-pr-189-review-2026-08-02T011715Z.md. This later entry supersedes the prior bookkeeping interpretation without deleting history.

### 2026-08-30 · structural · oat-project-complete · completion-override

Operator approved completion after PR #189 merged with green CI, release dry-run, and Bugbot checks. No implementation work remains; the stale refreshed final gate and unrecorded p-rev3 HiLL approval are explicitly overridden for historical closeout.
