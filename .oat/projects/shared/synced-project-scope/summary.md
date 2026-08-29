---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: true
oat_summary_last_task: p20-t07
oat_summary_revision_count: 1
oat_summary_includes_revisions: [p-rev1]
---

# Summary: synced-project-scope

## Overview

OAT project artifacts must travel across sessions, worktrees, and machines without placing agent-facing lifecycle prose on feature branches or `main`. This project delivered a Git-native `synced` scope: artifacts live on retained custom refs, each worktree receives an isolated detached checkout, and selected reviewer-facing files remain accessible through immutable links.

## What Was Implemented

- Phases 1–12 established the synced ref/check-out/record model; scope-aware CLI lifecycle; reviewer links; completion, archive, migration, and prune recovery; skill bookkeeping contracts; documentation; and publication-receipt validation.
- Phase 13 hardened post-PR-merge rollback ownership, archive/completion identity and receipts, pull conflict continuation, cross-scope isolation, stale registrations, doctor diagnostics, and optional-log sealing.
- Phase 14 closed full-integration safety gaps across canonical paths, migration/prune leases, review evidence, configuration, provider assets, packaging, and release contracts.
- Phase 15 strengthened cross-scope Git behavior, deterministic recovery and validation inventories, project listing, pause/pull flows, and full-range compatibility discovered by independent review.
- Phases 16–17 completed archive/config/autonomy safety, lifecycle durability, provider-view parity, invalid-record diagnostics, custom-root ignores, locale and environment isolation, command parsing, scaffold guards, and decoupled release tests through `p17-t14`.
- Phase 18 corrected the remote-review regression that could run the final synced-project publication against an already archived project path; its independent phase review passed.
- Phase 19 final-review remediation requires exact archive-root identity in dry-run and apply, protects marker-bearing and damaged registered worktrees during local sync, rejects external synced roots before mutation, recovers a failed final prune commit through an exact-path retry that fails closed on remote lookup errors, and binds archive retries to the authoritative source ref. Its documentation tasks align the archive identity contract and keep closeout prose independent of review-cycle routing; `p19-t13` restores configured local-path sync between linked worktrees nested below their main checkout without weakening protection for other registrations.
- Phase 20 converted remote Bugbot findings on PR #227 into seven tasks: default local completion archive decisions, pull-before-completion reads, full-checkout dirty preflight for brainstorm fold-back, fail-closed autonomous pull, pin-source completion retry recognition, branch-only archive prompting, and a dirty fold-back publication proof. Independent Phase 20 review passed after two fix tasks. All 199 planned tasks are complete.

## Key Decisions

- **Retained custom refs and per-worktree checkouts.** `refs/oat/projects/<slug>` keeps project history outside branch/CI namespaces while detached per-worktree checkouts preserve ordinary Git conflict and isolation boundaries.
- **Small discovery records and a configurable synced default.** Validated branch-local JSON records make custom refs discoverable without a shared index hotspot; remote enumeration/adoption handles recordless refs, and explicit `shared`/`local` remain supported.
- **Fail-closed mutation and publication contracts.** Canonical identity, exact parent pathspecs, leased deletion/rollback, non-forced publication, pinned reviewer links, and validated receipts make ambiguous archive, migration, prune, pause, and completion states recoverable rather than silently accepted.

## Design Deltas

- Self-migration moved from mid-implementation to post-closeout so the running workflow could first ship and use safe scope-aware bookkeeping; scratch projects supplied interim synced-scope dogfood.
- Revision `p-rev1` merged upstream PR #226 into PR #227 at `17c3b80d`, preserving both projects' skill, PJM, validation, sync, and release behavior. Review replaced opaque merge evidence with reproducible tree/path equality and passed the integration with no blocking finding.
- Upstream PR #229 was merged before the final remediation cycle and the full workspace test suite passed on the integrated branch. Phase 19 then converted the newest full-range review findings into bounded destructive-path and retry corrections.
- Upstream PR #231 was merged during Phase 20 closeout. Public packages stayed at lockstep `0.2.45`; overlapping skill versions settled at `1.1.1` / `1.5.1` / `1.2.1`.
- The configured exit-gate review found `design.md` still documenting checkout-first prune order. The shipped engine deletes the remote ref first and resumes staged record deletion when both refs are already gone; the design bullet was aligned and implementation remains source of truth.

## Notable Challenges

- Independent phase/full-range reviews repeatedly exposed subtle Git ownership, archive/migration retry, receipt, path, packaging, and provider-parity defects. Phases 13–17 used bounded append-only recovery with settled usage of 2/10, 1/10, 2/10, 4/10, and 1/10 respectively; no marker remains pending.
- Earlier full-range reviews exposed the path, recovery, and linked-worktree defects corrected through `p19-t13`. The final p19-t13 review passed at 0/0/0/0, and the refreshed configured exit gate passed on its second attempt with no Critical, Important, or Medium findings. The maintainer waived only the additional documentation-only re-review for `p19-t11` and `p19-t12`; the later code correction still received its own narrow review.

## Integration Notes

- The five lockstep public packages and shipped CLI asset remain aligned at `0.2.45`. After Phase 20, the complete Definition-of-Done, skill/version, release, and docs gates passed in exact CI order; lint and format also passed. A later guided-setup harness mock unblocked CI `ENOENT` on a fake `/tmp/workspace` `.gitattributes` write.

## Revision History

- **p-rev1 — PR #226 integration (2026-08-28).** Merged current `origin/main` into PR #227, reconciled overlapping assets and contracts, passed focused and full isolated-environment verification, and received an independent passing integration review.
- **Phase 18 and Phase 19 closeout remediation (2026-08-29).** Phase 18 passed after correcting post-archive publication routing. After upstream PR #229 merged, a fresh full-range review produced five behavioral and two artifact findings; Phase 19 implemented those corrections, three independently reproduced fix-cycle residuals, archive-identity and closeout-prose alignment, and the configured-gate linked-worktree compatibility correction through `p19-t13`.
- **Phase 20 and PR #231 integration (2026-08-29).** Remote Bugbot findings became seven bounded tasks; Phase 20 review passed. PR #231 merged at `b7dc3b06e`. The configured `cursor-fable-5-high` exit gate passed (0/0/0/2); both minors were addressed in receive. The maintainer waived a second gate after the test-only CI harness mock.

## Follow-up Items

- Accepted post-release cleanup: avoid timestamp-only duplicate pause commits; enforce rather than merely advise the partial-prune no-republish rule; unify invalid-config exit-code policy; strengthen provider parity at the codec level; audit direct Git calls outside `GitRunner`; and extend custom-root archive ignores beyond synced scope.
- Managed-block compatibility still merits fixtures for legacy two-header damage, stray/mid-line/CRLF markers, plus consolidation of duplicate restore guidance. Self-migration to `synced` and deletion of the disposable GitHub spike repository remain separately controlled closeout actions.
- PR #227 remains open for review. Deferred nonblocking cleanup includes consolidating remote-ref absence checks, reordering the staged-prune network lookup, and rejecting absolute or parent-traversing values in self-authored `localPaths`; none is required for the current gate threshold. Self-migration to `synced` and deletion of the disposable spike repository remain separately controlled.

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

### 2026-08-28 · structural · oat-project-implement · p-rev1

Phase p-rev1 passed after merge task prev1-t01 and independent review; review artifact reviews/archived/p-rev1-review-2026-08-28T220327Z.md reports 0 Critical, 0 Important, 0 Medium, and 1 Minor finding with reviewer reconnaissance attempted.

### 2026-08-28 · structural · oat-project-review-provide · reviews/final-review-2026-08-28T222140Z.md

Fresh final code review completed with reconnaissance attempted; see the review artifact for 2 Critical, 8 Important, and 1 Minor finding.

### 2026-08-28 · structural · oat gate review · p13

target=claude-fable-skip-permissions threshold=medium findings=critical:0,important:1,medium:1,minor:3 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/p13-review-2026-08-28T233340Z.md

### 2026-08-29 · structural · oat gate review · p13

target=claude-fable-skip-permissions threshold=medium findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/synced-project-scope/reviews/p13-review-2026-08-29T000209Z.md

### 2026-08-29 · structural · oat-project-review-provide · reviews/final-review-2026-08-29T002706Z.md

Fresh gate-originated final code review completed with reconnaissance attempted (two waves, four read-only lanes); see the review artifact for 0 Critical, 2 Important, 4 Medium, and 13 Minor findings.

### 2026-08-29 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=medium findings=critical:0,important:2,medium:4,minor:13 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T002706Z.md

### 2026-08-29 · structural · oat-project-review-provide · reviews/final-review-2026-08-29T051437Z.md

Fresh full-range final gate review at head d1867ee31cc8b6cf01a745c2351cde6470170557 (8cc1b3827..d1867ee31, reconnaissance attempted, 4 read-only lanes): 0 critical, 3 important, 2 medium, 14 minor; artifact .oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T051437Z.md

### 2026-08-29 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:3,medium:2,minor:14 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T051437Z.md

### 2026-08-29 · structural · oat-project-review-provide · reviews/final-review-2026-08-29T063413Z.md

Fresh full-range final gate review at head 26f53309caca8e6360cdb24b8d1778e115a8b5e8 (8cc1b3827..26f53309c, reconnaissance attempted, 4 read-only lanes, 11 CLI reproductions): 0 critical, 3 important, 3 medium, 14 minor; artifact .oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T063413Z.md

### 2026-08-29 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:3,medium:3,minor:14 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T063413Z.md

### 2026-08-29 · structural · oat-project-review-provide · reviews/final-review-2026-08-29T083908Z.md

Fresh full-range final gate review at head 4b8c598623f184b75b7de9bdfa69b3b4592539da (8cc1b3827..4b8c59862, reconnaissance attempted, 2 read-only lanes, 6 CLI reproduction fixtures): 0 critical, 1 important, 2 medium, 11 minor; artifact .oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T083908Z.md

### 2026-08-29 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:2,minor:11 exit=1 status=blocked artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T083908Z.md

### 2026-08-29 · structural · oat-project-review-provide · reviews/final-review-2026-08-29T092432Z.md

Fresh full-range final gate review at head d40bbe3238e1653edc92e6e763ef16c76c2ba57a (8cc1b3827..d40bbe323, reconnaissance attempted, 2 read-only lanes, 7 CLI reproduction fixtures): 0 critical, 0 important, 1 medium, 9 minor; artifact .oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T092432Z.md

### 2026-08-29 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:1,minor:9 exit=0 status=ok artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T092432Z.md

### 2026-08-29 · structural · oat-project-implement · refreshed-exit-gate

Initialized a fresh pending configured-gate generation from accepted
post-sweep head b51385c2 with qualified effective-delta fingerprint 125d960f,
attempts_completed=0/2, and launch_state=not_started.

### 2026-08-29 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:5 exit=0 status=ok artifact=.oat/projects/shared/synced-project-scope/reviews/final-review-2026-08-29T094230Z.md

### 2026-08-29 · structural · oat-project-review-provide · final-review-2026-08-29T134331Z

Independent final review used two consequential reconnaissance lanes; see reviews/final-review-2026-08-29T134331Z.md.
