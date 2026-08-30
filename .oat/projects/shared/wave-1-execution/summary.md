---
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
after three review rounds, p02 after two; final review (four rounds; rounds 3–4 narrowed to
post-gate tooling/docs and closeout text, round 4 passed by operator acceptance)
and the configured implementation exit gate `passed` — generation 1 (run
`b20f4349`) went stale after post-gate tooling/docs commits; generation 2 (run
`8485a4f9`, `claude-fable-skip-permissions`) is the pre-merge gate; full
definition of done green at `7f78dab7` and re-run by reviewers at later heads.

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

## Explainer Outcome

- **project-recap:** built-durable — `explainers/wave-1-execution-recap` (run `run-051612fb-0075-43de-b2dd-0aea4209775f`, `project-recap@2`, one hub artifact, real Chromium evidence at 320/768/1440, visual review pass, fact critic 0 findings). Attestation history: the pre-commit formatter rewrote 9 of the 27 immutable package files at the artifact commit `efe10a05`, so the first `recordDurability` run recorded 9 `hash-mismatch` errors (`612e2dbf`, outcome `built-not-durable`); the pre-format bytes were present in the index/working tree when the formatter-guard commit `9f906e1d` was made (most likely lint-staged's backup restore after `612e2dbf`; no stash or index reflog survives to confirm the mechanism) and hash-match the manifest 27/27, and a fresh attestation against `9f906e1d` recorded `built-durable` (`cb702de1`).

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

### 2026-08-26 · structural · oat-project-complete · seal

Completion sealed at 2026-08-26T16:37:51Z; project-log roll-up status: ok (rollup ledgerOutcome appended at summary step). Archive tail (oat project archive + S3 + active-pointer clear) deferred to program close per autonomous wave policy.

### 2026-08-26 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/final-review-2026-08-26T185206Z.md
