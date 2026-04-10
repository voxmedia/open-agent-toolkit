---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-09
oat_current_task_id: null
oat_generated: false
---

# Implementation: control-plane-state-parsing

**Started:** 2026-04-08
**Last Updated:** 2026-04-09

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
| Phase 1 | complete | 5     | 5/5       |
| Phase 2 | complete | 1     | 1/1       |
| Phase 3 | complete | 1     | 1/1       |
| Phase 4 | complete | 4     | 4/4       |
| Phase 5 | complete | 1     | 1/1       |
| Phase 6 | complete | 5     | 5/5       |

**Total:** 17/17 tasks completed

---

## Phase 1: Control Plane — Package and Types

**Status:** complete
**Started:** 2026-04-09

### Task p01-t01: Scaffold `packages/control-plane/` package

**Status:** completed
**Commit:** 2be7e14

**Outcome (required):**

- Scaffolded a new `@open-agent-toolkit/control-plane` workspace package under `packages/control-plane/`.
- Added package-level build, test, lint, format, and type-check scripts for the new library.
- Defined the initial shared control-plane types and placeholder public API exports for later implementation tasks.

**Files changed:**

- `packages/control-plane/package.json` - new workspace package manifest and scripts.
- `packages/control-plane/tsconfig.json` - package-local TypeScript build configuration.
- `packages/control-plane/src/types.ts` - initial control-plane type definitions.
- `packages/control-plane/src/index.ts` - placeholder public exports for upcoming tasks.

**Verification:**

- Run: `pnpm install && pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Kept the package private for the initial rollout, matching discovery and design.
- Matched existing monorepo package conventions instead of introducing package-specific script or build patterns.

---

### Task p01-t02: State.md frontmatter parser

**Status:** completed
**Commit:** 566e635

**Outcome (required):**

- Added a reusable `parseStateFrontmatter()` parser for `state.md` frontmatter content.
- Normalized OAT template placeholders, null-like strings, booleans, and enum fields into typed values.
- Added tests covering YAML arrays, JSON-string arrays, missing optionals, and malformed frontmatter fallback behavior.

**Files changed:**

- `packages/control-plane/src/state/parser.ts` - parser implementation and normalization helpers.
- `packages/control-plane/src/state/parser.test.ts` - RED/GREEN test coverage for state frontmatter parsing.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Chose graceful fallback to empty/default parsed state for malformed frontmatter instead of throwing.
- Kept the parser scoped to frontmatter content so later project-level code can handle file I/O separately.

---

### Task p01-t03: Artifact scanner and boundary tier detection

**Status:** completed
**Commit:** 5c92ce0

**Outcome (required):**

- Added boundary-tier detection to classify artifact readiness for routing.
- Implemented project artifact scanning across the tracked OAT markdown files.
- Covered both the pure boundary logic and the file-system scanner with tests against real fixture files.

**Files changed:**

- `packages/control-plane/src/recommender/boundary.ts` - boundary-tier classification logic.
- `packages/control-plane/src/recommender/boundary.test.ts` - unit tests for tier detection.
- `packages/control-plane/src/state/artifacts.ts` - artifact scanner over project markdown files.
- `packages/control-plane/src/state/artifacts.test.ts` - scanner tests using temporary project directories.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Kept artifact frontmatter parsing local to the scanner for now; broader frontmatter sharing can be revisited once more parser modules exist.
- Treat missing artifacts as non-existent tier-3 boundaries so later routing can reason about incomplete phases consistently.

---

### Task p01-t04: Task progress parser

**Status:** completed
**Commit:** d7d70a9

**Outcome (required):**

- Added a parser that derives task totals, completed counts, and phase-level progress from `plan.md` and `implementation.md`.
- Implemented `oat_current_task_id` parsing from implementation frontmatter.
- Added revision-phase coverage so follow-up review phases use the same progress model as normal phases.

**Files changed:**

- `packages/control-plane/src/state/tasks.ts` - task and phase progress parser.
- `packages/control-plane/src/state/tasks.test.ts` - tests for multi-phase, revision, and empty-plan cases.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Used OAT task IDs as the phase-grouping source of truth so revision tasks stay aligned even if headings vary.
- Kept current-task parsing separate from task-section parsing so later project-level aggregation can reuse either piece independently.

---

### Task p01-t05: Review status aggregator

**Status:** completed
**Commit:** cceb8a4

**Outcome (required):**

- Added parsing for the `## Reviews` markdown table in `plan.md`.
- Added scanning for active review artifacts in the project `reviews/` directory.
- Covered both review-table parsing and review-directory scanning with tests.

**Files changed:**

- `packages/control-plane/src/state/reviews.ts` - review table parser and unprocessed review scanner.
- `packages/control-plane/src/state/reviews.test.ts` - tests for plan review parsing and review directory scanning.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Treated the plan table as the authoritative review record and `reviews/` as supplemental active-review input.
- Excluded `reviews/archived/` from active review scanning so later routing only sees actionable review files.

**Phase Summary:**

- Outcome: Phase 1 now provides the core state-reading primitives needed for higher-level project aggregation.
- Key files touched: `packages/control-plane/src/types.ts`, `packages/control-plane/src/state/parser.ts`, `packages/control-plane/src/state/artifacts.ts`, `packages/control-plane/src/state/tasks.ts`, `packages/control-plane/src/state/reviews.ts`, `packages/control-plane/src/recommender/boundary.ts`.
- Verification: `pnpm --filter @open-agent-toolkit/control-plane test`, `pnpm --filter @open-agent-toolkit/control-plane lint`, `pnpm --filter @open-agent-toolkit/control-plane type-check`.
- Notable decisions/deviations: kept frontmatter helpers local to each parser for now; broader helper extraction can happen later if duplication becomes a maintenance issue.

---

## Phase 2: Skill Recommender

**Status:** complete
**Started:** 2026-04-09

### Task p02-t01: Phase routing state machine

**Status:** completed
**Commit:** 9e7a30c

**Outcome (required):**

- Ported the current `oat-project-next` routing tables and post-implementation cascade into a pure recommender.
- Added HiLL override handling, implementation-mode substitution, and review-cycle routing behavior.
- Added coverage for early-phase, review-cycle, summary, and PR-opening transitions.

**Files changed:**

- `packages/control-plane/src/recommender/router.ts` - pure skill recommender implementation.
- `packages/control-plane/src/recommender/router.test.ts` - routing table and post-implementation tests.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Kept non-final review routing separate from final-review handling so pending final review rows still trigger `review-provide` instead of `review-receive`.
- Used the parsed summary artifact status rather than raw file existence for the post-implementation summary gate.

**Phase Summary:**

- Outcome: Phase 2 adds the pure routing layer that converts parsed project state into the next-skill recommendation.
- Key files touched: `packages/control-plane/src/recommender/router.ts`, `packages/control-plane/src/recommender/router.test.ts`.
- Verification: `pnpm --filter @open-agent-toolkit/control-plane test`, `pnpm --filter @open-agent-toolkit/control-plane lint`, `pnpm --filter @open-agent-toolkit/control-plane type-check`.
- Notable decisions/deviations: modeled review safety from parsed review records rather than direct filesystem access so the recommender stays pure.

---

## Phase 3: Public API and Integration

**Status:** complete
**Started:** 2026-04-09

### Task p03-t01: Wire up `getProjectState` and `listProjects`

**Status:** completed
**Commit:** 545151c

**Outcome (required):**

- Wired the parser modules and recommender into a real `getProjectState()` aggregator.
- Added `listProjects()` summary generation and switched the package entrypoint to export the real public API.
- Added integration tests that build `ProjectState` and project summaries from realistic temp-directory fixtures.

**Files changed:**

- `packages/control-plane/src/project.ts` - public API assembly for project state and project listing.
- `packages/control-plane/src/project.test.ts` - integration tests for full state assembly and sorted summaries.
- `packages/control-plane/src/index.ts` - real exports for project APIs and recommender.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/control-plane build`
- Result: pass

**Notes / Decisions:**

- Kept `ProjectState.path` as the provided project path so the CLI can pass absolute paths without losing filesystem fidelity.
- Merged active review files into parsed review rows so the pure router can detect unprocessed feedback from the assembled state.

**Phase Summary:**

- Outcome: Phase 3 turns the parser modules into the package’s usable public API.
- Key files touched: `packages/control-plane/src/project.ts`, `packages/control-plane/src/project.test.ts`, `packages/control-plane/src/index.ts`.
- Verification: `pnpm --filter @open-agent-toolkit/control-plane test`, `pnpm --filter @open-agent-toolkit/control-plane lint`, `pnpm --filter @open-agent-toolkit/control-plane type-check`, `pnpm --filter @open-agent-toolkit/control-plane build`.
- Notable decisions/deviations: used full `getProjectState()` assembly inside `listProjects()`-style summary construction to keep summary recommendations aligned with the real router logic.

---

## Phase 4: CLI Commands

**Status:** complete
**Started:** 2026-04-09

### Task p04-t01: Add `@open-agent-toolkit/control-plane` dependency to CLI

**Status:** completed
**Commit:** cf14af3

**Outcome (required):**

- Added the new control-plane workspace package as a runtime dependency of `@open-agent-toolkit/cli`.
- Refreshed the workspace lockfile importer entry so the CLI package resolves the local control-plane package correctly.
- Verified that the full workspace build now includes the control-plane to CLI dependency chain cleanly.

**Files changed:**

- `packages/cli/package.json` - added `@open-agent-toolkit/control-plane` as a workspace dependency.
- `pnpm-lock.yaml` - recorded the CLI importer link to `../control-plane`.

**Verification:**

- Run: `pnpm install`
- Result: pass
- Run: `pnpm build`
- Result: pass

**Notes / Decisions:**

- Kept the dependency in `dependencies` rather than `devDependencies` because the CLI imports the package at runtime.
- `pnpm install` updated only the expected importer section in the lockfile; no unrelated workspace dependency churn was introduced.

---

### Task p04-t02: `oat project status` command

**Status:** completed
**Commit:** 2bc4793

**Outcome (required):**

- Added an `oat project status` subcommand that resolves the active project and returns the full control-plane `ProjectState`.
- Added text and JSON output paths, including explicit `unset` and `missing` handling for invalid active-project state.
- Fixed the control-plane task-progress parser so verbose implementation sections correctly report completed task counts in live CLI output.

**Files changed:**

- `packages/cli/src/commands/project/status.ts` - new status command implementation and output formatting.
- `packages/cli/src/commands/project/status.test.ts` - command-level tests for JSON, unset, and text summary flows.
- `packages/cli/src/commands/project/index.ts` - registered the new `status` subcommand.
- `packages/cli/src/commands/help-snapshots.test.ts` - updated the `project --help` inline snapshot.
- `packages/control-plane/src/state/tasks.ts` - fixed completed-task detection for real implementation artifact structure.
- `packages/control-plane/src/state/tasks.test.ts` - added regression coverage for verbose task sections.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane test && pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/control-plane build`
- Result: pass
- Run: `pnpm run cli -- project status --json`
- Result: pass

**Notes / Decisions:**

- Kept the command dependency-injected so tests can override project resolution and control-plane reads without filesystem fixtures.
- Treated the parser fix as in-scope for this task because the new command exposed the live mismatch immediately.

---

### Task p04-t03: `oat project list` command

**Status:** completed
**Commit:** f928342

**Outcome (required):**

- Added an `oat project list` subcommand that resolves the configured projects root and returns control-plane `ProjectSummary` records.
- Added JSON output for automation and a human-readable text table for non-JSON usage.
- Verified the live command against the current repo projects root, including the in-progress control-plane project.

**Files changed:**

- `packages/cli/src/commands/project/list.ts` - new project-list command and text table formatter.
- `packages/cli/src/commands/project/list.test.ts` - command-level tests for JSON, empty, and text output flows.
- `packages/cli/src/commands/project/index.ts` - registered the `list` subcommand.
- `packages/cli/src/commands/help-snapshots.test.ts` - updated the `project --help` inline snapshot.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm run cli -- project list --json`
- Result: pass

**Notes / Decisions:**

- Normalized the projects-root path to support both repo-relative config values and absolute `OAT_PROJECTS_ROOT` overrides.
- Kept the text output formatter local to the command because only this command needs the specific summary table shape.

---

### Task p04-t04: `oat config dump` command

**Status:** completed
**Commit:** 9275dc7

**Outcome (required):**

- Added a reusable config-resolution utility that reads shared, local, and user config surfaces and produces a dot-notation resolved map with source attribution.
- Added an `oat config dump` subcommand that exposes the merged config in JSON and grouped text output.
- Verified the live dump command against this checkout, including repo config, local active project state, and defaulted keys.

**Files changed:**

- `packages/cli/src/config/resolve.ts` - generic config flattening, precedence resolution, and env override handling.
- `packages/cli/src/config/resolve.test.ts` - coverage for precedence, defaults, env overrides, and generic nested keys.
- `packages/cli/src/commands/config/dump.ts` - new dump command implementation.
- `packages/cli/src/commands/config/dump.test.ts` - JSON contract tests for the dump command.
- `packages/cli/src/commands/config/index.ts` - registered the `dump` subcommand.
- `packages/cli/src/commands/help-snapshots.test.ts` - updated the `config --help` inline snapshot.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts src/commands/config/dump.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm run cli -- config dump --json`
- Result: pass

**Notes / Decisions:**

- Kept the resolution logic generic and reader-injectable so future config keys can flow through without reworking merge code.
- Used defaults for missing keys only when no shared/local/user/env value exists, preserving user fallback behavior for keys like `activeIdea`.

**Phase Summary:**

- Outcome: Phase 4 now exposes all planned control-plane-backed CLI surfaces: `project status`, `project list`, and `config dump`.
- Key files touched: `packages/cli/src/commands/project/status.ts`, `packages/cli/src/commands/project/list.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/commands/config/dump.ts`, `packages/control-plane/src/state/tasks.ts`.
- Verification: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`, `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`, `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts src/commands/config/dump.test.ts`, `pnpm --filter @open-agent-toolkit/cli lint`, `pnpm --filter @open-agent-toolkit/cli type-check`, `pnpm --filter @open-agent-toolkit/control-plane test`, `pnpm --filter @open-agent-toolkit/control-plane lint`, `pnpm --filter @open-agent-toolkit/control-plane type-check`, `pnpm --filter @open-agent-toolkit/control-plane build`, `pnpm run cli -- project status --json`, `pnpm run cli -- project list --json`, `pnpm run cli -- config dump --json`.
- Notable decisions/deviations: fixed the control-plane completed-task parser during `p04-t02` because the new live status command surfaced a mismatch between parser expectations and the verbose implementation artifact format.

---

## Phase 5: Final Verification

**Status:** complete
**Started:** 2026-04-09

### Task p05-t01: Full build and test suite

**Status:** completed
**Commit:** a2e211c

**Outcome (required):**

- Bumped all publishable package versions in lockstep to `0.0.19` for the shipped CLI functionality added in this project.
- Updated CLI-managed version metadata and test fixtures to match the new public package versions.
- Ran the full workspace verification suite, release validation, and manual JSON smoke tests for the new control-plane-backed commands.

**Files changed:**

- `packages/cli/package.json` - bumped the CLI package version to `0.0.19`.
- `packages/docs-config/package.json` - bumped the publishable package version to `0.0.19`.
- `packages/docs-theme/package.json` - bumped the publishable package version to `0.0.19`.
- `packages/docs-transforms/package.json` - bumped the publishable package version to `0.0.19`.
- `packages/cli/assets/public-package-versions.json` - updated embedded public package version metadata.
- `packages/cli/src/app/create-program.ts` - updated the CLI-reported version string.
- `packages/cli/src/manifest/manager.ts` - updated scaffolded manifest version references.
- `packages/cli/src/commands/docs/init/scaffold.ts` - updated docs-init scaffold version references.
- `packages/cli/src/commands/status/index.test.ts` - aligned version assertions.
- `packages/cli/src/commands/doctor/index.test.ts` - aligned version assertions.
- `packages/cli/src/commands/sync/index.test.ts` - aligned version assertions.
- `packages/cli/src/commands/providers/list/list.test.ts` - aligned version assertions.
- `packages/cli/src/commands/providers/inspect/inspect.test.ts` - aligned version assertions.
- `packages/cli/src/commands/docs/init/integration.test.ts` - aligned version assertions.
- `packages/cli/src/commands/docs/init/scaffold.test.ts` - aligned version assertions.

**Verification:**

- Run: `pnpm build`
- Result: pass
- Run: `pnpm test`
- Result: pass
- Run: `pnpm lint`
- Result: pass
- Run: `pnpm type-check`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass
- Run: `pnpm run cli -- project status --json`
- Result: pass
- Run: `pnpm run cli -- project list --json`
- Result: pass
- Run: `pnpm run cli -- config dump --json`
- Result: pass

**Notes / Decisions:**

- Initial parallel final-verification attempts exposed an existing CLI asset-bundling race because concurrent builds and smoke runs both rewrite `packages/cli/assets/`; sequential reruns passed without code changes.
- Kept the final smoke runs sequential so the project finishes on the repo's current build behavior rather than introducing unrelated bundler changes in this scope.

**Phase Summary:**

- Outcome: Phase 5 completed release guardrails, full workspace verification, and final smoke validation for the new control-plane surfaces.
- Key files touched: `packages/cli/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`, `packages/cli/assets/public-package-versions.json`, `packages/cli/src/app/create-program.ts`, `packages/cli/src/manifest/manager.ts`, `packages/cli/src/commands/docs/init/scaffold.ts`.
- Verification: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm type-check`, `pnpm release:validate`, `pnpm run cli -- project status --json`, `pnpm run cli -- project list --json`, `pnpm run cli -- config dump --json`.
- Notable decisions/deviations: treated the CLI asset-bundling concurrency failure as pre-existing infrastructure behavior and completed validation with sequential reruns instead of broadening scope into bundler changes.

---

## Phase 6: Review Fixes

**Status:** in_progress
**Started:** 2026-04-09

### Task p06-t01: (review) Parse lifecycle state fields from `state.md`

**Status:** completed
**Commit:** b8c3970

**Outcome (required):**

- Extended the control-plane state parser to read `oat_lifecycle`, `oat_pause_timestamp`, and `oat_pause_reason`.
- Updated project assembly so `getProjectState()` and `listProjects()` use parsed lifecycle state instead of hardcoded active/null values.
- Added regression coverage for paused and completed lifecycle states in both parser-level and project-level tests.

**Files changed:**

- `packages/control-plane/src/types.ts` - expanded the lifecycle type to include `complete`.
- `packages/control-plane/src/state/parser.ts` - parsed lifecycle and pause metadata from `state.md` frontmatter.
- `packages/control-plane/src/state/parser.test.ts` - added paused and complete lifecycle regression coverage.
- `packages/control-plane/src/project.ts` - sourced lifecycle fields from parsed state in assembled project objects.
- `packages/control-plane/src/project.test.ts` - added integration assertions for paused and completed project lifecycle state.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane build`
- Result: pass

---

### Task p06-t02: (review) Return repo-relative project paths from control-plane state

**Status:** completed
**Commit:** 84b82a0

**Outcome (required):**

- Updated control-plane project state assembly to return repo-relative display paths while keeping filesystem reads on absolute paths internally.
- Added repo-root detection using `.git` or `.oat/config.json` so absolute project paths no longer leak into the JSON contract.
- Updated project and CLI list tests to assert repo-relative paths for exported project state.

**Files changed:**

- `packages/control-plane/src/project.ts` - normalized outward-facing project paths to repo-relative values.
- `packages/control-plane/src/project.test.ts` - added integration coverage for absolute-input paths with repo-relative output.
- `packages/cli/src/commands/project/list.test.ts` - aligned command-level project path expectations with the repo-relative contract.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts src/commands/project/list.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane build`
- Result: pass

---

### Task p06-t03: (review) Extract shared control-plane frontmatter and normalization helpers

**Status:** completed
**Commit:** 4cb936e

**Outcome (required):**

- Extracted reusable frontmatter, normalization, and missing-file helpers into `packages/control-plane/src/shared/utils/`.
- Updated the state parser, artifact scanner, review scanner, task parser, and boundary detector to consume the shared helpers instead of local copies.
- Added focused utility tests so placeholder-aware normalization and frontmatter parsing stay pinned during future refactors.

**Files changed:**

- `packages/control-plane/src/shared/utils/frontmatter.ts` - shared frontmatter extraction and YAML record parsing.
- `packages/control-plane/src/shared/utils/normalize.ts` - shared nullable-string and boolean normalization helpers.
- `packages/control-plane/src/shared/utils/errors.ts` - shared ENOENT detection helper.
- `packages/control-plane/src/shared/utils/frontmatter.test.ts` - frontmatter utility regression coverage.
- `packages/control-plane/src/shared/utils/normalize.test.ts` - normalization utility regression coverage.
- `packages/control-plane/src/state/parser.ts` - switched state parsing to shared utilities while preserving placeholder-aware behavior.
- `packages/control-plane/src/state/artifacts.ts` - replaced local frontmatter and normalization helpers with shared utilities.
- `packages/control-plane/src/recommender/boundary.ts` - reused shared normalization helpers for boundary-tier decisions.
- `packages/control-plane/src/state/tasks.ts` - reused shared frontmatter parsing for current-task extraction.
- `packages/control-plane/src/state/reviews.ts` - reused shared missing-file error handling.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane build`
- Result: pass

**Notes / Decisions:**

- Followed the package-local shared taxonomy agreed during review handling: `shared/utils` for reusable helpers rather than ad hoc flat `shared/*.ts` files.
- Kept placeholder-aware string normalization configurable so parser semantics stayed stricter than the artifact/boundary readers where needed.

---

### Task p06-t04: (review) Remove dynamic `readFile` import from project assembly

**Status:** completed
**Commit:** b717d96

**Outcome (required):**

- Switched `project.ts` to use a static `readFile` import from `node:fs/promises`.
- Removed the unnecessary dynamic import from `readOptionalFile`.
- Kept file-read behavior unchanged while simplifying the module import path.

**Files changed:**

- `packages/control-plane/src/project.ts` - replaced the dynamic `readFile` import with a static import.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Kept this task strictly scoped to import cleanup rather than folding in unrelated project assembly refactors.

---

### Task p06-t05: (review) Avoid duplicate `plan.md` reads in `listProjects`

**Status:** completed
**Commit:** cbeb160

**Outcome (required):**

- Updated `listProjects()` to read `plan.md` once per project and reuse that content for both review parsing and task-progress parsing.
- Kept summary output behavior unchanged while reducing redundant file I/O in the project listing loop.
- Fixed a race in the corresponding integration test setup so the repo-root fixture is created deterministically.

**Files changed:**

- `packages/control-plane/src/project.ts` - reused `plan.md` and `implementation.md` content within the per-project summary flow.
- `packages/control-plane/src/project.test.ts` - removed the `.oat/config.json` setup race in the project listing fixture.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/control-plane test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass

**Notes / Decisions:**

- Kept the optimization limited to redundant reads and deliberately did not take on the deferred fast-path summary redesign from `m4`.

**Phase Summary:**

- Outcome: Phase 6 resolved the second-opinion review findings by extracting shared helpers, simplifying project assembly imports, and removing duplicate plan-file reads in project summaries.
- Key files touched: `packages/control-plane/src/shared/utils/frontmatter.ts`, `packages/control-plane/src/shared/utils/normalize.ts`, `packages/control-plane/src/shared/utils/errors.ts`, `packages/control-plane/src/project.ts`, `packages/control-plane/src/project.test.ts`, `packages/control-plane/src/state/parser.ts`, `packages/control-plane/src/state/artifacts.ts`, `packages/control-plane/src/state/tasks.ts`, `packages/control-plane/src/state/reviews.ts`, `packages/control-plane/src/recommender/boundary.ts`.
- Verification: `pnpm --filter @open-agent-toolkit/control-plane test`, `pnpm --filter @open-agent-toolkit/control-plane lint`, `pnpm --filter @open-agent-toolkit/control-plane type-check`, `pnpm --filter @open-agent-toolkit/control-plane build`.
- Notable decisions/deviations: formalized a package-local shared taxonomy under `shared/utils/`; deferred the broader `listProjects` fast-path optimization because it remains a performance consideration rather than a demonstrated defect.

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

### Review Received: final

**Date:** 2026-04-09
**Review artifact:** `reviews/archived/final-review-2026-04-09.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 1
- Minor: 0

**New tasks added:** `p06-t01`, `p06-t02`

**Disposition:**

- `I1` Convert to task `p06-t01` to implement lifecycle-aware parsing and project-state assembly.
- `M1` Convert to task `p06-t02` to restore the repo-relative project path contract.

**Next:** Re-run `oat-project-review-provide code final` and process the re-review with `oat-project-review-receive`.

**Review fix status:** `fixes_completed`

---

### Review Received: final (re-review)

**Date:** 2026-04-09
**Review artifact:** `reviews/archived/final-review-2026-04-09-v2.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** none

**Disposition:**

- Prior review fixes verified as resolved
- Final review status: `passed`

**Next:** Run `oat-project-summary` to generate the summary artifact before the final PR flow.

---

### Review Received: final (independent second opinion)

**Date:** 2026-04-09
**Review artifact:** `reviews/archived/final-review-2026-04-09-v3.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 4

**New tasks added:** `p06-t03`, `p06-t04`, `p06-t05`

**Disposition:**

- `m1` Convert to task `p06-t03` to extract shared control-plane frontmatter, normalization, and error helpers into `src/shared/utils/`.
- `m2` Convert to task `p06-t04` to replace the unnecessary dynamic `readFile` import with a static import.
- `m3` Convert to task `p06-t05` to reuse `plan.md` content in `listProjects` instead of reading it twice per project.
- `m4` Deferred by explicit user direction: the current `listProjects` full-state assembly is functionally correct, and the fast-path summary optimization should only be revisited if measured performance makes it worthwhile.

**Next:** Re-run `oat-project-review-provide code final`, then process the result with `oat-project-review-receive`.

**Review fix status:** `fixes_completed`

---

## Implementation Log

Chronological log of implementation progress.

- 2026-04-09: Completed `p01-t01` and advanced to `p01-t02`.
- 2026-04-09: Completed `p01-t02` and advanced to `p01-t03`.
- 2026-04-09: Completed `p01-t03` and advanced to `p01-t04`.
- 2026-04-09: Completed `p01-t04` and advanced to `p01-t05`.
- 2026-04-09: Completed `p01-t05`, closed Phase 1, and advanced to `p02-t01`.
- 2026-04-09: Completed `p02-t01`, closed Phase 2, and advanced to `p03-t01`.
- 2026-04-09: Completed `p03-t01`, closed Phase 3, and advanced to `p04-t01`.
- 2026-04-09: Completed `p04-t01` and advanced to `p04-t02`.
- 2026-04-09: Completed `p04-t02` and advanced to `p04-t03`.
- 2026-04-09: Completed `p04-t03` and advanced to `p04-t04`.
- 2026-04-09: Completed `p04-t04`, closed Phase 4, and advanced to `p05-t01`.
- 2026-04-09: Completed `p05-t01`, closed Phase 5, and finished implementation.
- 2026-04-09: Received final review, added `p06-t01` and `p06-t02`, and resumed implementation from `p06-t01`.
- 2026-04-09: Completed `p06-t01` and advanced to `p06-t02`.
- 2026-04-09: Completed `p06-t02`, closed Phase 6, and finished review-fix implementation.
- 2026-04-09: Final re-review passed with no remaining findings.
- 2026-04-09: Received independent final second-opinion review, added `p06-t03` through `p06-t05`, deferred `m4` by explicit user direction, and resumed implementation from `p06-t03`.
- 2026-04-10: Completed `p06-t03` and advanced to `p06-t04`.
- 2026-04-10: Completed `p06-t04` and advanced to `p06-t05`.
- 2026-04-10: Completed `p06-t05`, closed Phase 6, and finished the second-opinion review-fix implementation.

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Passed | Failed | Coverage |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -      | -      | -        |
| 2     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -      | -      | -        |
| 3     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -      | -      | -        |
| 4     | `pnpm install`; `pnpm build`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts src/commands/config/dump.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check`; `pnpm --filter @open-agent-toolkit/control-plane test`; `pnpm --filter @open-agent-toolkit/control-plane lint`; `pnpm --filter @open-agent-toolkit/control-plane type-check`; `pnpm --filter @open-agent-toolkit/control-plane build`; `pnpm run cli -- project status --json`; `pnpm run cli -- project list --json`; `pnpm run cli -- config dump --json` | pass   | 0      | n/a      |
| 5     | `pnpm build`; `pnpm test`; `pnpm lint`; `pnpm type-check`; `pnpm release:validate`; `pnpm run cli -- project status --json`; `pnpm run cli -- project list --json`; `pnpm run cli -- config dump --json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | pass   | 0      | n/a      |
| 6     | `pnpm --filter @open-agent-toolkit/control-plane test`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts src/commands/project/list.test.ts`; `pnpm --filter @open-agent-toolkit/control-plane lint`; `pnpm --filter @open-agent-toolkit/control-plane type-check`; `pnpm --filter @open-agent-toolkit/control-plane build`                                                                                                                                                                                                                                                                                                                                                                                                                     | pass   | 0      | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- Added the new `@open-agent-toolkit/control-plane` package for parsing OAT project artifacts, aggregating project state, listing projects, and recommending the next lifecycle skill.
- Added `oat project status` with text and JSON output for the active project's full control-plane state.
- Added `oat project list` with text and JSON output for projects under the configured projects root.
- Added `oat config dump` with merged shared/local/user/env-aware config resolution and source attribution.

**Behavioral changes (user-facing):**

- Users can inspect the active project's parsed lifecycle state directly from the CLI instead of reading artifacts manually.
- Users can enumerate tracked OAT projects and their completion/recommendation summaries from the CLI.
- Users can dump resolved OAT configuration, including source precedence, in a machine-readable JSON format.

**Key files / modules:**

- `packages/control-plane/src/project.ts` - assembles full project state and project summaries from OAT artifacts.
- `packages/control-plane/src/shared/utils/` - shared frontmatter, normalization, and error helpers extracted during final review-fix work.
- `packages/control-plane/src/recommender/router.ts` - pure next-skill routing logic used by the control plane.
- `packages/control-plane/src/state/parser.ts` - typed `state.md` frontmatter parsing.
- `packages/control-plane/src/state/tasks.ts` - plan and implementation progress parsing.
- `packages/control-plane/src/state/reviews.ts` - review table parsing and active review detection.
- `packages/cli/src/commands/project/status.ts` - active project status command.
- `packages/cli/src/commands/project/list.ts` - project listing command.
- `packages/cli/src/config/resolve.ts` - merged config resolution with precedence/source tracking.
- `packages/cli/src/commands/config/dump.ts` - config dump command surface.

**Verification performed:**

- `pnpm --filter @open-agent-toolkit/control-plane test`
- `pnpm --filter @open-agent-toolkit/control-plane lint`
- `pnpm --filter @open-agent-toolkit/control-plane type-check`
- `pnpm --filter @open-agent-toolkit/control-plane build`
- `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`
- `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`
- `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts src/commands/config/dump.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm type-check`
- `pnpm release:validate`
- `pnpm run cli -- project status --json`
- `pnpm run cli -- project list --json`
- `pnpm run cli -- config dump --json`

**Design deltas (if any):**

- The control-plane package stayed read-only and pure as designed, but the CLI implementation also fixed a completed-task parsing bug surfaced by the new `project status` command so live counts match real implementation artifacts.
- Final review-fix work extracted duplicated control-plane helpers into `shared/utils/` and reduced redundant project-summary file reads without changing the outward JSON contract.
- Final verification was completed with sequential reruns because the repo's existing CLI asset bundler is not safe for concurrent build/smoke execution.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
