---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-27
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: backlog-wave-2

**Started:** 2026-09-27
**Last Updated:** 2026-09-27

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, fill the Final Summary (for PR/docs) section below with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 6     | 0/6       |
| Phase 2 | pending     | 6     | 0/6       |
| Phase 3 | pending     | 3     | 0/3       |
| Phase 4 | pending     | 2     | 0/2       |
| Phase 5 | pending     | 6     | 0/6       |

**Total:** 8/25 tasks completed

---

## Phase 1: AGENTS.md guidance

**Status:** complete
**Started:** 2026-09-27

### Task p01-t01: Give each unsafe-directory variant its own outside directory

**Status:** completed
**Commit:** 8d84a43cf

---

### Task p01-t02: Append absent managed blocks to an existing AGENTS.md

**Status:** completed
**Commit:** 005f84b58

---

### Task p01-t03: Print guidance once and prove the fresh-repo sequence

**Status:** completed
**Commit:** 27de0e30e

---

### Task p01-t04: Make every --project-guidance consumer act or reject

**Status:** completed
**Commit:** c73970479

---

### Task p01-t05: Add read-only guidance emission and fix the oat-doctor hint

**Status:** completed
**Commit:** 2dfc72266

---

### Task p01-t06: Name only installed pack locations in the guidance block

**Status:** completed
**Commit:** 6aa11df62

---

### Task p01-t07: (review) Close p01 review findings M1, M2, L1-L4

**Status:** completed
**Commit:** 1ea888506

---

### Task p01-t08: (review) Close p01 round-2 Low findings L1-L3

**Status:** completed
**Commit:** bb44a14ff

---

## Phase 2: CLAUDE.md shims

**Status:** in_progress
**Started:** 2026-09-28

### Task p02-t01: Persist a configurable instruction sync strategy

**Status:** pending
**Commit:** -

---

### Task p02-t02: Stop creating shims and remove OAT-managed shims under none

**Status:** pending
**Commit:** -

---

### Task p02-t03: Warn about leftover CLAUDE.md files and adopt strays without shims

**Status:** pending
**Commit:** -

---

### Task p02-t04: Update doctor, instructions skills, and provider detection

**Status:** pending
**Commit:** -

---

### Task p02-t05: Document the no-shim default and the pjm init hint

**Status:** pending
**Commit:** -

---

### Task p02-t06: Drop this repository's shims

**Status:** pending
**Commit:** -

---

## Phase 3: Lifecycle skill routing and bookkeeping

**Status:** pending
**Started:** -

### Task p03-t01: Route quick-mode discovery rows straight to quick-start

**Status:** pending
**Commit:** -

---

### Task p03-t02: Record absorbed projects in Lite consolidations

**Status:** pending
**Commit:** -

---

### Task p03-t03: Commit phase bookkeeping before per-phase review dispatch

**Status:** pending
**Commit:** -

---

## Phase 4: Agent roles and recon validation

**Status:** pending
**Started:** -

### Task p04-t01: Repair bare fences outside .agents/skills and extend the scanner

**Status:** pending
**Commit:** -

---

### Task p04-t02: Validate recon assignment envelopes before launch

**Status:** pending
**Commit:** -

---

## Phase 5: CI and backlog tooling, release fan-in

**Status:** pending
**Started:** -

### Task p05-t01: Give packages/control-plane a check script

**Status:** pending
**Commit:** -

---

### Task p05-t02: Rewrite inbound references when a backlog item is archived

**Status:** pending
**Commit:** -

---

### Task p05-t03: Record ten uncached runs of the collection-detach test

**Status:** pending
**Commit:** -

---

### Task p05-t04: Bump the lockstep public package versions

**Status:** pending
**Commit:** -

---

### Task p05-t05: Archive the shipped backlog items

**Status:** pending
**Commit:** -

---

### Task p05-t06: Run the full Definition of Done

**Status:** pending
**Commit:** -

---

## Orchestration Runs

### Run 1

- Started: 2026-09-27; autonomous (`oat-project-autonomous`), Tier 1 subagents.
- Gate `IMPLEMENT-03`: HiLL checkpoints resolved to `['p05']` (final phase,
  first run, field absent) with `oat_auto_review_at_hill_checkpoints: true`.
- Gate `IMPLEMENT-08`: not needed; Claude Code Task-tool dispatch of the
  generated `oat-phase-implementer` and `oat-reviewer` variants is available
  without extra authorization.
- Phase review gate: `oat_phase_review_gate` enabled for every phase
  (`review_type: code`, `exit_nonzero_on: high`), configured target resolves
  to `codex-6-sol-xhigh`.
- Dispatch policy: managed `high` from project state; implementer and reviewer
  launches use the resolver-returned Claude variants after a validation-only
  `oat project dispatch record` (`status: validated-only`) with the branch CLI,
  because the installed 0.3.7 CLI lacks `canonical-role`.

### Phase p01 dispatch

- Request `bw2-p01-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `8d84a43cf..6aa11df62` (p01-t01..t06), phase verification pass, recovery
  0/10. `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Request `bw2-p01-review-1`: accepted; target
  `oat-reviewer-claude-claude-opus-5-5-high`; reconnaissance not-attempted;
  `reviews/archived/p01-review-2026-09-27T235828Z.md`: 0 Critical, 0 High,
  2 Medium, 4 Low (passes the phase threshold). Received in auto-disposition
  mode: all six converted to `p01-t07`. `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`
- Continuation `cont-backlog-wave-2-p01-fix-1` (same handle, fix mode):
  `1ea888506` closed M1 (link count above 1 takes the manual patch, at planning
  and after open), M2 (zero-pack guidance is `skipped`, exit 0), L1 (real cause
  plus patch; partial writes distinguished), L2 (`O_NONBLOCK`, non-regular
  refused), L3 (doctor wording), L4 (test title); failing-first and
  neutralize-and-restore evidence in the commit body; 2492 tests green.
- Request `bw2-p01-review-2` (round 2, `oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted): `reviews/archived/p01-review-2026-09-28T000859Z.md`
  passed with 0 Critical/High/Medium; all six round-1 findings verified fixed;
  three new Lows converted to `p01-t08`. The M2 fix landed in
  `init/tools/index.ts` rather than the plan's `init/index.ts` (plan wording
  only).
- Continuation `cont-backlog-wave-2-p01-fix-2`: `bb44a14ff` closed round-2
  L1 (refusal header names the cause via `appendRefusal`), L2 (`EISDIR`,
  `ENOTDIR`, `EMLINK` open errors report an identity change), L3
  (`oat tools guidance` with no packs prints a note; `--json` status
  `no-packs`); 2557 tests green.
- Phase gate (`codex-6-sol-xhigh`, inline Codex runtime, `exit_nonzero_on: high`):
  `reviews/archived/p01-review-2026-09-28T001719Z.md` status `ok`, receive-eligible, 0 Critical/High, 1
  Medium. Judgment sweep: M1 (concurrent invocations can append the same
  absent block twice, leaving duplicate markers that block later runs)
  deferred to final; see Deferred Findings (Medium).
- Phase p01 outcome: pass after 2 fix rounds (p01-t07, p01-t08); 8/8 tasks.
- Implementer-reported deviations: evidence lives in commit bodies (root owns
  `implementation.md`); the e2e legacy-workflows-block cases stay
  `manual-required` (control (f)); no test pinned oat-doctor 2.0.1.

### Phase p02 dispatch

- Request `bw2-p02-impl-1`: accepted, returned `DONE_WITH_CONCERNS`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `e90c64783..5d54d89c6` (p02-t01..t06); declared phase verification pass
  (2463 tests); full CLI suite fails one file. `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

### Recovery Event bw2-p02-rec-1

- Phase/task: p02 / p02-t01
- Original request: bw2-p02-impl-1
- Original commit: e90c64783
- Defect class: test
- Discovered by: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run` (full CLI suite)
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: -
- Verification: declared phase checks pass; `src/commands/tools/update/config-write.test.ts` fails at import because its partial `@config/oat-config` mock lacks the new `DEFAULT_INSTRUCTION_SYNC_STRATEGY` export used by `config/resolve.ts`.
- Reason: the root brief forbade `state.md` edits, which conflicts with the recovery contract's implementer-owned ledger reservation; no reservation, edit, or commit was made. Root direction: the brief conflict was a root error; the narrow `oat_phase_recovery_policy` ledger write is authorized, and the correction is bounded to the failing test's mock (build it on the real module).

## Implementation Log

Chronological log of implementation progress.

### 2026-09-27

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

### 2026-09-27

**Session Start:** {time}

{Continue log...}

---

## Plan Gate Feedback (quick-start, QS-12)

The configured quick-start gate (`oat-project-quick-start`, `onFailure: block`,
`maxAttempts: 2`, target `codex-6-sol-xhigh`, inline Codex runtime) blocked on
both attempts; every finding was resolved in `plan.md`:

- Attempt 1 (`reviews/archived/artifact-plan-review-2026-09-27T150947Z.md`):
  H1 re-verify identity and exact managed content at apply time before removing
  a CLAUDE.md shim (with changed-content and symlink-replacement controls); H2
  make leftover CLAUDE.md detection repository-wide and independent of the
  mutation exclusions at sync, `--json`, validate, and doctor; M1 accept `none`
  only in the same task as its behavior (p02-t02).
- Attempt 2 (`reviews/archived/artifact-plan-review-2026-09-27T151608Z.md`):
  H1 open the existing `AGENTS.md` with `O_WRONLY | O_APPEND | O_NOFOLLOW`
  (the flags as written opened read-only and failed with `EBADF`), plus a
  real-filesystem success assertion.

Attempts are exhausted, so plan readiness is an operator decision. Operator
decision (2026-09-27): proceed to implementation with the findings resolved in
the plan.

## Deferred Findings (Medium)

- p01 gate M1 (`reviews/archived/p01-review-2026-09-28T001719Z.md`): two concurrent guidance invocations
  can both pass the absent-block check and append the same managed block
  twice; the duplicate markers make later runs return `blocked` until the file
  is repaired by hand. Deferred because a correct fix needs cross-process
  coordination on `AGENTS.md` (a lock file plus a re-read under the lock),
  which is larger than a sweep fix; the pre-wave behavior never wrote an
  existing file, and concurrent `oat` guidance runs against one checkout are
  rare. Resurface at final review; if not fixed in-wave, file a backlog item.

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
