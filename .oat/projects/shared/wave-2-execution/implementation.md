---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-06
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-2-execution

**Started:** 2026-09-06
**Last Updated:** 2026-09-06

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

| Phase                                                        | Status   | Tasks | Completed |
| ------------------------------------------------------------ | -------- | ----- | --------- |
| Phase 01 (repair-bundled-skill-contract-drift)               | complete | 1     | 1/1       |
| Phase 02 (harden-codex-skill-anaphora-guard)                 | complete | 1     | 1/1       |
| Phase 03 (guard-docs-app-mirrors-of-skill-prose)             | complete | 1     | 1/1       |
| Phase 04 (require-named-lifecycle-skills-to-be-loaded)       | complete | 1     | 1/1       |
| Phase 05 (document-patch-and-restore-for-lost-child-handles) | complete | 1     | 1/1       |

**Total:** 5/5 planned tasks completed (plus six review-fix tasks p01-t02, p02-t02, p03-t02, p04-t02, p05-t02, p05-t03)

---

## Phase 1: repair bundled-skill contract drift (p01)

**Status:** complete · **Started/Finished:** 2026-09-06 · **Tasks:** p01-t01 (four defect commits, the plan's own batch-exception boundary) + p01-t02 (review fixes)
**Outcome:** `oat-doctor`, `oat-brainstorm`, `oat-idea-summarize`, `analyze` SKILL.md repaired; per-skill contract groups in `validation/skills.test.ts`; `analyze` pin moved. **Verification:** focused 170, uncached CLI suite 5579, forced check/type-check; review rounds 1–2 (`reviews/archived/p01-review-*`). **Deviations:** four commits instead of one; an in-phase reset before any report (accepted).

## Phase 2: harden codex-skill anaphora guard (p02)

**Status:** complete · **Tasks:** p02-t01 + p02-t02
**Outcome:** anaphor-only attachment in `codex-skill/tests/codex-skill-contract.test.mjs` (list markers, blockquotes, `scenario`/`circumstances`), documented fail-open filler boundary pinned, direct-API exception preserved. **Verification:** node --test 9, test:skills 798, forced check/type-check; review rounds 1–2. **Deviations:** a Codex-suggested exemption reverted on round-2 evidence (upheld by the reviewer).

## Phase 3: guard docs-app mirrors of skill prose (p03)

**Status:** complete · **Tasks:** p03-t01 + p03-t02
**Outcome:** `explainer-kit/tests/contracts.test.mjs` runs the publication-boundary matrix over the canonical reference and the docs page; the whole-document forbidden-phrase guard was restored after round 1 found it narrowed (Critical); negation/mutation markers; the docs page names the catalog requirement and the canonical owner. **Verification:** node --test 53, test:skills 801; review rounds 1–2.

## Phase 4: require named lifecycle skills to be loaded (p04)

**Status:** complete · **Tasks:** p04-t01 + p04-t02 (review fixes and the round-2 address-now sweep)
**Outcome:** thirteen lifecycle skills carry load clauses (or narrow inline fallbacks); new `validation/named-skill-load-contract.test.ts` (160 rows, 22 tests: verb/anaphor detection, exemptions bound to exactly one sentence, stray-fence detection, corpus floors); pins moved; `.agents/docs/autonomy-contract.md` hashes restamped; three hidden four-backtick fences repaired. **Verification:** forced CLI suite 5601, check:skill-bumps 17; review rounds 1–2 plus the sweep. **Deviations:** three skills beyond the brief's pre-declared ten (in scope per the reviewer); matrix in an adjacent file (permitted by the plan's Test plan).

## Phase 5: document patch-and-restore recovery for lost child handles (p05)

**Status:** complete · **Tasks:** p05-t01 + p05-t02 + p05-t03
**Outcome:** `oat-project-implement/scripts/capture-dirty-tree.mjs` + 30-test suite; `phase-execution.md` and `oat-phase-implementer.md` (1.1.1 → 1.1.2, three pins) define `recovered_patch`; docs mirror sentence; provider views regenerated. **Verification:** node --test 30, forced CLI suite 5602, test:skills 832, smoke 141, release 39; review rounds 1–3 (round 2 found a Critical the round-1 fix introduced; round 3 clean). **Deviations:** `oat-project-implement` not re-bumped (p04's 2.3.2 carried); staged renames classified `unsupported-dirt` (ruled strictly fail-closed); quiescence rule strengthened to a superset.

## Autonomy Gate Provenance

- `IMPLEMENT-08` (subagent delegation): authorized once for this run for
  `oat-phase-implementer` and `oat-reviewer` within the plan's bounded phase
  and review scopes; native Claude Code Task dispatch (Tier 1). Operator
  approval 2026-09-05 ("let it rip"), covering PR creation and merge by the
  root orchestrator once required gates pass.
- `IMPLEMENT-03` / `IMPLEMENT-04` (checkpoints): `oat_plan_hill_phases: ['p05']`
  (final phase; `workflow.hillCheckpointDefault: final`) and
  `oat_auto_review_at_hill_checkpoints: true` explicit in `plan.md`.
- Dispatch policy preflight: managed / `high`, source `project-state`, value
  `opus` (Task model argument), resolved per phase with
  `--report-scope pNN --report-action implementation`.

### Review Received: plan

**Date:** 2026-09-06
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-06T023526Z.md
(gate run `54c02cde-f2f7-4e21-a798-ea4a12b49b09`, target `codex-5-6-sol-xhigh`,
threshold important, blocking)

**Findings:** Critical 0, Important 1, Medium 0, Minor 1. Artifact review: no
plan tasks created; both findings resolved in-artifact (auto-disposition, gate
mode).

**Disposition and verification records:**

- `I1` p01 task duplicated source-plan execution semantics (defect count,
  per-defect commit and review granularity) → resolve_in_artifact. What: the
  ordering text, step 2, step 4, the commit template, and contract item 4 now
  point to the source plan for its task, commit, and review boundaries and keep
  only the `p01-t01` prefix and wave ordering. How: no "four"/"defect"
  granularity wording remains under Phase 01 or item 4. Where: `plan.md`.
- `m1` group-2 sentence rendered p04 as a detached bullet → resolve_in_artifact.
  What: rewritten as one declaration. How: no line in `## Parallelism` begins
  with `+` or `- \`p04\``. Where: `plan.md` `## Parallelism`.
- Bookkeeping note: the preceding commit `f631d1cd6` carried only the archive
  move because the fix script aborted before writing; this commit carries the
  fixes.
- Post-fix validation: `oat project validate-plan` → "Plan validation passed."

**Next:** dispatch p01 (ungrouped) via `oat-project-implement`.

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-09-06 — branch `wave-2-execution`, Tier 1 (native Claude Task dispatch), policy managed/high

Wave base `90883f9bcfb0bc52a2fd58571542d194f71ee585`; plan gate `54c02cde` passed after two in-artifact fixes; p01 worktree bootstrapped at `70250093695a147a6271b5c8e14a203066eef6d7` (view-parity ok; no sync restamp needed).

#### Dispatch Notes

- `w2-p01-impl-001` — scope p01, target opus, model_axis selected:opus, effort_axis not-applicable, selection_reason native-catalog, candidates [opus], task_class default-implementation (plan dispatch profile). Stamp: `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`. Record `dispatch/w2-p01-impl-001.json`.
- Dispatch policy enforcement log: `Dispatch policy: high; selected=opus; cap=opus (claude, enforced — Task model arg)`.
- `w2-p01-review-001` — scope p01, role reviewer, target opus (native catalog, task_class consequential per the record). Review of `70250093..dcccb72d7`: 0C/1I/1M/4m → `fixes_added`. Record `dispatch/w2-p01-review-001.json`.
- `w2-p01-fix-001` — continuation of `w2-p01-impl-001` (mode fix) on the original implementer handle; one commit `848b8ef419e36f3a09c7a45e8cd69425af16e1f0` touching only `packages/cli/src/validation/skills.test.ts` (I1, M1, m1, m4 fixed with neutralization evidence; m2 → follow-up backlog item, m3 → wave close). Record `dispatch/w2-p01-fix-001.json`.
- `w2-p01-review-002` — disposition-verification round 2 on the original reviewer handle, range `dcccb72d7..848b8ef41`: all four fixes resolved by probe re-run (P5 and P3 now fail against the strengthened guards, P2b passes, title renamed), deferrals accepted, SKILL.md blobs byte-identical, no lockstep file; verdict PASS, 0C/0I/0M/1m (new m5: `readerSentences()` vocabulary bound, non-blocking). Reviewer re-ran `check`/`type-check` forced (`Cached: 0`) because plain runs were full replays. Record `dispatch/w2-p01-review-002.json`.
- `w2-p02-impl-001`, `w2-p03-impl-001`, `w2-p04-impl-001` — group 2 dispatched together from group base `565d79981ed3be08128758cf0974eec30c1688b2` (lane heads after the worktree-init sync commit: p02 `dd9a84d0e`, p03 `5c480f4b2`, p04 `db3d7ebb6`); each target opus, model_axis selected:opus, task_class default-implementation (plan dispatch profile), native-catalog selection. Records `dispatch/w2-p0{2,3,4}-impl-001.json`.
- `w2-p03-review-001` — reviewer, target opus; review of `5c480f4b2..a207d3c11`: 1C/1I/1M/3m (C1: passage scoping narrowed the `doesNotMatch` guard to the guarded passage, so an out-of-passage forbidden claim previously rejected is now accepted). Record `dispatch/w2-p03-review-001.json`.
- `w2-p03-fix-001` — continuation of `w2-p03-impl-001` (mode fix): C1, I1, M1 plus address-now m1–m3 in one commit. Record `dispatch/w2-p03-fix-001.json`.
- `w2-p03-fix-001` outcome: one commit `5a99837ec6fdb7e8d68bc7a5490228571ffd99ee` on `a207d3c11`, both declared files only; all six findings fixed with per-clause neutralization evidence (C1 whole-source `doesNotMatch`; I1 strengthened with negation/mutation markers and adjacent `only`/`replay`, B1–B4 fixtures; M1 terminator test; m1 byte-0 anchor; m2 cardinality restored; m3 bundle-strip comment); gates exit 0 with forced `Cached: 0`, test:skills 801/801.
- `w2-p03-review-002` — disposition-verification round 2 on the original reviewer handle, range `a207d3c11..5a99837ec`. Record `dispatch/w2-p03-review-002.json`.
- `w2-p03-review-002` outcome: PASS, 0C/0I/0M/3m; all six round-1 findings resolved by probe re-run (out-of-passage injections now fail on both copies, B1–B4 rejected, terminator and byte-0 tests pin their branches); NEGATION_MARKER weaker-anywhere check clean (no real requirement sentence disqualified, no word-boundary false positives); six independent mutations each turn a named test red. New minors m4–m6 (the `[^.]*`→`[\s\S]*` widening accepts a narrow band round 1 rejected for filename punctuation only; docs mirror packs three requirements into one sentence; v1-token distance to the only/replay pair unbounded within a sentence) deferred as informational.
- `w2-p04-impl-001` outcome: DONE, one commit `6ef43933eee2dd79c14eaf5c4ddb50b3facc9157` (20 files, +2228/−95): thirteen canonical skills bumped (three beyond the brief's pre-declared ten, all inside the plan's In-scope surface), new `named-skill-load-contract.test.ts` matrix, pins moved in `skills.test.ts`, four assertions in `review-skill-contracts.test.ts`, `.agents/docs/autonomy-contract.md` hashes refreshed; two stray four-backtick fences repaired (`oat-project-plan` Steps 8–13, `oat-project-review-receive` Step 6); Codex 0C/6I/1M all fixed pre-commit with one accepted residual; forced CLI suite 5592 green; manifest did not restamp (symlinked views, oatVersion already 0.2.57). Follow-up candidates: repo-wide fence-balance check; plan-shape lesson that lifecycle prose edits ripple into `review-skill-contracts.test.ts` and `autonomy-gate-inventory.test.ts`.
- `w2-p04-review-001` — reviewer, target opus, range `db3d7ebb6..6ef43933e` with eight root rulings (scope expansion, autonomy-contract edit, fence repairs, new test file collection, bump/pin audit, manifest claim, Codex I5 residual, fallback weaker-anywhere). Record `dispatch/w2-p04-review-001.json`.
- `w2-p04-review-001` outcome: 0C/4I/5M/5m, reconnaissance attempted; all eight root rulings answered (scope in-bounds; autonomy-contract edit forced by `autonomy-gate-inventory.test.ts`; fences were true 328-line and 49-line defects; adjacent test file permitted and collected; 13 bumps/pins clean with `oat-project-implement` 2.3.1→2.3.2 once; manifest dry-run clean; Codex I5 residual acceptable once documented; no fallback lost). Important: substring exemption matching absorbs injected directives; `use`/`apply` verbs escape the sweep; a stray fence silently disables the scanner with no gate; one exemption mislabels non-terminal prose as a handoff.
- `w2-p04-fix-001` — continuation of `w2-p04-impl-001` (mode fix): I1–I4, M1–M5, address-now m1–m4 in one commit. Record `dispatch/w2-p04-fix-001.json`.
- `w2-p04-fix-001` outcome: one commit `2b06f7292ec47bf2835b91e7765d562dafd9e7b9` on `6ef43933e` (9 files, no version or pin moved); I1–I4, M1–M5, m1–m4 fixed with per-finding neutralization evidence; the new stray-fence assertion found and repaired a third live fence (`oat-project-revise/SKILL.md:193`, 33 lines); M5 content pass found nothing stale in the un-fenced regions; matrix 160 rows / 21 tests, forced CLI suite 5600 green, sync dry-run clean. Disclosed and deliberately not fixed: a fourth, differently shaped stray fence at `oat-project-review-provide/SKILL.md:1057` hiding Step 8.5 (needs its own bump and a structural audit) → follow-up backlog item at closeout.
- `w2-p04-review-002` — disposition-verification round 2 on the original reviewer handle, range `6ef43933e..2b06f7292`. Record `dispatch/w2-p04-review-002.json`.
- `w2-p04-review-002` outcome: PASS (fan-in may proceed), 0C/0I/2M/3m, reconnaissance attempted; all I/M/m dispositions from round 1 resolved by probe re-run; the reviewer self-corrected two of its own published claims (four `requires` entries were removed but each is a mutually-reinforcing row split, not a weakening; round 2 added +4 load-required rows, not +1). New Mediums: the stray-fence docstring misdescribes its blind spot while `oat-project-review-provide/SKILL.md:1057` (span 1057–1167, Steps 8.5/9/9.5 hidden, zero `oat-project-*` pointers inside) remains a live uncovered instance whose repair is coupled to matrix row `:1970-1978`; the M4 refactor dropped the flush on fence open (latent fail-open widening). Minors: corpus floor does not guard itself; `complete:292` classification inconsistent with `next:332`; three more spurious fences outside the bounded surface. Address-now sweep `w2-p04-fix-002` dispatched (flush restore, docstring/assertion accuracy, floor wiring, complete:292 load clause); review-provide repair and the out-of-surface fences → follow-up backlog items at closeout.
- `w2-p04-fix-002` outcome (address-now sweep, no re-review): one commit `ef0c8595c10bf7653fdafc653baf0cc2b77b573f` on `2b06f7292` (3 files, no version or pin moved): `walkMarkdown` emits a fence boundary so prose blocks split at fences (fixture pins it); stray-fence docstring corrected and assertion renamed to what it checks, with `oat-project-review-provide/SKILL.md:1057` recorded as a known-uncovered instance and the indivisible repair recipe (opener before `:1013`, narrow `:1167`, delete the coupled matrix row, tighten the rule); corpus floor references `CORPUS_MINIMUMS` (40 files / 150 candidates) and guards itself; `complete/SKILL.md:292` gained a load clause and its row is `load-required` (ripple: `review-skill-contracts.test.ts:1560` updated). Forced CLI suite 5601 green, sync dry-run clean, check:skill-bumps still 17. Record `dispatch/w2-p04-fix-002.json`.
- `w2-p02-impl-001` outcome: DONE, one commit `c25e1fd4f3cfc70a60d9d17afe889403e8d008c7` touching only `codex-skill/tests/codex-skill-contract.test.mjs` (no SKILL.md, bump, pin, or manifest change); three Codex rounds — a round-1 'classifies its own route' exemption was reverted on round-2 evidence in favor of an anaphor-only rule; two Codex findings rejected with reasons (negation fail-closed; noun-continuation false positive); per-case red/green as reported by the implementer (17 negatives / 7 positives across its scratch harness); the reviewer counted what is actually pinned in the file — 11 negatives all flip when attachment is neutralized, 5 positives never depend on it — and the durable figure is 11/5; one documented fail-open residual (filler clause between anchor and anaphor). Gates exit 0, forced `Cached: 0`, test:skills 798.
- `w2-p02-review-001` — reviewer, target opus, range `dd9a84d0e..c25e1fd4f` with rulings on the reverted exemption, the fail-open filler residual, the direct-API control, the rejected Codex findings, and the no-bump claim. Record `dispatch/w2-p02-review-001.json`.
- `w2-p02-review-001` outcome: PASS with follow-ups, 0C/1I/2M/3m; rulings: anaphor-only honors the plan (no protected prose rejected; the reverted exemption moved in the safe direction); the fail-open filler residual is licensed by the plan's 'consecutive immediately following clauses' wording but is larger than reported (in the live paragraph the anchor's successor is permanently the direct-API clause, so an appended `In that case, confirm before launching.` passes — MUT-B) → I1: document and pin the boundary, do not widen the span; direct-API control load-bearing; both Codex rejections defensible; pinned counts are 11/5 not 17/7 (M1, bookkeeping corrected above); blockquote markup escapes `clauseOpener` (M2); `scenario` missing from the closed set (m1); `requiresConfirmation` vocabulary gap → note on `BL-260827-span-based-prose-guards` (m2); `.mjs` lint/format not CI-gated (m3, no action). Fix round `w2-p02-fix-001` dispatched for I1, M2, m1.
- `w2-p02-fix-001` outcome: one commit `530f428971dba27749bfb3f14cb8b0f13a65c8e7` on `c25e1fd4f` (test file only, +87/−5): I1 documented and pinned without widening the span (MUT-B and B1–B5 as a labelled known-accepted loop, MUT-C rejected); M2 blockquote/callout strip with rejected and control cases; m1 `scenarios?` token; pinned counts now 15 rejected / 6 accepted controls / 6 known-accepted boundary cases (the implementer withdrew its earlier 17/7 claim). Per-proof isolated neutralization; gates exit 0 with forced `Cached: 0`. Record `dispatch/w2-p02-fix-001.json`.
- `w2-p02-review-002` — disposition-verification round 2 on the original reviewer handle, range `c25e1fd4f..530f42897`. Record `dispatch/w2-p02-review-002.json`.
- `w2-p02-review-002` outcome: PASS (fan-in may proceed), 0C/0I/0M/1m; I1/M2/m1 verified by probe re-run (B1–B5 still accepted, span not widened, tripwire load-bearing under a proximity mutation; M1/M2/M6/A1/A8 flip to rejected); weaker-anywhere over the full 36-input round-1 corpus: 0 rejected→accepted; counts 15/6/6 confirmed. New m4: `LIST_MARKER_ONLY` not updated with `clauseOpener`, so a blockquoted ordered marker (`> 1. In that case, …`) still escapes — deferred to `BL-260827-span-based-prose-guards` with m2 (no `SKILL.md` under `.agents/skills` contains a blockquote).
- `w2-p05-impl-001` — p05 dispatched from group base `7c68ba1bfc32b0ecdae473337800c360ed4da816` (worktree HEAD identical; sync commit skipped because the manifest already carries 0.2.57); target opus, model_axis selected:opus, task_class default-implementation (plan dispatch profile), native-catalog selection; brief carries the p04 `oat-project-implement` no-rebump rule, the `oat-phase-implementer.md` bump + `skills.test.ts:3080` pin authorization, and the scratch-hygiene rule. Record `dispatch/w2-p05-impl-001.json`.
- `w2-p05-impl-001` outcome: DONE, one commit `de0ba133a4fdf85d382c070e46e4519bb4b10219` (38 files; 32 are sync-regenerated `.codex/agents` and `.cursor/agents` views from the `oat-phase-implementer.md` 1.1.1 -> 1.1.2 bump with three pins moved); new `oat-project-implement/scripts/capture-dirty-tree.mjs` + 22-test suite, `phase-execution.md`, docs mirror, one new `skills.test.ts` case; `oat-project-implement` not re-bumped (p04's 2.3.2 carried). Three Codex rounds (1C/7I/6M -> 0C/6I/7M/2m -> 0C/3I) with two rejections recorded (verify-then-apply window; seal as wiring device) and one deliberate narrowing (staged renames -> `unsupported-dirt`); nine guard-neutralization probes with named failing counts; forced CLI suite 5602, test:skills 824, smoke 141, release 39. Friction: literal NUL bytes materialised by Write where the JavaScript escape was needed; p04's load-contract gate flagged an inline script-path sentence (moved into a fence).
- `w2-p05-review-001` - reviewer, target opus, range `7c68ba1bf..de0ba133a`, consequential-surface brief with eight rulings (scope incl. provider views, carried bump, adversarial containment/TOCTOU/pathspec probes, rejected Codex findings and narrowing, quiescence superset, verification, skills.test.ts can-fail, weaker-anywhere on the recovered_patch exception). Record `dispatch/w2-p05-review-001.json`.
- `w2-p05-review-001` outcome: PASS WITH FIXES, 0C/2I/1M/5m (the artifact's own header undercounts its Minors as 4); all eight rulings answered (scope and provider views exact sync output; carried bump clean with three pins moved; eleven adversarial containment/pathspec/seal probes rejected as designed; the three Codex rejections upheld and the rename narrowing ruled strictly fail-closed; quiescence a strict superset; gates forced green; new test can fail; STOP for other dirt unchanged or stronger). Important: the recovery prose hardcodes a repo-relative script path (dies with MODULE_NOT_FOUND under a user-scope install; `oat-project-complete` resolves via `$SKILL_DIR`); the `bounded_files` guard is opt-in so an omitted bound captures out-of-phase dirt (probe P8). Medium: the continuation never reconciles the artifact's recorded HEAD. Minors: containment reconstruction off by one for a two-level missing path; `--verify` ignores unlisted extra artifact files; rename classification depends on `diff.renames`; non-numeric `--size` via the API; external plan step 5 stale (→ wave-close plan correction). Fix round `w2-p05-fix-001` dispatched.
- `w2-p05-fix-001` outcome: one commit `27cc81e8e85c12475e6930dcb0fa72c9b0fb61d5` on `de0ba133a` (five substantive files + 32 regenerated views; no version or pin moved): I1 installed-scope script resolution with a terminating guard and a named `capture-script-unavailable` stop (assertion at `skills.test.ts:3440` relaxed to the resolution form); I2 phase bound mandatory (`invalid-usage`, exit 64) and the comma-delimited `--bounded-files` flag removed after the lane's own Codex round showed `safe,dir` authorizing `safe/`; M1 `--expected-head` mandatory with base-mismatch failure; m1–m4 fixed with controls (`/`-ancestor reconstruction, nested/empty extras rejected, forced `renames=true`, strict `size` typing); a fix-round Codex Critical (miss guard fell through to `node ""`, exit 0) fixed in the same commit; tests 22 → 29; forced CLI suite 5602, test:skills 831, sync no-op. Record `dispatch/w2-p05-fix-001.json`.
- `w2-p05-review-002` — disposition-verification round 2 on the original reviewer handle, range `de0ba133a..27cc81e8e`. Record `dispatch/w2-p05-review-002.json`.
- `w2-p05-review-002` outcome: FIXES REQUIRED, 1C/0I/0M/3m. All seven round-1 findings verified fixed by probe re-run (26/26 assertions), but the I1 fix introduced a Critical: `phase-execution.md` resolves and guards `$CAPTURE_SCRIPT` in one fenced block and invokes `node "$CAPTURE_SCRIPT"` in two later blocks with no guard, and `node ""` exits 0 (reads stdin) — run verbatim in a fresh shell, the verify step accepts a tampered artifact. The child agent file is unaffected (guard and invocation share one block). Minors: error text names the removed `--bounded-files`; child snippet mixes `<artifact>` placeholders into a bash block; misplaced comment. Fix round `w2-p05-fix-002` dispatched.
- `w2-p05-fix-002` outcome: one commit `0f301c8e12451c66fe26c2fb79d2dedb8a60e30d` on `27cc81e8e` (five substantive files + 32 views; no version or pin moved): C1 fixed — every root block that invokes `$CAPTURE_SCRIPT` now carries `set -eu`, the resolution loop, and the terminating guard, with a fenced-block-aware assertion in `skills.test.ts` (fresh-shell step-6 reproduction: exit 1 unresolvable, exit 5 tampered); the reproduction surfaced a second fail-open of the same class inside the script (`isDirectInvocation` compared raw `argv[1]` to a realpath'd module URL, so a symlinked user-scope install never ran `main()` and exited 0) — fixed with two-sided `realpathSync` and a symlink control across three invocation forms; m1–m3 fixed; one Codex round (Important: `--preserve-symlinks-main`; Medium: CommonMark fence parser) fixed in the same commit; tests 30, forced CLI suite 5602, test:skills 832, sync no-op. Record `dispatch/w2-p05-fix-002.json`.
- `w2-p05-review-003` — disposition-verification round 3 on the original reviewer handle, range `27cc81e8e..0f301c8e1`, including the symlinked-install form of the fresh-shell probe. Record `dispatch/w2-p05-review-003.json`.
- `w2-p05-review-003` outcome: PASS (fan-in may proceed), 0C/0I/0M/0m, no new findings; all three invoking blocks executed verbatim in fresh shells (unresolvable → exit 1, tampered → exit 5, clean → ok, wrong base → exit 5); symlinked-install probe fails closed under plain and `--preserve-symlinks-main`; fence parser audited (10/10 and 6/6 blocks, every invocation inside a guarded block); module import does not run `main`; both neutralizations fail as required.

#### Phase Outcomes

| Phase | Worktree                | Implementer outcome                                                                               | Review outcome                                                        | Fix rounds |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------- |
| p01   | `.worktrees/wave-2/p01` | DONE (`848b8ef41`; 4 defect commits + 1 fix commit; lane gates + uncached suite 5579 green)       | passed (round 1 0C/1I/1M/4m → round 2 0C/0I/0M/1m)                    | 1          |
| p02   | `.worktrees/wave-2/p02` | DONE (`c25e1fd4f` + fix `530f42897`; lane gates forced `Cached: 0`, test:skills 798)              | passed (round 1 0C/1I/2M/3m → round 2 0C/0I/0M/1m)                    | 1          |
| p03   | `.worktrees/wave-2/p03` | DONE (`a207d3c11` + fix `5a99837ec`; lane gates forced `Cached: 0`, test:skills 801/801)          | passed (round 1 1C/1I/1M/3m → round 2 0C/0I/0M/3m)                    | 1          |
| p04   | `.worktrees/wave-2/p04` | DONE (`6ef43933e` + fix `2b06f7292` + sweep `ef0c8595c`; forced CLI suite 5601 green)             | passed (round 1 0C/4I/5M/5m → round 2 0C/0I/2M/3m; address-now sweep) | 1          |
| p05   | `.worktrees/wave-2/p05` | DONE (`de0ba133a` + fixes `27cc81e8e`, `0f301c8e1`; forced CLI suite 5602, test:skills 832 green) | passed (round 1 0C/2I/1M/5m → round 2 1C/0I/0M/3m → round 3 clean)    | 2          |

#### Group 1 fan-in — p01 (2026-09-06)

- `wave-2/p01` rebased across the post-review bookkeeping commits onto the integration tip and merged with `git merge --no-ff` as `80491b10c`. Lane commits re-hashed by that rebase (not by the merge): `a106af09b`→`91748b102`, `5097fd03a`→`dab384c31`, `383419381`→`7147b73ae`, `dcccb72d7`→`7284a1a01`, `848b8ef41`→`02148129f` (identical `git patch-id --stable` pairs; the Reviews table keeps the pre-rebase heads the reviewers examined).
- Fan-in-owned lockstep bump 0.2.56 → 0.2.57 above freshly fetched `origin/main` (`90883f9bcfb0bc52a2fd58571542d194f71ee585`); `public-package-versions.json` regenerated by the build.
- Integration gates (group fan-in mode), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- Group-2 readiness on the merged tip: p02, p03, p04 source plans all carry `oat_execution_status: READY` with no predecessor inside this wave; the only shared-write seam with p01 (`packages/cli/src/validation/skills.test.ts`, p04's `oat-project-implement` pin) is serialized by the group order. p01 worktree and branch removed after the merge.

#### Group 2 fan-in — p02, p03, p04 (2026-09-06)

- Merge order p02 → p03 → p04 with `git merge --no-ff` after rebasing each lane on the integration tip. Merge commits `d22e29058` (p02), `67f747e74` (p03), `7b9e379a8` (p04). Lane commits re-hashed by the rebase (identical `git patch-id --stable` pairs; the Reviews table keeps the pre-rebase heads the reviewers examined): p02 `c25e1fd4f`→`b3b014a14`, `530f42897`→`35db0c323`; p03 `a207d3c11`→`35e75f6e8`, `5a99837ec`→`a7bcdd9e6`; p04 `6ef43933e`→`f70f1e11e`, `2b06f7292`→`8e2111185`, `ef0c8595c`→`7cf56951d`. p02's worktree-init sync commit (`946224937`, `.oat/sync/manifest.json` `oatVersion` 0.2.56 → 0.2.57) was retained because the group-1 fan-in bump had not restamped the manifest; p03's and p04's identical sync commits were dropped as already applied. Lesson: the fan-in bump step should run `pnpm run cli -- sync --scope all` so the manifest restamps with the lockstep.
- Lockstep retained at 0.2.57 (origin/main still 0.2.56); integration gates (group fan-in mode), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- p05 readiness on the merged tip: its source plan is READY; the base now carries p04's single `oat-project-implement` bump (2.3.1 → 2.3.2, seven pins) which p05 must not repeat, and p03/p04 touched neither `oat-phase-implementer.md` nor its `skills.test.ts:3080` pin. Group-2 worktrees and branches removed after the merge.

#### Group 3 fan-in — p05 (2026-09-06)

- `wave-2/p05` rebased onto the integration tip and merged with `git merge --no-ff` as `eecd58fc3`. Lane commits re-hashed (identical `git patch-id --stable` pairs; the Reviews table keeps the pre-rebase heads): `de0ba133a`→`01015f4f2`, `27cc81e8e`→`116b86241`, `0f301c8e1`→`5ebf62d40`. No sync commit in this lane (the manifest already carried 0.2.57).
- Lockstep retained at 0.2.57 (origin/main still 0.2.56); integration gates (group fan-in mode), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- All five lanes merged; p05 worktree and branch removed. Final-wave re-check: this is the last group, so the closeout runs the final review over the whole integration diff and the configured exit gate.

#### Parallel Groups

- p01 ungrouped (merged); group 2: p02 + p03 + p04 (merged); p05 ungrouped (merged). All groups fanned in.

#### Outstanding Items

- None for implementation: all five lanes merged and gated. Closeout in progress: final review dispositions, configured exit gate, post-implement sequence (summary, document, pr). Deferred findings are mapped to backlog items under Deferred Findings.
- Journal note: `oat project dispatch record` refuses to revise generic fields after the first revision, so every record's `child_outcome` stays at its launch value (`running`); terminal outcomes live in the Dispatch Notes above.

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress (root orchestrator; lane detail lives in the dispatch transcripts and review artifacts).

### 2026-09-06

- [x] p01-t01 — `a106af09b`, `5097fd03a`, `383419381`, `dcccb72d7` (integration `91748b102`, `dab384c31`, `7147b73ae`, `7284a1a01`)
- [x] p01-t02 — `848b8ef41` (`02148129f`)
- [x] p02-t01 — `c25e1fd4f` (`b3b014a14`); p02-t02 — `530f42897` (`35db0c323`)
- [x] p03-t01 — `a207d3c11` (`35e75f6e8`); p03-t02 — `5a99837ec` (`a7bcdd9e6`)
- [x] p04-t01 — `6ef43933e` (`f70f1e11e`); p04-t02 — `2b06f7292`, `ef0c8595c` (`8e2111185`, `7cf56951d`)
- [x] p05-t01 — `de0ba133a` (`01015f4f2`); p05-t02 / p05-t03 — `27cc81e8e`, `0f301c8e1` (`116b86241`, `5ebf62d40`)

**What changed (high level):** four bundled skills tell the truth about their inventory, promises, tools, and step model; the codex-skill below-floor guard rejects anaphoric reinstatements of a confirmation demand; explainer-kit publication rules are enforced on the docs page too; thirteen lifecycle skills require loading the skills they direct an orchestrator to run, with a contract matrix that also detects stray fences; a lost child's dirty tree has a verified, fail-closed path back into the next attempt; lockstep 0.2.56 → 0.2.57.

**Decisions:** one bump per skill per PR (p05 carried p04's `oat-project-implement` bump); address-now sweeps stay bounded to the reviewer's own one-line fixes (the `oat-project-review-provide` fence repair became a backlog item); p02's anaphor-only rule upheld as honoring the plan's "explicitly and independently classifies" wording.

**Follow-ups / TODO:** see Deferred Findings. **Blockers:** none.

---

## Deviations from Plan / Design

| Task / Review | Source Artifact                                      | Planned / Documented                                                                              | Actual / Accepted                                                                                                              | Reason                                                                                                          | Source of Truth | Follow-up                                                      |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------- |
| p01-t01       | repair-bundled-skill-contract-drift.md               | one commit per task; `analyze` unpinned                                                           | four commits (one per defect); `analyze` pin moved                                                                             | plan's own batch-exception boundary; the pin exists                                                             | implementation  | wave-close plan correction                                     |
| p04-t01       | require-named-lifecycle-skills-to-be-loaded.md       | ten executor-operated skills; matrix in `post-implement-sequence-contracts.test.ts`               | thirteen skills; adjacent `named-skill-load-contract.test.ts`                                                                  | all inside the plan's In-scope surface; Test plan permits an adjacent file                                      | implementation  | wave-close plan correction (named tests omit two ripple files) |
| p05-t01       | document-patch-and-restore-for-lost-child-handles.md | `oat-project-implement/SKILL.md` bump; autonomy-contract refresh; byte-identical status snapshots | bump carried from p04; inventory untouched (symlinked mirrors, no prompt-site token); snapshot rule strengthened to a superset | one bump per skill per PR; step 5 conditional; porcelain v2 lacks worktree ids                                  | implementation  | wave-close plan correction                                     |
| p02 review    | harden-codex-skill-anaphora-guard.md                 | a clause that "explicitly and independently classifies" the route may confirm                     | anaphor-only rule; fail-open filler boundary documented and pinned                                                             | anaphoric continuations are not independent by construction                                                     | implementation  | residuals on `BL-260827-span-based-prose-guards`               |
| p04-t02 (I4)  | require-named-lifecycle-skills-to-be-loaded.md       | plan step 1 prose read as "run oat-project-design first, then proceed"                            | explicit Stop handoff when `design.md` is missing                                                                              | the exemption had labelled non-terminal prose as a terminal handoff; the fix makes the behavior match the label | implementation  | disclosed in the Final Summary and PR                          |

## Test Results

| Phase   | Focused / uncached evidence                                                       | Result | Exit | Where recorded              |
| ------- | --------------------------------------------------------------------------------- | ------ | ---- | --------------------------- |
| p01     | focused 170 + uncached CLI suite 5579; forced check/type-check                    | all    | 0    | lane report + review rounds |
| p02     | node --test 9 + test:skills 798; forced check/type-check                          | all    | 0    | lane report + review rounds |
| p03     | node --test 53 + test:skills 801; forced check/type-check                         | all    | 0    | lane report + review rounds |
| p04     | contract matrix 22 tests + forced CLI suite 5601; check:skill-bumps 17            | all    | 0    | lane report + review rounds |
| p05     | node --test 30 + forced CLI suite 5602 + test:skills 832 + smoke 141 + release 39 | all    | 0    | lane report + review rounds |
| fan-ins | eight-gate definition-of-done sequence ×3 with `Cached: 0` forced test runs       | all    | 0    | fan-in entries above        |

## Review Received: final (round 1)

**Date:** 2026-09-06
**Review artifact:** reviews/archived/final-review-2026-09-06T085208Z.md (reviewed head `bee72dd4d300762366475781f7d97ac76464948f`, invocation manual, dispatch `w2-final-review-001`, reconnaissance attempted)

**Findings:** Critical 0 · Important 3 · Medium 7 · Minor 8. Weaker-anywhere clean on all three safety surfaces (200-case differential on p02; 6/6 canonical and 7/7 mirror positions on p03; 21 adversarial probes on p05 all fail closed); 15/15 patch-id pairs identical; every skill bumped exactly once; every pin matches; the lockstep bump is the only release-file change; gates exit 0 with `Cached: 0`.

**Dispositions:**

- I1 — p03's whole-document guard was call-site-only (`source = passage` default; the pinning fixture called the helper directly): **fixed in code** — `w2-p03-fix-002`, commit `e82e2442f` on the integration branch (`contracts.test.mjs` only): `source` is required, the loop body is `assertGuardedCopy(copy, root)`, matrix paths are repo-root-relative, and the fixture drives the real matrix against injected copies of both guarded files. Neutralization: narrowing the source to the passage fails 1/54; deleting the third argument at the loop call fails 3/54 (previously 53/53 green).
- I2 — plan-gate artifact absent from git (`reviews/archived/` is gitignored; `f631d1cd6` recorded a pure deletion): **fixed** — force-added in `604ddd10a`; every other archived review artifact was already tracked.
- I3 — synthesis verdict 4 carried four false statements: **fixed** in `604ddd10a` (fix rounds per lane, two Criticals, nine Important across five lanes, p05 round 2 failed and round 3 passed).
- M1 — Final Summary asserted a final review and exit gate that did not exist: **fixed** (`77c6fb164`; the paragraph now names this artifact and states the gate is recorded as it completes).
- M2 — doctor backlog item misdescribed the deferred defect: **fixed** (`77c6fb164`; description and acceptance criteria rewritten around the both-installed-and-available contradiction).
- M3 — the p03 "one sentence" property did not hold at terminators followed by closing punctuation: **fixed in code** (`e82e2442f`; splitter, three fixtures, both comments corrected; neutralization fails 1/54).
- M4 — false no-op-rebase lesson in the group-1 fan-in record: **fixed** (`604ddd10a` log; `77c6fb164` implementation record).
- M5 — project state files described a mid-p01 snapshot: **fixed** (`77c6fb164`; `oat_status`, `oat_current_task_id`, Outstanding Items, state prose, `oat_last_commit`).
- M6 — Implementation Complete checklist unchecked; `summary.md` missing: **fixed** (four items checked; the `summary.md` item stays unchecked with a note until the post-implement sequence produces the file — round 2 caught it checked prematurely, reverted).
- M7 — dispatch records frozen at `child_outcome: running`; Dispatch Note :125 task-class claim: **fixed by note** (records are immutable after the first revision; terminal outcomes live in the Dispatch Notes; the reviewer-record task class corrected to `consequential`).
- m1 — plan-review ledger row `passed` against a blocking artifact: **fixed** (annotation beneath the row naming the gate-mode auto-disposition and fix commit `702500936`).
- m2 — three wave-close plan corrections had no durable tracker: **fixed** — `BL-260906-wave-2-external-plan` filed.
- m3 — p05 round-1 Minor count: **fixed** in the implementation record (5); the archived artifact is left as the reviewer wrote it.
- m4 / m5 — p02 markup-set overstatement and `requiresConfirmation` comment: **fixed** — residual shapes appended to `BL-260827-span-based-prose-guards` (`77c6fb164`); comment relabels via `w2-p02-fix-002`, commit `e17532ded` (comment-only: non-comment lines byte-identical; the six synonym probes and four markup compositions reproduced and named as residuals).
- m6 — `project-log.md` synthesis pending: **fixed** — structural entry appended stating that `orchestration-log.md` owns the wrapper synthesis.
- m7 — stale prior-artifact pointers in archived review frontmatter: **rejected** — archived artifacts are the reviewers' immutable records; the archive step's pointer rewrite is a follow-up for the skill, not a record edit.
- m8 — undisclosed lifecycle behavior change (`oat-project-plan` step 1 now stops instead of auto-chaining): **fixed** — Deviations row and Final Summary clause added; carried into the PR description.

**Verification record:** what — the two code commits and the record repairs above; how — `node --test` 54/54 and `pnpm test:skills` 833/833 on `e82e2442f`, forced `turbo run check` (`Cached: 0`), `oat project validate-plan` exit 0, `git ls-files` shows the plan-gate artifact tracked; where — this section and the commits named.

**Review row `final` (round 1) → `fixes_added`; a narrowed round 2 on the same reviewer handle verifies these dispositions.**

## Review Received: final (round 2, narrowed)

**Date:** 2026-09-06
**Review artifact:** reviews/archived/final-review-2026-09-06T091621Z.md (reviewed head `c0210b9d32941133fa65f2bef9150acf6f6fbae6`, range `bee72dd4d..c0210b9d3`, invocation manual, dispatch `w2-final-review-002`, reconnaissance not-attempted)

**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 5. Both code fixes verified genuine (I1: narrowing the loop body back to the passage now turns `not ok 14` red; omitting the third argument fails 3/54; M3: all three closing-punctuation shapes flip to rejected); `e17532ded` provably comment-only; I3's numbers recounted from the eleven artifacts and match; m7 rejection upheld.

**Dispositions (root, this commit):**

- I1 (M6 regressed) — the `summary.md` checklist box had been checked before the file existed: **fixed** — box unchecked with a note that the post-implement sequence produces it; the round-1 disposition text corrected.
- M1 — `BL-260906-wave-2-external-plan` shipped placeholder acceptance criteria: **fixed** — real criteria written.
- m1 — `oat_current_task_id` / `oat_current_task` / `oat_project_state_updated` not terminal: **fixed** (`null`, `null`, restamped).
- m2 — Phase Outcomes p05 count: **fixed** (`5m`).
- m3 — `project-log.md` pending-synthesis boilerplate: **fixed** — section body replaced with a pointer to `orchestration-log.md`; append-only entries untouched.
- m4 — stale Deferred Findings bullets: **fixed** (external-plan corrections point at the new item; p03 m4 recorded as closed by `e82e2442f`).
- m5 — splitter trade-off one-sided in the comment: **fixed** — one sentence added to the `guardedSentences` comment (comment-only, root-owned closeout edit, no behavior change).

**Verification record:** what — the record and comment repairs above; how — `oat project validate-plan` exit 0, `node --test` on `contracts.test.mjs` 54/54 after the comment edit, `git diff --stat` shows record files plus one comment-only hunk; where — this section and the commit that carries it.

**Review row `final` (round 2) → `fixes_added`; round 3 verifies these and, on pass, marks the row `passed`.**

## Review Received: final (round 3, narrowed)

**Date:** 2026-09-06
**Review artifact:** reviews/archived/final-review-2026-09-06T092134Z.md (reviewed head `1e688a1e5de97a3a49ec3e069dd5afd11a1bd756`, range `c0210b9d3..1e688a1e5`, invocation manual, dispatch `w2-final-review-003`, reconnaissance not-attempted)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 1. All seven round-2 dispositions verified; the checklist is honest; no incidental record contradiction; the only `.agents/` change in the range proven comment-only.

**Judgment-sweep disposition (address now, comment-only):** m1 — the round-2 comment sentence was inserted mid-sentence in `contracts.test.mjs:833-837` and over-wide: **fixed** (this commit) — moved below the host paragraph as its own `//` paragraph, rewrapped to 80 columns, generalized to "a terminator followed by closing punctuation"; 54/54 after; no re-review per the judgment-sweep rule.

**Review row `final` (round 3) → `passed`.** Everything after the reviewed head is closeout bookkeeping plus this comment-only edit; the configured exit gate reviews the tree at its own launch head.

## Deferred Findings

### Deferred Findings (Medium)

- p04 round 2 M: `oat-project-review-provide/SKILL.md:1057` stray fence (span 1057–1167, Steps 8.5/9/9.5 hidden; zero `oat-project-*` pointers inside) and the coupled matrix row → `BL-260906-repair-the-stray-fence-in-oat`.
- p04 round 2 M: three out-of-surface spurious fences (`oat-repo-knowledge-index`, `oat-repo-improve/references/plan-template.md`, a create-oat-skill reference) → same item.

### Deferred Findings (Minor)

- p01 m2: doctor example table self-contradiction → `BL-260906-reconcile-the-oat-doctor`.
- p01 m3 / p04 / p05 m5: external-plan wording (step-2 "one named contract group"; ten-skill list and named focused tests; conditional step 5) → `BL-260906-wave-2-external-plan` (lands in the wave-close program refresh).
- p01 m5: `readerSentences()` reader-vocabulary bound — informational, no action.
- p02 m2/m4: `requiresConfirmation` vocabulary; blockquoted ordered-marker escape → appended to `BL-260827-span-based-prose-guards`.
- p02 m3 / p03 friction: `.agents/skills/**/*.mjs` not covered by `pnpm check` or lint-staged → `BL-260906-cover-skill-test-files-under`.
- p03 round 2 m4: the punctuation-only band accepted by the `[\s\S]*` widening → closed by `e82e2442f` (closing-punctuation splitter; the symmetric trade-off — finer splitting also narrows what `NEGATION_MARKER` can disqualify — is documented in the `guardedSentences` comment). p03 round 2 m5–m6: docs mirror packs three requirements into one sentence; v1-token distance unbounded → informational, no action.
- p04 round 2 m: `complete/SKILL.md:292` consistency and corpus-floor self-guard → fixed in the sweep (`ef0c8595c`).

## Final Summary (for PR/docs)

**What shipped (five external plans, five backlog items closed):**

- p01 — four bundled skills repaired to match what ships (`oat-doctor` pack inventory = `PACK_MANIFEST`, `oat-brainstorm` no later-doctor promise, `oat-idea-summarize` declares `Bash`/`Glob`, `analyze` one ten-step model), each with its own contract group in `validation/skills.test.ts`.
- p02 — codex-skill below-floor guard attaches and rejects anaphoric continuations (list, blockquote, scenario/circumstance forms); direct-API exception preserved; 15 rejected / 6 accepted / 6 boundary cases pinned.
- p03 — explainer-kit publication-boundary assertions run over the docs page as well as the canonical reference, with a whole-document forbidden-phrase guard and negation/mutation-aware patterns; the docs page names the catalog requirement and canonical owner.
- p04 — thirteen lifecycle skills require loading the current `SKILL.md` of every OAT skill they direct an orchestrator to execute; `validation/named-skill-load-contract.test.ts` sweeps the surface (verb/anaphor detection, one-sentence exemptions, stray-fence detection, corpus floors); three hidden four-backtick fences repaired (`oat-project-plan`, `oat-project-review-receive`, `oat-project-revise`).
- p05 — `oat-project-implement/scripts/capture-dirty-tree.mjs` captures a lost child's dirty tree into a digest-verified, sealed, contained artifact (mandatory bound, expected-head reconciliation, guarded invocations in every prose block, symlinked-install fail-closed), and the `recovered_patch` contract in `phase-execution.md` / `oat-phase-implementer.md` (1.1.1 → 1.1.2) lets the next attempt apply and commit exactly that artifact first.

**Release:** lockstep 0.2.56 → 0.2.57 (single fan-in bump); `.oat/sync/manifest.json` `oatVersion` 0.2.56 → 0.2.57 (carried by p02's worktree-init sync commit); `.codex/agents` and `.cursor/agents` views regenerated for the `oat-phase-implementer` bump.

**Verification:** per lane focused suites, forced-turbo check/type-check, Codex read-only review, and a root-owned adversarial review with one to three disposition-verification rounds (one Critical caught in p03 round 1; one Critical caught in p05 round 2 that the round-1 fix had introduced); three fan-ins with the eight-gate sequence and `Cached: 0` forced test runs; the final review (round 1 `reviews/archived/final-review-2026-09-06T085208Z.md`, 0C/3I/7M/8m; dispositions in the Review Received sections) and the configured exit gate are recorded in the sections that follow as they complete.

**User-visible lifecycle change (p04):** `oat-project-plan/SKILL.md` step 1 no longer auto-chains into design when `design.md` is missing; it now stops and tells the user to run `oat-project-design` first (the prior prose read as a silent continuation).

**Bookkeeping:** archived `BL-260819-repair-verified-bundled-skill`, `BL-260827-harden-the-codex-skill-below`, `BL-260818-extend-guarded-prose-contract`, `BL-260718-mandatory-skill-load-clause`, `BL-260902-document-patch-and-restore`; filed `BL-260906-repair-the-stray-fence-in-oat`, `BL-260906-cover-skill-test-files-under`, `BL-260906-reconcile-the-oat-doctor`; residuals appended to `BL-260827-span-based-prose-guards`; plan corrections queued for the wave-close program refresh; completion tail and recap deferred to program close.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
