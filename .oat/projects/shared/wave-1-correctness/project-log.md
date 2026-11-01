---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-10-31
---

# Project Log: wave-1-correctness

Append-only evidence of what broke, surprised, or worked: write entries only with `oat project log append` (see its `--help`), never edit a prior entry, and never record secret values.
Contract, entry grammar and roll-up: https://voxmedia.github.io/open-agent-toolkit/workflows/projects/execution/project-log

## Entries

### 2026-10-31 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/wave-1-correctness/reviews/artifact-plan-review-2026-10-31T230813Z.md run=233bfcac-2b80-4c9b-8919-8e7fb72e937d

### 2026-11-01 · structural · oat-project-implement · p01

wave1-20261031-p01-outcome: p01 passed after 1 fix loop (p01-t04 for review Medium M1 and Low L1); re-review wave1-p01-review-2 clean of Critical/High/Medium.

### 2026-11-01 · structural · oat-project-implement · p02

wave1-20261031-p02-outcome: p02 passed on first review (0 fix loops; 3 Low recorded).

### 2026-11-01 · structural · oat-project-implement · p03

wave1-20261031-p03-outcome: p03 passed after 1 fix loop (p03-t04 for review High H1 and Medium M1); re-review wave1-p03-review-2 clean of Critical/High/Medium.

### 2026-11-01 · structural · oat-project-implement · p04

wave1-20261031-p04-outcome: p04 passed on first review (0 fix loops; 3 Low recorded).

### 2026-11-01 · structural · oat-project-implement · p01-p04

wave1-20261031-group-merge: parallel group [p01,p02,p03,p04] merged --no-ff in plan order with no conflicts; integration build and forced CLI suite (437 files, 9276 tests) and test:scripts exit 0.

### 2026-11-01 · project · friction · Parallel phase implementers stopped BLOCKED on their own interrupted first attempts

**Category:** gotcha
**Source:** autonomous-wave1-20261031-01
**Origin:** oat-project-autonomous
**Recorded:** 2026-11-01T00:33:03Z

autonomous-wave1-20261031-01 Observation: three of four concurrently dispatched Cursor phase implementers found partial uncommitted work for their own first task in their worktree (written minutes earlier, no live writer) and stopped BLOCKED at the clean-tree preflight. Impact: one extra round trip per phase; the root backed up the diffs, restored clean trees and continued each through its accepted handle. Recommendation: when a host may restart a dispatched child, the phase scope should say whether stale in-boundary dirt from the same request id may be discarded, and the backup step should copy untracked files with a loop rather than xargs.

### 2026-11-01 · project · worked-well · Real-hook probe caught a lint-staged re-stage failure a scratch hook would have hidden

**Category:** efficiency
**Source:** autonomous-wave1-20261031-02
**Origin:** oat-project-autonomous
**Recorded:** 2026-11-01T00:33:04Z

autonomous-wave1-20261031-02 Observation: the plan review required probing commit-paths against this repository's real lint-staged hook with an observable log; it showed lint-staged 15.5.2 failing its re-stage on tracked files under an ignored directory while exiting 0. Impact: the fix shipped with a .lintstagedrc.mjs change that a scratch-hook test would not have revealed. Recommendation: keep real-hook probes for exact-path commit changes.

### 2026-11-01 · structural · oat-project-implement · p05

wave1-20261031-p05-outcome: p05 passed review (no Critical/High in either round) with 2 fix rounds (p05-t05 delegated, p05-t06 root-inline docs fix); Definition of Done gates all exit 0.

### 2026-11-01 · project · friction · A child session left an oat shell function that silently no-opped later oat calls

**Category:** environment-limited
**Source:** autonomous-wave1-20261031-03
**Origin:** oat-project-autonomous
**Recorded:** 2026-11-01T01:12:25Z

autonomous-wave1-20261031-03 Observation: after the p05 implementer ran, the root shell had a function oat() { node "$CLI" "$@" } with CLI unset, so oat calls printed nothing and exited 0 (one project-log append and two validations were silently skipped). Impact: lost bookkeeping until noticed at the final-review resolver. Recommendation: check type oat before relying on oat output in a long-lived shell, and have children invoke the branch CLI by path instead of defining shell functions.

### 2026-11-01 · structural · oat-project-review-provide · final

b066376d-1060-4d4b-b0de-1dac7fe96d0f-recon: two read-only consequential reconnaissance lanes completed at gpt-6.1-sol/high; primary independently reproduced the cleanup candidate and recorded 0 Critical, 0 High, 1 Medium, 0 Low in reviews/final-review-2026-11-01T012851Z.md.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
