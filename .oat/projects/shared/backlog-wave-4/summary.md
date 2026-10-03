---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_generated: true
oat_summary_last_task: p07-t08
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: backlog-wave-4

## Overview

Wave 4 of the repository backlog, delivered as one PR on
`wave/2026-10-02-backlog-wave-4`. It targeted gate and build reliability (the
Wave 3 disk fill from `bundle-assets.sh`, a 15-minute budget too short for
full-surface gate reviews, duplicate nested gates) and the review-loop and
completion follow-ups Wave 3 surfaced, led by the operator's request that an
exhausted review or gate budget trigger a complexity review presented with the
reasons the loop stopped. Of thirteen approved items, one left at the
plan-gate escalation, eleven closed, and one shipped partially.

## What Was Implemented

43 tasks across seven sequential phases (24 planned, the rest review fixes).
The lockstep public packages end at 0.3.16 because `main` advanced three times
during the wave (#335, #342, #350).

- **Build assets (p01):** `bundle-assets.sh` fails closed on an empty,
  absolute, escaping, or repository-root inventory lookup; staging can never
  sit inside a recursively copied source; an `OAT_ASSETS_DIR` override is
  accepted only when it is absent, empty, or an existing bundle (the emptiness
  check is filename-safe and follows a symlinked destination). The Wave 3 root
  cause is fixed: `bundle-inputs.mjs` compared its real module path with the
  invoked path, so a symlinked checkout printed nothing. Asset-root read
  failures now report their errno.
- **Gate timeouts (p02):** artifact (full-surface) gate reviews default to
  30 minutes; a second gate for the same project, review type, and scope is
  rejected through an atomic claim, reported as `recursion` in the JSON
  envelope, with the claim directory passed explicitly to children.
- **Sync correctness (p03):** `oat sync` restamps stale copy-strategy hashes
  (only when the manifest row tracks the checked path), bridges legacy digests
  when retiring obsolete copies, and reports a marker-less skill or agent
  directory as an `error` entry instead of rewriting it on every run.
  `oat:validate-skills` reports a missing `SKILL.md` in any skill directory.
- **Review-loop skills (p04):** implement, quick-start, and review-receive run
  a read-only complexity review at every budget-exhaustion point (installed
  `complexity-review` skill, or a condensed fallback in
  `.agents/docs/complexity-review-fallback.md`) and present it with the stop
  reasons and a **simplify** option. Quick-start persists
  `oat_quick_start_gate` (shape defined once in
  `.agents/docs/gate-approval-record.md`); next and progress report it. Root
  agents log judgment entries to the project log.
- **Completion (p05):** a `workflow.autonomousComplete` opt-in (default off)
  and the model-invocable `oat-project-complete-auto` companion skill
  (three-layer guard, recorded pre-merge exception for wave-execute, batch
  mode, never creates a PR); wave-execute and wave-program point at it.
  pr-final's ledger scan boundary prose is precise.
- **Small fixes (p06):** recon reconciliation keeps a claim `unresolved` when a
  thorough-profile review leaves it undisposed; `oat-wrap-up` resolves its
  summary template through `oat template resolve`; the dashboard routes quick
  plans exactly as the router does and reads parsed HiLL arrays.
- **Release fan-in (p07):** lockstep bump, backlog closeout (11 closed, 1
  won't-do, 3 rewritten, follow-ups filed), docs ported into the #342
  reader-first docs site, full Definition of Done exit 0.

Closed: `BL-261001-fail-closed-when-bundle-assets`,
`BL-260906-report-errno-for-asset-root`, `BL-260718-harden-full-surface-gate`,
`BL-260927-persist-quick-start-prompt`, `BL-261001-run-a-complexity-review-when`,
`BL-260713-root-agent-judgment-logging`, `BL-260720-add-oat-project-complete-auto`,
`BL-260908-tighten-the-pr-final-ledger`, `BL-261001-downgrade-claims-that-thorough`,
`BL-261001-resolve-the-summary-template`, `BL-261001-route-quick-mode-plan`;
`BL-260908-retire-the-top-level-skill` archived as won't-do (superseded).

## Key Decisions

- **Complexity review at budget exhaustion:** every review or gate
  budget-exhaustion point (root review cap, configured gate attempts, final
  review cap, review-receive cycle cap, quick-start plan gate) dispatches one
  read-only complexity review before the decision message. It probes for the
  installed `complexity-review` skill and falls back to a condensed OAT
  reference. The operator chooses the disposition, including simplify; agents
  never self-select it, also under `OAT_AUTONOMOUS=1`, where it is a boundary
  report. No automatic early trigger ships; the operator can request the
  review at any time.
- **Assets override destination rule:** an `OAT_ASSETS_DIR` override publishes
  only to an absent or empty directory or an existing bundle, replacing a
  per-path denylist that grew one entry per review round. The default
  destination is exempt because a fresh clone tracks four files under
  `packages/cli/assets` while its bundle metadata is gitignored.
- **Full-surface gate budget and duplicate rejection:** artifact gate reviews
  default to 1,800,000 ms, and a live duplicate gate for the same project,
  review type, and scope is rejected (not reused) through an atomic
  hard-linked claim file, released in `finally`.
- **Report quick-start gate record without routing:** next and progress
  validate and report `oat_quick_start_gate`, but quick plan readiness stays
  the single routing rule for quick plans, defined once in quick-start and
  mirrored by the router and dashboard.

## Design Deltas

- **p01 destination guard:** the planned per-path denylist was replaced at the
  review cap by the destination rule above (operator disposition: simplify),
  dissolving six of nine p01 findings and cutting `bundle-assets.sh` by 36
  lines net. The rule applies only to an override, not the default
  destination (Deviations table, p01-t07).
- **Scope left at the plan-gate escalation:** the gate idle kill
  (`BL-260711-add-activity-aware-gate`) and the early complexity-review config
  key were dropped; an idle kill cannot serve Codex gates whose activity is not
  attributable to the gate child.
- **p04 placements:** complexity reports live under `reviews/archived/`
  because top-level `reviews/` files read as unprocessed reviews; the
  review-receive cycle count skips `complexity-*`; progress also reports the
  implement exit-gate record.
- **New output values:** the gate envelope gained `recursion: unchecked` for
  an unreadable marker directory, and `oat sync --json` gained an `error`
  operation for marker-less directories.

## Notable Challenges

- **p01 did not converge under review.** Three root rounds and two Codex gate
  attempts each found the next unlisted path an `OAT_ASSETS_DIR` override could
  overwrite. The complexity review at the cap classified the findings as one
  family; the operator chose simplify plus the root-cause fix and closed the
  p01 gate by override. The exit gate later found two more edge cases in the
  new rule (a newline-only filename and a symlinked destination), both fixed.
- **`main` moved three times.** #335 moved the target to 0.3.14 during
  planning; #342 (docs restructure, deleting two pages this wave edited) and
  #350 landed during closeout, requiring two merges, a docs port, and a bump
  to 0.3.16.

## Tradeoffs Made

- `BL-260909-restamp-a-stale-copy-strategy` shipped everything except retiring
  the compatibility bridge and legacy encoder, which must wait until field
  installs restamp; the item stays open with that scope.
- Three Medium findings were deferred rather than fixed in place because each
  needed a non-contained change; the final review resurfaced them and
  `p07-t04` shipped honest recovery routing, a caution, and the HiLL parsing
  fix, filing the remainder as backlog items.

## Integration Notes

- The updated skills need `oat` 0.3.16 or later for the new config keys.
- The dashboard HiLL fix affects every workflow mode: projects whose
  `oat_hill_checkpoints` use single-quoted, bare, or block arrays now show and
  route pending HiLL gates on the dashboard, as the router already did.
- Gate integration fixtures default their own `OAT_GATE_RUN_MARKER_DIR`; an
  inherited marker directory otherwise leaks claims across tests.

## Autonomous Execution Learnings

### Agent-instruction updates

- Keep the explicit "exactly one `**Reconnaissance:**` line in the artifact
  body (required)" sentence in every reviewer brief — one artifact omitted it
  and cost a round trip
  ([2026-10-02T20:20Z — gotcha — Reviewer artifact missing the reconnaissance signal](oat-execution-learnings.md)).
- Entry-point guards comparing a module URL with `argv[1]` should compare real
  paths — the mismatch under a symlinked checkout caused the Wave 3 disk fill
  ([2026-10-02T20:20Z — candidate-skill-content — Root cause of the Wave 3 disk fill](oat-execution-learnings.md)).

### Cloud-environment improvements

- Update the global `oat` CLI and user-scope skills between waves — gates and
  lifecycle skills ran 0.3.10 behavior, not the repository's (not authorized
  this wave)
  ([2026-10-02T12:33Z — environment-limited — Installed CLI and user skills lag main](oat-execution-learnings.md)).

### Code follow-ups

- Gitignore project review artifacts instead of committing them
  (`BL-261002-gitignore-project-review`, high) — operator-requested, sized as a
  separate PR across four skills, `oat init`, and a migration
  ([2026-10-02T13:40Z — decision — Operator request mid-run kept out of the wave](oat-execution-learnings.md)).

### Workflow issues

- When a guard grows one entry per review round, stop and ask for the general
  rule before the next fix — the per-path denylist cost two extra review
  cycles; the complexity review at the cap is the backstop
  ([2026-10-02T20:20Z — gotcha — A per-path denylist did not converge under review](oat-execution-learnings.md)).
- Re-fetch and compare `origin/main` versions at plan-gate time, and rebuild
  the branch CLI right after any merge from `main` — a stale build refused PJM
  writes with a bundled-assets version mismatch
  ([2026-10-02T13:40Z — gotcha — Main moved during planning; the branch CLI build went stale](oat-execution-learnings.md)).
- Rename the `codex-6-sol-xhigh` gate target id when user gate config is next
  edited, so receipts name the model they ran (`gpt-6.1-sol`)
  ([2026-10-02T12:33Z — decision — Reviewer target name is stale but resolves Sol 6.1](oat-execution-learnings.md)).

## Follow-up Items

- **Operator question:** amend `DR-260720` (autonomous closeout) to the
  shipped design — a standing `workflow.autonomousComplete` opt-in, per-wave
  completion with a recorded pre-merge exception, and batch mode at program
  close. Held for the operator; repository policy records decisions only on
  request.
- `BL-261002-route-validated-archive` — route validated archive receipts from
  `oat-project-complete-auto` to the interactive resume tail (p05 gate M1).
- `BL-261002-serialize-stale-gate-claim` — serialize stale gate-claim recovery
  with acquisition (p02 gate M1).
- `BL-261002-wire-the-complexity-review` — the sibling gate-capable skills
  (plan, import-plan, design, discover, lite).
- `BL-261002-port-the-complexity-review` — port the `complexity-review` skill
  into an OAT pack (the condensed fallback is interim).
- `BL-261002-teach-check-skill-bumps` — follow vendored `.agents/docs`
  symlinks.
- Still open: `BL-260909-restamp-a-stale-copy-strategy` (bridge retirement),
  `BL-260711-add-activity-aware-gate` (needs Codex activity attribution), and
  `BL-260818-distinguish-operator-directed` (rewritten to exclude the shipped
  complexity slice).

## Workflow Observations

### 2026-10-02 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:2,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/artifact-plan-review-2026-10-02T144731Z.md run=cf4607a4-0bbe-47fd-8299-da416f48f4c0

### 2026-10-02 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/artifact-plan-review-2026-10-02T145801Z.md run=fe6bbe0a-bc0a-498f-b29d-6255948827bf

### 2026-10-02 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/p01-review-2026-10-02T174337Z.md run=79f6824b-3a1a-496b-adcb-b7591c75abc1

### 2026-10-02 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/p01-review-2026-10-02T180245Z.md run=2546dc45-ffcf-4b2f-952c-9b70848a7771

### 2026-10-02 · structural · oat-project-implement · p01

Phase p01 complete (8/8 tasks): bundle-assets fail-closed and asset-root errno. Root review rounds 4, Codex gate attempts 2 (blocked on the destructive-publish family), complexity review at the cap; operator chose simplify plus the symlinked-checkout root-cause fix and closed the p01 gate by override.

### 2026-10-02 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p02-review-2026-10-02T192954Z.md run=75d9dbb7-8438-4c6b-8893-a7e95ea44cdf

### 2026-10-02 · structural · oat-project-implement · p02

Phase p02 complete (3/3 tasks): 30-minute artifact gate default and atomic duplicate-gate claim. One root review round (1 Medium, 3 Low fixed), Codex gate passed with 1 Medium (stale-recovery race) deferred to final.

### 2026-10-02 · structural · oat gate review · p03

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p03-review-2026-10-02T200622Z.md run=b2f32273-4392-4f7b-a573-b7be724d9ad6

### 2026-10-02 · structural · oat-project-implement · p03

Phase p03 complete (5/5 tasks): sync restamps stale copy hashes, legacy retirement bridge, missing SKILL.md for every skill dir, marker-less directories report an error. One root review round (1 Medium, 2 Low fixed), Codex gate passed with 1 Medium addressed now.

### 2026-10-02 · structural · oat gate review · p04

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p04-review-2026-10-02T213839Z.md run=e9d83e79-99bf-4c5f-9ade-babb2cc0a746

### 2026-10-02 · structural · oat-project-implement · p04

Phase p04 complete (9/9 tasks): complexity review at review and gate budget exhaustion (probe plus condensed fallback), persisted quick-start gate record read by next and progress, root judgment logging. One root review round (3 Medium, 3 Low fixed), interrupted gate run (findings fixed), clean Codex gate.

### 2026-10-02 · structural · oat-project-review-provide · p05

Review reconnaissance cda6fb19-ae51-463d-b84c-b7340ab122fd-review-recon completed in two read-only intelligent-recon lanes, reconciled by the primary reviewer; artifact=.oat/projects/shared/backlog-wave-4/reviews/p05-review-2026-10-02T221406Z.md.

### 2026-10-02 · structural · oat gate review · p05

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p05-review-2026-10-02T221406Z.md run=cda6fb19-ae51-463d-b84c-b7340ab122fd

### 2026-10-02 · structural · oat-project-implement · p05

Phase p05 complete (6/6 tasks): workflow.autonomousComplete opt-in, oat-project-complete-auto companion skill with three-layer guard and batch mode, wave closeout repoint, pr-final ledger prose. One root review round (2 Medium, 2 Low fixed), Codex gate passed (1 Medium addressed now, 1 Medium deferred to final, stale DR-260720 held for the operator).

### 2026-10-02 · structural · oat-project-review-provide · p06

Review reconnaissance completed: one intelligent-recon scout (gpt-6.1-sol medium), root verified evidence and retained 1 Medium; artifact=.oat/projects/shared/backlog-wave-4/reviews/p06-review-2026-10-02T224700Z.md; b55e726f-ec7f-49f1-ae85-67ac7b5ac0dd-recon

### 2026-10-02 · structural · oat gate review · p06

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p06-review-2026-10-02T224700Z.md run=b55e726f-ec7f-49f1-ae85-67ac7b5ac0dd

### 2026-10-02 · structural · oat-project-implement · p06

Phase p06 complete (4/4 tasks): recon reconciler downgrades thorough-review omissions, oat-wrap-up resolves its summary template, dashboard quick-plan routing matches the router. One root review round (1 Medium, 1 Low fixed), Codex gate passed with 1 Medium (textual HiLL array parsing) deferred to final.

### 2026-10-02 · structural · oat gate review · p07

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p07-review-2026-10-02T230925Z.md run=28bb7ade-a4f7-4d76-b713-187601ff7864

### 2026-10-02 · structural · oat-project-implement · p07

Phase p07 complete (3/3 tasks): lockstep 0.3.14, backlog closeout (11 closed, 1 won't-do, 3 rewritten, 2 filed), full Definition of Done exit 0. Root review and Codex gate passed with Lows only; two moved-item links repointed.

### 2026-10-03 · structural · oat-project-review-provide · final

Final gate review used three awaited consequential reconnaissance lanes with gpt-6.1-sol/high; primary independently reproduced 1 High and 1 Medium. Artifact: reviews/final-review-2026-10-03T000713Z.md. Run c945efcf-73f2-4528-b3b3-f8f7d365c776

### 2026-10-03 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:1,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/final-review-2026-10-03T000713Z.md run=c945efcf-73f2-4528-b3b3-f8f7d365c776

### 2026-10-03 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/final-review-2026-10-03T003215Z.md run=7c263e05-5c9b-4a15-a476-8ce39ee033b4

## PR #351 feedback follow-up

Three additional fix tasks (46 total) address stale gate recovery/release races and fail-closed I/O errors, loaded-sibling dispatch discovery, and synced autonomous-completion arrival/publication guards. `BL-261002-serialize-stale-gate-claim` is now closed. Mandatory checks and lint/format pass; CLI tests: 8,208 passing with no cache replay. Independent core review and bounded integration follow-up are complete; the final follow-up gate has zero findings. Regression controls reject the pre-fix states. No finding was deferred or waived.
