---
oat_generated: true
oat_external_plan_index: false
oat_execution_program: true
oat_program_supersedes: null
oat_program_indexes:
  - .oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md
created: '2026-08-20T04:34:06Z'
---

# Execution Program: 2026-08-19 (recent bounded defect lane)

This artifact is the durable program map for the external-plan corpus listed in
`oat_program_indexes`. It records wave composition and status. It is not an
executable plan and is not an `oat-project-import-plan` target — each wave runs
as a wrapper OAT project via `oat-wave-execute`, and each plan's implementation
contract remains its immutable plan file.

## Status Ledger

Execution approval: the operator approved the four-wave composition and authorized
autonomous execution on 2026-08-25 (session-scoped OAT autonomy; wave PRs are
created and merged by the root orchestrator once required gates pass). This
supersedes the "execution deferred by operator on 2026-08-19" record.

| Wave | Theme                         | Lanes | Status   | Record                                                                                                                                                                              |
| ---- | ----------------------------- | ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1   | Test and CI containment       | 2     | composed | operator-approved 2026-08-25; wrapper project `wave-1-execution` (in progress; blocked 2026-08-26 at the plan gate — Cursor exec-target usage limit, see the project `references/`) |
| W2   | Sync provenance warning       | 1     | composed | pending W1 merge                                                                                                                                                                    |
| W3   | Hermetic CLI assets           | 1     | composed | pending W2 merge                                                                                                                                                                    |
| W4   | Codex skill policy correction | 1     | composed | pending W3 merge                                                                                                                                                                    |

## Wave Table (coverage: 5 plans = 5 index rows; verified 2026-08-19, re-verified 2026-08-25)

| Plan                                                                                             | Index                                                                  | Wave | Ordering notes                                        | Status  |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---- | ----------------------------------------------------- | ------- |
| [Bound smoke cleanup signal waits](./2026-08-19-bound-smoke-cleanup-signal-wait.md)              | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W1   | parallel group; merge first to bound later validation | pending |
| [Reject package versions overtaken by main](./2026-08-19-detect-behind-main-package-versions.md) | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W1   | parallel group; merge after smoke containment         | pending |
| [Surface sync version skew](./2026-08-19-warn-sync-version-skew.md)                              | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W2   | solo; merge before the next public-package baseline   | pending |
| [Honor an explicit CLI assets root](./2026-08-19-hermetic-cli-assets-root.md)                    | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W3   | solo; start from W2's merged package versions         | pending |
| [Refresh codex-skill routing](./2026-08-19-refresh-codex-skill-routing.md)                       | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W4   | solo; reread live provider matrix before editing      | pending |

## Wave 1: Test and CI containment

- **Lanes:** Bound smoke cleanup signal waits; reject package versions
  overtaken by main.
- **Intra-wave ordering:** Dispatch both lanes in one parallel group because
  their declared write surfaces are disjoint. Merge smoke cleanup first so the
  bounded signal harness protects the release-guard lane's integration test
  run; merge the release guard second, then run the full integration gate.
- **Cross-wave prerequisites:** Clean planning baseline at `ccf3725e`. This wave
  unblocks later full-suite validation and provides the current-main release
  guard before any shipped-package wave begins.
- **Composition rationale:** Both lanes are recently observed containment bugs,
  neither changes shipped package versions, and their write surfaces separate
  `tools/smoke/runner` from `tools/release` and release unit tests. Pairing them
  uses bounded parallel capacity without stacking runtime product changes.

## Wave 2: Sync provenance warning

- **Lanes:** Surface sync producer and invoker version skew before mutation.
- **Intra-wave ordering:** Solo lane. Complete implementation, review, release
  bookkeeping, and integration gates before W3 starts.
- **Cross-wave prerequisites:** W1 merged and its current-main release guard
  green. This wave establishes the next public-package version baseline for W3.
- **Composition rationale:** The plan changes shipped CLI behavior and all five
  lockstep package manifests. Isolating it prevents a second plan from
  competing for the same release baseline and keeps rollback reviewable.

## Wave 3: Hermetic CLI assets

- **Lanes:** Honor an explicit CLI assets root and isolate package coverage
  smoke tests.
- **Intra-wave ordering:** Solo lane. Begin only after refreshing from W2's
  merged public-package versions.
- **Cross-wave prerequisites:** W2 merged. This wave must pass its isolated
  built-CLI smoke proof and release validation before W4 starts.
- **Composition rationale:** The runtime override, smoke isolation, and package
  bump form one shippable unit. A dedicated wave avoids simultaneous edits to
  the public manifests and gives the environment-override boundary focused
  review.

## Wave 4: Codex skill policy correction

- **Lanes:** Route codex-skill through current model guidance and preserve
  repository checks.
- **Intra-wave ordering:** Solo lane. Reread the live Codex provider reference
  during wave-boundary drift refresh, then change the canonical skill, focused
  contract test, and release metadata together.
- **Cross-wave prerequisites:** W3 merged and public-package baseline refreshed.
  This is the final program wave and unblocks program closeout after merge.
- **Composition rationale:** The lane has a different policy/review surface
  from the code defects and carries both a canonical-skill version bump and a
  lockstep package bump. Keeping it last minimizes stale model-catalog risk and
  prevents release-file contention.
