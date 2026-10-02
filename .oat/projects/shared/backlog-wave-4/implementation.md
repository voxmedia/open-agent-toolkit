---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_current_task_id: p04-t01
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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 8     | 8/8       |
| Phase 2 | complete    | 3     | 3/3       |
| Phase 3 | in_progress | 4     | 4/4       |
| Phase 4 | pending     | 7     | 0/7       |
| Phase 5 | pending     | 4     | 0/4       |
| Phase 6 | pending     | 3     | 0/3       |
| Phase 7 | pending     | 3     | 0/3       |

**Total:** 15/32 tasks completed

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

**Status:** in_progress

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

---

## Phase 4: Review-loop skills

**Status:** pending

### Task p04-t01: Add the condensed complexity-review guidance

**Status:** pending
**Commit:** -

### Task p04-t03: Run the complexity review at implement's exhaustion points and log root judgment

**Status:** pending
**Commit:** -

### Task p04-t04: Run the complexity review at review-receive's cycle cap

**Status:** pending
**Commit:** -

### Task p04-t05: Define the gate approval record once

**Status:** pending
**Commit:** -

### Task p04-t06: Persist quick-start gate outcomes and run the complexity review at QS-12

**Status:** pending
**Commit:** -

### Task p04-t07: Read both gate records in next and progress

**Status:** pending
**Commit:** -

### Task p04-t08: Update the autonomy contract and the docs for the review loop

**Status:** pending
**Commit:** -

---

## Phase 5: Completion

**Status:** pending

### Task p05-t01: Add the `workflow.autonomousComplete` opt-in

**Status:** pending
**Commit:** -

### Task p05-t02: Add the `oat-project-complete-auto` companion skill

**Status:** pending
**Commit:** -

### Task p05-t03: Point wave closeout at the companion skill

**Status:** pending
**Commit:** -

### Task p05-t04: Tighten the pr-final ledger scan boundary prose

**Status:** pending
**Commit:** -

---

## Phase 6: Small fixes

**Status:** pending

### Task p06-t01: Downgrade claims that thorough-profile reviews leave undisposed

**Status:** pending
**Commit:** -

### Task p06-t02: Resolve oat-wrap-up's summary template through the CLI

**Status:** pending
**Commit:** -

### Task p06-t03: Route quick plans on the dashboard by readiness

**Status:** pending
**Commit:** -

---

## Phase 7: Release fan-in

**Status:** pending

### Task p07-t01: Bump the lockstep public packages to 0.3.14

**Status:** pending
**Commit:** -

### Task p07-t02: Close out the backlog items

**Status:** pending
**Commit:** -

### Task p07-t03: Run the full Definition of Done

**Status:** pending
**Commit:** -

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

Pending (p07-t03).

## Final Summary (for PR/docs)

Pending.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Execution learnings: `oat-execution-learnings.md`
