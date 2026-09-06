---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: true
oat_summary_last_task: p03-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-3-execution

## Overview

Wave 3 ("workflow durability and containment") of the 2026-08-31 execution
program: three external plans, each an immutable implementation contract, run
as a thin wrapper project so the fixes could execute in parallel worktrees with
root-owned reviews, one lockstep release bump, and full integration gates
after every fan-in. The motivating defects were an implementer contract that
let a task change a cross-cutting option without finding every consumer, a
deterministic smoke runner that created git worktrees before journaling them
and so leaked them on interruption, and skill-authoring guidance that let
standing claims ship with nothing executable behind them.

## What Was Implemented

- **Repo-wide call-site sweeps (p01).** `oat-phase-implementer.md` (1.1.2 →
  1.1.3) and, after the exit gate required it, `oat-project-implement` (2.3.2 →
  2.3.3; the root acceptance clause now accepts the effective boundary) require a repository-wide sweep for every consumer of a changed
  cross-cutting option (including fixtures, mocks, snapshots, and tests),
  defines the effective task boundary as the declared files plus mechanical
  additions permitted by and reported under the sweep, and stops to report
  when an expansion crosses another owner. `post-implement-sequence-contracts.test.ts`
  pins the rule with six red-proved negative probes and a scoped deny-list
  against softening the stop-and-report duty.
- **Smoke worktrees journaled before creation (p02).** The deterministic smoke
  runner reserves a nested resource in its ownership journal before
  `git worktree add`, cleanup reconciles reserved entries after re-deriving
  run-directory containment and run-baseline equality (with `reservedAt`
  required for reserved entries), and every deletion path re-reads the branch
  tip and keeps Git's checked-out-branch protection. The one residual, a
  foreign branch created in the reserve-to-create window at the exact reserved
  baseline, is stated in code, `CONTRACT.md`, and a pinning test.
  `pnpm test:smoke` grew from 141 to 160 tests.
- **Executable backstops for standing claims (p03).** `create-oat-skill`
  (1.5.0 → 1.5.1) requires every standing claim to name its executable owner
  and ship its backstop in the same PR, never keyed to a physical line;
  `oat-project-design` (2.3.2 → 2.3.3) echoes the obligation at design time;
  `skills.test.ts` pins both with fence-, comment-, and indent-aware
  extraction, `existsSync` checks on cited precedent paths, and a
  weakening-vocabulary deny list.
- **Release.** Lockstep 0.2.57 → 0.2.58 in one fan-in bump with the
  `.oat/sync/manifest.json` restamp in the same commit; provider agent views
  regenerated for the agent bump; the implementation-execution docs page
  aligned with the effective task boundary.

## Key Decisions

- **Report, do not improvise, out-of-lane contradictions — then let the gate
  decide.** p01 found that the implement route's acceptance check still said
  "only declared files"; the lane reported it, the root reviewer routed it to
  wave close, and the cross-family exit gate blocked on it because the
  contradiction sits inside the same integration diff. It was aligned in a
  post-gate fix with the `oat-project-implement` bump and seven pins.
- **Fail closed on unattributable ownership.** Direct registrations keep their
  looser containment because `scripts/worktree/init.sh` legitimately registers
  children outside the run directory; everything reservation-shaped is
  re-derived, and an entry cannot escape the guard by dropping a field.
- **Sync lanes at project scope only.** A lane's `oat sync --scope all`
  rewrote the operator's user-scope provider views; the wrapper now mandates
  `--scope project`, and every plan step that says `--scope all` is read that
  way.

## Design Deltas

- p01 wrote `packages/cli/src/validation/skills.test.ts` (three agent pins)
  although its plan's In-scope list omits the file; the recon predicted it and
  the plan is corrected at wave close.
- p03's runtime example ("a rollup never reports success without writing its
  ledger entry") was false against `rollup.ts` and was corrected to "when a
  required ledger write fails" before commit.
- Plan corrections are tracked for the wave-close program refresh.

## Notable Challenges

- **A "documented residual" that was not documented.** The dedicated
  deletion-safety review reproduced the reserve-to-create window with a probe
  and found the code comment claimed Git closed it; the lane then measured
  that no sound Git discriminator exists and pinned the accepted behavior.
- **Reviewer probes after green Codex rounds.** p01's reviewer found two
  assertions that could be loosened without failing after two Codex rounds had
  passed; p03's reviewer re-verified in a harness three fixes the Codex cap had
  left unverified.
- **The wrapper's own instructions.** Two brief defects surfaced: `git checkout
--` as probe restore wiped uncommitted work once, and `sync --scope all`
  reached outside the repository. Both are now rules.

## Tradeoffs Made

- The reserve-to-create window is accepted and pinned rather than closed:
  closing it would require creating the Git ref before intent is durable,
  which the plan forbids.
- The sweep contract's deny-list is presence-based with a bare-word negation
  lookbehind; a novel synonym still evades it and a bolded negation trips it
  fail-closed (follow-up filed).

## Follow-up Items

- `BL-260906-extend-check-skill-bumps` — the bump gate ignores canonical agent files.
- `BL-260906-make-the-phase-implementer` — negation-aware sweep-contract tests.
- `BL-260906-project-journal-reservation` — reservation state in the smoke evidence bundle.
- `BL-260906-run-scripts-worktree-init-test` — `scripts/worktree/init.test.mjs` under a gate.
- Wave-close plan corrections: the call-site plan's In-scope list and reported
  owner decision; the `sync --scope project` convention across plans.
- Skill signals for `oat-wave-execute` are recorded in the wrapper's
  `orchestration-log.md` synthesis.

## Associated Issues

- `BL-260818-require-repo-wide-call-site`, `BL-260826-deterministic-smoke-tier-leaks`,
  `BL-260714-executable-backstops` — archived by this wave.

## Workflow Observations

### 2026-09-06 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-3-execution/reviews/artifact-plan-review-2026-09-06T110723Z.md

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-3-execution/reviews/final-review-2026-09-06T140727Z.md

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-3-execution/reviews/final-review-2026-09-06T155523Z.md

### 2026-09-06 · structural · oat-gate-review · final

Exit gate attempt 2 (run 0c1ab7b5-c8d5-42ad-8b15-f832b05d8111, codex-5-6-sol-xhigh) passed with zero findings on 8483694bbb88a32a43ba0a4fff57f569064cf12a after attempt 1 (run 872d498a) blocked and two launches were host-killed; artifact reviews/archived/final-review-2026-09-06T155523Z.md.
