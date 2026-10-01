---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_current_task_id: p06-t01
oat_generated: false
---

# Implementation: backlog-wave-3

**Started:** 2026-10-01
**Last Updated:** 2026-10-01

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
| Phase 1 | complete    | 5     | 5/5       |
| Phase 2 | complete    | 6     | 6/6       |
| Phase 3 | complete    | 10    | 10/10     |
| Phase 4 | complete    | 6     | 6/6       |
| Phase 5 | in_progress | 6     | 6/6       |
| Phase 6 | pending     | 3     | 0/3       |

**Total:** 33/36 tasks completed

---

## Phase 1: Template resolver

**Status:** complete

### Task p01-t01: Share one template resolver in repository, user, bundle order

**Status:** completed
**Commit:** c7b78324d

### Task p01-t02: Add `oat template resolve`

**Status:** completed
**Commit:** ed5a2c3ca

### Task p01-t03: Route lifecycle skills through the resolver

**Status:** completed
**Commit:** c1886c3fc

### Task p01-t04: (review) Close p01 review findings M1, L1

**Status:** completed
**Commit:** 294618df8

### Task p01-t05: (review) Close p01 gate findings M1, L1

**Status:** completed
**Commit:** 4596d3956

---

## Phase 2: Fumadocs navigation

**Status:** complete

### Task p02-t01: Write Fumadocs `meta.json` from Contents maps

**Status:** completed
**Commit:** 580e7045c

### Task p02-t02: Describe both frameworks in help and docs

**Status:** completed
**Commit:** d7d9d706a

### Task p02-t03: Generate and commit `apps/oat-docs` navigation

**Status:** completed
**Commit:** 7643d548f

### Task p02-t04: Update the docs skills

**Status:** completed
**Commit:** 77a9669bd

### Task p02-t05: (review) Close p02 review findings M1-M3, L1-L3

**Status:** completed
**Commit:** 6f533ac7c

### Task p02-t06: (review) Close p02 gate findings M1, M2, L1

**Status:** completed
**Commit:** 35e104eb3

---

## Phase 3: Recon publication and Codex recovery

**Status:** complete

### Task p03-t01: Share review-brief source binding

**Status:** completed
**Commit:** b9482e67d

### Task p03-t02: Keep the coverage downgrade, drop the per-statement gap rule

**Status:** completed
**Commit:** 59756283f

### Task p03-t03: Structure unresolved issues

**Status:** completed
**Commit:** b08951bdd

### Task p03-t04: Prove recon's negative controls against helper output

**Status:** completed
**Commit:** 47c0e5f81

### Task p03-t05: Document the Codex agent-limit gotcha and allow one bounded retry

**Status:** completed
**Commit:** c4505feb3

### Task p03-t06: (review) Close p03 review findings H1, M2, L1

**Status:** completed
**Commit:** e60ec3a72

### Task p03-t07: (review) Close p03 round-2 findings H1, M1, M2

**Status:** completed
**Commit:** a28109fc3

### Task p03-t08: (review) Close p03 round-3 findings H1, M1, M2

**Status:** completed
**Commit:** 0101fd21c

### Task p03-t09: Simplify recon brief integrity and drop the omission-gap rule

**Status:** completed
**Commit:** b880bccf4

### Task p03-t10: (review) Close p03 gate finding M1

**Status:** completed
**Commit:** 8c2f74e76

---

## Phase 4: Lifecycle closeout guards

**Status:** complete

### Task p04-t01: Recompute next's exit-gate fingerprint with the v2 exclusions

**Status:** completed
**Commit:** 91fcf42e1

### Task p04-t02: Add a CLI closeout check and make complete-state refuse a missing snapshot

**Status:** completed
**Commit:** 84e37c0de

### Task p04-t03: Route terminal closeout through the check

**Status:** completed
**Commit:** 57f8ca1df

### Task p04-t04: Add operator-only exit-gate waivers

**Status:** completed
**Commit:** e9ac593f9

### Task p04-t05: (review) Close p04 review findings M1, L1-L3

**Status:** completed
**Commit:** 06051d26f

### Task p04-t06: (review) Close p04 gate findings M1, L1

**Status:** completed
**Commit:** deb4c200f

---

## Phase 5: Small fixes

**Status:** in_progress

### Task p05-t01: Keep `instructions sync --force` from overwriting a linked CLAUDE.md

**Status:** completed
**Commit:** b6afdb905

### Task p05-t02: Remove dispatch-record persistence

**Status:** completed
**Commit:** a92f397fd

### Task p05-t03: Let test-only changes skip the lockstep bump

**Status:** completed
**Commit:** 35d2fcc50

### Task p05-t04: Report YAML errors with their location and check key types

**Status:** completed
**Commit:** da264d338

### Task p05-t05: Route quick-mode discovery to quick-start

**Status:** completed
**Commit:** 5f827139a

### Task p05-t06: Narrow the packs inventory redaction claim

**Status:** completed
**Commit:** 09ff750c4

---

## Phase 6: Release fan-in

**Status:** pending

### Task p06-t01: Bump the lockstep public packages to 0.3.10

**Status:** pending
**Commit:** -

### Task p06-t02: Archive the shipped backlog items

**Status:** pending
**Commit:** -

### Task p06-t03: Run the full Definition of Done

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1

- Started: 2026-10-01; autonomous (`oat-project-autonomous`), Tier 1 subagents.
- Implement contract: `oat-project-implement` 2.3.14 as of `origin/main`
  (`8f6d5b1d2`), not the installed user-scope 2.3.12 and not this branch's
  working tree, which p01 and p04 edit (see the learnings log).
- Gate `IMPLEMENT-03`: HiLL checkpoints resolved to `["p06"]` (final phase,
  first run, field absent) with `oat_auto_review_at_hill_checkpoints: true`.
- Gate `IMPLEMENT-08`: not needed; Claude Code Task-tool dispatch of the
  generated `oat-phase-implementer` and `oat-reviewer` variants is available
  without extra authorization.
- Phase review gate: `oat_phase_review_gate` enabled for every phase
  (`review_type: code`, `exit_nonzero_on: high`); the configured target
  resolves to `codex-6-sol-xhigh` through cross-family exclusion with
  `OAT_GATE_PRODUCER_IDENTITY=claude-opus-5-5:declared`.
- Dispatch policy: managed `high` from project state; implementer and reviewer
  launches use the resolver-returned Claude variants after a validation-only
  `oat project dispatch record` with the branch CLI.

### Phase p01 dispatch

- Request `bw3-p01-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `c7b78324d..c1886c3fc` (p01-t01..t03), phase verification pass (CLI
  `src/commands` + `src/validation` 5823 tests; `pnpm check` 0/11 cached),
  recovery 0/10, 14 skills bumped once.
  `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Step 7a ledger commit `de9c98848` before the review.
- Request `bw3-p01-review-1`: accepted; target
  `oat-reviewer-claude-claude-opus-5-5-high`; reconnaissance not-attempted;
  reviewed head `de9c98848` (the Step 7a bookkeeping commit);
  `reviews/archived/p01-review-2026-10-01T112852Z.md`: 0 Critical, 0 High,
  1 Medium, 2 Low (passes). No ledger or resume-pointer finding: L2 concerned
  the deviations table, not the task ledger, which the reviewer confirmed
  current (`BL-260829` evidence; implement contract 2.3.14 from `origin/main`).
  M1 and L1 converted to `p01-t04`; L2 handled by root (Deviations table).
  `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`
- Continuation `cont-backlog-wave-3-p01-fix-1` (same handle, fix mode):
  `294618df8` closed M1 (retro and summary `allowed-tools` grants, pinned;
  failing-first recorded) and L1 (docs placement); src/validation 391 tests,
  validate-skills, skill bumps, docs check all exit 0.

- Phase gate (`codex-6-sol-xhigh`, `exit_nonzero_on: high`) at `91b1dde7c`:
  `reviews/archived/p01-review-2026-10-01T114001Z.md` status `ok`,
  receive-eligible, 0 Critical/High, 1 Medium, 1 Low. Judgment sweep: both
  addressed now as `p01-t05` (`4596d3956`: `Bash(oat template:*)` for design,
  spec, and plan; docs precedence claim limited to lifecycle and PJM
  templates; design and plan prompt sites re-keyed).
- Phase p01 outcome: pass after one review-fix round and one gate-fix task
  (p01-t04, p01-t05); 5/5 tasks.

### Phase p02 dispatch

- Request `bw3-p02-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `580e7045c..77a9669bd` (p02-t01..t04); nav sync on `apps/oat-docs` wrote 11
  `meta.json` files with nothing unlisted; `build:docs` 0/6 cached; recovery
  0/10; four docs skills bumped (analyze minor).
  `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Step 7a ledger commit `c129e82ab` before the review.
- Request `bw3-p02-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted) at `c129e82ab`:
  `reviews/archived/p02-review-2026-10-01T120623Z.md`, 0 Critical/High,
  3 Medium, 3 Low (passes); no ledger or resume-pointer finding (the reviewer
  confirmed the task ledger current). All six converted to `p02-t05`.
  `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`
- Continuation `cont-backlog-wave-3-p02-fix-1`: `6f533ac7c` closed M1
  (`nav sync --check` in `prebuild`; a probe page made prebuild exit 1), M2
  (`.mdx` targets), M3 and L1 (docs), L2 (detection tests with
  neutralize-and-restore), L3 (plain-text titles); 277 tests and an uncached
  `build:docs` pass.

- Phase gate (`codex-6-sol-xhigh`) at `4fa0c5f32`:
  `reviews/archived/p02-review-2026-10-01T122403Z.md` status `ok`, 0
  Critical/High, 2 Medium, 1 Low. Judgment sweep: all three addressed now as
  `p02-t06`.

- Continuation `cont-backlog-wave-3-p02-fix-2`: `35e104eb3` closed gate M1
  (merged-metadata index inclusion; real-loader tests for ordinary and
  `root: true` folders), M2 (read-only `Bash(oat docs nav sync --check:*)`
  grant, pinned), L1 (`--target-dir` in the analysis command); 583 tests pass.
- Phase p02 outcome: pass after one review-fix round and one gate-fix task
  (p02-t05, p02-t06); 6/6 tasks.

### Phase p03 dispatch

- Request `bw3-p03-impl-1`: accepted and returned `DONE_WITH_CONCERNS` (all
  success invariants passed; concerns non-blocking); target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `b9482e67d..c4505feb3` (p03-t01..t05); recon 344/344, `pnpm lint`,
  `pnpm format`, `pnpm check` exit 0; recovery 0/10.
  `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Step 7a ledger commit `3769d125f` before the review.
- Request `bw3-p03-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted) at `3769d125f`:
  `reviews/archived/p03-review-2026-10-01T130314Z.md`, 0 Critical, 1 High
  (an extra brief claim, even one carrying an injected source, validates), 3
  Medium, 1 Low (blocking). No ledger or resume-pointer finding. H1, M2, L1
  converted to `p03-t06`.
  `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`
- Root merge `a8e2d2cd4`: PR #334 (Sonnet 5.5 and GPT-6.1 Sol pins) merged
  to `main` during p03 with lockstep 0.3.10, `oat-dispatch-subagents` 1.2.11,
  and `oat-project-implement` 2.3.15, colliding with this branch's bumps
  (review M3). Merged `origin/main`, resolved two `skills.test.ts` pin hunks,
  and moved implement to 2.3.16 and dispatch-subagents to 1.2.12; the fan-in
  lockstep target is now 0.3.11. `check:skill-bumps` (20), recon and implement
  node tests, and `src/validation` pass.

- Continuation `cont-backlog-wave-3-p03-fix-1`: `e60ec3a72` closed H1
  (brief claims bound to ledger claims with exact projection; both injection
  probes fail closed; deviation from strict equality recorded and accepted by
  root), M2 (Review Downgrades section in `packet.md`), L1 (admission-retry
  label and worst case); recon 349/349, `pnpm lint` exit 0.

- Request `bw3-p03-review-2` (round 2) at `a3d625b31`:
  `reviews/archived/p03-review-2026-10-01T131855Z.md`, 0 Critical, 1 High
  (binding enforced for verification briefs only; adversarial and coverage
  briefs still accept injected entries), 2 Medium (an omitted-disposition
  claim can hide in a `complete` packet; the duplicate-ID clause had no
  failing test), 1 Low (PR list). Deviation adjudicated sound: the
  omitted-disposition path cannot promote a claim to verified. Round-1 M3, M4,
  L1 closed; merge `a8e2d2cd4` lost nothing. H1, M1, M2 converted to
  `p03-t07` (third and final cycle under the review cap); L1 fixed in the PR
  Requirements.
  `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-3-p03-fix-2`: `a28109fc3` closed round-2
  H1 (binding for every brief type; three probes fail closed), M1
  (`REVIEW_DISPOSITION_OMITTED` gaps from the reconciler, shared
  `review-omissions.mjs`, `MISSING_REVIEW_OMISSION_GAP` at publication,
  "not reviewed" in Review Downgrades), M2 (duplicate-ID test); fixtures now
  have every required review dispose of `claim-2`; recon 356/356.

- Request `bw3-p03-review-3` (round 3, final cycle under the review cap) at
  `18012ae90`: `reviews/archived/p03-review-2026-10-01T133903Z.md`, 0
  Critical, 1 High (brief `questions` and `scope` fields, copied from the
  manifest request, are never checked, so an injected note in an adversarial
  or coverage brief still publishes; pre-existing), 2 Medium (the
  contested/unsupported exemption trusts a forgeable status; the five gap-match
  checks are unpinned), 1 Low (deviation row and release-note wording). All
  round-2 findings closed. Retry exhaustion: the run stops at a boundary for an
  operator decision (`IMPLEMENT` review-cap boundary).
  `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Operator decision (2026-10-01): "One more fix round" — a fourth fix cycle
  beyond the review cap, covering round-3 H1, M1, M2 (and L1 as root
  bookkeeping), with the Codex phase gate reviewing the result instead of a
  fourth root review. Converted to `p03-t08`.

- Continuation `cont-backlog-wave-3-p03-fix-3`: `0101fd21c` closed round-3
  H1 (one request projection for `scope`, `questions`, and `excludedInputs`
  bound for every brief type; brief-field audit: every field bound or
  structurally fixed; `id` limited to a 64-character slug and `createdAt` to
  UTC ISO-8601, not bound), M1 (omission exemption read from `rejected` or
  adversarial `challenged` dispositions), M2 (table test pinning each gap-match
  check); recon 375/375. Residual: the brief `id` is constrained, not derived.

- Complexity review (requested by the operator after three review rounds),
  read-only over the committed p03 range: partially compliant. The requested
  fixes are proportionate; field-by-field brief binding cannot converge (three
  Highs in one family) and the omission-gap rule is unsupported by any
  criterion. Operator decision (2026-10-01): apply it as `p03-t09`, including
  deleting the omission-gap rule. The Codex phase gate reviews the result.

- Continuation `cont-backlog-wave-3-p03-fix-4`: `b880bccf4` applied the
  complexity review: one rebuild-and-compare brief check (every brief type is
  built from the prior ledger, so no overlay was needed), the omission-gap rule
  deleted (omission behaves like `uncertain`, listed "not reviewed"), one issue
  classifier, one shared disposition table, a 17-row tamper table that fails
  as a whole when the check is neutralized; net -672 lines (production scripts
  +172/-399); recon 357/357.

- Phase gate (`codex-6-sol-xhigh`) at `2cb68863a`:
  `reviews/archived/p03-review-2026-10-01T165604Z.md` status `ok`, 0
  Critical/High, 1 Medium (each brief rebuilt once per verified claim;
  quadratic validation). Addressed now as `p03-t10`.

- Continuation `cont-backlog-wave-3-p03-fix-5`: `8c2f74e76` closed gate M1
  (one rebuild per brief per validation pass via a pass-scoped checker; a
  rebuild-count test failed first at 12 and passes at 3); 800-claim
  validation 4,402 ms to 97 ms; recon 358/358.
- Phase p03 outcome: pass after three root review rounds, an operator-extended
  fourth fix round, an operator-approved complexity-review simplification, and
  one gate-fix task (p03-t06..t10); 10/10 tasks.

### Phase p04 dispatch

- Request `bw3-p04-impl-1`: accepted and returned `DONE_WITH_CONCERNS` (all
  success invariants passed); target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `91fcf42e1..e9ac593f9` (p04-t01..t04); vitest 5897, implement node tests 37,
  `pnpm check` 0/11 cached, one neutralization per clause; recovery 0/10;
  bumped next 1.1.4, complete 1.7.14, pr-final 1.6.7.
  `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Step 7a ledger commit `310f3902b`; root then committed the operator-requested
  backlog records `3b50bc41d` (outside the phase).
- Request `bw3-p04-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted) at `310f3902b`:
  `reviews/archived/p04-review-2026-10-01T174412Z.md`, 0 Critical/High,
  2 Medium (waiver unreachable once implement persists `stale`; missing p04
  deviation rows), 3 Low (passes). No ledger or resume-pointer finding. M1 and
  L1-L3 converted to `p04-t05`; M2 handled by root (Deviations table).
  `Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

- Continuation `cont-backlog-wave-3-p04-fix-1`: `06051d26f` closed M1 (a
  stale-boundary waiver offer before `stale` is persisted: interactive asks,
  autonomous reruns the gate and never waives; next 5.0 mirrors it), L1
  (no-op trace step removed), L2 (comment placement), L3 (`nextOwner` names
  `approval: approved` or `not_required`); three new prompt sites mapped `NG`;
  2165 tests pass.

- Phase gate (`codex-6-sol-xhigh`) at `5033a7f56`:
  `reviews/archived/p04-review-2026-10-01T180727Z.md` status `ok`, 0
  Critical/High, 1 Medium (a failed snapshot can name a post-approval step
  before approval), 1 Low (docs say autonomous stale handling stops).
  Addressed now as `p04-t06`.

- Continuation `cont-backlog-wave-3-p04-fix-2`: `deb4c200f` closed gate M1
  (approval-aware owner order for failed snapshots; the gate's fixture is a
  command-boundary regression that failed first) and L1 (docs); 1254 tests.
- Phase p04 outcome: pass after one review-fix task and one gate-fix task
  (p04-t05, p04-t06); 6/6 tasks.

### Recovery Event bw3-p05-recovery-1

- Phase/task: p05 / p05-t02
- Original request: bw3-p05-impl-1
- Original commit: a92f397fd67c5bb4db037fe6dc6bee3d91bd73e4
- Defect class: test
- Discovered by: `HOME=$(mktemp -d) pnpm exec vitest run src/commands/project src/e2e src/commands/commands.integration.test.ts`; phase: `vitest run src/commands src/validation src/release`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 6e2cc2956a662791c8808a0bfc437c090ff1ecd6
- Verification: focused 1362/1362 and phase 5979/5979 before and after the commit; whole CLI suite 8012/8012
- Reason: three test files outside p05-t02's verification set still used `--project` or the removed opt-in wording; test-only bounded correction

<!-- orchestration-runs-end -->

---

## Plan Gate Feedback (quick-start, QS-12)

Configured gate: `oat-project-quick-start` exit gate, `onFailure: block`,
`maxAttempts: 2`, reviewer `codex-6-sol-xhigh` (selected by cross-family
exclusion with `OAT_GATE_PRODUCER_IDENTITY=claude-opus-5-5:declared`).

- Attempt 1 (`reviews/artifact-plan-review-2026-10-01T061917Z.md`, blocked,
  1 High, 2 Medium): H1 no executable closeout transition proof; M1 the
  `--force` apply-time re-check could not be shown load-bearing; M2 scoped
  recon issues lacked fail-closed validation. Resolved in `b76f27dd3` (H1
  disk-backed trace plus this project's own closeout as live evidence; M2
  closed union bound to covered claims; M1 by removing the re-check per the
  complexity review).
- Attempt 2 (`reviews/artifact-plan-review-2026-10-01T063044Z.md`, blocked,
  1 High, 1 Medium): H1 the `BL-260806` archive was placed inside the
  documentation child, before the PR child, approval, and completion it must
  cite; M1 the staged recon end-to-end test could not be green at each task
  boundary. Both resolved in the plan after the attempt (root-owned archive
  after Step 16; shared fixture with focused per-defect tests, full
  assertion activated in p03-t03), without a further gate run.

Attempts are exhausted with the last findings resolved in the plan but not
re-gated, so implementation readiness waits on an operator decision (QS-12
boundary). The plan keeps its pre-review frontmatter until then.

Operator disposition (2026-10-01): the operator chose "Proceed to implement",
accepting the post-gate fixes without a third gate run. QS-12 resolved by
explicit operator decision; the plan was then marked ready.

## Implementation Log

Chronological log of implementation progress.

### 2026-10-01

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-10-01

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact                  | Planned / Documented                                                   | Actual / Accepted                                                                                                                                                                                                                                              | Reason                                                                                                                           | Source of Truth | Follow-up                                                                   |
| ------------- | -------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| p01-t01       | plan.md p01-t01                  | Move the resolver; flip one scaffold test                              | Also updated `promote.test.ts` and a second user-first scaffold test; lazy `assetsRoot`; "PJM" dropped from the invalid-name message                                                                                                                           | Required by the declared change                                                                                                  | Implementation  | None                                                                        |
| p01-t02       | plan.md p01-t02                  | Command over the shared resolver                                       | Added `TemplateNotFoundError`; the repository tier is skipped outside a git repository                                                                                                                                                                         | Distinguish a miss from a read failure                                                                                           | Implementation  | None                                                                        |
| p01-t03       | plan.md p01-t03                  | Listed skill call sites                                                | Also updated quick-start line 195 and the `review-skill-contracts` pins; retro creates `references/` before copying                                                                                                                                            | `--output` creates no directories                                                                                                | Implementation  | None                                                                        |
| p01-t03       | plan.md p01-t03                  | No skill copies from `.oat/templates/`                                 | `oat-wrap-up` keeps a read reference to `.oat/templates/summary.md` (schema pointer, not a copy)                                                                                                                                                               | Out of p01 scope; absent on user-scope-only installs                                                                             | Implementation  | Note at p06 index                                                           |
| p01-t04       | p01 review M1                    | Grants for retro and summary                                           | Also re-keyed the summary `allowed-tools` prompt site in `.agents/docs/autonomy-contract.md` (`35cb2ea1d677` to `a8983fec040c`, still `NG`)                                                                                                                    | Prompt sites are keyed by a hash of the line                                                                                     | Implementation  | None                                                                        |
| p02-t01       | plan.md p02-t01                  | Strict meta.json from Contents maps                                    | Only the root lists `index`; links into a non-child folder become link entries; hidden folders reported once as `folder/`; unowned meta.json keys preserved; unlisted pages warn but exit 0                                                                    | Fumadocs 16.10.2 loader semantics                                                                                                | Implementation  | None                                                                        |
| p02-t02       | plan.md p02-t02                  | Listed docs pages                                                      | Also `reference/file-locations.md`, `reference/index.md`, and the regenerated `apps/oat-docs/index.md`; no change needed in `cli-reference.md`                                                                                                                 | Same MkDocs-only wording                                                                                                         | Implementation  | None                                                                        |
| p02-t05       | p02 review M1                    | Report unlisted pages                                                  | Added `nav sync --check` (MkDocs and Fumadocs) run in `apps/oat-docs` `prebuild`, so `build:docs` fails on stale navigation; `oat-docs-analyze` points at the read-only form                                                                                   | Strict pages would otherwise hide new pages silently                                                                             | Implementation  | `docs-app-fuma` scaffold not wired (out of scope)                           |
| p02-t06       | p02 gate M1                      | Loader-checked reachability                                            | The new `fumadocs-loader.test.ts` imports `fumadocs-core` through `apps/oat-docs/package.json`, so CLI tests need the docs app installed (a normal workspace install); a kept `pagesIndex` naming another page may over-report that page as unlisted           | Prove against the real loader                                                                                                    | Implementation  | None                                                                        |
| p03-t03       | plan.md p03-t03                  | End-to-end test fails only with `REVIEW_DISPOSITION_MISMATCH`          | It first failed shape validation (`INVALID_UNRESOLVED_ISSUE`); added rejections for duplicate claim IDs, empty text, unknown fields, non-global scope; claim IDs validated against the review's own dispositions                                               | Stricter closed union                                                                                                            | Implementation  | None                                                                        |
| p03-t06       | p03 review H1                    | Brief claim IDs equal disposition claim IDs both ways                  | Every brief claim must be a distinct ledger claim with an exact projection; a reviewer may still omit a disposition, which reconciles to `unresolved` (honest partial)                                                                                         | Strict equality would fail the documented omitted-claim path with no retry allowed                                               | Implementation  | None                                                                        |
| p03-t07       | p03 round-2 M1                   | Omitted-disposition claims need a gap                                  | Contested and unsupported claims are exempt (already shown under Contradictions and Qualifications); p03-t08 bases the exemption on review dispositions                                                                                                        | Avoid double-reporting                                                                                                           | Implementation  | None                                                                        |
| p03-t09       | p03 round-2 M1, p03-t07, p03-t08 | Omitted-disposition claims force `partial` with a matched gap          | Rule deleted; an omission is treated like `uncertain` (claim stays `unresolved`, listed "not reviewed"); brief binding replaced by rebuild-and-compare                                                                                                         | Complexity review: not required by any acceptance criterion and not an inflation path; field-by-field binding could not converge | Implementation  | Reintroduce forced `partial` if a consumer acts on a silently skipped claim |
| p04-t02       | plan.md p04-t02                  | Closeout check reports `complete` when steps are done                  | Reports `complete` only when the snapshot's own status is `complete`; "in_progress" modeled as snapshot status `failed`; waivers carry `covered_fingerprint`; `complete-state` reads layered config when no snapshot exists, so a malformed config now refuses | Match Step 15's final write; compare across merges                                                                               | Implementation  | None                                                                        |
| p04-t03       | plan.md p04-t03                  | Check before `oat-project-complete`'s first mutation (around Step 3.7) | New Step 1.5 before the upfront questions, re-checked before `complete-state`                                                                                                                                                                                  | Steps 2 and 3.5 can already write                                                                                                | Implementation  | None                                                                        |
| p04-t03       | plan.md p04-t03                  | Fail closed for configured closeouts                                   | `claude-effort-levels` (hand-written snapshot) will be refused by `complete-state` until repaired; legacy `pr_open` projects without a snapshot (`migrate-skill-versions`) route back to implement                                                             | Intended fail-closed behavior                                                                                                    | Implementation  | Note in the PR body                                                         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
