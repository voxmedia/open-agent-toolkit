---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_current_task_id: null
oat_generated: false
---

# Implementation: backlog-wave-4

**Started:** 2026-10-02
**Last Updated:** 2026-10-02

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, fill the Final Summary (for PR/docs) section below with what was actually implemented.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 8     | 8/8       |
| Phase 2 | complete | 3     | 3/3       |
| Phase 3 | complete | 5     | 5/5       |
| Phase 4 | complete | 9     | 9/9       |
| Phase 5 | complete | 6     | 6/6       |
| Phase 6 | complete | 4     | 4/4       |
| Phase 7 | complete | 3     | 3/3       |

**Total:** 38/38 tasks completed

---

## Phase 1: Build assets

**Status:** complete

### Task p01-t01: Fail closed on empty bundle-inputs lookups

**Status:** completed
**Commit:** 01993f36e

### Task p01-t02: Report the errno when the assets root cannot be read

**Status:** completed
**Commit:** 0cf8c6492

### Task p01-t03: (review) Close p01 review findings M1, L1, L2

**Status:** completed
**Commit:** 1a1732d77

### Task p01-t04: (review) Close p01 gate finding H1

**Status:** completed
**Commit:** 8ef15f758

### Task p01-t05: (review) Correct the bundle destination guard comment (p01 re-review L1)

**Status:** completed
**Commit:** 062e8bf24

### Task p01-t06: (review) Close p01 gate retry finding H1 (linked notices source)

**Status:** completed
**Commit:** 05c71e7c8

### Task p01-t07: (review) Simplify the bundle destination guard and fix the symlinked-checkout root cause

**Status:** completed
**Commit:** a57968edd

### Task p01-t08: (review) Close p01 targeted re-review findings L1, L2

**Status:** completed
**Commit:** fbb3711c7

---

## Phase 2: Gate timeouts

**Status:** complete

### Task p02-t01: Give full-surface artifact reviews a 30-minute default

**Status:** completed
**Commit:** e1b753e7a

### Task p02-t02: Reject a duplicate live gate for the same project and scope

**Status:** completed
**Commit:** cdd6d0eed

### Task p02-t03: (review) Close p02 review findings M1, L1, L2, L3

**Status:** completed
**Commit:** 4fa3c6e13

---

## Phase 3: Sync correctness

**Status:** complete

### Task p03-t01: Restamp stale copy hashes and bridge legacy retirement

**Status:** completed
**Commit:** 5d0fe8865

### Task p03-t02: Report a missing SKILL.md for every canonical skill directory

**Status:** completed
**Commit:** c1b01ccaa

### Task p03-t03: Stop marker-less skill and agent directories from looping

**Status:** completed
**Commit:** d53936682

### Task p03-t04: (review) Close p03 review findings M1, L1, L2

**Status:** completed
**Commit:** 5313d24ec

### Task p03-t05: (review) Address p03 gate finding M1 (normalized executor path guard)

**Status:** completed
**Commit:** 078a140cc

---

## Phase 4: Review-loop skills

**Status:** complete

### Task p04-t01: Add the condensed complexity-review guidance

**Status:** completed
**Commit:** 664e2e297

### Task p04-t03: Run the complexity review at implement's exhaustion points and log root judgment

**Status:** completed
**Commit:** 5bcca212e

### Task p04-t04: Run the complexity review at review-receive's cycle cap

**Status:** completed
**Commit:** 32ac81088

### Task p04-t05: Define the gate approval record once

**Status:** completed
**Commit:** 0999bc975

### Task p04-t06: Persist quick-start gate outcomes and run the complexity review at QS-12

**Status:** completed
**Commit:** 0f325be20

### Task p04-t07: Read both gate records in next and progress

**Status:** completed
**Commit:** 1bb2e7020

### Task p04-t08: Update the autonomy contract and the docs for the review loop

**Status:** completed
**Commit:** 03933c299

### Task p04-t09: (review) Close p04 review findings M1, M2, M3, L1, L2

**Status:** completed
**Commit:** ac01c3144

### Task p04-t10: (review) Address findings from the interrupted p04 gate run

**Status:** completed
**Commit:** 4873e85e5

---

## Phase 5: Completion

**Status:** complete

### Task p05-t01: Add the `workflow.autonomousComplete` opt-in

**Status:** completed
**Commit:** 026f57881

### Task p05-t02: Add the `oat-project-complete-auto` companion skill

**Status:** completed
**Commit:** ba58a81c2

### Task p05-t03: Point wave closeout at the companion skill

**Status:** completed
**Commit:** 1c1e38b09

### Task p05-t04: Tighten the pr-final ledger scan boundary prose

**Status:** completed
**Commit:** 6edfc11b9

### Task p05-t05: (review) Close p05 review findings M1, M2, L2, L3

**Status:** completed
**Commit:** cc5d5da8b

### Task p05-t06: (review) Address p05 gate finding M2 (never create a PR from the companion)

**Status:** completed
**Commit:** 566a04f8e

---

## Phase 6: Small fixes

**Status:** complete

### Task p06-t01: Downgrade claims that thorough-profile reviews leave undisposed

**Status:** completed
**Commit:** 4e74872a0

### Task p06-t02: Resolve oat-wrap-up's summary template through the CLI

**Status:** completed
**Commit:** 82bc4f5a9

### Task p06-t03: Route quick plans on the dashboard by readiness

**Status:** completed
**Commit:** fee4b4c73

### Task p06-t04: (review) Close p06 review findings M1, L1 (dashboard quick-plan parity)

**Status:** completed
**Commit:** 712f8f05f

---

## Phase 7: Release fan-in

**Status:** complete

### Task p07-t01: Bump the lockstep public packages to 0.3.14

**Status:** completed
**Commit:** afc2fd95a

### Task p07-t02: Close out the backlog items

**Status:** completed
**Commit:** 59390951b

### Task p07-t03: Run the full Definition of Done

**Status:** completed
**Commit:** 1ecd4429b

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1

- Started: 2026-10-02; autonomous (`oat-project-autonomous`), Tier 1 subagents.
- Implement contract: installed user-scope `oat-project-implement` 2.3.15 (the branch edits the canonical skill in p04).
- Gate `IMPLEMENT-03`: HiLL checkpoints resolved to `["p07"]` (final phase, first run, field absent) with `oat_auto_review_at_hill_checkpoints: true`.
- Gate `IMPLEMENT-08`: not needed; Claude Code Task-tool dispatch of the generated `oat-phase-implementer` and `oat-reviewer` variants is available without extra authorization.
- Phase review gate: `oat_phase_review_gate` enabled for every phase (`review_type: code`, `exit_nonzero_on: high`); the configured target resolves to `codex-6-sol-xhigh` (`gpt-6.1-sol` xhigh) through cross-family exclusion with `OAT_GATE_PRODUCER_IDENTITY=claude-opus-5-5:declared`.
- Dispatch policy: managed `high` from project state; implementer and reviewer launches use the resolver-returned Claude variants after a validation-only `oat project dispatch record` with the branch CLI.

### Phase p01 dispatch

- Request `bw4-p01-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `01993f36e..0cf8c6492` (p01-t01..t02); phase verification pass (scoped vitest
  128 tests; CLI build with real HOME; isolated-HOME `turbo run test --force`
  for the CLI, cache bypass, 8049 tests); recovery 0/10; no skills changed.
  Failing-first and neutralize-and-restore recorded in both commit bodies.
  Root spot-check: `src/fs/assets.test.ts` 50/50 at `0cf8c6492`.
  `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Implementer concern (non-blocking, outside the item): an `OAT_ASSETS_DIR`
  inside a directory copied file by file (`.agents/agents`, `.oat/scripts`) is
  not rejected; candidate follow-up at the fan-in.

- Request `bw4-p01-review-1`: accepted; target
  `oat-reviewer-claude-claude-opus-5-5-high`; reconnaissance not-attempted;
  reviewed head `0b6b62319` (Step 7a ledger commit; ledger confirmed current);
  `reviews/archived/p01-review-2026-10-02T172532Z.md`: 0 Critical, 0 High,
  1 Medium, 2 Low (passes). Auto-review receive converted M1, L1, L2 to
  `p01-t03` (symlink-plus-`..` containment bypass; untested physical
  repository-root branch; destination equal to a file-copied source directory).
  `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-4-p01-fix-1` (same handle, fix mode):
  `1a1732d77` closed M1 (`cd -P`), L1 (repository-root symlink case), and L2
  (containment over every copied source directory, including agents, scripts,
  and the config folder); also fixed the lexical repository-root comparison,
  which never matched under macOS bash 3.2. Neutralize-and-restore per guard;
  28/28 guard cases; uncached CLI tests 8057 pass. Root spot-check:
  `bundle-consistency.test.ts` 57/57.

- Phase gate attempt 1 (`codex-6-sol-xhigh`, `gpt-6.1-sol` xhigh, run
  `79f6824b`, `exit_nonzero_on: high`) at `eafd73d19`:
  `reviews/archived/p01-review-2026-10-02T174337Z.md` status `blocked`, receive-eligible,
  1 High (an `OAT_ASSETS_DIR` equal to the individually copied `NOTICES.md`
  passes containment and publication replaces the file). Converted to
  `p01-t04`; routed to the original phase handle, then root review and the gate
  re-run (gate retry 1 of 2).

- Continuation `cont-backlog-wave-4-p01-fix-2` (same handle, fix mode):
  `8ef15f758` closed gate H1 (non-directory destination refused;
  `NOTICES.md` protected by physical path); three bounded cases with
  per-guard neutralization; uncached CLI tests 8060 pass. Root spot-check:
  `bundle-consistency.test.ts` passes.

- Request `bw4-p01-review-2` (re-review narrowed to `eafd73d19..66212d970`):
  accepted; reconnaissance not-attempted;
  `reviews/archived/p01-review-2026-10-02T175407Z.md`: 0 Critical, 0 High, 0 Medium,
  1 Low (passes; gate H1 confirmed fixed with reviewer-run neutralization).
  L1 split: the inaccurate guard comment converted to `p01-t05`; replacing an
  arbitrary existing destination directory is pre-existing behavior outside
  the item, deferred to a follow-up backlog item at the fan-in.

- Continuation `cont-backlog-wave-4-p01-fix-3`: `062e8bf24` comment-only (p01-t05); bundle-consistency 60/60.

- Phase gate retry 1 (run `2546dc45`) at `e1194eea7`:
  `reviews/archived/p01-review-2026-10-02T180245Z.md` `blocked`, receive-eligible, 1 High
  (a symlinked `NOTICES.md` leaves its target unprotected; non-default layout).
  Previous gate H1 confirmed fixed. Converted to `p01-t06` (refuse a linked
  individually copied source); gate retry 2 of 2 follows.

- Continuation `cont-backlog-wave-4-p01-fix-4`: `05c71e7c8` refuses a symlinked individually copied source (p01-t06); failing-first and neutralization recorded; uncached CLI tests 8061 pass; root spot-check bundle-consistency passes.

- Request `bw4-p01-review-3` (narrowed to `e1194eea7..360099ac8`): accepted;
  reconnaissance not-attempted; `reviews/archived/p01-review-2026-10-02T181434Z.md`:
  0 Critical, 1 High, 0 Medium, 2 Low. Gate retry H1 confirmed fixed; new H1:
  `.agents/docs`, reached through skill symlinks by `cp -RL`, is an
  unprotected destination in the real layout. L1: arbitrary-existing-directory
  follow-up untracked. L2: a symlinked checkout path makes inventory lookups
  print nothing (verified at `bundle-inputs.mjs` entry check; likely the Wave 3
  incident trigger).
- Review cap reached for p01 (three root rounds, two gate attempts). Complexity
  review `reviews/archived/complexity-p01-2026-10-02T1830Z.md`: partially
  compliant; family B (destructive publish through `OAT_ASSETS_DIR`) holds 6
  of 9 findings and every High, each fix adding one denylist entry; recommended
  disposition **simplify**.
- **Operator disposition (2026-10-02):** simplify plus the root-cause fix
  (`p01-t07`), one targeted root re-review, and no further phase-gate cycles
  for the destructive-publish family (the p01 phase gate is closed by operator
  override once the targeted re-review passes). R3 H1 and L1 are dissolved by
  the destination rule; L2 is fixed in `p01-t07`.

- Continuation `cont-backlog-wave-4-p01-fix-5`: `a57968edd` (p01-t07,
  `DONE_WITH_CONCERNS`): destination denylist replaced by the
  absent/empty/bundle rule for `OAT_ASSETS_DIR` overrides; recursion guard on
  `STAGING` vs skills, templates, docs; lexical root check dropped; symlinked
  checkout fixed (`pwd -P` plus real-path entry check). `bundle-assets.sh`
  net -36 lines; per-guard neutralization table recorded; uncached CLI tests
  8058 pass. Root spot-check: bundle-consistency 58/58; tracked default-asset
  files confirmed (`git ls-files packages/cli/assets`: four files).

- Request `bw4-p01-review-4` (operator-authorized targeted round,
  `360099ac8..9d0d66157`): accepted; reconnaissance not-attempted (signal
  line initially missing from the artifact; the same reviewer handle added it
  before receive); `reviews/archived/p01-review-2026-10-02T184328Z.md`: 0 Critical,
  0 High, 0 Medium, 2 Low (passes; simplification verified on the real tree, a
  fresh-clone archive, and a symlinked checkout). L1 (unreadable destination
  counts as empty) and L2 (root check depends on `pwd -P`, untested) converted
  to `p01-t08`, applied without a further p01 review round per the operator
  disposition; the final review and exit gate cover it.

- Continuation `cont-backlog-wave-4-p01-fix-6`: `fbb3711c7` (p01-t08) closed
  L1 (unreadable destination refused) and L2 (repository-root check normalizes
  both sides; `pwd -P` claim corrected); uncached CLI tests 8060 pass; root
  spot-check bundle-consistency 60/60.
- Phase p01 gate: closed by operator override at the review cap (two Codex
  gate attempts blocked on the destructive-publish family; the operator chose
  simplify with one targeted re-review and no further gate cycles). The final
  review and exit gate cover the whole p01 diff.
- Phase p01 outcome: complete; 8/8 tasks (2 planned, 6 review-fix); root
  review rounds 4 (one operator-authorized past the cap), gate attempts 2,
  complexity review 1.

### Phase p02 dispatch

- Request `bw4-p02-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `e1b753e7a..cdd6d0eed` (p02-t01..t02); phase verification pass (CLI check,
  type-check, docs check, build, isolated-HOME CLI vitest 8070); recovery
  0/10. Design notes: duplicate match on an absolute `projectRoot` added to
  the marker; legacy markers never block; an unreadable marker directory
  records `recursion: unchecked` (deviation, beyond `none`/`rejected`); pid
  reuse after a SIGKILL can block falsely (message names the marker).
  Root spot-check: gate-hardening integration 9/9.
  `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

- Step 7a ledger commit `d7f496827` before the review.
- Request `bw4-p02-review-1`: accepted; reconnaissance not-attempted;
  `reviews/archived/p02-review-2026-10-02T191106Z.md`: 0 Critical, 0 High, 1 Medium,
  3 Low (passes). Converted to `p02-t03`: M1 simultaneous duplicate launches
  both run (check before claim); L1 docs examples restore 900000; L2 nested
  detection depends on an inherited `TMPDIR`; L3 no real-first-gate test.
  `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-4-p02-fix-1`: `4fa3c6e13` (p02-t03): the
  directory scan was replaced by an atomic claim (private `wx` file hard-linked
  to a per project/type/scope claim path; dead holder replaced once; released
  in `finally`); `OAT_GATE_RUN_MARKER_DIR` passed to children; docs examples
  and duplicate-run docs updated; integration cases 8-10 (real first gate,
  simultaneous launch, differing `TMPDIR`). Gate suites 285/285; root
  spot-check gate-hardening integration passes.

- Phase gate (`codex-6-sol-xhigh`, run `75d9dbb7`) at `6a67d877d`:
  `reviews/archived/p02-review-2026-10-02T192954Z.md` status `ok`, receive-eligible,
  0 Critical/High, 1 Medium. Judgment sweep: M1 (stale-recovery race) deferred
  to final (Deferred Findings (Medium)).
- Phase p02 outcome: complete; 3/3 tasks (2 planned, 1 review-fix); one root
  review round, one passing gate.

### Phase p03 dispatch

- Request `bw4-p03-impl-1`: accepted and returned `DONE_WITH_CONCERNS`
  (validated success: concerns are mechanical file widening and a new
  operation value); target `oat-phase-implementer-claude-claude-opus-5-5-high`;
  commits `5d0fe8865..d53936682` (p03-t01..t03); phase verification pass
  (engine/drift/sync/validation 645; isolated-HOME CLI vitest 8104; check,
  type-check, lint, validate-skills, build exit 0; real-CLI probe of the
  marker-less loop and restamp); recovery 0/10. Restamp is a
  `restampContentHash` flag on `skip`; marker-less directories plan a new
  `error` operation (now in `oat sync --json`; PR behavior change). Mechanical
  widening accepted: `sync.utils.ts`, `ui/output.ts`, `engine.types.test.ts`,
  comment-only corrections in `drift/detector.ts`, `manifest/hash.ts`,
  `drift/detector.test.ts`, `managed-copy-hash.ts` (root verified no
  non-comment change in detector and hash). Root spot-check: drift and sync
  165/165.
  `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

- Step 7a ledger commit `2f98690d8` before the review.
- Request `bw4-p03-review-1`: accepted; reconnaissance not-attempted;
  `reviews/archived/p03-review-2026-10-02T195441Z.md`: 0 Critical, 0 High, 1 Medium,
  2 Low (passes; criteria 1-4 met, criterion 5 untouched). Converted to
  `p03-t04`: M1 restamp on a row whose provider path differs from the checked
  path creates a drift sync never clears; L1 dry-run summary misses `error`
  entries and the partial-failure message drops the restamp count; L2 sync
  docs page.
  `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-4-p03-fix-1`: `5313d24ec` (p03-t04)
  restamps only when the row tracks the checked provider path (planner and
  execute), counts `error` entries in dry-run `summary.failed`, keeps the
  restamp count on partial failure, and documents both in
  `provider-sync/commands.md`; engine/drift/sync 398 pass; root spot-check
  engine and sync pass.

- Phase gate (`codex-6-sol-xhigh`, run `b2f32273`) at `2fae69e03`:
  `reviews/archived/p03-review-2026-10-02T200622Z.md` status `ok`, receive-eligible,
  0 Critical/High, 1 Medium. Judgment sweep: M1 (executor path guard compares
  raw text while the planner normalizes) addressed now as `p03-t05` (small,
  contained); no re-review or re-gate for an address-now fix.

- Continuation `cont-backlog-wave-4-p03-fix-2`: `078a140cc` (p03-t05)
  normalizes the executor path guard like the planner; failing-first through
  the real manifest schema; engine and sync 326 pass; root spot-check engine
  passes.
- Phase p03 outcome: complete; 5/5 tasks (3 planned, 2 review-fix); one root
  review round, one passing gate (Medium addressed now).

### Phase p04 dispatch

- Request `bw4-p04-impl-1`: accepted and returned `DONE_WITH_CONCERNS`
  (validated success; deliberate deviations recorded); target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `664e2e297..03933c299` (p04-t01, t03-t08; no t02 by operator decision);
  phase verification pass (build; isolated-HOME validation and shared
  contracts 970; full CLI vitest 8130; check, type-check, lint,
  validate-skills, check:skill-bumps (8 skills), format:root, docs check);
  recovery 0/10. Skills bumped: implement 2.3.17, quick-start 2.3.18,
  review-receive 1.6.8, document 1.8.7, lite 1.1.7, pr-final 1.6.8, next
  1.1.5, progress 1.4.4. Deviations: complexity reports saved under
  `reviews/archived/` (top-level `reviews/` files read as unprocessed reviews
  by next and the control-plane scanner); receive cycle count skips
  `complexity-*`; implement SKILL.md line cap 246 to 251; progress also
  reports the implement exit-gate record. Root spot-check: symlinks, bundle
  `linkedFiles`, `NOTICES.md` entry, contract and inventory pins 59/59,
  check:skill-bumps OK.
  `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

- Step 7a ledger commit `ca1e002ac` before the review.
- Request `bw4-p04-review-1`: accepted; reconnaissance not-attempted;
  `reviews/archived/p04-review-2026-10-02T204339Z.md`: 0 Critical, 0 High, 3 Medium,
  3 Low (passes; the four implementer deviations judged correct). Converted to
  `p04-t09`: M1 unrecomputable quick-start fingerprint comparison; M2
  quick-start and review-receive lack the dispatch skill and `Task`; M3
  `oat-project-autonomous` not bumped though its inventory links the changed
  contract; L1 repeated complexity dispatch on re-entry; L2 absent-record and
  legacy-record wording. L3 (plan text still named top-level `reviews/`)
  fixed by the root in plan.md.
  `Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-4-p04-fix-1`: `ac01c3144` (p04-t09):
  records reported as recorded (fingerprint as provenance); quick-start and
  review-receive load the dispatch skill and grant `Task`, with routing
  outside implement; `oat-project-autonomous` 1.0.18 plus a vendor pin that
  finds every skill vendoring the autonomy contract; complexity report reuse
  rule; absent-record and legacy-record wording. Validation and shared
  contracts 973; validate-skills, check:skill-bumps (9), format:root exit 0.
  Root spot-check: complexity, gate-record, and inventory pins pass.

- Phase gate attempt (run `67e865c1`) at `fe2bd44b4` was interrupted by a
  host restart: it wrote `reviews/archived/p04-review-2026-10-02T205659Z.md` (0 Critical,
  0 High, 1 Medium, 1 Low) but returned no structured envelope, so it is not a
  receivable gate result and does not consume a gate attempt. The root
  verified both findings (M1: quick-start's project-disabled branch skips the
  record write; L1: minute-precision complexity report timestamps break the
  reuse rule) and added `p04-t10`; the p04 gate runs again afterward.

- Continuation `cont-backlog-wave-4-p04-fix-2`: `4873e85e5` (p04-t10): the
  project-disabled branch writes `allowed/project_disabled` before its jump
  (branch-specific pin); complexity reports use UTC seconds timestamps with a
  collision suffix. Validation and shared contracts 975; root spot-check of
  both contract files passes.

- Phase gate (`codex-6-sol-xhigh`, run `e9d83e79`) at `f5e4289f5`:
  `reviews/archived/p04-review-2026-10-02T213839Z.md` status `ok`, 0 findings.
- Phase p04 outcome: complete; 9/9 tasks (7 planned, 2 review-fix); one root
  review round, one interrupted gate run (findings addressed), one clean gate.

### Phase p05 dispatch

- Request `bw4-p05-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `026f57881..6edfc11b9` (p05-t01..t04); phase verification pass (build;
  config 623; isolated-HOME validation, shared contracts, tools 1531;
  validate-skills 66 skills; check:skill-bumps; format:root; docs check;
  type-check; check; root oxlint); recovery 0/10. New skill
  `oat-project-complete-auto` 1.0.0; wave-execute 1.9.6; wave-program 1.5.4;
  pr-final not re-bumped. Branch-CLI `sync --scope project` restamped the
  manifest `oatVersion` (committed with p05-t02). Root spot-check:
  complete-auto contracts pass.
  `Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

- Step 7a ledger commit `31b6ce71d` before the review.
- Request `bw4-p05-review-1`: accepted; reconnaissance not-attempted;
  `reviews/archived/p05-review-2026-10-02T220250Z.md`: 0 Critical, 0 High, 2 Medium,
  3 Low (passes). Converted to `p05-t05`: M1 wave-execute step 8 fallback runs
  `complete-state` after objective refusals; M2 the autonomous-lifecycle
  activation route admits any skill name; L2 Step 5.3 `SKILL_DIR` misuse; L3
  an opt-in control that cannot fail. L1 (`DR-260720` is stale versus the
  shipped standing opt-in and per-wave firing) needs an amending decision
  record, which repository policy reserves for an operator request or
  confirmation; carried to the PR as an operator question.
  `Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-4-p05-fix-1`: `cc5d5da8b` (p05-t05): step 8
  defers only on opt-in, PR-precondition, or unanswered-question stops
  (`refused_check` in the run report) and stops at a boundary otherwise; the
  autonomous-lifecycle route admits only a skill whose SKILL.md carries the
  exact invocation (none today); `SKILL_DIR` / `COMPLETE_SKILL_DIR` fixed; the
  opt-in control runs the skill's own Step 1 block. Shared contracts and
  validation 1000; build, validate-skills, check:skill-bumps, format:root,
  root oxlint, type-check exit 0. Root spot-check: complete-auto contracts pass.

- Phase gate (`codex-6-sol-xhigh`, run `cda6fb19`) at `fad16c301`:
  `reviews/archived/p05-review-2026-10-02T221406Z.md` status `ok`, receive-eligible,
  0 Critical/High, 2 Medium, 1 Low. Judgment sweep: M2 (interactive
  `createPrOnComplete` branch could create a PR the companion promises never to
  create) addressed now as `p05-t06`; M1 (archive-resume recovery blocked by
  preflight) deferred to final; L1 is the stale `DR-260720` already held for
  the operator.

- Continuation `cont-backlog-wave-4-p05-fix-2`: `566a04f8e` (p05-t06): the
  companion forces `SHOULD_OPEN_PR=false` after interactive Step 2 and before
  Step 11; composed controls read the real interactive rules; complete-auto
  27/27; shared contracts and validation 1003. Root spot-check passes.
- Phase p05 outcome: complete; 6/6 tasks (4 planned, 2 review-fix); one root
  review round, one passing gate (one Medium addressed now, one deferred to
  final, one Low held for the operator).

### Phase p06 dispatch

- Request `bw4-p06-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `4e74872a0..fee4b4c73` (p06-t01..t03); phase verification pass (`pnpm
check`, lint, build, type-check, isolated-HOME `turbo run test --force` 10/10
  uncached, test:smoke, test:skills, validate-skills, check:skill-bumps);
  recovery 0/10. recon 1.1.8, oat-wrap-up 1.0.4. The reconciler shares the
  publication rule through `requiredReviewKindsForProfile`; the renderer lists
  claims outside a required brief; the dashboard uses the router's exported
  `quickPlanNotReadyReason`. Implementer concern: a quick project at
  `plan:complete` with a not-ready plan still differs between dashboard and
  router (outside the item's `plan:in_progress` scope). Root spot-check: recon
  suite passes.
  `Dispatch: scope=p06 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

- Step 7a ledger commit `64f04c1b4` before the review.
- Request `bw4-p06-review-1`: accepted; reconnaissance not-attempted;
  `reviews/archived/p06-review-2026-10-02T223808Z.md`: 0 Critical, 0 High, 1 Medium,
  1 Low (passes). Converted to `p06-t04`: M1 dashboard `plan:complete` with a
  not-ready quick plan differs from the router; L1 pending plan HiLL ordering
  differs at `plan:in_progress`.
  `Dispatch: scope=p06 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-4-p06-fix-1`: `712f8f05f` (p06-t04): the
  dashboard applies the quick readiness gate at every plan-phase status and
  checks a pending HiLL first, as the router does; generate 30/30, router
  45/45. Root spot-check: generate passes.

- Phase gate (`codex-6-sol-xhigh`, run `b55e726f`) at `420660c21`:
  `reviews/archived/p06-review-2026-10-02T224700Z.md` status `ok`, receive-eligible,
  0 Critical/High, 1 Medium. Judgment sweep: M1 (textual HiLL array parsing in
  the dashboard) deferred to final.
- Phase p06 outcome: complete; 4/4 tasks (3 planned, 1 review-fix); one root
  review round, one passing gate.

### Phase p07 dispatch

- Request `bw4-p07-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `afc2fd95a..1ecd4429b` (p07-t01..t03): lockstep 0.3.14; 11 items archived
  `closed`, `BL-260908-retire-the-top-level-skill` archived `wont_do`; three
  items rewritten (BL-260711, BL-260909, BL-260818); two filed
  (`BL-261002-wire-the-complexity-review`,
  `BL-261002-teach-check-skill-bumps`); full Definition of Done exit 0 at
  `59390951b` (uncached tests: CLI 8172, control-plane 153). Recovery 0/10.
  Note: `oat pjm doctor` reports a pre-existing `backlog_completed_unarchived`
  warning class.
  `Dispatch: scope=p07 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

- Step 7a ledger commit `7d2b28957` before the review.
- Request `bw4-p07-review-1`: accepted; reconnaissance not-attempted;
  `reviews/archived/p07-review-2026-10-02T230322Z.md`: 0 Critical, 0 High, 0 Medium,
  2 Low (passes; narrowed and partial item summaries verified against shipped
  code). L1 (plan References and PR wording) fixed by the root in plan.md. L2
  (two links in the active `review-gate-integrity` project's `discovery.md`
  still point at moved item paths) left unchanged as another project's
  artifact; noted for the PR.
  `Dispatch: scope=p07 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Phase gate (`codex-6-sol-xhigh`, run `28bb7ade`) at `622ee0012`:
  `reviews/archived/p07-review-2026-10-02T230925Z.md` status `ok`, 0 Critical/High/Medium,
  1 Low (the same two moved-item links). Judgment sweep: addressed now by the
  root as a mechanical link repoint in `review-gate-integrity/discovery.md`
  (`e3ab48088`), scoped to the two links this wave's archive step broke.
- Phase p07 outcome: complete; 3/3 tasks; one root review round, one passing
  gate.

<!-- orchestration-runs-end -->

## Plan Gate Feedback (quick-start, QS-12)

The configured quick-start gate (`onFailure: block`, `maxAttempts: 2`,
target `codex-6-sol-xhigh`, `gpt-6.1-sol` xhigh) blocked on both attempts:

- Attempt 1 (run `cf4607a4`): 2 High. H1, quick-start completion with no
  configured gate; H2, the complete-auto PR-merge guard against
  wave-execute's completion-before-merge step. Both were resolved in the plan
  (p04-t06, p05-t02, p05-t03).
- Attempt 2 (run `fe6bbe0a`): 1 High. p01-t01 guarded only the docs tree,
  while staging must stay outside every recursively copied source (skills,
  templates, docs). Resolved in p01-t01 after the attempt; not re-gated.

Attempts are exhausted, so this is a `QS-12` repository-policy boundary under
`OAT_AUTONOMOUS=1`: the operator decides how to proceed. Each round found a
real but narrower contract gap (round 1: two composition gaps; round 2: one
scoped safety invariant), and no finding was rejected.

**Operator disposition (2026-10-02, `QS-12` boundary):** After the
complexity review (`reviews/archived/complexity-plan-2026-10-02T1520Z.md`,
verdict partially compliant, recommended disposition **simplify**), the
operator chose **simplify, then implement** without another plan-gate cycle;
next and progress report the quick-start record only; the recorded pre-merge
exception stays. On the operator's request for a recommendation, the agent
kept batch completion mode and dropped the idle kill
(`BL-260711-add-activity-aware-gate`) and the early-trigger config key. The
plan was revised accordingly (24 tasks); every phase remains gated.

## Implementation Log

Chronological execution is recorded per phase under Orchestration Runs above.

## Deferred Findings (Medium)

- p06 gate M1 (`reviews/archived/p06-review-2026-10-02T224700Z.md`): the dashboard's HiLL
  membership check (`generate.ts` `phaseInHillList`) recognizes only the
  double-quoted array spelling, so a quick project with
  `oat_hill_checkpoints: ['plan']` or `[plan]` and a ready plan gets implement
  on the dashboard but `oat-project-plan` from the router. The textual parser
  predates this wave; quick projects carry no HiLL checkpoints by default.
  Fixing it means reading the shared parsed state in the dashboard; deferred
  to final with this rationale.
- p05 gate M1 (`reviews/archived/p05-review-2026-10-02T221406Z.md`): the companion's
  active-directory preflight refuses before the interactive archive-resume
  recovery can run, so autonomous closeout cannot finish after a synced
  archive succeeds and a later push or PR update fails. Fixing it means routing
  validated archive receipts to the interactive resume tail before preflight,
  which is not a small contained change; deferred to final with this
  rationale.
- p02 gate M1 (`reviews/archived/p02-review-2026-10-02T192954Z.md`): competing stale-claim
  recovery can remove a live claim and admit a duplicate run. Needs an
  orphaned claim plus concurrent recovery; ordinary nested and simultaneous
  launches are protected. The fix serializes recovery with acquisition, which
  is not a small contained change; deferred to final with this rationale.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented                               | Actual / Accepted                                                                    | Reason                                                                                                                                                                                                   | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------- |
| p01-t07       | plan.md p01-t07 | Destination rule applies to the assets destination | Rule applies only to an `OAT_ASSETS_DIR` override; the default destination is exempt | A fresh clone tracks four files under `packages/cli/assets` while `bundle-metadata.json` is gitignored, so the rule would refuse every CI build; the exemption has its own test and neutralization proof | Implementation  | None      |

## Test Results

Full Definition of Done (p07-t03), 2026-10-02, at head
`59390951b9237d52c635cab2f34db28cf7bb7480` (after p07-t02; the p07-t03 commit
changes only this section). Each gate ran as `<gate> > <log> 2>&1` with its
exit code captured explicitly; logs are under
`.oat/repo/analysis/backlog-wave-4/dod/` (gitignored, machine-local).
`release:check-versions` ran after `git fetch origin main` (exit 0; `origin/main`
at 0.3.13).

| Order | Gate                                                 | Exit | Notes                                                                                                                  |
| ----- | ---------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| 0     | `pnpm build` (real `HOME`)                           | 0    | 0 cached, 5 total                                                                                                      |
| 1     | `pnpm check`                                         | 0    | 0 cached, 11 total                                                                                                     |
| 2     | `pnpm type-check`                                    | 0    | 0 cached, 10 total                                                                                                     |
| 3     | `HOME=$(mktemp -d) pnpm exec turbo run test --force` | 0    | 0 cached, 10 total; no cache replay; CLI 8172 tests / 406 files, control-plane 153, docs-config 10, docs-transforms 31 |
| 4     | `pnpm build`                                         | 0    | 0 cached, 5 total                                                                                                      |
| 5     | `pnpm run check:skill-bumps`                         | 0    | 14 changed skill and agent role bump checks against `origin/main`                                                      |
| 6     | `pnpm release:check-versions`                        | 0    | lockstep 0.3.14 above `origin/main` 0.3.13                                                                             |
| 7     | `pnpm release:validate`                              | 0    | five 0.3.14 tarballs validated                                                                                         |
| 8     | `pnpm build:docs`                                    | 0    | 0 cached, 6 total                                                                                                      |
| -     | `pnpm test:smoke`                                    | 0    | 163 pass, 0 fail                                                                                                       |
| -     | `pnpm test:skills`                                   | 0    | 693 pass, 0 fail                                                                                                       |
| -     | `pnpm test:scripts`                                  | 0    | 1 pass, 0 fail                                                                                                         |
| -     | `pnpm lint`                                          | 0    | includes root `oxlint tools/smoke .agents/skills`                                                                      |
| -     | `pnpm format`                                        | 0    |                                                                                                                        |

## Final Summary (for PR/docs)

**What shipped (behavior):**

- `bundle-assets.sh` fails closed: an empty, absolute, escaping, or
  repository-root inventory lookup stops the build before any copy; staging can
  never sit inside the skills, templates, or docs source; an
  `OAT_ASSETS_DIR` override is accepted only when it is absent, an empty
  directory, or an existing bundle. A checkout reached through a symlinked
  path now resolves inventory lookups (the likely trigger of the Wave 3 disk
  fill). Asset-root read failures report their errno.
- Artifact gate reviews default to 30 minutes. A second gate for the same
  project, review type, and scope is rejected through an atomic claim
  (`recursion` in the JSON envelope); nested gates receive the claim directory
  explicitly.
- `oat sync` restamps stale copy-strategy hashes (visible in dry-run and JSON,
  only when the manifest row tracks the checked path), bridges legacy digests
  when retiring obsolete copies, and reports a marker-less skill or agent
  directory as an `error` entry instead of rewriting it forever.
  `oat:validate-skills` reports a missing `SKILL.md` in any skill directory.
- When a review cycle or gate attempt budget runs out, implement, quick-start,
  and review-receive run a read-only complexity review (the installed
  `complexity-review` skill, or OAT's condensed fallback) and present it with
  the stop reasons and a **simplify** option; agents never pick the
  disposition, including under `OAT_AUTONOMOUS=1`.
- Quick-start persists its gate outcome as `oat_quick_start_gate`, defined
  once in a shared gate-record doc; next and progress report it. Root agents
  log judgment entries to the project log.
- New `workflow.autonomousComplete` opt-in and the `oat-project-complete-auto`
  companion skill (three-layer guard, recorded pre-merge exception for
  wave-execute, batch mode, never creates a PR); wave-execute and
  wave-program point at it.
- Recon reconciliation downgrades claims a thorough-profile review leaves
  undisposed; `oat-wrap-up` resolves its summary template through
  `oat template resolve`; the dashboard routes quick plans exactly as the
  router does; pr-final's ledger scan prose is precise.

**Key files:** `packages/cli/scripts/bundle-{assets.sh,inputs.mjs}`,
`packages/cli/src/fs/assets.ts`, `packages/cli/src/commands/gate/index.ts`,
`packages/cli/src/engine/{compute,execute}-plan.ts`,
`packages/cli/src/commands/sync/*`, `packages/cli/src/validation/skills.ts`,
`packages/cli/src/config/*`, `packages/cli/src/commands/state/generate.ts`,
`packages/control-plane/src/{index.ts,recommender/router.ts}`,
`.agents/docs/{complexity-review-fallback,gate-approval-record}.md`,
`.agents/skills/oat-project-{implement,quick-start,review-receive,next,progress,complete-auto,pr-final}/`,
`.agents/skills/{oat-wave-execute,oat-wave-program,recon,oat-wrap-up}/`.

**Verification:** full Definition of Done exit 0 (see Test Results); every
phase passed a root review and a Codex GPT-6.1 Sol phase gate (p01's gate
closed by operator override after simplification).

**Design deltas:** p01 replaced its per-path destination denylist with one
destination rule at the review cap (operator decision); the idle kill and
early complexity trigger left the wave at the plan-gate escalation; see
Deviations and Deferred Findings.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Execution learnings: `oat-execution-learnings.md`
