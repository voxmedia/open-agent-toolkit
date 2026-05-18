---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: agent-instructions-nesting-rubric

**Started:** 2026-05-18
**Last Updated:** 2026-05-18

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

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 2     | 2/2       |
| Phase 2 | pending  | 1     | 0/1       |

**Total:** 2/3 tasks completed

---

## Phase 1: Revise the Rubric and Skill Framing

**Status:** complete
**Started:** 2026-05-18
**Completed:** 2026-05-18

### Phase Summary

**Outcome (what changed):**

- The `oat-agent-instructions-analyze` directory-assessment rubric no longer gates nested
  instruction-file recommendations behind a parent source-file count; the 50-source-file
  entry condition is removed and no file-count number remains as a trigger.
- "Distinct Domain Boundary" is now the depth-agnostic primary trigger for nested files,
  with a worked bigquery-sync-style example and a new "Nested Instruction Files
  (Progressive Specificity)" section documenting the inherit-and-delta model.
- An explicit anti-sprawl guard prevents over-recommending files for large but homogeneous
  directories; decomposition now triggers on heterogeneity.
- SKILL.md Step 4 reframed as a per-directory walk at every depth; skill `version:`
  bumped 1.9.0 -> 1.10.0.

**Key files touched:**

- `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md` -
  rubric rewrite (Components 1-5)
- `.agents/skills/oat-agent-instructions-analyze/SKILL.md` - Step 4 framing + version bump

**Verification:**

- Run: `grep -n '50' .../directory-assessment-criteria.md` — pass (no occurrences).
- Run: `grep -n '^version:' .../SKILL.md` — pass (`version: 1.10.0`).
- Run: `pnpm exec oxfmt --check` on both files — pass (formatting clean).
- Scenario walkthroughs (positive / anti-sprawl / decomposition) — pass.

**Notes / Decisions:**

- §13 cross-reference uses the doc's actual section title "Scoped Files (When and How)".
- Artifact template `analysis-artifact-template.md` Directory Coverage table is generic;
  no edit required, consistent with the plan's expected outcome.

### Task p01-t01: Rewrite directory-assessment-criteria.md

**Status:** complete
**Commit:** 0a5c2ffe

**Outcome (required when completed):**

- The rubric no longer gates nested instruction-file recommendations behind a parent
  source-file count. The "more than 50 source files" entry condition is removed entirely
  and no file-count number remains as a trigger anywhere in the doc.
- Indicator 4 (Distinct Domain Boundary) is now the depth-agnostic primary trigger for
  nested files, strengthened from "Moderate" to "Strong", with a nested
  `packages/<pkg>/src/<domain>/` example.
- Indicator 5 softened: "10+ files" is a loose illustration; file count is explicitly
  never sufficient alone.
- New "Nested Instruction Files (Progressive Specificity)" section documents the
  inherit-and-delta model, cross-references `agent-instruction.md` §13, and includes a
  bigquery-sync-style worked example.
- "Large Directory Decomposition" renamed to "Decomposing Broad Recommendations";
  decomposition now triggers on heterogeneity, not file count.
- Exclusions reframed around "nothing distinct to capture"; an explicit anti-sprawl line
  added.

**Files changed:**

- `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md` -
  rewrite per design Components 1-5

**Verification:**

- Run: `grep -n '50' .agents/skills/.../directory-assessment-criteria.md`
- Result: pass — no occurrences (exit 1).
- Run: `pnpm exec oxfmt --check .agents/skills/.../directory-assessment-criteria.md`
- Result: pass — formatting clean.
- Scenario walkthrough: pass — positive (nested domain surfaced), anti-sprawl (mirror
  directory excluded), and decomposition (heterogeneity-driven) all behave as designed.
- Artifact template check: `analysis-artifact-template.md` Directory Coverage table is
  generic (no app/package assumption) — no edit needed, matching plan expectation.

**Notes / Decisions:**

- §13 cross-reference uses the doc's actual section title "Scoped Files (When and How)"
  (parentheses), not the em-dash form in design.md, so the reference resolves.

**Issues Encountered:**

- None.

---

### Task p01-t02: Update SKILL.md Step 4 Framing and Bump Skill Version

**Status:** complete
**Commit:** 02887cc5

**Outcome (required when completed):**

- Step 4 ("Assess Coverage Gaps") now explicitly states the directory walk is
  per-directory at every depth, descends recursively into subdirectories, and treats
  nested domain subdirectories (`packages/<pkg>/src/<domain>/`) as in scope with the same
  primary indicators as top-level packages. Delta-mode/full-mode scoping,
  provider-baseline checks, and chained-recommendation guidance are unchanged.
- Skill frontmatter `version:` bumped 1.9.0 -> 1.10.0 (covers all skill content changes
  in this branch's PR diff).

**Files changed:**

- `.agents/skills/oat-agent-instructions-analyze/SKILL.md` - Step 4 framing + version bump

**Verification:**

- Run: `grep -n '^version:' .agents/skills/.../SKILL.md`
- Result: pass — `version: 1.10.0`.
- Run: `pnpm exec oxfmt --check .agents/skills/.../SKILL.md`
- Result: pass — formatting clean.
- Consistency: Step 4 wording and `directory-assessment-criteria.md` agree (both describe
  per-directory assessment at every depth); criteria doc filename unchanged so the
  References section still resolves.

**Notes / Decisions:**

- None.

---

## Phase 2: Release Bookkeeping

**Status:** pending
**Started:** -

### Task p02-t01: Bump Lockstep Public-Package Versions and Validate

**Status:** pending
**Commit:** -

---

## Review Notes

### Review Received: design + plan (artifact)

**Date:** 2026-05-18
**Review artifacts:**

- `reviews/archived/artifact-design-review-2026-05-18.md` (scope: design)
- `reviews/archived/artifact-plan-review-2026-05-18.md` (scope: plan)

**Findings (both reviews):**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Disposition:** Both artifact reviews passed with zero findings. No artifact
edits and no fix tasks required. `design` and `plan` Reviews-table rows set to
`passed`. Review cycle 1 of 3 for each scope.

**Next:** Proceed to `oat-project-implement` to execute the 3-task plan.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-05-18

**Branch:** fix/agent-instructions-nesting-heuristic
**Tier:** 1 (subagents)
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 of 2 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p01   | DONE        | pass   | 0/2            | merged      |

#### Parallel Groups

- p01: sequential (no parallel groups declared)

#### Outstanding Items

- p01 review recorded 1 Minor finding (non-blocking): leftover "depth 1-2" phrasing
  in the "Decomposing Broad Recommendations" section, carried over from the removed
  gated section. It is depth guidance, not a size trigger. Deferred for final-review
  consideration. Artifact: `reviews/p01-review-2026-05-18.md`.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-05-18

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

### 2026-05-18

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

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
