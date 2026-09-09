---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_current_task_id: p04-t01
oat_generated: false
---

# Implementation: wave-7-execution

**Started:** 2026-09-08
**Last Updated:** 2026-09-08

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase    | Status      | Tasks | Completed |
| -------- | ----------- | ----- | --------- |
| Phase 1  | complete    | 1     | 1/1       |
| Phase 2  | complete    | 1     | 1/1       |
| Phase 3  | complete    | 1     | 1/1       |
| Phase 4  | in_progress | 1     | 0/1       |
| Phase 5  | pending     | 1     | 0/1       |
| Phase 6  | pending     | 1     | 0/1       |
| Phase 7  | pending     | 1     | 0/1       |
| Phase 8  | pending     | 1     | 0/1       |
| Phase 9  | pending     | 1     | 0/1       |
| Phase 10 | pending     | 1     | 0/1       |
| Phase 11 | pending     | 1     | 0/1       |
| Phase 12 | pending     | 1     | 0/1       |
| Phase 13 | pending     | 1     | 0/1       |
| Phase 14 | pending     | 1     | 0/1       |
| Phase 15 | pending     | 1     | 0/1       |
| Phase 16 | pending     | 1     | 0/1       |
| Phase 17 | pending     | 1     | 0/1       |
| Phase 18 | pending     | 1     | 0/1       |
| Phase 19 | pending     | 1     | 0/1       |
| Phase 20 | pending     | 1     | 0/1       |

**Total:** 3/20 tasks completed

---

## Phase 01: read stdin in finalize synced archive (p01)

**Status:** complete · **Group:** 1 · **Tasks:** p01-t01
**Outcome:** `finalize-synced-archive.mjs` reads its report with an fd-capable API (`readFileSync(0)`) and canonicalizes both sides of the main-module guard, so the synced deferred-clear path (PR #254) actually runs through a symlinked install; a CLI entry-point test (seven cases) under `pnpm test:skills`; `oat-project-complete` 1.7.9 → 1.7.10 with its two pins re-pointed.
**Verification:** focused 7/7; `test:skills` 870/870; `test:smoke` 167/167; forced check/type-check/test `Cached: 0`; check:skill-bumps, lint, format, validate-skills; two Codex rounds (R1 2I/1m → 2 fixed, 1 rejected with parity proof; R2 clean); root review PASS with findings (0C/1I/1M/3m; 21 rejection classes base-vs-head all still rejected).
**Deviations:** three complementary neutralization controls instead of the plan's two (the plan's "all three invocation forms" claim is false — corrected in the plan by a dated entry); the sibling-script sweep filed by the root as `BL-260909-sweep-the-raw-main-module`.

### Task p01-t01: Execute external plan — Read stdin with an fd-capable API in finalize-synced-archive.mjs

**Status:** completed
**Commit:** `dd6658e0b` → integration `7bd744502`

## Phase 02: fix oat config unset and adopt (p02)

**Status:** complete · **Group:** 1 · **Tasks:** p02-t01
**Outcome:** `oat config unset` removes a malformed stored value for the three repair keys (`documentation.excludes`, `documentation.instructionPointerExcludes`, `projects.defaultScope`) while a targeted strict barrier keeps every untargeted surface and the `pjm.remote` raw-write branch validated exactly as before; the env-override refusal and warning use the exported `resolveEnvOverride` probe; `adopt` resolves its surface flags through the shared `resolveSurfaceFlags` (one message, pinned across `set`/`unset`/`adopt`).
**Verification:** focused 288 (232 + 56); forced check/type-check/test `Cached: 0`; check:skill-bumps (nothing changed), lint, format, validate-skills; eight amended Done criteria on the built CLI in a scratch repo; five controls both ways; Codex R1 2C (became the STOP) + R2 (one provenance Critical rejected); root review PASS with findings (0/0/0/3m; 432-pair base-vs-head battery: 3 newly accepted = the repair keys as their own malformed value, 0 newly rejected) and round 2 PASS on the fix commit.
**Deviations:** STOP at the pre-commit gate (deleting the strict read removed the whole-config barrier) closed by the plan's dated 2026-09-08 post-STOP refresh (targeted strict barrier; cases 7–8; two control corrections); refusal ordering now key-refusals-first (all still exit 1).

### Task p02-t01: Execute external plan — Let `oat config unset` remove a malformed value, and fold `adopt` onto the shared surface-flag resolver

**Status:** completed
**Commit:** `1913a950f` → integration `a6da561cc`; fix `7dfaa6bc1` → `08b2b030a`

## Phase 03: guard bare proto in markdown records (p03)

**Status:** complete · **Group:** 1 · **Tasks:** p03-t01
**Outcome:** a repository contract test (`markdown-proto-literal-contract.test.ts`) rejects a bare `__proto__` literal outside a code span anywhere under `.oat/repo/**` and `apps/oat-docs/docs/**`, with a block-scoped CommonMark classifier (container-aware fence pairing, HTML block types 1–7, fence lines as region boundaries) and an invariant test that derives every case's verdict from real `oxfmt --write`; the seven pre-existing occurrences (two item titles, an archived item title, `completed.md`, the regenerated index, one decision-record line) repaired.
**Verification:** focused 46/46; forced check/type-check/test `Cached: 0` (386 files / 7093); check:skill-bumps, lint, format, validate-skills; red control = exactly the plan's seven rows / eight occurrences on the pre-repair tree, zero on the head; Codex R1 3C/1I/1M/1m + R2 3C (all reproduced against `oxfmt --write`, fixed); root review CHANGES REQUESTED (3C/1I/1M/2m from a 54-shape `oxfmt` battery) → fix round → round 2 PASS (69-shape battery, 0 mangled-but-accepted).
**Deviations:** block-scoped masking instead of the plan's line-level inline-span strip (unimplementable on the tree: two multi-line code spans in an unwritable plan file) — adjudicated justified and written into the plan as a dated refresh together with the three review-found rules and the `oxfmt`-derived invariant.

### Task p03-t01: Execute external plan — Guard repository Markdown against the formatter rewriting a bare prototype-key literal into bold

**Status:** completed
**Commit:** `c4053df73` → integration `e92bb7b91`; fix `b108f2dbf` → `e8cbfb090`

## Phase 04: make the completion seal idempotent (p04)

**Status:** pending · **Group:** 2 · **Tasks:** p04-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p04-t01: Execute external plan — Make the completion seal idempotent and unpark wave-5 p09

**Status:** pending
**Commit:** -

## Phase 05: harden normalized config maps (p05)

**Status:** pending · **Group:** 2 · **Tasks:** p05-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p05-t01: Execute external plan — Harden normalized config maps against a preserved `__proto__` key

**Status:** pending
**Commit:** -

## Phase 06: guard every packed asset directory (p06)

**Status:** pending · **Group:** 2 · **Tasks:** p06-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p06-t01: Execute external plan — Guard a packed path under every required asset directory

**Status:** pending
**Commit:** -

## Phase 07: reconcile the oat doctor example (p07)

**Status:** pending · **Group:** 3 · **Tasks:** p07-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p07-t01: Execute external plan — Make the oat-doctor dashboard example describe a state the doctor can report

**Status:** pending
**Commit:** -

## Phase 08: warn on wrong typed documentation root (p08)

**Status:** pending · **Group:** 3 · **Tasks:** p08-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p08-t01: Execute external plan — Warn on a wrong-typed `documentation.root` instead of dropping it in silence

**Status:** pending
**Commit:** -

## Phase 09: name the resolved symlink target (p09)

**Status:** pending · **Group:** 3 · **Tasks:** p09-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p09-t01: Execute external plan — Name the resolved target in the symlink inert-exclusion warning

**Status:** pending
**Commit:** -

## Phase 10: repair stray fences in lifecycle skills (p10)

**Status:** pending · **Group:** 4 · **Tasks:** p10-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p10-t01: Execute external plan — Repair the stray fences that hide normative skill prose and widen the fence scanner across `.agents/skills`

**Status:** pending
**Commit:** -

## Phase 11: close the docs index follow ups (p11)

**Status:** pending · **Group:** 4 · **Tasks:** p11-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p11-t01: Execute external plan — Close the docs-index follow-ups from the wave-1 reviews

**Status:** pending
**Commit:** -

## Phase 12: persist native skill adoption in status (p12)

**Status:** pending · **Group:** 4 · **Tasks:** p12-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p12-t01: Execute external plan — Make `oat status` persist and pin its native-skill adoption outcome

**Status:** pending
**Commit:** -

## Phase 13: tighten the skill version validators (p13)

**Status:** pending · **Group:** 5 · **Tasks:** p13-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p13-t01: Execute external plan — Close the version-validator gaps: agent roles, unresolvable versions, the alias promotion, and scripts-only skill changes

**Status:** pending
**Commit:** -

## Phase 14: fix sync apply failure summary (p14)

**Status:** pending · **Group:** 5 · **Tasks:** p14-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p14-t01: Execute external plan — Make `oat sync` report a failure summary instead of "No changes required." when a rejected collection leaves zero planned operations

**Status:** pending
**Commit:** -

## Phase 15: converge copy strategy skill projections (p15)

**Status:** pending · **Group:** 5 · **Tasks:** p15-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p15-t01: Execute external plan — Converge copy-strategy skill projections so a synced copy reads in sync

**Status:** pending
**Commit:** -

## Phase 16: calculate dispatch baselines after journaling (p16)

**Status:** pending · **Group:** 6 · **Tasks:** p16-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p16-t01: Execute external plan — Resolve the accepted execution baseline after mandatory launch journaling, and make the ordering auditable

**Status:** pending
**Commit:** -

## Phase 17: harden the external plan readiness contract (p17)

**Status:** pending · **Group:** 6 · **Tasks:** p17-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p17-t01: Execute external plan — Harden the external-plan readiness contract and settle the wave-program ledger vocabulary

**Status:** pending
**Commit:** -

## Phase 18: cover skill and script tests in repo gates (p18)

**Status:** pending · **Group:** 6 · **Tasks:** p18-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p18-t01: Execute external plan — Put skill-asset formatting and the worktree-init test inside the gates CI actually runs

**Status:** pending
**Commit:** -

## Phase 19: correct skill authoring facts (p19)

**Status:** pending · **Group:** none (sequential after group 6) · **Tasks:** p19-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p19-t01: Execute external plan — Correct the factual skill-authoring claims and give each one a named backstop

**Status:** pending
**Commit:** -

## Phase 20: keep plan writes on the callers model (p20)

**Status:** pending · **Group:** none (sequential after group 6) · **Tasks:** p20-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p20-t01: Execute external plan — Keep external-plan writes on the caller's model class in oat-repo-improve

**Status:** pending
**Commit:** -

## Autonomy Gate Provenance

_Recorded when the configured implementation exit gate runs._

### Review Received: plan (attempt 1)

**Date:** 2026-09-08
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-08T224620Z.md (gate-invoked, run `f905852e-4f03-417e-a51f-6fbd79b6db99`, target `codex-5-6-sol-xhigh`, blocked)
**Findings:** Critical 1 · Important 2 · Medium 1 · Minor 0 — all resolved in-artifact (gate mode, auto-disposition):

- C1 — the wrapper pointed p04 at the branch `wave-5/p09`, which carries no p09 commit, while the immutable plan makes a missing worktree a STOP: **fixed** — the parked bytes were recovered from the wave-5 implementer transcript (`agent-a1873311371d94721`: Write/Edit replay on the group-4 base `956773dc6` plus the lane's two post-edit Python patches) and committed at `.oat/projects/shared/wave-7-execution/parked/wave-5-p09/`; verification: `git apply --stat` = 3 files, 117 insertions, 17 deletions; patch 218 lines; the two files 165 and 249 lines — identical to the plan's step-1 Verify figures; `SKILL.md` after replay is byte-identical to the surviving dangling blob `c814b0605`; the recovered test passes 13/13 under `node --test`; `git apply --check` exit 0 at the wave base. The p04 ordering note, the Drift Refresh Record, and discovery now name that directory; no plan text changed.
- I1 — the archive checklist named `BL-260906-harden-dispatch-launch` and `BL-260908-retire-the-top-level-skill` in the archive set: **fixed** — both removed from the set (now an exact list of twenty-three) with explicit update-only instructions that keep each `status: open` and its remaining criterion.
- I2 — the program artifact still recorded W7 as `composed` awaiting approval while discovery recorded the approval: **fixed** — the program ledger row is now `in-progress` with the wrapper link and the approval evidence (operator "approve" on 2026-09-08 after PR #284, merged as `684bd3be3`), the approval prose and the operator checkpoint paragraph record the same, and a revalidation entry marks execution start.
- M1 — the write-surface inventory listed root `AGENTS.md` for p19 (its plan edits references to `AGENTS.md` inside two skills, not the root file): **fixed** — p19 removed from the root-`AGENTS.md` chain in contract items 6 and 13, the Parallelism paragraph, its writes line, and the p18/p19 ordering notes; the same stale clause corrected in the Wave 7 index row and the program's Wave Table note; the intersection re-run from the immutable `### In scope` sections stays empty.

**Verification record:** what — the four in-artifact repairs, the recovered parked directory, the program ledger flip, and the index/program note corrections; how — `oat project validate-plan` exit 0; `git apply --check` on the recovered patch exit 0 with the recorded stat; the plan-corpus contract test green; where — this section and the commit that carries it.

**Plan row (attempt 1) → `fixes_added`** (gate-written row moved forward in place with the archived path); the gate re-runs (attempt 2).

### Review Received: plan (attempt 2 — passed)

**Date:** 2026-09-08
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-08T231038Z.md (gate-invoked, run `c023731b-5c88-4e5c-a384-2061370d75e6`, target `codex-5-6-sol-xhigh`)
**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 0 — passing gate, judgment-sweep mode:

- M1 — the write-surface inventory was built from `### In scope` alone and omitted test files the plans' Test plans and Implementation steps add cases to (p04 `append.test.ts`, `lifecycle.integration.test.ts`; p05 six config/gate tests; p08 two config tests; p16 `review-skill-contracts.test.ts` and the new `baseline-ordering.test.ts`) and the `oat-project-summary` bump p04 takes: **addressed now** (evidence-only, contained): the inventory is regenerated from In scope + Test plan + Implementation-step test files + pin implications, the four writes lines and the single-writer bump list are corrected, `review-skill-contracts.test.ts` is recorded as a p01 → p04 → p16 seam (one writer per group), and the within-group intersections re-run from the complete set stay empty; no group recomposition.

**Plan row (attempt 2) → `passed`** (gate-written row moved forward in place with the archived path). Gate history: `f905852e` blocked (lost p09 patch, archive set, program ledger, p19 `AGENTS.md`), `c023731b` passed.

## Review Received: p01 (round 1 — passed with findings)

**Date:** 2026-09-08
**Review artifact:** reviews/archived/p01-review-2026-09-08T235901Z.md (reviewed head `dd6658e0b0a545645cccfd23630305301b19fd28`, manual, opus)
**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 3 — PASS with findings; every ruling verified (the plan's "all three forms" claim false; 21 rejection classes base-vs-head all still rejected, `WEAKER_COUNT=0`; the rejected fails-open finding stands — guard body md5-identical to the exemplar, base = head on a thrown `realpathSync`; NODE_OPTIONS vacuity both ways; bump 1.7.9 → 1.7.10 with a clean sweep; scope exact; seven adversarial probes incl. a 5.24 MB chunked pipe).

**Dispositions (root-owned, record-only; no change to the reviewed head):**

- I1 — the plan-directed follow-up item for the eighteen sibling scripts was not filed: **fixed** — `BL-260909-sweep-the-raw-main-module` filed on the integration branch (names the seventeen raw-guard scripts and the unguarded `validate-nonarchive-lifecycle-receipt.mjs`, the corrected control set, and the two sweep-wide design questions from m1 and m3); backlog index regenerated. Verification: `test -f .oat/repo/pjm/backlog/items/BL-260909-sweep-the-raw-main-module.md`; `rg 'main-module guard' .oat/repo/pjm/backlog/` hits; recorded here and in the commit that carries it.
- M1 — the false "all three invocation forms" claim still stood in the durable plan: **fixed** — a dated **Correction applied 2026-09-08** entry in the plan's `## Revalidation Before Execution` section states the reproduced behavior, the complementary three-control set, and the `NODE_OPTIONS` isolation requirement, and points the sweep at the corrected set. Verification: `grep -c 'Correction applied 2026-09-08' <plan>` = 1; corpus contract test green; recorded here.
- m1 — residual fail-open `catch` shape (rejection stands): **deferred** to `BL-260909-sweep-the-raw-main-module` as a sweep-wide design decision (named in the item).
- m2 — the newly reachable `clearActiveProject` failure branch has no test (probe P4 shows it fails closed): **deferred** — p04 inherits this file and its test in group 2; recorded in the p04 brief as an optional sixth case, otherwise carried by the sweep item.
- m3 — a caller that leaves stdin open blocks where the base failed fast (the plan forbids a timeout; the production form always closes the pipe): **accepted as documented behavior**; the `isTTY` usage-hint option is named in the sweep item.

**p01 row → `passed`** (reviewed head `dd6658e0b`; no fix round required — both actionable findings were root record/bookkeeping work).

## Review Received: p02 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p02-review-2026-09-09T001158Z.md (reviewed head `1913a950ff996849df02ef98b58fe02f437315ea`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 3 — PASS with findings, reconnaissance not-attempted. Verified independently: the barrier read set per surface (all through the injected readers; exactly one shared read); a mechanical base-vs-head battery of 72 keys × 6 malformed scenarios = 432 built-CLI pairs → 3 newly accepted (exactly the three shared repair keys, each only when it is itself the malformed value), 0 newly rejected; refusal ordering (60 message-only diffs, all exit 1 both sides); all five controls incl. D and E orthogonal; the head implements the refresh, so the rejected Codex provenance Critical stands; twelve adversarial probes; seven gates with forced `check`/`type-check` (`Cached: 0`); scope exact.

**Dispositions:**

- m1 — `resolveSurfaceFlags` doc comment names only `set`/`unset` after `adopt` joined: **fix round** (`w7-p02-fix-001`, resumed lane, append-only commit) — one comment edit naming the three callers and the parity test.
- m2 — env-override equivalence pinned for one of three `ENV_OVERRIDE_MAP` keys: **fix round** (same commit) — the two env-override `unset` cases parameterized over `projects.root`, `projects.defaultScope`, `worktrees.root`, each proven red under a neutralized probe.
- m3 — the plan's Test plan, controls, Done criteria, and Review focus still read pre-amendment while the binding text is the refresh paragraph: **fixed** (root, plan write) — an "amended by the 2026-09-08 post-STOP refresh" pointer at the head of each of the four sections naming what changed; verification: `grep -c 'Amended by the 2026-09-08 post-STOP refresh' <plan>` = 4, corpus contract green; the lane worktree copy re-syncs at fan-in.
- Surfaced, out of scope (pre-existing at base and head): `unset pjm.remote.policy.description` raw-writes when the malformed value is inside `pjm.remote` itself (`authority.default: 5`) because the strict shared reader accepts it — filed at closeout as a follow-up for the PJM remote schema owner.

**p02 row → `fixes_added`**; round 2 (disposition verification on the original reviewer handle) follows the fix commit.

## Review Received: p02 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p02-review-2026-09-09T002423Z.md (reviewed head `7dfaa6bc159748190f6c17337919391359f8fe7e`, manual, opus)
**Findings:** 0 · 0 · 0 · 0 — PASS. Verification records for the round-1 dispositions: m1 — `index.ts` diff filtered to non-comment lines is empty; the comment's claims checked (one message literal, three call sites, the named parity case at `index.test.ts:1459`). m2 — six `it.each` cases over the three `ENV_OVERRIDE_MAP` entries green; the reviewer's own neutralization turned all six red (refusals `expected +0 to be 1`; warns on an undefined `capture.warn[0]`), restore hash-matched. m3 — four plan pointers at `:456`, `:517`, `:552`, `:626`. Commit shape: exactly one append-only commit on `1913a950f`; focused 288, `check:skill-bumps` 0, forced cli test `Cached: 0` (385 files / 7059), forced check/type-check 0. Noted benign: the leaf check no longer asserts empty-parent pruning, which stays pinned at `:4570` and `:5093`.

**p02 row → `passed`** (reviewed head `7dfaa6bc1`); p02 is clear for the group-1 fan-in.

## Review Received: p03 (round 1 — changes requested)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p03-review-2026-09-09T002419Z.md (reviewed head `c4053df739bb1fa8b92f206eef3f165e955a6110`, manual, opus)
**Findings:** Critical 3 · Important 1 · Medium 1 · Minor 2 — CHANGES REQUESTED, reconnaissance not-attempted. Verified: the deviation is justified (the plan's own algorithm reports nine rows / ten occurrences, two of them wrapped code spans `oxfmt` protects); the red control reproduces exactly (seven rows / eight occurrences on the base, zero on the head); the rejected Medium stands; the PJM carve-out is byte-exact; scope clean; seven gates `Cached: 0`. A 54-shape `oxfmt` oracle battery found six mangled-but-accepted shapes in three root causes.

**Dispositions:**

- C1 — a fence opener inside a blockquote is registered document-level and pairs with a later fence anywhere, blanking real prose (five probes; deviation-introduced — the plan's algorithm flags all five): **fix round** (`w7-p03-fix-001`, resumed lane) — container-aware fence pairing (quote depth recorded, same-depth closer, force-close on depth drop); the five shapes pinned.
- C2 — `RAW_HTML_BLOCKS` covers CommonMark HTML block types 1–5 only, so a fence line inside `<div>`/`<details>` opens a fence (three probes; shared with the plan's algorithm): **fix round** — type-6 (block-level tag list) and type-7 entries with blank-line termination; `<div>`/`<details>` cases pinned; the `<script>`-only header wording corrected.
- C3 — a fence line is not a region boundary, so an unclosed backtick run pairs across it (probe A8): **fix round** — every fence-pattern line classified atomic; the "can only over-report" sentence corrected; A8 pinned.
- I1 — the invariant test filters the hand-written table (self-consistency, not a property): **fix round** — each case's `formatter` verdict derived by running `pnpm exec oxfmt --write` on a `mktemp -d` copy; fails when a derived-`mangles` case has no reported occurrence.
- M1 — undocumented strict false positives (link destination/title, reference title, image alt, autolink, HTML comment, `<div>` content) with an impossible printed remedy: **fix round** — header list extended; a second remedy line for link constructs (percent-encode or move to a reference definition); no escape hatch.
- m1 — the lane's "`external-plans/` is unwritable" premise is false (the conclusion survives): **accepted as a report inaccuracy**; the root, not the lane, writes plans.
- m2 — the plan's step 2 should carry a dated correction: **fixed** (root, plan write) — a **Refresh applied 2026-09-08** entry in `## Revalidation Before Execution` supersedes the step-2 algorithm with the block-scoped detector, makes the three container/HTML/boundary rules and the `oxfmt`-derived invariant part of the contract, and documents the strict false positives; verification: `grep -c 'Refresh applied 2026-09-08 (wave-7 p03' <plan>` = 1, corpus contract green.

**p03 row → `fixes_added`**; round 2 (disposition verification on the original reviewer handle) follows the fix commit.

## Review Received: p03 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p03-review-2026-09-09T004719Z.md (reviewed head `b108f2dbf1ada4f97a68c616bd65f08559ec99d9`, manual, opus)
**Findings:** 0 · 0 · 0 · 2 minor — PASS. Verification records for the round-1 dispositions, each by the reviewer's own control (revert from a `mktemp -d` backup, restore, sha256-checked): C1 reverted → 6 failed / 40 passed (the five quoted-fence cases plus the invariant); C2 → 4 failed; C3 → 2 failed; I1 — with C1 reverted and the OLD table-only invariant restored the invariant stayed green while five real holes were open, with the NEW invariant it goes red naming all five; M1 — an appended link-destination literal prints the percent-encode / reference-definition remedy verbatim. Battery: 69 shapes (all 54 round-1 shapes incl. the six former Criticals, plus 15 fresh shapes against the new code) through real `oxfmt --write` → 0 mangled-but-accepted. Red control exact (7 rows / 8 occurrences → 0 on both heads; no new false positive on the corpus). One append-only commit; forced cli test 386 files / 7093 (+11 cases) `Cached: 0`; check/type-check forced 0; every clause of the plan's 2026-09-08 refresh met.

**Dispositions (round 2 Minors):**

- m1 — the recorded C1 control figure understated the fix (it is 6 failed / 40 passed with the invariant naming all five shapes): **fixed** — this record corrected here (the lane's fix-report figure is superseded by the reviewer's).
- m2 — `OXFMT_BINARY` is spawned without an existence check (a missing oracle surfaces as a bare `ENOENT`): **deferred** — polish; carried in the wave follow-up ledger.

**p03 row → `passed`** (reviewed head `b108f2dbf`); group 1 is clear for fan-in.

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-09-08 — branch `wave-7-execution`, Tier 1 (native Claude Task dispatch), policy managed/high

Wave base `684bd3be32e65fc8db0646f336ab4335c317ba2c` (origin/main after the wave-7 composition PR #284); plan gate passed on attempt 2 (attempt 1 blocked on the lost p09 patch, the archive set, the program ledger, and the p19 `AGENTS.md` claim).

#### Dispatch Notes

- Wrapper authored from the program's Wave 7 section, the wave-7 index, and the root's mechanical drift run (20 PASS); no plan refresh entries were needed.
- `w7-p01-impl-001`, `w7-p02-impl-001`, `w7-p03-impl-001` — group 1 dispatched together at `985717d5331177d7e6fd23cc070e8eed836f5e90` (the tip after the plan-gate receive); each target opus, task_class default-implementation; briefs = Phase Scope + the wave-7 common contract (zero-drift churn declaration; premise probe before edits; forced gates; version-literal sweep across `packages/cli/src`, `tools/smoke`, `.agents/skills/*/tests` + `test:smoke` + `test:skills`; project-scope sync; two-round Codex cap; PJM carve-out for p03). Records `dispatch/w7-p0{1,2,3}-impl-001.json`.
- `w7-p02-impl-001` outcome: BLOCKED at the pre-commit review gate (no commit; gate-green work preserved uncommitted in the worktree, +170/−21 over three files). Codex reproduced and the lane confirmed that deleting the `resolveEffectiveConfig` call removed the whole-config validation barrier: a malformed untargeted surface no longer blocks an unset elsewhere, and the `pjm.remote` raw-write branch persists unvalidated — the plan's own STOP. Remedy inside the plan's file scope: a dated post-STOP refresh (targeted strict barrier over the untargeted surfaces plus the raw-write branch; cases 7–8 and two controls; two control corrections) applied to the plan by the root; the lane resumes on its staged work.
- `w7-p01-impl-001` outcome: DONE, one commit `dd6658e0b0a545645cccfd23630305301b19fd28` (five files). Two Codex rounds (R1: NODE_OPTIONS inheritance made the guard control vacuous — fixed with an isolated `baseEnv`; looped symlink test split into three; `catch { return false }` fails-open — rejected: the plan prescribes it verbatim and the canonical exemplar matches, escalated to the sibling sweep; R2: zero findings, production hunk hash-identical). Plan claim "raw guard fails all three invocation forms" found false — three complementary controls shipped (raw guard → plain form; one-sided canonicalization → both preserve-symlinks forms; stdin revert → five tests). Ten gates exit 0, `Cached: 0`. Follow-up (root files at closeout): the seventeen sibling scripts with the raw guard plus the unguarded `validate-nonarchive-lifecycle-receipt.mjs`.
- `w7-p01-review-001` — reviewer, target opus, seven rulings (the three-control set reproduced; weaker-anywhere on the validator; the rejected fails-open finding; NODE_OPTIONS vacuity both ways; bump and pin sweep; scope; one adversarial stdin probe). Record `dispatch/w7-p01-review-001.json`.
- `w7-p01-review-001` outcome: PASS with findings, 0C/1I/1M/3m, reconnaissance attempted. The two actionable findings were root-owned (the unfiled sweep item; the false plan claim) and were fixed in the receive commit; three Minors deferred/accepted (see the review section).
- `w7-p02-impl-001` outcome (resumed): DONE, one commit `1913a950ff996849df02ef98b58fe02f437315ea` (three files, +275/−24). The refreshed barrier reads the untargeted surfaces through the injected readers, plus the targeted shared surface on the `pjm.remote` raw-write branch; cases 7–8 added; five controls both ways (D red at `index.test.ts:5187`, E at `:5218`). Codex R2: one Critical rejected (the refresh is on the integration branch `46d4adf36`, deliberately not rebased into the lane — a provenance artifact, no code blocker), no other findings; refusal ordering now key-refusals-first, both still exit 1. Seven gates exit 0, `Cached: 0`. Friction: stale wave-6 `/tmp/p02-codex-review2.md` nearly consumed; `pgrep -f codex` matches the session shell.
- `w7-p02-review-001` — reviewer, target opus, eight rulings (amended plan read from the root; barrier read set per surface; mechanical base-vs-head weaker-anywhere across the key catalog; refusal-ordering; controls D and E; the rejected provenance Critical; adversarial probes; scope). Record `dispatch/w7-p02-review-001.json`.
- `w7-p03-impl-001` outcome: DONE_WITH_CONCERNS, one commit `c4053df739bb1fa8b92f206eef3f165e955a6110` (the new contract test plus the six `.oat/repo/` record repairs and the regenerated backlog index). Two Codex rounds found six Critical classes in the hand-rolled block classifier (escaped backticks, CommonMark block segmentation, CRLF twice, container boundaries, fence masking) — all reproduced against real `oxfmt --write` and fixed with 31 regression cases plus a one-directional invariant; one Medium rejected with reason (strict direction on indented code). Deliberate deviation: block-scoped masking instead of the plan's line-level inline-span strip, which is red on two multi-line code spans in an unwritable plan file. Red control: the pre-repair tree yields exactly the plan's seven rows / eight occurrences. Concern: completeness of a parser-less classifier cannot be proved (a dependency is a plan STOP).
- `w7-p03-review-001` — reviewer, target opus, six rulings (adjudicate the deviation against the Outcome and weaker-anywhere; a twelve-shape `oxfmt` oracle battery; the rejected Medium's list-continuation claim; the PJM carve-out scope; the seven-row red control; scope). Record `dispatch/w7-p03-review-001.json`.
- `w7-p02-review-001` outcome: PASS with findings, 0C/0I/0M/3m, reconnaissance not-attempted (432-pair mechanical weaker-anywhere battery: 3 newly accepted = the three repair keys as their own malformed value, 0 newly rejected). m1/m2 → fix round `w7-p02-fix-001` on the resumed lane; m3 fixed by the root (section pointers in the plan).
- `w7-p02-fix-001` outcome: one append-only commit `7dfaa6bc159748190f6c17337919391359f8fe7e` (two files, +90/−37; `index.ts` comment-only): the doc comment names all three callers and the parity case; the two env-override `unset` cases parameterized over the three `ENV_OVERRIDE_MAP` keys (228 → 232), all six red under `envShadowed = false` (refusals at `:5038`, warns at `:5065`); seven gates exit 0, `Cached: 0`.
- `w7-p02-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w7-p02-review-002.json`.
- `w7-p02-review-002` outcome: PASS (fan-in may proceed), 0/0/0/0; all five verification checks independent (mechanical comment-only proof; six cases red under the reviewer's own neutralization; append-only shape; forced gates `Cached: 0`; four plan pointers).
- `w7-p03-review-001` outcome: CHANGES REQUESTED, 3C/1I/1M/2m, reconnaissance not-attempted (54-shape `oxfmt` battery: six mangled-but-accepted shapes in three root causes; the deviation itself justified; red control exact). C1–C3, I1, M1 → fix round `w7-p03-fix-001` on the resumed lane; m2 fixed by the root (dated plan refresh); m1 accepted.
- `w7-p03-fix-001` — bounded fix round on the resumed implementer handle (five findings, one append-only commit, pinned battery shapes, `oxfmt`-derived invariant). Record `dispatch/w7-p03-fix-001.json`.
- `w7-p03-fix-001` outcome: one append-only commit `b108f2dbf1ada4f97a68c616bd65f08559ec99d9` (one file, +327/−30; header trimmed to 100 chars for commitlint, prescribed wording in the body). C1 container-aware fence pairing (reverted → 5 red), C2 HTML block types 6–7 (reverted → 3 red), C3 fence lines atomic (reverted → 1 red), I1 the invariant derives verdicts from real `oxfmt --write` and queries the detector (with C1 reverted it goes red on its own — it also caught the lane's first attempt, which still read the recorded table), M1 strict-direction list + link remedy line. Nine `mangles` shapes pinned; red control unchanged (7 rows / 8 occurrences → 0); focused 46/46; forced gates `Cached: 0`. Lane restated its false premise: the plan file is byte-identical under `oxfmt --write`, so the two spans are protected; the lane does not own that file.
- `w7-p03-review-002` — disposition-verification round 2 on the original reviewer handle (six original holes plus six fresh battery shapes). Record `dispatch/w7-p03-review-002.json`.
- `w7-p03-review-002` outcome: PASS (fan-in may proceed), 0/0/0/2m; five controls re-run by the reviewer (C1 → 6 red incl. the invariant; the old invariant proven blind), 69-shape battery clean, red control exact.

#### Group 1 fan-in (2026-09-09)

- `wave-7/p01`, `wave-7/p02`, `wave-7/p03` rebased onto the integration tip and merged in plan order with `git merge --no-ff` as `ea2f5a675`, `7b9793b8f`, `f175ca2da`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `dd6658e0b`→`7bd744502`, `1913a950f`→`a6da561cc`, `7dfaa6bc1`→`08b2b030a`, `c4053df73`→`e92bb7b91`, `b108f2dbf`→`e8cbfb090`.
- Lockstep bump `f0eb1c02e` (0.2.66 → 0.2.67 above freshly fetched `origin/main` `684bd3be3`) with the project-scope sync manifest restamp in the same commit (`sync exit=0`, "Manifest version refreshed; no content changes required").
- Integration gates (sequential, exit codes captured, run before any bookkeeping edit): `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached; cli 386 files / 7105 tests), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0, `pnpm test:skills` 0, root `pnpm test` 0. Config-integrity check: no tracked `.oat/config.json` key missing versus `origin/main`.
- Backlog index regenerated by p03's own commit (two title rows); no lane closed or renamed an item at this fan-in beyond that.
- Worktrees `.worktrees/wave-7/p0{1,2,3}` and branches `wave-7/p0{1,2,3}` removed after the merge.

<!-- orchestration-runs-end -->

## Implementation Log

Chronological log of implementation progress (root orchestrator; lane detail lives in the dispatch transcripts and review artifacts).

### 2026-09-09

- Group 1 fan-in: merges `ea2f5a675`, `7b9793b8f`, `f175ca2da`; lockstep bump `f0eb1c02e` (0.2.67); eight gates + smoke + skills + root test green (0 cached; cli 7105). Group 2 (p04 + p05 + p06) bootstraps next.

### 2026-09-08

- p03 round 2 passed (0/0/0/2m) at `b108f2dbf`; p03 row `passed`; group 1 fan-in starts.
- p03 review received (CHANGES REQUESTED, 3C/1I/1M/2m): fix round `w7-p03-fix-001` dispatched; plan refresh applied; p03 row `fixes_added`.
- p02 round 2 passed (0/0/0/0) at `7dfaa6bc1`; p02 row `passed`.
- p02 review received (PASS with findings, 0C/0I/0M/3m): fix round `w7-p02-fix-001` dispatched for the two Minors; plan section pointers added; p02 row `fixes_added`.
- p01 review received (PASS with findings, 0C/1I/1M/3m): sweep item `BL-260909-sweep-the-raw-main-module` filed, plan correction entry applied; p01 row `passed`.
- Plan gate attempt 2 passed (0C/0I/1M; the inventory Medium addressed in the receive); group 1 bootstraps next.
- Plan gate attempt 1 blocked (1C/2I/1M: the lost p09 patch, the archive set, the program ledger, the p19 `AGENTS.md` claim) → repaired in-artifact; the parked p09 bytes recovered and committed under `parked/wave-5-p09/`.
- Wave base `684bd3be32e65fc8db0646f336ab4335c317ba2c` (origin/main after PR #284); wrapper scaffolded and authored; drift 20 PASS / 0 / 0 by mechanical run.

## Deviations from Plan / Design

| Task / Review | Source Artifact         | Planned / Documented                                                      | Actual / Accepted                                                                                                                                                            |
| ------------- | ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none yet)    | -                       | -                                                                         | -                                                                                                                                                                            |
| p01-t01       | plan step 5 / Test plan | raw guard restored → case 5 fails on all three invocation forms           | raw guard fails only the plain form; a one-sided canonicalization is the control for the two preserve-symlinks forms (dated correction entry in the plan)                    |
| p02-t01       | plan step 2             | delete the strict effective read; `envShadowed` from `resolveEnvOverride` | the probe kept; a targeted strict barrier reads the untargeted surfaces (and the targeted shared surface on the raw-write branch) before any write (dated post-STOP refresh) |
| p03-t01       | plan step 2             | strip inline code spans on each remaining line                            | block-scoped CommonMark masking with container-aware fences, HTML blocks 1–7, fence lines as boundaries; `oxfmt`-derived invariant (dated refresh)                           |

## Test Results

| Phase      | Tests Run                                                           | Passed | Failed | Coverage |
| ---------- | ------------------------------------------------------------------- | ------ | ------ | -------- |
| (none yet) | -                                                                   | -      | -      | -        |
| p01        | focused 7 + `test:skills` 870 + `test:smoke` 167 + forced CLI suite | all    | 0      | -        |
| p02        | focused 288 + forced CLI suite (385 files)                          | all    | 0      | -        |
| p03        | focused 46 + forced CLI suite (386 files / 7093)                    | all    | 0      | -        |
| g1 fan-in  | eight DoD gates + smoke + skills + root test (0 cached; cli 7105)   | all    | 0      | -        |

## Deferred Findings

_None yet._

## Final Summary (for PR/docs)

_Filled at closeout._

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Index: `.oat/repo/reference/external-plans/2026-09-08-backlog-review-wave-7-plan-index.md`
