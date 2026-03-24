---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-24
oat_current_task_id: p04-t04
oat_generated: false
---

# Implementation: npm-publish

**Started:** 2026-03-23
**Last Updated:** 2026-03-24

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
| Phase 1 | completed   | 4     | 4/4       |
| Phase 2 | completed   | 3     | 3/3       |
| Phase 3 | completed   | 3     | 3/3       |
| Phase 4 | in_progress | 6     | 3/6       |

**Total:** 13/16 tasks completed

---

## Phase 1: Public Package Contract

**Status:** completed
**Started:** 2026-03-23

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- The repo now has an explicit code-level contract for the four first-release
  public packages under the `@voxmedia/oat-*` namespace.
- All four package manifests now advertise public npm metadata and intentional
  publish surfaces instead of remaining private workspace-only packages.
- The in-repo docs app and root helper script now reference the renamed package
  identities, and the workspace lockfile is updated accordingly.

**Key files touched:**

- `packages/cli/src/release/public-package-contract.ts` - reusable release contract definitions
- `packages/cli/package.json` - public CLI manifest contract
- `packages/docs-config/package.json` - public docs-config manifest contract
- `packages/docs-theme/package.json` - public docs-theme manifest contract
- `packages/docs-transforms/package.json` - public docs-transforms manifest contract
- `apps/oat-docs/package.json` - workspace consumer alignment
- `package.json` - root helper script alignment
- `pnpm-lock.yaml` - lockfile refresh after dependency name changes

**Verification:**

- Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm --filter ./packages/cli build`
- Result: pass
- Run: `pnpm --filter ./packages/cli type-check`
- Result: pass
- Run: `pnpm --filter ./packages/docs-config build`
- Result: pass
- Run: `pnpm --filter ./packages/docs-theme build`
- Result: pass
- Run: `pnpm --filter ./packages/docs-transforms build`
- Result: pass
- Run: `pnpm install --frozen-lockfile`
- Result: pass after refreshing `pnpm-lock.yaml`

**Notes / Decisions:**

- `README.md` is already included in manifest `files` lists even though the
  package README content is scheduled for Phase 4, so the package contract stays
  stable while docs work catches up.
- Lockfile refresh was required as part of workspace-consumer alignment even
  though `pnpm-lock.yaml` was not explicitly called out in the original task.

### Task p01-t01: Add package-contract validation helpers

**Status:** completed
**Commit:** 80c422b

**Outcome (required when completed):**

- The repo now has a typed release-contract helper that defines the four
  target public packages and their metadata/artifact expectations.
- Validation-focused tests cover package names, roles, required paths, and
  forbidden publish-surface patterns for the first release boundary.

**Files changed:**

- `packages/cli/src/release/public-package-contract.ts` - new shared public-package contract definitions
- `packages/cli/src/release/public-package-contract.test.ts` - validation-focused contract tests

**Verification:**

- Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm --filter ./packages/cli type-check`
- Result: pass

**Notes / Decisions:**

- Initial implementation run confirmed `oat_plan_hill_phases: ["p04"]`, meaning execution should continue until the final phase unless blocked.
- The initial RED failure was the missing helper module, which is sufficient for
  this task because manifest conformance checks are intentionally deferred to
  `p01-t02` through `p01-t04`.

**Issues Encountered:**

- None yet.

---

### Task p01-t02: Update CLI manifest for public publication

**Status:** completed
**Commit:** b873fa0

**Outcome (required when completed):**

- The CLI package now advertises the public npm identity
  `@voxmedia/oat-cli` instead of the internal `@oat/cli` name.
- The manifest now carries public-package metadata and an explicit publish
  surface for the built CLI artifact and bundled assets.

**Files changed:**

- `packages/cli/package.json` - renamed the package and added public npm metadata
- `packages/cli/src/release/public-package-contract.test.ts` - added CLI
  manifest conformance assertions

**Verification:**

- Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm --filter ./packages/cli build`
- Result: pass
- Run: `pnpm --filter ./packages/cli type-check`
- Result: pass

**Notes / Decisions:**

- The package-level README is referenced in `files` now even though the README
  content itself is scheduled for `p04-t01`; this keeps the manifest aligned
  with the intended public package contract early.

### Task p01-t03: Update docs package manifests for public publication

**Status:** completed
**Commit:** 1689ea7

**Outcome (required when completed):**

- The three docs libraries now expose their public npm identities under the
  `@voxmedia/oat-*` namespace instead of the internal `@oat/docs-*` names.
- Each docs package now has explicit public npm metadata and a constrained
  publish surface that matches the intended library contract.
- `docs-config` now depends on `@voxmedia/oat-docs-transforms`, keeping the
  internal workspace dependency graph aligned with the public package contract.

**Files changed:**

- `packages/docs-config/package.json` - renamed the package and updated public metadata
- `packages/docs-theme/package.json` - renamed the package and updated public metadata
- `packages/docs-transforms/package.json` - renamed the package and updated public metadata
- `packages/cli/src/release/public-package-contract.test.ts` - added docs package manifest conformance assertions

**Verification:**

- Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm --filter ./packages/docs-config build`
- Result: pass
- Run: `pnpm --filter ./packages/docs-theme build`
- Result: pass
- Run: `pnpm --filter ./packages/docs-transforms build`
- Result: pass

**Notes / Decisions:**

- The docs package manifests now mirror the CLI metadata pattern so later pack
  validation can treat all four packages through one contract-driven flow.

### Task p01-t04: Align workspace consumer manifests with renamed packages

**Status:** completed
**Commit:** bef7e12

**Outcome (required when completed):**

- The in-repo docs app now consumes the renamed `@voxmedia/oat-*` workspace
  packages instead of the legacy `@oat/*` package names.
- The root `cli:link` helper now targets the renamed CLI package identity.
- The workspace lockfile is refreshed so frozen installs succeed after the
  package-rename migration.

**Files changed:**

- `apps/oat-docs/package.json` - updated workspace dependencies and devDependency to the renamed packages
- `package.json` - updated the `cli:link` filter to `@voxmedia/oat-cli`
- `packages/cli/src/release/public-package-contract.test.ts` - added workspace consumer alignment assertions
- `pnpm-lock.yaml` - updated workspace dependency graph after package renames

**Verification:**

- Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm install --frozen-lockfile`
- Result: pass

**Notes / Decisions:**

- The task surfaced lockfile drift rather than a code issue; updating
  `pnpm-lock.yaml` was required to satisfy the intended CI verification path.

---

## Phase 2: Reference and Template Alignment

**Status:** completed
**Started:** 2026-03-24

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Repo-owned docs consumers, scaffolds, templates, and package-oriented tests
  now consistently reference the public `@voxmedia/oat-*` package names.
- The canonical Fumadocs templates now emit the public package identities for
  both workspace and versioned dependency modes.
- Integration, MkDocs compatibility, pipeline, and migration fixture coverage
  now validates the renamed public package surface end-to-end.

**Key files touched:**

- `apps/oat-docs/*` and `packages/docs-config/src/source-config.ts` - in-repo
  import alignment for public package names
- `.oat/templates/docs-app-fuma/*` - canonical Fumadocs scaffold templates
- `packages/cli/src/commands/docs/init/*.test.ts` - scaffold and integration
  coverage for the renamed package identities
- `packages/cli/src/commands/docs/e2e-pipeline.test.ts` - consumer-facing CLI
  install example alignment
- `packages/cli/src/commands/docs/migrate/fixtures/*` - migration fixture
  examples aligned to the public CLI package name

**Verification:**

- Run: `pnpm --filter ./packages/docs-config type-check`
- Result: pass
- Run: `pnpm --filter oat-docs build`
- Result: pass after rebuilding changed package artifacts
- Run: `pnpm --dir packages/cli exec vitest run src/commands/docs/init/scaffold.test.ts`
- Result: pass
- Run: `pnpm --dir packages/cli exec vitest run src/commands/docs/init/integration.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/docs/e2e-pipeline.test.ts src/commands/docs/migrate/frontmatter.test.ts`
- Result: pass

**Notes / Decisions:**

- `packages/cli` uses a broad `vitest run` test script, so task-level
  verification had to call `vitest` directly to avoid accidentally absorbing
  later integration fallout into `p02-t02`.
- The `p02-t03` commit printed an `oxfmt` staged-target warning for Markdown
  globs, but the commit still completed and the targeted verification suite
  passed before commit.

### Task p02-t01: Rename in-repo import specifiers to the public docs package names

**Status:** completed
**Commit:** f35c9b7

**Outcome (required when completed):**

- The in-repo docs app source now imports the docs config and theme packages
  using their public `@voxmedia/oat-*` names.
- `docs-config` now imports the renamed transforms package, and the Mermaid
  transform docs reference the renamed theme package.
- The docs app build succeeds once the touched docs packages are rebuilt.

**Files changed:**

- `apps/oat-docs/source.config.ts` - renamed docs-config import
- `apps/oat-docs/next.config.js` - renamed docs-config import
- `apps/oat-docs/app/layout.tsx` - renamed docs-theme import
- `apps/oat-docs/app/[[...slug]]/page.tsx` - renamed docs-theme import
- `packages/docs-config/src/source-config.ts` - renamed transforms package import
- `packages/docs-transforms/src/remark-mermaid.ts` - updated package reference in doc comment

**Verification:**

- Run: `pnpm --filter ./packages/docs-config type-check`
- Result: pass
- Run: `pnpm --filter oat-docs build`
- Result: pass after rebuilding changed package artifacts

**Notes / Decisions:**

- The first `oat-docs build` failure after the source rename was caused by a
  race with stale built artifacts, not a remaining source import. Rebuilding
  `docs-config` and `docs-transforms` resolved it.

### Task p02-t02: Update docs-init scaffolding and canonical Fumadocs templates

**Status:** completed
**Commit:** 02cff23

**Outcome (required when completed):**

- The docs-init scaffold fixtures now assert `@voxmedia/oat-*` package names
  instead of the old `@oat/*` identities.
- The canonical Fumadocs templates emitted by the CLI now import and depend on
  the public docs packages under the `@voxmedia` scope.
- The scaffold implementation comment now documents lockstep publication
  against `@voxmedia/oat-cli`.

**Files changed:**

- `.oat/templates/docs-app-fuma/package.json.template` - renamed docs package dependencies
- `.oat/templates/docs-app-fuma/source.config.ts` - renamed docs-config import
- `.oat/templates/docs-app-fuma/next.config.js` - renamed docs-config import
- `.oat/templates/docs-app-fuma/app/layout.tsx` - renamed docs-theme import
- `.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx` - renamed docs-theme import
- `packages/cli/src/commands/docs/init/scaffold.test.ts` - aligned scaffold fixtures and expectations
- `packages/cli/src/commands/docs/init/scaffold.ts` - updated lockstep publish naming comment

**Verification:**

- Run: `pnpm --dir packages/cli exec vitest run src/commands/docs/init/scaffold.test.ts`
- Result: pass

**Notes / Decisions:**

- A direct `vitest` file invocation was required because `pnpm --filter ./packages/cli test -- ...`
  still ran the package-wide `vitest run` script and picked up unrelated docs-init tests.

### Task p02-t03: Update integration/e2e/migration tests and fixtures to match the public package names

**Status:** completed
**Commit:** c0e2b6a

**Outcome (required when completed):**

- The real-template integration tests now seed and assert the public
  `@voxmedia/oat-*` package names in both monorepo and consuming-repo modes.
- The MkDocs compatibility test now guards against the renamed Fumadocs package
  identities instead of the stale internal names.
- Consumer-facing pipeline examples and frontmatter migration fixtures now use
  the public CLI package name `@voxmedia/oat-cli`.

**Files changed:**

- `packages/cli/src/commands/docs/init/integration.test.ts` - aligned real-template seed data and dependency assertions
- `packages/cli/src/commands/docs/init/mkdocs-compat.test.ts` - aligned negative dependency assertions
- `packages/cli/src/commands/docs/e2e-pipeline.test.ts` - updated install example
- `packages/cli/src/commands/docs/migrate/fixtures/frontmatter-input.md` - updated CLI package name
- `packages/cli/src/commands/docs/migrate/fixtures/frontmatter-expected.md` - updated CLI package name

**Verification:**

- Run: `pnpm --dir packages/cli exec vitest run src/commands/docs/init/integration.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/docs/e2e-pipeline.test.ts src/commands/docs/migrate/frontmatter.test.ts`
- Result: pass

**Notes / Decisions:**

- The pre-commit hook emitted an `oxfmt` "Expected at least one target file"
  warning for the staged Markdown subset, but the commit still succeeded and no
  post-commit tree drift was introduced in the task files.

---

## Phase 3: Release Validation and Automation

**Status:** completed
**Started:** 2026-03-24

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- The repo now has a reusable release validator that builds the four public
  packages, inspects pnpm-produced tarballs, and fails on metadata, build, or
  pack-surface regressions.
- GitHub Actions now has a PR-safe dry-run workflow and a tag-triggered publish
  workflow for the lockstep `@voxmedia/oat-*` release.
- Release automation is insulated from ambient scoped npm registry config by
  writing workflow-local npmjs userconfig files.

**Key files touched:**

- `tools/release/validate-public-packages.ts` - root release validator
- `packages/cli/src/release/public-package-contract.ts` - shared tarball and
  metadata validation helpers
- `packages/cli/src/release/public-package-contract.test.ts` - validation and
  pack-contract coverage
- `.github/workflows/ci.yml` - release validation added to general CI
- `.github/workflows/release-dry-run.yml` - PR-safe publish dry run
- `.github/workflows/release.yml` - coordinated tag-triggered publish workflow

**Verification:**

- Run: `pnpm --dir packages/cli exec vitest run src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass
- Run: `pnpm build && pnpm release:validate`
- Result: pass
- Run: `NPM_CONFIG_USERCONFIG=<temp npmjs config> pnpm --filter @voxmedia/oat-docs-config publish --dry-run --access public --no-git-checks`
- Result: pass and targets `https://registry.npmjs.org/`

**Notes / Decisions:**

- The validator originally used `npm pack --dry-run`, but that missed pnpm's
  workspace dependency rewrite behavior. It was corrected to inspect
  `pnpm pack` tarballs and the packed `package.json` instead.
- Dry-run and publish workflows both pin npmjs in a workflow-local userconfig so
  a scoped `@voxmedia` registry mapping in developer config cannot leak into CI.

### Task p03-t01: Create a release-validation runner for build and pack checks

**Status:** completed
**Commit:** b2347c1, 20c3014

**Outcome (required when completed):**

- Added a root `release:validate` entrypoint that builds the four public
  packages and validates their packed artifacts against the shared release
  contract.
- Release validation now checks packed metadata fields, required paths,
  forbidden paths, build artifacts, and unresolved `workspace:` dependency
  specs.

**Files changed:**

- `tools/release/validate-public-packages.ts` - root validator and tarball inspection flow
- `package.json` - added `release:validate`
- `packages/cli/src/release/public-package-contract.ts` - shared validation helpers
- `packages/cli/src/release/public-package-contract.test.ts` - validation-runner coverage

**Verification:**

- Run: `pnpm --dir packages/cli exec vitest run src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm build && pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- `pnpm pack` is the authoritative artifact source because pnpm rewrites
  `workspace:` dependency specs during packing and publish.

### Task p03-t02: Add GitHub dry-run validation for release candidates

**Status:** completed
**Commit:** 58f791d

**Outcome (required when completed):**

- General CI now exercises `pnpm release:validate` alongside the existing repo
  health checks.
- A dedicated `release-dry-run` workflow now performs build, release
  validation, and `pnpm publish --dry-run` for each public package on pull
  requests and manual runs.

**Files changed:**

- `.github/workflows/ci.yml` - added `release:validate`
- `.github/workflows/release-dry-run.yml` - new dry-run publish workflow

**Verification:**

- Run: `pnpm release:validate`
- Result: pass
- Run: `NPM_CONFIG_USERCONFIG=<temp npmjs config> pnpm --filter @voxmedia/oat-docs-config publish --dry-run --access public --no-git-checks`
- Result: pass against npmjs

### Task p03-t03: Add the coordinated publish workflow for lockstep releases

**Status:** completed
**Commit:** 72bb9cf

**Outcome (required when completed):**

- Added a tag-triggered publish workflow that reruns build and release
  validation, publishes the four `@voxmedia/oat-*` packages in lockstep order,
  and then creates a GitHub release.

**Files changed:**

- `.github/workflows/release.yml` - coordinated publish workflow

**Verification:**

- Run: Manual workflow review against the validated dry-run path and the
  `work-chronicler` reference release shape
- Result: pass

---

## Phase 4: Consumer Docs and Launch Readiness

**Status:** completed
**Started:** 2026-03-24

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- All four public packages now have npm-facing READMEs that describe purpose,
  install surface, and exported entry points.
- The repo README and docs-site consumer guidance now refer to
  `@voxmedia/oat-*` instead of the old private `@oat/*` package names.
- The publish validator now enforces README presence in public tarballs.

**Key files touched:**

- `packages/*/README.md` - new npm package READMEs
- `README.md` - public package/install guidance
- `apps/oat-docs/docs/*` - docs-site guidance aligned to public package names
- `packages/cli/src/release/public-package-contract.ts` - README required in tarballs
- `packages/cli/src/release/public-package-contract.test.ts` - README contract coverage

**Verification:**

- Run: `pnpm --dir packages/cli exec vitest run src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass
- Run: `rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' README.md apps/oat-docs/docs`
- Result: no matches
- Run: `pnpm build:docs`
- Result: pass

### Task p04-t01: Add package-level READMEs for all four public packages

**Status:** completed
**Commit:** f61b39c

**Outcome (required when completed):**

- Added npm-facing README files for the CLI and the three docs packages.
- Updated the release contract so `release:validate` now requires `README.md`
  in every public package tarball.

**Files changed:**

- `packages/cli/README.md`
- `packages/docs-config/README.md`
- `packages/docs-theme/README.md`
- `packages/docs-transforms/README.md`
- `packages/cli/src/release/public-package-contract.ts`
- `packages/cli/src/release/public-package-contract.test.ts`

**Verification:**

- Run: `pnpm --dir packages/cli exec vitest run src/release/public-package-contract.test.ts`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

### Task p04-t02: Update root and docs-site consumer guidance to the public package names

**Status:** completed
**Commit:** 5909304

**Outcome (required when completed):**

- Root consumer guidance now documents the public `@voxmedia/oat-*` package
  identities and post-publish install paths.
- Docs-site consumer and contributor guidance now references the public package
  names instead of the old private `@oat/*` package identities.

**Files changed:**

- `README.md`
- `apps/oat-docs/docs/quickstart.md`
- `apps/oat-docs/docs/guide/documentation/commands.md`
- `apps/oat-docs/docs/contributing/code.md`
- `apps/oat-docs/docs/contributing/design-principles.md`

**Verification:**

- Run: `rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' README.md apps/oat-docs/docs`
- Result: no matches
- Run: `pnpm build:docs`
- Result: pass

### Task p04-t03: (review) Regenerate knowledge artifacts for renamed public packages

**Status:** completed
**Commit:** e83c506

**Outcome (required when completed):**

- Refreshed the generated knowledge artifacts so they no longer describe the old
  `@oat/*` public package names.
- Updated the generated knowledge snapshot metadata to point at the current
  review-receive branch state instead of the pre-implementation SHA.
- Refreshed the `knowledgeIndex` tracking timestamp and regenerated the repo
  dashboard so the repo state reflects the active implementation phase again.

**Files changed:**

- `.oat/repo/knowledge/project-index.md`
- `.oat/repo/knowledge/architecture.md`
- `.oat/repo/knowledge/concerns.md`
- `.oat/repo/knowledge/conventions.md`
- `.oat/repo/knowledge/integrations.md`
- `.oat/repo/knowledge/stack.md`
- `.oat/repo/knowledge/structure.md`
- `.oat/repo/knowledge/testing.md`
- `.oat/tracking.json`

**Verification:**

- Run: `rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' .oat/repo/knowledge`
- Result: pass (no matches)
- Run: `pnpm run cli -- state refresh`
- Result: pass

**Notes / Decisions:**

- The shared `resolve-tracking.sh` helper normalizes knowledge-index tracking to
  the root branch SHA, so `.oat/tracking.json` records the refreshed run while
  the regenerated markdown files themselves carry the current branch snapshot.

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

### 2026-03-24

**Session Start:** 01:19 UTC

- [x] p01-t01: Add package-contract validation helpers - `80c422b`
- [x] p01-t02: Update CLI manifest for public publication - `b873fa0`
- [x] p01-t03: Update docs package manifests for public publication - `1689ea7`
- [x] p01-t04: Align workspace consumer manifests with renamed packages - `bef7e12`
- [x] p02-t01: Rename in-repo import specifiers to the public docs package names - `f35c9b7`
- [x] p02-t02: Update docs-init scaffolding and canonical Fumadocs templates - `02cff23`
- [x] p02-t03: Update integration/e2e/migration tests and fixtures to match the public package names - `c0e2b6a`
- [x] p03-t01: Create a release-validation runner for build and pack checks - `b2347c1`, `20c3014`
- [x] p03-t02: Add GitHub dry-run validation for release candidates - `58f791d`
- [x] p03-t03: Add the coordinated publish workflow for lockstep releases - `72bb9cf`
- [x] p04-t01: Add package-level READMEs for all four public packages - `f61b39c`
- [x] p04-t02: Update root and docs-site consumer guidance to the public package names - `5909304`
- [x] p04-t03: (review) Regenerate knowledge artifacts for renamed public packages - `e83c506`

**What changed (high level):**

- Initialized implementation tracking for the approved npm-publish plan.
- Confirmed checkpoint behavior as final-phase-only (`p04`).
- Added the first reusable release-contract helper and test surface in
  `packages/cli/src/release/`.
- Renamed the CLI package to `@voxmedia/oat-cli` and added public npm metadata.
- Renamed the three docs libraries to `@voxmedia/oat-*` and aligned their
  publish metadata plus internal package dependency naming.
- Aligned the workspace docs app, root helper script, and lockfile to the
  renamed package identities.
- Renamed the in-repo docs app and docs-config source imports to the public
  `@voxmedia/oat-*` package names.
- Updated the canonical Fumadocs templates and scaffold fixtures to emit the
  renamed public package identities.
- Aligned integration tests, e2e coverage, MkDocs compatibility checks, and
  migration fixtures to the `@voxmedia/oat-*` public package surface.
- Added release validation and GitHub workflows for dry-run and tag-based
  public package publishing.
- Added npm-facing package READMEs and updated root/docs-site consumer guidance
  to the public `@voxmedia/oat-*` package names.

**Decisions:**

- Continue automatically across phases until `p04` unless blocked.

**Follow-ups / TODO:**

- Next step is project code review for the completed implementation.

**Blockers:**

- None.

**Session End:** implementation complete

---

### Review Received: final

**Date:** 2026-03-24
**Review artifact:** `reviews/archived/final-review-2026-03-23.md`

**Findings:**

- Critical: 0
- Important: 2
- Medium: 0
- Minor: 3

**New tasks added:** `p04-t03`, `p04-t04`, `p04-t05`, `p04-t06`

**Deferred Findings:**

- `I1` Partial publish risk in release workflow
  - Decision: deferred by explicit user direction during final review receive.
  - Rationale: acknowledged first-release operational risk already called out in the design; no implementation change is required before merge to satisfy the approved release model.

**Next:** Execute fix tasks via the `oat-project-implement` skill.

After the fix tasks are complete:

- Update the review row status to `fixes_completed`
- Re-run `oat-project-review-provide code final` then `oat-project-review-receive` to reach `passed`

### 2026-03-24

**Session Start:** 02:22 UTC

- [ ] p04-t03: (review) Regenerate knowledge artifacts for renamed public packages
- [ ] p04-t04: (review) Update CLI contributor instructions to renamed package filters
- [ ] p04-t05: (review) Scope release dry-run workflow to relevant package changes
- [ ] p04-t06: (review) Align dry-run publish order with the real release workflow

**What changed (high level):**

- Processed the final code review and converted accepted findings into four review-fix tasks in Phase 4.
- Deferred the partial-publish operational risk by explicit user decision and recorded the rationale for the final review trail.
- Reopened implementation state so execution resumes from `p04-t03`.

**Follow-ups / TODO:**

- Execute `p04-t03` through `p04-t06`.
- Re-run final code review after the review-fix tasks are complete.

**Blockers:**

- None.

**Session End:** review received; fix tasks queued

---

### 2026-03-23

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

| Phase | Tests Run                                                                | Passed | Failed | Coverage |
| ----- | ------------------------------------------------------------------------ | ------ | ------ | -------- |
| 1     | Contract tests, package builds, frozen install                           | pass   | 0      | -        |
| 2     | Docs init tests, integration tests, docs app build                       | pass   | 0      | -        |
| 3     | Release contract tests, release validate, publish dry-run command checks | pass   | 0      | -        |
| 4     | Release contract tests, docs grep check, docs build                      | pass   | 0      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- Public npm package identities and metadata for the CLI plus three docs libraries
- Lockstep release validation and GitHub Actions automation for dry-run and real publish
- Npm-facing package READMEs and public install guidance aligned to `@voxmedia/oat-*`

**Behavioral changes (user-facing):**

- Consumers can install the CLI as `@voxmedia/oat-cli` and the docs libraries as separate `@voxmedia/oat-*` packages.
- Release readiness is now enforced by `pnpm release:validate` and mirrored in CI/release workflows.

**Key files / modules:**

- `tools/release/validate-public-packages.ts` - lockstep release validator
- `.github/workflows/release-dry-run.yml` - PR-safe publish dry run
- `.github/workflows/release.yml` - tag-triggered coordinated publish workflow
- `packages/*/README.md` - npm package landing pages

**Verification performed:**

- `pnpm build && pnpm release:validate`
- `pnpm --dir packages/cli exec vitest run src/release/public-package-contract.test.ts`
- `pnpm --dir packages/cli exec vitest run src/commands/docs/init/scaffold.test.ts`
- `pnpm --dir packages/cli exec vitest run src/commands/docs/init/integration.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/docs/e2e-pipeline.test.ts src/commands/docs/migrate/frontmatter.test.ts`
- `pnpm build:docs`

**Design deltas (if any):**

- The release validator inspects `pnpm pack` tarballs rather than `npm pack --dry-run` so workspace dependency rewrites are validated against the actual publish artifact.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
