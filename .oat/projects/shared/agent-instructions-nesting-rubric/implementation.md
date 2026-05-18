---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_current_task_id: null
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
| Phase 2 | complete | 1     | 1/1       |

**Total:** 3/3 tasks completed

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

**Status:** complete
**Started:** 2026-05-18
**Completed:** 2026-05-18

### Phase Summary

**Outcome (what changed):**

- The five lockstep public packages (`packages/cli`, `packages/control-plane`,
  `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`) were
  version-bumped together by one patch release (`0.1.0` -> `0.1.1`) to represent the
  Phase 1 `.agents/skills` content change, which counts as shipped CLI functionality per
  the repo release policy.

**Key files touched:**

- `packages/cli/package.json`, `packages/control-plane/package.json`,
  `packages/docs-config/package.json`, `packages/docs-theme/package.json`,
  `packages/docs-transforms/package.json` — `version` field only.

**Verification:**

- All five package versions equal `0.1.1` — pass.
- `pnpm release:check-versions` — pass (`version bump check passed`).
- `pnpm release:validate` — pass (release validation passed for 5 public packages).
- `pnpm lint` — pass (0 warnings, 0 errors across all packages).

### Task p02-t01: Bump Lockstep Public-Package Versions and Validate

**Status:** complete
**Commit:** 7562dcb6

**Outcome (required when completed):**

- All five lockstep public packages bumped from `0.1.0` to `0.1.1` in lockstep. All five
  packages were confirmed at `0.1.0` before the bump; a single patch increment landed all
  on the same `0.1.1` version. Only the `version` field was edited in each file.

**Files changed:**

- `packages/cli/package.json` — version `0.1.0` -> `0.1.1`
- `packages/control-plane/package.json` — version `0.1.0` -> `0.1.1`
- `packages/docs-config/package.json` — version `0.1.0` -> `0.1.1`
- `packages/docs-theme/package.json` — version `0.1.0` -> `0.1.1`
- `packages/docs-transforms/package.json` — version `0.1.0` -> `0.1.1`

**Verification:**

- Run: version-print loop over the five packages — Result: pass, all print `0.1.1`.
- Run: `pnpm release:check-versions` — Result: pass (`version bump check passed`).
- Run: `pnpm release:validate` — Result: pass (`release validation passed for 5 public
packages`; all five tgz packs validated).
- Run: `pnpm lint` — Result: pass (`Found 0 warnings and 0 errors` for all 5 packages;
  10/10 turbo tasks successful).

**Notes / Decisions:**

- The pre-commit hook emitted a non-blocking advisory (`oat: managed provider views are
out of sync - run 'oat sync --scope project'`). No skill files were touched in this
  phase; the advisory is unrelated to p02-t01 scope and the commit succeeded. Flagged for
  awareness, not action within this phase.

**Issues Encountered:**

- None.

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

### Review Received: final (code, auto-invocation)

**Date:** 2026-05-18
**Review artifact:** `reviews/final-review-2026-05-18.md`

**Findings:** 0 Critical, 0 Important, 0 Medium, 1 Minor

**Disposition (auto-disposition mode — `oat_review_invocation: auto`):** Final review
passed — zero Critical/Important/Medium. All 5 discovery Success Criteria verified met.
`final` Reviews-table row set to `passed`.

**Deferred Findings (Minor):**

- Residual "starting at depth 1–2" phrasing in the "Decomposing Broad Recommendations"
  section (`directory-assessment-criteria.md:67`). Deferred — not converted to a fix
  task. Rationale: the phrase is sweep-start guidance immediately followed by "keep
  decomposing deeper", so it is coherent with the every-depth model rather than a
  leftover gate; the reviewer assessed it non-blocking optional polish in both the p01
  phase review and the final review. Genuinely ambiguous, non-actionable finding — no
  defect to fix.

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
**Phases:** 2 of 2 executed, 2 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p01   | DONE        | pass   | 0/2            | merged      |
| p02   | DONE        | pass   | 0/2            | merged      |

#### Parallel Groups

- p01, p02: sequential (no parallel groups declared)

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

- Revised the `oat-agent-instructions-analyze` directory-assessment rubric so it no
  longer gates nested instruction-file recommendations behind a parent source-file
  count. The "more than 50 source files" entry condition is removed; no file-count
  number remains as a trigger anywhere in the rubric.
- "Distinct Domain Boundary" is now the depth-agnostic primary trigger for nested
  files (strengthened Moderate → Strong, with a nested `packages/<pkg>/src/<domain>/`
  example). Indicator 5's file count is softened to a non-threshold illustration and
  flagged as never sufficient alone.
- Decomposition now triggers on heterogeneity (distinct sub-areas), not file count.
- New "Nested Instruction Files (Progressive Specificity)" section documents the
  inherit-and-delta model and includes a worked bigquery-sync-style example.
- Exclusions reframed around "nothing distinct to capture" with an explicit
  anti-sprawl guard.
- `SKILL.md` Step 4 reframed as a per-directory walk at every depth; skill `version:`
  bumped 1.9.0 → 1.10.0; five lockstep public packages bumped 0.1.0 → 0.1.1.

**Behavioral changes (user-facing):**

- `oat-agent-instructions-analyze` will now surface a moderately sized, domain-specific
  subdirectory (e.g. ~10–20 files with distinct conventions) as a coverage-gap
  candidate for its own nested `AGENTS.md`, even when its parent package is small —
  instead of dismissing it because no app/package exceeds 50 files.

**Key files / modules:**

- `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md` — rubric rewrite
- `.agents/skills/oat-agent-instructions-analyze/SKILL.md` — Step 4 framing + version bump
- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json` — lockstep version bump

**Verification performed:**

- `pnpm lint` (10/10), `pnpm type-check` (10/10), `pnpm test` (1474 tests passed),
  `pnpm build` (5/5), `pnpm release:check-versions`, `pnpm release:validate` — all pass.
- Phase reviews p01 + p02 passed; final-scope code review passed (0 Critical/Important/
  Medium, 1 Minor deferred with rationale).

**Design deltas (if any):**

- None. The §13 cross-reference uses the bundled doc's actual section title
  "Scoped Files (When and How)" rather than design.md's em-dash phrasing — a faithful
  rendering, not a behavior change.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
