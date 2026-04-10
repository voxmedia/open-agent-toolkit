---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_generated: true
oat_template: false
oat_template_name: summary
oat_summary_last_task: p06-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: control-plane-state-parsing

## Overview

This project introduced a read-only control-plane layer for OAT so project-aware tooling no longer needs to reimplement markdown parsing and lifecycle inference on every invocation. The goal was to make project state, project listings, and resolved config available through stable JSON-oriented CLI surfaces that future UI consumers can reuse.

## What Was Implemented

The project added a new private workspace package, `@open-agent-toolkit/control-plane`, under `packages/control-plane/`. That package now parses OAT project artifacts, aggregates task and review state, normalizes lifecycle metadata, and computes the next recommended lifecycle skill through a pure routing layer.

On top of that read layer, the CLI now ships three inspection commands: `oat project status`, `oat project list`, and `oat config dump`. `oat project status` exposes the full active-project control-plane state, `oat project list` returns structured summaries for tracked projects, and `oat config dump` returns merged shared/local/user/env-aware config with source attribution.

The implementation also completed the repo guardrails required for publishable package changes. Public package versions were bumped in lockstep, `pnpm release:validate` was added to the verification bar for this work, and the shipped documentation now reflects the new control-plane package and command surfaces.

## Key Decisions

- The control plane was implemented as a separate workspace package rather than being embedded in `packages/cli`, so parsing and recommendation logic can be reused by future dashboards or other tooling.
- The control plane stayed read-only. The CLI continues to own config resolution, user-facing formatting, and command wiring, while the package owns typed parsing and recommendation.
- `state.md` frontmatter parsing uses YAML parsing instead of regex-only extraction so the package can reliably consume arrays, null-like values, booleans, and lifecycle metadata from canonical OAT artifacts.
- Reusable parser helpers were consolidated under `packages/control-plane/src/shared/utils/`, matching the agreed package-local taxonomy for shared helpers.

## Design Deltas

The core architecture stayed aligned with the design, but implementation exposed a few contract gaps that were fixed during review. The control plane originally hardcoded lifecycle state and emitted absolute paths; final review fixes updated it to honor parsed lifecycle metadata and return repo-relative paths in the outward JSON contract.

The final shipped package also extracted shared frontmatter and normalization helpers into `shared/utils/` and removed redundant `plan.md` reads in `listProjects()`. Those changes were review-driven refinements rather than original design requirements, but they materially improved maintainability and contract correctness.

## Notable Challenges

The first live CLI integration surfaced a mismatch between the task-progress parser and the real structure of verbose `implementation.md` task sections. That bug had to be fixed mid-project so completed-task counts in `oat project status` reflected actual implementation state.

Final verification also exposed a pre-existing CLI asset-bundling race when workspace builds and smoke runs touched `packages/cli/assets/` concurrently. The project did not broaden scope into bundler changes; instead, final verification was rerun sequentially and recorded as an infrastructure constraint rather than a blocker for the control-plane shipment.

## Tradeoffs Made

`listProjects()` intentionally shipped using the same full-state assembly model as `getProjectState()` so project summaries and recommendations stay aligned with the real router logic. That means the summary path may do more work than a dedicated fast path, but correctness and consistency were prioritized over speculative optimization.

The follow-up optimization was deferred explicitly unless measured performance proves it is needed. That keeps the current implementation simpler and avoids splitting recommendation behavior across two differently derived state models too early.

## Revision History

- 2026-04-09: Final review added `p06-t01` and `p06-t02` to fix lifecycle parsing and restore the repo-relative path contract. The re-review passed after those fixes landed.
- 2026-04-09 to 2026-04-10: An independent second-opinion review added `p06-t03` through `p06-t05` for shared helper extraction, import cleanup, and reduced duplicate file reads. A broader `listProjects()` fast-path redesign was explicitly deferred.

## Follow-up Items

- `bl-931d` tracks a possible `listProjects()` summary fast path, but only if measured performance shows the current full-state assembly is materially too expensive.
