---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-03
oat_current_task_id: null
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

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 3     | 3/3       |
| Phase 2 | completed | 3     | 3/3       |
| Phase 3 | completed | 2     | 2/2       |
| Phase 4 | completed | 2     | 2/2       |

**Total:** 10/10 tasks completed

---

## Phase 1: Navigation and entrypoint restructuring

**Status:** completed
**Started:** 2026-04-03

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Introduced canonical top-level section routes for Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities.
- Rewired the docs root page to point users at the new canonical sections instead of the broad User Guide bucket.
- Added a shallow CLI Reference page under Reference so the canonical reference route now exists.
- Reworked the homepage into a calmer overview page that explains OAT and points users to Start Here.
- Rewrote `quickstart.md` into a lightweight path-selection page instead of a command-heavy mini manual.
- Turned the four new top-level section routes into real landing pages with consistent section templates and overview pages.
- Kept phase-1 links pointed at existing guide pages where necessary so the site stays coherent until the phase-2 content moves happen.

**Key files touched:**

- `apps/oat-docs/**` - docs IA, routing, and landing-page work
- `.oat/projects/shared/docs-readability-reorg/**` - implementation tracking artifacts

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

**Status:** completed
**Commit:** 90c1693

**Notes / Decisions:**

- `/` explains what OAT is and points to `/quickstart`.
- `/quickstart` owns path-selection logic.
- Avoid duplicating the same routing content on both pages.

**Outcome (required when completed):**

- Reframed the homepage as a high-level overview page rather than a second path router.
- Turned Quickstart into the single canonical path-selection page for new users.
- Removed the long command-heavy quickstart material from the first user decision surface.

**Files changed:**

- `apps/oat-docs/docs/index.md` - replaced the old path-routing block with overview framing and repeated Start Here guidance
- `apps/oat-docs/docs/quickstart.md` - rewrote Quickstart into a lightweight path-selection page
- `apps/oat-docs/index.md` - regenerated app-level index text to match the new Quickstart role

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Issues Encountered:**

- None

---

### Task p01-t03: Create the new section landings and overview pages

**Status:** completed
**Commit:** 9d8ead7

**Notes / Decisions:**

- Each major section should follow the same landing-page template:
  - what this section is
  - who it’s for
  - start here
  - common tasks
  - go deeper
- To avoid broken routes before the migration phase, the new top-level landing pages can link to existing guide-owned pages until those pages are moved.

**Outcome (required when completed):**

- Replaced the thin placeholder section stubs with real landing pages for Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities.
- Added new overview pages for all four top-level sections so each lane now has an approachable plain-language entry point.
- Regenerated the app-level docs index so the new overview pages are discoverable in generated navigation output.

**Files changed:**

- `apps/oat-docs/docs/provider-sync/index.md` - section landing with standard template and routing
- `apps/oat-docs/docs/provider-sync/overview.md` - new plain-language overview page
- `apps/oat-docs/docs/workflows/index.md` - section landing with standard template and routing
- `apps/oat-docs/docs/workflows/overview.md` - new plain-language overview page
- `apps/oat-docs/docs/docs-tooling/index.md` - section landing with standard template and routing
- `apps/oat-docs/docs/docs-tooling/overview.md` - new plain-language overview page
- `apps/oat-docs/docs/cli-utilities/index.md` - section landing with standard template and routing
- `apps/oat-docs/docs/cli-utilities/overview.md` - new plain-language overview page
- `apps/oat-docs/index.md` - regenerated app-level index after the new overview pages were added

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Issues Encountered:**

- The canonical child routes for later phases do not all exist yet, so the new landing pages currently point into legacy guide pages for deep content where needed.
- This is intentional and temporary; Phase 2 will move the owned content into the new section routes.

---

## Phase 2: Content migration and readability framing

**Status:** completed
**Started:** 2026-04-03

### Task p02-t01: Move Provider Sync and Agentic Workflows content into canonical section routes

**Status:** completed
**Commit:** 1c0b759

**Notes / Decisions:**

- Move and reorganize existing guide content without narrowing coverage.
- Keep cross-cutting skill guidance, but make the Skills page task-oriented first.

**Outcome (required when completed):**

- Moved the owned Provider Sync detail pages into `/provider-sync/*` so the top-level section now owns its detailed command, provider, drift, and config docs.
- Moved workflow-owned pages into `/workflows/*`, including new canonical homes for skills, ideas, and project lifecycle content.
- Reworked the old `guide/index.md` into a compatibility router and rewired remaining reference/concepts pages to the new canonical routes.

**Files changed:**

- `apps/oat-docs/docs/provider-sync/**` - canonical provider-sync section now owns its detailed docs
- `apps/oat-docs/docs/workflows/**` - canonical workflows section now owns skills, ideas, and project lifecycle docs
- `apps/oat-docs/docs/guide/index.md` - converted to a compatibility router
- `apps/oat-docs/docs/guide/cli-reference.md` - relinked to canonical provider-sync and workflow routes
- `apps/oat-docs/docs/guide/concepts.md` - relinked to canonical provider-sync and workflow routes
- `apps/oat-docs/docs/guide/configuration.md` - relinked to canonical provider-sync config docs
- `apps/oat-docs/docs/guide/getting-started.md` - relinked provider-sync references
- `apps/oat-docs/docs/guide/tool-packs.md` - relinked provider-sync references
- `apps/oat-docs/docs/contributing/design-principles.md` - relinked provider-sync references
- `apps/oat-docs/index.md` - regenerated app-level index after the route migration

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Issues Encountered:**

- The `Guide` bucket still exists because Docs Tooling, CLI Utilities, and concept/bootstrap/reference-adjacent router pages have not finished moving yet.
- This is expected and will be reduced further in `p02-t02`.

---

### Task p02-t02: Move Docs Tooling and CLI Utilities content into their canonical sections

**Status:** completed
**Commit:** a4fc257

**Notes / Decisions:**

- Split `guide/getting-started` between provider sync and CLI utility ownership.
- Move deep utility command detail out of CLI Reference into `/cli-utilities/config-and-local-state`.

**Outcome (required when completed):**

- Moved the docs-tooling detail pages into `/docs-tooling/*` and rewired the section landing/overview pages to their canonical owners.
- Moved bootstrap, tool-pack, and configuration docs into `/cli-utilities/*` and added a new `config-and-local-state.md` page for utility command groups.
- Rewrote the canonical Reference CLI page into a real shallow command map and removed the old guide-owned CLI Reference page.

**Files changed:**

- `apps/oat-docs/docs/docs-tooling/**` - canonical docs-tooling section now owns quickstart, commands, and workflow docs
- `apps/oat-docs/docs/cli-utilities/**` - canonical CLI utilities section now owns bootstrap, tool packs, configuration, and utility command groups
- `apps/oat-docs/docs/reference/cli-reference.md` - rewritten as the canonical shallow CLI map
- `apps/oat-docs/docs/reference/index.md` - updated to point at canonical reference and docs-tooling ownership
- `apps/oat-docs/docs/reference/docs-index-contract.md` - updated to point at canonical docs-tooling ownership
- `apps/oat-docs/docs/contributing/documentation.md` - updated to point at canonical docs-tooling ownership
- `apps/oat-docs/docs/contributing/design-principles.md` - updated to point at canonical CLI reference ownership
- `apps/oat-docs/docs/guide/index.md` - further reduced to a compatibility router
- `apps/oat-docs/docs/guide/concepts.md` - updated to point at canonical CLI reference ownership
- `apps/oat-docs/index.md` - regenerated app-level index after the route migration

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Issues Encountered:**

- The `Guide` bucket still remains in generated navigation because `guide/index.md` and `guide/concepts.md` are intentionally still present during transition.
- This is acceptable for now because the substantive user docs have moved; the remaining `Guide` surface is now mostly compatibility material.

---

### Task p02-t03: Add progressive disclosure to the highest-density docs pages

**Status:** completed
**Commit:** c47bece

**Notes / Decisions:**

- Add overview intros and Quick Look blocks to priority pages while keeping the detailed content below.

**Outcome (required when completed):**

- Added Quick Look or short framing blocks to the eight highest-priority dense pages identified in the plan.
- Completed the cleanup of old guide-owned files that had already been re-homed into canonical sections, so the old `guide` tree now only contains compatibility material.
- Preserved detailed content while making the first screen of the densest pages easier to scan.

**Files changed:**

- `apps/oat-docs/docs/workflows/projects/lifecycle.md` - added lifecycle Quick Look framing
- `apps/oat-docs/docs/provider-sync/commands.md` - added command-surface Quick Look framing
- `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` - added introductory framing plus Quick Look
- `apps/oat-docs/docs/cli-utilities/tool-packs.md` - added pack-management Quick Look framing
- `apps/oat-docs/docs/workflows/projects/state-machine.md` - added state-machine framing plus Quick Look
- `apps/oat-docs/docs/workflows/projects/repo-analysis.md` - added repo-analysis Quick Look framing
- `apps/oat-docs/docs/cli-utilities/bootstrap.md` - added bootstrap Quick Look framing
- `apps/oat-docs/docs/docs-tooling/commands.md` - added docs-command Quick Look framing
- `apps/oat-docs/docs/guide/**` - removed the guide-owned pages that had already been re-homed to canonical sections
- `apps/oat-docs/index.md` - regenerated app-level index after the guide cleanup

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Issues Encountered:**

- The guide cleanup landed in the same commit because the old moved pages were still present in the working tree. This did not remove documentation coverage; it finalized the route ownership changes from the earlier migration tasks.

---

## Phase 3: README realignment and final audit

**Status:** completed
**Started:** 2026-04-03

### Task p03-t01: Rewrite the root README as an overview and quick-start document

**Status:** completed
**Commit:** 0eb0fbd

**Notes / Decisions:**

- Dense documentation belongs on the docs site.
- The root README should become concise and link outward to the deployed docs.

**Outcome (required when completed):**

- Rewrote the root README from a dense mini-docs surface into a concise monorepo overview.
- Kept only the high-level capability framing, a short repo quickstart, and explicit links to the deployed docs site and canonical docs sections.
- Removed the long mode-by-mode operational detail from the root README and pushed that depth to the docs site by design.

**Files changed:**

- `README.md` - rewritten as overview, quick-start, and docs-entry surface

**Verification:**

- Markdown formatting applied via commit hooks
- Manual check: README now points users at the deployed docs for depth instead of duplicating the docs site inline

**Issues Encountered:**

- None

---

### Task p03-t02: Tighten package and tooling READMEs and run a final audit

**Status:** completed
**Commit:** 3fd0cfe

**Notes / Decisions:**

- Package READMEs should be package-local quick-start/orientation docs.
- Final audit must confirm no documentation was removed or materially narrowed without approval.

**Outcome (required when completed):**

- Rewrote the package and tooling READMEs into concise orientation and quick-start surfaces that point outward to the docs site for depth.
- Tightened the publishable package READMEs so they now explain the package purpose, a small number of representative usage patterns, and where to find the canonical docs.
- Confirmed with a final docs build that the new docs IA and README surfaces render cleanly without removing documentation coverage.

**Files changed:**

- `packages/cli/README.md` - trimmed to package orientation, representative commands, and docs links
- `packages/docs-config/README.md` - tightened to package overview, install, usage, and docs link
- `packages/docs-theme/README.md` - tightened to package overview, install, usage, and docs link
- `packages/docs-transforms/README.md` - tightened to package overview, install, usage, and docs link
- `tools/git-hooks/README.md` - rewritten as a concise tooling-oriented quick reference

**Verification:**

- Run: `pnpm build:docs`
- Result: pass
- Audit result: package/tooling README changes did not remove canonical documentation; they now defer dense detail to the docs site by design

**Issues Encountered:**

- None

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

### Review Received: final

**Date:** 2026-04-03
**Review artifact:** `reviews/archived/final-review-2026-04-03.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 3

**New tasks added:** `p04-t01`, `p04-t02`

**Deferred Findings:**

- `m2` Missing `/provider-sync/getting-started` canonical page
  - Disposition: deferred with rationale
  - Rationale: current user routing works through `cli-utilities/bootstrap`, and the normalized implementation plan did not require a separate canonical page. This is plan/reference alignment cleanup rather than a correctness gap.

**Next:** Re-run `oat-project-review-provide code final`, then process the re-review with `oat-project-review-receive`.

**Review fix status:** `fixes_completed`

---

## Phase 4: Review fixes

**Status:** completed
**Started:** 2026-04-03

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Closed the selected review follow-ups by cleaning up the stale guide-directory clutter and removing obsolete contract wording.
- Left the project in the correct lifecycle posture for a final re-review rather than incorrectly marking the review as passed.

**Key files touched:**

- `apps/oat-docs/docs/reference/docs-index-contract.md` - removed the obsolete `overview.md` deprecation note
- `apps/oat-docs/docs/guide/` - removed stale empty subdirectories from the local workspace
- `.oat/projects/shared/docs-readability-reorg/**` - updated lifecycle tracking after the review-fix work

**Verification:**

- Run: `find apps/oat-docs/docs/guide -empty -type d`
- Result: pass
- Run: `rg -n "overview\\.md is deprecated" apps/oat-docs/docs/reference/docs-index-contract.md`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- `p04-t01` resolved a real review concern but produced no tracked Git diff because empty directories are not versioned.
- The review row moves to `fixes_completed`, not `passed`; a fresh final review is still required.

### Task p04-t01: (review) Remove empty legacy guide subdirectories

**Status:** completed
**Commit:** -

**Outcome (required when completed):**

- Removed the stale empty `guide/` subdirectories from the local workspace so the compatibility surface now contains only the remaining guide files.
- Verified that `find apps/oat-docs/docs/guide -empty -type d` returns no stale empty guide directories.
- Confirmed that this cleanup produced no tracked repository diff because Git does not version empty directories.

**Files changed:**

- `apps/oat-docs/docs/guide/` - workspace-only empty-directory cleanup; no tracked files were modified

**Verification:**

- Run: `find apps/oat-docs/docs/guide -empty -type d`
- Result: pass

**Notes / Decisions:**

- No code commit was possible for this task because empty directories are not represented in Git history.
- The task is still marked complete because the review concern was resolved in the working tree and verified directly.

### Task p04-t02: (review) Remove obsolete overview deprecation note from docs index contract

**Status:** completed
**Commit:** a29dacb

**Notes / Decisions:**

- The goal is to remove obsolete migration language, not to rename or restructure the new section overview pages.

**Outcome (required when completed):**

- Removed the outdated deprecation sentence from the docs index contract so the contract no longer implies that the new overview leaf pages are suspect.
- Verified that the old wording is gone and that the docs site still builds cleanly after the contract update.

**Files changed:**

- `apps/oat-docs/docs/reference/docs-index-contract.md` - removed obsolete `overview.md` deprecation guidance

**Verification:**

- Run: `rg -n "overview\\.md is deprecated" apps/oat-docs/docs/reference/docs-index-contract.md`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-03

**Session Start:** 00:56Z

- [x] Imported external plan into `docs-readability-reorg`
- [x] Backfilled `discovery.md`
- [x] p01-t01: establish the new top-level docs IA and canonical routes
- [x] p01-t02: rewrite `/` and `/quickstart`
- [x] p01-t03: create the new section landings and overview pages
- [x] p02-t01: move Provider Sync and Agentic Workflows content into canonical routes
- [x] p02-t02: move Docs Tooling and CLI Utilities content into canonical routes
- [x] p02-t03: add progressive disclosure to the highest-density docs pages
- [x] p03-t01: rewrite the root README as an overview and quick-start document
- [x] p03-t02: tighten package and tooling READMEs and run a final audit
- [x] final review received
- [x] p04-t01: remove empty legacy guide subdirectories
- [x] p04-t02: remove obsolete overview deprecation note from docs index contract

**What changed (high level):**

- Rebased the worktree onto the latest `origin/main`
- Imported the external plan into a new OAT import-mode project
- Backfilled the project artifacts for implementation readiness
- Established canonical top-level docs section routes and root docs entry links
- Split the docs entrypoint model so `/` is overview and `/quickstart` is Start Here
- Established real landing pages plus overview pages for the four new top-level adoption lanes
- Moved Provider Sync and workflow-owned pages into canonical top-level routes
- Moved docs-tooling and CLI-utility pages into canonical top-level routes and established the canonical shallow CLI reference
- Added progressive-disclosure framing to the densest priority pages and finalized the guide cleanup
- Rewrote the root README into a short overview that pushes dense detail to the docs site
- Tightened package and tooling READMEs so they stay package-local and route readers into the canonical docs for dense detail
- Ran a final docs build audit after the README updates
- Received the final code review and converted two selected minor findings into explicit follow-up tasks
- Cleared the stale empty legacy guide directories called out in the review and confirmed the cleanup was workspace-only
- Removed the obsolete `overview.md` deprecation note from the docs index contract and revalidated the docs build

**Decisions:**

- `/` remains overview and `/quickstart` remains the decision page
- Reorganization must preserve information; removals or major rewrites require user approval
- During phased migration, new section landings may point at legacy guide pages until canonical child routes are in place
- The `guide` tree can temporarily act as a compatibility router while the remaining docs-tooling and CLI-utility pages are still being moved
- The remaining Phase 2 work is readability framing only; the next pass should add overview/Quick Look affordances without reducing coverage
- Phase 3 should now align the repository README surfaces with the new docs-first structure and confirm the final docs/readme surface is consistent
- Final task should keep package/tooling READMEs concise and verify the finished docs surface still preserves coverage
- The generated app-level index can temporarily show legacy guide structure until the underlying guide content is migrated
- Dense/reference detail should live on the docs site; README files should stay concise and link outward
- No documentation should be wholesale removed or materially narrowed as part of this reorganization without user approval
- Minor finding `m2` remains deferred because the current provider-sync onboarding route is acceptable and the normalized plan did not require a dedicated page
- Review-fix task `p04-t01` did not produce a tracked diff because the cleanup removed only untracked empty directories
- Review fixes are implemented and the project is now awaiting a final re-review rather than additional implementation work

**Follow-ups / TODO:**

- Run the implementation review gate with `oat-project-review-provide`

**Blockers:**

- None

**Session End:** 19:08Z

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run         | Passed | Failed | Coverage |
| ----- | ----------------- | ------ | ------ | -------- |
| 1     | `pnpm build:docs` | yes    | no     | n/a      |
| 2     | `pnpm build:docs` | yes    | no     | n/a      |
| 3     | `pnpm build:docs` | yes    | no     | n/a      |
| 4     | `pnpm build:docs` | yes    | no     | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- Reorganized the docs into clear adoption lanes for Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities.
- Separated the docs entrypoints so `/` is a concise overview and `/quickstart` is the only path-selection page.
- Moved dense guide content into canonical section-owned routes and added readability framing to the highest-density pages.
- Realigned the root, package, and tooling READMEs so they now act as orientation surfaces that point outward to the docs site for full depth.
- Closed the selected post-review cleanup items by removing obsolete contract wording and clearing the stale guide-directory clutter.

**Behavioral changes (user-facing):**

- New users now encounter a clearer top-level docs structure with less up-front density and more explicit section ownership.
- The homepage explains what OAT is and why it exists without duplicating the start-here routing logic.
- Quickstart now routes users into the correct adoption lane instead of acting as a command-heavy mini manual.
- Dense technical pages now begin with brief framing and Quick Look guidance before the full detail.

**Key files / modules:**

- `apps/oat-docs/docs/index.md`
- `apps/oat-docs/docs/quickstart.md`
- `apps/oat-docs/docs/provider-sync/**`
- `apps/oat-docs/docs/workflows/**`
- `apps/oat-docs/docs/docs-tooling/**`
- `apps/oat-docs/docs/cli-utilities/**`
- `apps/oat-docs/docs/reference/cli-reference.md`
- `README.md`
- `packages/*/README.md`
- `tools/git-hooks/README.md`

**Verification performed:**

- Ran `pnpm build:docs` after each implementation phase
- Ran a final `pnpm build:docs` audit after the README/package README work
- Confirmed the reorganization preserved documentation coverage rather than narrowing it

**Design deltas (if any):**

- Kept `/` as overview and `/quickstart` as the canonical Start Here page after explicitly evaluating both entrypoint options
- Retained compatibility-oriented guide material where needed instead of forcing hard removals during the reorg
- Chose to defer the missing `/provider-sync/getting-started` page because the current bootstrap routing remains acceptable and non-blocking

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md`
