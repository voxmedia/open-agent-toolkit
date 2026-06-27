---
oat_generated: true
oat_generated_at: 2026-06-27
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/cli-help-flag-coverage
---

# Code Review: final

**Reviewed:** 2026-06-27
**Scope:** Full branch (`git diff 5d9bf2d9..HEAD -- packages/`) — holistic integration pass
**Files reviewed:** All changed files under `packages/` across p01, p02, and p03
**Commits:** 9d98ed28 (p01-t01), f811b09c (p01-t02), 847dfbf2 (p01-t03), 168d8ac3 (p02-t01), 8f0c365d (p02-t02), 624ce365 (p02-t03), 5b209dd5 (p03-t01)

## Summary

All P0 and P1 audit items are correctly implemented and cleanly integrated. The p01 (scope/help) and p02 (JSON contract) changes touch fully disjoint command sets — no command received both `withScopeOption` and a `--json` fix — eliminating any cross-phase interaction risk. The regression guard in `help-snapshots.test.ts` is meaningful: three behavioral tests and approximately 35 inline snapshots together lock global-option visibility and scope-consumer placement so they cannot silently regress. All gate commands pass (1976/1976 tests, lint clean, type-check clean). No new Critical or Important findings; the previously-recorded phase-gate nits remain non-blocking and are not escalated.

## Findings

### Critical

None

### Important

None

### Minor

- **`runCli` scope injection in e2e test is a latent fragility** (`packages/cli/src/e2e/workflow.test.ts:70-84`)
  - Issue: `runCli` unconditionally inserts `--scope project` after subcommand tokens. Safe today because every e2e invocation targets a scope-consuming command (`init`, `sync`, `status`, `providers list`). A future caller targeting a non-consumer command would cause `commander` to reject the unknown option and the test would fail in a confusing way.
  - Suggestion: Add a comment in `runCli` noting that all callers must target scope consumers, or gate the injection on an explicit `injectScope` parameter. This was recorded as p01/M1 at the phase gate and is unchanged at final scope.

- **`evaluate-signals` "threshold not met" human-mode test has no content assertion** (`packages/cli/src/commands/project/split/__tests__/evaluate-signals.test.ts:116-123`)
  - Issue: The test verifies `jsonPayloads.toHaveLength(0)` and `exitCode === 0` but makes no assertion on the logger output. The else-branch human summary (`Signal evaluation: below threshold (confidence: below)` + fired list) could be silently deleted and this test would still pass.
  - Suggestion: Assert `capture.info.join('\n')` contains `'below threshold'` or the fired-signals summary. Recorded as p02/M1 at the phase gate.

- **`triage-comments` "does not write stderr" test asserts only the positive side** (`packages/cli/src/commands/repo/pr-comments/triage-collection/triage-comments.test.ts:124-141`)
  - Issue: The test name promises "does not write stderr directly" but only checks `capture.jsonPayloads.length >= 1`. It does not spy on `process.stderr.write` to assert no bypassed calls occurred.
  - Suggestion: Add a `vi.spyOn(process.stderr, 'write')` and assert it was not called in the non-interactive JSON path. Recorded as p02/m1 at the phase gate.

- **`split run` JSON not verified on the `convertActiveDetectedParent` branch** (`packages/cli/src/commands/project/split/run.ts:318-339`)
  - Issue: The normal `runFreshSplit` path is tested for JSON output at line 510-525 of `run.test.ts`. The `convertActiveDetectedParent` path (lines 318-339) emits identical JSON but has no test case exercising it with `json: true`.
  - Suggestion: Add a test that seeds an active-detected-parent scenario with `json: true` and asserts the JSON payload. Recorded as p02/m2 at the phase gate.

- **`printCommentSummary` routes through `process.stderr.write` directly** (`packages/cli/src/commands/repo/pr-comments/triage-collection/triage-comments.ts:119-130`)
  - Issue: Pre-existing audit P3-3. `printCommentSummary` is called only on the interactive (TTY) path, so the non-interactive/JSON fix is unaffected. Deferred per project scope (P2/P3 deferred). No regression introduced.
  - Suggestion: Track under the P3 follow-up project alongside the other logger-bypass items.

## Requirements/Design Alignment

**Evidence sources used:** `references/audit.md` (P0–P3 findings), `discovery.md` (key decisions + scope consumer list), `plan.md` (acceptance tasks p01–p03)

### Requirements Coverage

| Requirement                                             | Status      | Notes                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-1 `providers set` broken default                     | implemented | `withScopeOption(cmd, 'project')` defaults scope to `'project'`; bare `oat providers set --enabled X` now succeeds. Guard at line 107 of `providers/set/index.ts` correctly rejects non-project explicit scope with an accurate error.                                               |
| P1-1 Global-option visibility                           | implemented | `createProgram()` sets `configureHelp({ showGlobalOptions: true })` on the root. `applyHelpConfiguration()` in `help-config.ts` recursively applies `showGlobalOptions: true` to all subcommands after `.addCommand()` registration. Verified in snapshots for all sampled commands. |
| P1-2 `--scope` demotion                                 | implemented | `--scope` removed from root globals in `create-program.ts`. `withScopeOption` applied to all 21 scope-consumer files. Non-consumers correctly reject `--scope` as unknown.                                                                                                           |
| P1-3 FALSE-ACCEPT inside scope-aware groups             | implemented | `init tools core`, `init tools project-management`, `instructions validate`, `instructions sync` all confirmed to NOT import `withScopeOption`. Behavioral test covers `instructions sync` and `init tools core` local section.                                                      |
| P1-4 `project validate-plan` never emits JSON           | implemented | Both success and failure paths in `validate-plan/index.ts` branch on `context.json` and emit structured JSON to stdout. Human path uses `logger.success`/`logger.error`. Tests cover both paths and the read-error JSON case.                                                        |
| P1-5 `project split run` never emits JSON               | implemented | Success paths emit `{ status: 'ok', parentSlug, children }` via `context.logger.json(...)` when `context.json`. Human info message silenced in JSON mode by logger. Tested at line 510-525 of `run.test.ts`.                                                                         |
| P1-6 `project split evaluate-signals` always emits JSON | implemented | `evaluate-signals.ts` branches on `context.json`; human summary logged via `logger.info` otherwise. Both JSON and human paths tested.                                                                                                                                                |
| P1-7 `project split validate-plan` always emits JSON    | implemented | `split/validate-plan.ts` branches on `context.json`; human summary uses `logger.success`/`logger.error`. Error cases (shape failure, catch block) also properly branched. Tested.                                                                                                    |
| P1-8 `triage-collection` rejects `--json`               | implemented | `triage-comments.ts` non-interactive path returns JSON when `context.json` and human summary when `!context.interactive`. The interactive (`rl.question`) path is only entered when `context.interactive` is true. Dead post-interactive JSON block removed. Tested.                 |
| Release: lockstep version bump                          | implemented | All 5 public packages (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) at `0.1.34`. Bundled asset `assets/public-package-versions.json` updated to `0.1.34` for the 4 tracked packages, consistent with prior release format (`bd64c937`).                   |

### Extra Work (not in declared requirements)

None. All changes map to audit P0+P1 items or the release task. P2/P3 items remain explicitly deferred.

## Cross-Phase Integration Assessment

**Scope/help (p01) ↔ JSON contract (p02):** The 21 scope-consumer commands and the 5 JSON-fixed commands are fully disjoint sets. No command received both `withScopeOption` and a `--json` treatment. There is therefore no interaction surface to audit.

**Behavior-change safety — `--scope` rejection on non-consumers:** Verified via `discovery.md` constraint section ("all internal `--scope` usage targets `sync`/`status`/`providers set`, which remain consumers"). The e2e test calls — `init`, `sync`, `providers list`, `status` — all target consumers and receive `--scope project` from the `runCli` helper safely.

**Behavior-change safety — `--json` gating:** `context.logger.info/success/warn` are silenced in JSON mode by the logger (verified in `ui/logger.ts` line 44-46, 67-70). Calls to these in the success path of `split run` (`logger.info('Split completed.')`) are therefore safe and produce no stdout text pollution when `--json` is set.

## Regression Guard Assessment

`packages/cli/src/commands/help-snapshots.test.ts` provides:

1. **Behavioral test: global options visible on leaf subcommand** (line 26-33) — asserts `sync` help contains `Global Options:`, `--json`, `--verbose`, `--cwd <path>`.
2. **Behavioral test: scope consumers show `--scope` as local option** (line 35-48) — asserts `sync` and `providers set` both contain `--scope <scope>` in their Options section.
3. **Behavioral test: scope non-consumers do NOT show `--scope`** (line 50-66) — asserts `config set` and `instructions sync` help contain no `--scope`.
4. **Behavioral test: `init tools core` local section excludes `--scope`** (line 68-82) — splits at `Global Options:` and asserts the local section is clean.
5. **Approximately 35 inline snapshot tests** covering root, backlog, decision, init, status, sync, config, providers (list/inspect/set), review, doctor, remove (skill/skills), index, cleanup, instructions (validate/sync), docs (analyze/apply/init/nav sync), state, tools (list/outdated/info/update/remove/install), internal (validate-oat-skills/validate-skill-version-bumps), project (status/complete-state/new/set-mode).

**Gap noted (non-blocking):** No snapshot tests for `tools install core`, `tools install project-management`, `init tools --help` (the parent group), or `remove --help` sub-detail assertions for the scope-consumer inheritance. These are covered indirectly via behavioral test 3 and the `init tools core` local-section test, but inline snapshots would make regressions immediately visible.

## Verification Commands

```bash
# Full CLI test suite
pnpm --filter @open-agent-toolkit/cli exec vitest run

# Lint
pnpm --filter @open-agent-toolkit/cli lint

# Type-check
pnpm --filter @open-agent-toolkit/cli type-check

# Release validation
pnpm release:validate

# Spot-check help output after checkout
pnpm run cli -- sync --help         # should show --scope in Options + Global Options section
pnpm run cli -- config set --help   # should NOT show --scope; should show Global Options
pnpm run cli -- providers set --help  # should show --scope default: "project"
```

## Gate Command Results

| Command                                                 | Result | Details                                    |
| ------------------------------------------------------- | ------ | ------------------------------------------ |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run` | PASS   | 1976 tests, 220 test files, 0 failures     |
| `pnpm --filter @open-agent-toolkit/cli lint`            | PASS   | 0 warnings, 0 errors (485 files, 93 rules) |
| `pnpm --filter @open-agent-toolkit/cli type-check`      | PASS   | No errors                                  |

## Verdict

**PASS** — 0 Critical, 0 Important, 5 Minor (all previously recorded in phase gates; none escalated). Implementation is complete, correct, and safe to merge.

---

## Recommended Next Step

No review-receive pass needed (no Critical or Important findings). Branch is ready for PR.
