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

Execution approval: operator approved the composition and autonomous execution
(including merges) on 2026-09-05. W1 and W2 merged 2026-09-06; W3 is next.

| Wave | Theme                                | Lanes | Status   | Record                                                                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------ | ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1   | CLI resolution and asset correctness | 4     | merged   | PR #262 → `6db0457c095e4384e5ac2f464ee1c4d5a47d0179` (squash, 2026-09-06T02:19:50Z); wrapper project `.oat/projects/shared/wave-1-execution` (lifecycle complete 2026-09-06; completion record `summary.md` + `implementation.md` § Final Summary; CLI 0.2.56); completion tail: deferred to program close; recap: deferred to program close. |
| W2   | Skill contract truthfulness          | 5     | merged   | PR #267 → `ca71c00a014a6eba00cb4cd4c46974fc6aa58139` (squash, 2026-09-06T10:47:59Z); wrapper project `.oat/projects/shared/wave-2-execution` (lifecycle complete 2026-09-06; completion record `summary.md` + `implementation.md` § Final Summary; CLI 0.2.57); completion tail: deferred to program close; recap: deferred to program close. |
| W3   | Workflow durability and containment  | 3     | composed | Awaiting operator composition approval; no execution started.                                                                                                                                                                                                                                                                                 |
| W4   | Delivered-project follow-ups         | 3     | composed | Awaiting operator composition approval; no execution started.                                                                                                                                                                                                                                                                                 |
| W5   | Program-intake follow-ups            | 11    | composed | Awaiting operator composition approval; no execution started.                                                                                                                                                                                                                                                                                 |
| W6   | Truthfulness residue                 | 5     | composed | Awaiting operator composition approval; no execution started.                                                                                                                                                                                                                                                                                 |

## Wave Table (coverage: 31 plans = 31 index rows; verified 2026-09-04)

| Plan                                                                                                                                                      | Index                                                            | Wave | Ordering notes                                                                                                                            | Status  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md)                                                                        | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1                                                                                                                          | done    |
| [Emit dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md)                                                          | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | group 2 after gate override (shared contract tests and pins); moved from W1 on 2026-09-02; READY since PR #255 merged; issue #211 is soft | pending |
| [Validate assets bundle structure](./2026-08-30-validate-assets-bundle-structure.md)                                                                      | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1; merge before asset-error successor                                                                                      | done    |
| [Make asset errors override-aware](./2026-08-30-make-assets-errors-override-aware.md)                                                                     | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | group 2 after dependency revalidation sets the plan READY                                                                                 | done    |
| [Repair bundled skill contract drift](./2026-08-30-repair-bundled-skill-contract-drift.md)                                                                | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W2   | group 1; merge-first contract baseline                                                                                                    | done    |
| [Harden codex-skill anaphora guard](./2026-08-30-harden-codex-skill-anaphora-guard.md)                                                                    | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation                                                                                           | done    |
| [Guard docs-app mirrors of skill prose](./2026-08-30-guard-docs-app-mirrors-of-skill-prose.md)                                                            | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation                                                                                           | done    |
| [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                                | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W2   | group 2; revalidate if draft PR #190 changes first                                                                                        | done    |
| [Require repo-wide call-site sweeps](./2026-08-30-require-repo-wide-call-site-sweeps.md)                                                                  | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1                                                                                                                          | pending |
| [Journal deterministic smoke worktrees](./2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md)                                            | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1; dedicated safety review                                                                                                 | pending |
| [Require executable backstops](./2026-08-30-require-executable-backstops-for-contract-claims.md)                                                          | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | group 2 after concrete guard examples and call-site sweep                                                                                 | pending |
| [Disable configured gates per project](./2026-08-30-disable-configured-gates-per-project.md)                                                              | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | parallel group 1; preserve PR #246 contracts; owns the `oat-project-next` disposition consumer                                            | pending |
| [Warn on non-sync manifest restamps](./2026-08-30-warn-on-non-sync-manifest-restamps.md)                                                                  | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W4   | parallel group 1; READY since PR #255 merged (refreshed 2026-09-03 against Manifest V2); preserve PR #249 diagnostics                     | pending |
| [Recover committed review artifacts after post-selection gate failures](./2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md) | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1; land before the index-lock plan                                                                                                  | pending |
| [Retry gate project-log finalization across transient Git index locks](./2026-09-02-retry-gate-project-log-finalization-across-index-locks.md)            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2 after post-selection recovery                                                                                                     | pending |
| [Keep instruction-sync pointer files out of documentation content trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)                | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1; before `oat config unset`                                                                                                        | pending |
| [Add an exclusion mechanism to docs index generation](./2026-09-02-add-exclusions-to-docs-index-generation.md)                                            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W1   | group 2 successor; READY only after the docs-index lane merges and step 1 passes                                                          | done    |
| [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md)     | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2; before the readiness-contract lane                                                                                               | pending |
| [Add an oat config unset command](./2026-09-02-add-oat-config-unset-command.md)                                                                           | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2 after instruction-sync pointers                                                                                                   | pending |
| [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md)            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1                                                                                                                                   | pending |
| [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md)          | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W2   | group 3 after the named-skill loading lane                                                                                                | done    |
| [Defer activeProject clearing on shared and local archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)               | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 4 after the recap lane; before terminal-status and the consolidation plan                                                           | pending |
| [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                     | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 5 after active-pointer and quick-resume                                                                                             | pending |
| [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                     | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 3 after the readiness lane (shared pins file); no longer waits on `oat config unset`                                                | pending |
| [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md)                         | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 3 first, after the skill-script lane; before the recap lane (shared pins file)                                                      | pending |
| [Populate provider reachability evidence across pack and lifecycle surfaces](./2026-09-03-populate-provider-reachability-evidence.md)                     | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                                            | pending |
| [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md)        | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                                            | pending |
| [Preserve `__proto__`-named config keys through JSON parsing](./2026-09-03-preserve-proto-named-config-keys.md)                                           | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                                            | pending |
| [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md)                                                | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | group 2 after the pr-final lane (shared version pins)                                                                                     | pending |
| [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md)                | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W5   | group 4 after the active-pointer lane (shared pins file) and the quick-route lane (`next` skill)                                          | pending |
| [Diagnose canonical skills missing from a provider view at resolution time](./2026-09-04-diagnose-canonical-skills-missing-from-provider-views.md)        | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | group 2 after the provider-reachability lane (shared `info-tool.ts`)                                                                      | pending |

## Program-wide integration rules

- Assume a concurrency ceiling of three implementation lanes. A numbered plan
  or row does not imply serial execution unless an ordering note says so.
- Create one wrapper OAT project and one integration PR per wave. Keep lane
  commits reviewable inside the wrapper branch and record all reconciliations in
  its orchestration log.
- Lockstep release files (the five public package manifests,
  `packages/cli/assets/public-package-versions.json`, and `pnpm-lock.yaml`)
  are owned exclusively by the wave fan-in step: no implementation lane edits
  them, so parallel lanes never share that write surface. PR-scoped skill
  `version:` bumps and their pins in `packages/cli/src/validation/skills.test.ts`
  stay in lane ownership.
- Three verification modes, so lane success and integrated release readiness
  are never confused (the execution skill requires integration gates after
  every group, and `tools/release/validate-public-packages.ts` rejects changed
  public packages whose lockstep versions did not move):
  - **Lane mode:** each lane runs its plan's focused tests plus `pnpm check`,
    `pnpm type-check`, and `pnpm run check:skill-bumps` (and `pnpm lint`,
    `pnpm format`, `pnpm oat:validate-skills` when it changes `.agents/skills`
    or `tools/smoke`). Lanes never run `pnpm release:check-versions` or
    `pnpm release:validate` and never edit lockstep release files.
  - **Group fan-in mode:** the fan-in owner establishes the wave's single
    lockstep bump above freshly fetched `origin/main` before the first group's
    integration gates, regenerates the version asset through the build, and
    retains that bump through later groups; then it runs the full
    definition-of-done sequence on the integrated wave branch after every
    group, to completion, before any group bookkeeping edit.
  - **Final-wave mode:** before the wave PR, fetch `origin/main` again,
    re-check that the retained bump is still strictly above main (advance it
    if main moved), and rerun the full sequence.
- Hidden shared write surfaces count when composing groups: the skill version
  pins in `packages/cli/src/validation/skills.test.ts` (every lane that bumps a
  pinned skill writes them), `review-skill-contracts.test.ts`, provider-sync
  outputs, and generated files. Compute intersections from implementation
  steps, test plans, and pins, not from Scope lists alone; at most one lane per
  parallel group may write each of those files.
- At every wave and group boundary, the drift refresh compares each plan's
  complete planned write set against the actual execution `HEAD` and the
  current head of draft PR #190 (`63161897dd4` as of 2026-09-05; 217 files),
  and records one SHA-bound result in the wrapper's Drift Refresh Record.
  Plan landing-event tables forecast which assumption to re-check; that record
  is the authoritative execution evidence.
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
  approval. The docs-index lane carries the 2026-09-05 output-safety fix
  (default output is `<documentation.root>/index.md`; generation never writes
  the scaffold's authored `docs/index.md` or `mkdocs.yml`) and the canonical
  docs-root meaning (app root, with `<root>/docs` precedence as compatibility
  behavior); the exclusion successor and the W5 instruction-sync lane inherit
  that meaning rather than deriving their own.
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
- **Cross-wave prerequisites:** W1 merged (PR #262, 2026-09-06) — satisfied. Revalidate the lifecycle corpus if
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
- **Cross-wave prerequisites:** W2 merged (PR #267, 2026-09-06) — satisfied. The smoke lane receives a dedicated
  ownership and deletion-safety review before integration.
- **Composition rationale:** The first two lanes have write-disjoint workflow
  policy and smoke-tooling surfaces. The authoring-policy lane is not product-
  blocked by them, but ordering it second reduces prose churn and lets its
  examples cite freshly delivered executable contracts.

## Wave 4: Delivered-project follow-ups

- **Parallel group 1:** Disable configured lifecycle gates per project; warn
  on every non-sync manifest version restamp.
- **Group 2:** Emit the dispatch stamp with resolver JSON, after the
  gate-override lane: both write `review-skill-contracts.test.ts` and the
  version pins in `validation/skills.test.ts` (regrouped 2026-09-05).
- **Cross-wave prerequisites:** W3 merged. The manifest-restamp and
  dispatch-stamp plans were refreshed and set `READY` on 2026-09-03 after
  PR #255 merged; re-anchor the gate-override plan's `oat-project-plan-writing` and
  `user-sync-config.ts` citations. Revalidate all three against live
  gate/status/dispatch surfaces because they follow freshly merged PRs #246,
  #249, and the truthfulness PR.
- **Composition rationale:** All three plans follow merged projects that own
  their surfaces. Their product surfaces (gate, status, dispatch) are
  independent, but the gate-override and dispatch-stamp lanes share two
  contract-test files, so they run in sequence; the gate-override lane also
  now owns the `oat-project-next` disposition consumer it previously omitted.

## Wave 5: Program-intake follow-ups

- **Parallel group 1:** Recover committed review artifacts after
  post-selection failures; keep instruction-sync pointers out of docs trees;
  route incomplete quick projects to quick-start.
- **Parallel group 2:** Retry gate project-log finalization across index
  locks (after group 1's gate plan); add `oat config unset` (after the
  instruction-sync plan so its family-coverage test includes the new
  `documentation.*` key); validate skill-to-script references.
- **Group 3 (sequential):** Enforce the external-plan readiness contract
  (after the skill-script lane, which shares a contract-test file), then make
  the autonomous recap capability-aware: both write
  `validation/skills.test.ts` (readiness adds contract cases and a pin; recap
  bumps two pinned skills). The recap lane no longer waits on `oat config
unset`; its optional seam keys live in `BL-260904-add-recap-seam-config-keys`.
- **Group 4 (sequential):** Defer activeProject clearing on archive
  completions, after the recap lane releases `oat-project-complete/SKILL.md`;
  then make terminal project status agree with completed revision plans,
  which now also edits `oat-project-next/SKILL.md` Step 5.2 and its pin (so it
  shares `validation/skills.test.ts` with the active-pointer lane and follows
  the group-1 quick-route lane on the `next` skill).
- **Group 5:** Make consolidated-project retirement semantic, after the
  active-pointer and quick-resume lanes; its sweep now runs before the
  project-log seal.
- **Cross-wave prerequisites:** W4 merged. Before dispatch, re-read every W5
  plan's `## Landing-event impact` table against the then-current state of
  `tool-pack-scope-provider-truthfulness` and PR #190 and apply the listed
  refreshes; the skill-script plan and the readiness plan re-anchor
  contract-test files the truthfulness merge rewrites.
- **Composition rationale:** Eleven lanes with five shared seams (the gate
  module; `OatDocumentationConfig`/`config/index.ts`; the completion skill,
  which three lanes edit in sequence; the `next` skill, which two lanes edit
  in sequence; and the skill contract-test files, above all the version pins
  in `validation/skills.test.ts`, which seven lanes write) arranged in five
  groups so each seam is touched by at most one lane at a time and the Wave 4
  index ordering (docs-index exclusions → instruction-sync → unset) is
  honored. Groups 3 and 4 are sequential pairs for that reason. The 2026-09-05
  review recommended splitting W5 after group 2; the operator kept one wrapper
  because every group ends in a full integration checkpoint and a split would
  renumber references across the corpus, indexes, and backlog links.

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
- **Composition rationale:** Three write-disjoint first-group lanes plus two
  ordered successors; the lanes share only the fan-in-owned lockstep files.
  Kept out of W5 because its five groups already allocate every contract-test
  seam.

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

- **2026-09-06 (W2 closed)** — Wave 2 executed as wrapper project
  `wave-2-execution` (five lanes, three groups, one lockstep bump to 0.2.57)
  and merged as PR #267 (`ca71c00a014a6eba00cb4cd4c46974fc6aa58139`). All five W2 rows flip to `done`. Review
  economics: every lane needed at least one fix round (p05 two, plus two
  post-PR rounds), two Criticals were introduced by fixes and caught by
  disposition-verification rounds, the root final review took three rounds,
  Cursor Bugbot found a High ordering defect in the recover-mode contract that
  every earlier round had missed, and the configured exit gate ran three times
  (pass → stale → blocked → pass). Rules adopted for later waves: the fan-in
  bump commit restamps `.oat/sync/manifest.json`; lane and reviewer briefs
  carry forced-turbo gate forms, the real package filter, the scratch-hygiene
  rule, and a two-round cap on Codex pre-commit reviews; disposition rounds
  execute prose shell snippets verbatim and walk every failure sequence of a
  contract; `oat gate review` writes its own Reviews row, so receive moves it
  forward in place. Plan corrections applied in this refresh (from
  `BL-260906-wave-2-external-plan`): the bundled-skill plan's step-2 wording
  and `analyze` pin; the named-skill plan's thirteen-skill list and two ripple
  tests; the patch-and-restore plan's conditional step 5; the anaphora plan's
  accepted anaphor-only shape. Follow-ups filed:
  `BL-260906-repair-the-stray-fence-in-oat`,
  `BL-260906-cover-skill-test-files-under`,
  `BL-260906-reconcile-the-oat-doctor`. W3 unblocked.
- **2026-09-06 (W1 closed)** — Wave 1 executed as wrapper project
  `wave-1-execution` (four lanes, two groups, one lockstep bump to 0.2.56) and
  merged as PR #262 (`6db0457c095e4384e5ac2f464ee1c4d5a47d0179`). Two of the four plans' rows flip to `done`
  together with their two ordered successors; both successors were flipped
  `BLOCKED → READY` inside the wave after their readiness checks. Wave
  learnings adopted as program rules: flip successor plans in the fan-in
  bookkeeping commit with cited evidence; address-now sweeps for Medium/Minor
  findings go through the original implementer handle; record lane-commit SHA
  mappings at every rebase; file the follow-up ledger as backlog items before
  the final gate. Plan corrections applied in the wave: the docs-index plan's
  config-write clause and its dependency row; the two successors' status
  callouts. Still queued: the exclusions plan's PR #190 landing row
  under-reports three shared files (moot once W1 merged; PR #190 must rebase
  onto the new `index-generate`, `oat-config.ts`, and docs pages). Follow-ups
  `BL-260906-guard-packed-asset-directories`,
  `BL-260906-report-errno-for-asset-root`, and
  `BL-260906-docs-index-follow-ups-from` are unplanned candidates. W2 unblocked.
- **2026-09-05 (Astra review)** — An independent GPT 6 Astra review (three
  luna and one terra subagents) of all 31 plans at `6d5c11243` returned 3
  Critical, 19 Important, and 9 Medium findings; all were accepted except the
  W5 wave split (declined, see the W5 rationale) and the W2 repair split
  (recorded as an explicit policy exception). Corpus-wide: lane instructions
  that still bumped the five packages or ran release gates were replaced by
  the lane/fan-in/final verification modes above; the version-pin file
  `validation/skills.test.ts` was recognized as a hidden shared write and W4
  and W5 groups 3–4 were resequenced; PR #190 landing rows that claimed "No"
  for files the draft actually touches (my earlier file list stopped at 100 of 217) were corrected. Substantive: docs-index generation no longer defaults
  its output to the scaffold's authored `docs/index.md` or `mkdocs.yml`; the
  patch-and-restore recipe fails closed on unsupported dirt and captures
  binary-safe state; the retirement sweep moved before the project-log seal;
  the gate-override, terminal-status, and quick-route plans now own their
  `oat-project-next` consumers; the recap preflight includes the set planner;
  the active-pointer resume is narrowed to post-archive receipt failure; the
  readiness validator gains legacy-read mode and inspected-HEAD provenance;
  the metadata-version plan drops its false parser-reuse premise and the
  `check:skill-bumps` severity conflict. Review record with dispositions:
  `.oat/repo/reference/reviews/2026-09-05-external-plan-review-astra.md`.

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
