---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_current_task_id: p16-t01
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

| Phase    | Status             | Tasks | Completed |
| -------- | ------------------ | ----- | --------- |
| Phase 1  | complete           | 1     | 1/1       |
| Phase 2  | complete           | 1     | 1/1       |
| Phase 3  | complete           | 1     | 1/1       |
| Phase 4  | complete           | 1     | 1/1       |
| Phase 5  | complete           | 1     | 1/1       |
| Phase 6  | complete           | 1     | 1/1       |
| Phase 7  | complete           | 1     | 1/1       |
| Phase 8  | complete           | 1     | 1/1       |
| Phase 9  | complete           | 1     | 1/1       |
| Phase 10 | complete           | 1     | 1/1       |
| Phase 11 | complete           | 1     | 1/1       |
| Phase 12 | complete           | 1     | 1/1       |
| Phase 13 | complete           | 1     | 1/1       |
| Phase 14 | complete           | 1     | 1/1       |
| Phase 15 | complete           | 1     | 1/1       |
| Phase 16 | parked (plan STOP) | 1     | 0/1       |
| Phase 17 | pending            | 1     | 0/1       |
| Phase 18 | pending            | 1     | 0/1       |
| Phase 19 | pending            | 1     | 0/1       |
| Phase 20 | pending            | 1     | 0/1       |

**Total:** 15/20 tasks completed

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

**Status:** complete · **Group:** 3 · **Tasks:** p07-t01
**Outcome:** the oat-doctor dashboard example describes a state the doctor can report: every pack appears in exactly one of the installed / available sections, backed by a disjointness case whose extractions must be complete (every table row and bullet parses; parsed counts equal candidate counts); `oat-doctor` 1.2.3 → 1.2.4 (no pin exists).
**Verification:** focused 3; `skills.test.ts` 213; forced check/type-check/cli test `Cached: 0` (7164); check:skill-bumps; lint; format; validate-skills; `test:skills` 883; `test:smoke` 167; one Codex round (two Importants rejected as pre-existing and out of scope); root review PASS with findings (0/0/1M/2m; three controls re-run; extraction-completeness gap found by the reviewer's probe) → test-only fix round → round 2 PASS (0/0/0/1m, taken as a root address-now).
**Deviations:** none; two pre-existing example defects (`brainstorm` in neither section; pack-level status semantics) carried to closeout.

### Task p07-t01: Execute external plan — Make the oat-doctor dashboard example describe a state the doctor can report

**Status:** completed
**Commit:** `07e643840` → integration `5183dce44`; fix `617356891` → `51cee6b3c`; root address-now `001ecfa7e`

## Phase 08: warn on wrong typed documentation root (p08)

**Status:** complete · **Group:** 3 · **Tasks:** p08-t01
**Outcome:** a wrong-typed `documentation.root` (number, object, array, null, boolean) now warns instead of dropping in silence: `readOatConfigWithWarnings` / `OatConfigRead` carry the warning through a sink, `oat config get` and `list` read once and print it once (stderr in human mode; a `warnings` array under `--json`, omitted when empty); the value still falls back to the default and every other key's handling is unchanged.
**Verification:** focused 421; forced check/type-check/cli test `Cached: 0` (387 files / 7182); check:skill-bumps (nothing); lint; format; validate-skills; four controls both ways; built-CLI Done criteria in a scratch repo; one Codex round (1I rejected with a read count — `list` read 109 times at base; 1M + 3m fixed); root review PASS with findings (0/0/0/5m; 26-fixture base-vs-head normalizer battery identical; `--json` channel exact; reader count `list` 109 + 1 / `get` 1 + 1) — all deferred or record-fixed, no fix round.
**Deviations:** none against the plan; the plan's cited malformed-JSON case at `oat-config.test.ts:117` did not exist (dated correction entry); no pre-existing `documentation` test breaks when the warning goes noisy — the new exact-match assertions carry that guard.

### Task p08-t01: Execute external plan — Warn on a wrong-typed `documentation.root` instead of dropping it in silence

**Status:** completed
**Commit:** `a0fa6c654` → integration `078eeb443`

## Phase 09: name the resolved symlink target (p09)

**Status:** complete · **Group:** 3 · **Tasks:** p09-t01
**Outcome:** the instruction-pointer exclusion warning names the resolved target (or the on-disk spelling for a case-only mismatch) instead of blaming filesystem case-sensitivity for every inert entry; the `absent` message is byte-identical; no inert entry became effective (a 16-scenario base-vs-head differential); the docs sentence updated.
**Verification:** focused 94+; check; type-check; forced test `Cached: 0`; check:skill-bumps (nothing); lint; format; validate-skills; `oat docs generate-index` no diff; two Codex rounds (R1 1M fixed — exhaustive narrowing via a typed `Extract`; R2 clean); root review PASS with findings (0/1I/1M/2m) → fix round → round 2 PASS (0/0/0/0).
**Deviations:** the lane's "case-insensitivity simulation inert on macOS" diagnosis was false (the old anchor fired by substring match) — the re-key kept as a clarity change with a corrected comment; the root-relative clauses now pinned.

### Task p09-t01: Execute external plan — Name the resolved target in the symlink inert-exclusion warning

**Status:** completed
**Commit:** `04a9a29ca` → integration `f3822e7bb`; fix `99675387b` → `e88ba925f`

## Phase 10: repair stray fences in lifecycle skills (p10)

**Status:** complete · **Group:** 4 · **Tasks:** p10-t01
**Outcome:** the stray fences that hid normative prose in five skill assets (`oat-project-review-provide`, `oat-repo-knowledge-index`, `oat-repo-improve`'s plan template, `create-agnostic-skill`'s skill template, `oat-agent-instructions-apply`'s glob-scoped rule) are repaired with prose byte-identical apart from fence markers, five `metadata.version` bumps once each with six pins by literal, and the fence scanner in `named-skill-load-contract.test.ts` now walks 205 files recursively with an inventory floor, a new after-prose defect shape, and a `readdir` failure that propagates instead of scanning less.
**Verification:** forced check/type-check/test `Cached: 0` (cli 7193); check:skill-bumps; lint; format; validate-skills; build; `test:smoke` 167; `test:skills` 883; nine controls red-then-green; one Codex round (1I fixed); root review PASS with findings (0/1I/0/5m; a 60,225-case differential fuzz on the scanner clean; prose immutability re-proven; the Important was the unfiled follow-up, filed by the root).
**Deviations:** the Step 8 control-2 prediction (green under a non-recursive walk) does not reproduce — the Step 5 floor makes it red; oxfmt re-widened one repaired fence to four backticks (required by the format gate); the five bare-fence instances outside `.agents/skills` filed as `BL-260909-repair-the-bare-fences-that`.

### Task p10-t01: Execute external plan — Repair the stray fences that hide normative skill prose and widen the fence scanner across `.agents/skills`

**Status:** completed
**Commit:** `88fbc8786` → integration `18d9187fb`

## Phase 11: close the docs index follow ups (p11)

**Status:** complete · **Group:** 4 · **Tasks:** p11-t01
**Outcome:** the wave-1 docs-index follow-ups are closed: `oat docs init` prints a `Docs source index` bullet for both frameworks, the index-generate hop-cap refusal is role-aware (a derived docs-dir chain exits 2 naming the operator-facing path), an empty manifest prints a distinct observational line naming the active exclusion count and patterns, and `DEFAULT_SHARED_CONFIG.documentation` carries `excludes` and `instructionPointerExcludes` defaults so `config dump` reports them (nothing else changes).
**Verification:** focused 139; forced check/type-check/cli test `Cached: 0` (387 files / 7196); check:skill-bumps; lint; format; validate-skills; build; ten cases red-then-green; the config STOP bounded with pre/post builds; two Codex rounds (R1 2I fixed — the docs overpromised the hop cap for real chains, the empty-manifest line blamed the exclusions; R2 SHIP); root review PASS with findings (0/0/0/4m; an 8-role hop-cap probe at base and head; a two-build config diff; four adversarial probes).
**Deviations:** the MkDocs bullet relabeled too (accepted within the Outcome); three stale plan clauses corrected by a dated entry (the pre-fix prediction, the causal wording, the refusal text for real chains).

### Task p11-t01: Execute external plan — Close the docs-index follow-ups from the wave-1 reviews

**Status:** completed
**Commit:** `0b5c3307e` → integration `6e3345bbb`

## Phase 12: persist native skill adoption in status (p12)

**Status:** complete · **Group:** 4 · **Tasks:** p12-t01
**Outcome:** `oat status` persists and restamps the sync manifest after a native-skill adoption (both the first adopt and a confirmed `replaceCanonical` retry set `manifestChanged`; a native adopt adds no row; `keep` never writes), the checklist-abort harness now really aborts, and the `adopt-stray` neutrality case is pinned on a non-empty manifest.
**Verification:** forced check/type-check/cli test `Cached: 0` (387 files / 7194); check:skill-bumps; lint; format; validate-skills; three controls both ways; two Codex rounds (R1 2I/1M/1m — one Important partially accepted with the rename-is-irreversible argument, the rest fixed; R2 confirmed); root review PASS with findings (0/0/0/3m; a real pty adopt on a v1 manifest; three `continue` branches probed).
**Deviations:** none against the plan; the plan's `lastUpdated is set` wording is a carry-through, not a refresh (wave-close note); the `createManifest` helper corrected to schema-valid v2.

### Task p12-t01: Execute external plan — Make `oat status` persist and pin its native-skill adoption outcome

**Status:** completed
**Commit:** `e503bf025` → integration `c32adbb90`

## Phase 13: tighten the skill version validators (p13)

**Status:** complete · **Group:** 5 · **Tasks:** p13-t01
**Outcome:** the skill version validators close their gaps: agent roles under `.agents/agents/*.md` are version-gated, an unresolvable version is a finding instead of a silent pass, the top-level `version:` alias promotion is a structural error while the bump gate still accepts an alias-only skill with a valid bump, and `check:skill-bumps` covers whole skill directories (`scripts/`, `references/`, everything but `tests/`) with `-z`/NUL-safe path handling; `AGENTS.md`'s bump rule and the contributing docs say so.
**Verification:** forced check/type-check/test `Cached: 0`; check:skill-bumps (9 owning files, 0 findings); lint; format; validate-skills (83 directories clean); sixteen controls against a pre-fix CLI snapshot; two Codex rounds (R1 1C/2I/2M/1m fixed; R2 one Critical rejected as a plan-licensed narrowing, 1M/2m fixed); root review PASS with findings (0/0/1M/3m; a 30-shape base-vs-head battery through real `git init` fixtures; the narrowing adjudicated licensed; the literal Step-4 guard placement shown to violate STOP 3).
**Deviations:** a `SKILL.md` nested under `<skill>/tests/` is no longer version-checked (plan boundary; input set empty; recorded on the item); an absent-owning-`SKILL.md` sibling exits 0 instead of 2 (plan-mandated, pinned); three test fixtures outside the plan's list (clause B's forced propagation); six plan-internal inconsistencies recorded by a dated correction.

### Task p13-t01: Execute external plan — Close the version-validator gaps: agent roles, unresolvable versions, the alias promotion, and scripts-only skill changes

**Status:** completed
**Commit:** `5846efdb0` → integration `9e6683b20`

## Phase 14: fix sync apply failure summary (p14)

**Status:** complete · **Group:** 5 · **Tasks:** p14-t01
**Outcome:** a rejected `oat sync` apply no longer ends with "No changes required.": the failure arm wins before the restamp-only ternary, so the run prints `Sync completed with partial failures.` (exit 1 unchanged).
**Verification:** forced check/type-check/cli test `Cached: 0`; check:skill-bumps; lint; format; validate-skills; premise reproduced byte-for-byte; controls incl. a substitute exit-code control; Codex: no findings; root review PASS with findings (0/1I/2M/1m — all plan-artifact or deferred: a multi-scope body suffix the plan forbids fixing here; the unsatisfiable exit-code control; the conjunct's missing pin).
**Deviations:** none in code; three plan corrections recorded by a dated entry; the `--scope all` body suffix and its pin deferred to a closeout follow-up.

### Task p14-t01: Execute external plan — Make `oat sync` report a failure summary instead of "No changes required." when a rejected collection leaves zero planned operations

**Status:** completed
**Commit:** `18ea51bb3` → integration `c4dbac3f3`

## Phase 15: converge copy strategy skill projections (p15)

**Status:** complete · **Group:** 5 · **Tasks:** p15-t01
**Outcome:** a copy-strategy skill projection reads `in_sync` immediately after sync: the banner-and-sentinel-aware directory hash is extracted into `engine/managed-copy-hash.ts`, hardened (a symlinked provider root or sentinel is rejected), and used by the drift detector, the planner, and the retirement classifier, so a faithful copy converges without a re-sync while tampered, forged, or substituted views still repair.
**Verification:** forced check/type-check/cli test `Cached: 0` (cli 7231); check:skill-bumps; lint; format; validate-skills; focused 334; two Codex rounds (R1 1C — the STOP — + 1m; R2 one TOCTOU Critical rejected with the subset argument); root review PASS with findings (0/0/0/3m; a 14-shape, four-consumer base-vs-head table; convergence proven against a base-built manifest).
**Deviations:** STOP at the pre-commit gate (the verbatim-moved helper accepted symlinked views) closed by the plan's dated 2026-09-09 refresh (harden the helper; retirement turns `detach` for a symlinked sentinel); the refresh's own attribution corrected after review; one of eight new cases labelled as a composite pin.

### Task p15-t01: Execute external plan — Converge copy-strategy skill projections so a synced copy reads in sync

**Status:** completed
**Commit:** `53a0a2fcb` → integration `68c4da2e1`; root address-now `da248f346`

## Phase 16: calculate dispatch baselines after journaling (p16)

**Status:** parked (plan STOP) · **Group:** 6 · **Tasks:** p16-t01
**Outcome:** not delivered — the plan's Step 3 git seam is forbidden by the recorder graph's architectural no-process guard; partial Steps 2–3 preserved at `parked/wave-7-p16/`; the item returns to planning as a decision.
**Verification:** drift clean; pins re-anchored by literal; the Step 1 premise reproduced live; the three-way guard control (base green, Step 2 green, Steps 2 + 3 red at `record.test.ts:1901`).
**Deviations:** parked on a STOP the plan's own list does not name (a plan-vs-guard conflict); three further plan defects recorded in the plan's dated STOP entry.

### Task p16-t01: Execute external plan — Resolve the accepted execution baseline after mandatory launch journaling, and make the ordering auditable

**Status:** parked (plan STOP)
**Commit:** — (no commit; partial patch at `parked/wave-7-p16/p16-partial-steps2-3.patch`)

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

## Review Received: p07 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p07-review-2026-09-09T030201Z.md (reviewed head `07e6438401db5368a3a89ecb0e7ebbf263e525af`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 2 — PASS with findings. Verified: exactly the two declared files with no relaxed pre-existing case; all three controls re-run (re-added row → red with both pre-existing cases green; both heading renames → red); no `oat-doctor` pin anywhere (plain and escaped sweep), one bump; both Codex rejections stand; gates `Cached: 0` (cli 7164; skills 883; smoke 167); provider views unchanged.

**Dispositions:**

- M1 — `availablePacks` is regex-derived and only asserted non-empty, so a bullet that stops matching silently leaves the disjointness set (reviewer probe: a re-added `docs` row plus a `(7 skills)` suffix change stay green): **fix round** (`w7-p07-fix-001`, resumed lane, append-only, test-only) — assert extraction completeness (parsed counts equal the candidate lines/rows), proven red with the reviewer's probe.
- m1 — `brainstorm` appears in neither example section (pre-existing, out of scope): **deferred** — candidate backlog item at closeout (follow-up ledger).
- m2 — the `Status` column contradicts the `## Outdated Skills` table (pre-existing; no derivation rule exists): **deferred** — semantics decision noted at closeout (follow-up ledger).

**p07 row → `fixes_added`**; round 2 on the original reviewer handle follows the fix commit.

## Review Received: p08 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p08-review-2026-09-09T030639Z.md (reviewed head `a0fa6c654bfd3851a0688cde4bc54a976f0313bf`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 5 — PASS with findings. Verified: a 26-fixture base-vs-head normalizer battery (accept/reject and normalized value identical; the probe proven able to fail); the `--json` channel on a rebuilt CLI (one stderr line in human mode; zero stderr bytes and exactly one document with one `warnings` entry under `--json`; no `warnings` key on a valid root); reader calls counted with a module mock (`list` 109 + 1, `get` 1 + 1 — the head adds exactly one read, so the rejected Codex finding stands); controls A (13 red), B (exactly the two no-noise cases red — the new exact-match assertions judged sufficient), D re-run; gates re-forced `Cached: 0` (cli 7182); scope exact.

**Dispositions (all Minor; no code change; no fix round):**

- m1 — `get` was atomic at base and now performs two reads: **deferred** — the shared-read follow-up the lane named (needs `config/resolve.ts`), carried in the follow-up ledger.
- m2 — the warning rides on every `config get <key>` `--json` document, unpinned: **deferred** — documented as behavior of the once-per-command read in the plan correction; a pinning case joins the follow-up ledger.
- m3 — a wrong-typed `documentation` container, `config dump`, and `instructions validate` remain silent: **deferred** — outside the plan's Outcome; the `instructions.utils.ts:303` wiring is the lane-named follow-up.
- m4 — the new `--json` field is undocumented: **deferred** — the plan-deferred docs sentence (follow-up ledger).
- m5 — two record inaccuracies: the lane's control-A count (11 vs the reviewer's 13) is corrected here (the reviewer's figure stands); the external plan's nonexistent `:117` case: **fixed** (root, plan write) — a dated correction entry records the missing case, the lane's own assertion, and the named follow-ups; verification: `grep -c 'Correction applied 2026-09-09 (wave-7 p08' <plan>` = 1, corpus contract green.

**p08 row → `passed`** (reviewed head `a0fa6c654`); p08 is clear for the group-3 fan-in.

## Review Received: p09 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p09-review-2026-09-09T031251Z.md (reviewed head `04a9a29ca1b4a587f9af6c1263ad7b6d5fef00bb`, manual, opus)
**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 2 — PASS with findings. Verified: weaker-anywhere by code identity (the sole `effective.push` is guarded by `probe.kind === 'exact'`, textually the base condition) and by a base-build-vs-head-build differential over 16 filesystem scenarios (0 differences in `effective`/`configured`; warning text differs only on the six intended scenarios); the `absent` message `cmp`-identical; real symlinks work on this host; all three lane controls plus three of the reviewer's own re-run; seven gates forced `Cached: 0`; scope exact (`configuration.md` byte-identical except `:96`).

**Dispositions:**

- I1 — the re-keyed case-insensitivity simulation's comment records a false diagnosis (the old anchor fired three times — `String.prototype.replace` substring-matches `/var/folders/…` inside `/private/var/…` — so the re-key is behaviorally neutral): **fix round** (`w7-p09-fix-001`, resumed lane) — the lane reproduces the counts and rewrites the comment; this record's p09 outcome line is corrected accordingly.
- M1 — the `resolved.length > 0 && resolved !== '..'` clauses are unpinned (deleting them leaves all 94 tests green while a repo-root symlink would emit `resolves to ""`): **fix round** (same commit) — a root-symlink case pinning the exact warning, proven red.
- m1 — the docs sentence omits that the case-sensitivity warning now also names the on-disk spelling: **fix round** (same commit).
- m2 — dangling/file/circular symlinks still get the deliberately frozen case-sensitivity hint: **deferred** — backlog note at closeout (follow-up ledger).

**p09 row → `fixes_added`**; round 2 on the original reviewer handle follows the fix commit.

## Review Received: p07 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p07-review-2026-09-09T031521Z.md (reviewed head `6173568916690b2a0b5da0420cb89b6d836c794b`, manual, opus)
**Findings:** 0 · 0 · 0 · 1 minor — PASS. Verification record for M1: probe G (formerly green) now red naming the bullet verbatim; the reviewer's probe H (a trailing annotation) red; the installed-side control red naming the `utility` row; the header/separator exclusions replicated independently (4 data rows of 6 pipe lines; filters structurally cannot match a data row); one strictly additive commit (40 insertions); focused 3, file 213, `check:skill-bumps` 0, forced cli test 7164 `Cached: 0`.

**Disposition (round 2 Minor):**

- m1 — candidates are recognized with `startsWith('|')` / `startsWith('- ')` while the strict patterns are `^`-anchored, so a line with one leading space is invisible to both counts: **address-now** (root, the reviewer's one-line-per-side fix — `/^\s*\|/` and `/^\s*- /` with the same prefix on the header/separator exclusions — committed on the integration branch at the group-3 fan-in and gated there).

**p07 row → `passed`** (reviewed head `617356891`); p07 is clear for the group-3 fan-in.

## Review Received: p09 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p09-review-2026-09-09T032543Z.md (reviewed head `99675387b1d651e9e6fb71231df26864a573e7d9`, manual, opus)
**Findings:** 0 · 0 · 0 · 0 — PASS. Verification records: I1 — the rewritten comment re-instrumented at head (old key 3 firings, two on the realpath'd root; new key 3; no injection 0) plus a variant that rejects any `/Apps/Docsapp` path (a case-sensitive runner) falling to the `absent` branch, so every clause is supported; M1 — the new case red under both clauses deleted and under each alone (`self` → `""`, `up` → `".."`), proving `up` reaches the probe; `instructions.utils.ts` blob-identical between the reviewed heads, so round 1's 16-scenario differential carries over; m1 — the docs clause matches the emitted message; p06's region byte-unchanged; one append-only commit, two files; gates forced `Cached: 0` (cli 7167).

**p09 row → `passed`** (reviewed head `99675387b`); group 3 is clear for fan-in.

## Review Received: p12 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p12-review-2026-09-09T042015Z.md (reviewed head `e503bf02527736ebbe5be7a8055d0e34990ab69f`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 3 — PASS with findings. Verified: the abort-after-adopt disposition (the rename at `adopt-stray.ts:137` precedes the early return; `migrationAborted` suppresses prompts, not persistence; `keep`-only and abort-before-adopt still write nothing); the three STOP-class invariants; all three controls from a hash-checked backup; no pre-existing case body modified; the `createManifest` helper correction (the v2 schema requires `version: 2` and `collections`); scope exact; a real `oat status` adopt through a pty in a scratch repo seeded with a v1 manifest (persisted as v2, no row, second run silent) plus `--scope all` user-scope creation; three probes closing the `continue` branches; gates forced `Cached: 0` (cli 7194).

**Dispositions (all Minor; no code change; no fix round):**

- m1 — the persisted `lastUpdated` is a carry-through, not a refresh (plan wording): **deferred** — wave-close correction note (follow-up ledger, already flagged by the lane).
- m2 — the `useDiskManifestPersistence` cwd guard is unexercised: **deferred** — polish (follow-up ledger).
- m3 — `packages/cli/tsconfig.json:27` excludes test files from every type gate (pre-existing): **deferred** — feeds `BL-260907-type-check-cli-test-files`.
- Record precision: control 1 fails at the symlink clause (vitest stops at the first failing assertion) and control 2's disk case fails at the spy assertion — the lane's report figures are superseded by the reviewer's; both underlying claims hold (neutrality verified separately by probe A).

**p12 row → `passed`** (reviewed head `e503bf025`); p12 is clear for the group-4 fan-in.

## Review Received: p11 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p11-review-2026-09-09T042640Z.md (reviewed head `0b5c3307edc2c239431b00fa4281cd85f41e418e`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 4 — PASS with findings. Verified: hop-cap weaker-anywhere with a recording probe over 8 role cases at base and head (acceptance identical; only messages and the sanctioned 1 → 2 moved; a real 41-link chain dies on `ELOOP` at exit 1 for both roles); the config STOP with two CLI builds and path-normalized diffs (`dump` differs by exactly the two rows; `list --json`, `get`, `unset`, `adopt` byte-identical; p08's warning path identical); the ten red-then-green cases and the `isAtOrInside` pin; four adversarial probes green at head and red at base; the MkDocs relabel adjudicated an accepted deviation within the Outcome; scope exact; gates forced `Cached: 0`. Caveat: `pnpm test:smoke` failed once on `cursor-broker.test.mjs` (ENOENT on a temp broker file) — not attributable to p11 (zero paths under `tools/`), 3/3 in isolation; watched at the fan-in.

**Dispositions (all Minor; no code change; no fix round):**

- m1 — `hopCapError`'s `other` role inherits the `--output` advice with no comment that it is unreachable by construction: **deferred** — polish (follow-up ledger).
- m2 — the empty-manifest docs bullet does not say the line is human-output only: **fixed** (root, plan-side note in the correction entry; the docs bullet itself joins the polish ledger).
- m3 — three stale plan clauses: **fixed** (root, plan write) — a dated correction entry records all three plus the accepted MkDocs deviation; verification: `grep -c 'Correction applied 2026-09-09 (wave-7 p11' <plan>` = 1, corpus contract green.
- m4 — `BL-260906-docs-index-follow-ups-from` still says "(behaviorally inert)": **deferred to the closeout archival**, where the item's summary is written.

**p11 row → `passed`** (reviewed head `0b5c3307e`); p11 is clear for the group-4 fan-in.

## Review Received: p10 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p10-review-2026-09-09T042652Z.md (reviewed head `88fbc8786a1147b02cfdb1bdb973e6175cd369ed`, manual, opus)
**Findings:** Critical 0 · Important 1 · Medium 0 · Minor 5 — PASS with findings (no lane code change). Verified: prose immutability by the reviewer's own normalizer (0 residual lines; equal line counts); five bumps and every pin; the widened scanner's numbers reproduced by an instrumented probe (`boundedFiles=42 fenceScanFiles=205 candidates=179`, 180 with review-provide reverted); the Codex control's vacuity claim confirmed (a control routed through `assertContractCurrent` passes with the bug present; the shipped unit-targeted control goes red); weaker-anywhere by a 60,225-case differential fuzz (head ⊇ base, 0 violations); the oxfmt-widened fence proven required by the `pnpm format` gate; scope exact; nine gates green.

**Dispositions:**

- I1 — the plan-directed follow-up item for the five bare-fence instances outside `.agents/skills` was not filed (the lane correctly could not): **fixed** (root) — `BL-260909-repair-the-bare-fences-that` filed on the integration branch (the five sites incl. `oat-reviewer.md:507`, the inventory-floor extension, the latent indent/heading laxity, the 25-file headroom); backlog index regenerated; verification: `test -f .oat/repo/pjm/backlog/items/BL-260909-repair-the-bare-fences-that.md`, Markdown guard green.
- m1 — ruling 3 conflated the 180 floor with the 205 live inventory (25-file headroom): **accepted** — the headroom is plan-prescribed with a loud-failure control; named in the follow-up item.
- m2 — the plan's Step 3 fence prescription (three backticks) conflicts with the format gate: **deferred** — wave-close plan correction (follow-up ledger).
- m3 — a Done criterion says "four" agent-prompt blocks where three qualify: **deferred** — wave-close plan correction.
- m4 — control 2's "205 → 177" figure is variant-dependent (a fully flat walk yields 0 files and 8 failures); direction confirmed: **accepted** — recorded here; the plan's green prediction is a wave-close correction.
- m5 — the scanner's `^\s*` indent laxity and column-0 heading anchor are latent (a CommonMark-indent variant over all 205 files diverges on none): **deferred** — named in the follow-up item.

**p10 row → `passed`** (reviewed head `88fbc8786`); group 4 is clear for fan-in.

## Review Received: p14 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p14-review-2026-09-09T045928Z.md (reviewed head `18ea51bb339a05136353a9855efb628dd11bfb01`, manual, opus)
**Findings:** Critical 0 · Important 1 · Medium 2 · Minor 1 — PASS with findings (every finding is plan-artifact alignment or a deferred follow-up; no defect in the diff). Verified: the five summary equivalence classes (exactly one changes, `info` → `warn`, strictly stronger; the exit expression byte-identical); both plan-contradicting controls reproduced and the substitute control load-bearing; the three protected cases byte-identical and green; the built-CLI base-vs-head probe (`No changes required.` → `Sync completed with partial failures.`, exit 1 both); scope exact; gates forced `Cached: 0`.

**Dispositions:**

- I1 — a failing `sync --scope all` still prints `No changes required.` in a sibling empty scope's plan body (the plan's reachability claim is single-scope and false; head is strictly better than base): **fixed** (root, plan write) — a dated correction entry records the false claim, and the body-suffix fix plus a `--scope all` pin are **deferred** to a follow-up item filed at closeout (editing those symbols is this plan's STOP).
- M1 — Step 4 / Done criterion 4's exit-code control is unsatisfiable as written: **fixed** (root, same correction entry).
- M2 — the preserved `failed === 0` conjunct has no test that can fail if deleted: **deferred** — the `--scope all` assertion joins the follow-up item; no code change in this lane (the conjunct is defense-in-depth by construction).
- m1 — the lane's report said "new case" where it extended the existing `:1387` case: **fixed** — recorded here (the reviewer's description stands).
- Verification of the plan writes: `grep -c 'Correction applied 2026-09-09 (wave-7 p14' <plan>` = 1; corpus contract green.

**p14 row → `passed`** (reviewed head `18ea51bb3`); p14 is clear for the group-5 fan-in.

## Review Received: p15 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p15-review-2026-09-09T053044Z.md (reviewed head `53a0a2fcb39ab33e65b16a8a686df7a5ef0c1a13`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 3 — PASS with findings. Verified: a 14-shape battery through four consumers at base and head (the only newly accepted input on the detector and planner is the faithful managed copy; the retirement classifier moved in exactly one place, stricter — symlinked sentinel `remove` → `detach`; the STOP shapes had `helper_base = ACCEPT`, so the STOP was real; the collect/sort/strip/hash body byte-identical to the base); the TOCTOU rejection concurred (additive checks; comments no longer overclaim); the eighth case's labelling true; convergence without re-sync proven with a BASE-built CLI's manifest (byte-identical afterwards; `tools info` `in-sync (copy)`; a tampered copy repairs and converges); the untouched files; scope; three controls; gates forced `Cached: 0` (cli 7231; smoke; skills); four probes (hardlinked sentinel accepted as content-faithful; symlinked subtree and symlinked `SKILL.md` rejected; an extra empty directory accepted — an inherited bound of `computeDirectoryHash`, recorded).

**Dispositions:**

- m1 — the module header misattributes the symlinked-root bypass to the pathname skip and overstates the retirement effect (a symlinked root was already `detach` via `expectedTypeMatches`): **address-now** (root, comment-only edit on the integration branch at the group-5 fan-in, gated there).
- m2 — the plan's refresh paragraph carries the same clause: **fixed** (root, plan write) — a dated correction appended to the refresh; verification: `grep -c 'Correction applied 2026-09-09 (from the p15 root review)' <plan>` = 1, corpus contract green.
- m3 — the handle-bound-traversal follow-up had no backlog item: **fixed** (root) — `BL-260909-use-handle-bound-traversal` filed (the three readers, the destructive retirement path, the racing-swap control); index regenerated; Markdown guard green.

**p15 row → `passed`** (reviewed head `53a0a2fcb`); p15 is clear for the group-5 fan-in.

## Review Received: p13 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p13-review-2026-09-09T055549Z.md (reviewed head `5846efdb0a732f4309e8667c38e9d9c70c1edac4`, manual, opus)
**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 3 — PASS with findings. Ruling-1 adjudication: the plan's `tests/` boundary licenses the one narrowing (proven on git that the old pathspec matched a `SKILL.md` under `tests/`; the input set is empty at base, head, and `origin/main`; `bundle-assets.sh:49` strips `tests/` before any consumer; the lost enforcement was a false positive) — keep the code as shipped. Weaker-anywhere mechanically: 21 bump-validator + 7 structural shapes + 2 real-tree probes through real `git init` fixtures at base and head — every flip reject-ward except the adjudicated one and an absent-owning-`SKILL.md` sibling (exit 2 `ENOENT` → exit 0; plan-mandated, pinned, not CI-reachable); no finding code replaced. The three out-of-plan fixtures are clause B's forced propagation; the bundled tree is clean across all 83 skills; the retire item stays open; scope exact; all five plan inconsistencies confirmed (the literal Step-4 guard placement would have violated STOP 3); four neutralization probes; gates `Cached: 0`.

**Dispositions:**

- M1 — the narrowing is recorded only in a code comment, and the plan's weaker-anywhere section is self-contradictory for the nested-`tests/` shape: **fixed** (root) — a dated correction entry in the plan records six inconsistencies including this one; the narrowing is recorded on `BL-260906-extend-check-skill-bumps` beside the two residual gaps (root address-now on the integration branch at the group-5 fan-in).
- m1 — the absent-owning-`SKILL.md` sibling now exits 0 instead of 2: **accepted** (plan-mandated, pinned, unreachable in CI); named in the plan correction.
- m2 — the wrapper's p13 write-surface list omitted the three fixtures: **fixed** (root, this commit).
- m3 — `validatedSkillCount: 65` counts `oat-*` only while the promoted pass iterates all 83: **accepted** — reporting cosmetics; carried in the polish ledger.

**p13 row → `passed`** (reviewed head `5846efdb0`); group 5 is clear for fan-in.

## Review Received: p18 (round 1 — passed with findings)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p18-review-2026-09-09T065527Z.md (reviewed head `1ce96aa7e355baca9e38d94f363d844edea069a9`, manual, opus)
**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 5 — PASS with findings. Ruling-2 adjudication: the lane's refusal to write the plan's Step 6 sentence is a JUSTIFIED deviation — `packages/control-plane` is the only workspace package with `format` and no `check`, CI never runs `pnpm format`, and a live probe showed `pnpm check` exit 0 / `pnpm format` exit 1 on a mis-formatted control-plane file; the committed `AGENTS.md` text is exactly true in both directions. No weaker-anywhere regression (script-by-script parse of both `package.json` blobs); all four controls re-run both ways incl. the hook in a scratch clone; gates forced `Cached: 0`; the parked `.mjs` proven unreached by any gate glob.

**Dispositions:**

- I1 — `apps/oat-docs/docs/contributing/code.md:58-61` and `:76-77` still carry the retired coverage claims (no wave-7 lane owns the file): **address-now** (root, at the group-6 fan-in, gated there).
- M1 — `test:scripts` sits mid-chain and a failure there suppresses `test:skills` and `test:release`: **fix round** (`w7-p18-fix-001`, resumed lane) — placed last.
- m1 — the `pnpm format` Essential Commands bullet left stale: **fix round** (same commit).
- m2 — the root glob defined twice: **fix round** (same commit) — `format` reuses `format:root`.
- m3 — `.oat/repo/knowledge/testing.md` omits the new suite: **address-now** (root, at the fan-in).
- m4 — sibling wave-7 plans carry a premise that goes stale on merge: **deferred** — the p19/p20 briefs already declare the change; wave-close correction pass.
- m5 — one mis-formatted `.mjs` under `parked/wave-5-p09/` reached by no gate glob: **accepted** — left byte-exact (its SHA-256 is pinned by the recovery README).

**p18 row → `fixes_added`**; round 2 on the original reviewer handle follows the fix commit.

## Review Received: p18 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p18-review-2026-09-09T072158Z.md (reviewed head `bb277915e89a3e3117234eeacb2fd020a0360990`, manual, opus)
**Findings:** 0 · 0 · 0 · 2 minor — PASS. Verification records: M1 — the reviewer's own injected failure shows smoke 167 / skills 883 / release 42 reported before the scripts failure (the chain is now a pure append against the base); m1 — both bullets exactly true, and the `pnpm lint` edit was within round 1's own finding text; m2 — `format:root:fix` string-equal to `format:root` with `--write`, two inline literals remain (the minimum), `format:fix` idempotent — the plan's "keep `format:fix` as it is" adjudicated a behavior-preservation guard whose purpose is honored, so the refactor is licensed; one append-only commit; gates forced `Cached: 0`.

**Dispositions (round 2 Minors):**

- m1 — `check:fix` no longer mirrors `check` (only `format:root:fix` repairs a root-glob file): **address-now** (root, at the group-6 fan-in: `check:fix` gains `&& pnpm format:root:fix`).
- m2 — `AGENTS.md:24` says "each workspace package's `format` script" where `:20` says "defined `check` script": **address-now** (root, same commit, one word).

**p18 row → `passed`** (reviewed head `bb277915e`); p18 is clear for fan-in. Carried forward for the fan-in address-now: `contributing/code.md` must say `test:scripts` runs last; `.oat/repo/knowledge/testing.md` gains the suite.

## Review Received: p17 (round 1 — changes requested)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p17-review-2026-09-09T080054Z.md (reviewed head `4db81ebfdb93b7087873f66c163d7a52e06a1a59`, manual, opus)
**Findings:** Critical 1 · Important 2 · Medium 2 · Minor 2 — CHANGES REQUESTED. Verified: ruling 0 (widening (c)) exactly as narrow as stated over 350,892 label × destination combinations against an independent renderer; the corpus control on both the worktree and the root corpus (65 plans, `modes` byte-identical, `rejected` empty); producer-first ordering; the single bump with no pin; scope; nine mutations of the load-bearing rules red; gates forced `Cached: 0`. Codex RAN at the gate (session `01a08528`, codex-cli 0.153.4; a deadline overrun recovered by resuming the same session) and converged on the Critical.

**Dispositions:**

- C1 — a fourth acceptance-ward class: a whole-line comment between a declaration and its indented continuation is transparent at head and broke the base's scan (54 of 58 sweep shapes; all rendered-text equivalent; the rule is the load-bearing K1 fix): **fixed** (root, plan write) — enumerated as widening (d) with the complete (a)–(d) list; the lane adds the minimal-witness control (fix round).
- I1 — `HIDDEN_FILL` is an in-band form-feed sentinel: **fix round** (`w7-p17-fix-001`) — hidden-ness carried out of band.
- I2 — numeric character references decoded without CommonMark's length bound (`&#0000000045;` accepted): **fix round** — bounded to `&#\d{1,7};` / `&#[xX][0-9a-fA-F]{1,6};` with a control both ways.
- M1 — `findSection` is a third, comment-unaware fence pass, so the class-(a) fix does not reach document level: **deferred** — out of the plan's declared scope; filed at closeout (follow-up ledger).
- M2 — the recorded cross-model gap is no longer accurate: **fixed** — the plan note superseded; the lane re-dispositions in the fix round with one Codex retry (resume-the-session rule).
- m1 — a bare `%` destination rejects with a violation naming no cause: **fix round** — the message names the residual escape.
- m2 — `linkDefinitions` re-runs the block scanner per declaration: **deferred** — polish (follow-up ledger).

**p17 row → `fixes_added`**; round 2 on the original reviewer handle follows the fix commit.

## Review Received: p17 (round 2 — passed)

**Date:** 2026-09-09
**Review artifact:** reviews/archived/p17-review-2026-09-09T082145Z.md (reviewed head `9eeecf9db74002158ded54844228e98219666185`, manual, opus)
**Findings:** 0 · 0 · 0 · 3 minor — PASS. Verification records: the 50,625-document sweep re-run against the fix head classifies all 58 widening shapes as 4 × (a) and 54 × (d) with none unexplained; the decoding property check gives 0 mismatches in 580,800 combinations against a CommonMark-bounded independent renderer; four controls red under mutation (each kill attributed exactly by rebuilding the mutations as scratch modules — removing the transparency rule flips the (d) witness AND the K1 control, so it is load-bearing) and the file restored SHA-256-checked; `HIDDEN_FILL` is read nowhere (`.hidden` consumed once); an author form feed is reject → reject; the over-long references are rejected in both label and destination; append-only (one commit, one file, no lockstep file); forced test/check/type-check/lint `Cached: 0` (cli 7257); corpus `modes` byte-identical. **Codex ran on the fix diff** (one run, ~230 s, no resume): 0 Critical / 1 Important, and explicit NONE for out-of-enumeration widenings, acceptance changes from the new violation, and regex bugs — its one finding (CRLF: `<!-- c -->\r` is not counted as fully hidden, so (d) does not apply on CRLF input) reproduces and is down-rated to Minor because the base rejects the same document (fail-closed, not a widening, not a regression).

**Dispositions (round 2 Minors):**

- m1 — CRLF: a whole-line comment terminated by `\r` is not fully hidden, so widening (d) does not apply on CRLF input (fail-closed): **deferred** (closeout ledger; polish).
- m2 — `hasUnresolvedDestination` was inserted between `linksToItsSource`'s JSDoc and its function, leaving that function undocumented and two doc blocks stacked on the new helper: **deferred** (closeout ledger; polish).
- m3 — the plan's amended-mechanism preamble still read "exactly the two enumerated widenings" while the same paragraph enumerates (a)–(d): **fixed now** (root, ROOT plan copy: the clause now reads "exactly the enumerated widenings — (a)–(b) when this paragraph was written, (a)–(d) after the two additions below; wording aligned 2026-09-09 after the round-2 review").
- Reviewer note (no finding): the (d) "comment-deleted twin" passes under both mutations — it documents rendered-text equivalence but cannot fail; the capable pin is the minimal witness. Recorded so nobody later cites the twin as a control.

**p17 row → `passed`** (reviewed head `9eeecf9db`); p17 is clear for fan-in.

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
- `w7-p07-impl-001` outcome: DONE, one commit `07e6438401db5368a3a89ecb0e7ebbf263e525af` (two files): the three overlapping installed rows removed so every pack sits in exactly one example section, `oat-doctor` 1.2.3 → 1.2.4 (no pin exists — sweep confirmed), a disjointness case that goes red on a re-added row while both pre-existing cases stay green and red on a renamed heading (not vacuous). One Codex round: two Importants rejected as pre-existing and out of scope (`brainstorm` in neither section; pack-level status semantics) — both carried to wave close. Gates `Cached: 0` (cli 7164; skills 883; smoke 167); one unrelated ENOTEMPTY temp-dir flake, green on the no-edit rerun.
- `w7-p07-review-001` — reviewer, target opus, five rulings (both Codex rejections; both controls; the no-pin claim; scope incl. the exact removed rows; one adversarial example-vs-manifest probe). Record `dispatch/w7-p07-review-001.json`.
- `w7-p08-impl-001` outcome: DONE, one commit `a0fa6c654bfd3851a0688cde4bc54a976f0313bf` (four files): `readOatConfigWithWarnings` / `OatConfigRead`, a wrong-typed `documentation.root` (number, object, array, null, boolean) warns through a sink and still falls back; `runGet`/`runList` read once, stderr in human mode, a `warnings` array under `--json` omitted when empty; four controls incl. the finding that no pre-existing `documentation` test breaks when the warning goes noisy (the new exact-match assertions carry it). One Codex round: an Important rejected with evidence (two reads — the plan prescribes one reader call and `runList` already read ~120 times at base; follow-up named), one Medium and three Minors fixed. Gates `Cached: 0` (cli 7182). Plan inaccuracy for wave close: test-plan case 4 cites a malformed-JSON case at `:117` that does not exist. Deferred follow-ups named per the plan: wire the reader into `instructions.utils.ts:303` (p09's file); a docs sentence; sharing one read with `resolveEffectiveConfig`.
- `w7-p08-review-001` — reviewer, target opus, seven rulings (normalizer weaker-anywhere; the `--json` channel STOP; no false alarm in existing suites; the rejected two-reads finding with a read count at base vs head; controls B and D; scope; one cross-surface probe). Record `dispatch/w7-p08-review-001.json`.
- `w7-p09-impl-001` outcome: DONE, one commit `04a9a29ca1b4a587f9af6c1263ad7b6d5fef00bb` (three files): the exclusion-directory probe distinguishes exact / absent / resolved-elsewhere and the warning names the resolved target (the `absent` message byte-identical); two Codex rounds (R1 one Medium — non-exhaustive narrowing — fixed with a typed `Extract` annotation and a compile-failure control; R2 clean); four controls; the pre-existing case-insensitivity simulation re-keyed on the mis-cased segment (the lane reported it inert on macOS; the root review disproved that — the old anchor fired by substring match, so the re-key is a clarity change, corrected in the fix round). Gates `Cached: 0`; `oat docs generate-index` no diff. Pre-existing test-tier tsc errors noted in `sync.test.ts:138` and `validate.test.ts:107`.
- `w7-p09-review-001` — reviewer, target opus, six rulings (weaker-anywhere on inert entries incl. a symlink-to-correct-directory probe; the byte-identical `absent` message; the re-keyed simulation proven load-bearing; real symlink fixtures on this host; the exhaustiveness control; scope). Record `dispatch/w7-p09-review-001.json`.
- `w7-p07-review-001` outcome: PASS with findings, 0/0/1M/2m (controls re-run; no pin; Codex rejections stand; a completeness gap in the regex extraction found by the reviewer's own probe). M1 → fix round `w7-p07-fix-001`; m1/m2 pre-existing, wave close.
- `w7-p07-fix-001` — bounded test-only fix round on the resumed implementer. Record `dispatch/w7-p07-fix-001.json`.
- `w7-p07-fix-001` outcome: one append-only test-only commit `6173568916690b2a0b5da0420cb89b6d836c794b`: both example extractions now assert completeness (every candidate row/bullet parses; parsed count equals candidate count; the failure names the line); the reviewer's probe G red on the available side, a `10 of 10` rewrite red on the installed side, pre-existing cases green; gates `Cached: 0` (cli 7164).
- `w7-p07-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w7-p07-review-002.json`.
- `w7-p07-review-002` outcome: PASS (fan-in may proceed), 0/0/0/1m; the completeness fix verified by the reviewer's own probes; the one new Minor (a leading-space evasion) taken as a root address-now at the fan-in.
- `w7-p09-review-001` outcome: PASS with findings, 0/1I/1M/2m (16-scenario base-vs-head differential clean; the lane's "inert on macOS" diagnosis disproved by instrumentation; unpinned root-relative clauses). I1/M1/m1 → fix round `w7-p09-fix-001`; m2 wave close.
- `w7-p09-fix-001` — bounded fix round on the resumed implementer (comment correction with counts; a root-symlink pin; the docs clause). Record `dispatch/w7-p09-fix-001.json`.
- `w7-p09-fix-001` outcome: one append-only commit `99675387b1d651e9e6fb71231df26864a573e7d9` (test file + docs page; no production code): the lane instrumented the simulation itself (old anchor 3 firings, new anchor 3, no injection 0), retracted its "inert on macOS" diagnosis, and rewrote the comment; a root/parent-symlink case pins the two root-relative clauses (red as `resolves to ""` / `".."` when deleted); the docs sentence names the on-disk-spelling half. Focused 95; forced cli test `Cached: 0`; `generate-index` no diff. Header shortened to 99 chars for commitlint.
- `w7-p09-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w7-p09-review-002.json`.
- `w7-p09-review-002` outcome: PASS (fan-in may proceed), 0/0/0/0; all three dispositions verified by the reviewer's own instrumentation and clause-by-clause reds.
- `w7-p10-impl-001`, `w7-p11-impl-001`, `w7-p12-impl-001` — group 4 dispatched together at `4ee0cae7a5a838869a1f3684e0528131ec3495a4` (the tip after the group-3 fan-in bookkeeping); each target opus, task_class default-implementation; briefs carry the groups-1–3 cumulative churn per surface (p10: the re-pinned `skills.test.ts` and p04's `named-skill-load-contract.test.ts` rows, its own skill files untouched; p11: `config/resolve.ts` after p02/p05, `config/oat-config.ts` after p08, the no-false-alarm STOP on p08's warning; p12: none) and the rulings (p10: five bumps that p19/p20 inherit, pins by literal; p11: last writer of `resolve.ts`, PR #190 un-triggered; p12: the narrowed item, `execute-plan.ts` read-only). Records `dispatch/w7-p1{0,1,2}-impl-001.json`.
- `w7-p12-impl-001` outcome: DONE, one commit `e503bf02527736ebbe5be7a8055d0e34990ab69f` (three files): both native-adopt paths set `manifestChanged` so `oat status` persists and restamps the manifest (a native adopt adds no row), `keep` does not; the checklist-abort harness fixed to preserve a queued `null` (Codex Important 2); an abort after a successful adopt still saves (Codex Important 1 partially accepted — the rename is already irreversible; two pins added); the retry assignment pinned; `createManifest` helper made schema-valid. Three controls both ways; two Codex rounds (R2 confirmed, one comment wording tightened). Gates `Cached: 0` (cli 7194). One unrelated `agents-md.test.ts` parallel flake noted for filing.
- `w7-p12-review-001` — reviewer, target opus, seven rulings (the abort-after-adopt disposition; the three STOP-class invariants; the three controls; weaker-anywhere on unchanged pre-existing cases; the helper correction; scope; a built-CLI adopt probe). Record `dispatch/w7-p12-review-001.json`.
- `w7-p11-impl-001` outcome: DONE, one commit `0b5c3307edc2c239431b00fa4281cd85f41e418e` (the seven in-scope files): `Docs source index` bullet for both frameworks (a judgment call for MkDocs), the hop-cap refusal role-aware (derived docs-dir exits 2 naming the operator-facing path), an observational empty-manifest line naming the active exclusion count and patterns, the two `documentation` defaults in `DEFAULT_SHARED_CONFIG` (changing only `config dump`, proven pre/post). Two Codex rounds (R1 2I both reproduced and fixed — the docs overpromised the hop cap for real chains, which macOS `ELOOP` shadows; the empty-manifest line falsely blamed the exclusions; R2 SHIP). Ten cases red-then-green; weaker-anywhere by role unchanged. Gates `Cached: 0` (cli 7196). Three plan-internal inaccuracies for wave close.
- `w7-p11-review-001` — reviewer, target opus, seven rulings (the MkDocs label judgment; hop-cap weaker-anywhere by role with real chains; the empty-manifest wording; the config STOP pre/post incl. p08's warning path; controls; scope; one adversarial probe). Record `dispatch/w7-p11-review-001.json`.
- `w7-p10-impl-001` outcome: DONE, one commit `88fbc8786a1147b02cfdb1bdb973e6175cd369ed` (ten files): the stray fences repaired in five skill assets with prose immutability proven mechanically, five bumps once each with six pins by literal, the fence scanner widened (a 205-file recursive inventory with its own floor, a new after-prose defect shape, fixture cases). One Codex round: Important — `collectFenceScanFiles` swallowed `readdir` failures → fixed to propagate, with a control the lane first found vacuous (routed through `assertContractCurrent`) and rewrote against the unit. Nine controls red-then-green; the Step 8 control-2 prediction did not reproduce in the safe direction (the Step 5 floor makes a non-recursive walk red). oxfmt re-widened one repaired fence to four backticks (formatter state committed). Gates `Cached: 0` (cli 7193; skills 883; smoke 167). Not filed (boundary): the five bare-fence instances outside `.agents/skills` — root files at closeout.
- `w7-p10-review-001` — reviewer, target opus, seven rulings (an independent prose-immutability comparison; five bumps and every pin; the widened scanner and the Codex control's vacuity note; scanner weaker-anywhere plus an indented-closer probe; the Step 8 discrepancy; the oxfmt-widened fence; scope). Record `dispatch/w7-p10-review-001.json`.
- `w7-p12-review-001` outcome: PASS with findings, 0/0/0/3m (abort-after-adopt disposition concurred; real pty adopt probe on a v1 manifest; three `continue` branches probed). All three Minors deferred; no fix round; p12 `passed`.
- `w7-p11-review-001` outcome: PASS with findings, 0/0/0/4m (8-role hop-cap probe at base and head; two-build config STOP diff; four adversarial probes). All four Minors deferred or record-fixed; p11 `passed`. Smoke flake `cursor-broker.test.mjs` noted (not attributable).
- `w7-p10-review-001` outcome: PASS with findings, 0/1I/0/5m (60,225-case differential fuzz clean; the vacuous-control claim confirmed; corpus numbers reproduced). I1 (the unfiled follow-up item) fixed by the root as `BL-260909-repair-the-bare-fences-that`; Minors deferred to the wave-close correction pass or the item; p10 `passed`.
- `w7-p13-impl-001`, `w7-p14-impl-001`, `w7-p15-impl-001` — group 5 dispatched together at `df1924099e6cc22e591c3afef8dcf2f4249e83d5` (the tip after the group-4 fan-in bookkeeping); each target opus, task_class default-implementation; briefs carry the groups-1–4 cumulative churn (p13: nine skills re-pinned in `skills.test.ts`, p10's 205-file fence scanner; p14 and p15: none on their surfaces) and the rulings (p13: fifth `skills.test.ts` writer, `AGENTS.md:11` only, alias step 2 excluded, the retire item stays open; p14: engine files read-only; p15: the align-provider-view item excluded, `execute-plan.ts` read-only). Records `dispatch/w7-p1{3,4,5}-impl-001.json`.
- `w7-p14-impl-001` outcome: DONE_WITH_CONCERNS (plan text only), one commit `18ea51bb339a05136353a9855efb628dd11bfb01` (two files): the failure arm wins before the `restampOnly` ternary, so a rejected apply prints `Sync completed with partial failures.` instead of `No changes required.` (exit 1 unchanged); a pure reorder plus one comment. Codex: no findings; equivalence-class analysis confirmed (exactly one class changes its sentence). Two plan controls do not reproduce for reasons the plan itself states (the exit code lives outside the chain; the conjunct is unreachable post-fix) — a substitute control neutralizing `:557` goes red. Gates `Cached: 0`. Friction: `seq` shadowed in this shell.
- `w7-p14-review-001` — reviewer, target opus, six rulings (state-class weaker-anywhere; the two plan-contradicting controls and the substitute; the three protected cases; a built-CLI base-vs-head probe; scope; a `--json` / post-apply-failure probe). Record `dispatch/w7-p14-review-001.json`.
- `w7-p15-impl-001` outcome: BLOCKED at the pre-commit review gate (no commit; all nine steps implemented and green, preserved uncommitted). Codex reproduced, and the lane confirmed at the unit and on the built CLI, that the verbatim-moved `computeManagedDirectoryCopyHash` accepts a symlinked sentinel and a symlinked provider root, so the detector and planner newly accept what they rejected — the plan's own weaker-anywhere STOP. Decision (root, dated refresh): harden the shared helper (`lstat` root; validate the sentinel `Dirent` before the pathname skip; no symlink following), accept that `classifyObsoleteMappingRetirement` turns `detach` for those shapes, pin all four shapes on every consumer; the lane resumes on its staged work.
- `w7-p14-review-001` outcome: PASS with findings, 0/1I/2M/1m — all plan-artifact or deferred (a multi-scope body suffix the plan's out-of-scope rule forbids fixing here; the unsatisfiable exit-code control; the conjunct's missing pin); plan correction entry applied; p14 `passed`.
- `w7-p15-impl-001` outcome (resumed): DONE, one commit `53a0a2fcb39ab33e65b16a8a686df7a5ef0c1a13` (ten files, +889/−175): the managed-copy hash extracted and hardened (root `lstat`ed, sentinel `Dirent` validated before the pathname skip, no symlink following), the detector and planner converge a faithful copy-strategy projection (`in_sync` / `skip`) without a re-sync, the retirement classifier turns `detach` for the two symlink shapes; seven of eight new cases red under the un-hardened helper (the eighth labelled as a composite pin — `expectedTypeMatches` uses `lstat` first). Codex R2: a TOCTOU Critical rejected as out of scope with the subset argument (comments de-overclaimed); a handle-bound traversal follow-up recommended. Gates `Cached: 0` (cli 7231).
- `w7-p15-review-001` — reviewer, target opus, seven rulings (a per-consumer base-vs-head acceptance table over ten provider shapes; the TOCTOU rejection; the eighth case's labelling; convergence without re-sync; the untouched files; scope; a hardlink/symlinked-subdirectory probe). Record `dispatch/w7-p15-review-001.json`.
- `w7-p13-impl-001` outcome: DONE, one commit `5846efdb0a732f4309e8667c38e9d9c70c1edac4` (twelve files: the two validators and their tests, `AGENTS.md:11`, the contributing docs, three backlog items, plus three test fixtures that clause B — every skill must resolve a version — mechanically forced). Agent roles version-gated; an unresolvable version is a finding; the alias promotion is a structural error while the bump gate still accepts alias-only + valid bump; the changed-file pathspec covers whole skill directories with `-z`/NUL splitting; a nested `SKILL.md` maps to itself and its owner. Two Codex rounds (R1 1C/2I/2M/1m fixed; R2 one Critical rejected as a deliberate, pinned narrowing — a `SKILL.md` under `tests/` is no longer version-checked — plus 1M/2m fixed); sixteen controls against a pre-fix CLI snapshot; five plan-internal inconsistencies for wave close. Gates `Cached: 0`; the plan's focused command missed the three fixture consumers.
- `w7-p13-review-001` — reviewer, target opus, seven rulings (adjudicate the `tests/` narrowing against the categorical rule; a per-validator base-vs-head battery over twelve shapes; the three out-of-list fixtures; the bundled tree green at head; the retire item and `AGENTS.md` confinement; scope; the five plan inconsistencies). Record `dispatch/w7-p13-review-001.json`.
- `w7-p13-review-001` outcome: PASS with findings, 0/0/1M/3m; the `tests/`-nested narrowing adjudicated as licensed by the plan's own boundary (input set empty; bundle strips `tests/`); a 30-shape base-vs-head battery with two documented exceptions; the literal Step-4 placement shown to violate STOP 3. M1/m2 fixed by the root; m1/m3 accepted; p13 `passed`.
- `w7-p16-impl-001`, `w7-p17-impl-001`, `w7-p18-impl-001` — group 6 dispatched together at `335aae6a8f9ecc725e9d180a5ab72e859692d51e` (the tip after the group-5 fan-in bookkeeping); each target opus, task_class default-implementation; briefs carry the groups-1–5 cumulative churn (p16: `skills.test.ts` +2,000 lines and p13's wider bump gate now covering `references/`; p17: the live corpus it sweeps — eight plans with dated entries, the `in-progress` W7 row, the p09 plan's refresh; p18: p13's rewrite of the `AGENTS.md` bump bullets) and the rulings (p16: the one authorized item edit, issue #266 excluded; p17: producer vocabulary first, no `oat-wave-program` pin; p18: root `package.json` is not lockstep, CI workflow and `turbo.json` out of scope). Records `dispatch/w7-p1{6,7,8}-impl-001.json`.
- `w7-p16-impl-001` outcome: BLOCKED → PARKED (plan STOP; no commit; worktree clean at base). The plan's Step 3 seam is forbidden by the recorder graph's no-process guard (`record.test.ts:1879-1902`), and every alternative either hits the same guard, evades it, drops the required `tree_clean`, or is excluded by the plan; restructuring the guard is an architecture/security decision the plan does not authorize. The partial Steps 2–3 patch and a real pre-fix journal fixture are preserved at `parked/wave-7-p16/`; a dated STOP record is in the plan; `BL-260906-harden-dispatch-launch` stays open with both halves and returns to planning as a decision. Group 6 continues with p17 and p18.
- `w7-p18-impl-001` outcome: DONE_WITH_CONCERNS (plan text), one commit `1ce96aa7e355baca9e38d94f363d844edea069a9` (three files): `pnpm check` gains `format:root` over the skills, docs, and smoke globs (byte-identical to `format`'s), `pnpm test` gains `test:scripts` after `test:smoke`, lint-staged formats `*.{mjs,cjs}`, `AGENTS.md` re-anchored after p13 with exactly-true coverage text. Four matched controls (unwired green / wired red). The plan's Step 6 sentence ("check now contains everything format checks") is false — `packages/control-plane` has `format` but no `check` — so the lane wrote true text instead (Codex concurred); a control-plane CI-gate gap is a candidate follow-up. Two Codex rounds (R1 1I fixed, 1I rejected as a patch finding; R2 1I closed by running the clean integrated `pnpm test`, 1m fixed). Gates `Cached: 0`. Friction: `git diff | grep -v '^[+-][+-]'` hides changed markdown bullets.
- `w7-p18-review-001` — reviewer, target opus, seven rulings (gate-widening weaker-anywhere by script; adjudicate the refused plan sentence; the four controls incl. the hook in a scratch clone; `AGENTS.md` confinement; scope; the unreached parked `.mjs`; one adversarial probe). Record `dispatch/w7-p18-review-001.json`.
- `w7-p17-impl-001` outcome: BLOCKED at the pre-commit gate (no commit; the work green and intact in the worktree, 463 insertions). A differential run of the real old and new scanner reproduced four widenings outside the plan's enumerated set — all produced by steps 4–5's own prescriptions (label percent-decoding; reserved-delimiter decoding; a raw-HTML-block-hidden fence made visible; a comment-blanking artefact manufacturing a definition) — plus three false-rejection classes and a `%252D` bypass. `codex exec` wedged three times (MCP session-expired); two in-harness reviewers substituted. Decision (root, dated refresh): fence machine first and wins; declarations only at an original column 0; the label never percent-decoded; the destination decoded once for unreserved characters only with any remaining `%` a residual; `HTML_BLOCK_OPENER` restricted to CommonMark's conditions; the prospective floor raised to 18; portability of the skill's citation. The lane resumes on its staged work.
- `w7-p18-review-001` outcome: PASS with findings, 0/1I/1M/5m (the refused plan sentence adjudicated a justified deviation; controls incl. the hook in a scratch clone). I1/m3 → root address-now at the fan-in; M1/m1/m2 → fix round `w7-p18-fix-001`; m4 wave close; m5 accepted.
- `w7-p18-fix-001` — bounded fix round on the resumed implementer (`test:scripts` last; the format bullet; one root glob). Record `dispatch/w7-p18-fix-001.json`.
- `w7-p18-fix-001` outcome: one append-only commit `bb277915e89a3e3117234eeacb2fd020a0360990` (`package.json`, `AGENTS.md`): `test:scripts` moved last (the failing-test control now reports smoke 167 / skills 883 / release 42 before the failure); both the `pnpm format` and the adjacent `pnpm lint` Essential Commands bullets made exactly true; the root's m2 instruction was a no-op as written (`format` already reused `format:root`), so the lane factored `format:fix`'s inline `--write` copy into `format:root:fix` — a single glob definition, contradicting the plan's "keep `format:fix` as it is" (flagged for the reviewer's adjudication). Gates forced `Cached: 0`; all four suites green.
- `w7-p18-review-002` — disposition-verification round 2 on the original reviewer handle (incl. two adjudications: the `pnpm lint` bullet extension and the `format:fix` refactor). Record `dispatch/w7-p18-review-002.json`.
- `w7-p17-impl-001` outcome (resumed): DONE_WITH_CONCERNS, one commit `4db81ebfdb93b7087873f66c163d7a52e06a1a59` (two files): the producer vocabulary settled and `oat-wave-program` bumped; `WAVE_STATUSES` narrowed; strict backlog-id boundary; `created` fail-closed; the amended scanner (fence machine first with an open comment owning its lines; column-0 declarations via a form-feed fill; label character references only; unreserved-only destination decode with residual `%` rejecting; CommonMark HTML-block conditions; a hidden line transparent to the continuation scan; floor 18). A 66-row real-code differential shows only the two enumerated widenings plus one more class — label character references — which the root enumerated as (c) in the plan (base accepts the unencoded spelling identically). Three in-harness reviewers (a K1 continuation Critical fixed pre-commit); `codex exec` wedged a fourth time. Gates `Cached: 0` (cli 7257); corpus `modes` byte-identical.
- `w7-p17-review-001` — reviewer, target opus, eight rulings (verify the bounds of widening (c); an independent base-vs-head differential with twelve own probes; the corpus control incl. every dated entry and the `in-progress` row; producer-first ordering; the K1 fix and mutation; bump/pins/portability; scope; one bounded Codex attempt). Record `dispatch/w7-p17-review-001.json`.
- `w7-p17-review-001` outcome: CHANGES REQUESTED, 1C/2I/2M/2m (class (c) confirmed over 350,892 combinations; a fourth rendered-text-equivalent class found by a 50,625-document sweep and enumerated by the root as (d); Codex ran at the gate). I1/I2/m1 + the (d) control → fix round `w7-p17-fix-001`; M1/m2 deferred; M2 superseded.
- `w7-p17-fix-001` — bounded fix round on the resumed implementer (out-of-band hiding; the decoder bound; the residual message; the class-(d) control; one Codex retry). Record `dispatch/w7-p17-fix-001.json`.
- `w7-p17-fix-001` outcome: fix commit `9eeecf9db` on `4db81ebfd` (one file, +180/−25): out-of-band `RenderedLine { text, hidden }`, bounded character references (`&#\d{1,7};` / `&#[xX][0-9a-fA-F]{1,6};`), `UNRESOLVED_DESTINATION_VIOLATION`, the class-(d) control; 79-row differential flips only in (a)–(d); corpus byte-identical; gates `Cached: 0`. The lane's Codex retry stalled twice (fresh + same-session resume), so the fix diff has no cross-model coverage — the round-2 reviewer is asked to supply it.
- `w7-p17-review-002` — disposition-verification round 2 on the original reviewer handle (sweep against the fix head; four controls under mutation; `HIDDEN_FILL` no longer read as hidden-ness; one Codex attempt on the fix diff). Record `dispatch/w7-p17-review-002.json`.
- `w7-p17-review-002` outcome: PASS (fan-in may proceed), 0/0/0/3m; Codex covered the fix diff (1 Important reproduced and down-rated: CRLF fail-closed); the plan preamble's stale "two enumerated widenings" clause aligned by the root; two polish items deferred to the closeout ledger.
- `w7-p18-review-002` outcome: PASS (fan-in may proceed), 0/0/0/2m; the `format:fix` refactor and the `pnpm lint` bullet adjudicated licensed; two one-line root address-nows queued for the fan-in.
- `w7-p15-review-001` outcome: PASS with findings, 0/0/0/3m (a four-consumer, 14-shape base-vs-head table; convergence proven against a base-built manifest). m1 → root address-now at the fan-in; m2 plan correction applied; m3 `BL-260909-use-handle-bound-traversal` filed; p15 `passed`.
- `w7-p08-review-001` outcome: PASS with findings, 0/0/0/5m (26-fixture normalizer battery identical; `--json` channel exact; reader count `list` 109 + 1 / `get` 1 + 1). All five Minors deferred or record-fixed; no fix round; p08 `passed`.

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

#### Group 3 fan-in (2026-09-09)

- `wave-7/p07`, `wave-7/p08`, `wave-7/p09` rebased onto the integration tip and merged in plan order with `git merge --no-ff` as `7c5a6aa01`, `17d271b23`, `95ad10827`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `07e643840`→`5183dce44`, `617356891`→`51cee6b3c`, `a0fa6c654`→`078eeb443`, `04a9a29ca`→`f3822e7bb`, `99675387b`→`e88ba925f`. Root address-now `001ecfa7e`: the doctor-example candidate filters tolerate leading whitespace (p07 round-2 Minor; an indented duplicate row probed red).
- Lockstep retained at 0.2.67 (`origin/main` still 0.2.66 at `684bd3be3`).
- Integration gates (sequential, exit codes captured, before any bookkeeping edit): `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached; cli 387 files / 7187 tests), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0, `pnpm test:skills` 0, root `pnpm test` 0. Config-integrity check: no tracked `.oat/config.json` key missing versus `origin/main`.
- No lane closed or renamed a backlog item in this group.
- Worktrees `.worktrees/wave-7/p0{7,8,9}` and branches `wave-7/p0{7,8,9}` removed after the merge.

#### Group 4 fan-in (2026-09-09)

- `wave-7/p10`, `wave-7/p11`, `wave-7/p12` rebased onto the integration tip and merged in plan order with `git merge --no-ff` as `13705dcdc`, `bb082e505`, `0f1711d88`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `88fbc8786`→`18d9187fb`, `0b5c3307e`→`6e3345bbb`, `e503bf025`→`c32adbb90`. The p10 merge commit's first attempt was rejected by commitlint (the plan title exceeded the 100-char body-line limit); the merge was completed with a folded body and the fan-in script now folds titles. A gate run that had started on the staged-but-uncommitted tree was killed before any gate completed and re-run on the committed tip.
- Lockstep retained at 0.2.67 (`origin/main` still 0.2.66 at `684bd3be3`).
- Integration gates (sequential, exit codes captured, before any bookkeeping edit): `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached; cli 387 files / 7209 tests), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0 (the `cursor-broker` flake did not recur), `pnpm test:skills` 0, root `pnpm test` 0. Config-integrity check: no tracked `.oat/config.json` key missing versus `origin/main`.
- Backlog: `BL-260909-repair-the-bare-fences-that` filed at the p10 receive (index regenerated there); no lane closed or renamed an item.
- Worktrees `.worktrees/wave-7/p1{0,1,2}` and branches `wave-7/p1{0,1,2}` removed after the merge.

#### Group 5 fan-in (2026-09-09)

- `wave-7/p13`, `wave-7/p14`, `wave-7/p15` rebased onto the integration tip and merged in plan order with `git merge --no-ff` as `de8c5b391`, `5d6b0461d`, `5171bf3cf`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `5846efdb0`→`9e6683b20`, `18ea51bb3`→`c4dbac3f3`, `53a0a2fcb`→`68c4da2e1`. Root address-now `da248f346`: the managed-copy header states the two symlink causes and the true retirement effect (p15 review m1); the p13 gate narrowing recorded on `BL-260906-extend-check-skill-bumps` (p13 review M1); backlog index regenerated.
- Lockstep retained at 0.2.67 (`origin/main` still 0.2.66 at `684bd3be3`). `pnpm run check:skill-bumps` re-run on the integrated tip with p13's wider surface.
- Integration gates (sequential, exit codes captured, on a clean tree after the merges and the address-now): `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached; cli 388 files / 7253 tests), `pnpm build` 0, `pnpm run check:skill-bumps` 0 (validated 9 changed canonical skill and agent role bump checks against `origin/main`), `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0, `pnpm test:skills` 0, root `pnpm test` 0. Config-integrity check: no tracked `.oat/config.json` key missing versus `origin/main`.
- Backlog: `BL-260909-use-handle-bound-traversal` filed at the p15 receive; p13 updated its three items (the retire item stays open).
- Worktrees `.worktrees/wave-7/p1{3,4,5}` and branches `wave-7/p1{3,4,5}` removed after the merge.

<!-- orchestration-runs-end -->

## Implementation Log

Chronological log of implementation progress (root orchestrator; lane detail lives in the dispatch transcripts and review artifacts).

### 2026-09-09

- p17 review received (CHANGES REQUESTED, 1C/2I/2M/2m): widening (d) enumerated in the plan; fix round `w7-p17-fix-001` dispatched; p17 row `fixes_added`.
- p18 round 2 passed (0/0/0/2m) at `bb277915e`; p18 row `passed`.
- p18 review received (PASS with findings, 0/1I/1M/5m): fix round `w7-p18-fix-001` dispatched; two root address-nows queued for the fan-in; p18 row `fixes_added`.
- p17 STOP (four unenumerated scanner widenings) closed by a dated plan refresh; lane resumed.
- p16 parked on a plan STOP (the recorder graph's no-process guard forbids the plan's git seam); partial work preserved under `parked/wave-7-p16/`; dated STOP record in the plan; the item stays open for re-planning.
- Group 5 fan-in: merges `de8c5b391`, `5d6b0461d`, `5171bf3cf`; address-now `da248f346`; lockstep retained at 0.2.67; eight gates + smoke + skills + root test green (0 cached; cli 7253). Group 6 (p16 + p17 + p18) bootstraps next.
- Group 4 fan-in: merges `13705dcdc`, `bb082e505`, `0f1711d88` (the p10 merge body folded for commitlint); lockstep retained at 0.2.67; eight gates + smoke + skills + root test green (0 cached; cli 7209). Group 5 (p13 + p14 + p15) bootstraps next.
- Group 3 fan-in: merges `7c5a6aa01`, `17d271b23`, `95ad10827`; lockstep retained at 0.2.67; eight gates + smoke + skills + root test green (0 cached; cli 7187). Group 4 (p10 + p11 + p12) bootstraps next.
- Group 2 fan-in: merges `a9bfb0a3c`, `7bbafded2`, `28618fbba`; address-now `572a4dd87`; lockstep retained at 0.2.67; eight gates + smoke + skills + root test green (0 cached; cli 7163). Group 3 (p07 + p08 + p09) bootstraps next.
- p05 round 2 passed (0/0/1M/2m; both record residues fixed in the receive) at `054de3cf3`; p05 row `passed`.
- p13 review received (PASS with findings, 0/0/1M/3m): plan correction entry (six inconsistencies) applied; wrapper surface corrected; p13 row `passed`; group 5 fan-in starts.
- p15 review received (PASS with findings, 0/0/0/3m): plan correction applied; `BL-260909-use-handle-bound-traversal` filed; header comment address-now queued for the fan-in; p15 row `passed`.
- p14 review received (PASS with findings, 0/1I/2M/1m — artifact alignment; plan correction entry applied); p14 row `passed`.
- p10 review received (PASS with findings, 0/1I/0/5m): `BL-260909-repair-the-bare-fences-that` filed; p10 row `passed`; group 4 fan-in starts.
- p11 review received (PASS with findings, 0/0/0/4m — plan correction entry applied); p11 row `passed`.
- p12 review received (PASS with findings, 0/0/0/3m — all deferred); p12 row `passed`.
- p09 round 2 passed (0/0/0/0) at `99675387b`; p09 row `passed`; group 3 fan-in starts.
- p07 round 2 passed (0/0/0/1m) at `617356891`; p07 row `passed`.
- p09 review received (PASS with findings, 0/1I/1M/2m): fix round `w7-p09-fix-001` dispatched; p09 row `fixes_added`.
- p08 review received (PASS with findings, 0/0/0/5m — all deferred or record-fixed; plan correction entry applied); p08 row `passed`.
- p07 review received (PASS with findings, 0/0/1M/2m): fix round `w7-p07-fix-001` dispatched; p07 row `fixes_added`.
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

| Task / Review | Source Artifact                | Planned / Documented                                                                        | Actual / Accepted                                                                                                                                                                                                                     |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none yet)    | -                              | -                                                                                           | -                                                                                                                                                                                                                                     |
| p01-t01       | plan step 5 / Test plan        | raw guard restored → case 5 fails on all three invocation forms                             | raw guard fails only the plain form; a one-sided canonicalization is the control for the two preserve-symlinks forms (dated correction entry in the plan)                                                                             |
| p02-t01       | plan step 2                    | delete the strict effective read; `envShadowed` from `resolveEnvOverride`                   | the probe kept; a targeted strict barrier reads the untargeted surfaces (and the targeted shared surface on the raw-write branch) before any write (dated post-STOP refresh)                                                          |
| p03-t01       | plan step 2                    | strip inline code spans on each remaining line                                              | block-scoped CommonMark masking with container-aware fences, HTML blocks 1–7, fence lines as boundaries; `oxfmt`-derived invariant (dated refresh)                                                                                    |
| p04-t01       | plan step 4                    | fourth `ProjectLogAppendResult` variant `status: 'sealed'`                                  | thrown `ProjectLogSealedError` mapped at the command layer to `{"status":"sealed"}` + exit 1 (`gate/index.ts:3282` narrows `result.status`; out of scope); refusal conditional on key recognition (keyed replay → `already-appended`) |
| p05-t01       | plan step 5                    | expected classification from the inspected files                                            | four unclassified sites on the `src`-wide sweep → dated refresh (A fixed, B–D guarded); site C's real cause `registry.ts:219`; the aggregate walker's global pollution and two more sites fixed with controls                         |
| p06-t01       | plan test plan                 | two hand-listed pack controls                                                               | controls derived from `REQUIRED_BUNDLE_DIRECTORIES` (seven)                                                                                                                                                                           |
| p08-t01       | plan test plan case 4          | extend the malformed-JSON case at `:117`                                                    | no such case existed; the lane wrote the assertion (dated correction entry)                                                                                                                                                           |
| p09-t01       | lane report                    | simulation "inert on macOS"                                                                 | disproved by the review's instrumentation; comment corrected in the fix round                                                                                                                                                         |
| p10-t01       | plan step 8 control 2          | a non-recursive walk leaves the suite green                                                 | red — the Step 5 inventory floor catches it (safe direction; plan correction)                                                                                                                                                         |
| p11-t01       | plan steps 3 and 6, Test plan  | causal empty-manifest wording; unqualified hop-cap refusal text; a pre-fix-green prediction | observational wording; the OS `ELOOP` path named; red pre-fix (dated correction entry)                                                                                                                                                |
| p12-t01       | plan test plan                 | `lastUpdated` is set                                                                        | `saveManifest` carries `lastUpdated` through and restamps `oatVersion`; presence/shape pinned                                                                                                                                         |
| p13-t01       | plan weaker-anywhere rule      | every finding emitted today still emitted AND `tests/`-only accepted                        | a `SKILL.md` nested under `tests/` is no longer version-checked (plan boundary governs; input set empty; recorded on the item)                                                                                                        |
| p14-t01       | plan step 4 / Done criterion 4 | exit-code clause flips under the reorder                                                    | preserved invariant proven by neutralizing `:557`; conjunct drop stays green post-fix (dated correction)                                                                                                                              |
| p15-t01       | plan helper-extraction step    | moved verbatim, no behavior change                                                          | hardened per the dated refresh (symlinked root/sentinel rejected; retirement `detach` for a symlinked sentinel)                                                                                                                       |

## Test Results

| Phase      | Tests Run                                                                                         | Passed | Failed | Coverage |
| ---------- | ------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| (none yet) | -                                                                                                 | -      | -      | -        |
| p01        | focused 7 + `test:skills` 870 + `test:smoke` 167 + forced CLI suite                               | all    | 0      | -        |
| p02        | focused 288 + forced CLI suite (385 files)                                                        | all    | 0      | -        |
| p03        | focused 46 + forced CLI suite (386 files / 7093)                                                  | all    | 0      | -        |
| g1 fan-in  | eight DoD gates + smoke + skills + root test (0 cached; cli 7105)                                 | all    | 0      | -        |
| p04        | focused 429 + `test:skills` 883 + `test:smoke` 167 + forced CLI suite (7131)                      | all    | 0      | -        |
| p05        | focused 780 + forced CLI suite (387 files / 7128)                                                 | all    | 0      | -        |
| p06        | focused 27 + forced CLI suite (7114)                                                              | all    | 0      | -        |
| g2 fan-in  | eight DoD gates + smoke + skills + root test (0 cached)                                           | all    | 0      | -        |
| p07        | focused 3 + `skills.test.ts` 213 + `test:skills` 883 + `test:smoke` 167 + forced CLI suite (7164) | all    | 0      | -        |
| p08        | focused 421 + forced CLI suite (387 files / 7182)                                                 | all    | 0      | -        |
| p09        | focused 94 + forced CLI suite                                                                     | all    | 0      | -        |
| g3 fan-in  | eight DoD gates + smoke + skills + root test (0 cached)                                           | all    | 0      | -        |
| p10        | forced CLI suite (7193) + `test:skills` 883 + `test:smoke` 167                                    | all    | 0      | -        |
| p11        | focused 139 + forced CLI suite (387 files / 7196)                                                 | all    | 0      | -        |
| p12        | focused 85 + forced CLI suite (387 files / 7194)                                                  | all    | 0      | -        |
| g4 fan-in  | eight DoD gates + smoke + skills + root test (0 cached)                                           | all    | 0      | -        |
| p13        | focused 245 + forced CLI suite + `test:skills` 883                                                | all    | 0      | -        |
| p14        | focused 74 + forced CLI suite (387 files)                                                         | all    | 0      | -        |
| p15        | focused 334 + forced CLI suite (388 files / 7231)                                                 | all    | 0      | -        |
| g5 fan-in  | eight DoD gates + smoke + skills + root test (0 cached)                                           | all    | 0      | -        |

## Deferred Findings

_None yet._

## Final Summary (for PR/docs)

_Filled at closeout._

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Index: `.oat/repo/reference/external-plans/2026-09-08-backlog-review-wave-7-plan-index.md`
