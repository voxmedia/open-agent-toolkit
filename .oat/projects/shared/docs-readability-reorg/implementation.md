---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-03
oat_current_task_id: p01-t02
oat_generated: false
---

# Implementation: docs-readability-reorg

**Started:** 2026-04-03
**Last Updated:** 2026-04-03

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
| Phase 1 | in_progress | 3     | 1/3       |
| Phase 2 | pending     | 3     | 0/3       |
| Phase 3 | pending     | 2     | 0/2       |

**Total:** 1/8 tasks completed

---

## Phase 1: Navigation and entrypoint restructuring

**Status:** in_progress
**Started:** 2026-04-03

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Introduced canonical top-level section routes for Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities.
- Rewired the docs root page to point users at the new canonical sections instead of the broad User Guide bucket.
- Added a shallow CLI Reference page under Reference so the canonical reference route now exists.

**Key files touched:**

- `apps/oat-docs/**` - docs IA, routing, and landing-page work

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- `/` remains the overview page.
- `/quickstart` remains the single Start Here decision page.
- Reorganization must preserve information; removal or major revision requires user approval.

### Task p01-t01: Establish the new top-level docs IA and canonical routes

**Status:** completed
**Commit:** 89cd96b

**Notes / Decisions:**

- Create or rewrite the top-level docs structure around `Provider Sync`, `Agentic Workflows`, `Docs Tooling`, `CLI Utilities`, `Reference`, and `Contributing`.
- Remove `User Guide` from the primary IA.

**Outcome (required when completed):**

- Added top-level docs section routes for the new IA without deleting the legacy guide content yet.
- Updated the docs root page so the canonical adoption lanes exist in the user-facing docs tree.
- Established a canonical `reference/cli-reference` route as part of the new ownership model.

**Files changed:**

- `apps/oat-docs/docs/index.md` - rewired the root docs page to point at the new top-level sections
- `apps/oat-docs/docs/provider-sync/index.md` - introduced the canonical Provider Sync route
- `apps/oat-docs/docs/workflows/index.md` - introduced the canonical Agentic Workflows route
- `apps/oat-docs/docs/docs-tooling/index.md` - introduced the canonical Docs Tooling route
- `apps/oat-docs/docs/cli-utilities/index.md` - introduced the canonical CLI Utilities route
- `apps/oat-docs/docs/reference/cli-reference.md` - introduced the canonical CLI Reference route
- `apps/oat-docs/index.md` - regenerated app-level index after the new routes were added

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Issues Encountered:**

- The generated app-level index still includes the legacy `Guide` bucket because the underlying guide directory has not been migrated yet.
- This is expected at this task boundary and will be resolved during the content migration phase rather than by deleting the legacy tree prematurely.

---

### Task p01-t02: Rewrite `/` as overview and `/quickstart` as the only decision page

**Status:** in_progress
**Commit:** -

**Notes / Decisions:**

- `/` explains what OAT is and points to `/quickstart`.
- `/quickstart` owns path-selection logic.
- Avoid duplicating the same routing content on both pages.

---

### Task p01-t03: Create the new section landings and overview pages

**Status:** pending
**Commit:** -

**Notes / Decisions:**

- Each major section should follow the same landing-page template:
  - what this section is
  - who it’s for
  - start here
  - common tasks
  - go deeper

---

## Phase 2: Content migration and readability framing

**Status:** pending
**Started:** -

### Task p02-t01: Move Provider Sync and Agentic Workflows content into canonical section routes

**Status:** pending
**Commit:** -

**Notes / Decisions:**

- Move and reorganize existing guide content without narrowing coverage.
- Keep cross-cutting skill guidance, but make the Skills page task-oriented first.

---

### Task p02-t02: Move Docs Tooling and CLI Utilities content into their canonical sections

**Status:** pending
**Commit:** -

**Notes / Decisions:**

- Split `guide/getting-started` between provider sync and CLI utility ownership.
- Move deep utility command detail out of CLI Reference into `/cli-utilities/config-and-local-state`.

---

### Task p02-t03: Add progressive disclosure to the highest-density docs pages

**Status:** pending
**Commit:** -

**Notes / Decisions:**

- Add overview intros and Quick Look blocks to priority pages while keeping the detailed content below.

---

## Phase 3: README realignment and final audit

**Status:** pending
**Started:** -

### Task p03-t01: Rewrite the root README as an overview and quick-start document

**Status:** pending
**Commit:** -

**Notes / Decisions:**

- Dense documentation belongs on the docs site.
- The root README should become concise and link outward to the deployed docs.

---

### Task p03-t02: Tighten package and tooling READMEs and run a final audit

**Status:** pending
**Commit:** -

**Notes / Decisions:**

- Package READMEs should be package-local quick-start/orientation docs.
- Final audit must confirm no documentation was removed or materially narrowed without approval.

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-03

**Session Start:** 00:56Z

- [x] Imported external plan into `docs-readability-reorg`
- [x] Backfilled `discovery.md`
- [x] p01-t01: establish the new top-level docs IA and canonical routes
- [ ] p01-t02: rewrite `/` and `/quickstart`

**What changed (high level):**

- Rebased the worktree onto the latest `origin/main`
- Imported the external plan into a new OAT import-mode project
- Backfilled the project artifacts for implementation readiness
- Established canonical top-level docs section routes and root docs entry links

**Decisions:**

- `/` remains overview and `/quickstart` remains the decision page
- Reorganization must preserve information; removals or major rewrites require user approval
- The generated app-level index can temporarily show legacy guide structure until the underlying guide content is migrated

**Follow-ups / TODO:**

- Complete the overview/start-here rewrite and then add the fuller section landing content

**Blockers:**

- None

**Session End:** 01:00Z

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
| 3     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- Pending implementation

**Behavioral changes (user-facing):**

- Pending implementation

**Key files / modules:**

- Pending implementation

**Verification performed:**

- Pending implementation

**Design deltas (if any):**

- None yet

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md`
