---
oat_generated: true
oat_external_plan_index: false
oat_execution_program: true
oat_program_supersedes: .oat/repo/reference/external-plans/2026-08-19-execution-program.md
oat_program_indexes:
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-1-plan-index.md
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-2-plan-index.md
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-3-plan-index.md
  - .oat/repo/reference/external-plans/2026-09-02-backlog-review-wave-4-plan-index.md
  - .oat/repo/reference/external-plans/2026-09-03-backlog-review-wave-5-plan-index.md
created: '2026-08-31T05:24:43Z'
---

# Execution Program: 2026-08-31 (revalidated backlog-review implementation corpus)

This artifact is the durable program map for the external-plan corpus listed in
`oat_program_indexes`. It records wave composition and status. It is not an
executable plan and is not an `oat-project-import-plan` target—each wave runs as
a wrapper OAT project via `oat-wave-execute`, and each plan's implementation
contract remains its immutable plan file.

This program supersedes the composition map in
[the 2026-08-19 execution program](./2026-08-19-execution-program.md), whose four
implementation waves are already merged. It does not absorb or resolve that
program's deferred human-gated completion tails; those remain owned by the
predecessor record and the operator.

## Status Ledger

Execution approval: awaiting operator composition approval. No wave execution,
wrapper project, implementation branch, or implementation PR has started.

| Wave | Theme                                | Lanes | Status   | Record                                                        |
| ---- | ------------------------------------ | ----- | -------- | ------------------------------------------------------------- |
| W1   | CLI resolution and asset correctness | 4     | composed | Awaiting operator composition approval; no execution started. |
| W2   | Skill contract truthfulness          | 5     | composed | Awaiting operator composition approval; no execution started. |
| W3   | Workflow durability and containment  | 3     | composed | Awaiting operator composition approval; no execution started. |
| W4   | Delivered-project follow-ups         | 3     | composed | Awaiting operator composition approval; no execution started. |
| W5   | Program-intake follow-ups            | 11    | composed | Awaiting operator composition approval; no execution started. |
| W6   | Truthfulness residue                 | 5     | composed | Awaiting operator composition approval; no execution started. |

## Wave Table (coverage: 31 plans = 31 index rows; verified 2026-09-04)

| Plan                                                                                                                                                      | Index                                                            | Wave | Ordering notes                                                                                                      | Status  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md)                                                                        | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1                                                                                                    | pending |
| [Emit dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md)                                                          | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | parallel group; moved from W1 on 2026-09-02; READY since PR #255 merged (refreshed 2026-09-03); issue #211 is soft  | pending |
| [Validate assets bundle structure](./2026-08-30-validate-assets-bundle-structure.md)                                                                      | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1; merge before asset-error successor                                                                | pending |
| [Make asset errors override-aware](./2026-08-30-make-assets-errors-override-aware.md)                                                                     | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | group 2 after dependency revalidation sets the plan READY                                                           | pending |
| [Repair bundled skill contract drift](./2026-08-30-repair-bundled-skill-contract-drift.md)                                                                | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W2   | group 1; merge-first contract baseline                                                                              | pending |
| [Harden codex-skill anaphora guard](./2026-08-30-harden-codex-skill-anaphora-guard.md)                                                                    | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation                                                                     | pending |
| [Guard docs-app mirrors of skill prose](./2026-08-30-guard-docs-app-mirrors-of-skill-prose.md)                                                            | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation                                                                     | pending |
| [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                                | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W2   | group 2; revalidate if draft PR #190 changes first                                                                  | pending |
| [Require repo-wide call-site sweeps](./2026-08-30-require-repo-wide-call-site-sweeps.md)                                                                  | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1                                                                                                    | pending |
| [Journal deterministic smoke worktrees](./2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md)                                            | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1; dedicated safety review                                                                           | pending |
| [Require executable backstops](./2026-08-30-require-executable-backstops-for-contract-claims.md)                                                          | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | group 2 after concrete guard examples and call-site sweep                                                           | pending |
| [Disable configured gates per project](./2026-08-30-disable-configured-gates-per-project.md)                                                              | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | parallel group; preserve PR #246 contracts                                                                          | pending |
| [Warn on non-sync manifest restamps](./2026-08-30-warn-on-non-sync-manifest-restamps.md)                                                                  | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W4   | parallel group; READY since PR #255 merged (refreshed 2026-09-03 against Manifest V2); preserve PR #249 diagnostics | pending |
| [Recover committed review artifacts after post-selection gate failures](./2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md) | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1; land before the index-lock plan                                                                            | pending |
| [Retry gate project-log finalization across transient Git index locks](./2026-09-02-retry-gate-project-log-finalization-across-index-locks.md)            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2 after post-selection recovery                                                                               | pending |
| [Keep instruction-sync pointer files out of documentation content trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)                | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1; before `oat config unset`                                                                                  | pending |
| [Add an exclusion mechanism to docs index generation](./2026-09-02-add-exclusions-to-docs-index-generation.md)                                            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W1   | group 2 successor; READY only after the docs-index lane merges and step 1 passes                                    | pending |
| [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md)     | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2; before the readiness-contract lane                                                                         | pending |
| [Add an oat config unset command](./2026-09-02-add-oat-config-unset-command.md)                                                                           | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2 after instruction-sync pointers                                                                             | pending |
| [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md)            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1                                                                                                             | pending |
| [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md)          | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W2   | group 3 after the named-skill loading lane                                                                          | pending |
| [Defer activeProject clearing on shared and local archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)               | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 4 after the recap lane; before the consolidation plan                                                         | pending |
| [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                     | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 5 after active-pointer and quick-resume                                                                       | pending |
| [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                     | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 3                                                                                                             | pending |
| [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md)                         | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 3 after the skill-script lane                                                                                 | pending |
| [Populate provider reachability evidence across pack and lifecycle surfaces](./2026-09-03-populate-provider-reachability-evidence.md)                     | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                      | pending |
| [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md)        | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                      | pending |
| [Preserve `__proto__`-named config keys through JSON parsing](./2026-09-03-preserve-proto-named-config-keys.md)                                           | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                      | pending |
| [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md)                                                | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | group 2 after the pr-final lane (shared version pins)                                                               | pending |
| [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md)                | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W5   | group 4 beside the active-pointer lane; disjoint surface                                                            | pending |
| [Diagnose canonical skills missing from a provider view at resolution time](./2026-09-04-diagnose-canonical-skills-missing-from-provider-views.md)        | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | group 2 after the provider-reachability lane (shared `info-tool.ts`)                                                | pending |

## Program-wide integration rules

- Assume a concurrency ceiling of three implementation lanes. A numbered plan
  or row does not imply serial execution unless an ordering note says so.
- Create one wrapper OAT project and one integration PR per wave. Keep lane
  commits reviewable inside the wrapper branch and record all reconciliations in
  its orchestration log.
- Lockstep release files (the five public package manifests,
  `packages/cli/assets/public-package-versions.json`, and `pnpm-lock.yaml`)
  are owned exclusively by the wave fan-in step: no implementation lane edits
  them, so parallel lanes never share that write surface. The fan-in makes one
  lockstep bump above freshly fetched `origin/main` after all lane commits and
  regenerates the version asset through the build.
- Run each lane's focused gates before fan-in, then run the repository's full
  definition-of-done gate sequence on the integrated wave branch. Fetch current
  `origin/main` immediately before release-version validation.
- Revalidate every pending wave when main materially changes. Specifically
  re-sweep W4 dispatch behavior if issue #211 changes and W2 lifecycle loading
  if draft PR #190 changes before their lanes start.
- **External dependency (landed):** the `tool-pack-scope-provider-truthfulness`
  project merged as PR #255 (`a06e9713a`, CLI 0.2.52) on 2026-09-03, followed
  by PR #256 (0.2.53). The two W4 plans it blocked are now `READY` and
  refreshed. Before each remaining lane starts, apply its landing-event row: W2's named-skill
  lane re-sweeps `dispatch-and-dry-run.md` and the review-provide skills; W4's
  gate-override lane re-anchors `oat-project-plan-writing` and
  `user-sync-config.ts`; W3's smoke lane re-anchors `tools/smoke/CONTRACT.md`
  (an adjacent `runtimeObservation` section lands there). Its `p07-t04` also
  archives four backlog items and rewrites the backlog index, so any wave
  closeout after that merge must rebase its backlog bookkeeping.
- Stop at the operator checkpoint below before creating the W1 wrapper project
  or dispatching any implementation lane.

## Wave 1: CLI resolution and asset correctness

- **Parallel group 1:** Use configured docs index paths; validate asset-bundle
  structure. (The dispatch-stamp lane moved to W4 on 2026-09-02 because the
  in-flight truthfulness merge rewrites its cited skills.)
- **Group 2 status gate:** After structural asset validation completes and
  merges into the wave branch, revalidate the successor against that exact
  tree. The same gate applies to the docs-index exclusion successor: after the
  docs-index path lane merges into the wave branch, run that plan's step 1,
  set it `READY`, then implement it. Update or supersede its external plan and set `oat_execution_status` to
  `READY` only when the hard-dependency evidence and focused asset tests pass.
  Do not import or dispatch the successor while its source plan remains
  `BLOCKED`. Then implement the override-aware remedies and revalidate every
  pre-existing asset failure family plus the new structural branch.
- **Cross-wave prerequisites:** None beyond a fresh main baseline and operator
  approval.
- **Composition rationale:** The two first-group lanes are bounded CLI/runtime
  fixes with disjoint primary write surfaces. The third is a true ordered
  successor to the asset validator and remains in the same wrapper so its error
  matrix is tested against the exact delivered branch.

## Wave 2: Skill contract truthfulness

- **Group 1:** Repair the verified bundled-skill contract drift and merge it
  into the wave branch first.
- **Parallel group 2:** Harden the codex-skill anaphora guard; guard docs-app
  mirrors of contract-tested skill prose; require lifecycle orchestrators to
  load every named execution skill.
- **Group 3:** Document patch-and-restore recovery for lost child handles,
  after the named-skill lane, with one coordinated `oat-project-implement`
  bump. Draft PR #190 rewrites the same reference; apply that plan's
  landing-event row if #190 merges first.
- **Cross-wave prerequisites:** W1 merged. Revalidate the lifecycle corpus if
  draft PR #190 changes before group 2 starts.
- **Composition rationale:** Group 1 establishes the corrected canonical prose
  baseline. The three guard/loading lanes can then run as peers against that
  baseline while coordinating canonical-skill versions, docs mirrors, shared
  contract tests, and release files once at fan-in.

## Wave 3: Workflow durability and containment

- **Parallel group 1:** Require repo-wide call-site sweeps for cross-cutting
  options; journal deterministic smoke worktrees before creation.
- **Group 2:** Require executable backstops for standing contract claims after
  the call-site sweep and W2 guard work provide current concrete examples.
- **Cross-wave prerequisites:** W2 merged. The smoke lane receives a dedicated
  ownership and deletion-safety review before integration.
- **Composition rationale:** The first two lanes have write-disjoint workflow
  policy and smoke-tooling surfaces. The authoring-policy lane is not product-
  blocked by them, but ordering it second reduces prose churn and lets its
  examples cite freshly delivered executable contracts.

## Wave 4: Delivered-project follow-ups

- **Parallel group:** Disable configured lifecycle gates per project; warn on
  every non-sync manifest version restamp; emit the dispatch stamp with
  resolver JSON.
- **Cross-wave prerequisites:** W3 merged. The manifest-restamp and
  dispatch-stamp plans were refreshed and set `READY` on 2026-09-03 after
  PR #255 merged; re-anchor the gate-override plan's `oat-project-plan-writing` and
  `user-sync-config.ts` citations. Revalidate all three against live
  gate/status/dispatch surfaces because they follow freshly merged PRs #246,
  #249, and the truthfulness PR.
- **Composition rationale:** All three plans follow merged or imminently
  merging projects that own their surfaces. They are independent CLI follow-ups
  on separate gate, status, and dispatch surfaces, kept in the final wave to
  minimize churn around newly delivered contracts and to reconcile release
  files once.

## Wave 5: Program-intake follow-ups

- **Parallel group 1:** Recover committed review artifacts after
  post-selection failures; keep instruction-sync pointers out of docs trees;
  route incomplete quick projects to quick-start.
- **Parallel group 2:** Retry gate project-log finalization across index
  locks (after group 1's gate plan); add `oat config unset` (after the
  instruction-sync plan so its family-coverage test includes the new
  `documentation.*` key); validate skill-to-script references.
- **Parallel group 3:** Enforce the external-plan readiness contract (after
  the skill-script lane, which shares a contract-test file); make the
  autonomous recap capability-aware (after `oat config unset`, adding its
  optional seam keys to the unset family test).
- **Group 4:** Defer activeProject clearing on archive completions, after the
  recap lane releases `oat-project-complete/SKILL.md`; make terminal project
  status agree with completed revision plans (control-plane parser and
  recommender, disjoint from every other lane).
- **Group 5:** Make consolidated-project retirement semantic, after the
  active-pointer and quick-resume lanes.
- **Cross-wave prerequisites:** W4 merged. Before dispatch, re-read every W5
  plan's `## Landing-event impact` table against the then-current state of
  `tool-pack-scope-provider-truthfulness` and PR #190 and apply the listed
  refreshes; the skill-script plan and the readiness plan re-anchor
  contract-test files the truthfulness merge rewrites.
- **Composition rationale:** Ten lanes with four shared seams (the gate
  module; `OatDocumentationConfig`/`config/index.ts`; the completion skill,
  which three lanes edit in sequence; and the shared skill contract-test
  files) arranged in five groups so each seam is touched by at most one lane
  per group and the Wave 4 index ordering (docs-index exclusions →
  instruction-sync → unset) is honored; every lane follows a freshly
  merged wave that owns adjacent prose.

## Wave 6: Truthfulness residue

- **Parallel group 1:** Populate provider reachability evidence; validate
  review-ledger paths before the final PR; preserve `__proto__`-named config
  keys.
- **Group 2:** Honor `metadata.version` as the canonical skill version, after
  the pr-final lane releases the version pins in `validation/skills.test.ts`
  (its bulk-migration follow-up stays outside the program); diagnose
  canonical skills missing from a provider view in `oat tools info`, after
  the reachability lane releases `info-tool.ts`.
- **Cross-wave prerequisites:** W5 merged, so the shared contract-test seams
  the pr-final lane extends are settled. Apply the PR #190 landing-event rows
  in the pr-final and config-key plans if that draft merges first.
- **Composition rationale:** Three write-disjoint lanes plus one ordered
  successor; all share only the lockstep manifests, so run under one
  wave-level bump. Kept out of W5 because
  its five groups already allocate every contract-test seam.

## Revalidation record

- **2026-09-02 (intake)** — Added the Wave 4 index (12 plans) from the
  program-intake triage; coverage 25/25. Placed the docs-index exclusion plan
  as a W1 group-2 successor (`BLOCKED` until its predecessor merges),
  patch-and-restore in W2 group 3, and the other ten in a new W5. Every new
  plan carries a `## Landing-event impact` table for the truthfulness merge
  and PR #190. Ledger: W1 = 4 lanes, W2 = 5, W3 = 3, W4 = 3, W5 = 10.
- **2026-09-02 (review)** — Bugbot found two composition defects in W5:
  the active-pointer and recap lanes shared the completion skill in one
  group, and `oat config unset` ran before the instruction-sync pointer key
  it must cover. Recomposed W5 into five groups honoring the Wave 4 index
  ordering and added the recap → unset ordering neither document stated.
- **2026-09-03 (truthfulness landed)** — Rebased onto `origin/main`
  `cf0159893` (PR #255 truthfulness at `a06e9713a`, PR #256 duplicate-role
  sync fix). Re-ran all 25 drift checks from the repository root: drift
  matched every plan's landing-event forecast. Refreshed the manifest-restamp
  and dispatch-stamp plans against Manifest V2, the new engine save sites, the
  status collection-migration block, and the new `oat project dispatch record`
  surface; both are now `READY` (23 READY, 2 BLOCKED: the two ordered
  successors). Marked the event landed in every Wave 4 plan's impact table.
  PR #255 also created eight `BL-260903-*` items (residue, retro feedback, two
  pre-existing defects) and left `BL-260724` open by operator decision; none
  enter this program yet. No new GitHub issues since the intake triage.
- **2026-09-03 (residue planned)** — PR #253 merged (`dd41adb9b`) and the
  post-merge triage resume ran. Added the Wave 5 index (3 plans from the
  `BL-260903-*` residue) as a new W6; coverage 28/28 (26 READY, 2 BLOCKED).
  Filed `BL-260904-stabilize-the-collection` for the collection-detach test
  flake observed on #253's CI (main passed on identical code); unplanned
  until reproduced.
- **2026-09-04 (PR #248)** — Rebased onto `7c90b220a` (recon evidence
  packets, 113 files). Incremental drift for all 29 plans: adjacent only
  (`validation/skills.test.ts` recon pins, `oat-config.ts` `tools.requiredBy`
  leases, autonomy-contract inventory, bundle and bundled-docs contract
  tests) plus small anchor shifts re-applied in the manifest-restamp,
  provider-reachability, skill-version, and skill-script plans. PR #248 also
  added four backlog items; `BL-260901-make-terminal-project-status`
  (high/S) is plan-ready and unplanned, the recon-integration and
  corrective-revision items need discovery.
- **2026-09-04 (issue #258)** — Added the skill-versioning plan (Agent Skills
  spec `metadata.version`) as W6 group 2; coverage 29/29 (27 READY,
  2 BLOCKED). The bundled-skill migration is a separate backlog item outside
  the program.
- **2026-09-04 (status and diagnostic)** — Added the terminal
  project-status plan (root cause: the control-plane parser drops
  `## Phase p01:` and `## Revision Phase p-rev1:` headings, and the recommender
  never reads `lifecycle`) to W5 group 4 and the provider-view diagnostic
  (hosted in `oat tools info`, status untouched) to W6 group 2. Coverage
  31/31 (29 READY, 2 BLOCKED). Ledger: W5 = 11 lanes, W6 = 5.
- **2026-09-04 (independent review)** — Five independent review lanes (three
  Codex, two Claude) covered all 31 plans. Corpus-wide fixes: lockstep release
  files are now owned by the wave fan-in and no lane writes them; every
  2026-08-30 plan gained a landing-event table; reciprocal never-parallel rows
  now exist for every shared write surface. Substantive fixes: the
  active-pointer guard keys on `IS_DURABLE_PROJECT` (local scope never
  archives); the terminal-status plan normalizes heading dialect and task-id
  padding; the docs-index plan pins a derivation rule for the ambiguous
  `documentation.root` and propagates the `CliError` exit code; the recap plan
  moved its optional config step to `BL-260904-add-recap-seam-config-keys`;
  decision-record steps carry PJM preconditions; stale anchors from PRs #248
  and #255 were refreshed. Review record:
  `.oat/repo/reference/reviews/2026-09-04-external-plan-independent-review.md`.

- **2026-09-02** — Rebased the program branch onto `origin/main`
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` (PR #254, retire archived synced
  project records). Re-ran all 13 drift checks: only lockstep version bumps,
  test line shifts, `oat-project-complete` 1.7.6 (fallback citation moved
  406 → 465 in the named-skill plan), and unrelated docs prose. All 13 plans
  re-stamped to that baseline. Verified the in-flight
  `tool-pack-scope-provider-truthfulness` branch read-only at `27b978528`
  (190 files vs. the same merge-base): it implements neither the manifest
  restamp nor the dispatch stamp outcome, but rewrites both plans' surfaces,
  so both are now `BLOCKED` on its merge and the dispatch-stamp lane moved from
  W1 to W4. PR #190 (`81a51d2d`, draft) and issue #211 remain open soft
  triggers. Composition: W1 = 3 lanes, W2 = 4, W3 = 3, W4 = 3; coverage still
  13/13.

## Operator checkpoint

The four-wave composition is ready for review. Before W1 execution, the
operator must explicitly approve this program, its ordering, and its
concurrency assumptions. Approval to merge the program artifact does not by
itself authorize creation of a wave wrapper project, implementation dispatch,
or wave PR mutation.
