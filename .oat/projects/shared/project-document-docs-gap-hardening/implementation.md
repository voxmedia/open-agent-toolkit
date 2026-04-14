---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-14
oat_current_task_id: p03-t05
oat_generated: false
---

# Implementation: project-document-docs-gap-hardening

**Started:** 2026-04-14
**Last Updated:** 2026-04-14

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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 2     | 2/2       |
| Phase 2 | complete    | 2     | 2/2       |
| Phase 3 | in_progress | 5     | 4/5       |

**Total:** 8/9 tasks completed

---

## Phase 1: Skill Hardening

**Status:** complete
**Started:** 2026-04-14

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- `oat-project-document` now requires a capability coverage pass before file-level recommendations.
- The skill now tells agents to recommend new docs pages or directories when a shipped capability has no natural home in the docs app.

**Key files touched:**

- `.agents/skills/oat-project-document/SKILL.md` - expanded the verification and delta-assessment contract

**Verification:**

- Run: `git diff --check -- .agents/skills/oat-project-document/SKILL.md`
- Result: pass

**Notes / Decisions:**

- Quick-mode implementation started directly after planning because the fix direction was already clear.
- The hardening stays scoped to project-driven capability discovery rather than turning `oat-project-document` into a general docs-analysis replacement.

### Task p01-t01: Add capability coverage discovery to `oat-project-document`

**Status:** completed
**Commit:** -

**Outcome (required when completed):**

- Added a targeted capability-inventory pass so `oat-project-document` can discover undocumented shipped capability areas and recommend `CREATE` actions for new docs pages or directories.

**Files changed:**

- `.agents/skills/oat-project-document/SKILL.md` - expanded Step 3 through Step 7 to include capability coverage assessment and stronger `CREATE` guidance

**Verification:**

- Run: `rg -n "capability|new page|new directory|no coverage|thin coverage" .agents/skills/oat-project-document/SKILL.md`
- Result: pass

**Notes / Decisions:**

- Reused the coverage-gap framing from `oat-docs-analyze` but kept the scope anchored to project artifacts and adjacent high-signal evidence.

---

### Task p01-t02: Align the skill contract with skill-governance requirements

**Status:** completed
**Commit:** -

**Outcome (required when completed):**

- Bumped the canonical skill version and aligned the recommendation fields with the stronger evidence expectations.

**Files changed:**

- `.agents/skills/oat-project-document/SKILL.md` - version bump and recommendation metadata additions

**Verification:**

- Run: `sed -n '1,20p' .agents/skills/oat-project-document/SKILL.md`
- Result: pass

---

## Phase 2: Docs And Verification

**Status:** complete
**Started:** 2026-04-14

### Task p02-t01: Update OAT docs that describe project-document behavior

**Status:** completed
**Commit:** -

**Outcome (required when completed):**

- Updated the OAT docs pages so they describe `oat-project-document` as capable of identifying missing coverage for new capability areas and recommending new docs surfaces.

**Files changed:**

- `apps/oat-docs/docs/workflows/projects/lifecycle.md` - lifecycle description of project-document
- `apps/oat-docs/docs/docs-tooling/workflows.md` - docs-workflow description of project-document

**Verification:**

- Run: `rg -n "newly shipped capability areas|new docs pages or directories" apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md`
- Result: pass

---

### Task p02-t02: Run focused verification and record the implementation state

**Status:** completed
**Commit:** -

**Outcome (required when completed):**

- Verified the edited files are clean and recorded the finished project state in the OAT artifacts.

**Files changed:**

- `.oat/projects/shared/project-document-docs-gap-hardening/implementation.md` - completed execution record
- `.oat/projects/shared/project-document-docs-gap-hardening/state.md` - marked implementation complete

**Verification:**

- Run: `git diff --check -- .agents/skills/oat-project-document/SKILL.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md .oat/projects/shared/project-document-docs-gap-hardening`
- Result: pass

---

## Phase 3: Review Fixes

**Status:** in_progress
**Started:** 2026-04-14

### Task p03-t01: (review) Bump lockstep public package versions

**Status:** completed
**Commit:** 3ec16476

**Outcome (required when completed):**

- Bumped the five lockstep public packages to `0.0.36` so the skill/docs change set satisfies the publishable-package version policy.

**Files changed:**

- `packages/cli/package.json` - bumped public package version
- `packages/control-plane/package.json` - bumped public package version
- `packages/docs-config/package.json` - bumped public package version
- `packages/docs-theme/package.json` - bumped public package version
- `packages/docs-transforms/package.json` - bumped public package version

**Verification:**

- Run: `rg -n '"version"' packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json`
- Result: pass; all five packages now show `0.0.36`

**Notes / Decisions:**

- Also repaired plan frontmatter drift so the implementation plan is explicitly runnable (`oat_status: complete`) and the repo-level auto-review preference is recorded in plan frontmatter.

---

### Task p03-t02: (review) Add success criteria for capability coverage guarantees

**Status:** completed
**Commit:** bfdbb90c

**Outcome (required when completed):**

- Updated the `## Success Criteria` section so it explicitly guarantees capability coverage classification and `CREATE` recommendations when no existing docs surface fits.

**Files changed:**

- `.agents/skills/oat-project-document/SKILL.md` - added success criteria bullets for coverage-state classification and missing-surface `CREATE` guidance

**Verification:**

- Run: `sed -n '537,555p' .agents/skills/oat-project-document/SKILL.md`
- Result: pass

**Notes / Decisions:**

- Kept the new bullets phrased in the same vocabulary already used by the body of the skill contract so the success criteria read like a concise audit list rather than a reworded duplicate.

---

### Task p03-t03: (review) Harmonize coverage-state terminology casing

**Status:** completed
**Commit:** d8a71e55

**Outcome (required when completed):**

- Normalized the three coverage-state labels in `oat-project-document` so they use the same casing as the equivalent states in `oat-docs-analyze`.

**Files changed:**

- `.agents/skills/oat-project-document/SKILL.md` - changed `Adequately covered` / `Thin coverage` / `No coverage` to the lowercase form used by the docs-analysis skill

**Verification:**

- Run: `rg -n "adequately covered|thin coverage|no coverage" .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-docs-analyze/SKILL.md`
- Result: pass

**Notes / Decisions:**

- Kept the harmonization minimal and textual only; no recommendation logic changed.

---

### Task p03-t04: (review) Wire or remove the unused docs-audience field

**Status:** completed
**Commit:** 758d4afa

**Outcome (required when completed):**

- Threaded the audience signal through the coverage-gap and recommendation schema so the Step 3 audience field is now consumed downstream instead of being dead metadata.

**Files changed:**

- `.agents/skills/oat-project-document/SKILL.md` - removed the unused "likely docs audience" wording and added audience to the coverage-gap finding / recommendation schema

**Verification:**

- Run: `rg -n "audience|docs surface versus" .agents/skills/oat-project-document/SKILL.md`
- Result: pass

**Notes / Decisions:**

- Chose to wire the field through rather than remove audience entirely because it gives the skill a clearer basis for choosing the right docs home.

---

### Task p03-t05: (review) Add lifecycle cross-link in docs workflows page

**Status:** pending
**Commit:** -

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-04-14

**Session Start:** 18:50 UTC

- [x] p01-t01: Add capability coverage discovery to `oat-project-document`
- [x] p01-t02: Align the skill contract with skill-governance requirements
- [x] p02-t01: Update OAT docs that describe project-document behavior
- [x] p02-t02: Run focused verification and record the implementation state

**What changed (high level):**

- Hardened `oat-project-document` so it evaluates capability coverage and can recommend new docs pages or directories.
- Updated user-facing OAT docs to match the stronger post-implementation docs-sync behavior.

**Decisions:**

- Treat this as a bounded workflow fix and skip lightweight design.
- Keep the hardening evidence-based and project-scoped instead of broadening the skill into a general repo docs auditor.

**Follow-ups / TODO:**

- None remaining for this implementation pass

**Blockers:**

- Local `pnpm run cli -- ...` path is failing in this worktree, so verification must avoid depending on that path.

### 2026-04-14

**Session Start:** 20:00 UTC

- [x] p03-t01: (review) Bump lockstep public package versions - `3ec16476`
- [ ] p03-t02: (review) Add success criteria for capability coverage guarantees - next

**What changed (high level):**

- Applied the lockstep package version bump required by AGENTS for shipped skill/docs changes.
- Repaired plan frontmatter so the implementation run is on a valid, explicit configuration.

**Decisions:**

- Recorded `oat_auto_review_at_checkpoints: true` in the plan because repo config already enables it and the field was previously missing from this project plan.

**Follow-ups / TODO:**

- Finish the remaining four review-fix tasks
- Run `pnpm release:validate` after the review fixes are complete

**Blockers:**

- None

### 2026-04-14

**Session Start:** 20:06 UTC

- [x] p03-t04: (review) Wire or remove the unused docs-audience field - `758d4afa`
- [ ] p03-t05: (review) Add lifecycle cross-link in docs workflows page - next

**What changed (high level):**

- Resolved the contract asymmetry around the audience field by carrying it into the coverage-gap and recommendation schema.

**Decisions:**

- Kept the audience concept because it helps explain why a page belongs in a developer, operator, or integrator-oriented docs area.

**Follow-ups / TODO:**

- Add the lifecycle cross-link in docs workflows
- Run `pnpm release:validate` after the remaining fixes land

**Blockers:**

- None

### 2026-04-14

**Session Start:** 20:05 UTC

- [x] p03-t03: (review) Harmonize coverage-state terminology casing - `d8a71e55`
- [ ] p03-t04: (review) Wire or remove the unused docs-audience field - next

**What changed (high level):**

- Brought `oat-project-document` coverage-state labels into casing alignment with `oat-docs-analyze`.

**Decisions:**

- Chose the smallest possible fix because the review finding was about terminology drift, not behavior.

**Follow-ups / TODO:**

- Resolve the unused docs-audience field
- Add the lifecycle cross-link in docs workflows
- Run `pnpm release:validate` after the remaining fixes land

**Blockers:**

- None

### 2026-04-14

**Session Start:** 20:04 UTC

- [x] p03-t02: (review) Add success criteria for capability coverage guarantees - `bfdbb90c`
- [ ] p03-t03: (review) Harmonize coverage-state terminology casing - next

**What changed (high level):**

- Brought the skill’s success criteria into line with the new capability-coverage contract.

**Decisions:**

- Treated the review finding as contract-audit cleanup rather than changing any implementation behavior.

**Follow-ups / TODO:**

- Harmonize the coverage terminology casing
- Resolve the unused docs-audience field
- Add the lifecycle cross-link in docs workflows
- Run `pnpm release:validate` after the remaining fixes land

**Blockers:**

- None

### Review Received: final

**Date:** 2026-04-14
**Review artifact:** reviews/archived/final-review-2026-04-14.md

**Findings:**

- Critical: 1
- Important: 0
- Medium: 1
- Minor: 3

**New tasks added:** p03-t01, p03-t02, p03-t03, p03-t04, p03-t05

**Deferred Findings (Medium):**

- None

**Deferred Findings:**

- None

**Minor disposition:**

- User chose to convert all minor findings to tasks during final review receive.

**Next:** Execute fix tasks via the `oat-project-implement` skill.

After the fix tasks are complete:

- Update the review row status to `fixes_completed`
- Re-run `oat-project-review-provide code final` then `oat-project-review-receive` to reach `passed`

---

## Deviations from Plan

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- `oat-project-document` now builds a capability inventory from project artifacts plus adjacent high-signal repo evidence.
- The skill now distinguishes `adequately covered`, `thin coverage`, and `no coverage` capability states before deciding whether to update or create docs.
- OAT docs now say the workflow should recommend new docs pages or directories when a new capability lacks a natural home.
- Final review findings were converted into a dedicated Phase 3 review-fixes queue for closure before pass.

**Behavioral changes (user-facing):**

- Agents using `oat-project-document` now have explicit instructions to propose new docs surfaces for major new capabilities instead of defaulting to reference or README churn.

**Key files / modules:**

- `.agents/skills/oat-project-document/SKILL.md` - project-document skill contract
- `apps/oat-docs/docs/workflows/projects/lifecycle.md` - lifecycle docs
- `apps/oat-docs/docs/docs-tooling/workflows.md` - docs-workflow docs

**Verification performed:**

- `git diff --check -- .agents/skills/oat-project-document/SKILL.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md .oat/projects/shared/project-document-docs-gap-hardening`
- `git diff --stat -- .agents/skills/oat-project-document/SKILL.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md`

**Design deltas (if any):**

- No design artifact was used for this quick-mode project.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
