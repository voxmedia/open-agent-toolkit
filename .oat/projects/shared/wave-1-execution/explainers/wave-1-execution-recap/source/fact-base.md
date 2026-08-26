# Fact base

## Confirmed claims

- **implementation:** ---
  oat_status: in_progress
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-08-26
  oat_current_task_id: null
  oat_generated: false

---

# Implementation: wave-1-execution

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

| Phase                                  | Status   | Tasks | Completed |
| -------------------------------------- | -------- | ----- | --------- |
| Phase 01 (bound-smoke-cleanup)         | complete | 1     | 1/1       |
| Phase 02 (detect-behind-main-versions) | complete | 1     | 1/1       |

**Total:** 3/3 tasks completed (p01-t01, p02-t01, review fix p01-t02)

## Autonomy Gate Provenance

- `IMPLEMENT-08` (subagent delegation): authorized once for this run for
  `oat-phase-implementer` and `oat-reviewer` within the plan's bounded phase
  and review scopes; native Claude Code Task dispatch (Tier 1). No file,
  command, credential, branch, or merge authority widened.
- `IMPLEMENT-03` / `IMPLEMENT-04` (checkpoints): `oat_plan_hill_phases: ['p02']`
  (final phase; `workflow.hillCheckpointDefault: final`) and
  `oat_auto_review_at_hill_checkpoints: true` were already explicit in
  `plan.md`; preserved unchanged.
- Dispatch policy preflight: `oat project dispatch-ceiling resolve --provider claude --preflight …`
  → `resolved`, managed / `high`, source `project-state`, value `opus`.

---

## Phase 01: bound-smoke-cleanup-signal-wait (group 1)

**Status:** complete (merged `c5c32345`)
**Started:** 2026-08-26

### Phase Summary

**Outcome (what changed):**

- The smoke cleanup SIGTERM regression harness can no longer wedge the suite: `runSignalCase` waits are bounded (60s), a missed SIGTERM triggers SIGKILL and a bounded reap (15s) before temp-dir cleanup, an unreapable child is detached without stalling the event loop, and every timeout fails loudly with the paused stage and captured stdout/stderr. Success assertion `{ code: 143, signal: null }` unchanged.

**Key files touched:**

- `tools/smoke/runner/cleanup.test.mjs` — bounded wait / force-kill / reap-or-detach helpers, injectable test seams, three new regression tests (+409/−5 across three append-only commits).

**Verification:**

- Run: `node --test tools/smoke/runner/cleanup.test.mjs` (19/19, 0 cancelled, ~13s); `pnpm test:smoke` (139/139); mutation battery I1-revert/E1/E2/E2b all red; full DoD 10/10.
- Result: pass; reviews rounds 1–3 → `passed` (see Review Received entries).

**Notes / Decisions:**

- Deadline constants raised 10s→60s / 5s→15s after one >10s outlier under CPU contention; reviewer attributed it to `run-smoke.mjs`'s bounded quiescence grace, not a production wedge (STOP #1 not indicated).

### Task p01-t01: Execute external plan — Bound smoke cleanup signal waits and preserve failure diagnostics

**Status:** completed
**Commit:** aedced645d2caa21b9fde5de5142822ddf025431 (+ fix commits 6a9ed1af959c70dc0f02b2472b590549e704b1c6, fd8c7cb9b7fa60c5b95fb0174d1a76c58814a698)

**Source plan:** `.oat/repo/reference/external-plans/2026-08-19-bound-smoke-cleanup-signal-wait.md`

**Outcome:** `runSignalCase` waits are bounded (`waitForChildExit`, 60s), a missed SIGTERM triggers SIGKILL + bounded reap (`reapOrDetach`, 15s) before temp-dir cleanup, and timeouts fail with stage + captured stdout/stderr; `{ code: 143, signal: null }` preserved. Root re-ran `node --test tools/smoke/runner/cleanup.test.mjs`: 16/16 pass, 13.4s.

**Verification (implementer-reported, root spot-checked):** DoD 10/10 exit 0 (`pnpm test` 130s / 175s post-commit, no hang); `pnpm test:smoke` 136/136; codex review 0.149.1 three passes, 3 P2 fixed, 0 rejected.

**Notes:** one unexplained >10s `SIGTERM during drive` outlier under load (empty stdout/stderr) drove the deadline recalibration; flagged to the reviewer as a possible production-cleanup stall (plan out-of-scope; follow-up candidate).

---

## Phase 02: detect-behind-main-package-versions (group 1)

**Status:** complete (merged `872a06be`)
**Started:** 2026-08-26

### Phase Summary

**Outcome (what changed):**

- `pnpm release:check-versions` now also rejects any lockstep public-package version that is not strictly greater than the version on `origin/main` (numeric `major.minor.patch` comparator; malformed or missing evidence fails closed; the comparison never runs when no publishable roots changed). The merge-base lockstep rule is untouched and its errors are reported first, so one run names every required rebase/re-bump.

**Key files touched:**

- `tools/release/check-version-bumps.ts`, `tools/release/release-utils.ts` — current-main ref resolver, comparator, strict-greater errors.
- `packages/cli/src/release/check-version-bumps.test.ts`, `packages/cli/src/release/release-utils.test.ts` — overtaken-main regression (0.2.29 vs 0.2.30), higher/equal/lower/malformed/missing-ref/mixed-set/no-public-change cases.

**Verification:**

- Run: focused release suites (43 tests); full DoD; `pnpm release:check-versions` exit 0 on the integration branch after the 0.2.33 bump (exercises the new guard's green path).
- Result: pass; reviews rounds 1–2 → `passed`.

**Notes / Decisions:**

- Test files under `packages/cli/src/` trip the publishable-change guard, forcing the wave-level lockstep bump (Recovery Event p02-rec-001, root direction).

### Task p02-t01: Execute external plan — Reject publishable package versions overtaken by current main

**Status:** completed
**Commit:** c8fdefc3884095bc1be40daf9eecc52f502e7ee9 (+ fix commit b486beb60d83a5b0d1f46cc3881627da93acb354)

**Source plan:** `.oat/repo/reference/external-plans/2026-08-19-detect-behind-main-package-versions.md`

**Outcome:** `release:check-versions` additionally rejects any lockstep version not strictly greater than `origin/main` (numeric `major.minor.patch` comparator; fail-closed missing ref/manifest; never runs without changed publishable roots); merge-base rule untouched and reported first. Root re-ran the focused suites: pass.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-08-26 (complete: 2 phases passed, 0 failed, 0 stopped)

- Branch: `wave-1-execution`; Tier 1 (native `oat-phase-implementer` /
  `oat-reviewer` via Claude Code Task); dispatch policy managed / `high`
  (Claude `opus`, enforced — Task model arg); schedule `[p01, p02]` (one
  parallel worktree group, ceiling 3).
- Phase recovery policy: default limit 10 (no overrides); usage ledger in
  `state.md`.

#### Dispatch records (generic record + lifecycle extension)

- `w1-p01-impl-001` — caller `oat-project-implement`; scope `p01`; action
  implementation; role `oat-phase-implementer` (class worker); provider claude;
  dispatch_context root-native (Claude Code Task tool); catalog: Task-tool
  model enum {sonnet, opus, haiku, fable} observed 2026-08-26 before
  selection; role_selector `oat-phase-implementer`; model_selector `opus`
  (tier-alias); effort not-exposed on the native surface (`effort_axis=not-applicable`);
  selection_source native-default; selection_reason native-catalog;
  candidates_considered [opus]; task_class default-implementation
  (classification_source caller: two-file signal-harness change with an
  explicit external plan; dispersed-context reconciliation, not novel
  architecture); floor satisfied; authority write within the p01 worktree
  and the source plan's scope; retry_limit 0 (phase recovery contract owns
  post-commit repair); guidance `subagent-orchestration/references/provider-claude.md`
  2026-07-25 (fresh). Stamp:
  `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- `w1-p02-impl-001` — identical axes for scope `p02` (task_class
  default-implementation: release-gate extension with existing DI seams and
  an explicit external plan). Stamp:
  `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- Dispatch policy enforcement log (both): `Dispatch policy: high; selected=opus; cap=opus (claude, enforced — Task model arg)`.
- Launch acceptance (2026-08-26): `w1-p01-impl-001` and `w1-p02-impl-001` accepted by the Claude Code Task tool (native, `subagent_type: oat-phase-implementer`, `model: opus`), dispatch mode background/awaited; worktrees bootstrapped at `4b44635fec13b2083da8cf98d06ea284328b92a7` via `bootstrap-group.sh wave-1` (both `status=success`, `view-parity=ok`, `sync_commit: skip`, `git_clean=pass`). child_outcome: pending.

#### Phase Outcomes

| Phase | Worktree                | Implementer outcome                                                                                          | Review outcome                         | Fix rounds | Merged     |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ---------- | ---------- |
| p01   | `.worktrees/wave-1/p01` | DONE_WITH_CONCERNS (aedced64 + fixes 6a9ed1af, fd8c7cb9; DoD 10/10 green)                                    | passed (round 3: 0C/0I/0M/2m deferred) | 2          | `c5c32345` |
| p02   | `.worktrees/wave-1/p02` | DONE_WITH_CONCERNS (c8fdefc3 + fix b486beb6; focused pass; release gates red pending wave-level 0.2.33 bump) | passed (round 2: 0C/0I/0M/1m deferred) | 1          | `872a06be` |

### Review Received: p02 (round 1)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p02-review-2026-08-26T133911Z.md (reviewed head `c8fdefc3884095bc1be40daf9eecc52f502e7ee9`, invocation auto, dispatch `w1-p02-review-001`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 3. Reviewer-designed adversarial probes P1–P10 ran (2187-case weaker-anywhere differential: `weaker=0 lostErrorText=0`; STOP condition re-proven; mixed-set attribution correct).

**Dispositions (auto mode — convert by default; bounded fix round via the original implementer handle, one append-only commit):**

- M1 — missing-ref fail-closed branch unreachable through production resolvers (`check-version-bumps.ts:150`): **convert, option (a)** — document the shadowing at the `currentMainRef === null` branch and the `!mergeBase` skip (CI safety depends on `fetch-depth: 0`). Option (b) is rejected for this round because it trades against the source plan's third STOP condition; recorded as a follow-up candidate for the plan owner.
- m1 — `CurrentMainVersionState` not exported / helper lacks a direct test (`check-version-bumps.ts:47,67`): **convert** — export the type and add a table-driven direct test for the three branches.
- m2 — `parseStableVersion` trims whitespace, widening "exactly numeric" (`release-utils.ts:139`): **convert** — drop `.trim()` and update the pinned expectation to match the plan's wording.
- m3 — no pinned mixed-set test (`check-version-bumps.test.ts:90`): **convert** — pin the four-bumped/one-behind case asserting exactly one strict-greater error naming the lagging package.

**Pre-dispositioned condition (not a finding):** release gates red until the wave-level 0.2.33 lockstep bump; reviewer probe P1 verified the redness is version state, not code.

**Fix round 1 (`w1-p02-fix-001`, continuation of `w1-p02-impl-001` through the original handle):** DONE — append-only commit `b486beb60d83a5b0d1f46cc3881627da93acb354` (parent `c8fdefc3` immutable); M1 option (a) comments at both sites, m1 type exported + 8 direct tests, m2 `.trim()` dropped + pinned rejection, m3 mixed-set test (3 errors, one strict-greater naming `docs-theme`). Focused 43/43; check/type-check/build/skill-bumps/build:docs/lint/format exit 0; `pnpm test` one 5s timeout flake in an unrelated test, green on the contract's single no-edit rerun (no attempt consumed); release gates expected-red (pre-dispositioned). Root verified range `c8fdefc3..b486beb6` touches only the four in-scope files. Row `p02` → `fixes_completed`.

### Review Received: p02 (round 2, narrowed)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p02-review-2026-08-26T135641Z.md (reviewed head `b486beb60d83a5b0d1f46cc3881627da93acb354`, range `c8fdefc3..b486beb6`, prior artifact round 1 / head `c8fdefc3`, invocation auto, dispatch `w1-p02-review-002`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 1. Disposition Verification: M1, m1, m2, m3 all **verified fixed** with file:line evidence; range touches only the four in-scope files; `b486beb6~1 == c8fdefc3`; focused suite 273 files / 3672 tests; oxfmt/oxlint clean; reviewer probes A–G (incl. two-lagging-package attribution) pass.

**Verification record (fix dispositions):** what — the four round-1 fixes; how — independent round-2 reviewer re-read the diff, re-ran the focused suites, and probed the changed logic; where — the round-2 artifact's `## Disposition Verification` table.

**Deferred Findings (Minor):**

- p02-r2-m1 — malformed-version diagnostic interpolates raw whitespace (`tools/release/check-version-bumps.ts:85`): a manifest `version` containing surrounding whitespace/newline (now correctly rejected by the m2 fix) renders with doubled spaces or a line break inside the one-line error. Rationale for deferral: input is pathological, the gate still fails closed and names the package, the reviewer marked it explicitly optional, and another fix + re-review cycle is disproportionate before fan-in. Follow-up trigger: address at final review if any other release-tooling change lands in this wave; otherwise carry into the W2 release-tooling touch (JSON-quote the interpolated values).

**Review row `p02` → `passed`.**

### Review Received: p01 (round 1)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p01-review-2026-08-26T140159Z.md (reviewed head `aedced645d2caa21b9fde5de5142822ddf025431`, invocation auto, dispatch `w1-p01-review-001`, model opus)

**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 2. Reviewer probes A–F ran (listener/timer cleanup verified clean on every path; real ignored-SIGTERM child fails in ~4s with stage + reap detail; two mutation probes E1/E2 show the timeout branch and reap-before-`rm` ordering have no regression coverage). STOP condition #1 (wedge in production cleanup) assessed **not indicated**: `run-smoke.mjs` `waitForQuiescence` bounds cancellation (`abortGracePeriodMs = 5_000`), which plausibly explains the >10s outlier.

**Dispositions (auto mode — convert; bounded fix round via the original implementer handle, one append-only commit):**

- I1 — post-detach bounded reap can never settle (`cleanup.test.mjs:892`; root cause `:700` unref'd timer + `:711–718` `child.unref()`): **convert** — after `reapOrDetach` detaches, the `finally` must not await a second unbounded-by-handles wait; ensure the "SIGKILL did not reap it within …ms" diagnostic surfaces via `assert.fail` and that both `rm` calls still run (reviewer probes C1/C2/D reproduced the lost diagnostic, cancelled sibling tests, and leaked temp dirs).
- M1 — no regression coverage for `runSignalCase`'s timeout branch / reap-before-`rm` ordering; comment at `:941–943` over-claims: **convert, option (2)** — make the two deadlines (and a SIGTERM-ignoring wrapper switch) injectable into `runSignalCase` and add one real-path case with a ~300ms deadline asserting the rejection message and that both temp directories are gone.
- m1 — detach path destroys stdio before the diagnostic reads it (`:713–714` vs comment `:726–729`): **convert** — sample captured buffers before `reapOrDetach` and append late output, or move `destroy()` after the diagnostic; narrow the comment.
- m2 — sizing comment omits the >10s outlier that drove 60s (`:655–660`): **convert** — record the outlier and reword the multiplier.

**Fix round 1 (`w1-p01-fix-001`, continuation of `w1-p01-impl-001` through the original handle):** DONE — append-only commit `6a9ed1af959c70dc0f02b2472b590549e704b1c6` (parent `aedced64` immutable; +246/−33, one file). I1 via `detachChild` + `WeakSet` short-circuit in `reapOrDetach` (unref'd timer kept per plan step 1); M1 via injectable seams on `runSignalCase` + two real-path tests (mutations E1/E2 now red, I1 revert → cancelled tests); m1 buffers sampled at deadline and after reap (`mergeCapture`); m2 comment records the outlier. Leak check 0 dirs / 0 children. `node --test` 19/19 in 15s (`cancelledByParent=0`); `pnpm test:smoke` 139/139; full DoD 10/10 exit 0 (`pnpm test` 134s). Codex fix-diff pass: 1×P2 (timing bound) fixed. Root verified range and re-ran the focused suite. Row `p01` → `fixes_completed`.

### Review Received: p01 (round 2, narrowed)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p01-review-2026-08-26T143550Z.md (reviewed head `6a9ed1af959c70dc0f02b2472b590549e704b1c6`, range `aedced64..6a9ed1af`, prior round 1 / head `aedced64`, invocation auto, dispatch `w1-p01-review-002`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 3. Disposition Verification: I1 **verified fixed** (short-circuit revert → 3 cancelled), m1/m2/Codex-P2 verified fixed, seam defaults verified to reproduce pre-fix behavior, stage-case assertions byte-identical, out-of-scope guards verified; M1 **partially fixed** (deletion of the pre-cleanup reap is caught, reordering after `rm` is not — probe E2b green).

**Verification record (round-1 fix dispositions):** what — I1, M1, m1, m2 + Codex P2; how — independent round-2 reviewer re-ran mutations I1-revert/E1/E2 on scratch copies plus new probes P1/P4/P5 and a leak sweep; where — round-2 artifact `## Disposition Verification` and `## Adversarial Probes`.

**Dispositions (auto mode — convert; second and final bounded fix round via the original handle, one append-only commit):**

- M1-r2 — reap-before-`rm` ordering unguarded against reorder (`cleanup.test.mjs:990`, assertion `:1188–1192`): **convert** — inside the detach test's `reapBeforeCleanup` seam, assert both directories still exist before delegating to the real `reapOrDetach` (reviewer's fix); mutation E2b must go red.
- m1-r2 — `reapSummary` attributes an unsent SIGKILL when the child exits between deadline and kill (`:796–804`): **convert** — capture `forced` before the kill and add a third summary branch.
- m2-r2 — detached short-circuit hard-codes `timedOut: true` (`:749–756`): **convert** — derive from recorded status.
- m3-r2 — pre-reap sample comment over-claims (`:780–783`): **convert** — narrow the comment to the actual contract.

**Cycle accounting:** this is review cycle 2 of the 3-cycle governance cap for scope p01; round 3 is the last permitted cycle, so the round-3 disposition passes on 0C/0I and defers any residual Medium/Minor with rationale rather than opening a fourth cycle.

**Fix round 2 (`w1-p01-fix-002`):** DONE — append-only commit `fd8c7cb9b7fa60c5b95fb0174d1a76c58814a698` (parent `6a9ed1af` immutable; +16/−9, one file). M1-r2 existence assertions inside the `reapBeforeCleanup` seam (E2b reorder mutation now red; E1/E2/I1-revert still red); m1-r2 `forced` flag + third `reapSummary` branch (P1-shaped probe: no `SIGKILL` in message); m2-r2 `timedOut` derived from status; m3-r2 comment narrowed. `node --test` 19/19 in 12s (0 cancelled); `pnpm test:smoke` 139/139; full DoD 10/10 exit 0 (`pnpm test` 130s); codex fix-diff pass: zero findings. Root verified range and parent. Row `p01` → `fixes_completed`.

### Review Received: p01 (round 3, narrowed — final cycle)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p01-review-2026-08-26T150044Z.md (reviewed head `fd8c7cb9b7fa60c5b95fb0174d1a76c58814a698`, range `6a9ed1af..fd8c7cb9`, prior round 2 / head `6a9ed1af`, invocation auto, dispatch `w1-p01-review-003`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 2. Disposition Verification: M1-r2, m1-r2, m2-r2, m3-r2 all **verified fixed**; mutation battery E2b/E2/E1/I1-revert all red, fidelity control 19/19; P1-shaped probe names self-exit with no `SIGKILL`; `node --test` 19/19 / 0 cancelled / 13.2s; `pnpm test:smoke` 139/139; oxlint/oxfmt clean; one file +16/−9; parent immutable; leak sweep clean.

**Verification record (round-2 fix dispositions):** what — M1-r2, m1-r2, m2-r2, m3-r2; how — independent round-3 reviewer re-ran the full mutation battery and the P1 probe on scratch copies; where — round-3 artifact `## Disposition Verification` / `## Adversarial Probes`.

**Deferred Findings (Minor):**

- p01-r3-m1 — the round-2 minor fixes (`forced` / third `reapSummary` branch; `timedOut` derivation) have no regression coverage (reverting either leaves 19/19 green). Rationale: diagnostics-wording branches on the harness's last-resort path, already verified by reviewer probes across two rounds; this is the final permitted cycle for the scope and adding tests would open a fourth cycle. Follow-up trigger: next touch of `tools/smoke/runner/cleanup.test.mjs`.
- p01-r3-m2 — `forced` cannot distinguish a dead-but-unreaped (zombie) child, so a zombie is still reported as "SIGKILL reaped it". Rationale: containment unaffected (the child is reaped either way); wording-only on a rare path; reviewer supplied a reap-result-based fix for the same follow-up.

**Cross-model record discrepancy (recorded, not a finding):** the implementer's `codex review --uncommitted` pass on the round-2 fix diff reported zero findings; the round-3 reviewer's independent `codex review --commit fd8c7cb9` (same codex-cli 0.149.1) returned one P2, which the reviewer rejected with measured evidence (its premise — `kill()` false with `forced` true — is unreachable). Different invocations over the same diff; both records retained.

**Review row `p01` → `passed`.**

#### Group 1 fan-in (2026-08-26)

- Merges (serialized, `git merge --no-ff`, branch-guarded, no rebase — phase branches touched only code and the integration branch only `.oat/projects/`, so reviewed SHAs are preserved): p01 → `c5c32345`; p02 → `872a06be`. Config-integrity check: `.oat/config.json` keys present.
- Root-owned lockstep bump per Recovery Event p02-rec-001 direction: `4fa530e6 chore(release): bump public packages to 0.2.33 (wave 1 lockstep)` (five manifests + regenerated `packages/cli/assets/public-package-versions.json`).
- Integration DoD at `4fa530e6` (exit codes captured explicitly): check 0 (6s) · type-check 0 (1s) · test 0 (173s; 273 files / 3672 vitest + 39 node:test, no smoke hang) · build 0 (2s) · check:skill-bumps 0 (2s) · release:check-versions 0 (1s) · release:validate 0 (28s) · build:docs 0 (2s) · lint 0 (2s) · format 0 (4s). The gate runner was stopped externally after gate 6; gates 7–10 were re-run to completion before any bookkeeping edit.
- Worktrees `.worktrees/wave-1/p01`, `.worktrees/wave-1/p02` removed and branches `wave-1/p01`, `wave-1/p02` deleted after merge (merged history retained on the integration branch).

#### Outstanding Items

- None (the lockstep-bump item is closed by `4fa530e6`).

#### Recovery Event p02-rec-001 (validated by root)

- Phase/task: p02 / p02-t01
- Original request: w1-p02-impl-001
- Original commit: c8fdefc3884095bc1be40daf9eecc52f502e7ee9
- Defect class: other
- Discovered by: `pnpm release:check-versions` (post-commit phase verification); corroborated by `pnpm release:validate` and by the cross-model review (codex-cli 0.149.1, P1)
- Disposition: direction-required
- Authorization: operator-scope (root decision 2026-08-26)
- Attempt: 0/10 (no reservation, no edit, `pending_attempt: null`, usage unchanged — validated)
- Dispatch target: opus
- Recovery commit: -
- Verification: focused release suites pass; `release:check-versions` exit 1 / `release:validate` exit 1; other six DoD gates exit 0 — root re-ran `pnpm release:check-versions` in the p02 worktree and reproduced the six errors (1 merge-base lockstep + 5 strict-greater)
- Reason: `packages/cli` `versionPolicyIgnorePatterns` is `['assets/**']` (`public-package-contract.ts:119`), so the plan-mandated test files under `packages/cli/src/release/` make `packages/cli` a changed publishable root; the repository guardrail (AGENTS.md "Publishable package guardrail") then requires all five lockstep versions to move. Bumping is barred inside the phase (plan scope; would collide with p01 at merge) and exempting test paths would be a policy change outside the plan.
- **Root direction:** perform ONE wave-level lockstep bump `0.2.32 → 0.2.33` of `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms` on `wave-1-execution` after both group merges and before the integration DoD gates (commit `chore(release): bump public packages to 0.2.33 (wave 1 lockstep)`). This is repository-mandated release bookkeeping, not a change to either source plan's requirements; p02's new guard then exercises its green path (`0.2.33 > 0.2.32` on `origin/main`). The p02 task commit stays immutable.

<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-08-26

- Plan gate passed (gate run `78a49137-a275-4bd3-8135-e5f27d757e24`,
  `cursor-gpt-5-6-sol-xhigh`, 0 findings) after two launch failures caused by
  a Cursor usage limit (see `references/plan-gate-launch-failures-2026-08-26.md`).
- Group 1 bootstrap + dispatch of p01/p02 implementers; p01 reviews rounds 1–3 (fix rounds 2), p02 reviews rounds 1–2 (fix round 1); fan-in merges `c5c32345`, `872a06be`; lockstep bump `4fa530e6`; integration DoD 10/10 green.

## Done-criteria confirmation (per source plan)

Lifted from the final review round 1 Requirements Coverage tables
(`reviews/archived/final-review-2026-08-26T152343Z.md`). Every criterion was
reviewer-verified in code at `848beb88`. Line references in the Notes column are as of that head and shift with later edits (`196dae19` added six lines inside the generated wrapper); four p01 pointers the round-1 reviewer cited (`:1266`, `:1275`, `:1281`, `:1298`) never resolved against the 1,212-line file and have been replaced with test-title anchors. Treat remaining numbers as verify-against-HEAD hints, not durable anchors.

### Plan `2026-08-19-bound-smoke-cleanup-signal-wait` (p01)

| Done criterion                                                                                 | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No child-exit await in `runSignalCase` is unbounded                                            | implemented | Every await is bounded: `waitForFile` 10 s (`cleanup.test.mjs:638`), `waitForChildExit(child, exitTimeoutMs)` 60 s (`:956`), post-kill `reapOrDetach` 15 s (`:805`), pre-cleanup `reapBeforeCleanup(child, reapTimeoutMs)` (`:993`). The former unbounded one-shot `exit` promise is gone.                                                                              |
| A missed/ignored SIGTERM triggers SIGKILL, reaping, and a diagnostic failure instead of a hang | implemented | `forceKillAfterTimeout` (`:793-822`) kills, reaps through a second bounded wait, and returns a message the caller raises via `assert.fail` (`:967`). Proven by the real-path regression at the real-path force-kill regression ("runSignalCase force-kills…") and independently by my PROBE C on both stages concurrently.                                              |
| Normal provision and drive cases retain their cleanup assertions                               | implemented | `:970-982` unchanged: guard file, user config, `git status`, `assertNoSmokeGitResources`, empty runs directory. The success assertion is still exactly `{ code: 143, signal: null }` (`:970-974`) — the timeout is a diagnostic boundary, not a new accepted result.                                                                                                    |
| `node --test tools/smoke/runner/cleanup.test.mjs` exits zero                                   | implemented | Re-run at HEAD: exit 0, 19 pass / 0 fail / 0 cancelled, 12.76 s — far inside the 60 s per-case deadline.                                                                                                                                                                                                                                                                |
| `pnpm lint`, `pnpm format`, `pnpm test:smoke` exit zero                                        | implemented | Re-run at HEAD: lint 0, format 0, `pnpm test:smoke` 0 with 139 pass / 0 fail / 0 cancelled in 26.6 s.                                                                                                                                                                                                                                                                   |
| `git status --short` contains no unexplained or out-of-scope files                             | implemented | Empty at HEAD, including `--untracked-files=all`.                                                                                                                                                                                                                                                                                                                       |
| Review focus: listener/timer cleanup and the already-exited race                               | verified    | Single-owner `settle` clears the timer and removes the listener on both paths (`:697-710`); the timer is `unref`'d (`:709`); already-exited children resolve from `exitCode`/`signalCode` without subscribing (`:681-687`). Directly probed — PROBE A found zero listener residue across both branches.                                                                 |
| Review focus: forced termination is followed by a reap before filesystem cleanup               | verified    | `reapBeforeCleanup` runs before both `rm` calls (`:993-995`), and the regression at the ordering assertion inside the detach regression's `reapBeforeCleanup` seam asserts that ordering from inside the injected reap by checking both directories still exist. The detach short-circuit (`:768-775`) is what keeps that path reachable rather than draining the loop. |
| Review focus: the timeout path fails loudly with stage and captured output                     | verified    | Message includes deadline, `pauseStage`, reap outcome, stdout and stderr (`:816-819`); output is sampled before and merged after the reap (`:801`, `:808-809`) so writes during the kill still reach the diagnostic. Asserted at `:1077-1080` and by the message regexes at the detach regression ("a detached child still reports…") and the real-path regressions.    |

### Plan `2026-08-19-detect-behind-main-package-versions` (p02)

| Done criterion                                                                                 | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The existing command retains merge-base lockstep enforcement                                   | implemented | `findLockstepVersionBumpErrors` still runs first and is spread into the errors (`check-version-bumps.ts:152`). Proven live by PROBE P02-A's `0.2.32` case, where the merge-base error is error #1 of 6.                                                                                                                                                                                                                                                                                                                                   |
| Changed publishable work fails when any current version is equal to or lower than current main | implemented | `findVersionsBehindCurrentMainErrors` fails on `comparison <= 0` (`:90-94`) across all five contracts. Covered by the equal case (`check-version-bumps.test.ts:161`), the lower/overtaken case (`:109`), and the mixed-set case (`:280`); confirmed live by P02-A.                                                                                                                                                                                                                                                                        |
| The `0.2.29` branch vs `0.2.30` main regression is red in tests                                | implemented | `check-version-bumps.test.ts:109-134` builds exactly that shape and additionally asserts `mergeBaseOnlyErrors` is `[]`, proving the old rule alone would have passed — the regression is demonstrated, not merely asserted.                                                                                                                                                                                                                                                                                                               |
| A strictly higher lockstep version is green, and no-public-change work retains its skip        | implemented | Green case at `:136`; the no-change skip at `:59` now also counts resolver calls and main reads and asserts both are 0, so the skip is proven to bypass the new guard entirely rather than merely to pass.                                                                                                                                                                                                                                                                                                                                |
| Missing refs or malformed versions fail with actionable diagnostics                            | implemented | Missing ref → single fail-closed error naming the remedy (`check-version-bumps.ts:162-164`, test `:232`); missing main version → per-package error (`:74-79`, test `:207`); malformed → per-package error (`:83-88`, tests `:182` and the `findVersionsBehindCurrentMainErrors` table `:342`). Comparator rejects prereleases, build metadata, `v` prefixes, partials, extra segments, leading zeroes, whitespace, and unsafe integers (`release-utils.ts:113-144`, `release-utils.test.ts:107-138`) rather than mapping them to `0.0.0`. |
| CI uses the extended existing gate without registry credentials                                | implemented | `.github/workflows/ci.yml` is unchanged in this range (0 files): `fetch-depth: 0` at line 20 and `pnpm release:check-versions` at line 46 already existed. The new code adds only `git rev-parse --verify --quiet` and `git show` — no network, no npm, no new step, no second competing gate.                                                                                                                                                                                                                                            |
| `git status --short` contains no unexplained or out-of-scope files                             | implemented | Empty at HEAD.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Review focus: compares with the current main tip, not its merge base                           | verified    | `resolveCurrentMainRef` returns the ref itself (`release-utils.ts:97-107`), separate from `resolveMergeBase`. The distinction is proven by the overtaken test, where merge base is `0.2.28` and main is `0.2.30` and only the tip comparison fails.                                                                                                                                                                                                                                                                                       |
| Review focus: missing evidence fails closed only when publishable work changed                 | verified    | The current-main block sits after the `changedWorkspaceDirs.size === 0` return (`:127-133` then `:153`), so it is unreachable for docs-only work; asserted by the call counters in the skip test.                                                                                                                                                                                                                                                                                                                                         |
| Review focus: new errors compose with the existing report and name all affected packages       | verified    | `check-version-bumps.test.ts:186` asserts merge-base and current-main failures in one run in order; `:280` asserts a mixed set surfaces all three error classes together. P02-A's six-error output confirms it end to end.                                                                                                                                                                                                                                                                                                                |

### Review Received: final (round 1)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/final-review-2026-08-26T152343Z.md (reviewed head `848beb889a59b25497e9740f1716673f70fa69cd`, range `bf7aff9c..848beb88`, invocation auto, dispatch `w1-final-review-001`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 3. No code defect; all ten DoD gates re-run green at HEAD; both plans' Done criteria and Review focus verified in code; adversarial probes on both lanes (release-gate override 0.2.32 → 6 errors / 0.2.34 → pass; smoke deadline-boundary sweep with listener-leak assertions and concurrent `runSignalCase` runs); leak sweep clean.

**Deferred Findings Re-evaluation (final scope):** p02-r2-m1, p01-r3-m1, p01-r3-m2 — each re-verified by the final reviewer and **remains deferred** (rationale unchanged; carried to the follow-up ledger in the wave summary).

**Dispositions:**

- M1 — program ledger W1 row stale ("blocked at the plan gate"): **artifact_alignment_required, resolved in artifact** (execution-program ledger row updated in commit `5d452ca7`).
- m1 — `plan.md` Implementation Complete checklist unchecked: **resolved in artifact** (`5d452ca7`; item 4's `summary.md` roll-up completes at the summary step).
- m2 — no per-criterion Done-criteria record: **resolved in artifact** (this section).
- m3 — fixture installs the SIGTERM-ignore handler after the sentinel (real flake risk for the two real-path regressions): **convert → task p01-t02** (bounded fix on the integration branch, fresh same-target implementer; worktrees were already removed), then a narrowed final re-review.

**Fix task p01-t02 (`w1-p01-fix-003`, fresh same-target implementer on the integration branch):** DONE — commit `196dae19f83568e56b42dc40a413409b29ead12a` (parent `885408dd`; +9/−3 inside the generated `ignoreSigterm` wrapper: handler installed at module scope before any sentinel write). `node --test` 19/19 (0 cancelled, 12–13s); 5× determinism loop 30/30; `pnpm test:smoke` 139/139; lint/format 0; codex `--uncommitted` 0 findings; leak sweep clean. Note: the deferred minors p01-r3-m1/m2 name "next touch of `cleanup.test.mjs`" as their trigger — the root keeps them deferred (minimal-diff final cycle) and carries the trigger note into the wave summary follow-ups. Review row `final` → `fixes_completed`.

### Review Received: final (round 2, narrowed)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/final-review-2026-08-26T154241Z.md (reviewed head `58a5aa0919428928152ffcbaf292b2973b18a65d`, range `848beb88..58a5aa09`, prior round 1 / head `848beb88`, invocation auto, dispatch `w1-final-review-002`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 4 (all closeout-artifact accuracy). Disposition Verification: M1, m1, m2, m3 (round 1) all **verified resolved**; `196dae19` verified exactly as specified; reviewer probe: with a 300ms stall between sentinel write and handler install the pre-fix ordering lost the race 5/5 and the post-fix ordering survived 5/5; `node --test` 19/19 (0 cancelled), 3× loop green, lint/format 0, leak sweep clean.

**Verification record (round-1 fix dispositions):** what — M1/m1/m2 artifact edits and the m3 code fix; how — independent round-2 reviewer re-read the artifacts and diff, re-ran the smoke suite, and ran the stall probe; where — round-2 artifact `## Disposition Verification` / `## Adversarial Probes`.

**Dispositions (all resolved in artifact by the root, this commit):**

- r2-m1 malformed Done-criteria table → rebuilt as two clean tables (this section).
- r2-m2 stale evidence pointers → header note fixes the reference head and the +6-line shift; pointers kept as verify-against-HEAD hints.
- r2-m3 `plan.md` item 4 over-claimed the `summary.md` roll-up → qualifier added (roll-up happens at the summary step).
- r2-m4 `plan.md` item 5 cited pre-`196dae19` DoD evidence → full DoD re-run at the final head recorded below and the item updated.

**Review row `final` (auto lineage) → `passed`.**

### Review Received: final (configured exit gate, judgment sweep)

**Date:** 2026-08-26
**Gate:** `workflow.gates.skills.oat-project-implement` run `b20f4349-bed3-42be-b800-4670a54c86ca`, target `claude-fable-skip-permissions` (configured; `--avoid none`; achieved diversity: same family as the `opus` implementers, distinct model — recorded, not claimed as cross-family), envelope `ok / review_completed_gate_passed`, threshold important, receiveEligible true, corroboration run/project/invocation matched. Receipt: session scratchpad `w1-exit-gate-20260826T155104Z.receipt.json`.
**Review artifact:** reviews/archived/final-review-2026-08-26T160106Z.md (reviewed head `cab5ffd3c9eeba12ba535855ab41590ed43d3a38`, invocation gate, initial gate lineage → full range `bf7aff9c..cab5ffd3`, 24 paths / 44 commits)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 2. Reviewer re-executed the gates (all exit 0 except one `pnpm test` run that failed in the pre-existing deterministic smoke tier on a shared-git worktree collision and passed 139/139 on isolated rerun; the root's full `pnpm test` runs at 4fa530e6 and 7f78dab7 were green) and ran a live DI probe on the release gate (0.2.32 → failed/6, 0.2.31 → failed/5, 0.2.34 → passed, 0.2.33-rc.1 → failed/5).

**Judgment-sweep dispositions:**

- gate-m1 — four Done-criteria pointers past EOF + misleading header note: **addressed now** (this commit; test-title anchors, note reworded).
- gate-m2 — DoD docs (`apps/oat-docs/docs/contributing/code.md:53`, `AGENTS.md` step 6) do not describe the new strictly-above-`origin/main` rule and its fetch-first local precondition: **address at the `document` pre-approval step** (the next lifecycle step; docs edits count as shipped and are covered by the 0.2.33 bump). Not a deferral.
- Deferred ledger: p02-r2-m1, p01-r3-m1, p01-r3-m2 remain deferred (reviewer concurs); the fired trigger on p01-r3-m1/m2 is carried into the wave summary follow-ups.
- Operator note (not a finding): the reviewer's failed smoke run leaked `smoke-automated-2026-08-26T15-54-29…` worktrees/branches into the shared git dir; the root removed those run-scoped worktrees and branches (the 2026-07-29 leftover predates this program and was left untouched).

**Verification record (gate dispositions):** what — gate-m1 artifact repair; how — root edit against the reviewer's cited anchors; where — this section and `## Done-criteria confirmation`.

**Gate row `final` (gate lineage) → `passed` (commit `8f2e73c7`); `oat_implement_exit_gate` → `allowed / passed` (commit `2d862cce`).**

### Task p01-t02: (review) Hoist the SIGTERM-ignore handler in the regression fixture

**Status:** completed
**Commit:** 196dae19f83568e56b42dc40a413409b29ead12a

**Outcome:** the SIGTERM-ignoring regression fixture is deterministic — the ignore handler is installed before the sentinel the parent waits on.

**Files changed:** `tools/smoke/runner/cleanup.test.mjs` — generated wrapper source only.

**Verification:** Run: `node --test tools/smoke/runner/cleanup.test.mjs`; `pnpm test:smoke`; `pnpm lint`; `pnpm format` — Result: all exit 0.

## Final DoD (Step 12) at the final head

Head `7f78dab719bcc64c471412c341dd20f09e25b997` (after `196dae19` and the final-review bookkeeping), exit codes captured per gate: check 0 (1s) · type-check 0 (1s) · test 0 (144s; 273 files / 3672 vitest + 39/39 node:test, 0 cancelled) · build 0 (1s) · check:skill-bumps 0 (3s) · release:check-versions 0 (0s) · release:validate 0 (24s) · build:docs 0 (2s) · lint 0 (1s) · format 0 (4s). Logs: session scratchpad `w1-final-*.log`.

## Deviations from Plan / Design

| Task / Review | Source Artifact                                | Planned / Documented                                       | Actual / Accepted                                                  | Reason                                                                                                                                                  | Source of Truth                     | Follow-up                                                                            |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| p02-t01       | discovery.md Constraints / plan.md Parallelism | "no lockstep public-package bump is expected in this wave" | Wave-level lockstep bump 0.2.32 → 0.2.33 on the integration branch | Test files under `packages/cli/src/` trip the publishable-change guard (`versionPolicyIgnorePatterns: ['assets/**']`); repo guardrail mandates the bump | Implementation (integration branch) | Note for W2–W4: their version baseline is whatever `origin/main` holds at wave start |

## Test Results

| Phase | Tests Run                                                                                         | Passed | Failed | Coverage        |
| ----- | ------------------------------------------------------------------------------------------------- | ------ | ------ | --------------- |
| p01   | `node --test tools/smoke/runner/cleanup.test.mjs` (19); `pnpm test:smoke` (139); full `pnpm test` | all    | 0      | n/a (node:test) |
| p02   | focused release suites (43); full `pnpm test` (273 files / 3672)                                  | all    | 0      | n/a             |

## Final Summary (for PR/docs)

**What shipped:**

- Bounded smoke cleanup SIGTERM harness: a child that ignores SIGTERM is force-killed, reaped (or detached without stalling the event loop), and reported with its paused stage and captured stdout/stderr instead of hanging `pnpm test` indefinitely (`tools/smoke/runner/cleanup.test.mjs`).
- Release integrity guard: `pnpm release:check-versions` rejects publishable changes whose lockstep versions are not strictly greater than current `origin/main` (the "branch overtaken by a main release" hole), composing with the existing merge-base lockstep rule (`tools/release/*`, `packages/cli/src/release/*.test.ts`).
- Lockstep public-package bump 0.2.32 → 0.2.33 (repository guardrail; test files under `packages/cli/src/` count as publishable changes).

**Behavioral changes (user-facing):**

- CI fails a PR whose public package versions equal or trail `origin/main` (actionable per-package errors); test-suite behavior change is confined to the smoke regression harness.

**Key files / modules:**

- `tools/smoke/runner/cleanup.test.mjs` — bounded signal harness + regression tests.
- `tools/release/check-version-bumps.ts`, `tools/release/release-utils.ts` — current-main resolver, numeric comparator, strict-greater errors.
- `packages/cli/src/release/check-version-bumps.test.ts`, `packages/cli/src/release/release-utils.test.ts` — release guard regression suites.
- `packages/*/package.json`, `packages/cli/assets/public-package-versions.json` — 0.2.33.

**Verification performed:**

- Per lane: source-plan Verify gates and Done criteria, full DoD in each worktree, codex cross-model reviews (p01: 3 passes + 2 fix-diff passes; p02: 2 passes), independent opus reviews with reviewer-designed adversarial/mutation probes (p01 3 rounds, p02 2 rounds), all rows `passed`.
- Integration: full DoD (8 gates + lint + format) green at `4fa530e6`.

**Design deltas (if any):**

- Wave-level lockstep bump was not anticipated by discovery (see Deviations table); no source-plan requirement changed.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Orchestration log: `orchestration-log.md`
- **plan:** ---
  oat_status: complete
  oat_ready_for: oat-project-implement
  oat_blockers: []
  oat_last_updated: 2026-08-26
  oat_phase: plan
  oat_phase_status: complete
  oat_plan_hill_phases: ['p02'] # final phase only (workflow.hillCheckpointDefault=final); p01/p02 complete together as one group
  oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
  oat_plan_parallel_groups: [['p01', 'p02']] # write-disjoint per the 2026-08-26 drift refresh (tools/smoke vs tools/release + packages/cli/src/release)
  oat_plan_source: quick
  oat_import_reference: null
  oat_import_source_path: null
  oat_import_provider: null
  oat_generated: false
  oat_template: false

---

# Implementation Plan: wave-1-execution (Wave 1 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); this wave uses 2.

**Goal:** Execute the 2 Wave 1 external plans (bound smoke cleanup signal waits;
reject package versions overtaken by main) through the wave→project wrapper
pattern (DR-260713-wave-project-wrapper-over).

**Architecture:** Thin wrapper. Each task's **entire and only implementation
contract** is its external plan under `.oat/repo/reference/external-plans/`. Tasks
below carry wrapper-owned metadata exclusively: the source-plan path,
ordering/dependencies, wrapper-level verification gates, the commit convention, and
review mapping. Nothing in this file restates, narrows, or overrides a source plan.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` against current
   HEAD. A material mismatch (per that plan's own definition) is a STOP. The
   wave-boundary drift refresh (see record below) does not replace the in-worktree
   re-check — the integration tip advances as groups merge.
2. **Execute the source plan's `## Implementation steps`** in order with each
   step's embedded Verify gate; honor its `## STOP conditions` verbatim.
3. **Confirm the source plan's `## Done criteria`**, then run the full DoD gates
   in this order, capturing each exit code explicitly: `pnpm check`,
   `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`,
   `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`;
   plus `pnpm lint` and `pnpm format` (Wave 1 touches `tools/smoke`). Node
   22.17.0 and pnpm 10.13.1 are the repository toolchain; run
   `pnpm run worktree:init` once per fresh worktree before the gates.
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks
   the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling
   phases continue. **Bundle phases:** a STOP parks only the stopped task; the
   implementer records the blocker and continues remaining independent tasks; the
   phase is terminal when every task is completed or parked
   (DR-260713-bundle-stop-semantics-park).
5. **Group-dependency rule:** a group starts when every phase of the previous
   group is terminal — merged, or parked with completed commits merged. A park
   never blocks the next group.
6. **Merge serialization:** within a group, merge phase branches one at a time in
   plan order, rebasing each on the updated tip first. Deliberately sequenced
   shared files: none (the drift refresh found an empty write-surface
   intersection); merge order is p01 then p02 so the bounded signal harness is in
   place before the release-guard lane's integration test run.
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm format:fix` (or a file-scoped
   `pnpm exec oxfmt --write <file>`) on markdown it writes and reports
   observations for `orchestration-log.md` (workers report; the root appends).
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.

## Parallelism

Group 1 = `p01` + `p02` in separate worktrees at the same base. Rationale: the
two lanes have disjoint write surfaces (`tools/smoke/runner/cleanup.test.mjs`
vs `tools/release/*`, `packages/cli/src/release/*`, and conditionally
`.github/workflows/ci.yml` / `AGENTS.md`), neither changes shipped package
versions, and pairing them uses bounded parallel capacity without stacking
runtime product changes.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- p01 write surface: `tools/smoke/runner/cleanup.test.mjs` (only).
- p02 write surface: `tools/release/check-version-bumps.ts`,
  `tools/release/release-utils.ts`,
  `packages/cli/src/release/check-version-bumps.test.ts`,
  `packages/cli/src/release/release-utils.test.ts`; conditional per the plan:
  `.github/workflows/ci.yml`, `AGENTS.md`.
- Intersection: empty. Only p01 touches `tools/smoke`; neither touches
  `.agents/skills`, bundled assets, or public package manifests.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in both lanes: p01 is a signal/containment surface and
p02 is a release-safety (CI gate) surface._

## Drift Refresh Record (2026-08-26, vs `bf7aff9cbdbbd28d5709b93dbf0af2312cb0eb22`)

**2 PASS / 0 MINOR-DRIFT / 0 STOP.** This record is non-authoritative recon
evidence (one bounded read-only recon agent, Sonnet 5, native dispatch); each
lane re-runs its own drift check in its worktree.

- **p01 — bound smoke cleanup signal waits:** PASS. Drift-check diff empty
  (`6f443c08..HEAD` touched only `.oat/`). All four evidence bullets verified
  at their stated lines (`runSignalCase` at
  `tools/smoke/runner/cleanup.test.mjs:651`; spawn 737; sentinel wait 761;
  SIGTERM 762; unbounded exit await 763–765; `finally` SIGKILL 780–783; two
  call sites at 790/794). Drift-check coverage adequate (the scoped directory
  contains every module the test imports).
- **p02 — reject package versions overtaken by main:** PASS. Drift-check diff
  empty. All five evidence bullets verified (`runVersionBumpCheck` DI shape at
  `tools/release/check-version-bumps.ts:27–48`; `resolveMergeBase` at
  `tools/release/release-utils.ts:73`; CI `fetch-depth: 0` at
  `.github/workflows/ci.yml:20` under the checkout step at line 17;
  `pnpm release:check-versions` at line 46; all five public manifests at
  `0.2.32`). No semver/comparator helper exists anywhere in the repo.
  **Rule-1 addendum (coverage gap):** the plan's drift-check command omits two
  files its implementation reads and extends —
  `tools/release/validate-public-packages.ts` (hosts
  `findLockstepVersionBumpErrors`, the "existing lockstep errors" the plan
  appends to) and `packages/cli/src/release/public-package-contract.ts` (the
  five-package set). The in-worktree drift check for p02 MUST additionally run
  `git diff --stat 6f443c08..HEAD -- tools/release/validate-public-packages.ts packages/cli/src/release/public-package-contract.ts`
  and treat a change to either as a material mismatch to compare against the
  plan before editing.
  **Orchestrator reconciliation (non-narrowing):** the new strict-greater
  comparison belongs in `check-version-bumps.ts` / `release-utils.ts` exactly
  as the plan scopes it, with its errors appended to the result that already
  aggregates the merge-base lockstep errors; `release:validate`'s separate
  merge-base lockstep pass is intentionally left unchanged (the plan requires
  the extended `release:check-versions` gate to reject the overtaken case, and
  both commands run in CI, so a single failing gate is sufficient; "do not add
  a second competing gate" governs). Nothing the plan requires is waived.
- **Pre-existing repository condition (not drift):** the existing release test
  files import `tools/release/*` through parent-relative paths; extending
  those files may reuse their established import style, but no new file may
  introduce a parent-relative import (AGENTS.md import convention).

---

## Phase 01: bound-smoke-cleanup-signal-wait (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Bound smoke cleanup signal waits and preserve failure diagnostics

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-bound-smoke-cleanup-signal-wait.md`

**Ordering:** group 1; own worktree, parallel with p02. Merges first (bounds the
validation hang before the release-guard lane's integration run). Write surface
is `tools/smoke/runner/cleanup.test.mjs` only (non-authoritative recon).

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract (including `pnpm lint && pnpm format`).
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): bound smoke cleanup signal waits and keep failure diagnostics"
```

### Task p01-t02: (review) Hoist the SIGTERM-ignore handler in the regression fixture

**Files:**

- Modify: `tools/smoke/runner/cleanup.test.mjs`

**Step 1: Understand the issue**

Review finding (final review m3): the generated `ignoreSigterm` wrapper writes
its sentinel and only then calls `pauseForTermination()`, where
`process.on('SIGTERM', () => {})` is installed; the parent sends SIGTERM as
soon as the sentinel appears, so a signal delivered in that window hits Node's
default action and the two real-path regressions could flake.
Location: `tools/smoke/runner/cleanup.test.mjs` fixture source (~:873–887).

**Step 2: Implement fix**

In the generated wrapper, install the ignore handler at module scope
immediately after `const ignoreSigterm = …` (before any sentinel write); keep
the existing branch in `pauseForTermination` only for the keep-alive interval.
Do not touch the normal `process.once('SIGTERM', …)` path.

**Step 3: Verify**

Run: `node --test tools/smoke/runner/cleanup.test.mjs` (19/19, 0 cancelled) and
`pnpm test:smoke`, `pnpm lint`, `pnpm format`
Expected: all exit 0.

**Step 4: Commit**

```bash
git commit -m "fix(p01-t02): install the fixture SIGTERM-ignore handler before the sentinel"
```

---

## Phase 02: detect-behind-main-package-versions (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Reject publishable package versions overtaken by current main

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-detect-behind-main-package-versions.md`

**Ordering:** group 1; own worktree, parallel with p01. Merges second, after
p01. Write surface is `tools/release/*` + `packages/cli/src/release/*` with
conditional `.github/workflows/ci.yml` / `AGENTS.md` (non-authoritative recon).
Apply the rule-1 drift-check addendum from the Drift Refresh Record.

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the
rule-1 addendum above.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract.
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t01): reject publishable package versions overtaken by current main"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target                   |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01    | code     | passed  | 2026-08-26 | reviews/archived/p01-review-2026-08-26T150044Z.md           | fd8c7cb9b7fa60c5b95fb0174d1a76c58814a698 | auto       | -                             |
| p02    | code     | passed  | 2026-08-26 | reviews/archived/p02-review-2026-08-26T135641Z.md           | b486beb60d83a5b0d1f46cc3881627da93acb354 | auto       | -                             |
| final  | code     | passed  | 2026-08-26 | reviews/archived/final-review-2026-08-26T154241Z.md         | 58a5aa0919428928152ffcbaf292b2973b18a65d | auto       | -                             |
| plan   | artifact | passed  | 2026-08-26 | reviews/archived/artifact-plan-review-2026-08-26T125608Z.md | -                                        | -          | -                             |
| spec   | artifact | pending | -          | -                                                           | -                                        | -          | -                             |
| design | artifact | pending | -          | -                                                           | -                                        | -          | -                             |
| final  | code     | passed  | 2026-08-26 | reviews/archived/final-review-2026-08-26T160106Z.md         | cab5ffd3c9eeba12ba535855ab41590ed43d3a38 | gate       | claude-fable-skip-permissions |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- [x] 2/2 phases, 2/2 tasks complete (+ one review fix task p01-t02 added at final review)
- [x] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md` § Done-criteria confirmation)
- [x] **Serialized backlog bookkeeping** (integration branch, after all merges; commit `848beb88`):
      `oat backlog archive` with real outcome summaries for
      `BL-260818-bound-the-smoke-cleanup` and
      `BL-260817-detect-branch-behind-published`, one commit
- [x] Orchestration-log end-of-run synthesis written (`032eeef7`) — `summary.md` roll-up pending the summary step of the pre-approval sequence (before any archive step)
- [x] Full DoD gates green on the integration branch (`4fa530e6`; re-run by final review at `848beb88`; full re-run at the final head after `196dae19` recorded in `implementation.md` § Final DoD)

## References

- Source plans: the 2 `.oat/repo/reference/external-plans/*.md` files named above
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, prior wave summary
  `.oat/repo/reference/project-summaries/20260722-wave-skills-promotion.md`
- **summary:** ---
  oat_status: complete
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-08-26
  oat_generated: true
  oat_summary_last_task: p01-t02
  oat_summary_revision_count: 0
  oat_summary_includes_revisions: []

---

# Summary: wave-1-execution

## Overview

Wave 1 ("Test and CI containment") of the 2026-08-19 defect program executed
two recently observed, S-sized defects as a thin wrapper OAT project: a smoke
SIGTERM regression harness that could wedge `pnpm test` indefinitely, and a
release-integrity hole where a long-lived branch's lockstep bump could be
overtaken by a later `main` release and still pass CI. Each lane's contract was
its immutable external plan; the wrapper added ordering, worktree isolation,
gates, review mapping, and bookkeeping.

## What Was Implemented

- **Bounded smoke cleanup signal harness** (`tools/smoke/runner/cleanup.test.mjs`,
  three append-only commits `aedced64` → `6a9ed1af` → `fd8c7cb9`, plus final-review
  fix `196dae19`): `runSignalCase` now awaits a bounded child exit (60s), a missed
  SIGTERM triggers SIGKILL and a bounded reap (15s) before temp-dir cleanup, an
  unreapable child is detached without stalling the event loop, and timeouts fail
  loudly with the paused stage and captured stdout/stderr. Success assertion
  `{ code: 143, signal: null }` unchanged; 19/19 tests, mutation battery
  (delete + reorder + detach revert) all red without the fixes.
- **Current-main release guard** (`tools/release/check-version-bumps.ts`,
  `tools/release/release-utils.ts`, tests under `packages/cli/src/release/`;
  `c8fdefc3` + fix `b486beb6`): `pnpm release:check-versions` additionally rejects
  any lockstep version not strictly greater than `origin/main` (numeric
  `major.minor.patch` comparator; malformed or missing evidence fails closed;
  never runs when no publishable roots changed). The merge-base lockstep rule is
  untouched and its errors are emitted first, so one run names every required
  rebase/re-bump. The `0.2.29` branch vs `0.2.30` main regression is red in tests.
- **Lockstep bump 0.2.32 → 0.2.33** (`4fa530e6`) across the five public packages
  plus the generated `packages/cli/assets/public-package-versions.json`.

Reviews: plan artifact gate (cursor-gpt-5-6-sol-xhigh) passed; p01 `passed`
after three review rounds, p02 after two; final review (two rounds) and the
configured implementation exit gate (`claude-fable-skip-permissions`, run
`b20f4349`) `passed`; full definition of done green at `7f78dab7`.

## Key Decisions

1. **Wave-level lockstep bump instead of exempting test paths:** test files under
   `packages/cli/src/` count as publishable changes, so the repository guardrail
   demanded a five-package bump the lane could not make. The root bumped once
   after fan-in (the repository-mandated route; also exercises the new guard's
   green path) rather than changing `versionPolicyIgnorePatterns`, which is a
   policy decision outside the plan.
2. **Non-narrowing reconciliation of the release-guard plan:** the strict-greater
   comparison lives in `check-version-bumps.ts` / `release-utils.ts` exactly as
   the plan scopes it, appended to the result that already aggregates the
   merge-base lockstep errors; `release:validate`'s separate lockstep pass was
   left unchanged ("do not add a second competing gate").
3. **Merge phase branches without rebase:** the phase branches touched only code
   and the integration branch only `.oat/projects/`, so `git merge --no-ff` in plan
   order preserved every reviewed SHA cited by the review chain.

## Design Deltas

- Discovery assumed "no lockstep public-package bump is expected in this wave";
  the bump was required (see Key Decision 1). Recorded in `implementation.md`
  Deviations; source of truth is the integration branch.

## Notable Challenges

- The configured plan gate was blocked twice by a Cursor team usage limit
  (the gate's availability probe kept passing); the operator raised the limit and
  the third launch passed.
- p01's Important finding — a post-detach re-reap that could never settle, losing
  the diagnostic and leaking temp dirs — and the follow-on reorder gap were found
  only by reviewer-designed probes and mutation runs; every implementer gate and
  codex pass was green.
- CPU contention from the sibling lane made p01's original 10s deadline
  intermittently red; recalibrated to 60s/15s with the outlier documented.
- One orchestrator bookkeeping commit landed on a phase branch after a compound
  `cd` persisted the shell cwd; repaired append-only.

## Tradeoffs Made

- Deadline headroom (~35× typical) over tightness: a too-tight bound converts
  scheduler stalls into flaky red gates; a true wedge now fails in a minute
  instead of never.
- Three Minor findings deferred at the scopes' final review cycles
  (diagnostics wording / coverage for already-verified fixes) rather than
  opening further review cycles.

## Integration Notes

- `pnpm release:check-versions` now depends on a current `origin/main` ref
  (CI: `fetch-depth: 0`); locally, fetch before running it. The gate's missing-ref
  branch is reachable only via dependency injection because the pre-existing
  no-merge-base skip shadows it (documented in code).
- Any change under `packages/cli/src/**`, including tests, triggers the lockstep
  bump requirement.

## Autonomous Execution Learnings

### Agent-instruction updates

- Generalize the wave skill's absolute-path guard to every root command and add a pre-child provider-rejection rule to gate diagnostics — one incident each ([2026-08-26T13:48:00Z — gotcha — Compound `cd` persisted the shell cwd across orchestrator calls](./oat-execution-learnings.md), [2026-08-26T04:20:00Z — environment-limited — Configured plan gate blocked by Cursor usage limit](./oat-execution-learnings.md)).
- Require delete- and reorder-class mutations in reviewer briefs for ordering/containment claims — the reorder class caught what delete-class missed ([2026-08-26T14:05:00Z — candidate-skill-content — Reviewer-designed probes found what green gates missed](./oat-execution-learnings.md)).
- Weigh CPU contention when grouping timing/signal lanes with build-heavy lanes ([2026-08-26T14:30:00Z — efficiency — CPU contention between a timing lane and a build-heavy lane](./oat-execution-learnings.md)).

### Code follow-ups

- Gate exec-target selection: probe entitlement or fall through on a pre-child provider rejection ([2026-08-26T04:20:00Z — environment-limited — Configured plan gate blocked by Cursor usage limit](./oat-execution-learnings.md)).
- Deterministic smoke tier: namespace/clean run worktrees on failure and tolerate linked-worktree runs ([2026-08-26T15:55:00Z — gotcha — Deterministic smoke tier can collide on shared-git worktrees](./oat-execution-learnings.md)).

### Workflow issues

- Drift refresh must intersect lane write surfaces with release change-detection roots and pre-plan lockstep bumps; the version-policy question for test-only paths is an operator decision ([2026-08-26T13:45:00Z — gotcha — Test-only changes under packages/cli trip the lockstep version guard](./oat-execution-learnings.md), [2026-08-26T16:05:00Z — decision — Wave-level lockstep bump instead of exempting test paths](./oat-execution-learnings.md)).

## Follow-up Items

- Deferred minors: p02-r2-m1 (quote whitespace in the malformed-version
  diagnostic, `check-version-bumps.ts`), p01-r3-m1 (regression coverage for
  the `forced`/`timedOut` diagnostics branches), p01-r3-m2 (zombie child wording)
  — trigger "next touch of `cleanup.test.mjs`" already fired with `196dae19`;
  address on the next release-tooling / smoke-harness touch.
- Backlog candidates (file at wave close on `main`): gate exec-target entitlement
  probe / post-selection fallback; resolver `--stamp` output; version-policy
  decision for test-only paths; deterministic smoke tier worktree hygiene in
  linked worktrees.
- Docs: `apps/oat-docs/docs/contributing/code.md` and `AGENTS.md` DoD notes for the
  new current-main rule (addressed at the `document` step).

## Associated Issues

- `BL-260818-bound-the-smoke-cleanup` — closed (archived `848beb88`).
- `BL-260817-detect-branch-behind-published` — closed (archived `848beb88`).

## Workflow Observations

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=review_failed

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=review_failed

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/artifact-plan-review-2026-08-26T125608Z.md

### 2026-08-26 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/final-review-2026-08-26T160106Z.md

### 2026-08-26 · general · friction · gate exec-target selection

Observation: the configured plan gate selected cursor-gpt-5-6-sol-xhigh twice while cursor-agent rejected launches with a team usage-limit error; the availability probe (cursor-agent --version) kept passing and the gate has no post-selection fallback. Impact: the whole wave blocked at a quota boundary until the operator raised the limit. Recommendation: probe entitlement or fall through to the next target on a pre-child provider rejection; classify pre-child rejections as launch defects (see orchestration-log.md). (observed on oat 0.2.32)

### 2026-08-26 · general · friction · release gate vs test-only changes

Observation: files under packages/cli/src/**/\*.test.ts count as publishable changes (versionPolicyIgnorePatterns is only assets/**), so a test-only lane forced a five-package lockstep bump (Recovery Event p02-rec-001). Impact: root-owned wave-level bump 0.2.32 to 0.2.33 after fan-in. Recommendation: drift refresh should intersect lane write surfaces with the release change-detection roots and plan the bump up front; decide separately whether test paths should be version-policy-ignored. (observed on oat 0.2.32)

### 2026-08-26 · general · worked-well · reviewer-designed adversarial probes

Observation: the p01 Important (post-detach unsettleable reap) and a round-2 Medium (reorder mutation) were found only by reviewer probes and mutation runs; every implementer gate, pinned test, and codex pass was green. Impact: two cheap fix rounds, no defect shipped. Recommendation: keep the mandatory reviewer-designed probe for logic-bearing lanes and require delete- and reorder-class mutations for ordering/containment claims.

### 2026-08-26 · general · bug · orchestrator cwd drift

Observation: a compound cd into a phase worktree persisted across orchestrator shell calls, so one root bookkeeping commit landed on the phase branch. Impact: repaired by cherry-pick plus reset of the unreviewed misplaced commit; reviewed SHAs untouched. Recommendation: every root command uses absolute paths or git -C; generalize the wave skill's absolute-path merge guard to all root commands.

### 2026-08-26 · general · friction · deterministic smoke tier in linked worktrees

Observation: the exit-gate reviewer's pnpm test failed once in tools/smoke/deterministic (git worktree add collided in the shared git dir), passed on isolated rerun, and leaked run-scoped smoke-automated worktrees and branches. Impact: root cleanup of the leaked refs; no wave code involved. Recommendation: the deterministic tier should namespace or clean its worktrees on failure and tolerate concurrent runs in linked worktrees.

## Unresolved claims

- None.
