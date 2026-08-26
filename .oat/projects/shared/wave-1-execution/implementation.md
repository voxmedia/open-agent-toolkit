---
oat_status: complete
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

## Implementation-tail project recap (IMPLEMENT-19)

- Intent: `oat_project_recap: generate / autonomous_policy`; no fresh manifest existed → exactly one `project-recap` attempt via `runOatExplainer` (`mode: unattended`, in-process planSet/author/critic/browserSession/visualCritic seams; delegated to an Opus worker, driver under `$TMPDIR/w1-recap/`).
- Result: manifest `explainers/wave-1-execution-recap/manifest.json`, run `run-051612fb-0075-43de-b2dd-0aea4209775f`, outcome **built-not-durable** (terminal; `checkTerminalOutcome` ok). Build: 8 stages passed (theme warned `theme-selection-normalized`), floor-only portfolio (one hub), fact critic 0 findings, real Chromium 147.0.7727.15 evidence at three viewports, visual review `pass` on attempt 1.
- Finalizer (`dedicated`): artifact commit `efe10a05` (27 paths) → the repo pre-commit formatter (lint-staged `oxfmt --write` on `*.json`/`*.md`) rewrote 9 immutable package files in the commit, so `recordDurability` returned 9 `hash-mismatch` errors; evidence commit `612e2dbf` recorded that non-durable attestation (`verifyTrackedRunFinalization` → `built-not-durable`). **Correction (final review round 3):** the pre-format bytes were present in the index/working tree when `9f906e1d` was committed (most likely restored by lint-staged's backup handling after `612e2dbf`; no stash or index reflog survives to confirm the exact mechanism) and hash-match the original `immutableHashes`; those 9 files were committed — unannounced — together with the formatter-guard commit `9f906e1d` (root re-verified: `612e2dbf` ok=18/27, `9f906e1d` ok=27/27). A fresh attestation against `9f906e1d` (`record-durability.mjs`, request under `$TMPDIR/w1-recap/attest-request-2.json`) recorded outcome **built-durable**; evidence commit `cb702de1`. The earlier statement that the bytes were unrecoverable was wrong and is withdrawn.
- Tooling deviation (root, closeout): `9f906e1d` (which also carries the restored immutable bytes above) adds `.oat/**/explainers/**`, `.oat/repo/reference/project-recaps/**`, `.oat/repo/explainers/**` to `.oxfmtrc.jsonc` ignorePatterns and `--no-error-on-unmatched-pattern` to the lint-staged `*.md` task (wave-execute rule 7). Outside both source plans' scope; recorded here and in the Deviations table. Superseded at `73bb99cd`: the dead `.oat/repo/explainers/**` pattern was removed and the flag extended to all three oxfmt lint-staged tasks (round-3 m3/m4).

## Final HiLL approval (IMPLEMENT-16, autonomous)

- Pre-approval sequence (configured `workflow.postImplementSequence`): summary (`85d57fdf`), document (`1c3aeeca`), pr (PR #215, head `dbda5cdf`) — all complete; recap gate IMPLEMENT-19 terminal (`built-not-durable` at approval time; re-attested `built-durable` at `cb702de1` after the immutable bytes were restored).
- Evidence: final review row `passed` (round 2 artifact `reviews/archived/final-review-2026-08-26T154241Z.md`, head `58a5aa09`, dispatch `w1-final-review-002`); configured exit gate `allowed / passed` (run `b20f4349`, artifact `reviews/archived/final-review-2026-08-26T160106Z.md`); `oat_implement_exit_gate` fresh (rolling freshness checkpoints over closeout-only descendants).
- **Correction (final review round 3, 2026-08-26):** the freshness classification recorded above was wrong — `1c3aeeca` (AGENTS.md/docs) and `9f906e1d` (formatter tooling + restored recap bytes) are substantive, not closeout-only. `oat_implement_exit_gate.status` was set to `stale` at `a843353c`; the current-basis final review is round 3 (`reviews/archived/final-review-2026-08-26T164716Z.md`), and a new gate generation is required before merge. The approval decision itself is unchanged.
- Decision: `approval: approved`, `approval_source: oat-autonomous`, `status: post_approval` → no post-approval steps configured → `complete`. This approval waives nothing: no failed review, child failure, repository-policy, destructive-change, or credential boundary is open. Merge remains a separate, operator-authorized root action after CI.

### Review Received: final (round 3, narrowed — post-gate changes)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/final-review-2026-08-26T164716Z.md (reviewed head `a843353cf2d9d36e6fc88e3ccbd2db936eaed0ba`, range `58a5aa09..a843353c`, prior round 2 / head `58a5aa09`, invocation auto, dispatch `w1-final-review-003`, model opus)

**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 5. Tooling change assessed sound (ignore patterns match exactly the two run-package roots; formatted surface unchanged at 420 files); every docs claim verified; all gates exit 0.

**Dispositions (auto mode — all converted and applied by the root in this fix round; artifact/tooling/docs only, no product code):**

- I1 — closeout artifacts asserted an unrecoverable durability failure; restoration in `9f906e1d` unrecorded: **artifact_alignment_required → fixed** (summary.md Explainer Outcome and § IMPLEMENT-19 corrected; fresh attestation recorded `built-durable`).
- M1 — approval evidence claimed the exit gate "fresh": **fixed** (correction appended under IMPLEMENT-16; decision unchanged).
- m1 — restoration unrecorded in the Deviations row: **fixed**.
- m2 — `state.md` literal `\n` escapes / stale descriptor: **fixed**.
- m3 — lint-staged `*.{ts,tsx,js,jsx}` task lacked `--no-error-on-unmatched-pattern`: **fixed**.
- m4 — dead `.oat/repo/explainers/**` ignore pattern: **fixed** (removed).
- m5 — docs overstated when the current-main rule applies / omitted the `main` fallback: **fixed** (`code.md`).

**Verification record:** what — the seven dispositions above; how — root edits verified by `pnpm check`/`pnpm format` exit 0 and by re-hashing the recap package (27/27) before the fresh attestation; where — this section, the fix commit, and the attestation evidence commit.

**Review row `final` (round 3) → `fixes_completed`.**

**Review-cycle governance (REVIEWRECEIVE-02):** this is the third lifecycle review cycle for scope `final` (auto lineage: rounds 1–3; gate artifacts excluded). The configured 3-cycle cap is reached; reaching `passed` requires a fourth narrowed re-review, which autonomy must not self-authorize. Boundary reported to the operator; the exit-gate generation remains `stale` until a current-basis final review passes and a new generation runs.

### Review Received: final (round 4, narrowed — operator-authorized)

**Date:** 2026-08-26
**Authorization:** the operator explicitly authorized an additional narrowed final-review cycle ("authorize", 2026-08-26) after the REVIEWRECEIVE-02 boundary report.
**Review artifact:** reviews/archived/final-review-2026-08-26T183359Z.md (reviewed head `16066aedb53384848ec8fe4f876264a7630d574e`, range `a843353c..16066aed`, prior round 3 / head `a843353c`, invocation auto, dispatch `w1-final-review-004`, model opus)

**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 4. All seven round-3 dispositions **verified fixed**; the `cb702de1` re-attestation verified genuine (27/27 hashes on disk and in the evidence tree; build-record hash round-trips; evidence paths 1:1 with `immutableHashes`). Gates `pnpm check`/`format`/`lint` exit 0.

**Dispositions (all artifact-text consistency; applied by the root in this fix round, no code or tooling changed):**

- I1 — the withdrawn "originals unrecoverable" claim survived in `orchestration-log.md` and `oat-execution-learnings.md` (the latter asserting the opposite mechanism): **fixed** via appended dated correction entries in both append-only files.
- M1 — restoration-provenance stated as fact but unverifiable (no lint-staged stash from this session survives): **fixed** — hedged consistently in implementation.md (two places) and summary.md; the verified half (27/27 hash match at `9f906e1d`) stays categorical.
- m1 — program ledger W1 row stale on CI and head pin: **fixed** (CI green recorded; head pin dropped).
- m2 — tooling-deviation record described the pre-m3/m4 config: **fixed** (superseded-at-`73bb99cd` pointers added in § IMPLEMENT-19 and the Deviations row).
- m3 — approval-evidence line cited `built-not-durable` only: **fixed** (re-attestation noted; decision unchanged).
- m4 — 109-column line from the m5 docs fix: **fixed** (annotation shortened).

**Review row `final` (round 4) → `fixes_completed`.** A fifth narrowed cycle (verification of these six text fixes) is required to reach `passed` and remains operator-gated.

## Deviations from Plan / Design

| Task / Review | Source Artifact                                | Planned / Documented                                       | Actual / Accepted                                                                                                                                                                                                                                                                                                                     | Reason                                                                                                                                                  | Source of Truth                     | Follow-up                                                                                      |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| closeout      | .oxfmtrc.jsonc / .lintstagedrc.mjs             | not in either source plan                                  | formatter ignore for immutable explainer-kit run packages + restoration of the 9 formatter-rewritten immutable recap files (`9f906e1d`; the pre-format bytes were present in the index/working tree at that commit — most likely lint-staged's backup restore after `612e2dbf`, unverifiable now — and hash-match the manifest 27/27) | pre-commit formatting broke the recap durability attestation (rule 7)                                                                                   | Implementation (integration branch) | superseded at `73bb99cd` (dead pattern removed; flag on all three oxfmt tasks — round-3 m3/m4) |
| p02-t01       | discovery.md Constraints / plan.md Parallelism | "no lockstep public-package bump is expected in this wave" | Wave-level lockstep bump 0.2.32 → 0.2.33 on the integration branch                                                                                                                                                                                                                                                                    | Test files under `packages/cli/src/` trip the publishable-change guard (`versionPolicyIgnorePatterns: ['assets/**']`); repo guardrail mandates the bump | Implementation (integration branch) | Note for W2–W4: their version baseline is whatever `origin/main` holds at wave start           |

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
