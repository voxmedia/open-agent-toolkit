---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-28
oat_generated: true
oat_summary_last_task: p12-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: synced-project-scope

## Overview

OAT project artifacts need to travel across sessions, worktrees, and machines, but storing them on a feature branch made human and automated reviews consume large volumes of agent-facing lifecycle prose and left that prose on `main`. This project introduced a Git-native `synced` scope that versions artifacts outside the branch namespace while keeping selected reviewer-facing artifacts available through immutable links.

## What Was Implemented

- Added the `synced` project scope using retained custom refs, ignored detached checkouts, and small tracked discovery records; delivered scope-aware creation, push/pull, remote adoption, coordination pulls, listing, migration, prune, archive, links, doctor, open, and pause behavior.
- Added fail-closed Git plumbing around canonical identity, exact path boundaries, non-forced publication, isolated child failures, retryable lifecycle transitions, index leak detection, pinned reviewer links, and exact completion-receipt recovery.
- Updated lifecycle skills and agents to pull before reading and push after writes, backed by a checked-in bookkeeping inventory; documented the three-scope cross-machine, worktree, reviewer, migration, and completion workflows.
- Verified the result through source-built Git and lifecycle-skill dogfood, cross-worktree round trips, GitHub custom-ref testing, archive/prune cleanup, completion transaction matrices, repeated independent reviews, and the CI-order Definition of Done gates.

## Key Decisions

- **Custom project refs.** Branch commits could not satisfy the requirement to keep artifact prose out of PRs and `main`, while S3 would add credentials and weaken history and conflict handling. Each synced project therefore publishes a linear history to `refs/oat/projects/<slug>`, preserving Git as the sole in-flight transport without creating a branch-list or CI footprint.
- **Configurable synced default.** Cross-machine continuity was the main reason projects used `shared`, but `shared` necessarily exposes artifacts on the work branch. New projects default to `synced` through `projects.defaultScope`, while explicit `shared` and `local` choices preserve their established storage contracts.
- **Per-worktree detached checkouts.** A single shared artifact checkout would let concurrent agents overwrite live files without Git conflict boundaries. Each parent worktree instead materializes its own detached project checkout and reconciles through the remote ref, trading extra pull/push discipline for isolation and ordinary rebase conflicts.
- **Per-project discovery records.** Custom refs are not fetched by ordinary clones and may exist before their originating branch merges. A small validated JSON record provides branch-local discovery without artifact prose or a shared index merge hotspot, while remote ref enumeration and adoption cover recordless projects.
- **Fail-closed sync mutations.** Ref sync, migration, archive, prune, and completion touch both nested project history and limited parent-branch state. The implementation validates canonical slug/path/ref identity, confines parent commits to explicit paths, never force-pushes, preserves unrelated staged state, and treats invalid or ambiguous receipts as non-published.
- **Published-state reviewer links.** Reviewers need access to discovery, design, and summary without exposing machine-only artifacts. PR links are generated from the published ref SHA and a fixed allowlist, refreshed inside a delimited block, and retain the ref copy as canonical even when a durable summary export is added.
- **Retained refs and receipts.** Deleting a project ref at completion would break pinned review links, while retrying multi-step completion without durable identity could duplicate or misattribute output. Refs are retained by default, and completion recovery validates the exact project, repository, ref, pin SHA, final artifact receipt, and recap evidence chain before resuming.

## Design Deltas

- Self-migration of this active project was moved from the middle of implementation to after implementation closeout. The scope-aware bookkeeping skills had to ship first so the running workflow could persist later lifecycle updates safely; scratch projects provided the planned synced-scope dogfood in the interim. This was a sequencing change only, not a behavioral change to the final design.
- Upstream integration evidence changed from an opaque merge digest to reproducible per-path Git tree equality after review showed that the original proof was not independently inspectable. The merged implementation remained unchanged; only the evidence contract became stronger.

## Notable Challenges

- GitHub behavior for custom refs required a real external spike. The same commit was shown to trigger an unfiltered workflow when pushed as a branch but not when pushed only to `refs/oat/*`; authenticated blob rendering and branch-list invisibility were also verified before the scratch refs were removed.
- Nested worktree operations exposed inherited hook and test-fixture assumptions. Bounded recovery attempts repaired empty-ref materialization, synced lifecycle hook handling, stale fixtures, and load-sensitive Git tests while restoring failed candidates before retrying.
- Independent phase, final, and configured exit-gate reviews repeatedly found subtle safety gaps in canonical identity, archive/migration retryability, receipt publication, exact-link validation, and lifecycle routing. The project grew from four planned phases to twelve implementation phases and closed all blocking findings before closeout.
- Two Phase 12 full-test attempts failed at different fixed-timeout targets. Both exact targets and a fresh full suite passed at the unchanged task head, distinguishing transient load failures from a product regression without consuming a recovery mutation.

## Follow-up Items

- Migrate this project itself from `shared` to `synced` after closeout, when the active lifecycle no longer depends on the tracked artifact directory.
- Remove redundant inner synced-scope tests when `oat-project-next` or `oat-project-progress` next receives a functional edit.
- Consolidate the duplicated completion-router `SKIPPED_MUTATIONS` list if that mutation contract changes or the router/decoder modules are reorganized.
- Evaluate compatibility and deprecation before removing the unused `--detect-candidate` completion-recovery CLI branch.
- Delete the disposable GitHub spike repository only through the separate operator-controlled cleanup step.

## Workflow Observations

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T013313Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:2,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T014220Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:1,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T015823Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:1,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T022840Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T025742Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:2,important:4,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T031106Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:2,important:1,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T032056Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:1,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T033204Z.md

### 2026-08-27 · structural · oat-project-implement · p01

status=parked verdict=needs-context tasks=9/10 fix-loops=0 trigger=p01-t10-private-blob-browser-confirmation artifact=.oat/projects/shared/synced-project-scope/implementation.md#run-1 scratch-ref-preserved=true

### 2026-08-27 · structural · oat-project-implement · p01

status=passed verdict=pass tasks=10/10 fix-loops=1 implementation-head=60787fce522cb9685d7076b56a0862296ffd82c4 review-artifact=.oat/projects/shared/synced-project-scope/reviews/code-p01-review-2026-08-27T062203Z.md findings=critical:0,important:0,medium:1,minor:1

### 2026-08-27 · structural · oat-project-implement · p02

status=blocked verdict=retry-exhausted tasks=11/11 fix-loops=2/2 recovery=1/10 reviewed-head=00c9f24efb6b4a5fd4aaaadd40765853377c9b27 artifact=.oat/projects/shared/synced-project-scope/reviews/code-p02-review-2026-08-27T081844Z.md findings=critical:0,important:2,medium:0,minor:0 phase3-started=false

### 2026-08-27 · structural · oat-project-implement · p02

status=blocked verdict=operator-extension-exhausted tasks=11/11 fix-loops=3/3 recovery=1/10 reviewed-head=7c8ee775bb12a24346927819de70cd0ff648350a artifact=.oat/projects/shared/synced-project-scope/reviews/code-p02-review-2026-08-27T124656Z.md findings=critical:0,important:2,medium:1,minor:0 phase3-started=false

### 2026-08-27 · structural · oat-project-implement · p02

status=blocked verdict=operator-extension-exhausted tasks=11/11 fix-loops=4/4 recovery=1/10 reviewed-head=7a03f675a74fbf687b75ae17e8205167d9899345 artifact=.oat/projects/shared/synced-project-scope/reviews/code-p02-review-2026-08-27T132942Z.md findings=critical:0,important:1,medium:0,minor:0 phase3-started=false

### 2026-08-27 · structural · oat-project-implement · p02

status=blocked verdict=maximum-exhausted-plan-revision-required tasks=11/11 fix-loops=5/5 recovery=1/10 reviewed-head=fc14f074f1b7289bdf3c974999664c5c58899f60 artifact=.oat/projects/shared/synced-project-scope/reviews/code-p02-review-2026-08-27T153712Z.md findings=critical:0,important:1,medium:0,minor:0 phase3-started=false

### 2026-08-27 · structural · oat-project-implement · p02

status=blocked verdict=post-revision-review-direction-required tasks=12/12 fix-loops=5/5 planned-revisions=1 recovery=1/10 reviewed-head=9eff5ceef77a1716c2a56d1a594e707b263ea803 artifact=.oat/projects/shared/synced-project-scope/reviews/code-p02-review-2026-08-27T160020Z.md findings=critical:0,important:1,medium:1,minor:0 phase3-started=false

### 2026-08-27 · structural · oat-project-implement · p02

Phase 2 passed after p02-t13 task-delta review at reviews/code-p02-t13-review-2026-08-27T173345Z.md; 0 Critical, 0 Important, 0 Medium, 0 Minor; full-phase review loop was not restarted.

### 2026-08-27 · structural · oat-project-implement · p03-t10

Phase 3 stopped after recovery attempt 2/10 failed phase verification: bounded hook fix passed 49 focused tests but unrelated fixed-timeout integration failures differed across the full CLI run and allowed no-edit rerun; code was restored, only failed ledger evidence 5f686127 was committed, and dogfood remains incomplete.

### 2026-08-28 · structural · oat-project-implement · p07

Phase 7 completed p07-t01 at 5040b62f7; tasks=1/1 recovery=0/10 gates=pass review-status=fixes_completed awaiting-fresh-final-review=true.

### 2026-08-28 · structural · oat-project-implement · p08

Phase 8 completed p08-t01 at a1f0c8941; tasks=1/1 recovery=0/10 gates=pass review-status=fixes_completed awaiting-fresh-final-review=true dispatch=dispatch-synced-project-scope-p08-20260828T1435Z target=oat-phase-implementer-gpt-5-6-sol-high.

### 2026-08-28 · structural · oat-project-review-provide · final

Cycle-5 final re-review at reviews/final-review-2026-08-28T151732Z.md reviewed head 10bbd92cee2291aebf027e5c6e7ac69da2bc4f2b and found 1 Critical, 1 Important, 0 Medium, 0 Minor; verdict changes required.

### 2026-08-28 · structural · oat-project-implement · p09

Phase 9 completed p09-t01 at e193c8ffb; tasks=1/1 total=71/71 recovery=0/10 gates=pass review-status=fixes_completed awaiting-fresh-final-review=true request=p09-implementation-20260828-cycle5-fix target=oat-phase-implementer-gpt-5-6-sol-high.

### 2026-08-28 · structural · oat-project-review-provide · final

Gate final code review with one bounded reconnaissance wave (3 intelligent-recon lanes, target opus, floor satisfied); artifact reviews/final-review-2026-08-28T174039Z.md

### 2026-08-28 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:3,medium:5,minor:5 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-28T174039Z.md

### 2026-08-28 · structural · oat-project-implement · p10

Phase 10 completed p10-t01 through p10-t14 at 3a6c835de; tasks=14/14 total=85/85 recovery=0/10 gates=pass review-status=fixes_completed awaiting-fresh-final-review=true awaiting-exit-gate-attempt=2 request=p10-implementation-20260828-exit-gate-attempt1-remediation target=oat-phase-implementer-gpt-5-6-sol-high.

### 2026-08-28 · structural · oat-project-review-provide · final

Auto final lifecycle review with two bounded reconnaissance lanes; artifact reviews/final-review-2026-08-28T182836Z.md

### 2026-08-28 · structural · oat-project-implement · p11

Phase 11 completed p11-t01 through p11-t03 at 1a8e36fe2; tasks=3/3 total=88/88 recovery=0/10 gates=pass review-status=fixes_completed awaiting-narrowed-final-review=true awaiting-exit-gate-attempt=2 request=p11-implementation-20260828-exit-gate-verification-fixes target=oat-phase-implementer-gpt-5-6-sol-high.

### 2026-08-28 · structural · oat-project-review-provide · final

Auto final lifecycle review at head 07caa73e3; no reconnaissance lanes were dispatched; artifact reviews/final-review-2026-08-28T190306Z.md found 1 Critical normal-route publication regression and blocked exit-gate attempt 2.

### 2026-08-28 · structural · oat-project-review-receive · final

Received reviews/archived/final-review-2026-08-28T190306Z.md and converted its 1 Critical finding into p12-t01 with no deferrals; exit-gate attempt 2 remains unlaunched.

### 2026-08-28 · structural · oat-project-implement · p12

Phase 12 completed p12-t01 at a8f2e678c; tasks=1/1 total=89/89 recovery=0/10 gates=pass review-status=fixes_completed awaiting-narrowed-final-review=true awaiting-exit-gate-attempt=2 target=oat-phase-implementer-gpt-5-6-sol-high. Initial full test and its no-edit rerun failed at different transient targets; root verified both exact targets and one fresh full test at the unchanged head, all exit 0.

### 2026-08-28 · structural · oat-project-review-provide · final

Auto final lifecycle re-review at head a521db33c; no reconnaissance lanes were dispatched; artifact reviews/final-review-2026-08-28T192913Z.md passed with 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.

### 2026-08-28 · structural · oat-project-review-receive · final

Received reviews/archived/final-review-2026-08-28T192913Z.md as passed at head a521db33c with no findings or deferrals; configured exit-gate attempt 2 remains unlaunched.

### 2026-08-28 · structural · oat-project-implement · exit-gate-attempt-2

Initialized a fresh pending configured-gate generation from reviewed head a521db33c with qualified effective-delta fingerprint a8edabb3 and preserved attempts_completed=1/2; launch_state=not_started.

Persisted configured-gate attempt-2 launch intent bf9e75b6-65e5-4edd-a289-5e7b8ab485fd before external execution; receipt=reviews/implement-exit-gate-result-bf9e75b6-65e5-4edd-a289-5e7b8ab485fd.json.

Accepted gate run 3241d71c-b67e-4a04-88f2-4a9965de3395 on target claude-fable-skip-permissions; unique marker matched project=shared/synced-project-scope scope=final type=code.

### 2026-08-28 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:3 exit=0 status=ok artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-28T194740Z.md

### 2026-08-28 · structural · oat-project-review-receive · final

Passing-gate judgment sweep archived final-review-2026-08-28T194740Z.md, marked the gate review passed, and explicitly deferred all 3 Minor cleanup findings with concrete follow-up triggers; no fix task or implementation change was added.

Reconciled receive commit e095995d4 against gate run 3241d71c-b67e-4a04-88f2-4a9965de3395; configured exit gate is allowed/passed and no further attempt is required.
