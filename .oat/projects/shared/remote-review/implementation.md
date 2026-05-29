---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-29
oat_current_task_id: p06-t01
oat_generated: false
---

# Implementation: remote-review

**Started:** 2026-05-29
**Last Updated:** 2026-05-29

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

| Phase                                         | Status   | Tasks | Completed |
| --------------------------------------------- | -------- | ----- | --------- |
| Phase 1 — Shared infrastructure helpers       | complete | 5     | 5/5       |
| Phase 2 — `oat-review-provide-remote`         | complete | 3     | 3/3       |
| Phase 3 — `oat-reviewer` extension            | complete | 1     | 1/1       |
| Phase 4 — `oat-project-review-provide-remote` | complete | 2     | 2/2       |
| Phase 5 — Receive-skill minor-default flip    | complete | 4     | 4/4       |
| Phase 6 — Backlog update + release prep       | pending  | 3     | 0/3       |

**Total:** 15/18 tasks completed

---

## Phase 1: Shared infrastructure helpers

**Status:** complete
**Started:** 2026-05-29

### Phase Summary

**Outcome (what changed):**

- Shipped five pure-logic helper modules under `packages/cli/src/review-remote/` that both provide-remote skills (p02/p04) will import. No GitHub or git side effects in this layer.
- `marker-parser`: tolerant single-line scalar parser for the HTML-comment marker block (no YAML dep); invalid 40-char head-SHA → `null`.
- `body-builder` + `mapVerdict`: builds the posted-review body and maps verdict (REQUEST_CHANGES if any critical/important, else COMMENT); round-trips through the parser.
- `line-mapper`: `parsePullFilesPatch` + `parseUnifiedDiff` + `classifyFinding` over a shared `HunkRange` shape (in-diff RIGHT/LEFT vs out-of-diff).
- `narrowing`: `pickNarrowingTarget` discriminated union with stale-SHA existence+ancestry guard via injected `GitInvoker`.
- `project-resolver`: two-level `.oat/projects/*/*/state.md` glob with `--project` override.

**Key files touched:**

- `packages/cli/src/review-remote/marker-parser.{ts,test.ts}`
- `packages/cli/src/review-remote/body-builder.{ts,test.ts}`
- `packages/cli/src/review-remote/line-mapper.{ts,test.ts}`
- `packages/cli/src/review-remote/narrowing.{ts,test.ts}`
- `packages/cli/src/review-remote/project-resolver.{ts,test.ts}`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/` → 59 tests pass (5 files)
- `pnpm lint` → 0 warnings / 0 errors; `pnpm type-check` → clean
- Reviewer (p01 gate): PASS — 0 critical, 0 important, 3 minor (advisory)

**Notes / Decisions:**

- Delegated head-SHA contract: invalid SHA → `parseMarkerBlock` returns `null` (routes to full-scope review) rather than a distinct error type.
- Omitted `oat_review_invocation` defaults to `manual`; unknown marker keys preserved on an `extras` bag (forward-compat).
- `narrowing` result carries `prompted: boolean` so the skill layer knows whether a confirm prompt is still owed; auto-narrow + stale-SHA fallback both set `prompted: false`.
- `project-resolver` `--project` accepts a dir or a `state.md` path with trailing-slash tolerance, validating existence before use.
- Reviewer minors (non-blocking, noted for p02/p04): (1) `parsePullFilesPatch` doesn't surface `previous_filename` rename field — caller threads it in; worth a code comment; (2) LEFT-side classification not directly asserted against `parsePullFilesPatch` (shared-shape test de-risks it).

### Task p01-t01: Add review-marker parser

**Status:** completed
**Commit:** 4f7932c4

### Task p01-t02: Add posted-review-body builder + verdict mapper

**Status:** completed
**Commit:** ba9a268e

### Task p01-t03: Add inline-comment line-mapping validator

**Status:** completed
**Commit:** debad68a

### Task p01-t04: Add re-review narrowing filter + stale-SHA guard

**Status:** completed
**Commit:** 41269f85

### Task p01-t05: Add project resolution helper

**Status:** completed
**Commit:** 6ade5178

---

## Phase 2: `oat-review-provide-remote` (ad-hoc rail)

**Status:** complete
**Started:** 2026-05-29

### Phase Summary

**Outcome (what changed):**

- Shipped the ad-hoc remote-review skill `oat-review-provide-remote` plus two supporting helpers under `packages/cli/src/review-remote/`.
- `capability-probe`: injectable probe + opt-in cache; empirically resolved the design Open Question — `agent-reviews@1.0.2` has NO review-posting flow (read/reply only), so `gh api` is the posting path. Forward-compat flag recognition ships so a future `agent-reviews` posting flow is picked up without a code change.
- `worktree`: `acquireWorktree`/`runInWorktree`/`releaseWorktree` — repo-scoped `git -C "$repo_root" worktree add --detach`, ephemeral path outside repo root, leak-proof idempotent teardown (prune + rm) in a `finally`, caller cwd untouched.
- `SKILL.md`: PR resolution → hybrid read (worktree mechanics) → marker-based re-review narrowing → inline review → body-builder → posting via `gh api --input -` JSON payload (after the review fix) → cleanup.

**Key files touched:**

- `packages/cli/src/review-remote/capability-probe.{ts,test.ts}`
- `packages/cli/src/review-remote/worktree.{ts,test.ts}`
- `packages/cli/src/review-remote/__integration__/ad-hoc/round-trip.test.ts`
- `.agents/skills/oat-review-provide-remote/SKILL.md` (version 1.0.1)

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/` → 76 tests pass (8 files)
- `pnpm lint` 0/0; `pnpm type-check` clean; `pnpm oat:validate-skills` OK (50 skills)
- Reviewer (p02 gate): FAIL → fix iteration 1 → PASS. Final: 0 critical, 0 important, 1 minor (non-blocking).

**Notes / Decisions:**

- Posting payload fix (review-driven): documented command builds the full JSON review payload (`event` + `body` + `comments[]` of `{path, line, side, body}`) via `jq -n` piped through `gh api ... --input -`. `--field` cannot express nested object arrays. `event` = REQUEST_CHANGES if any critical/important else COMMENT; out-of-diff findings downgrade to the top-level body (not dropped); body-only review uses `comments: []`.
- `acquireWorktree` now cleans up (prune + rm) on `git worktree add` failure before rethrowing.
- Empirical capability finding recorded under Deviations (design Open Question resolved).

### Task p02-t01: Probe and capability matrix for `agent-reviews`

**Status:** completed
**Commit:** bb7b1d76 (+ fix 0c795dd9)

### Task p02-t02: Worktree lifecycle helper

**Status:** completed
**Commit:** 80334504 (+ fix bb77bfa1)

### Task p02-t03: Author `oat-review-provide-remote` SKILL.md and wire process

**Status:** completed
**Commit:** e329def4 (+ fix c8f4ee1c)

---

## Phase 3: `oat-reviewer` subagent contract extension

**Status:** complete
**Started:** 2026-05-29

### Phase Summary

**Outcome (what changed):**

- Added a `## Structured-Output Mode` section to `.agents/agents/oat-reviewer.md`: when dispatched with `oat_output_mode: structured`, the reviewer returns a `StructuredFindings` object (matching design Data Models) instead of writing a review artifact, and MUST NOT write under `reviews/`. Review logic (checklist, severity model, alignment checks) is unchanged; only the output sink branches.
- Default (flag-absent) path is byte-for-byte unchanged — confirmed by review diff — so the orchestrator's per-phase-gate dispatches are unaffected.
- `version:` bumped 1.0.2 → 1.1.0 (additive, backward-compatible).

**Key files touched:**

- `.agents/agents/oat-reviewer.md` (version 1.1.0)

**Verification:**

- `pnpm oat:validate-skills` OK (50 skills); `pnpm lint` 0/0
- Reviewer (p03 gate): PASS — 0 critical, 0 important, 2 minor (advisory)

**Notes / Decisions:**

- Flag name `oat_output_mode: structured` chosen — plan-recommended, parallels existing `oat_review_invocation` naming, and reuses an established repo key name. p04's Tier-1 dispatch wrapper consumes this contract.

### Task p03-t01: Extend `oat-reviewer` with structured-output mode

**Status:** completed
**Commit:** 360d2026

---

## Phase 4: `oat-project-review-provide-remote` (project rail)

**Status:** complete
**Started:** 2026-05-29

### Phase Summary

**Outcome (what changed):**

- `reviewer-dispatch.ts`: Tier-1 dispatch wrapper that builds the `oat_output_mode: structured` payload (verified against the p03 oat-reviewer contract), validates the full `StructuredFindings` shape (severity enum; file+line both-or-neither-null; verification_commands string array) raising a typed `StructuredFindingsError`, and surfaces dispatcher errors without retry (Tier 2/3 fallback is the skill's responsibility). Hand-rolled validator (no new dep).
- `oat-project-review-provide-remote/SKILL.md` (new, project rail): project resolution (diff scan `.oat/projects/*/*/state.md` + `--project` override) → hybrid read (worktree) → re-review narrowing scoped by `(project, scope)` with stale-SHA guard → Tier 1/2/3 dispatch (Tier 1 via reviewer-dispatch structured output) → body-builder with project markers → posting via `jq`-built JSON through `gh api --input -`. Read-only contract (no plan.md updates / no commits / no pushes from machine B) enforced in Mode Assertion, Self-Correction, and Success Criteria.

**Key files touched:**

- `packages/cli/src/review-remote/reviewer-dispatch.{ts,test.ts}`
- `packages/cli/src/review-remote/__integration__/project/project-rail.test.ts`
- `.agents/skills/oat-project-review-provide-remote/SKILL.md` (version 1.0.0)

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/` → 97 tests pass (10 files; +21 from p02 end, no regression)
- `pnpm lint` 0/0; `pnpm type-check` clean; `pnpm oat:validate-skills` OK (51 skills)
- Reviewer (p04 gate): PASS — 0 critical, 0 important, 2 minor (advisory)

**Notes / Decisions:**

- Hand-rolled `StructuredFindings` validator chosen over zod (zod is a dep, but the p01/p02 helpers are zero-runtime-dep; kept the typed-error contract explicit and module-cohesive).

### Task p04-t01: Tier-1 dispatch wrapper for `oat-reviewer` structured-output mode

**Status:** completed
**Commit:** 8bf7737a

### Task p04-t02: Author `oat-project-review-provide-remote` SKILL.md and wire process

**Status:** completed
**Commit:** e0e63f18

---

## Phase 5: Receive-skill minor-default flip

**Status:** complete
**Started:** 2026-05-29

### Phase Summary

**Outcome (what changed):**

- Flipped the default disposition for MINOR findings from `defer` to `convert` (fix inline) across all four receive skills, and extended the "defer requires rationale" gate to ALL severities (defer/dismiss at any severity, minor included, now requires concrete rationale). This brings the manual receive path in line with the auto-spawned-review path, which already converts minors.
- Auto-disposition branch (`oat_review_invocation: auto` in `oat-project-review-receive`) preserved byte-for-byte; only the stale parenthetical describing manual mode was corrected.
- Final-scope explicit per-finding minor disposition + hard `passed` guard preserved; only the recommended default leans `convert`.
- Stale output-summary line corrected (review-driven fix) so closeout prose matches the new policy.

**Key files touched:**

- `.agents/skills/oat-review-receive/SKILL.md` (v1.4.0)
- `.agents/skills/oat-review-receive-remote/SKILL.md` (v1.3.0)
- `.agents/skills/oat-project-review-receive/SKILL.md` (v1.5.1)
- `.agents/skills/oat-project-review-receive-remote/SKILL.md` (v1.4.0)

**Verification:**

- `pnpm oat:validate-skills` OK (50 skills); `pnpm lint` 0/0
- Reviewer (p05 gate): FAIL (1 important — stale summary line) → fix iteration 1 → PASS. Final: 0 critical, 0 important, 0 minor.

**Notes / Decisions:**

- Per-file wording adapted to each skill's idiom (some had explicit `defer (default for minor)`, others a conditional phrasing) but the resulting behavior is uniform across the rail.

### Task p05-t01: Flip minor default in `oat-review-receive`

**Status:** completed
**Commit:** df44c77a

### Task p05-t02: Flip minor default in `oat-review-receive-remote`

**Status:** completed
**Commit:** bdbe283b

### Task p05-t03: Flip minor default in `oat-project-review-receive`

**Status:** completed
**Commit:** 383f5b04 (+ fix c313c3b3)

### Task p05-t04: Flip minor default in `oat-project-review-receive-remote`

**Status:** completed
**Commit:** 9a4a7013

---

## Phase 6: Backlog update + lockstep release prep

**Status:** pending
**Started:** -

### Task p06-t01: Update `bl-9fb8` backlog item

**Status:** pending
**Commit:** -

### Task p06-t02: Lockstep public-package version bump

**Status:** pending
**Commit:** -

### Task p06-t03: Final `release:validate` + handoff

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-05-29

**Branch:** feat/remote-review-provide-skills
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 5 executed, 5 passed, 0 failed, 0 stopped (run in progress)

#### Phase Outcomes

| Phase | Implementer | Review    | Fix Iterations | Disposition                                  |
| ----- | ----------- | --------- | -------------- | -------------------------------------------- |
| p01   | DONE        | pass      | 0/2            | merged (sequential, on orchestration branch) |
| p02   | DONE        | fail→pass | 1/2            | merged (sequential, on orchestration branch) |
| p03   | DONE        | pass      | 0/2            | merged (sequential, on orchestration branch) |
| p05   | DONE        | fail→pass | 1/2            | merged (sequential, on orchestration branch) |
| p04   | DONE        | pass      | 0/2            | merged (sequential, on orchestration branch) |

#### Parallel Groups

- Plan declared `[p02, p03, p05]` as a parallel group. User elected sequential execution on the orchestration branch (file-disjoint → identical result; avoids 3× worktree bootstrap cost in this nested-worktree env + fan-in merge risk). Each phase still runs its own implementer + reviewer gate.
- p01: sequential.

#### Dispatch Notes

- Dispatch: all phases via Claude Code Tier 1, model_axis=selected:opus, effort_axis=not-applicable, ceiling=opus (project state). No escalation needed.
- p02 required one fix iteration (reviewer FAIL on the posting-command Important finding → fixed → PASS).

#### Outstanding Items

- Provider views out of sync after new/changed skills (`oat sync` warning). Deferred to a single consolidated `oat sync --scope all` before p06 release validation, since p03/p04/p05 also change skill/agent files.

#### Artifact / Design Deltas

| Task / Review | Source Artifact                                             | Planned / Documented                                          | Actual / Accepted                                                                                               | Reason                                        | Source of Truth                | Follow-up                                                       |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| p02-t01       | design.md Open Questions (agent-reviews posting capability) | "Does `npx agent-reviews` expose a post-review command?" open | `agent-reviews@1.0.2` has NO posting flow (read/reply only); `gh api` is the posting path; probe forward-compat | Empirically probed `npx agent-reviews --help` | implementation (probe + skill) | None — design Open Question resolved; gh api path authoritative |

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress. Append per session.

---

## Reviews Received

### Review Received: design

**Date:** 2026-05-29
**Review artifact:** `reviews/archived/artifact-design-review-2026-05-29.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 1
- Minor: 2

**Disposition:** All 4 findings resolved in artifact (no plan tasks created):

- `I1` worktree creation precision → resolved in `design.md` Data Flow step 2.
- `M1` stale-SHA / force-push guard for re-review narrowing → resolved in `design.md` Component Design (both rails) + new Error Handling subsection.
- `m1` manual-verification wrong-path split → resolved in `design.md` Testing Strategy → Manual Verification.
- `m2` state.md body prose stale → resolved in `state.md` body.

### Review Received: plan

**Date:** 2026-05-29
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-29.md`

**Findings:**

- Critical: 0
- Important: 2
- Medium: 1
- Minor: 2

**Disposition:** All 5 findings resolved in artifact (no plan tasks created):

- `I1` filtered vitest commands used repo-root paths → resolved in `plan.md` (30 occurrences fixed to package-relative `src/...` paths).
- `I2` implementation tracker was scaffold despite plan being ready for implementation → resolved by populating this file with the actual 6-phase / 18-task structure.
- `M1` p02 write-set proof inaccurate → resolved in `plan.md` Parallelism section (enumerated p02 helper files; restated parallel-group disjointness).
- `m1` `discovery.md` frontmatter still `in_progress` → resolved by flipping to `complete` + `oat_ready_for: oat-project-quick-start`.
- `m2` "Ready for code review and merge" wording → resolved by future-tensing in `plan.md` Implementation Complete.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact                                             | Planned / Documented                                          | Actual / Accepted                                                                                               | Reason                                        | Source of Truth                | Follow-up                                                       |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| p02-t01       | design.md Open Questions (agent-reviews posting capability) | "Does `npx agent-reviews` expose a post-review command?" open | `agent-reviews@1.0.2` has NO posting flow (read/reply only); `gh api` is the posting path; probe forward-compat | Empirically probed `npx agent-reviews --help` | implementation (probe + skill) | None — design Open Question resolved; gh api path authoritative |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |
| 3     | -         | -      | -      | -        |
| 4     | -         | -      | -      | -        |
| 5     | -         | -      | -      | -        |
| 6     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {filled when project is complete}

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
- Discovery: `discovery.md`
