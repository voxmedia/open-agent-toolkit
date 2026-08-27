---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
oat_current_task_id: p01-t01
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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | N     | 0/N       |
| Phase 2 | pending     | N     | 0/N       |

**Total:** 0/{N} tasks completed

---

## Phase 01: hermetic-cli-assets-root (solo)

**Source plan (the contract):** `.oat/repo/reference/external-plans/2026-08-19-hermetic-cli-assets-root.md`
**Status:** implemented — awaiting phase review (round 1)

### Phase Summary (fill when phase is complete)

_Pending phase review._

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

### Run 1 — 2026-08-26 (in progress: p01 implemented, phase review pending)

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

| Phase | Worktree                                  | Implementer outcome                                             | Review outcome | Fix rounds | Merged |
| ----- | ----------------------------------------- | --------------------------------------------------------------- | -------------- | ---------- | ------ |
| p01   | integration checkout (`wave-3-execution`) | DONE (4019f98c; DoD 10/10 green; codex P2 fixed, round 2 clean) | pending        | 0          | n/a    |

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

**Review row `p01` → `fixes_added`; narrowed round 2 after the fix commit.**

## Implementation Log

Chronological log of implementation progress.

### 2026-08-26

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

### 2026-08-26

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

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
