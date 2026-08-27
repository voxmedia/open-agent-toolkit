---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-3-execution

**Started:** 2026-08-26
**Last Updated:** 2026-08-26

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

| Phase    | Status | Tasks | Completed |
| -------- | ------ | ----- | --------- |
| Phase 01 | passed | 1     | 1/1       |

**Total:** 1/1 tasks completed

## Phase 01: hermetic-cli-assets-root (solo)

**Source plan (the contract):** `.oat/repo/reference/external-plans/2026-08-19-hermetic-cli-assets-root.md`
**Status:** passed — review round 2 (narrowed) clean at `6dc9cdd1`

### Phase Summary (fill when phase is complete)

Source plan executed in full: `resolveAssetsRoot(env = process.env)` honors a non-empty trimmed `OAT_ASSETS_DIR` (relative values resolve against cwd) with the unchanged `stat` + `validateAssetsBundle` fail-closed path; unit coverage via the injected `env` (override wins, blank/unset fall back, four fail-closed cases, relative case, hard-asserted default binding via `vi.stubEnv`); the package-coverage smoke file bundles once per file into a temp root, sets `OAT_ASSETS_DIR` before importing built consumers, restores/cleans on every path with a second `after` asserting it, and proves the built `dist` reads the temp root (negative control: shared assets moved aside); ambient-override class closed at `packages/cli/vitest.config.ts`; `bundle-assets.sh` rationale comment corrected; lockstep 0.2.34 → 0.2.35 with `public-package-versions.json` regenerated. Two review rounds (0C/0I/2M/4m → fixed; 0/0/0/0), two Codex rounds clean. Docs for `OAT_ASSETS_DIR` → `document` step.

### Task p01-t01: Execute external plan — Honor an explicit CLI assets root and isolate package coverage smoke tests

- **Status:** done · **Commit:** `4019f98c0e3b34846632597da025a7590e3a5da1` (sole commit; parent `ee3f6ea6`)
- **Implementer:** `oat-phase-implementer` (Opus), request `w3-p01-impl-001`; recovery attempts 0.
- **Drift check:** PASS — plan drift command differs from `6f443c08` only in the five manifests' `version` line; rule-1 addendum 1 (release surfaces vs fetched `origin/main` = `39cea801`, baseline still 0.2.34): empty; addendum 2: 34 `resolveAssetsRoot(` call sites, all zero-argument; the only `OAT_ASSETS_DIR` reader is `bundle-assets.sh:6` (11 test hits pass it as child-process env, then pass the bundle path explicitly) — STOP #1 clear; addendum 3: `test:smoke` unchanged (one process per file), `tools/smoke/runner/cleanup.test.mjs` differs (W1 test file, not an execution mechanism) — STOP #3 clear.
- **What changed:** `packages/cli/src/fs/assets.ts` — `resolvePackagedAssetsRoot()` extracted (:69); `resolveAssetsRoot(env = process.env)` (:84) selects `resolve(override)` only for a non-empty trimmed `OAT_ASSETS_DIR`, then the unchanged `stat` + `validateAssetsBundle` on both paths. `assets.test.ts` +8 cases via injected `env` (override wins; `{}`/`''`/whitespace fall back; missing dir / not a directory / missing metadata / version mismatch fail closed with the existing messages); ambient-default case guarded by `it.skipIf(OAT_ASSETS_DIR set)`. `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` — file-level `before` bundles once into a `mkdtemp` root and sets `OAT_ASSETS_DIR`; `after` restores the prior value and removes the dir (also on the `before` failure path); new test asserts built `dist/fs/assets.js` resolves the temp root ≠ shared root. Lockstep 0.2.34 → 0.2.35 (five manifests); `public-package-versions.json` regenerated; lockfile unchanged.
- **Verify gates:** step 1 type-check 0; step 2 focused `vitest run src/fs/assets.test.ts` 13/13; step 3 `pnpm build` + `node --test …/package-coverage-consumers.test.mjs` 3/3; step 4 `release:check-versions` + `release:validate` 0. Negative control: with `packages/cli/assets` moved aside the smoke file still passes 3/3.
- **DoD (pre-commit, all exit 0, logs `$TMPDIR/w3-p01/final-*`):** check, type-check, test (CLI 3694; smoke 140/0), build, check:skill-bumps, fetch + release:check-versions, release:validate, build:docs, lint, format; post-commit re-run of check/type-check/lint/format/skill-bumps/check-versions all 0.
- **Cross-model review (plan Step 4):** `codex review --uncommitted` (codex-cli 0.149.1, gpt-5.6-sol) — round 1 P2: the packaged-root unit case was not hermetic under an ambient `OAT_ASSETS_DIR` (reproduced) → fixed with `it.skipIf`; round 2: no actionable defects.
- **Self-identified risks (handed to the reviewer):** stale `bundle-assets.sh:12-19` comment ("honours no override"), left untouched as out of the plan's in-scope list; `it.skipIf` conditional; relative override resolves against cwd; whitespace-only falls back per the plan's trim rule; per-file bundle cost; process-global env under one-process-per-file.

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-08-26 (complete: 1 phase passed, 0 failed, 0 stopped)

- Branch: `wave-3-execution`; Tier 1 (native `oat-phase-implementer` /
  `oat-reviewer`); dispatch policy managed / `high` (Claude `opus`, enforced —
  Task model arg); schedule `[p01]` (solo, integration checkout).
- Phase recovery policy: default limit 10; usage ledger in `state.md`.

#### Dispatch records

- `w3-p01-impl-001` — caller `oat-project-implement`; scope `p01`; action
  implementation; role `oat-phase-implementer` (class worker); provider claude;
  dispatch_context root-native (Task tool); catalog: Task-tool model enum
  {sonnet, opus, haiku, fable} observed 2026-08-26; role_selector
  `oat-phase-implementer`; model_selector `opus` (tier-alias); effort
  not-exposed (`effort_axis=not-applicable`); selection_source native-default;
  selection_reason native-catalog; candidates_considered [opus]; task_class
  default-implementation (classification_source caller: bounded env-override +
  test isolation + lockstep bump in one lane; containment boundary reviewed
  separately as consequential); floor satisfied; authority: write in the
  integration checkout within the source plan's scope; retry_limit 0 (phase
  recovery contract owns post-commit repair); resolver
  `oat project dispatch-ceiling resolve` (`w3-resolve-p01-implementer.json`).
  Stamp:
  `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- `w3-p01-review-001` — caller `oat-project-implement`; scope `p01`; action
  review; role `oat-reviewer` (class reviewer, fresh); provider claude;
  model_selector `opus` (configured review ceiling — reviewer routes reject
  candidate/classification flags); task_class consequential (containment /
  env-override boundary); brief mandates six reviewer-designed probes;
  resolver output `w3-resolve-p01-reviewer.json`. Stamp:
  `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- Enforcement log: `Dispatch policy: high; selected=opus; cap=opus (claude, enforced — Task model arg)`.
- Launch acceptance (2026-08-26): `w3-p01-impl-001` accepted by the Claude Code Task tool (native, `subagent_type: oat-phase-implementer`, `model: opus`) on the integration checkout at `ee3f6ea6`; returned DONE at `4019f98c`. `w3-p01-review-001` accepted (native, `subagent_type: oat-reviewer`, `model: opus`) against `4019f98c`.

#### Phase Outcomes

| Phase | Worktree                                  | Implementer outcome                                             | Review outcome                                            | Fix rounds | Merged |
| ----- | ----------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- | ---------- | ------ |
| p01   | integration checkout (`wave-3-execution`) | DONE (4019f98c + fix 6dc9cdd1; DoD 10/10 green; codex clean ×2) | passed (round 2: 0C/0I/0M/0m; round 1: 0C/0I/2M/4m fixed) | 1          | n/a    |

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

### Review Received: p01 (round 1)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/p01-review-2026-08-27T000253Z.md (reviewed head `4019f98c0e3b34846632597da025a7590e3a5da1`, range `33149b26..4019f98c`, invocation auto, dispatch `w3-p01-review-001`, model opus; six reviewer-designed probes executed — weaker-anywhere on both resolution paths, blank/whitespace/relative semantics, delete/reorder mutations on the smoke restore/cleanup, built-CLI proof, process-global hygiene, release bookkeeping)

**Findings:** Critical 0 · Important 0 · Medium 2 · Minor 4 — no fail-closed regression (probe 1 clean); Done criteria confirmed at `4019f98c`.

**Dispositions (bounded fix round, append-only, resumed implementer handle `w3-p01-impl-001` → fix request `w3-p01-fix-001`):**

- M1 `it.skipIf` silently removes the only default-binding coverage → **fix**: hard assertion via `vi.stubEnv('OAT_ASSETS_DIR', '')` + `vi.unstubAllEnvs()` (no `process.env` assignment; reviewer-verified 13/13 under an ambient override).
- M2 `gate/index.test.ts:479` ambient `resolveAssetsRoot()` now env-sensitive (6 failures reproduced under an ambient override) → **fix**: explicit `resolveAssetsRoot({})`, and sweep every zero-argument `resolveAssetsRoot()` in test files in one pass.
- m1 stale `bundle-assets.sh:13-14` rationale comment → **fix** (two-line comment on the function under change; the plan bars removing staging, not correcting its comment).
- m2 `OAT_ASSETS_DIR` undocumented on the published CLI → **deferred to the `document` step** (docs are outside the plan's in-scope list; the post-implement sequence owns docs).
- m3 relative-override semantics unpinned → **fix**: JSDoc line + one `it` case asserting `resolve(cwd, value)`.
- m4 smoke restore/cleanup unasserted (two surviving mutants) → **fix**: second file-level `after` asserting env-key presence equals the captured prior state and the temp root no longer exists.

**Fix round `w3-p01-fix-001` (resumed implementer handle, append-only commit `6dc9cdd19e90b16cafd5e980378f81a27134da70` on `4019f98c`; 6 files, +66/−19):**

- M1 → hard assertion via `vi.stubEnv`/`vi.unstubAllEnvs()` (`assets.test.ts:25-39`); 13/13 with no skips under an ambient metadata-only bundle.
- M2 → both literal zero-argument test call sites made explicit (`gate/index.test.ts:479` → `resolveAssetsRoot({})`; `assets.test.ts` via stubEnv) **and** the class closed at the runner seam: `packages/cli/vitest.config.ts` `test.env: { OAT_ASSETS_DIR: '' }` — with a metadata-only ambient bundle the CLI suite went from 7 files / 52 failures (production code correctly following the override through real command paths; a complete ambient bundle fails none) to 273 files / 3695 green; production call sites unchanged. Scope of the config-level change handed to round 2 for a verdict.
- m1 → `bundle-assets.sh:12-20` rationale corrected (comment only; `bash -n` 0).
- m3 → JSDoc line (`assets.ts:83`) + relative-override case (`assets.test.ts:54-70`) asserting `resolve(process.cwd(), value)`.
- m4 → second file-level `after` (`package-coverage-consumers.test.mjs:66-78`) asserting env-key presence/value restored and the temp root gone; both round-1 mutants now fail (exit 1 each), file restored byte-exact (SHA-pinned).
- m2 → docs untouched; `document` step.
- DoD all ten exit 0 (`$TMPDIR/w3-p01-fix/`), `release:check-versions` re-run post-commit exit 0; `codex review --uncommitted` → no actionable defects.

**Verification record (root):** what — the fix commit's parent chain (`4019f98c` unchanged, `git rev-list --count 4019f98c..HEAD` = 2), file list (6), and the `vitest.config.ts` diff; how — `git log`/`git show --stat`/`git diff` at HEAD; where — this entry; independent verification of each disposition — round-2 narrowed review `w3-p01-review-002`.

**Review row `p01` → `fixes_completed` at `6dc9cdd1`; narrowed round 2 dispatched.**

### Review Received: p01 (round 2, narrowed)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/p01-review-2026-08-27T003545Z.md (reviewed head `6dc9cdd19e90b16cafd5e980378f81a27134da70`, range `4019f98c..6dc9cdd1`, invocation auto, dispatch `w3-p01-review-002`, model opus, disposition-verification brief)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 0 — all six round-1 dispositions verified with reviewer-run evidence (M1/M2/m1/m3/m4 fixed; m2 deferred to the `document` step, no docs touched). The `packages/cli/vitest.config.ts` `test.env` change judged in scope, necessary, and non-masking (reviewer reproduced 7 files / 52 failures with the line removed under a metadata-only ambient bundle, traced the residual failures to production call sites, and confirmed 3695/3695 green with the line removed under a complete ambient bundle). Both round-1 surviving smoke mutants now die; every mutated file restored byte-exact (SHA-256 verified).

**Deferred Findings Re-evaluation:** none deferred for p01 (m2 is routed, not deferred).

**Review row `p01` → `passed` at `6dc9cdd1`. Next: closeout baseline → final verification → final review → configured exit gate.**

### Review Received: final (round 1)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/final-review-2026-08-27T005219Z.md (reviewed head `9a2e659b5c02b2118977b9ee9898f05c140dd435`, range `33149b26..9a2e659b`, invocation auto, dispatch `w3-final-review-001`, model opus)

**Findings:** Critical 0 · Important 2 · Medium 4 · Minor 7 — no code defect; all nine Done-criteria / Review-focus items covered from source plus six built-CLI probe groups (override honored by a real command with a distinguishing marker; six invalid classes → six exit-2 rejections; content-delivery probe; cleanup guard load-bearing; isolation with the shared root absent); DoD 10/10 re-run at `9a2e659b`. Extra work (`vitest.config.ts` seam, explicit gate test call site) accepted with no finding.

**Deferred Findings Re-evaluation:** the reviewer's ledger closes R1 M1/M2/m1/m3/m4, agrees with the three accepted risks and the R2 non-finding, and escalates the two closeout template gaps (now I1/I2 here) and the docs carrier (M3).

**Dispositions (all bookkeeping or forward-looking notes; resolved by the root in this commit unless stated):**

- I1 Final Summary unfilled template → filled (what shipped, user-facing change, key files, verification, design deltas).
- I2 resume state stale (`oat_status`, `oat_current_task_id`, Progress Overview, phantom Phase 2) → `complete` / `null` / single real phase row / `1/1`.
- M1 plan item 1 checked against a missing record → `## Done-criteria confirmation (source plan)` added (final-review coverage table, verified at `9a2e659b`); item text corrected.
- M2 Implementation Log scaffold with a phantom `p01-t02` → replaced by one real session entry.
- M3 docs follow-up carrier too weak → explicit `plan.md` § Implementation Complete item 5 (`document` step: `OAT_ASSETS_DIR` entry in `configuration.md`) plus a Deviations row.
- M4 `state.md` § Artifacts "not started" → refreshed to reality.
- m1 "4 cases" → "3 cases plus a file-level cleanup-assertion `after` hook". m2 References `design.md`/`spec.md` → source plan + discovery. m3 stale frontmatter comments → refreshed (`oat_last_commit` explicitly scoped to the last code commit).
- m4 metadata-only override roots degrade silently (conformant with the plan's metadata-validation bar) → **backlog candidate** (structural check for partial bundles), filed at wave close.
- m5 fail-closed error text points override users at `pnpm build` (plan mandated the existing messages) → **backlog candidate** (override-aware remedy wording), filed at wave close.
- m6 `.oat/sync/manifest.json` `oatVersion` 0.2.34 vs packages 0.2.35 → accepted as noted (pre-existing repo pattern, tracked by `BL-260826-warn-on-silent-oatversion`); no action in this lane.
- m7 `project-log.md` gate entry cites the pre-archive artifact path → accepted (append-only contract); correcting note in the orchestration-log synthesis.

**Verification record (root):** what — each disposition above; how — root edits verified by `pnpm exec oxfmt --check`, `oat project validate-plan`/`project status` parse, and table-structure grep; where — this entry, independently verified by the narrowed round-2 final review.

**Review row `final` → `fixes_completed`; narrowed round 2 next.**

### Review Received: final (round 2, narrowed)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/final-review-2026-08-27T010508Z.md (reviewed head `e9a9575b761bb014c3c5a858dca4dbf24ed7acc4`, range `9a2e659b..e9a9575b`, invocation auto, dispatch `w3-final-review-002`, model opus, disposition-verification brief)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 0 — the range touches eight files, all under the wrapper project or the backlog (no code), so round-1 code coverage is inherited; all thirteen round-1 dispositions verified resolved with file:line evidence; closeout ordering, backlog archival triple (46 rows vs 46 items), synthesis, and the Reviews ledger row confirmed; the new Done-criteria table re-derived against the source plan (6 DC + 3 RF in order) and code; `validate-plan` 0, `oxfmt --check` 0, 5/5 tables well-formed, 0 placeholders.

**Review row `final` → `passed` at `e9a9575b`. Next: configured exit gate (generation 1).**

### Review Received: final (gate, generation 1)

**Date:** 2026-08-27
**Review artifact:** reviews/archived/final-review-2026-08-27T011826Z.md (reviewed head `b1c60abcc4787be401eaeb77ca7688e8d70810a4`, full range `33149b26..b1c60abc`, invocation gate, run `c89b7975-266a-48ba-a459-8ce880cc0813`, target `cursor-gpt-5-6-sol-xhigh`, model gpt-5.6-sol-xhigh)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 0 — gate passed at the important threshold with no findings; configured gate run as configured (default same-family avoidance → Cursor), detached launch with receipt, 13 minutes.

**Deferred Findings Re-evaluation:** none outstanding (m4/m5 of the final review are backlog candidates, not deferrals).

**Gate review row `final` → `passed`; exit gate generation 1 allowed. Next: post-implement sequence (summary → document → pr).**

## Implementation Log

Chronological log of implementation progress.

### 2026-08-26 — 2026-08-27

- Preflight from main `39cea801` (`worktree:init`, build, type-check exit 0; manifest restamp `0da7e477`); wrapper scaffolded `b9a181f5`; plan gate passed round 1 (`cursor-gpt-5-6-sol-xhigh`, run `59ebe179`); implement phase opened `ee3f6ea6`.
- [x] p01-t01: Execute external plan — `4019f98c` (Opus implementer `w3-p01-impl-001`; DoD 10/10; Codex P2 fixed pre-commit).
- [x] p01-t01 fix round — `6dc9cdd1` (append-only; round-1 M1/M2/m1/m3/m4; Codex clean).
- Reviews: p01 round 1 `0C/0I/2M/4m` → round 2 `0/0/0/0` (`passed` at `6dc9cdd1`); root final verification 10/10 at `cf53e818` (`9a2e659b`); final review round 1 `0C/2I/4M/7m` — all bookkeeping/notes, resolved at receive.
- Decisions: close the ambient-override hermeticity class at the vitest `test.env` seam (one line) rather than N call-site edits; keep the plan-mandated existing error messages on the override path (remedy wording → backlog).
- Blockers: none.

## Implementation-tail project recap (IMPLEMENT-19)

- Intent: `oat_project_recap: generate / autonomous_policy`; no manifest existed → exactly one `project-recap` attempt via `runOatExplainer` (`mode: unattended`, in-process planSet/author/critic/browserSession/visualCritic seams; delegated to an Opus worker, dispatch `w3-recap-001`, driver under `$TMPDIR/w3-recap/`).
- Result: manifest `explainers/wave-3-execution-recap/manifest.json`, run `run-6c05d663-d933-4480-8740-96709c53deeb`, recipe `project-recap@2` (floor-only portfolio, one hub). Build: validate/fact-base/content/render/qa passed, theme warned `theme-selection-normalized` (only warning); fact critic 3 sources / 3 claims / 0 findings; real Chromium 147.0.7727.15 evidence at 320×640, 768×1024, 1440×900 (clean); visual review `pass` on attempt 1; backlinks pinned to `ea7ce494`; the recap states plainly that the wave PR is not yet opened.
- Finalizer (`dedicated`): artifact commit `4a052aca` (exactly the 27 immutable paths), attestation `record-durability.mjs` → **built-durable** (`durable: true`, no errors), evidence commit `40c69c28`, `verifyTrackedRunFinalization` `ok: true`. Root re-verified 27/27 immutable hashes against the blobs at HEAD.
- Deviations from W2 (worker-reported, root-accepted): mandated commit subject instead of the finalizer's default; three bindable sources; no commitlint rejection (bodies pre-checked ≤ 100 chars); one transient Chromium launch timeout in a preflight re-run only (no run attempt consumed); two SVG layout defects caught by a pre-run screenshot pass and fixed before the single run.

## Deviations from Plan / Design

| Task / Review                         | Source Artifact             | Planned / Documented                                                                           | Actual / Accepted                                                                                                                                                      | Reason                                                                                                                                           | Source of Truth                                               | Follow-up                  |
| ------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------- |
| p01-t01 fix round (review round-1 M2) | external plan `## In scope` | four in-scope surfaces (`assets.ts`, `assets.test.ts`, smoke consumer file, release manifests) | also `packages/cli/vitest.config.ts` (`test.env: { OAT_ASSETS_DIR: '' }`), `gate/index.test.ts:479` (`resolveAssetsRoot({})`), and a comment fix in `bundle-assets.sh` | test-hermeticity consequences of the change itself (every zero-argument call site became env-sensitive); comment corrected a now-false rationale | round-2 and final reviews (accepted, non-masking, no finding) | none                       |
| closeout                              | wrapper checklist           | `document` step owns docs                                                                      | `OAT_ASSETS_DIR` docs deferred to the `document` step (round-1 m2)                                                                                                     | plan's in-scope list excludes docs                                                                                                               | `plan.md` § Implementation Complete item 5                    | apply at the document step |

## Test Results

**Final verification (root, closeout baseline) at `cf53e818`** — full definition of done invoked literally, one log per gate under the session scratchpad `w3-dod/`, exit codes captured in `exits.txt`: `pnpm check` 0 · `pnpm type-check` 0 · `pnpm test` 0 · `pnpm build` 0 · `pnpm run check:skill-bumps` 0 · `git fetch origin` 0 then `pnpm release:check-versions` 0 (0.2.35 vs `origin/main` 0.2.34) · `pnpm release:validate` 0 · `pnpm build:docs` 0 · `pnpm lint` 0 · `pnpm format` 0. Tree clean after the run; no deterministic-smoke worktrees left behind.

Earlier evidence: implementer DoD 10/10 at `4019f98c` and again at `6dc9cdd1` (post-commit `release:check-versions` re-run 0); reviewer re-runs at both heads; focused suites `src/fs/assets.test.ts` 14 cases, `gate/index.test.ts` 198, smoke consumer file 3 cases plus a file-level cleanup-assertion `after` hook, all green with and without an ambient `OAT_ASSETS_DIR`.

## Final Summary (for PR/docs)

**What shipped:** `resolveAssetsRoot(env = process.env)` honors a non-empty (trimmed) `OAT_ASSETS_DIR` — relative values resolve against the process working directory — and applies the unchanged `stat` + bundle-metadata / `OAT_VERSION` validation on both paths, so missing, malformed, or version-mismatched overrides fail closed with the existing actionable errors and never fall back; unset/blank keep the packaged root. The package-coverage smoke consumer bundles once per file into a private temp root, sets `OAT_ASSETS_DIR` before importing built consumers, proves the built `dist` reads the temp root, and restores/cleans on every path with a guard hook asserting it. Lockstep bump 0.2.34 → 0.2.35.

**User-facing behavioral change:** a new public runtime environment variable on the published CLI (`OAT_ASSETS_DIR`) that redirects which bundled skills/agents/templates/scripts the CLI reads; documented at the `document` step (`apps/oat-docs/docs/cli-utilities/configuration.md`).

**Key files:** `packages/cli/src/fs/assets.ts`, `packages/cli/src/fs/assets.test.ts`, `packages/cli/vitest.config.ts`, `packages/cli/src/commands/gate/index.test.ts`, `packages/cli/scripts/bundle-assets.sh` (comment), `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs`, five `packages/*/package.json`, `packages/cli/assets/public-package-versions.json`.

**Verification:** DoD 10/10 at `4019f98c`, `6dc9cdd1`, `cf53e818` (root), and `9a2e659b` (final reviewer); reviewer probes — weaker-anywhere on both resolution paths, blank/whitespace/relative semantics, delete/reorder mutations on restore/cleanup (both mutants die), built-CLI isolation proof, end-to-end fail-closed probes through the built CLI (six invalid classes, six exit-2 rejections), negative control with the shared assets moved aside.

**Design deltas:** N/A (quick mode; no `design.md`). Extra work accepted by review: `vitest.config.ts` `test.env` seam + explicit `gate/index.test.ts` call site (test-hermeticity consequences of the change).

## Done-criteria confirmation (source plan)

Lifted from the final review round 1 (`reviews/archived/final-review-2026-08-27T005219Z.md`), reviewer-verified at `9a2e659b` from source plus built-CLI probes; DC = Done criteria, RF = Review focus.

| Requirement                                                                                          | Status  | Evidence                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DC1 — a non-empty `OAT_ASSETS_DIR` is resolved and validated before use                              | covered | `packages/cli/src/fs/assets.ts:88-90` (trim + `resolve`), `:92-106` (`stat` + directory check), `:108` (`validateAssetsBundle`); Probe 1 (built CLI reads the marked temp bundle)                                                                              |
| DC2 — missing, malformed, and version-mismatched explicit overrides fail closed                      | covered | Probe 2 (a)-(d) and Probe 3 A/B/G — all exit 2 with the pre-existing message naming the override path; `assets.ts:97-100` rethrows `CliError` unchanged so no path can degrade to the packaged root                                                            |
| DC3 — unset or blank overrides preserve the packaged default                                         | covered | `assets.ts:88` (`?.trim() ?? ''`), `:90` (`override.length > 0 ? … : resolvePackagedAssetsRoot()`); Probe 3 E (empty and whitespace both exit 0 on packaged content); `assets.test.ts:73-87`                                                                   |
| DC4 — the package-coverage smoke file builds and reads only its temporary bundle                     | covered | `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs:41-63` (one `mkdtemp` + one `bundle-assets.sh` per file), `:95-105` (asserts resolved root === temp root); Probe 6 (passes 3/3 with `packages/cli/assets` absent)                               |
| DC5 — all five public package versions move together and release gates pass                          | covered | `packages/cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms` all `0.2.35`; `pnpm release:check-versions` exit 0; `pnpm release:validate` exit 0 ("validated … 5 public packages", 5 tarballs at 0.2.35)                                     |
| DC6 — `git status --short` contains only scoped implementation, tests, and required release metadata | covered | `git status --porcelain` empty at HEAD and after all ten gates; `4019f98c` touches 9 files (4 code/test, 5 manifests + the build-generated `public-package-versions.json`), `6dc9cdd1` touches 6, all in scope                                                 |
| RF1 — confirm explicit overrides fail closed instead of falling back silently                        | covered | Probe 2 and Probe 3 A/B/G: six invalid classes, six exit-2 rejections, zero tool listings emitted; single shared post-selection code path (`assets.ts:88-108`) makes divergence structurally impossible                                                        |
| RF2 — check environment restoration and temp-directory cleanup on failures                           | covered | `package-coverage-consumers.test.mjs:50-57` (release on `before` failure), `:64` (`after(releaseIsolatedAssets)`), `:66-78` (guard asserting env-key presence/value and temp-root removal), `:80-91`; Probe 5 proves the guard is load-bearing (mutant exit 1) |
| RF3 — confirm the smoke proof exercises built CLI code and not only the unit-test injection seam     | covered | `package-coverage-consumers.test.mjs:101` imports `dist/fs/assets.js` via `importDist`; Probe 6 (shared root absent, still 3/3) and Probes 1-4 all drive `packages/cli/dist/index.js`                                                                          |

## References

- Source plan (the contract): `.oat/repo/reference/external-plans/2026-08-19-hermetic-cli-assets-root.md`
- Discovery: `discovery.md`; Plan: `plan.md`; Orchestration log: `orchestration-log.md`
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
