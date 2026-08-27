---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260818-bound-the-smoke-cleanup.md
oat_external_plan_commit: 6f443c08
oat_backlog_items:
  - BL-260818-bound-the-smoke-cleanup
oat_issue_url: null
created: '2026-08-20T02:37:32Z'
---

# Bound smoke cleanup signal waits and preserve failure diagnostics

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

## Outcome

The smoke cleanup SIGTERM regression harness cannot wedge the full test suite
indefinitely. A child that fails to exit within a short, explicit deadline is
force-killed, awaited, and reported with its captured stdout/stderr and signal
stage so the original failure remains diagnosable.

## Source and live evidence

- Source artifact or scope:
  `.oat/repo/pjm/backlog/items/BL-260818-bound-the-smoke-cleanup.md`
- Planned at: commit `6f443c08` on `2026-08-19`
- Related backlog items: `BL-260818-bound-the-smoke-cleanup` — Bound the smoke
  cleanup SIGTERM harness with a timeout
- Verified evidence:
  - `tools/smoke/runner/cleanup.test.mjs:737` spawns the signal-wrapper child
    and captures both output streams.
  - `tools/smoke/runner/cleanup.test.mjs:761` waits for a sentinel, sends
    SIGTERM, and awaits an unbounded one-shot `exit` promise.
  - `tools/smoke/runner/cleanup.test.mjs:780` sends SIGKILL only from `finally`,
    which cannot run while the unbounded exit promise is pending.
  - The same helper runs for both provision and drive signal cases at lines
    789–795, so one bounded primitive covers both regressions.

## Drift check

Run before editing:

```bash
git diff --stat 6f443c08..HEAD -- tools/smoke/runner/cleanup.test.mjs tools/smoke/runner
```

If the signal helper or child lifecycle changed, compare the new ordering with
this plan before editing. A material mismatch is a STOP condition.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass.
- Typecheck: not applicable to the JavaScript-only focused change; still run
  `pnpm type-check` in the final repository gate.
- Test: `node --test tools/smoke/runner/cleanup.test.mjs` → all cleanup cases
  pass and the process exits promptly.
- Lint/format check: `pnpm lint && pnpm format` → `tools/smoke` is covered by
  its dedicated lint and format commands.
- Implementation pattern: retain `node:test`, `node:assert/strict`, explicit
  child cleanup, and `t.after`/`finally` ownership used by the existing file.
- Git/PR convention: do not push or open a PR unless instructed.

## Scope

### In scope

- `tools/smoke/runner/cleanup.test.mjs` — bounded child-exit wait, forced-kill
  fallback, and timeout diagnostics for `runSignalCase`.

### Out of scope

- Production smoke cleanup semantics in `cleanup.mjs` or `run-smoke.mjs` — the
  observed wedge is in the test harness wait.
- Raising global test-runner timeouts — that would mask the unbounded child.
- Reworking signal delivery across platforms beyond preserving the existing
  tested contract.

## Current state

The harness sends SIGTERM only after a sentinel proves the child reached the
selected pause stage. It then waits forever for `exit`. The emergency SIGKILL
is correctly ownership-scoped but unreachable during a hang because it lives
after the pending await. The repair therefore belongs around the exit wait and
must still reap the child before deleting its temporary directories.

## Implementation steps

### 1. Introduce a bounded exit helper with one owner

Add a local helper in `cleanup.test.mjs` that subscribes to child `exit`, starts
an unref'd deadline timer, and resolves with either the normal exit result or a
typed timeout result. Ensure the helper removes its listener and clears the
timer on every path. Use a named timeout constant short enough to protect the
suite but long enough for cleanup on CI; document why that value is test-only.

Avoid `Promise.race` that leaves an exit listener or timer behind. If the child
has already exited before subscription, return its current `exitCode` and
`signalCode` rather than waiting for an event that cannot recur.

**Verify:** `node --check tools/smoke/runner/cleanup.test.mjs` → syntax check
exits zero.

### 2. Force-kill, reap, and fail with stage-aware evidence

Replace the unbounded promise in `runSignalCase` with the helper. On timeout,
send SIGKILL if the child is still alive, await the final exit through a second
short bounded wait, and then fail the test with `pauseStage`, timeout duration,
stdout, and stderr. Keep the existing `finally` fallback as idempotent defense,
but do not remove temporary directories until the child is confirmed exited
or the bounded reap also fails and the test reports that condition.

Preserve the successful assertion `{ code: 143, signal: null }`; the timeout is
a mitigation and diagnostic boundary, not a new accepted success result.

**Verify:** `node --test tools/smoke/runner/cleanup.test.mjs` → both SIGTERM
cases and all cleanup regressions pass without open-handle delay.

### 3. Prove the timeout path itself terminates

Add a focused test seam for the bounded wait helper or inject a deliberately
non-exiting child into a small helper-level test. Assert that the timeout path
sends SIGKILL, observes final exit, and rejects or reports within a bounded
outer duration. Keep the fixture local; do not add sleeps long enough to make
the suite materially slower.

**Verify:**
`node --test --test-name-pattern='SIGTERM|bounded|timeout' tools/smoke/runner/cleanup.test.mjs`
→ the success and forced-timeout paths both complete.

## Test plan

- Preserve the two existing stage cases: SIGTERM during `provision` and during
  `drive`.
- Add one deterministic timeout-path case at helper level or through a child
  fixture that intentionally ignores SIGTERM.
- Assert child reaping and collateral-write protections on the normal path;
  assert forced kill and bounded completion on the timeout path.
- Focused command: `node --test tools/smoke/runner/cleanup.test.mjs` → exits zero
  in substantially less than the configured deadline per case.
- Full commands: `pnpm lint && pnpm format && pnpm test:smoke` → all exit zero.

## Done criteria

- [ ] No child-exit await in `runSignalCase` is unbounded.
- [ ] A missed or ignored SIGTERM triggers SIGKILL, reaping, and a diagnostic
      failure instead of a suite hang.
- [ ] Normal provision and drive cases retain their cleanup assertions.
- [ ] `node --test tools/smoke/runner/cleanup.test.mjs` exits zero.
- [ ] `pnpm lint`, `pnpm format`, and `pnpm test:smoke` exit zero.
- [ ] `git status --short` contains no unexplained or out-of-scope files.

## STOP conditions

Stop and report instead of improvising when:

- the live wedge moved into production cleanup code rather than the test wait;
- a platform-specific signal contract would require weakening the existing
  expected exit assertion;
- the child cannot be reaped after both bounded waits;
- a named verification gate fails twice after one bounded correction; or
- the work would delete any path not created by the test harness.

## Review focus

- Check listener/timer cleanup and the already-exited race closely.
- Confirm forced termination is followed by a reap before filesystem cleanup.
- Confirm the timeout path fails loudly with stage and captured output rather
  than being treated as a passing cleanup result.
