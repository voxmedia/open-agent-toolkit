---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-07
oat_generated: true
oat_summary_last_task: p12-t09
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-5-execution

## Overview

Wave 5 ("program-intake follow-ups") of the 2026-08-31 execution program:
eleven external plans that closed backlog items opened during the program's
own intake reviews, run as a thin wrapper project so the fixes could execute
in parallel worktrees with root-owned reviews, one lockstep release bump, and
full integration gates after every fan-in. The motivating gaps were gates that
lost already-produced reviews to post-selection or index-lock failures,
instruction pointer files that landed inside documentation content, quick
projects that dead-ended in the spec-driven plan skill, a missing
`oat config unset`, skill text that could reference scripts no pack ships,
external plans whose readiness status contradicted their dependency tables,
autonomous completions that failed on a missing recap seam, terminal status
that disagreed with revision plans, and consolidated projects that retired
their absorbed work without checking it. Ten lanes merged; the eleventh
(deferring the activeProject clear) parked on its plan's own STOP condition
because its resume premise is false against the real CLI.

## What Was Implemented

- **Gate resilience (p01, p04).** A committed review artifact that survives a
  post-selection failure is re-validated through the normal path's own
  eligibility function and returned with its real disposition
  (`postSelectionRecovery: true`, no reviewer re-dispatch; replacement bytes
  never recover; `unexpected_post_selection_failure` envelopes name the thrown
  sub-step and code). Gate project-log finalization retries transient index
  locks on git's own contention evidence, settles only on a clean log with a
  moved HEAD carrying the entry, and leaves a durable receipt under
  `<project>/gate-receipts/` whose recovery command is idempotent and
  identity-bound.
- **Configuration (p02, p05).** `documentation.instructionPointerExcludes`
  keeps instruction-sync pointer files out of docs content trees (normalized,
  escape-rejecting, fail-closed on malformed values with a repair message; the
  `.oat/repo` carve-in keeps precedence; issue #238 reproduced and closed on
  this repository). `oat config unset <key>` with `set`-parity refusals,
  aggregate-key rejection, empty-parent pruning, and family coverage derived
  from the live catalog.
- **Lifecycle routing and closeout (p03, p08, p10, p11).** One quick-plan
  readiness predicate shared by `oat-project-plan` 1.4.10, `progress` 1.4.1,
  `next` 1.1.1, and `quick-start` 2.3.10, with incomplete quick projects
  resuming in quick-start in place. The recommender treats a project as
  terminal only when `oat_lifecycle` is complete AND no revision phase is
  incomplete, on a control-plane task parser that normalizes heading dialects
  with string-only ordinals, keyed on lifecycle alone across spec-driven,
  quick, and lite. The autonomous recap is capability-aware and non-blocking:
  `oat-explainer-kit` 1.0.7 ships a forgery-resistant seam probe, the recap is
  attempted exactly once only when every required seam resolves, and
  `complete` 1.7.8, `implement` 2.3.6, `summary` 1.5.3, `autonomous` 1.0.13
  carry the contract with the Lite carve-out pinned verbatim.
  Consolidated-project retirement is semantic: `oat-project-complete` reads the
  `absorbed_projects` / `absorbed_backlog_ids` a quick-start consolidation
  recorded, sweeps the active planning surfaces for ownership language still
  naming that work, and dispositions each hit before the roll-up and seal.
- **Contracts (p06, p07).** Every `.oat/scripts` reference in shipped skill
  Markdown resolves against a pack manifest (lossless two-stage extraction;
  74 shipped, 8 canonical-unshipped). The `oat-repo-improve` 2.1.3 plan
  template carries the external-plan readiness contract and the contract test
  sweeps all 44 dated plans; the stale row it caught is a provenance-headed
  fixture.
- **Exit-gate fix round (p12).** After the root final review passed, the
  cross-family exit gate blocked attempt 1 on seven composition gaps; three
  parallel fix lanes resolved them: the gate-log append window is one critical
  section under a project-local advisory lock and a commit settles only when
  `HEAD:project-log.md` carries the entry; receipt staleness is decided against
  HEAD; `documentation.instructionPointerExcludes` is catalogued for `set` and
  `unset`; the control-plane reader carries an executable Quick Plan Readiness
  predicate so `oat project status` routes not-ready quick plans to
  quick-start; the awk readiness guard measures indentation in columns;
  quick-start re-resolves `PROJECT_PATH` after scaffolding; the readiness
  contract backstops the plan↔source backlink.
- **Release.** Lockstep 0.2.62 → 0.2.63 in one fan-in bump with the
  `.oat/sync/manifest.json` restamp in the same commit; two decision records
  (`DR-260907-additive-post-selection`, `DR-260907-gate-log-receipts-live-under`).

## Key Decisions

- **Recovery re-validates, never re-reads.** A post-selection recovery runs
  the selected artifact snapshot through the same eligibility function as the
  normal path; on-disk bytes that diverge from the snapshot fail closed rather
  than being recovered. Recorded as `DR-260907-additive-post-selection`.
- **Gate log receipts live under the project and are idempotent.** The retry,
  classification, and dedupe logic lives in the log module (not the gate), a
  receipt binds producer, ref, and body, and the printed recovery command can
  be re-run without duplicating the entry. Recorded as
  `DR-260907-gate-log-receipts-live-under`.
- **Pre-dispatch refreshes belong in the source plans.** Recorded as
  `DR-260907-pre-dispatch-refreshes-live`.
- **(superseded wording removed)** Wave-boundary
  refreshes are dated `Refresh applied` entries in each plan's Revalidation
  section; the wrapper stays single-contract and wave-close corrections are
  reserved for execution records. The plan gate rejected wrapper-side addenda
  three times before this.
- **A rewrite that cannot take the log lock refuses; a commit that cannot be
  read back does not settle.** The gate-log critical section uses a
  project-local advisory lock under the OS temp root (never a Git lock), and
  `committed` requires a positive HEAD read-back; anything else routes to
  the durable receipt and its idempotent recovery.
- **A false plan premise parks the lane.** p09 stopped before widening a guard
  whose resume design cannot work on the current CLI, preserved its work as a
  patch, and filed the refresh item rather than improvising.

## Design Deltas

- p01's Test-plan bullet expected the original verdict after a post-selection
  byte swap; the Done criterion governs, so the shipped behavior is fail-closed
  and the plan is corrected at wave close.
- p03 reads `oat_template` absent as false (the repository convention; 12 of
  76 live quick plans flip not-ready → ready, none the other way).
- p04 keeps the retry in the log module with a thin gate wrapper because the
  plan's literal placement creates an import cycle.
- p07 ships the readiness rules as local test helpers, not a module, because
  the plan's In-scope names only the test file.
- p08's seam probe requires the fact critic in both modes where `run.mjs`
  returns null without one — the one place the probe is stricter than the
  runtime, pinned as a judgment call.
- p10 flipped two same-phase cross-spelling negatives because collapsing
  heading dialects makes them positives by definition; the cross-phase
  negatives survive in a dedicated case.
- p11 resolves the configured `projects.root` (the plan's literal glob matched
  zero files on this scope-nested layout) and records that Lite consolidations
  write no `absorbed_*` fields (plan-scope gap, filed).

## Notable Challenges

- **A red root test only the root reviewer saw.** p08 bumped
  `oat-explainer-kit` and swept the CLI package's pins, but
  `tools/smoke/wrapper-compatibility.test.mjs` pinned the old version in a
  regex-escaped literal that the CLI package filter never runs. The lane's
  forced gates were green; root `pnpm test` was red. Lanes that bump a skill
  now sweep old literals repo-wide in plain and escaped forms and run
  `pnpm test:smoke`.
- **A plan whose premise was false.** p09's resume design assumed the status
  probe could see the completion seal and skip a second append; the seal
  append is not idempotent and the probe cannot see it (two seals on replay).
  The lane reproduced it on the built CLI and parked per its STOP clause.
- **Where the wave-boundary refresh lives.** The plan gate blocked on attempts
  1, 3, and 4 because wrapper-side addenda claimed authority the governing
  skill brief does not grant; moving the refreshes into the plans themselves
  passed on attempt 5 with zero findings.
- **A review that caught the orchestrator.** The p11 review flagged that the
  review brief's ordering ruling was inverted relative to the plan (sweep
  before the seal, not after); the implementation followed the plan and no
  code changed. Brief rulings now quote the plan sentence they derive from.
- **The gate saw composition the lanes could not.** Every lane passed its
  own review, and the root final review passed on the integrated tree, yet
  the cross-family exit gate blocked on cross-lane seams: a sibling-plan
  dependency row (p05 had to cover p02's key), a plan premise that was false
  for another package ("no routing code exists" while the control-plane
  routes), and a concurrency claim with no overlapping-writer test. The
  fix round reproduced every finding before changing code.
- **A gate exhausted on a sentence.** The cross-family exit gate blocked
  twice: once on real composition gaps, once on a stale user-facing summary
  sentence plus two test-rule Mediums, after a launch whose reviewer had
  passed was killed by the harness for low memory before its receipt. With
  attempts exhausted the wave stopped at the boundary, escalated with every
  finding already fixed, and the operator authorized a third attempt, which
  passed (0C/0I/2M/1m; the Mediums deferred as filed hardening).
- **Records that lagged git.** The final review's only Important was
  `state.md` not advanced at the last fan-in; all seven findings were record
  corrections, fixed in one commit and verified in a second round.

## Tradeoffs Made

- The retirement sweep is advisory by the plan's own rule: a raw match never
  blocks closeout, and a Lite consolidation that recorded nothing degrades to
  a recorded note rather than failing.
- `unset tools.<pack>` refuses rather than removes (it points at
  `oat tools remove`), keeping intent and installed files from drifting.
- Archived projects whose completion is recorded at phase level (no `### Task`
  headings) still report zero completed tasks; the reviewer ruled "do not
  weaken the widening — file and pin", so the interaction is pinned and filed.
- The stale quick-start `PROJECT_PATH` after `oat project new` is pre-existing
  and left for a follow-up rather than fixed inside a lane that shares the
  Step 0.5 routing with p03.

## Follow-up Items

- `BL-260907-make-the-completion-seal` — refresh or supersede the p09 plan
  (seal idempotence, seal visibility to the status probe).
- `BL-260907-finalize-synced-archive-mjs` — the synced deferred clear from
  PR #254 always fails on a numeric-fd `readFile` (pre-existing).
- `BL-260907-recognize-phase-level` — phase-level completion records.
- `BL-260907-type-check-cli-test-files`, `BL-260907-fold-oat-config-adopt-onto`,
  `BL-260907-route-quick-mode-discovery`, `BL-260907-warn-when-documentation-root`,
  `BL-260907-name-the-resolved-target`, `BL-260907-ignore-backslash-escaped`,
  `BL-260907-settle-the-oat-wave-program`, `BL-260907-fail-closed-on-unparsable`,
  `BL-260907-record-absorbed-projects` — closeout follow-ups from the lane
  reviews (`BL-260907-re-resolve-project-path-after` was fixed in the wave as
  p12-t06 and is archived).
- `BL-260907-let-oat-config-unset-remove`, `BL-260907-decode-entity-and-percent`,
  `BL-260907-harden-the-external-plan` — exit-gate fix-round residue (a
  malformed stored value `unset` cannot remove; encoded neighbouring IDs and
  raw HTML blocks in the backlink rule; full extension consumption and
  comments-before-fences in the same rule).
- Wave-close plan corrections: execution records on the ten merged plans;
  p01's Done checkbox and two Test-plan bullets; p03's `oat_template`
  reading; p10's Step 2 Verify sentence; p11's verify filter; the stale
  BLOCKED row in the docs-index exclusions plan.
- Skill signals for `oat-wave-execute` are recorded in the wrapper's
  `orchestration-log.md` synthesis.

## Associated Issues

- `BL-260902-recover-committed-review`, `BL-260902-keep-pjm-init-provider`,
  `BL-260830-clarify-quick-mode-resume`, `BL-260902-retry-gate-project-log`,
  `BL-260830-add-oat-config-unset-command`, `BL-260902-validate-every-shipped-skill`,
  `BL-260830-distinguish-external-plan`, `BL-260902-make-autonomous-project-recap`,
  `BL-260901-make-terminal-project-status`, `BL-260902-make-consolidated-project`
  — archived by this wave; `BL-260902-defer-activeproject-clearing` stays
  open (p09 parked).

## Workflow Observations

### 2026-09-07 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-5-execution/reviews/artifact-plan-review-2026-09-07T042724Z.md

### 2026-09-07 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-5-execution/reviews/artifact-plan-review-2026-09-07T043343Z.md

### 2026-09-07 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-5-execution/reviews/artifact-plan-review-2026-09-07T044034Z.md

### 2026-09-07 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-5-execution/reviews/artifact-plan-review-2026-09-07T044657Z.md

### 2026-09-07 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-5-execution/reviews/artifact-plan-review-2026-09-07T045405Z.md

### 2026-09-07 · structural · oat-project-review-provide · final

review=final status=fixes_added artifact=reviews/final-review-2026-09-07T144442Z.md findings=0C/3I/4M/0m run=33895672-bac5-4cb4-9a9e-474e440a9bc5

### 2026-09-07 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:2,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-5-execution/reviews/final-review-2026-09-07T174812Z.md run=a720129c-9808-4d43-8ae6-4b8de92e8fdb

### 2026-09-07 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:2,minor:1 exit=0 status=ok artifact=.oat/projects/shared/wave-5-execution/reviews/final-review-2026-09-07T214334Z.md run=905419ec-75d0-4ea0-9881-5425c6c54e9d
