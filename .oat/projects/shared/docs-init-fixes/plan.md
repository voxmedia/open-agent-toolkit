---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-05
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: docs-init-fixes

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Fix friction points in `oat docs init` and related docs commands identified during hands-on bootstrapping testing. Make the scaffold produce a buildable docs app in both monorepo and single-package repos with no manual fixups.

**Architecture:** Fixes are scoped to `packages/cli/src/commands/docs/` — init scaffolding, index generation, and template files. No new modules; uses existing `resolveProjectRoot()` from `fs/paths.ts`.

**Tech Stack:** TypeScript, Vitest, Commander.js

**Commit Convention:** `fix(docs-init): {description}` for bug fixes, `feat(docs-init): {description}` for new behavior

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter (empty — no gates for quick mode)

---

## Phase 1: Core Fixes (CWD + Index Consistency)

These fix the root-cause issues that cascade into other problems.

### Task p01-t01: Fix generate-index to resolve repo root for config writes

**Friction point:** FP-CWD

When `generate-index` runs from a docs app package script, `context.cwd` is the docs app dir. It writes `.oat/config.json` to the wrong location. `resolveProjectRoot()` in `fs/paths.ts` already exists but isn't used.

**Files:**

- Modify: `packages/cli/src/commands/docs/index-generate/index.ts`
- Modify: `packages/cli/src/commands/docs/index-generate/generator.test.ts` (or create a new command-level test)

**Step 1: Write test (RED)**

Add a test that verifies `generate-index` writes `.oat/config.json` at the repo root, not at CWD, when CWD is a subdirectory.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/index-generate/`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Update `runIndexGenerate` to resolve the repo root via `resolveProjectRoot(context.cwd)` before calling `readOatConfig`/`writeOatConfig`. Keep path resolution for `docsDir` and `outputPath` relative to `context.cwd` (they should stay local). Only config operations need repo root.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/index-generate/`
Expected: Test passes (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "fix(docs-init): resolve repo root in generate-index config writes"
```

---

### Task p01-t02: Fix index path inconsistency between config and AGENTS.md

**Friction point:** FP-5 (paths)

`.oat/config.json` sets `index: "<app>/index.md"` (generated root index that may not exist). AGENTS.md sets `Index file: <app>/docs/index.md` (content index). These should be consistent — both should point to the content index `<app>/docs/index.md`, since that's the authoritative source of truth for the `## Contents` navigation contract.

**Files:**

- Modify: `packages/cli/src/commands/docs/init/scaffold.ts` — `buildDocumentationConfig()`
- Modify: `packages/cli/src/commands/docs/init/index.test.ts`
- Modify: `packages/cli/src/commands/docs/init/scaffold.test.ts`

**Step 1: Write test (RED)**

Update existing scaffold test to assert that `documentationConfig.index` points to `<targetDir>/docs/index.md` for fumadocs framework.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/`
Expected: Test fails (RED) — currently returns `<targetDir>/index.md`

**Step 2: Implement (GREEN)**

In `buildDocumentationConfig()`, change fumadocs index from `join(targetDir, 'index.md')` to `join(targetDir, 'docs', 'index.md')` so it matches the AGENTS.md output and points to the actual scaffolded file.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/`
Expected: Test passes (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "fix(docs-init): align config index path with AGENTS.md and scaffolded file"
```

---

### Task p01-t03: Remove silent failure from generate-index in scaffold template

**Friction point:** FP-5 (silent failure)

The non-OAT-repo generate-index command in `predev`/`prebuild` is wrapped in `|| true`, making failures silent. The index never gets created and users don't know why.

**Files:**

- Modify: `packages/cli/src/commands/docs/init/scaffold.ts` — `buildGenerateIndexCmd()`
- Modify: `packages/cli/src/commands/docs/init/scaffold.test.ts`

**Step 1: Write test (RED)**

Add test asserting that `buildGenerateIndexCmd` for non-OAT repos does NOT contain `|| true`.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/scaffold`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Remove `|| true` wrapping from the non-OAT-repo generate-index command. The OAT CLI is already a devDependency in the template, so it will be available after install.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/scaffold`
Expected: Test passes (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "fix(docs-init): remove silent failure from generate-index in scaffold template"
```

---

## Phase 2: Setup Completeness

### Task p02-t01: Add post-scaffold next steps for single-package repos

**Friction point:** FP-6

In non-monorepo repos, scaffold creates `<app>/` but doesn't print install/build instructions. Users don't know to `cd <app> && pnpm install`.

**Files:**

- Modify: `packages/cli/src/commands/docs/init/index.ts` — `runDocsInit` / post-scaffold output
- Modify: `packages/cli/src/commands/docs/init/index.test.ts`

**Step 1: Write test (RED)**

Add test that verifies single-package repo scaffold output includes next-step instructions mentioning install and build commands for the docs app directory.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/index`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

After scaffold completes, if `repoShape === 'single-package'`, print next steps:

- `cd <targetDir> && pnpm install`
- `pnpm build`
- Mention that the app is a standalone package and needs its own install

For monorepo, print different guidance:

- `pnpm install` (from workspace root)
- `pnpm --filter <appName> build`

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/index`
Expected: Test passes (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "feat(docs-init): print post-scaffold next steps tailored to repo shape"
```

---

### Task p02-t02: Add preflight checks for existing docs setup

**Friction point:** FP-7

`oat docs init` overwrites existing docs config, app directories, and AGENTS.md sections without warning.

**Files:**

- Modify: `packages/cli/src/commands/docs/init/index.ts`
- Modify: `packages/cli/src/commands/docs/init/index.test.ts`

**Step 1: Write test (RED)**

Add tests verifying:

1. When `.oat/config.json` has existing `documentation` config, init warns and asks to proceed
2. When target directory already exists and is non-empty, init warns (this partially exists via `ensureTargetWritable` but it throws — should ask instead of erroring in interactive mode)
3. In `--yes` mode, preflight warnings are printed but don't block

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/index`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Add preflight check function that runs before scaffold:

1. Read `.oat/config.json` — if `documentation` section exists, warn with current config details
2. Check target directory — if exists and non-empty, warn with contents summary
3. In interactive mode: ask "Existing docs setup detected. Replace? (y/N)"
4. In `--yes` mode: print warning, proceed
5. In non-interactive + no `--yes`: exit with error and remediation message

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/index`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "feat(docs-init): add preflight checks for existing docs setup"
```

---

## Phase 3: Polish

### Task p03-t01: Add monorepo integration guidance for non-default app names

**Friction point:** FP-8

When user picks a non-default app name in a monorepo, root scripts/filters may assume `docs`. The CLI should detect and warn.

**Files:**

- Modify: `packages/cli/src/commands/docs/init/index.ts`
- Modify: `packages/cli/src/commands/docs/init/index.test.ts`

**Step 1: Write test (RED)**

Add test that verifies when a monorepo scaffold uses a non-default app name, the output includes guidance about checking root scripts.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/index`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

After scaffold in monorepo mode with non-default app name, print a note:

- "Your docs app is named `<appName>` — if you have root scripts or CI filters referencing `docs`, update them to match."
- This is informational only, not blocking.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/index`
Expected: Test passes (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "feat(docs-init): warn about root script assumptions for non-default app names"
```

---

### Task p03-t02: Detect partial local OAT packages for workspace wiring

**Friction point:** FP-9

`detectIsOatRepo` is all-or-nothing. Repos with only some OAT packages locally (e.g., just `docs-config`) don't get `workspace:*` wiring.

**Files:**

- Modify: `packages/cli/src/commands/docs/init/scaffold.ts` — `resolveOatDepContext()`
- Modify: `packages/cli/src/commands/docs/init/scaffold.test.ts`

**Step 1: Write test (RED)**

Add test that verifies when a repo has `packages/docs-config/package.json` but not all 4 OAT packages, the scaffold wires `docs-config` to `workspace:*` and the rest to published versions.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/scaffold`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Change `resolveOatDepContext` to check each OAT package individually. For each package found locally under `packages/`, use `workspace:*`. For missing ones, use published version. Replace the boolean `isOatRepo` with a per-package map of resolution strategy.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/init/scaffold`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Update `oatDepVersion()` to use the per-package map instead of the boolean flag.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git commit -m "feat(docs-init): detect partial local OAT packages for workspace wiring"
```

---

### Task p03-t03: Preseed Next.js-compatible tsconfig to prevent first-build rewrite

**Friction point:** FP-10

Next.js may rewrite `tsconfig.json` on first build if expected fields are missing.

**Files:**

- Modify: `packages/cli/assets/templates/docs-app-fuma/tsconfig.json`
- Modify: `packages/cli/src/commands/docs/init/scaffold.test.ts` (if tsconfig is validated in tests)

**Step 1: Investigate**

Run a fresh Fumadocs scaffold locally and execute `next build` to capture what Next.js adds to tsconfig. Compare against the current template.

**Step 2: Implement**

Update the template tsconfig with any missing fields that Next.js auto-adds. This ensures the first build produces no tsconfig diff.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git commit -m "fix(docs-init): preseed Next.js-compatible tsconfig to prevent first-build rewrite"
```

---

## Phase 4: Integration Verification

### Task p04-t01: Run full test suite and verify end-to-end

**Files:**

- No new files — verification only

**Step 1: Run all docs command tests**

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run src/commands/docs/`
Expected: All tests pass

**Step 2: Run full CLI checks**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 3: Run workspace build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Commit (if any fixups needed)**

```bash
git commit -m "fix(docs-init): integration fixups"
```

---

## Reviews

| Scope | Type | Status | Date       | Artifact                           |
| ----- | ---- | ------ | ---------- | ---------------------------------- |
| final | code | passed | 2026-04-05 | reviews/2026-04-05-final-review.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — Core fixes (CWD resolution, index path consistency, silent failure removal)
- Phase 2: 2 tasks — Setup completeness (next steps, preflight checks)
- Phase 3: 3 tasks — Polish (monorepo guidance, local package detection, tsconfig preseed)
- Phase 4: 1 task — Integration verification

**Total: 9 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Parent project: `../docs-bootstrap-skill/` (blocked on this project)
