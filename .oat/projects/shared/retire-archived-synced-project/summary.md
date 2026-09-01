---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-31
oat_generated: true
oat_summary_last_task: p04-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: retire-archived-synced-project

## Overview

This project closed a lifecycle gap in synced OAT projects: successful archival
left the active discovery JSON and project ref behind, allowing completed work
to remain listed or be materialized again. The shipped contract retires active
identity only after the configured archive is durable while retaining terminal
history, commit reachability, and deterministic recovery.

## What Was Implemented

- Added the completed-ref namespace and idempotent source-SHA-bound transition
  receipts. Synced archival now proves local and configured S3 durability before
  terminalization, checkout removal, and active-record deletion; recordless
  retries recover the original snapshot instead of recreating active state.
- Aligned list, dashboard, pull, open, links, and prune behavior with terminal
  classification. Completed projects cannot be resurrected, legacy or
  contradictory states get precise diagnoses, SHA-pinned links remain durable,
  and prune stays a separate destructive operation.
- Updated the completion skill, CLI and lifecycle documentation, lockstep public
  package versions, and end-to-end interruption/retry coverage.

## Key Decisions

- **Transactional active records.** A successful synced archive
  deletes `.oat/projects/synced/<slug>.json`; durable terminal identity lives in
  archive metadata, summary output, and the completed ref.
- **Completed-ref authority.** `refs/oat/completed/<slug>` owns
  the archived source SHA. A same-SHA active ref may remain as an inert alias,
  while differing active/completed SHAs fail closed.
- **Durability before retirement.** Terminal cleanup cannot report
  success until every configured durability target, including configured S3,
  has succeeded; unconfigured S3 remains outside the required set.
- **Terminal discovery exclusion.** Completed refs and terminal
  archive evidence are excluded from list, pull, open, and continuation paths,
  preventing archived project resurrection.
- **Explicit destructive prune.** Normal completion preserves
  source-commit reachability; only explicit prune removes completed refs and
  accepts the resulting permanent-link loss.

## Design Deltas

- Standard Git cannot atomically lease a no-op completed-ref update together
  with active-ref deletion. The accepted contract therefore replaced mandatory
  active-ref deletion with completed-ref authority plus a permitted matching
  alias; implementation, reviewed tests, and the updated plan are authoritative.
- Phase 3 added a leased active-alias deletion primitive in the shared ref-sync
  module despite its original consume-only boundary because prune race
  protection belonged at that shared boundary. The deviation was reviewed.

## Notable Challenges

- The first ref-transition design exhausted its review budget because Git
  omitted the no-op completed update from receive-pack. An operator-approved
  contract revision and one fresh fix round resolved it.
- Archive-resume handling initially bypassed active work by exiting the whole
  completion skill and accidentally skipped closeout. A bounded continuation
  fix passed re-review. Final review then converted three terminal-path gaps
  into tasks; all passed focused re-review with zero findings.

## Tradeoffs Made

- Allowing a same-SHA active alias avoids unsafe cross-ref deletion while
  requiring all active surfaces to treat completed authority consistently.
- Keeping completed refs preserves durable links and recovery at the cost of a
  retained Git root. The gate's Minor shared-parser refactor was deferred until
  a parser next changes because all six paths are correct and tested.

## Integration Notes

- Terminal callers must probe active and completed refs together. Completed-only
  and same-SHA aliases are valid terminal states; differing SHAs are recovery
  errors, and transport/authentication failures must not be classified as
  verified absence.
- Archive retries must preserve the original source-SHA and snapshot binding,
  including after the active record or checkout is absent. Final verification
  passed uncached CLI (4721/4721), control-plane (78/78), repository, release,
  docs, lint, format, skill, and Claude Fable exit gates.

## Follow-up Items

- Extract a shared typed remote-ref parser when one of the six current parsers
  next changes; this was deferred as non-blocking maintenance.
- A first-class completed-project browsing surface remains deferred until
  usage evidence shows archive sync and summaries are insufficient.
- `BL-260831-retire-archived-synced-project` is completed by this project.

## Workflow Observations

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:1,minor:2 exit=0 status=ok artifact=.oat/projects/shared/retire-archived-synced-project/reviews/artifact-plan-review-2026-08-31T044004Z.md

### 2026-08-31 · structural · oat-project-implement · p01

Phase outcome blocked after 2 fix iterations and 3 review rounds; remaining Critical atomic no-op lease race is recorded in reviews/p01-review-2026-08-31T055541Z.md; implementation stopped before p02/p03 and before origin/main merge.

### 2026-08-31 · structural · oat-project-implement · p01-contract-revision

Operator approved completed-ref authority: completed-only and matching active/completed refs are terminal; same-SHA active is an inert alias; differing SHAs remain a hard mismatch. Plan revised and a fresh bounded p01 fix/review generation authorized.

### 2026-08-31 · structural · oat-project-implement · p01-revision-review-r1

Fresh p01 revision review at 3d0f106597f80f5f3c22b96d89670028b89444b5 blocked with one Critical torn two-process remote-ref observation and one Important unleased completed-ref prune deletion. Focused tests remained 128/128; bounded fix round 1 authorized by the active generation.

### 2026-08-31 · structural · oat-project-implement · p01-passed

Phase p01 passed re-review at c59bcc4c0f54c8541a43090eea6ebfe33e34244d with zero findings. Coherent terminal probing and leased remote/local prune deletion verified; 134 focused tests and CLI type-check passed. Proceeding to merge origin/main before p02/p03.

### 2026-08-31 · structural · oat-project-implement · origin-main-merge-after-p01

Merged origin/main at 2c6005d64f45a19e8b9eedbc977959b066d3eda0 after p01 passed, as directed. Merge completed without conflicts. Post-merge p01 verification passed 134/134 focused tests and CLI type-check.

### 2026-08-31 · structural · oat-project-implement · p02-p03-parallel-start

Started parallel p02/p03 implementation from logical base e7c60215e639d7b7de077101bb863509c3d807f6. Strict autonomous bootstrap passed in both worktrees; each has isolated setup commit 79dfa969d updating only the sync manifest. p02 owns archive/completion files and p03 owns terminal list/action semantics.

### 2026-08-31 · structural · oat-project-implement · p03-passed

Phase p03 passed re-review at 28162dae60ac623c3f680a608e374afa1d0c24c5 with zero findings and merged at aa7f0b8f8. Combined-branch verification passed 214 focused tests plus CLI/control-plane type-checks and CLI check; review evidence is in reviews/p03-review-2026-08-31T134913Z.md.

### 2026-08-31 · structural · oat-project-implement · p02-review-budget-exhausted

Phase p02 remains blocked after 2 fix iterations and 3 review rounds. Final review at 2a8d84388376ef0f8f367dd321010182fe1afc93 found one Critical: the archive-resume branch skips active Steps 2-7 but exits before required post-archive durability and closeout; evidence is in reviews/p02-review-2026-08-31T140841Z.md. The p02 branch is preserved and unmerged pending explicit authorization for a fresh bounded generation.

### 2026-08-31 · structural · oat-project-implement · p02-fresh-generation-authorized

Operator explicitly authorized one fresh bounded p02 fix/review generation after the prior automatic budget stop. Scope is limited to replacing the whole-skill terminal retry exit with a continuation that skips active Steps 2-7 but completes required post-archive durability and closeout.

### 2026-08-31 · structural · oat-project-implement · p02-passed

Fresh p02 generation passed re-review at 95bb211215e469645fb9fd7e371cf665cd4b0bab with zero findings and merged at 1637fe31f. Exact recap evidence recovery and fail-closed tracked-PR closeout were verified; combined completion tests passed 16/16 and p02 CLI tests passed 162/162.

### 2026-08-31 · structural · oat-project-implement · p04-preflight

After p02/p03 merge, combined behavior tests, type-checks, CLI check, and skill-bump validation passed. pnpm oat:validate-skills identified three stale synced-bookkeeping inventory anchors in pull, links, and prune; this is a bounded p04 integration task before full definition-of-done gates.

### 2026-08-31 · general · feedback · HiLL checkpoint phase timing

The implement workflow misread oat_hill_checkpoints: [p04] as a gate before p04 and paused before the final phase. The intended contract is that a phase-listed HiLL checkpoint is evaluated after that phase completes. Strengthen the skill, template comments, and user-facing prose to say explicitly that pNN means after pNN, not before it. (observed on Observed on OAT 0.2.50)

### 2026-08-31 · general · feedback · HiLL checkpoint timing correction

Correction to the immediately preceding HiLL checkpoint phase timing entry: the intended observed version is OAT 0.2.50; the CLI rendered the supplied version-note prefix redundantly. The checkpoint-timing recommendation is unchanged.

### 2026-08-31 · structural · oat-project-implement · p04-start

Corrected checkpoint timing: oat_hill_checkpoints [p04] is evaluated after p04 completes, not before it starts. Phase p04 now begins from combined head 067a3683e; the prior pause was workflow interpretation error, and the language-strengthening feedback is recorded in this log.

### 2026-08-31 · structural · oat-project-implement · p04-passed

Phase p04 passed at 7d9e9e77275a9ffb09ec0989662ec2954b257960 after one bounded p02 backstop correction at 09c05e22c; final review artifact reviews/p04-review-2026-08-31T170239Z.md reports zero findings. Evidence includes 157/157 scoped tests, uncached CLI 4714/4714 and control-plane 78/78, plus all repository, release, docs, lint, format, and skill-validation gates.

### 2026-08-31 · structural · oat-project-implement · final-review-fixes-added

Automatic final review at fd9fe6615efc32a89ea977deeb6d4cc27b51c175 blocked with 1 Critical, 1 Important, and 1 Medium terminal-path finding; all three were converted to p04-t03 through p04-t05. The consumed artifact is reviews/archived/final-review-2026-08-31T171506Z.md; no finding was deferred.

### 2026-08-31 · structural · oat-project-implement · final-review-fixes-completed

Final-review fix tasks p04-t03 through p04-t05 completed in e7f52ba14, 49c649995, and af850a463. Test-first verification passed 78/78, 16/16, and 52/52 respectively; combined regression passed 156/156 with CLI check and type-check green. Proceeding to full final verification and focused re-review.

### 2026-08-31 · structural · oat-project-implement · final-review-passed

Focused final re-review of e3ca4e5ce3e02ce85b5105fc90b55fbfbe7bb8ce..98b005960b2c5f282fadb8781d990d2ed4a159c9 passed with zero findings; artifact reviews/final-review-2026-08-31T180107Z.md. Independent focused verification passed 186/186 and the root full final gate matrix is green.

### 2026-08-31 · structural · oat-project-implement · exit-gate-target-unavailable

Configured Cursor Fable exit gate was not launched: source CLI target probe reports cursor-fable-5-high available=false, and cursor-agent --version reports the macOS login keychain is locked. Implementation, final verification, and final re-review remain passed; resume by unlocking the login keychain locally, re-probing the target, and rerunning oat-project-implement.

### 2026-08-31 · structural · oat-project-implement · exit-gate-target-override

Operator selected the available non-Cursor Claude Fable target after cursor-fable-5-high remained unavailable. The Cursor generation never launched, is preserved as stale in state.md, and consumed no remediation attempt.

### 2026-08-31 · structural · oat-project-implement · exit-gate-generation-resolved

Resolved a fresh configured exit-gate generation for available target claude-fable-skip-permissions. Reviewed head and implementation fingerprint are unchanged; launch provenance remains empty pending the committed launch-intent transition.

### 2026-08-31 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/retire-archived-synced-project/reviews/final-review-2026-08-31T232653Z.md

### 2026-08-31 · structural · oat-project-implement · exit-gate-minor-disposition-required

Gate run 42a1a4fe-e3a4-4830-8fbc-474ba966613d passed at Important with one receive-eligible Minor finding. Receive intent is persisted and bound; final-scope review policy requires the operator to choose convert or defer before the event can pass.

### 2026-08-31 · structural · oat-project-implement · exit-gate-passed

Claude Fable gate run 42a1a4fe-e3a4-4830-8fbc-474ba966613d passed at Important. Minor m1 was explicitly deferred with rationale; archived artifact, Reviews event, and receive commit 237597d94 reconcile, so the configured exit gate is allowed/passed.
