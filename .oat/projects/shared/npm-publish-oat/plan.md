---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-02
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03']
oat_auto_review_at_checkpoints: true
oat_plan_source: spec-driven # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
---

# Implementation Plan: npm-publish-oat

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Replace the temporary `@tkstang/oat-*` public contract with the
canonical `@open-agent-toolkit/*` package set while preserving lockstep
validation, consumer/scaffold alignment, and the manual-bootstrap plus
GitHub-release execution path.

**Architecture:** The work is split across three implementation phases:
canonical contract and manifest realignment, consumer/scaffold/docs alignment,
and release-path enablement. The main technical constraint is keeping all
public-contract surfaces aligned through one hard cutover.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, GitHub Actions, npm
package metadata, markdown docs, release validation utilities

**Commit Convention:** `{type}({scope}): {description}` - e.g.,
`chore(p01-t01): rename public package contract`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`
- [x] Leave `oat_plan_hill_phases` unset until implementation start

---

## Phase 1: Canonical Contract Realignment

Deliver the renamed public package contract, package metadata, and manifest
surfaces so the repository has one authoritative `@open-agent-toolkit/*`
identity set.

### Task p01-t01: Rename public package contract tests

**Files:**

- Modify: `packages/cli/src/release/public-package-contract.test.ts`

**Step 1: Write test (RED)**

Update the existing contract tests so they expect the four canonical
`@open-agent-toolkit/*` package names, the preserved role split, and the new
lockstep error messaging strings.

This task intentionally leaves the suite red; `p01-t02` is the task that turns
the renamed contract implementation green.

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Contract assertions fail until implementation and manifests are
aligned.

**Step 2: Implement (GREEN)**

```typescript
// packages/cli/src/release/public-package-contract.test.ts
expect(contracts.map((contract) => contract.publicName)).toEqual([
  '@open-agent-toolkit/cli',
  '@open-agent-toolkit/docs-config',
  '@open-agent-toolkit/docs-theme',
  '@open-agent-toolkit/docs-transforms',
]);
```

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Tests still fail until the contract implementation is renamed.

**Step 3: Refactor**

Keep the expectations grouped by contract concern so later namespace or message
changes remain easy to audit.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Failing test captures the intended renamed contract.

**Step 5: Commit**

```bash
git add packages/cli/src/release/public-package-contract.test.ts
git commit -m "test(p01-t01): rename public package contract expectations"
```

---

### Task p01-t02: Implement renamed contract registry and validator alignment

**Files:**

- Modify: `packages/cli/src/release/public-package-contract.ts`
- Modify: `tools/release/validate-public-packages.ts`

**Step 1: Write test (RED)**

Reuse the failing contract test from `p01-t01` as the red state for the renamed
public package registry.

**Step 2: Implement (GREEN)**

Update the canonical public names in the contract registry and keep validator
logic keyed off the contract values rather than old hard-coded names.

```typescript
const PUBLIC_PACKAGE_CONTRACTS: PublicPackageContract[] = [
  { workspaceDir: 'packages/cli', publicName: '@open-agent-toolkit/cli', ... },
  { workspaceDir: 'packages/docs-config', publicName: '@open-agent-toolkit/docs-config', ... },
  {...},
];
```

**Step 3: Refactor**

Preserve deterministic package ordering and keep release validation fully driven
by `getPublicPackageContracts()`.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli test -- src/release/public-package-contract.test.ts`
Expected: Contract tests pass with the new canonical names.

**Step 5: Commit**

```bash
git add packages/cli/src/release/public-package-contract.ts tools/release/validate-public-packages.ts packages/cli/src/release/public-package-contract.test.ts
git commit -m "chore(p01-t02): rename release contract registry"
```

---

### Task p01-t03: Rename publishable package manifests and root link script

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-config/src/source-config.ts`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/docs-transforms/src/remark-mermaid.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Write test (RED)**

Capture the manifest drift with a search assertion and package validation run.

Run: `rg -n '@tkstang' packages/cli/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json package.json`
Expected: Existing `@tkstang` package names and root link filter are still
present.

**Step 2: Implement (GREEN)**

Rename the package `name` fields, internal published dependency names, and the
root `cli:link` filter to the canonical `@open-agent-toolkit/*` values. Update
runtime imports and shipped source comments in publishable packages so the
published code surface does not retain `@tkstang` references.

```json
{
  "name": "@open-agent-toolkit/docs-config",
  "dependencies": {
    "@open-agent-toolkit/docs-transforms": "workspace:*"
  }
}
```

**Step 3: Refactor**

Preserve current versions, metadata completeness, and workspace dependency
policy while changing only the public names. Run `pnpm install` after the
manifest rename so `pnpm-lock.yaml` is regenerated against the renamed package
graph.

**Step 4: Verify**

Run: `pnpm release:validate`
Expected: Release validation passes for the renamed package manifests and
contract registry.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/docs-config/package.json packages/docs-config/src/source-config.ts packages/docs-theme/package.json packages/docs-transforms/package.json packages/docs-transforms/src/remark-mermaid.ts package.json pnpm-lock.yaml
git commit -m "chore(p01-t03): rename publishable package manifests"
```

---

## Phase 2: Consumer, Scaffold, And Docs Alignment

Deliver consistent `@open-agent-toolkit/*` references across the first-party
docs app, generated docs consumers, migration fixtures, and public guidance.
This phase intentionally groups design-time docs-app alignment with scaffold and
public-doc updates because all consumer-visible package-reference surfaces can
be verified together with the same namespace audit.

### Task p02-t01: Align first-party docs app dependencies and imports

**Files:**

- Modify: `apps/oat-docs/package.json`
- Modify: `apps/oat-docs/source.config.ts`
- Modify: `apps/oat-docs/next.config.js`
- Modify: `apps/oat-docs/app/layout.tsx`
- Modify: `apps/oat-docs/app/[[...slug]]/page.tsx`

**Step 1: Write test (RED)**

Capture the current drift by searching the first-party docs app for old package
names.

Run: `rg -n '@tkstang' apps/oat-docs/package.json apps/oat-docs/source.config.ts apps/oat-docs/next.config.js apps/oat-docs/app/layout.tsx 'apps/oat-docs/app/[[...slug]]/page.tsx'`
Expected: Existing workspace dependencies and imports still point at the old
scope.

**Step 2: Implement (GREEN)**

Rename the docs app package dependencies and import specifiers to the new
package names.

```typescript
import { DocsLayout } from '@open-agent-toolkit/docs-theme';
import { createDocsConfig } from '@open-agent-toolkit/docs-config';
```

**Step 3: Refactor**

Keep the docs app behavior unchanged; only the package-resolution surface
should move.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: The docs app resolves the renamed workspace packages and builds
successfully.

**Step 5: Commit**

```bash
git add apps/oat-docs/package.json apps/oat-docs/source.config.ts apps/oat-docs/next.config.js apps/oat-docs/app/layout.tsx 'apps/oat-docs/app/[[...slug]]/page.tsx'
git commit -m "chore(p02-t01): align docs app package imports"
```

---

### Task p02-t02: Rename docs-init scaffold outputs and tests

**Files:**

- Modify: `packages/cli/src/commands/docs/init/scaffold.ts`
- Modify: `packages/cli/src/commands/docs/init/scaffold.test.ts`
- Modify: `packages/cli/src/commands/docs/init/integration.test.ts`
- Modify: `packages/cli/src/commands/docs/init/mkdocs-compat.test.ts`
- Modify: `.oat/templates/docs-app-fuma/source.config.ts`
- Modify: `.oat/templates/docs-app-fuma/next.config.js`
- Modify: `.oat/templates/docs-app-fuma/package.json.template`
- Modify: `.oat/templates/docs-app-fuma/app/layout.tsx`
- Modify: `.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx`

**Step 1: Write test (RED)**

Update scaffold and integration tests so generated consumer dependencies and
imports expect `@open-agent-toolkit/*`.

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts src/commands/docs/init/mkdocs-compat.test.ts`
Expected: Updated scaffold expectations fail until the generator emits the new
names.

**Step 2: Implement (GREEN)**

Rename the scaffold package constants and emitted dependency/import templates to
the canonical names while preserving workspace vs published-lockstep behavior.
Apply the same namespace update to the checked-in docs-app-fuma source templates
so generated docs consumers and their scaffold source of truth stay aligned.

```typescript
const DOCS_PACKAGE_NAMES = {
  config: '@open-agent-toolkit/docs-config',
  theme: '@open-agent-toolkit/docs-theme',
  transforms: '@open-agent-toolkit/docs-transforms',
  cli: '@open-agent-toolkit/cli',
};
```

**Step 3: Refactor**

Centralize renamed dependency literals so scaffold outputs and tests remain
easy to update together.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts src/commands/docs/init/mkdocs-compat.test.ts && rg -n '@tkstang' .oat/templates/docs-app-fuma`
Expected: Docs-init scaffold coverage passes with the new namespace.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs/init/scaffold.ts packages/cli/src/commands/docs/init/scaffold.test.ts packages/cli/src/commands/docs/init/integration.test.ts packages/cli/src/commands/docs/init/mkdocs-compat.test.ts .oat/templates/docs-app-fuma/source.config.ts .oat/templates/docs-app-fuma/next.config.js .oat/templates/docs-app-fuma/package.json.template .oat/templates/docs-app-fuma/app/layout.tsx '.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx'
git commit -m "test(p02-t02): rename docs scaffold package outputs"
```

---

### Task p02-t03: Update CLI docs migration fixtures and package smoke tests

**Files:**

- Modify: `packages/cli/src/commands/docs/e2e-pipeline.test.ts`
- Modify: `packages/cli/src/commands/docs/migrate/fixtures.test.ts`
- Modify: `packages/cli/src/commands/docs/migrate/frontmatter.test.ts`
- Modify: `packages/cli/src/commands/docs/migrate/fixtures/frontmatter-input.md`
- Modify: `packages/cli/src/commands/docs/migrate/fixtures/frontmatter-expected.md`

**Step 1: Write test (RED)**

Update the CLI docs pipeline and migrate fixture expectations to the new CLI
package name.

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/e2e-pipeline.test.ts src/commands/docs/migrate/fixtures.test.ts src/commands/docs/migrate/frontmatter.test.ts`
Expected: Fixture and pipeline assertions fail until the old package name is
replaced.

**Step 2: Implement (GREEN)**

Rename the CLI package references used by the docs migration and smoke coverage
fixtures.

```md
npm install -g @open-agent-toolkit/cli
```

**Step 3: Refactor**

Keep the fixture intent intact so the tests still prove CLI package usage from
consumer docs flows.

**Step 4: Verify**

Run: `pnpm --filter ./packages/cli test -- src/commands/docs/e2e-pipeline.test.ts src/commands/docs/migrate/fixtures.test.ts src/commands/docs/migrate/frontmatter.test.ts`
Expected: CLI docs migration and package smoke coverage passes.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs/e2e-pipeline.test.ts packages/cli/src/commands/docs/migrate/fixtures.test.ts packages/cli/src/commands/docs/migrate/frontmatter.test.ts packages/cli/src/commands/docs/migrate/fixtures/frontmatter-input.md packages/cli/src/commands/docs/migrate/fixtures/frontmatter-expected.md
git commit -m "test(p02-t03): rename cli docs migration fixtures"
```

---

### Task p02-t04: Update consumer-facing docs and package READMEs

**Files:**

- Modify: `README.md`
- Modify: `packages/cli/AGENTS.md`
- Modify: `packages/cli/README.md`
- Modify: `packages/docs-config/README.md`
- Modify: `packages/docs-theme/README.md`
- Modify: `packages/docs-transforms/README.md`
- Modify: `apps/oat-docs/docs/quickstart.md`
- Modify: `apps/oat-docs/docs/contributing/design-principles.md`
- Modify: `apps/oat-docs/docs/guide/documentation/commands.md`

**Step 1: Write test (RED)**

Capture the current public-doc drift with a namespace search.

Run: `rg -n '@tkstang' README.md packages/cli/AGENTS.md packages/cli/README.md packages/docs-config/README.md packages/docs-theme/README.md packages/docs-transforms/README.md apps/oat-docs/docs/quickstart.md apps/oat-docs/docs/contributing/design-principles.md apps/oat-docs/docs/guide/documentation/commands.md`
Expected: Old install commands and package references are still present.

**Step 2: Implement (GREEN)**

Rename install snippets and package references to the new scope, and keep the
CLI-primary messaging intact while documenting the docs packages as secondary
tooling.

```md
npm install -g @open-agent-toolkit/cli
pnpm add @open-agent-toolkit/docs-config @open-agent-toolkit/docs-theme @open-agent-toolkit/docs-transforms
```

**Step 3: Refactor**

Keep wording concise and consistent so the same package hierarchy appears across
root docs and package READMEs.

**Step 4: Verify**

Run: `rg -n '@tkstang' README.md packages/cli/AGENTS.md packages/cli/README.md packages/docs-config/README.md packages/docs-theme/README.md packages/docs-transforms/README.md apps/oat-docs/docs/quickstart.md apps/oat-docs/docs/contributing/design-principles.md apps/oat-docs/docs/guide/documentation/commands.md`
Expected: No matches remain in the consumer-facing docs set.

**Step 5: Commit**

```bash
git add README.md packages/cli/AGENTS.md packages/cli/README.md packages/docs-config/README.md packages/docs-theme/README.md packages/docs-transforms/README.md apps/oat-docs/docs/quickstart.md apps/oat-docs/docs/contributing/design-principles.md apps/oat-docs/docs/guide/documentation/commands.md
git commit -m "docs(p02-t04): rename public package install guidance"
```

---

## Phase 3: Release Path Enablement

Deliver the renamed GitHub release path and maintainer-facing bootstrap
guidance needed for the first manual publish and steady-state trusted
publishing.

### Task p03-t01: Update GitHub release workflows to the new scope

**Files:**

- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/release-dry-run.yml`

**Step 1: Write test (RED)**

Capture workflow drift by searching for the old scope in the release workflows.

Run: `rg -n '@tkstang|oat-cli|oat-docs-config|oat-docs-theme|oat-docs-transforms' .github/workflows/release.yml .github/workflows/release-dry-run.yml`
Expected: Workflow comments, registry scope, and package lists still reference
the temporary namespace.

**Step 2: Implement (GREEN)**

Rename registry scope configuration, comments, and package iteration lists to
`@open-agent-toolkit/*` while preserving publish order and dry-run behavior.

```yaml
registry=https://registry.npmjs.org/
@open-agent-toolkit:registry=https://registry.npmjs.org/
```

**Step 3: Refactor**

Keep the dry-run and live-release workflows structurally parallel so future
release changes remain easy to compare.

**Step 4: Verify**

Run: `rg -n '@tkstang' .github/workflows/release.yml .github/workflows/release-dry-run.yml`
Expected: No old-scope references remain in the release workflows.

**Step 5: Commit**

```bash
git add .github/workflows/release.yml .github/workflows/release-dry-run.yml
git commit -m "ci(p03-t01): rename npm release workflows"
```

---

### Task p03-t02: Document manual bootstrap boundary and refresh repo knowledge

**Files:**

- Modify: `apps/oat-docs/docs/contributing/code.md`
- Modify: `.oat/repo/knowledge/project-index.md`
- Modify: `.oat/repo/knowledge/architecture.md`
- Modify: `.oat/repo/knowledge/testing.md`
- Modify: `.oat/repo/knowledge/concerns.md`

**Step 1: Write test (RED)**

Identify that maintainer docs do not yet explain the manual-first bootstrap and
post-bootstrap GitHub publish boundary for the renamed package set.

Run: `rg -n 'manual publish|trusted publishing|@open-agent-toolkit|@tkstang' apps/oat-docs/docs/contributing/code.md .oat/repo/knowledge/project-index.md .oat/repo/knowledge/architecture.md .oat/repo/knowledge/testing.md .oat/repo/knowledge/concerns.md`
Expected: Required maintainer release guidance is missing or incomplete.

**Step 2: Implement (GREEN)**

Add a concise maintainer-facing section describing the first manual publish,
the intended GitHub steady-state path, and the expected trusted-publishing
handoff. Refresh the generated repo-knowledge outputs after the namespace
rename so future agent guidance no longer suggests stale package names.

```md
- First release under `@open-agent-toolkit/*`: manual publish
- Follow-up steady state: GitHub trusted publishing after npm trust is configured
```

**Step 3: Refactor**

Keep release guidance scoped to maintainers and avoid duplicating end-user
install instructions already covered elsewhere. Prefer regeneration of the
knowledge artifacts over ad hoc manual edits.

**Step 4: Verify**

Run: `rg -n '@tkstang' apps/oat-docs/docs/contributing/code.md .oat/repo/knowledge/project-index.md .oat/repo/knowledge/architecture.md .oat/repo/knowledge/testing.md .oat/repo/knowledge/concerns.md`
Expected: No stale namespace references remain in maintainer docs or generated
knowledge.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/contributing/code.md .oat/repo/knowledge/project-index.md .oat/repo/knowledge/architecture.md .oat/repo/knowledge/testing.md .oat/repo/knowledge/concerns.md
git commit -m "docs(p03-t02): refresh release bootstrap guidance"
```

---

## Reviews

Track reviews here after running the oat-project-review-provide and
oat-project-review-receive skills.

| Scope  | Type     | Status   | Date       | Artifact                                            |
| ------ | -------- | -------- | ---------- | --------------------------------------------------- |
| p01    | code     | pending  | -          | -                                                   |
| p02    | code     | pending  | -          | -                                                   |
| p03    | code     | pending  | -          | -                                                   |
| final  | code     | received | 2026-04-02 | reviews/final-review-2026-04-02.md                  |
| spec   | artifact | pending  | -          | -                                                   |
| plan   | artifact | passed   | 2026-04-02 | reviews/archived/artifact-plan-review-2026-04-02.md |
| design | artifact | pending  | -          | -                                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Canonical contract, validator, and manifest realignment
- Phase 2: 4 tasks - Docs app, scaffold, fixture, and public-doc namespace alignment
- Phase 3: 2 tasks - Release workflow rename and maintainer bootstrap guidance

**Total: 9 tasks**

Planned for implementation after final approval.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
