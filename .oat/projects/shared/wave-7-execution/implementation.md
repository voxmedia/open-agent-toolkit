---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_current_task_id: p07-t01
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
| Phase 4  | complete    | 1     | 1/1       |
| Phase 5  | complete    | 1     | 1/1       |
| Phase 6  | complete    | 1     | 1/1       |
| Phase 7  | in_progress | 1     | 0/1       |
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

**Total:** 6/20 tasks completed

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

**Status:** complete · **Group:** 2 · **Tasks:** p04-t01
**Outcome:** the completion seal is idempotent: `checkProjectLog` reports a `sealed` field, a replayed seal returns `already-appended`, a keyed replay of a pre-seal entry returns `already-appended` without appending, and every append carrying new content onto a sealed log is refused (`ProjectLogSealedError` → `{"status":"sealed"}` + exit 1); the parked wave-5 p09 work (durable archive receipt validator + resume routing, recovered byte-exact) is unparked, `oat-project-summary` and `oat-project-retro` route around the refusal; `oat-project-summary` 1.5.4 → 1.5.5, `oat-project-retro` 1.0.5 → 1.0.6, `oat-project-complete` kept at 1.7.10.
**Verification:** focused 429; `test:skills` 883; `test:smoke` 167; forced check/type-check/cli test `Cached: 0` (7131); check:skill-bumps (three bumps validated); lint; format; validate-skills; one Codex round (1I fixed: key recognition before the sealed guard); root review PASS with findings (0/0/1M/3m; five adversarial probes incl. four racing seals) → fix round → round 2 PASS (0/0/0/1m, taken as a root address-now).
**Deviations:** a thrown `ProjectLogSealedError` mapped at the command layer instead of the plan's fourth result variant (`gate/index.ts:3282`, p05's file, narrows `result.status`); the refusal is conditional on key recognition (documented on five surfaces); two uninventoried propagation surfaces (`autonomy-contract.md`, `synced-bookkeeping-sites.json`); the p09 plan carries a dated refresh entry.

### Task p04-t01: Execute external plan — Make the completion seal idempotent and unpark wave-5 p09

**Status:** completed
**Commit:** `247f06b65` → integration `a31f5f976`; fix `6403c6ced` → `322a7bea8`; root address-now `572a4dd87`

## Phase 05: harden normalized config maps (p05)

**Status:** complete · **Group:** 2 · **Tasks:** p05-t01
**Outcome:** every map OAT rebuilds from parsed config data keeps a preserved `__proto__` key as an own data property through the new `getOwnKey`/`setOwnKey` helpers (`normalizeRecordMap`, `normalizeDispatchMatrix`, the exec-target merges, the config-command lookups, the gate lookups at `:1220` and `:1865`, `mergeEffectiveDispatchMatrix`, `toProjectMatrixCompatibility`, the ceiling layer lookups, `getCeilingAdapter`, the dispatch-report lookup), and a global prototype-pollution path in `buildResolvedConfigAggregate` that Step 2 would have exposed is closed; user-supplied ids (`--target`, `--provider`) reject cleanly instead of crashing; the materialization decision record names every guarded site.
**Verification:** focused 780+; forced check/type-check/cli test `Cached: 0` (7128); check:skill-bumps (nothing changed); lint; format; validate-skills; the plan's intermediate-red control held (cases 9, 10, 14, 15); two Codex rounds (R1 DO-NOT-SHIP: 2C/1I fixed; R2 SHIP); root review PASS with findings (0/3I/1M/3m, all artifact alignment; base → intermediate → head pollution ladder reproduced; 432-pair-style probes; shape-based sweep clean) → record-only fix round → round 2 PASS.
**Deviations:** STOP at Step 5 (four unclassified sweep sites) closed by the plan's dated 2026-09-09 refresh; the refresh's site-C attribution corrected by the review (`registry.ts:219` is the cause); six files beyond the wrapper's declared surface, all review-justified (`registry.ts` + test; the aggregate walker; `toProjectMatrixCompatibility`; the layer lookups).

### Task p05-t01: Execute external plan — Harden normalized config maps against a preserved `__proto__` key

**Status:** completed
**Commit:** `412abf81d` → integration `930466d4b`; record fix `054de3cf3` → `8d3291f6c`

## Phase 06: guard every packed asset directory (p06)

**Status:** complete · **Group:** 2 · **Tasks:** p06-t01
**Outcome:** the release contract guards a packed path under every one of the seven required bundle directories (correspondence test over the exported `REQUIRED_BUNDLE_DIRECTORIES`), with real-tarball pack controls derived from that list for every directory and the docs bullet scoped to the top-level shape `validateBundleStructure` checks.
**Verification:** focused 27; forced check/type-check/cli test `Cached: 0` (7114); check:skill-bumps; lint; format; validate-skills; one Codex round (1M fixed); root review PASS with findings (0/0/1M/1m; tarball-layer guard proven on two non-control directories; symlinked-directory probe) → fix round → round 2 PASS (0/0/0/0).
**Deviations:** none against the plan; the pack-control table is derived from the directory list rather than hand-listed (review m1).

### Task p06-t01: Execute external plan — Guard a packed path under every required asset directory

**Status:** completed
**Commit:** `8cf75b11b` → integration `b89540879`; fix `0f81fd8fa` → `a9a958b90`

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

## Review Received: p06 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p06-review-2026-09-09T013145Z.md (reviewed head `8cf75b11b4693bae70b59eb3f2cce32176ad009f`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 1 — PASS with findings. Verified: the guard bites at the tarball layer on two directories that are not the lane's controls (`assets/config`, `assets/scripts`) via real `pnpm pack` + `tar -tzf`; five adversarial probes incl. a dotfile-only directory (guard fires) and a symlinked `assets/docs` (pre-pack `[]`, tarball reports it — the layers' one disagreement); three negative controls both ways incl. the reviewer's own (an eighth name in `REQUIRED_BUNDLE_DIRECTORIES` reddens the correspondence test); `assets` + `dist` trees hash-identical before/after the suite; gates `Cached: 0`; scope exact (`configuration.md:95` md5 unchanged).

**Dispositions:**

- M1 — the docs bullet overstates the guarantee ("cannot ship a bundle that would make every command exit 2" covers only the directory-shape cause) and mis-attributes why the tarball check is load-bearing (both layers fire on an emptied directory; the tarball layer's independent value is the symlink / `files`-exclusion class): **fix round** (`w7-p06-fix-001`, resumed lane, append-only) — bullet qualified and re-attributed.
- m1 — the `it.each` pack-control table covers two of the four newly guarded directories: **fix round** (same commit) — table derived from the exported `REQUIRED_BUNDLE_DIRECTORIES`, proven able to fail.

**p06 row → `fixes_added`**; round 2 on the original reviewer handle follows the fix commit.

## Review Received: p06 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p06-review-2026-09-09T014928Z.md (reviewed head `0f81fd8fad4b92c7dba163b802bb44519d962c37`, manual, opus)
**Findings:** 0 · 0 · 0 · 0 — PASS. Verification records for the round-1 dispositions: M1 — the bullet's claims checked against `fs/assets.ts:186-219` (four exit-2 causes), the release contract (one `bundle-metadata` presence entry), and six re-run probes (both layers fire on an emptied directory; only the tarball layer catches the symlinked `assets/docs`); lines outside the bullet byte-identical to the phase base, `:95` md5 unchanged. m1 — seven derived controls, 27 passing; the lane's two removal controls re-run (3 of 27 red; retire-on-removal green); the reviewer's eighth-name control now reddens two tests; the reviewer's own round-1 "first path" suggestion proven wrong by a probe (false-fails `skills` and `templates`). Append-only (parent is the unamended `8cf75b11b`); forced build/check/test `Cached: 0` (cli 7114); asset and dist trees hash-identical.

**p06 row → `passed`** (reviewed head `0f81fd8fa`); p06 is clear for the group-2 fan-in.

## Review Received: p05 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p05-review-2026-09-09T015920Z.md (reviewed head `412abf81d8b42515d0bbf06cadbb94d103502258`, manual, opus)
**Findings:** Critical 0 · Important 3 · Medium 1 · Minor 3 — PASS with findings (no code defect; every Important is artifact alignment). Reproduced by the reviewer: the global-pollution ladder on the built CLI (base drops the key; the Step-2-only intermediate pollutes a fresh object's `high` property process-wide; the head preserves the key as data with no pollution); the plan's intermediate-red control (exactly six reds); seven control families both ways; ruling 5 (the dispatch-ceiling maps own their computed-literal key; reverting only `getCeilingAdapter` restores `unsupported (undefined)`); adversarial probes (`constructor`/`toString` providers through set/get/list/unset, `oat doctor`, the `gate target` lifecycle with a `__proto__` id, an independent shape-based sweep — no residual unguarded lookup); gates `Cached: 0` (cli 7128); the decision index proven regenerated. Scope-deviation table: all six deviations vs the wrapper surface justified against the external plan (`registry.ts` + test outside the scope union: reproduced defect and the real cause of site C).

**Dispositions:**

- I1 — the wrapper's p05 write surface was stale: **fixed** (root) — the Parallelism writes line now lists the 21 files as executed and item 6 names `gate/index.ts:1865`; verification: this commit, `oat project validate-plan` exit 0.
- I2 — `DR-260907-oat-config-reads-materialize.md` omits `buildResolvedConfigAggregate` (the only global-pollution site) and three other guarded sites: **fix round** (`w7-p05-fix-001`, resumed lane, record-only commit) together with m1.
- I3 — the external plan's refresh item (C) states a disproved root cause: **fixed** (root, plan write) — a dated correction sentence names `registry.ts:219` as the cause, the four additional sites, and the grep-by-shape lesson; verification: `grep -c 'Correction applied 2026-09-09 (from the p05 root review)' <plan>` = 1, corpus contract green.
- M1 — `BL-260908-guard-normalized-config-maps` close-out is owed: **deferred to the serialized archival at closeout** (contract item 7), as for every wave item.
- m1 — two stale DR anchors (`:2635`/`:2801` → `:2645`/`:2814`): **fix round** (same record-only commit as I2).
- m2 — four defensive guards without a possible or present control: **accepted** (the `:2042` guard is provably unobservable; the reviewer answered ruling 7: neither Codex Medium must be pinned before fan-in).
- m3 — a redundant set-then-get in the aggregate walk: **deferred** — polish, carried in the wave follow-up ledger (no code change in a record-only fix round).

**p05 row → `fixes_added`**; round 2 (disposition verification) follows the record-only fix commit.

## Review Received: p04 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p04-review-2026-09-09T020125Z.md (reviewed head `247f06b65cd9f517742d8924ceeacd16fdd944a0`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 3 — PASS with findings. Verified: the `sealed` deviation is sound (identical observable under `--json` and human output; `gate/index.ts` untouched; the only external caller's `try/catch` absorbs the throw into its warn-only path); weaker-anywhere clean (the key helpers byte-unchanged; 12 base rejections still exit 1; both halves of the Codex reordering live); the parked p09 bytes match the README's SHA-256s and apply against the base, and every head-vs-parked difference is a prescribed step; four neutralization controls both ways; five adversarial probes (incl. four racing seals → exactly one seal; a doubly-sealed legacy log reports `count: 2`); gates `Cached: 0`; bumps and pins exact; the only `.oat/repo/` write is the non-narrowing refresh entry.

**Dispositions:**

- M1 — the Codex reordering made the refusal conditional (a keyed append whose token matches any pre-seal entry body returns `already-appended`, writes nothing, exit 0) while four prose surfaces state it unconditionally, with no negative-direction control: **fix round** (`w7-p04-fix-001`, resumed lane, append-only) — the four surfaces qualified; one `append.test.ts` case pins the boundary from the other side.
- m1 — `oat-project-retro` is the one enumerated consumer left unrouted (a hand-run retro against a completed project now fails loudly at the append with no branch in its procedure): **fix round** (same commit) — one routing sentence in `apply-procedure.md`, `oat-project-retro` bumped once with pins by literal.
- m2 — the p09 contract case's seal-count assertion is true by construction (the capable proof is `lifecycle.integration.test.ts:451`): **fix round** (same commit) — made capable or dropped with a pointer.
- m3 — the `status: 'sealed'` union-variant drift in the external plan: **deferred to the wave-close correction pass** (already recorded under Deviations; a dated correction lands with the other p04 anchor notes).

**p04 row → `fixes_added`**; round 2 on the original reviewer handle follows the fix commit.

## Review Received: p05 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p05-review-2026-09-09T021127Z.md (reviewed head `054de3cf3b167ee993b33c9015211934f1d83e03`, manual, opus)
**Findings:** 0 · 0 · 1 medium · 2 minor — PASS. Verification records: I2/m1 — all seventeen anchors the decision record asserts re-derived by symbol at head; the two corrected anchors sit inside `writeHumanResolution` and `buildResolutionReport`; twelve backticked `__proto__`, zero bare; the index idempotent. Append-only (one file, +1/−1). I1 — the 21 declared paths are an exact set match with `git diff --name-only`; the collision grep hits only p05's own line. I3 — the correction's premise anchor (`{ [provider]: providerResolution }` at `:2249-2250`) re-derived. Gates: forced check, format, lint, Markdown guard 46/46, forced cli suite 387 files / 7128 `Cached: 0`.

**Dispositions (round 2):**

- M1 — the Phase 05 ordering paragraph still said "`:1220` only": **fixed** (root, this commit) — it now names `:1865` and the executed extra surfaces.
- m1 — the external plan's "In scope (added)" clause still omitted `registry.ts` and the extra dispatch-ceiling functions: **fixed** (root, plan write, this commit).
- m2 — three new DR anchors are line ranges in `commands/config/index.ts`, which p08 and p11 will shift: **accepted** — `DR-260907` added to the wave-close re-anchor list (follow-up ledger).

**p05 row → `passed`** (reviewed head `054de3cf3`); p05 is clear for the group-2 fan-in.

## Review Received: p04 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p04-review-2026-09-09T022119Z.md (reviewed head `6403c6ced75f4322720b0d51e548186ec8f0c9df`, manual, opus)
**Findings:** 0 · 0 · 0 · 1 minor — PASS. Verification records: M1 — four surfaces qualified and consistent with the unchanged `append.ts:1526-1548` path; every claimed behavior reproduced live on one sealed log; the new boundary case red under the reviewer's own reordering (`expected { status: 'sealed' … } to match { status: 'already-appended' … }`), restore hash-matched. m1 — the retro sentence at `apply-procedure.md:76-81` routes on both observables; exactly one bump (1.0.5 → 1.0.6; only two `version:` changes in the phase range); sweep hits are npm-release fixtures; provider views unchanged. m2 — the rename is accurate and the named capable control at `lifecycle.integration.test.ts:451` goes red under a deleted refusal. Shape: one commit on the unamended `247f06b65`, 8 files; gates forced `Cached: 0` (cli 7131; skills 883; smoke 167; `check:skill-bumps` validated three bumps).

**Disposition (round 2 Minor):**

- m1 — a fifth surface, `apps/oat-docs/docs/workflows/projects/lifecycle.md:198` (authored by this phase in round 1), still states the refusal unconditionally (the lane's sweep used the old exact wording): **address-now** (root, one-clause qualification identical to `oat-project-complete/SKILL.md:791`, committed on the integration branch at the group-2 fan-in and gated there).

**p04 row → `passed`** (reviewed head `6403c6ced`); group 2 is clear for fan-in.

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
- `w7-p04-impl-001`, `w7-p05-impl-001`, `w7-p06-impl-001` — group 2 dispatched together at `15c9a3b0919ea86e617d71bf50c791c8e583e3b9` (the tip after the group-1 fan-in bookkeeping); each target opus, task_class default-implementation; briefs carry the group-1 cumulative churn per surface (p04: the finalizer, the 1.7.10 bump to adopt, the two pins; p05: the `unsetConfigValue` barrier and `adopt` fold shifting its anchors, the repaired item title, the new Markdown guard; p06: none) and the rulings (p04: the recovered `parked/wave-5-p09/` bytes with the plan's step-1 figures; p05: the decision-record carve-out and the sibling-owned surfaces; p06: producers never edited). Records `dispatch/w7-p0{4,5,6}-impl-001.json`.
- `w7-p05-impl-001` outcome: BLOCKED at Step 5 (no commit; Steps 1–4 green and preserved uncommitted: 12 modified + 2 new files, all in scope; focused 780/780). The plan's `src`-wide sweep surfaced four unclassified sites: (A) `mergeEffectiveDispatchMatrix` swallows the preserved key one layer downstream of Step 2's fix; (B) `gate/index.ts:1865` `--target __proto__` crashes instead of "Unknown exec target"; (C) two `dispatch-ceiling` provider lookups print `unsupported (undefined)`; (D) `dispatch-report.ts:378` same class. Decision (root, dated refresh): A fixed and B–D guarded through the new helpers — three files added to In scope, cases 16–19, Step 6 names the sites; the lane resumes on its staged work.
- `w7-p06-impl-001` outcome: DONE, one commit `8cf75b11b4693bae70b59eb3f2cce32176ad009f` (four files). Free red at Step 2 (three missing packed paths), revert-the-fix control fails 4 of 22 incl. the correspondence test over the exported `REQUIRED_BUNDLE_DIRECTORIES`; one Codex round (static — vitest EPERM in its sandbox): one Medium fixed (prose overstated the failure mode; the pre-pack layer also `access`es every required path). Eight gates exit 0, `Cached: 0` (cli 7109). Friction: the worktree's `pnpm build` replayed FULL TURBO with root-checkout log paths — forced a real build before probing.
- `w7-p06-review-001` — reviewer, target opus, six rulings (tarball-layer guard incl. a third directory; producer untouched and `REQUIRED_BUNDLE_DIRECTORIES` content/order unchanged; no dist/assets mutation; Codex's Medium re-verified; scope incl. `configuration.md:95` untouched; one adversarial probe). Record `dispatch/w7-p06-review-001.json`.
- `w7-p06-review-001` outcome: PASS with findings, 0/0/1M/1m (tarball-layer guard proven on two non-control directories; symlinked-directory probe shows the tarball layer's independent value). M1/m1 → fix round `w7-p06-fix-001` on the resumed lane.
- `w7-p06-fix-001` outcome: one append-only commit `0f81fd8fad4b92c7dba163b802bb44519d962c37` (two files, +29/−14): the docs bullet scoped to the top-level shape `validateBundleStructure` checks with the `bundle-metadata.json` carve-out and the tarball layer re-attributed to paths that never reach the tarball; the pack-control table derived from `REQUIRED_BUNDLE_DIRECTORIES` (27 tests, each deriving the full filtered `requiredPaths` set — a first-path derivation would false-fail `templates`/`skills`); removal control 3 of 27 red; gates forced `Cached: 0` (cli 7114).
- `w7-p06-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w7-p06-review-002.json`.
- `w7-p06-review-002` outcome: PASS (fan-in may proceed), 0/0/0/0; both dispositions verified by the reviewer's own controls; the reviewer retracted its round-1 implementation suggestion after probing it.
- `w7-p05-impl-001` outcome (resumed): DONE, one commit `412abf81d8b42515d0bbf06cadbb94d103502258` (21 files). Beyond the refresh's four sites the lane fixed, with reproductions: the real cause of site C (`providers/ceiling/registry.ts:219` `getCeilingAdapter` returning `Object.prototype` past its `??` fallback — the two cited dispatch-ceiling maps own their computed-literal key), a Codex-found GLOBAL prototype pollution in `buildResolvedConfigAggregate` (the aggregate walker descends into `Object.prototype` for a `__proto__` provider — `({}).high` polluted process-wide; exposed by Step 2), `toProjectMatrixCompatibility` (project-state path), and the two ceiling layer lookups. Codex R1 DO-NOT-SHIP (3 fixed; run wedged after emitting — findings recovered from the run log), R2 SHIP. Intermediate-red control held (cases 9, 10, 14, 15). Seven gates exit 0, `Cached: 0` (cli 7128). `registry.ts` and its test are outside the plan's scope union — flagged for the review's scope-deviation table.
- `w7-p05-review-001` — reviewer, target opus, security-class brief (nine rulings: base-vs-head pollution repro incl. the intermediate state; scope-deviation table; weaker-anywhere across every guarded site; the intermediate-red control; the site-C correction; PJM carve-out; the two accepted Mediums; gates). Record `dispatch/w7-p05-review-001.json`.
- `w7-p04-impl-001` outcome: DONE, one commit `247f06b65cd9f517742d8924ceeacd16fdd944a0` (18 files). The recovered `parked/wave-5-p09/` bytes verified exactly (117/17, 218 lines, 165/249 lines, three SHA-256s) and applied; the seal is idempotent with a `sealed` field on `checkProjectLog` and a post-seal refusal; `oat-project-summary` 1.5.4 → 1.5.5; `oat-project-complete` kept at 1.7.10. One Codex round: Important — the sealed guard preceded key dedupe and broke the gate's idempotent keyed replay (fixed: key recognition first; new content still refused; control 10); the two untracked validators confirmed staged. Deviation: a thrown `ProjectLogSealedError` mapped to `{"status":"sealed"}` + exit 1 instead of a fourth result variant, because `gate/index.ts:3282` (p05's file) narrows `result.status`. Two uninventoried propagation surfaces (`autonomy-contract.md` prompt sites; `synced-bookkeeping-sites.json`). Ten controls red then restored; gates `Cached: 0` (cli 7130; `test:skills` 883; `test:smoke` 167).
- `w7-p04-review-001` — reviewer, target opus, nine rulings (the `sealed` deviation across every consumer; weaker-anywhere on the three named functions incl. the reordered key recognition; the consumer enumeration and the gate replay end to end; the parked-patch application; the two uninventoried surfaces; the carve-out refresh entry; bumps/pins; scope; one adversarial seal probe). Record `dispatch/w7-p04-review-001.json`.
- `w7-p05-review-001` outcome: PASS with findings, 0C/3I/1M/3m (no code defect; the global-pollution ladder reproduced base → intermediate → head; scope deviations all justified). I1/I3 fixed by the root; I2/m1 → record-only fix round `w7-p05-fix-001`; M1 closeout; m2 accepted; m3 deferred.
- `w7-p05-fix-001` outcome: one record-only commit `054de3cf3b167ee993b33c9015211934f1d83e03` (the decision record only): the four sites added to the guarded-site list with the pollution sentence, the two anchors re-derived by symbol (`:2645`, `:2814`); `oat decision regenerate-index` idempotent; Markdown guard 46/46; `pnpm check` 0.
- `w7-p05-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w7-p05-review-002.json`.
- `w7-p05-review-002` outcome: PASS (fan-in may proceed), 0/0/1M/2m — all seventeen DR anchors re-derived; the wrapper surface an exact set match; the residual Medium and one Minor fixed by the root in the receive.
- `w7-p04-review-001` outcome: PASS with findings, 0/0/1M/3m (deviation sound; weaker-anywhere clean; parked bytes verified; racing-seal probe). M1/m1/m2 → fix round `w7-p04-fix-001` on the resumed lane; m3 wave close.
- `w7-p04-fix-001` — bounded fix round (prose qualification ×4 + one negative-direction case; retro routing sentence + bump; capable seal-count assertion). Record `dispatch/w7-p04-fix-001.json`.
- `w7-p04-fix-001` outcome: one append-only commit `6403c6ced75f4322720b0d51e548186ec8f0c9df`: the four refusal surfaces qualified (keyed replay → `already-appended`, new content refused) with a negative-direction `append.test.ts` case (red under neutralized key recognition); `oat-project-retro` routed on the sealed outcome and bumped 1.0.5 → 1.0.6 (no pins exist; sweep clean; provider views unchanged); the vacuous seal-count assertion dropped in favor of the load-bearing one with a pointer to the capable integration control. Gates forced `Cached: 0` (cli 7131; skills 883; smoke 167; `check:skill-bumps` validated two bumps).
- `w7-p04-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w7-p04-review-002.json`.
- `w7-p04-review-002` outcome: PASS (fan-in may proceed), 0/0/0/1m; all three dispositions verified by the reviewer's own controls; the one new Minor (a fifth unqualified docs sentence) taken as a root address-now at the fan-in.
- `w7-p07-impl-001`, `w7-p08-impl-001`, `w7-p09-impl-001` — group 3 dispatched together at `4a1ea5a79c64681a82d1f5aaf6ccc6784f6eaf11` (the tip after the group-2 fan-in bookkeeping); each target opus, task_class default-implementation; briefs carry the groups-1–2 cumulative churn per surface (p07: the re-pinned `skills.test.ts`; p08: p02's barrier and p05's own-key guards in `commands/config/index.ts` and `config/oat-config.ts` and their tests, `normalizeOatConfig` untouched; p09: p06's bullet in `configuration.md`) and the rulings (p07: bump 1.2.3 → 1.2.4, pins by literal; p08: `commands/instructions/**` is p09's; p09: `config/**` and `commands/config/**` are p08's, symlink fixtures per the plan). Records `dispatch/w7-p0{7,8,9}-impl-001.json`.

#### Group 1 fan-in (2026-09-09)

- `wave-7/p01`, `wave-7/p02`, `wave-7/p03` rebased onto the integration tip and merged in plan order with `git merge --no-ff` as `ea2f5a675`, `7b9793b8f`, `f175ca2da`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `dd6658e0b`→`7bd744502`, `1913a950f`→`a6da561cc`, `7dfaa6bc1`→`08b2b030a`, `c4053df73`→`e92bb7b91`, `b108f2dbf`→`e8cbfb090`.
- Lockstep bump `f0eb1c02e` (0.2.66 → 0.2.67 above freshly fetched `origin/main` `684bd3be3`) with the project-scope sync manifest restamp in the same commit (`sync exit=0`, "Manifest version refreshed; no content changes required").
- Integration gates (sequential, exit codes captured, run before any bookkeeping edit): `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached; cli 386 files / 7105 tests), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0, `pnpm test:skills` 0, root `pnpm test` 0. Config-integrity check: no tracked `.oat/config.json` key missing versus `origin/main`.
- Backlog index regenerated by p03's own commit (two title rows); no lane closed or renamed an item at this fan-in beyond that.
- Worktrees `.worktrees/wave-7/p0{1,2,3}` and branches `wave-7/p0{1,2,3}` removed after the merge.

#### Group 2 fan-in (2026-09-09)

- `wave-7/p04`, `wave-7/p05`, `wave-7/p06` rebased onto the integration tip and merged in plan order with `git merge --no-ff` as `a9bfb0a3c`, `7bbafded2`, `28618fbba`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `247f06b65`→`a31f5f976`, `6403c6ced`→`322a7bea8`, `412abf81d`→`930466d4b`, `054de3cf3`→`8d3291f6c`, `8cf75b11b`→`b89540879`, `0f81fd8fa`→`a9a958b90`.
- Root address-now `572a4dd87`: the fifth sealed-log prose surface (`lifecycle.md:198`) qualified to match the other four (p04 round-2 Minor); Markdown guard 46/46.
- Lockstep retained at 0.2.67 (no new bump; `origin/main` still 0.2.66 at `684bd3be3`).
- Integration gates (sequential, exit codes captured, before any bookkeeping edit): `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached; cli 387 files / 7163 tests), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0, `pnpm test:skills` 0, root `pnpm test` 0. Config-integrity check: no tracked `.oat/config.json` key missing versus `origin/main`.
- Backlog index: no lane closed or renamed an item in this group (p05's decision-record update regenerated the decision index with no diff).
- Worktrees `.worktrees/wave-7/p0{4,5,6}` and branches `wave-7/p0{4,5,6}` removed after the merge.

<!-- orchestration-runs-end -->

## Implementation Log

Chronological log of implementation progress (root orchestrator; lane detail lives in the dispatch transcripts and review artifacts).

### 2026-09-09

- Group 2 fan-in: merges `a9bfb0a3c`, `7bbafded2`, `28618fbba`; address-now `572a4dd87`; lockstep retained at 0.2.67; eight gates + smoke + skills + root test green (0 cached; cli 7163). Group 3 (p07 + p08 + p09) bootstraps next.
- p05 round 2 passed (0/0/1M/2m; both record residues fixed in the receive) at `054de3cf3`; p05 row `passed`.
- p04 round 2 passed (0/0/0/1m) at `6403c6ced`; p04 row `passed`; group 2 fan-in starts.
- p04 review received (PASS with findings, 0/0/1M/3m): fix round `w7-p04-fix-001` dispatched; p04 row `fixes_added`.
- p05 review received (PASS with findings, 0/3I/1M/3m — artifact alignment): wrapper surface and plan refresh corrected by the root; DR fix round `w7-p05-fix-001` dispatched; p05 row `fixes_added`.
- p06 round 2 passed (0/0/0/0) at `0f81fd8fa`; p06 row `passed`.
- p06 review received (PASS with findings, 0/0/1M/1m): fix round `w7-p06-fix-001` dispatched; p06 row `fixes_added`.
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

| Task / Review | Source Artifact         | Planned / Documented                                                      | Actual / Accepted                                                                                                                                                                                                                     |
| ------------- | ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none yet)    | -                       | -                                                                         | -                                                                                                                                                                                                                                     |
| p01-t01       | plan step 5 / Test plan | raw guard restored → case 5 fails on all three invocation forms           | raw guard fails only the plain form; a one-sided canonicalization is the control for the two preserve-symlinks forms (dated correction entry in the plan)                                                                             |
| p02-t01       | plan step 2             | delete the strict effective read; `envShadowed` from `resolveEnvOverride` | the probe kept; a targeted strict barrier reads the untargeted surfaces (and the targeted shared surface on the raw-write branch) before any write (dated post-STOP refresh)                                                          |
| p03-t01       | plan step 2             | strip inline code spans on each remaining line                            | block-scoped CommonMark masking with container-aware fences, HTML blocks 1–7, fence lines as boundaries; `oxfmt`-derived invariant (dated refresh)                                                                                    |
| p04-t01       | plan step 4             | fourth `ProjectLogAppendResult` variant `status: 'sealed'`                | thrown `ProjectLogSealedError` mapped at the command layer to `{"status":"sealed"}` + exit 1 (`gate/index.ts:3282` narrows `result.status`; out of scope); refusal conditional on key recognition (keyed replay → `already-appended`) |
| p05-t01       | plan step 5             | expected classification from the inspected files                          | four unclassified sites on the `src`-wide sweep → dated refresh (A fixed, B–D guarded); site C's real cause `registry.ts:219`; the aggregate walker's global pollution and two more sites fixed with controls                         |
| p06-t01       | plan test plan          | two hand-listed pack controls                                             | controls derived from `REQUIRED_BUNDLE_DIRECTORIES` (seven)                                                                                                                                                                           |

## Test Results

| Phase      | Tests Run                                                                    | Passed | Failed | Coverage |
| ---------- | ---------------------------------------------------------------------------- | ------ | ------ | -------- |
| (none yet) | -                                                                            | -      | -      | -        |
| p01        | focused 7 + `test:skills` 870 + `test:smoke` 167 + forced CLI suite          | all    | 0      | -        |
| p02        | focused 288 + forced CLI suite (385 files)                                   | all    | 0      | -        |
| p03        | focused 46 + forced CLI suite (386 files / 7093)                             | all    | 0      | -        |
| g1 fan-in  | eight DoD gates + smoke + skills + root test (0 cached; cli 7105)            | all    | 0      | -        |
| p04        | focused 429 + `test:skills` 883 + `test:smoke` 167 + forced CLI suite (7131) | all    | 0      | -        |
| p05        | focused 780 + forced CLI suite (387 files / 7128)                            | all    | 0      | -        |
| p06        | focused 27 + forced CLI suite (7114)                                         | all    | 0      | -        |
| g2 fan-in  | eight DoD gates + smoke + skills + root test (0 cached)                      | all    | 0      | -        |

## Deferred Findings

_None yet._

## Final Summary (for PR/docs)

_Filled at closeout._

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Index: `.oat/repo/reference/external-plans/2026-09-08-backlog-review-wave-7-plan-index.md`
