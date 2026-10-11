# Project Observations

## Entries

### 2026-07-18 · general · friction · same-worktree dispatch logging

Promoted from . Reusable lesson: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-18 · general · friction · same-worktree dispatch ownership

Correction to `### 2026-07-18 · general · friction · same-worktree dispatch logging`, whose source heading was dropped by shell quoting. Promoted from `### 2026-07-18 · project · friction · same-worktree dispatch logging`: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-19 · general · feedback · Cursor parent-inline fallback

Promoted from "### 2026-07-19 · project · feedback · Cursor parent-inline fallback" because the behavior applies to any Cursor review using nested reconnaissance: delegate mechanical lanes only when advertised capability satisfies the floor, and keep stronger unsatisfied lanes with the primary reviewer instead of downgrading.

### 2026-07-24 · general · friction · Concurrent asset generation during verification

Running repository formatting concurrently with the full CLI suite caused a transient scaffold-test failure while the asset bundler rewrote assets/templates/state.md. Isolating the full-suite rerun after asset generation completed produced a clean pass; verification lanes that mutate bundled assets should not overlap readers. (observed on OAT 0.2.14)

### 2026-07-29 · general · friction · Generated autonomy inventory coupling

Promotes the original entry "2026-07-28 · project · friction · Phase 3 autonomy inventory boundary": prompt-path edits that change autonomy gates must preserve or regenerate the associated inventory evidence, with focused inventory tests run before cleanup.

### 2026-08-07 · general · bug · configured post-implementation sequence was skipped

Promotes : configured closeout must persist its sequence snapshot and fail closed until ordered children are durably complete; the dedicated backlog item remains the implementation follow-up. (observed on OAT CLI 0.2.30)

### 2026-08-07 · general · bug · configured closeout promotion correction

Correction to "### 2026-08-07 · general · bug · configured post-implementation sequence was skipped", whose source heading was dropped during command serialization. Promoted from "### 2026-08-06 · project · bug · configured post-implementation sequence was skipped": configured closeout must persist its sequence snapshot and fail closed until ordered children are durably complete; the dedicated backlog item remains the implementation follow-up. (observed on OAT CLI 0.2.30)

### 2026-08-26 · general · friction · gate exec-target selection

Observation: the configured plan gate selected cursor-gpt-5-6-sol-xhigh twice while cursor-agent rejected launches with a team usage-limit error; the availability probe (cursor-agent --version) kept passing and the gate has no post-selection fallback. Impact: the whole wave blocked at a quota boundary until the operator raised the limit. Recommendation: probe entitlement or fall through to the next target on a pre-child provider rejection; classify pre-child rejections as launch defects (see orchestration-log.md). (observed on oat 0.2.32)

### 2026-08-26 · general · friction · release gate vs test-only changes

Observation: files under packages/cli/src/**/\*.test.ts count as publishable changes (versionPolicyIgnorePatterns is only assets/**), so a test-only lane forced a five-package lockstep bump (Recovery Event p02-rec-001). Impact: root-owned wave-level bump 0.2.32 to 0.2.33 after fan-in. Recommendation: drift refresh should intersect lane write surfaces with the release change-detection roots and plan the bump up front; decide separately whether test paths should be version-policy-ignored. (observed on oat 0.2.32)

### 2026-08-26 · general · worked-well · reviewer-designed adversarial probes

Observation: the p01 Important (post-detach unsettleable reap) and a round-2 Medium (reorder mutation) were found only by reviewer probes and mutation runs; every implementer gate, pinned test, and codex pass was green. Impact: two cheap fix rounds, no defect shipped. Recommendation: keep the mandatory reviewer-designed probe for logic-bearing lanes and require delete- and reorder-class mutations for ordering/containment claims.

### 2026-08-26 · general · bug · orchestrator cwd drift

Observation: a compound cd into a phase worktree persisted across orchestrator shell calls, so one root bookkeeping commit landed on the phase branch. Impact: repaired by cherry-pick plus reset of the unreviewed misplaced commit; reviewed SHAs untouched. Recommendation: every root command uses absolute paths or git -C; generalize the wave skill's absolute-path merge guard to all root commands.

### 2026-08-26 · general · friction · deterministic smoke tier in linked worktrees

Observation: the exit-gate reviewer's pnpm test failed once in tools/smoke/deterministic (git worktree add collided in the shared git dir), passed on isolated rerun, and leaked run-scoped smoke-automated worktrees and branches. Impact: root cleanup of the leaked refs; no wave code involved. Recommendation: the deterministic tier should namespace or clean its worktrees on failure and tolerate concurrent runs in linked worktrees.

### 2026-08-26 · general · feedback · closeout ordering

Observation: wave-2 archived its backlog item before summary.md existed, contradicting the wrapper plan's strictly ordered Implementation Complete checklist (synthesis + summary roll-up before archival). Impact: a final-review Medium and a recorded deviation; no data loss. Recommendation: generate summary.md immediately after the orchestration-log synthesis and before oat backlog archive; add this to the wave skill's closeout sequence wording.

### 2026-08-31 · general · feedback · HiLL checkpoint phase timing

The implement workflow misread oat_hill_checkpoints: [p04] as a gate before p04 and paused before the final phase. The intended contract is that a phase-listed HiLL checkpoint is evaluated after that phase completes. Strengthen the skill, template comments, and user-facing prose to say explicitly that pNN means after pNN, not before it. (observed on Observed on OAT 0.2.50)

### 2026-08-31 · general · feedback · HiLL checkpoint timing correction

Correction to the immediately preceding HiLL checkpoint phase timing entry: the intended observed version is OAT 0.2.50; the CLI rendered the supplied version-note prefix redundantly. The checkpoint-timing recommendation is unchanged.

### 2026-09-06 · general · friction · wave wrapper slug and branch collision

The oat-wave-execute fixed wave-N-execution slug and branch collided with the archived 2026-08 program wrapper and its stale remote branch; the wave kept the local name and pushed to origin/wave-1-execution-2026-09, deferring the archive-name collision to program close. The skill should qualify the slug or branch by program, or check archived wrappers and remote branches in preflight. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · duplicate orchestrator after session restart

A session restart left the prior orchestrator instance alive on the same worktree, which scaffolded a second wrapper directory before standing down. Check ListAgents for a busy peer on the same path before scaffolding; the skill has no claim-the-tree step. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · reviewer reconnaissance signal placement

A reviewer put the mandatory Reconnaissance signal in its chat reply rather than the artifact; the root validates the file, so the round was recovered through the accepted handle. Reviewer briefs should state that the line is validated in the artifact. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · dispatch journal cannot close out child outcome

oat project dispatch record rejects a revision that changes child_outcome (generic fields are immutable), so a record written at acceptance never carries the terminal outcome; outcomes were recorded in implementation.md instead. Consider a terminal event kind or an outcome revision. (observed on oat 0.2.55)

### 2026-10-11 · general · friction · reviewer child terminated by gateway 503 before artifact

The round-2 p01 reviewer (accepted native launch) was terminated by a transient inference-gateway HTTP 503 before writing anything. Continued through the same accepted handle rather than launching a replacement; the continuation completed normally. Key p01-review2-503-continuation.

### 2026-10-11 · general · friction · reviewer resolver refuses candidate overrides under a capped policy

Operator asked for Opus 5.5 high subagents under a frontier ceiling; dispatch-ceiling resolve rejects --candidate-model for the reviewer role, so root-owned phase reviewers run the cap (claude-fable-5-1/high) while implementers run Opus 5.5 high via the exact-candidate branch. Recorded as a run deviation rather than lowering the ceiling. Key p01-reviewer-cap-deviation.

### 2026-10-11 · general · friction · disk full during parallel-group fan-in

Three concurrent lane worktrees with full installs and builds filled the volume (118 MiB free) and the first integration build died with disk I/O error. Removing the merged worktrees and pruning the pnpm store recovered 3.6 GB; group 2 needs more headroom before bootstrapping three lanes. Key group1-disk-full-97d8f986f0f13c7334746b4bd0ec871057c7848d.

### 2026-10-11 · general · friction · parallel group degraded to sequential: insufficient disk

Group 2 [p05,p06,p07] bootstrap preflight failed closed on free space (3.3 GB free, ~5 GB needed for three lanes). Degraded to sequential target-preserving execution in the root checkout; no worktree was created. Key group2-degrade-insufficient-disk.

### 2026-10-11 · general · friction · isolated-HOME temp growth fills the volume

Each HOME=$(mktemp -d) vitest run leaves about 48 MB of cache under $TMPDIR; 87 such dirs (3.3 GB) brought the volume to 370 MiB free mid-group-2. Swept 71 stale ones; later briefs mandate one fake HOME per run. Candidate guidance for the implement skill and AGENTS.md. Key friction-isolated-home-tmp-growth.

### 2026-10-11 · general · friction · disk space pause

p10 paused after p10-t01 (97f2f1a32): free space fell to 558 MB against the 650 MB stop rule. The p10-t02 working tree is parked as references/p10-t02-recovered.patch. Growth sources are outside the pre-authorized cleanup set (~/.t3/userdata/statev2.sqlite 3.5 GB, ~/.t3/worktrees 8.8 GB, ~/.codex/sessions 6.4 GB, ~/.cache/codex-runtimes 1.5 GB). Resume p10 from p10-t02 once about 1.5 GB is free. Key p10-paused-disk.

### 2026-10-11 · general · friction · review-cap p12

p12 reached the three-round review cap with a one-clause prose residual (goal terminal deferral condition). Disposition: fix as p12-t08, root-verified; the final integrated review over the whole branch is the independent check instead of a fourth p12 round.

### 2026-10-11 · general · friction · review-cap final

The final integrated review reached three rounds; each fix to the delivery-evidence evaluator surfaced an adjacent bypass (same-artifact rebind, set-once member revisions, own-artifact set from the judged state). Disposition: a known evaluator bypass cannot ship, so one more narrow fix (p12-t11, reviewer-verified counterfactual) and a round 4 limited to that guard; lesson for artifact-cleanup and future evaluators: derive trust sets from immutable records (Reviews rows), never from the state being judged.
