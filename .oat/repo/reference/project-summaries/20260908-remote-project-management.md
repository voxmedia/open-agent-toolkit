---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-08
oat_generated: true
oat_summary_last_task: p09-t04
oat_summary_revision_count: 3
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3]
---

# Summary: Remote Project Management

## Overview

This project added deliberate, local-first integration between OAT PJM and
GitHub Issues, Linear, and Jira Cloud. It preserves the local backlog and
project artifacts as the complete offline-capable working surface while making
remote reads and mutations explicit, independently governed per binding,
previewable, verifiable, and restart-safe.

## What Was Implemented

- A strict per-binding domain model for provider identity, purpose, authority,
  normalized snapshots, reconciliation baselines, operation journals, batches,
  uncertainty, aliases, and tombstones.
- Repository-, local-, and user-owned configuration with tighten-only authority
  composition, compact backward-compatible associations, privacy-aware storage,
  atomic persistence, migration, and remote doctor diagnostics.
- Preview-first intake, publish, refresh, reconcile, discussion, closeout,
  relink, detach, recreate, and operation-continuation workflows.
- Provider-neutral semantic adapters for GitHub Issues, Linear, and Jira Cloud,
  including managed descriptions, duplicate recovery, bounded discussion
  evidence, lifecycle transitions, and immutable cross-provider conformance.
- A host-executor boundary where the live agent discovers an available
  connector or an already configured CLI and returns sanitized observations;
  OAT retains policy, approval, journaling, verification, and state authority.
- End-to-end recovery for partial or uncertain writes, immutable reviewed
  batches, multi-binding closeout, explicit approval previews, and public CLI
  workflows.
- User and agent documentation, synced skill assets, lockstep package version
  `0.2.66`, and evidence-grade release verification; the post-implementation
  integrations are tracked separately below.

## Key Decisions

- **Local-first per-binding remote management.** Remote providers are optional
  views and collaboration surfaces. Each binding carries its own purpose,
  policy, state, and receipts; no change propagates transitively between
  providers.
- **Host-discovered provider-neutral execution.** OAT core and reusable skills
  encode semantic intent and sanitized evidence, not MCP names, captured
  catalogs, native schemas, executable names, flags, or provider CLI dialects.
- **Universal outbound projection gate.** Every create or update consumes only
  an explicit normalized projection and must pass the same provider-neutral
  privacy/safety gate whose result digest is bound to preview and approval.
- **Whole-field sensitive-content suppression.** Inbound content is limited to
  bounded field allowlists. A conservative signal suppresses the entire field
  and marks it incomplete; the product does not claim credential parsing or
  general DLP.
- **Persist before effect, verify after effect.** Mutation intent is durable
  before one external attempt, uncertain outcomes block blind retry, and only
  authoritative read-back can establish success.

## Design Deltas

- The early credential-value parser was replaced with conservative whole-field
  suppression and explicit incompleteness evidence, avoiding repository-wide
  scanning and general-DLP claims.
- Static transport catalogs and provider CLI machinery were removed in favor of
  live host capability discovery and a provider-neutral action/observation
  bridge.
- Production approval, restart, anomaly, and lifecycle-proof gaps discovered by
  review were closed through three corrective revision phases without rewriting
  the exhausted review history.
- The final exit-gate sweep found that 54 completed tasks used compact prose
  receipts that the public status parser did not count. Canonical artifact
  receipts now make the public status surface agree with the authoritative
  90/90 completion record.

## Notable Challenges

- Independent reviews repeatedly exposed subtle restart-safety, approval,
  duplicate-recovery, and production-routing gaps. Bounded fix loops and three
  corrective revisions preserved evidence while tightening behavior.
- Phase 7 production routing required an explicitly authorized recovery to
  connect provider-neutral runner composition through the real shared-storage
  path rather than proving only isolated modules.
- Main advanced during the project. It was merged rather than rebased so every
  reviewed implementation and repair SHA remained reachable, then the focused
  and release baselines were re-established.

## Tradeoffs Made

- V1 deliberately omits webhooks, continuous polling, distributed locking, and
  automatic provider-to-provider mirroring. Fresh reads, reviewed previews,
  exclusive journals, single attempts, and hard uncertainty stops provide a
  safer local-first boundary without claiming distributed coordination.
- Provider-native features remain extensions and are advertised only when the
  live host surface proves them. Unsupported Jira metadata or workflow detail
  degrades explicitly instead of silently adding a native REST fallback.
- Successful bindings in a reviewed batch are not rolled back when another
  binding fails; every binding retains its own durable outcome and recovery
  path.

## Integration Notes

- **Post-implementation Wave 6 and skill migration:** merged main
  `bb93ad233` (PRs #278–#281) in `5c70a9cb`. The remote and doctor skills now
  use only `metadata.version`, preserving their bodies and the five-skill PJM
  inventory. Public packages are 0.2.66, above main's 0.2.65. Restored five
  missing original reviews byte-for-byte in `dd86a7401`; the new ledger-path
  guard passes. Bounded independent integration review found no remaining
  compatibility issue. All local CI-equivalent gates, lint, format, and 7,225
  uncached workspace tests passed. Fresh configured gate
  `b64bfa7c-093b-46c7-84fb-dcf66dd58f60` passed at `4ea2dc5c4` with zero
  Critical/Important/Medium findings. Its sole Minor was dispositioned by
  preserving the failed recap as intentional historical evidence. The operator
  then skipped a recap retry, archived the lifecycle locally and to the
  configured S3 destination, and published the branch at `b5b8c6191`. PR #273
  remains open; post-push CI and merge are separate boundaries. Earlier
  receipts below are historical.
- **Post-implementation Wave 5:** merged main at
  `1bef28fa1fb95e1473872ff9a511a6b42fa37889` through merge `c55deca00`.
  Commits `4a27306ca` and `ba522d5d5` integrate remote config-unset behavior,
  register the remote skill in the actual bundle and project-management pack,
  and align installation fixtures and doctor inventory. Public packages are
  `0.2.64`, above main's `0.2.63`. The fresh review pending at that checkpoint
  passed after Wave 6 integration; the prior review and verification receipts
  below are history.
- The complete remote-PJM contract is exposed through `oat pjm remote` and the
  `oat-pjm-remote` host skill. External execution remains host-owned; OAT must
  not grow provider-specific invocation mappings.
- Before Wave 5, the branch integrated main through merge commit
  `6c73da33cf64fa2221def42a0b2fc6f7960ced73`; public packages were at `0.2.63`,
  above that merged `origin/main` baseline `0.2.62`.
- Pre-Wave-5 final verification passed the CI-equivalent gate sequence, lint and format,
  an uncached 6,545-test workspace run, smoke, skill, release, and skill-schema
  suites. The configured cross-family exit gate then passed at the Important
  threshold and its sole Medium artifact finding was addressed.

## Revision History

- **Revision 1 — production contract closure.** Four tasks tightened approval,
  persistence, restart, and production-runner behavior after Phase 3 review.
  Its capped review history remained intact when later work was split out.
- **Revision 2 — verification handoff and incomplete intent closure.** Two
  tasks made mutation-to-readback recovery durable and rejected incomplete
  project-create provenance rather than synthesizing authority.
- **Revision 3 — anomaly and approval closure.** Two tasks restored recreate
  handling across supported non-active anomalies and exposed exact lifecycle
  approval previews. The revision passed its independent review before Phase 8
  release work resumed.

## Explainer Outcome

- **project-recap:** degraded `failed` —
  `explainers/remote-project-management-recap`. The retained build record and
  terminal evidence name an authoring pipeline failure. The operator explicitly
  skipped a retry during completion; no durable or published lifecycle recap
  was produced.

## Workflow Observations

### 2026-08-31 · structural · oat gate review · design

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · design

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:3,important:4,medium:4,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/remote-project-management/reviews/artifact-design-review-2026-08-31T010815Z.md

### 2026-08-31 · structural · oat gate review · design

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/remote-project-management/reviews/artifact-design-review-2026-08-31T012755Z.md

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:2,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/remote-project-management/reviews/artifact-plan-review-2026-08-31T021338Z.md

### 2026-08-31 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/remote-project-management/reviews/artifact-plan-review-2026-08-31T022727Z.md

### 2026-08-31 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/remote-project-management/reviews/artifact-plan-review-2026-08-31T025155Z.md

### 2026-08-31 · structural · oat-project-implement · p01

verdict=BLOCKED fix_loops=0 review=not-launched tasks=10/10 focused=417/417 full_cli=failed-twice stop=direction-required event=p01-phase-test-20260831T0457Z

### 2026-08-31 · structural · oat-project-implement · p01

verdict=verification-recovered merge=4fa5390d1 upstream=2c6005d64 pr=249 full_cli=4688/4688 cached=0 repair=not-needed recovery_attempts=0/10 next=independent-review

### 2026-08-31 · structural · oat-project-implement · p01

stop=review-governance-exhausted cycles=3/3 fix_loops=2 terminal_artifact=reviews/artifact-p01-code-final-review-2026-08-31T063219Z.md critical=2 important=0 direction=required

### 2026-08-31 · structural · oat-project-implement · p01

verdict=BLOCKED tasks=10/10 verification=passed focused=426/426 full_cli=4697/4697 review=blocked cycles=3 fix_loops=2 commits=7b927ed8a,306bdd9dc next=operator-direction

### 2026-08-31 · structural · oat-project-implement · p01

operator-extension=authorized review_fix_limit=3 prior_used=2 extra_fix_rounds=1 extra_review_rounds=1 scope=two-terminal-critical-findings target_implementer=oat-phase-implementer-gpt-5-6-sol-high target_reviewer=oat-reviewer-gpt-5-6-sol-high phase2=not-authorized-before-pass

### 2026-08-31 · structural · oat-project-implement · p01

operator-extension-fix=DONE round=3/3 commit=a13b3b4a8 files=5 focused=190/190 combined=444/444 full_cli=4715/4715 cached=0 next=fresh-independent-review

### 2026-08-31 · structural · oat-project-implement · p01

verdict=PASS tasks=10/10 fix_loops=3 review_cycles=4 operator_extension=used review_artifact=reviews/artifact-p01-code-operator-review-2026-08-31T122741Z.md findings=critical:0,important:0,medium:4,minor:0 focused=444/444 full_cli=4715/4715 next=p02

### 2026-08-31 · structural · oat-project-implement · p02

Phase p02 terminal BLOCK after 3 review cycles and 2 fix loops; 1 Critical remains; see reviews/artifact-p02-code-final-review-2026-08-31T150500Z.md.

### 2026-08-31 · structural · oat-project-implement · p02-operator-extension

Phase p02 operator extension ended in terminal BLOCK after 4 reviews and 3 fix loops; 2 Critical findings remain; see reviews/artifact-p02-code-operator-review-2026-08-31T154000Z.md.

### 2026-08-31 · structural · oat-project-implement · p03

Phase 3 stopped after review cycle 3/3 with 6 Critical and 1 Important findings; see reviews/p03-review-2026-08-31T232956Z.md.

### 2026-09-01 · structural · oat-project-implement · p-rev1

BLOCKED after review round 3 exhausted normal governance with 1 Critical and 1 Important finding; see reviews/p-rev1-round-3-re-review-2026-09-01T161854Z.md.

### 2026-09-01 · structural · oat-project-implement · p-rev1

Operator-extension review 4 blocked with 1 Critical and 1 Medium after 3/3 fix loops; reconnaissance attempted and reconciled in reviews/p-rev1-round-4-operator-review-2026-09-01T180520Z.md; extension exhausted and Phase 4 remains blocked.

### 2026-09-01 · structural · oat-project-implement · p-rev2

Phase p-rev2 passed root review round 3 after two bounded review-fix loops; see reviews/p-rev2-final-rereview-2026-09-01T213136Z.md; Phase 4 is unblocked.

### 2026-09-02 · structural · oat-project-implement · p04

Phase 4 blocked after review round 3/3 and fix loop 2/3; one Critical, one Important, and one Medium finding remain in reviews/p04-final-review-2026-09-02T140132Z.md; further corrective work requires operator authorization.

### 2026-09-02 · structural · oat-project-implement · p04-operator-extension

Operator authorized one bounded Phase 4 extension: fix loop 3/3 and independent review 4/4 on the original accepted handles; Phase 5 remains blocked pending a passing review.

### 2026-09-02 · structural · oat-project-implement · p04

Phase 4 passed the authorized operator-extension review 4/4 with zero findings at reviews/p04-operator-review-2026-09-02T144931Z.md after fix loop 3/3; Phase 5 p05-t01 is unblocked.

### 2026-09-02 · structural · oat-project-implement · p05

Phase 5 blocked after final normal review round 3/3 and fix loop 2/3; zero Critical and one Important finding remains in reviews/p05-review-2026-09-02T215328Z.md; further corrective work requires operator authorization.

### 2026-09-05 · structural · oat-project-implement · p05-operator-extension

Operator authorized one bounded Phase 5 extension: fix loop 3/3 and independent review 4/4 at the unchanged exact targets; Phase 6 remains blocked pending a passing review.

### 2026-09-05 · structural · oat-project-implement · p05

Phase 5 passed authorized operator-extension review 4/4 with zero findings at reviews/p05-operator-review-2026-09-05T223153Z.md after fix loop 3/3; Phase 6 p06-t01 is unblocked.

### 2026-09-06 · structural · oat-project-implement · p07-recovery-02

Operator authorized the bounded same-target Phase 7 production-routing recovery; plan and continuation boundary recorded in implementation.md.

### 2026-09-06 · structural · oat-project-implement · p07-recovery-02

Recovery attempt 1/10 passed at 2ed83eb26862a4d5ebbd1b012d77edcfbfdbb720; production routing and phase verification are recorded in implementation.md, and review round 1 is next.

### 2026-09-07 · structural · oat-project-implement · p07-operator-review-4

Phase 7 operator extension exhausted at 4/4 reviews and 3/3 fixes with 1 Critical and 1 Important finding; see reviews/p07-review-2026-09-07T015809Z.md.

### 2026-09-07 · structural · oat-project-implement · p-rev3

Revision 3 passed root-owned review 3/3 with zero Critical or Important findings after 2/3 bounded fix loops; see reviews/p-rev3-review-2026-09-07T030518Z.md.

### 2026-09-07 · structural · oat-project-implement · latest-main-transition

Merged origin/main f83463e64 without rebasing reviewed history in c20df4331; collision 477/477, remote/E2E/help 768/768, smoke 161/161, uncached build 5/5, and project-scope sync passed before Phase 8.

### 2026-09-07 · structural · oat-project-implement · p08

verdict=passed; review_rounds=3/3; fix_loops=2/3; artifact=reviews/p08-review-2026-09-07T042019Z.md; reviewed_head=a9004ccfd3b62157a72088ba92e26f5194a6aad2

### 2026-09-07 · structural · oat-project-review-provide · reviews/final-review-2026-09-07T043133Z.md

Final code review used attempted reconnaissance; complete orchestration evidence and primary reconciliation are recorded in reviews/final-review-2026-09-07T043133Z.md.

### 2026-09-07 · structural · oat-project-implement · p09

Phase p09 completed two bounded final-review fixes in 818647f11 and dda462ea6; five guard neutralizations failed as expected, restored focused union passed 82/82, all CI-order gates passed, and no optional nested dispatch occurred.

### 2026-09-07 · structural · oat-project-implement · p09-review-fix-1

p09 review fix 1 corrected three ineffective test selectors in 681e69905; each restored probe selected and passed 2/2, the five-file union passed 82/82, and temporary guard mutations were restored byte-for-byte.

### 2026-09-07 · structural · oat-project-review-receive · p09

p09 review round 2 passed at d2193de6077237abe3fcc823e7d4672fcb0ae345 with 0 critical, 0 important, 0 medium, and 0 minor findings; corrected probes selected 2/2 each and restored union passed 82/82.

### 2026-09-07 · structural · oat-project-implement · final-review-fix-2

Final review round 2 Medium status drift was corrected by p09-t04 in f2489c00c; current Phase 9 status now routes to final review round 3 while preserving prior review history.

### 2026-09-07 · structural · oat-project-review-receive · final

Final review round 3/3 passed at 527ce8bc0b5eb7a420cc62a740dbf3d4f8ff893c with zero findings; deferred Medium and Minor ledgers are empty, so final review gates are satisfied.

### 2026-09-07 · structural · oat-project-implement · exit-gate-generation

Resolved the implementation exit gate as configured and persisted its immutable configuration plus final-review effective-delta basis before launch.

### 2026-09-07 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/remote-project-management/reviews/final-review-2026-09-07T053105Z.md

### 2026-09-07 · structural · oat-project-review-receive · implementation-exit-gate

Received gate run bee16cdf-2649-4445-baaf-fe7827c841c2; addressed its sole Medium lifecycle-artifact finding with canonical receipts for 54 existing task commits, and verified the public project status at 90/90 with every phase complete.

### 2026-09-07 · structural · oat-project-implement · implementation-tail-recap

Project recap intent generate was attempted exactly once at explainers/remote-project-management-recap and reached terminal failed during authoring; no durability or publication step ran.

### 2026-09-07 · structural · oat-project-implement · completion

Implementation completed at 90/90 tasks after passing final review and the configured exit gate; summary, documentation, PR, recap terminal outcome, and approval-aware closeout sequence are complete.

### 2026-09-07 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/remote-project-management/references/project-retro.md evidence_used=current-session,issue-backlog-history,lifecycle-artifacts,project-log,recap-run-evidence evidence_unavailable=historical-session-transcript,oat-execution-learnings promotions=1 upstream=1 apply=skipped filing=performed

### 2026-09-08 · structural · post-implementation-integration · wave-5

Integrated origin/main at 1bef28fa1fb95e1473872ff9a511a6b42fa37889 via
c55deca00 without rewriting reviewed history. Fixed remote config-unset
composition and a missing bundle/pack registration in 4a27306ca, then aligned
installer fixtures and doctor inventory in ba522d5d5. Reconciled the recap
follow-up against shipped Wave 5 work in 274b775fb. Original progress remains
90/90 and PR routing is now pr_open. See implementation.md's post-implementation
section for regression probes and current verification; the prior final gate
remains historical, with fresh final review and publication pending.

### 2026-09-08 · structural · post-implementation-integration · wave-6-skill-migration

Integrated origin/main at bb93ad233befc75d0da9bd699ffc57db80dfe393 via
5c70a9cb1, including PRs #278–281. Reconciled metadata-only skill versions
and lockstep public packages at 0.2.66. Restored five original historical
review blobs verbatim in dd86a7401; the new PRFINAL-05 ledger guard changed
from rejecting those five missing paths to passing. Bounded independent
config and surface reviews found no remaining compatibility defect. All
CI-equivalent gates, lint, format, and 7,225 uncached workspace tests passed;
smoke passed 167, skill scripts 863, release scripts 42 with one skipped.
Original progress remains 90/90. The configured final gate remains historical;
fresh final review, authorized publication, and post-push CI are pending.
No push, merge of PR #273, project archive, or recap retry occurred.

### 2026-09-08 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/remote-project-management/reviews/final-review-2026-09-08T155545Z.md run=b64bfa7c-093b-46c7-84fb-dcf66dd58f60

### 2026-09-08 · structural · oat-project-review-receive · completion-gate

Received gate b64bfa7c-093b-46c7-84fb-dcf66dd58f60 at 4ea2dc5c465660f508f269ac057942b8acc8b45c: zero Critical/Important/Medium, one Minor rejected as required cleanup because failed recap files are intentionally retained evidence. No tasks added; final review passed. Recap choice remains pending before confirmed archive/publication.

### 2026-09-08 · structural · oat-project-complete · retirement-sweep

Retirement sweep: no absorbed projects recorded.
