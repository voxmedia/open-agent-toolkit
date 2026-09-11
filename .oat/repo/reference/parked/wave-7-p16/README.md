> Restored 2026-09-09 from commit `f4c2dc4ef` (PR #286) after the wave-7 wrapper was archived out of the repository; the original path `.oat/projects/shared/wave-7-execution/parked/wave-7-p16/` no longer exists in the tree. Bytes are identical to the archived copy.

# Parked wave-7 p16 work (2026-09-09)

Lane p16 (`2026-09-08-calculate-dispatch-baselines-after-journaling.md`, the
baseline half of `BL-260906-harden-dispatch-launch`) parked on a plan STOP
before any commit. The plan's Step 3 prescribes an optional `gitExecFile` seam
inside `packages/cli/src/commands/project/dispatch/record.ts` defaulting to
`promisify(execFile)`, and the recorder graph carries an architectural guard
(`record.test.ts:1879-1902`, "launches no provider: the recorder graph cannot
start a process") whose regex forbids exactly that edit. No implementation
satisfies both: moving the default to `index.ts` hits the same guard, a new
unlisted module evades the guard's stated subject, reading `.git/HEAD` cannot
produce `tree_clean`, and caller-supplied observation is excluded by the plan
and issue #265. Restructuring the guard is an architecture decision the plan
does not analyze or authorize.

## Contents

| File                         | What it is                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p16-partial-steps2-3.patch` | plan Steps 2 (the `oat.observedHead` schema slot, green, mutability case unchanged) and 3 (the seam the guard rejects); applies cleanly at `335aae6a8` (2 files, +178/−10) |
| `prefix-journal.json`        | a pre-fix journal captured from the real built CLI — the backward-compatibility fixture the plan's changed-cases section asks for                                          |

SHA-256: patch `0879c097dd8b7378f592e38e08745abc4a757c6c5b3aa14df03de64b94f084df`,
fixture `1b46975c2ec65e1d3264fec88e16d29a19c4a1958124784acc90adfbf58ab790`.

## What the lane verified before the block

Drift matched the declared churn; the `oat-project-implement` (`2.3.7`, 8
sites) and `oat-dispatch-subagents` (`1.2.7`, 2 sites) pins re-anchored by
literal; the plan's Step 1 premise reproduced live (a journal write moves
`HEAD`, so the base-equality check in `oat-phase-implementer.md:343` fails —
the synthetic twin of the wave-6 p06 `INVALID_RUN_ABORT`); no skill writes
`launch_status: planned`; STOP 6 cleared; three-way control on the guard
(base green; Step 2 alone green; Steps 2 + 3 red at `record.test.ts:1901`).

## Re-entry

The item returns to planning as a decision: either admit a single, explicitly
audited git observation seam into the recorder graph (amend the guard and its
documented "never launches a provider" contract deliberately, with a decision
record and cross-model review), or redesign the baseline observation outside
the graph without caller-supplied values. Three further plan defects to fold
in: test-plan case 5 is unreachable as written (the strict generic schema
rejects an `oat` key on the input; the only carrier is the persisted revision
through `augmentDispatchRecord`); the `oat` block is camelCase, so `tree_clean`
/ `observed_at` should be settled deliberately; the plan's `## Current state`
records the symptom ("touches git nowhere") while missing the enforced guard.
