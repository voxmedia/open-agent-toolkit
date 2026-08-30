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

| Wave | Theme                         | Lanes | Status | Record                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ----------------------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1   | Test and CI containment       | 2     | merged | PR #215 → `5bb2f914186de04f30c3f144f8bc452c4c0a4824` (squash, 2026-08-26T19:00:19Z); wrapper project `.oat/projects/shared/wave-1-execution` (lifecycle complete 2026-08-26; completion record `summary.md` + `implementation.md` § Final Summary); completion tail: deferred to program close; recap: deferred to program close (the per-wave project-recap manifest `explainers/wave-1-execution-recap` is `built-durable`, run `run-051612fb-0075-43de-b2dd-0aea4209775f`) |
| W2   | Sync provenance warning       | 1     | merged | PR #217 → `33149b26298f6d6bb631fdadb55de23bc9678edc` (squash, 2026-08-26T22:56:20Z); wrapper project `.oat/projects/shared/wave-2-execution` (lifecycle complete 2026-08-26; completion record `summary.md`); public packages 0.2.34; completion tail: deferred to program close; recap: deferred to program close (per-wave recap manifest `run-1b2d1eb3-9616-4ae7-95c7-861d5c148c97`, built-durable)                                                                        |
| W3   | Hermetic CLI assets           | 1     | merged | PR #219 → `cd3ba1400209e8dcfd78abc1d124591f0f1d6136` (squash, 2026-08-27T01:47:39Z); wrapper project `.oat/projects/shared/wave-3-execution` (lifecycle complete 2026-08-27; completion record `summary.md`); public packages 0.2.35; completion tail: deferred to program close; recap: deferred to program close (per-wave recap manifest `run-6c05d663-d933-4480-8740-96709c53deeb`, built-durable)                                                                        |
| W4   | Codex skill policy correction | 1     | merged | PR #222 → `06f49fb0430e8ee8ebde040cdb07ed109f6990a9` (squash, 2026-08-27T06:55:51Z); wrapper project `.oat/projects/shared/wave-4-execution` (lifecycle complete 2026-08-27; completion record `summary.md`); public packages 0.2.36; completion tail: deferred to program close; recap: deferred to program close (per-wave recap manifest `run-7dd79e60-3b34-47ba-b7b5-dfe64694c9f3`, built-durable)                                                                        |

## Wave Table (coverage: 5 plans = 5 index rows; verified 2026-08-19, re-verified 2026-08-25)

| Plan                                                                                             | Index                                                                  | Wave | Ordering notes                                        | Status |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---- | ----------------------------------------------------- | ------ |
| [Bound smoke cleanup signal waits](./2026-08-19-bound-smoke-cleanup-signal-wait.md)              | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W1   | parallel group; merge first to bound later validation | done   |
| [Reject package versions overtaken by main](./2026-08-19-detect-behind-main-package-versions.md) | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W1   | parallel group; merge after smoke containment         | done   |
| [Surface sync version skew](./2026-08-19-warn-sync-version-skew.md)                              | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W2   | solo; merge before the next public-package baseline   | done   |
| [Honor an explicit CLI assets root](./2026-08-19-hermetic-cli-assets-root.md)                    | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W3   | solo; start from W2's merged package versions         | done   |
| [Refresh codex-skill routing](./2026-08-19-refresh-codex-skill-routing.md)                       | [2026-08-19 backlog review](./2026-08-19-backlog-review-plan-index.md) | W4   | solo; reread live provider matrix before editing      | done   |

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
- **Closeout (2026-08-26):** merged via PR #215 (`5bb2f914`). Both lanes
  shipped in full; the wave also carried a lockstep bump 0.2.32 → 0.2.33
  (test files under `packages/cli/src/` count as publishable changes — a drift
  the refresh did not anticipate), a DoD docs note, and a formatter guard for
  immutable explainer-kit run packages. Adjustments adopted for W2–W4 are in the
  wrapper's `orchestration-log.md` end-of-run synthesis: absolute paths for
  every root command; drift refresh intersects lane surfaces with release
  change-detection roots and pre-plans lockstep bumps; briefs invoke gates
  literally with per-gate exit logs; ordering/containment reviews require
  delete- and reorder-class mutations; pre-child gate provider rejections are
  boundaries after one identical retry.

## Wave 2: Sync provenance warning

- **Lanes:** Surface sync producer and invoker version skew before mutation.
- **Intra-wave ordering:** Solo lane. Complete implementation, review, release
  bookkeeping, and integration gates before W3 starts.
- **Cross-wave prerequisites:** W1 merged and its current-main release guard
  green. This wave establishes the next public-package version baseline for W3.
- **Composition rationale:** The plan changes shipped CLI behavior and all five
  lockstep package manifests. Isolating it prevents a second plan from
  competing for the same release baseline and keeps rollback reviewable.
- **Closeout (2026-08-26):** merged via PR #217 (`33149b26`), public packages
  0.2.34. The lane shipped in full (advisory before the dry-run/apply branch,
  `versionSkew` in both JSON envelopes, restamp derived from the same
  diagnostic); the lockstep bump was pre-planned at the drift refresh per the
  W1 rule. The configured implement exit gate blocked in generation 1 (its
  `--avoid none` routed to a same-family Fable target whose headless children
  yielded on background work); the operator removed `--avoid none` and
  generation 2 passed on Cursor GPT-5.6 Sol. Follow-ups filed as backlog items
  (silent `oatVersion` restamps outside sync, gate headless-yield contract and
  `--avoid none` audit, resolver `--stamp`, test-only version policy,
  deterministic-smoke worktree hygiene). Rules adopted for W3–W4: keep the gate
  as now configured and verify the selected target in the `gate-start` line;
  launch gates detached (`nohup … & disown`) and watch the receipt; summary
  before any archive step; verify every commit with `git log` before the next
  launch.

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
- **Closeout (2026-08-27):** merged via PR #219 (`cd3ba140`), public packages
  0.2.35. The lane shipped in full (validated `OAT_ASSETS_DIR` override with
  unchanged fail-closed validation; hermetic per-file package-coverage smoke
  bundle with an asserted restore/cleanup guard; ambient-override class closed
  at the vitest env seam). Plan gate and exit gate both passed on round 1 on
  Cursor GPT-5.6 Sol; two phase-review rounds (reviewer probes found a silent
  `it.skipIf` skip, an unswept ambient-env class, and unasserted cleanup — all
  fixed append-only); the `OAT_ASSETS_DIR` docs entry landed at the document
  step. Follow-ups filed as backlog items (partial-bundle structural check;
  override-aware error remedy). Rules adopted for W4: post-commit
  `release:check-versions` re-run; focused-test Verify lines checked against
  the runner; class-naming findings get a repo-wide sweep with the fixture
  shape stated; negative controls and restore/cleanup mutation checks for
  containment lanes; bookkeeping scripts dry-run their anchors before writing.

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
- **Closeout (2026-08-27):** merged via PR #222 (`06f49fb0`), public packages
  0.2.36; `codex-skill` 1.2.0 → 1.3.0. The lane shipped in full (task-class
  routing through the provider reference as the named authority; conditional,
  authorized repository-check bypass; examples validated against
  codex-cli 0.149.1 with the dead `--full-auto` replaced under the operator's
  non-narrowing STOP #2 reconciliation; an eight-case prose contract test with
  logical-line normalization and a structural exemption rule). Plan gate and
  exit gate on Cursor GPT-5.6 Sol; three phase-review cycles (guard hardening
  each round) with the round-3 fixes applied as a reviewer-specified,
  root-verified bounded fix at the cycle cap and independently verified by the
  final review. Follow-ups filed as backlog items (phrase-literal `confirm`
  guard; span-based prose guards + probe anchors; `provider-codex.md` refresh
  for the `ultra` tier and the 2026-08-31 GPT-5.4 retirement). Rules adopted
  for future programs: post-commit re-runs cover both committed-state-only
  gates; live-syntax rereads record flags per subcommand; cross-model review
  stops at two clean rounds or below-Medium and treats root dispositions as
  settled; flag swaps are re-evaluated per example row.

## Program close (2026-08-27)

- **All four waves merged:** W1 PR #215 → `5bb2f914` (0.2.33), W2 PR #217 →
  `33149b26` (0.2.34), W3 PR #219 → `cd3ba140` (0.2.35), W4 PR #222 →
  `06f49fb0` (0.2.36); wave-close PRs #216, #218, #221, #223. Coverage
  invariant: 5 plans in the indexes, 5 rows, all `done`.
- **Program recap: generated, NOT published.** Manifest
  `.oat/repo/explainers/2026-08-19-defect-wave-program-recap/manifest.json`,
  run `run-2200b576-00c1-4803-8a1a-e3563c96d4e2`, recipe `program-recap@1`,
  outcome `built-durable` (artifact commit `776d4d1a`, attestation
  `10d0756f`; supplied fact base
  `.oat/repo/reference/project-recaps/2026-08-19-defect-wave-program.fact-base.json`
  — 13 sources pinned at `f2917165`, 81 cited claims, 5 unresolved claims
  recorded honestly). A first attempt, run
  `run-9bf4ae62-205b-4aed-a638-d0dc0e4152c5`, failed at the visual-review
  stage on a driver seam-binding defect (binding `visualCritic` for a
  `program-recap` recipe hard-fails by kit design); the root authorized one
  corrected re-run with the seam unbound and an out-of-band visual review
  (pass). Publishing is human-gated and was not invoked.
- **Per-wave recaps:** manifests `run-051612fb…` (W1), `run-1b2d1eb3…` (W2),
  `run-6c05d663…` (W3), `run-7dd79e60…` (W4), all built-durable;
  `recap: deferred to program close` — publication remains human-gated.
- **Completion tail (archive + S3 + pointer clear) across all four wrapper
  projects:** `deferred to program close` in every wave row; the
  HUMAN-GATED program completion checkpoint is presented to the operator at
  program close and is not answered autonomously. Standing deferral until the
  operator decides; owner: the operator (`tkstang`).
- **Backlog filed by the program:** `BL-260826-*` (5, at W2 close),
  `BL-260827-fail-closed-on-partial-or`, `BL-260827-override-aware-remedy-text`
  (W3 close), `BL-260827-harden-the-codex-skill-below`,
  `BL-260827-span-based-prose-guards`, `BL-260827-refresh-provider-codex-md`
  (W4 close). Decision records: `DR-260826-*` (3), `DR-260827-*` (6).
