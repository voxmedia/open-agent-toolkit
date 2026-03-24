---
oat_plan_source: spec-driven
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-24
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: npm-publish

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with review gates and pack-validation checks before any real publish.

**Goal:** Publish the CLI and three docs libraries as clean public npm packages under `@voxmedia/oat-*`, with lockstep GitHub-based release automation and aligned consumer-facing references.

**Architecture:** Keep the current monorepo package split intact, add explicit public package contracts in package manifests, align scaffold/templates and in-repo consumers to the new package names, and add validation/publish workflows that treat the four packages as one release unit.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript ESM, Vitest, GitHub Actions, npm registry publishing, Next.js/Fumadocs docs app.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p02-t02): update docs init template package names`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`

---

## Phase 1: Public Package Contract

Deliver explicit public package identities, metadata, and package surfaces for the four first-release packages.

### Task p01-t01: Add package-contract validation helpers

**Files:**

- Create: `packages/cli/src/release/public-package-contract.ts`
- Create: `packages/cli/src/release/public-package-contract.test.ts`

**Step 1: Write test (RED)**

Add failing Vitest coverage for:

- the four expected public package names
- required metadata fields (`repository`, `homepage`, `bugs`, `license`, publish access)
- required/forbidden pack surface expectations for CLI vs docs packages

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: New assertions fail against the current repo state.

**Step 2: Implement (GREEN)**

Add a small typed helper surface that models the release contract and exposes reusable validation targets.

```typescript
export interface PublicPackageContract {
  workspaceDir: string;
  publicName: string;
  role: 'cli' | 'docs-library';
  requiredPaths: string[];
  forbiddenPathPatterns: string[];
}

export function getPublicPackageContracts(): PublicPackageContract[] {
  return [{ ... }];
}
```

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Contract tests pass.

**Step 3: Refactor**

Keep the contract data isolated from workflow code so later validation scripts can reuse it without duplicating the package list.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli type-check && pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Type-check and targeted tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/release/public-package-contract.ts packages/cli/src/release/public-package-contract.test.ts
git commit -m "feat(p01-t01): add public package contract helpers"
```

---

### Task p01-t02: Update CLI manifest for public publication

**Files:**

- Modify: `packages/cli/package.json`

**Step 1: Write test (RED)**

Extend `packages/cli/src/release/public-package-contract.test.ts` with CLI-specific expectations for:

- `name: @voxmedia/oat-cli`
- `private: false`
- explicit public-package metadata
- intentional publish surface for built CLI output and bundled assets

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: CLI manifest assertions fail until the package manifest is updated.

**Step 2: Implement (GREEN)**

Update the CLI manifest to satisfy the public contract.

Key manifest shape to add or update:

```typescript
{
  name: '@voxmedia/oat-cli',
  private: false,
  files: ['dist', 'assets', 'README.md'],
  publishConfig: { access: 'public' },
  bin: { oat: 'dist/index.js' },
  repository: '{...}',
}
```

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: CLI manifest assertions pass.

**Step 3: Refactor**

Keep the manifest aligned with Node 22 / ESM behavior and avoid publishing `src/`, tests, or transient build artifacts.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli build && pnpm --filter ./packages/cli type-check`
Expected: CLI still builds cleanly with the updated package contract.

**Step 5: Commit**

```bash
git add packages/cli/package.json
git commit -m "feat(p01-t02): publish the cli under @voxmedia/oat-cli"
```

---

### Task p01-t03: Update docs package manifests for public publication

**Files:**

- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Write test (RED)**

Extend `packages/cli/src/release/public-package-contract.test.ts` with docs-library expectations for:

- `@voxmedia/oat-docs-config`
- `@voxmedia/oat-docs-theme`
- `@voxmedia/oat-docs-transforms`
- `private: false`
- explicit `files`, `exports`, and public metadata

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Docs package manifest assertions fail until the manifests are updated.

**Step 2: Implement (GREEN)**

Update each docs package manifest to the new public names and publish metadata while preserving the current `dist`-based entrypoints and peer dependency contracts.

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Docs package manifest assertions pass.

**Step 3: Refactor**

Keep cross-package references consistent, especially `docs-config`'s dependency on the transforms package.

**Step 4: Verify**

Run: `pnpm --filter ./packages/docs-config build && pnpm --filter ./packages/docs-theme build && pnpm --filter ./packages/docs-transforms build`
Expected: All three docs packages build cleanly under the renamed package identities.

**Step 5: Commit**

```bash
git add packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "feat(p01-t03): publish docs libraries under @voxmedia/oat-*"
```

---

### Task p01-t04: Align workspace consumer manifests with renamed packages

**Files:**

- Modify: `apps/oat-docs/package.json`
- Modify: `package.json`

**Step 1: Write test (RED)**

Add or extend a targeted manifest check in `packages/cli/src/release/public-package-contract.test.ts` to assert that in-repo workspace consumers reference the renamed package identities and that root helper scripts do not filter on stale `@oat/*` names.

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Assertions fail while workspace consumers still point at `@oat/*`.

**Step 2: Implement (GREEN)**

Update `apps/oat-docs/package.json` and any root scripts that reference the old package names so the workspace stays internally consistent during implementation and CI.

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Workspace manifest assertions pass.

**Step 3: Refactor**

Avoid changing runtime behavior beyond package identity alignment; keep the docs app build/development scripts otherwise intact unless a rename makes a warning impossible to ignore.

**Step 4: Verify**

Run: `pnpm install --frozen-lockfile`
Expected: The workspace installs with the renamed package identities resolved locally.

**Step 5: Commit**

```bash
git add apps/oat-docs/package.json package.json
git commit -m "feat(p01-t04): align workspace consumers to renamed packages"
```

---

## Phase 2: Reference and Template Alignment

Update imports, scaffolds, and test fixtures so repo-owned consumer surfaces consistently use the public package contract.

### Task p02-t01: Rename in-repo import specifiers to the public docs package names

**Files:**

- Modify: `apps/oat-docs/source.config.ts`
- Modify: `apps/oat-docs/next.config.js`
- Modify: `apps/oat-docs/app/layout.tsx`
- Modify: `apps/oat-docs/app/[[...slug]]/page.tsx`
- Modify: `packages/docs-config/src/source-config.ts`
- Modify: `packages/docs-transforms/src/remark-mermaid.ts`

**Step 1: Write test (RED)**

Add or update build-focused checks so the docs app and docs-config package fail if they still import `@oat/docs-*`.

Suggested red checks:

- `pnpm --filter oat-docs build`
- `pnpm --filter ./packages/docs-config type-check`

Expected: At least one check fails until import specifiers are renamed consistently.

**Step 2: Implement (GREEN)**

Rename import specifiers and package-name references in code/comments that define the public consumer contract.

Run: `pnpm --filter ./packages/docs-config type-check && pnpm --filter oat-docs build`
Expected: Docs package and docs app compile successfully with the new import specifiers.

**Step 3: Refactor**

Keep the change limited to package-identity references; do not alter docs-app behavior or theme/config APIs.

**Step 4: Verify**

Run: `pnpm --filter ./packages/docs-config test && pnpm --filter oat-docs build`
Expected: Existing docs-config tests pass and the docs app still builds.

**Step 5: Commit**

```bash
git add apps/oat-docs/source.config.ts apps/oat-docs/next.config.js apps/oat-docs/app/layout.tsx apps/oat-docs/app/[[...slug]]/page.tsx packages/docs-config/src/source-config.ts packages/docs-transforms/src/remark-mermaid.ts
git commit -m "feat(p02-t01): rename in-repo docs package imports"
```

---

### Task p02-t02: Update docs-init scaffolding and canonical Fumadocs templates

**Files:**

- Modify: `packages/cli/src/commands/docs/init/scaffold.ts`
- Modify: `.oat/templates/docs-app-fuma/package.json.template`
- Modify: `.oat/templates/docs-app-fuma/source.config.ts`
- Modify: `.oat/templates/docs-app-fuma/next.config.js`
- Modify: `.oat/templates/docs-app-fuma/app/layout.tsx`
- Modify: `.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx`

**Step 1: Write test (RED)**

Add failing scaffold expectations that generated docs apps use `@voxmedia/oat-*` when outside the OAT repo and still use `workspace:*` locally inside the repo.

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/init/scaffold.test.ts`
Expected: Scaffold tests fail until the replacement logic and template files are updated.

**Step 2: Implement (GREEN)**

Update scaffold replacement logic and canonical template sources so generated Fumadocs apps emit the new public package names while preserving the current lockstep version behavior.

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/init/scaffold.test.ts`
Expected: Scaffold tests pass with the renamed package outputs.

**Step 3: Refactor**

Keep the package-name mapping centralized in scaffold code so future version lookups or scope changes do not require editing multiple code paths.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli type-check && pnpm --filter ./packages/cli test -- src/commands/docs/init/scaffold.test.ts`
Expected: CLI type-check and scaffold tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs/init/scaffold.ts .oat/templates/docs-app-fuma/package.json.template .oat/templates/docs-app-fuma/source.config.ts .oat/templates/docs-app-fuma/next.config.js .oat/templates/docs-app-fuma/app/layout.tsx .oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx
git commit -m "feat(p02-t02): update docs init templates to @voxmedia/oat-*"
```

---

### Task p02-t03: Update scaffold, migration, and pipeline tests for the renamed package contract

**Files:**

- Modify: `packages/cli/src/commands/docs/init/scaffold.test.ts`
- Modify: `packages/cli/src/commands/docs/init/integration.test.ts`
- Modify: `packages/cli/src/commands/docs/e2e-pipeline.test.ts`
- Modify: `packages/cli/src/commands/docs/migrate/fixtures/frontmatter-input.md`
- Modify: `packages/cli/src/commands/docs/migrate/fixtures/frontmatter-expected.md`

**Step 1: Write test (RED)**

Tighten expectations to assert:

- versioned installs use `@voxmedia/oat-docs-*`
- CLI installation examples use `@voxmedia/oat-cli`
- migration fixtures no longer reference `@oat/cli`

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/init/integration.test.ts src/commands/docs/e2e-pipeline.test.ts`
Expected: Tests fail until fixtures and assertions are updated.

**Step 2: Implement (GREEN)**

Update fixtures and test assertions to the new public package contract.

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts src/commands/docs/e2e-pipeline.test.ts`
Expected: Updated CLI docs/scaffold tests pass.

**Step 3: Refactor**

Consolidate repeated public package name literals in tests where it improves maintainability without obscuring expectations.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli test`
Expected: Full CLI test suite passes with the renamed package contract.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs/init/scaffold.test.ts packages/cli/src/commands/docs/init/integration.test.ts packages/cli/src/commands/docs/e2e-pipeline.test.ts packages/cli/src/commands/docs/migrate/fixtures/frontmatter-input.md packages/cli/src/commands/docs/migrate/fixtures/frontmatter-expected.md
git commit -m "test(p02-t03): update docs tests and fixtures for public package names"
```

---

## Phase 3: Release Validation and Automation

Add a reusable dry-run validation path and GitHub workflows that publish all four packages together from the repo.

### Task p03-t01: Create a release-validation runner for build and pack checks

**Files:**

- Create: `tools/release/validate-public-packages.ts`
- Modify: `package.json`
- Modify: `packages/cli/src/release/public-package-contract.ts`

**Step 1: Write test (RED)**

Extend `packages/cli/src/release/public-package-contract.test.ts` or add focused runner assertions so the validation layer can prove:

- each target package is built before packing
- tarballs include required outputs and exclude internal-only files
- missing metadata or pack-surface regressions fail the run

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: New validation-runner expectations fail before the runner exists.

**Step 2: Implement (GREEN)**

Add a root-executable TypeScript runner that uses the shared contract definitions to:

- build the target packages
- run `npm pack --dry-run` or equivalent tarball inspection
- emit a failing exit code when contract checks do not pass

Add a root script entry such as:

```typescript
{
  "release:validate": "tsx tools/release/validate-public-packages.ts"
}
```

Run: `pnpm release:validate`
Expected: The runner passes only when all four packages satisfy the release contract.

**Step 3: Refactor**

Keep package enumeration and tarball policy in one shared source so workflows and local verification stay aligned.

**Step 4: Verify**

Run: `pnpm build && pnpm release:validate`
Expected: Workspace build and pack validation succeed together.

**Step 5: Commit**

```bash
git add tools/release/validate-public-packages.ts package.json packages/cli/src/release/public-package-contract.ts packages/cli/src/release/public-package-contract.test.ts
git commit -m "feat(p03-t01): add release validation runner"
```

---

### Task p03-t02: Add GitHub dry-run validation for release candidates

**Files:**

- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release-dry-run.yml`

**Step 1: Write test (RED)**

Define the expected workflow contract in comments/checklist form inside the new workflow file:

- install dependencies
- build the workspace
- run `pnpm release:validate`
- optionally run `npm publish --dry-run` steps without real publication

Run: local YAML/logic review plus `pnpm release:validate`
Expected: The workflow specification exists before the automation is wired.

**Step 2: Implement (GREEN)**

Add a PR-safe release-dry-run path that reuses the validation runner and does not require real npm publication.

Run: `pnpm release:validate`
Expected: The local validation entrypoint mirrors the workflow steps.

**Step 3: Refactor**

Keep CI responsibilities clear: general CI stays responsible for repo health, while release-dry-run focuses on package publication readiness.

**Step 4: Verify**

Run: Review the workflow diff against the reference release shape in `work-chronicler` and confirm the dry-run job exercises all four packages.
Expected: The workflow is ready for PR validation without triggering a real publish.

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/release-dry-run.yml
git commit -m "ci(p03-t02): add npm release dry-run validation"
```

---

### Task p03-t03: Add the coordinated publish workflow for lockstep releases

**Files:**

- Create: `.github/workflows/release.yml`

**Step 1: Write test (RED)**

Capture the required release behavior in the workflow draft:

- trigger only from the chosen GitHub-native release mechanism
- rerun validation before publish
- publish the four packages together
- fail fast if npm auth or validation is missing

Expected: The workflow draft clearly defines the publish contract before any real secret-backed execution.

**Step 2: Implement (GREEN)**

Create a publish workflow that:

- checks out the repo
- installs dependencies
- runs the same release validation path
- publishes `@voxmedia/oat-cli`, `@voxmedia/oat-docs-config`, `@voxmedia/oat-docs-theme`, and `@voxmedia/oat-docs-transforms`
- optionally creates/updates the GitHub release after successful publish

**Step 3: Refactor**

Keep secrets/permissions minimal and isolate publish-specific logic from general CI so release failures do not obscure standard CI results.

**Step 4: Verify**

Run: Manual workflow review for secrets, permissions, and package order; compare against the validated dry-run workflow.
Expected: Publish automation is consistent with the dry-run path and ready for org-level credentials.

**Step 5: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(p03-t03): add coordinated npm publish workflow"
```

---

## Phase 4: Consumer Docs and Launch Readiness

Make the new public package contract understandable to external users and package consumers.

### Task p04-t01: Add package-level READMEs for all four public packages

**Files:**

- Create: `packages/cli/README.md`
- Create: `packages/docs-config/README.md`
- Create: `packages/docs-theme/README.md`
- Create: `packages/docs-transforms/README.md`

**Step 1: Write test (RED)**

Extend `packages/cli/src/release/public-package-contract.test.ts` with expectations that each public package includes a package-level README in its intended publish surface.

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: README-related contract assertions fail until the files are created and included.

**Step 2: Implement (GREEN)**

Create concise package READMEs that cover:

- package purpose
- install/import surface
- how the package relates to the CLI or docs toolkit
- link back to the main repo/docs for deeper guidance

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: README contract assertions pass.

**Step 3: Refactor**

Keep the docs packages clearly secondary to the CLI without underselling them as unsupported internals.

**Step 4: Verify**

Run: `pnpm release:validate`
Expected: Pack validation confirms package-level READMEs are included in the publish surface.

**Step 5: Commit**

```bash
git add packages/cli/README.md packages/docs-config/README.md packages/docs-theme/README.md packages/docs-transforms/README.md packages/cli/src/release/public-package-contract.test.ts
git commit -m "docs(p04-t01): add npm-facing package readmes"
```

---

### Task p04-t02: Update root and docs-site consumer guidance to the public package names

**Files:**

- Modify: `README.md`
- Modify: `apps/oat-docs/docs/quickstart.md`
- Modify: `apps/oat-docs/docs/guide/documentation/commands.md`
- Modify: `apps/oat-docs/docs/guide/documentation/quickstart.md`
- Modify: `apps/oat-docs/docs/guide/documentation/workflows.md`

**Step 1: Write test (RED)**

Use a targeted grep-based check to identify stale public-facing `@oat/*` references in the canonical docs sources above.

Run: `rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' README.md apps/oat-docs/docs`
Expected: Existing consumer-facing references are found and must be updated.

**Step 2: Implement (GREEN)**

Rewrite external install/import guidance so it reflects:

- `@voxmedia/oat-cli` as the primary package
- the three docs libraries as supported secondary packages
- the current release reality instead of “private package” guidance

Run: `rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' README.md apps/oat-docs/docs`
Expected: No stale public-facing references remain in the targeted docs.

**Step 3: Refactor**

Keep contributor-only workspace guidance intact where `workspace:*` is still accurate, but separate it cleanly from public consumer guidance.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: The docs site still builds after the content updates.

**Step 5: Commit**

```bash
git add README.md apps/oat-docs/docs/quickstart.md apps/oat-docs/docs/guide/documentation/commands.md apps/oat-docs/docs/guide/documentation/quickstart.md apps/oat-docs/docs/guide/documentation/workflows.md
git commit -m "docs(p04-t02): update public install guidance for @voxmedia/oat-*"
```

---

### Task p04-t03: (review) Regenerate knowledge artifacts for renamed public packages

**Files:**

- Modify: `.oat/repo/knowledge/project-index.md`
- Modify: `.oat/repo/knowledge/architecture.md`
- Modify: `.oat/repo/knowledge/concerns.md`
- Modify: `.oat/repo/knowledge/conventions.md`
- Modify: `.oat/repo/knowledge/integrations.md`
- Modify: `.oat/repo/knowledge/stack.md`
- Modify: `.oat/repo/knowledge/structure.md`
- Modify: `.oat/repo/knowledge/testing.md`
- Modify: `.oat/state.md`
- Modify: `.oat/tracking.json`

**Step 1: Understand the issue**

Review finding: committed generated knowledge artifacts still describe the pre-rename `@oat/*` package surface.
Location: `.oat/repo/knowledge/testing.md:28`

**Step 2: Implement fix**

Regenerate the repo knowledge base from the current branch state so generated architecture, testing, and concern snapshots match the `@voxmedia/oat-*` public package contract.

**Step 3: Verify**

Run: `rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' .oat/repo/knowledge`
Expected: No stale `@oat/*` references remain in the regenerated knowledge artifacts.

**Step 4: Commit**

```bash
git add .oat/repo/knowledge .oat/state.md .oat/tracking.json
git commit -m "docs(p04-t03): refresh knowledge artifacts for public package names"
```

---

### Task p04-t04: (review) Update CLI contributor instructions to renamed package filters

**Files:**

- Modify: `packages/cli/AGENTS.md`

**Step 1: Understand the issue**

Review finding: contributor instructions in the CLI package still show `@oat/cli` in `pnpm --filter` examples after the public rename.
Location: `packages/cli/AGENTS.md:16`

**Step 2: Implement fix**

Replace stale package-name references in the CLI package instructions so contributor commands consistently point to `@voxmedia/oat-cli`.

**Step 3: Verify**

Run: `rg -n '@oat/cli|@voxmedia/oat-cli' packages/cli/AGENTS.md`
Expected: Only `@voxmedia/oat-cli` remains in the file.

**Step 4: Commit**

```bash
git add packages/cli/AGENTS.md
git commit -m "docs(p04-t04): align cli contributor instructions"
```

---

### Task p04-t05: (review) Scope release dry-run workflow to relevant package changes

**Files:**

- Modify: `.github/workflows/release-dry-run.yml`

**Step 1: Understand the issue**

Review finding: the release dry-run workflow currently runs on every pull request to `main`, including changes that cannot affect release readiness.
Location: `.github/workflows/release-dry-run.yml:4`

**Step 2: Implement fix**

Add pull-request path filters so the dry-run workflow runs when release-relevant files change, while skipping docs-only and `.oat/`-only pull requests.

**Step 3: Verify**

Run: `sed -n '1,40p' .github/workflows/release-dry-run.yml`
Expected: The workflow includes pull-request path filters covering packages, release tooling, lockfiles, and workflow definitions.

**Step 4: Commit**

```bash
git add .github/workflows/release-dry-run.yml
git commit -m "ci(p04-t05): scope release dry-run triggers"
```

---

### Task p04-t06: (review) Align dry-run publish order with the real release workflow

**Files:**

- Modify: `.github/workflows/release-dry-run.yml`

**Step 1: Understand the issue**

Review finding: the dry-run workflow publishes packages in a different order than the real release workflow, so it does not fully mirror the dependency-ordered release path.
Location: `.github/workflows/release-dry-run.yml`

**Step 2: Implement fix**

Update the dry-run publish loop to match the real release workflow order: transforms, docs-config, docs-theme, then CLI.

**Step 3: Verify**

Run: `rg -n '@voxmedia/oat-(docs-transforms|docs-config|docs-theme|cli)' .github/workflows/release-dry-run.yml .github/workflows/release.yml`
Expected: The dry-run and release workflows list the packages in the same order.

**Step 4: Commit**

```bash
git add .github/workflows/release-dry-run.yml
git commit -m "ci(p04-t06): align dry-run publish order"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                              |
| ------ | -------- | -------- | ---------- | ----------------------------------------------------- |
| p01    | code     | pending  | -          | -                                                     |
| p02    | code     | pending  | -          | -                                                     |
| p03    | code     | pending  | -          | -                                                     |
| p04    | code     | pending  | -          | -                                                     |
| final  | code     | received | 2026-03-24 | reviews/final-review-2026-03-24.md                    |
| spec   | artifact | pending  | -          | -                                                     |
| design | artifact | passed   | 2026-03-24 | reviews/archived/artifact-design-review-2026-03-23.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved Critical/Important/Medium)

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - define the public package contract and align workspace manifests
- Phase 2: 3 tasks - align code imports, generated templates, and docs/scaffold tests
- Phase 3: 3 tasks - add reusable release validation and GitHub publish automation
- Phase 4: 6 tasks - ship npm-facing package docs, update public consumer guidance, and close final review fixes

**Total: 16 tasks**

Ready for implementation after plan approval.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Archived Design Review: `reviews/archived/artifact-design-review-2026-03-23.md`
- Reference Workflows: `/Users/thomas.stang/Code/work-chronicler/.github/workflows/ci.yml`, `/Users/thomas.stang/Code/work-chronicler/.github/workflows/release.yml`
