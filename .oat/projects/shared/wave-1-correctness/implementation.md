---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-31
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: wave-1-correctness

**Started:** 2026-10-31
**Last Updated:** 2026-10-31

This journal resumes interrupted implementation sessions. Every plan task has one block in its phase; `oat project journal check` validates it.

## Progress Overview

| Phase   | Status  | Tasks | Completed |
| ------- | ------- | ----- | --------- |
| Phase 1 | pending | 3     | 0/3       |
| Phase 2 | pending | 7     | 0/7       |
| Phase 3 | pending | 3     | 0/3       |
| Phase 4 | pending | 2     | 0/2       |
| Phase 5 | pending | 4     | 0/4       |

**Total:** 0/19 tasks completed

---

## Phase 1: Provider sync cleanup and Codex config values

**Status:** pending
**Started:** -

### Task p01-t01: Skip dangling agent links in the Cursor collision scan

**Status:** pending
**Commit:** -

---

### Task p01-t02: Remove stale canonical-derived Codex roles, including on pack removal

**Status:** pending
**Commit:** -

---

### Task p01-t03: Keep user values for Codex multi_agent and max_depth

**Status:** pending
**Commit:** -

---

## Phase 2: Install scope and CLI messages

**Status:** pending
**Started:** -

### Task p02-t01: Refuse a pack install that resolves to no allowed scope

**Status:** pending
**Commit:** -

---

### Task p02-t02: Write only the requested scope when --scope is explicit

**Status:** pending
**Commit:** -

---

### Task p02-t03: State the real --scope default in tools install help

**Status:** pending
**Commit:** -

---

### Task p02-t04: Honor --scope in init --setup and stop calling gh

**Status:** pending
**Commit:** -

---

### Task p02-t05: Correct the --no-hook, packs:inventory, and local-scope scaffold messages

**Status:** pending
**Commit:** -

---

### Task p02-t06: Exit quietly when stdout is closed (EPIPE)

**Status:** pending
**Commit:** -

---

### Task p02-t07: Use project-scope sync in the worktree script and AGENTS.md guidance

**Status:** pending
**Commit:** -

---

## Phase 3: Lifecycle skill contracts

**Status:** pending
**Started:** -

### Task p03-t01: Remove the unread --retry-limit hint from oat-project-implement

**Status:** pending
**Commit:** -

---

### Task p03-t02: Resolve the completion PR base branch from config

**Status:** pending
**Commit:** -

---

### Task p03-t03: Make oat-project-pr-final usage text match its behavior

**Status:** pending
**Commit:** -

---

## Phase 4: Exact-path commits and isolated test HOME

**Status:** pending
**Started:** -

### Task p04-t01: Stage tracked files under ignored directories in commit-paths

**Status:** pending
**Commit:** -

---

### Task p04-t02: Add an isolated-HOME wrapper and pnpm test:evidence

**Status:** pending
**Commit:** -

---

## Phase 5: Integration — docs, generated views, release, close-out

**Status:** pending
**Started:** -

### Task p05-t01: Update docs that describe the fixed behavior

**Status:** pending
**Commit:** -

---

### Task p05-t02: Refresh this repository's generated provider views

**Status:** pending
**Commit:** -

---

### Task p05-t03: Lockstep version bump to 0.3.39

**Status:** pending
**Commit:** -

---

### Task p05-t04: Archive the delivered backlog items

**Status:** pending
**Commit:** -

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

<!-- orchestration-runs-end -->

## Reviews and Gates

<!-- Receipts for final and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

### Review Received: plan

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-10-31T230813Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

- No findings. The configured quick-start gate (`oat gate review`, artifact
  plan, threshold high, `onFailure: block`, run
  `233bfcac-2b80-4c9b-8919-8e7fb72e937d`, target `codex-6-sol-xhigh`, inline
  Codex route) reviewed plan head `b37cd7c49b32083f10e7d1794d2c9d92baa01966`
  and reported no blocking findings; envelope `status: ok`,
  `receiveEligible: true`, corroborated handoff.

**Outcome:** passed

- Gate `oat-project-quick-start` (autonomy `QS-*` gate execution): attempt 1
  of 2, `allowed/passed`, recorded in `state.md` `oat_quick_start_gate`.
- Pre-gate plan artifact review (Auto Artifact-Review Loop): three cycles with
  native `oat-reviewer-claude-opus-5-5-high`; dispositions recorded in
  `plan.md` `## Reviews`. Autonomy gates `QS-04` (straight to plan), `QS-05`
  (requirements auto-confirmed) and `QS-11` (Medium/Low fixes applied) are
  recorded in `discovery.md` and `plan.md`.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- None (quick mode; no design.md).

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
