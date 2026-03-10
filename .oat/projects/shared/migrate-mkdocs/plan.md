---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-09
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p04"]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: migrate-mkdocs

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Migrate `apps/oat-docs` from MkDocs Material to Fumadocs, preserving all 37 docs files and enabling a pure Node.js build pipeline.

**Architecture:** Replace MkDocs (Python) app with Fumadocs (Next.js) app using `@oat/docs-config`, `@oat/docs-transforms`, and `@oat/docs-theme` workspace packages. Static export to `out/`.

**Tech Stack:** Next.js 15, React 19, Fumadocs UI/Core/MDX, TypeScript 5.8

**Commit Convention:** `{type}({scope}): {description}` - e.g., `refactor(oat-docs): migrate markdown to GFM format`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none — quick mode)
- [x] Set `oat_plan_hill_phases` in frontmatter (empty — no phase gates)

---

## Phase 1: Markdown Migration

### Task p01-t01: Run migration codemod (dry-run)

**Files:**
- Read: `apps/oat-docs/docs/**/*.md` (37 files)
- Read: `apps/oat-docs/mkdocs.yml`

**Step 1: Dry-run the codemod**

```bash
pnpm run cli -- docs migrate --docs-dir apps/oat-docs/docs --config apps/oat-docs/mkdocs.yml
```

**Step 2: Review output**

Verify the dry-run reports:
- 1 admonition conversion in `contributing.md` (`!!!` → `> [!NOTE]`)
- 37 files receiving `title` frontmatter injection
- `description: ""` seeded where missing

**Step 3: Verify** (dry-run only, no commit)

Confirm output is as expected before proceeding to apply.

---

### Task p01-t02: Apply migration codemod

**Files:**
- Modify: `apps/oat-docs/docs/**/*.md` (37 files)

**Step 1: Apply the codemod**

```bash
pnpm run cli -- docs migrate --docs-dir apps/oat-docs/docs --config apps/oat-docs/mkdocs.yml --apply
```

**Step 2: Verify**

- Check `apps/oat-docs/docs/contributing.md` — admonition should be `> [!NOTE]` format
- Spot-check 3-4 files for correct `title` frontmatter matching `mkdocs.yml` nav entries
- Run: `grep -r '!!!' apps/oat-docs/docs/ | grep -v node_modules` — should return only the reference in `docs-apps.md` (which documents the syntax, not uses it)

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/
git commit -m "refactor(oat-docs): migrate markdown to GFM format"
```

---

## Phase 2: Fumadocs App Scaffold

> **Note:** `oat docs init` requires an empty target directory (throws error otherwise).
> Strategy: move docs out (filesystem), `git rm` MkDocs artifacts, clear remaining
> non-tracked files, scaffold into empty dir, restore docs. Since docs return to
> the same paths with the same content, git shows no diff for doc files — only
> MkDocs deletions and Fumadocs additions.

### Task p02-t01: Evacuate docs and clear MkDocs app

**Files:**
- Move out: `apps/oat-docs/docs/` → `/tmp/oat-docs-backup` (filesystem, temporary)
- `git rm`: `apps/oat-docs/mkdocs.yml`, `apps/oat-docs/setup-docs.sh`, `apps/oat-docs/requirements.txt`, `apps/oat-docs/package.json`
- Remove: `apps/oat-docs/node_modules/` and any remaining non-tracked files

**Step 1: Move docs to temp location (filesystem only)**

```bash
mv apps/oat-docs/docs /tmp/oat-docs-backup
```

**Step 2: Remove all tracked MkDocs files with `git rm`**

```bash
git rm -r apps/oat-docs/
```

This removes all git-tracked files. The `docs/` was already moved out, so git sees those as deleted.

**Step 3: Clean up non-tracked remnants**

```bash
rm -rf apps/oat-docs/
```

Removes `node_modules/` and any other non-tracked files so the directory is fully clear.

**Step 4: Verify**

- `apps/oat-docs/` directory does not exist (ready for scaffold)
- `/tmp/oat-docs-backup/` contains all 37 markdown files
- `git status` shows staged deletions for MkDocs artifacts and docs files

No commit yet — continues in next task.

---

### Task p02-t02: Scaffold Fumadocs app and restore docs

**Files:**
- Create: `apps/oat-docs/next.config.js`
- Create: `apps/oat-docs/source.config.ts`
- Create: `apps/oat-docs/tsconfig.json`
- Create: `apps/oat-docs/app/` (layout, page, docs routes)
- Create: `apps/oat-docs/lib/` (source config)
- Create: `apps/oat-docs/package.json`
- Restore: `apps/oat-docs/docs/` (from `/tmp/oat-docs-backup`)

**Step 1: Scaffold into empty directory**

```bash
pnpm run cli -- docs init --framework fumadocs --app-name oat-docs --target-dir apps/oat-docs --description "Documentation for Open Agent Toolkit" --lint markdownlint --format prettier --yes
```

**Step 2: Remove scaffold starter docs (will be replaced by originals)**

```bash
rm -rf apps/oat-docs/docs
```

**Step 3: Restore migrated docs**

```bash
mv /tmp/oat-docs-backup apps/oat-docs/docs
```

**Step 4: Stage all changes**

```bash
git add apps/oat-docs/
```

At this point, git sees: MkDocs artifacts deleted, scaffold files added, docs files unchanged (same content at same paths → no diff for docs).

**Step 5: Verify**

- `apps/oat-docs/package.json` has `next`, `react`, `@oat/docs-config`, `@oat/docs-theme`, `@oat/docs-transforms` as dependencies
- `apps/oat-docs/next.config.js` exists
- `apps/oat-docs/app/layout.tsx` exists
- All 37 docs files present in `apps/oat-docs/docs/`
- `git diff --cached --stat` shows minimal changes — no large doc file diffs

**Step 6: Commit**

```bash
git commit -m "feat(oat-docs): replace MkDocs with Fumadocs scaffold"
```

---

## Phase 3: Configuration and Index

### Task p03-t01: Update OAT config

**Files:**
- Modify: `.oat/config.json`

**Step 1: Update config**

```bash
pnpm run cli -- config set documentation.tooling fumadocs
pnpm run cli -- config set documentation.config apps/oat-docs/next.config.js
```

**Step 2: Verify**

Read `.oat/config.json` and confirm:
- `documentation.tooling` is `"fumadocs"`
- `documentation.config` is `"apps/oat-docs/next.config.js"`
- `documentation.root` remains `"apps/oat-docs/docs"`

**Step 3: Commit**

```bash
git add .oat/config.json
git commit -m "chore(config): update documentation tooling to fumadocs"
```

---

### Task p03-t02: Generate docs index

**Files:**
- Create/Modify: `apps/oat-docs/index.md`

**Step 1: Generate index**

```bash
pnpm run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

**Step 2: Verify**

- `apps/oat-docs/index.md` exists
- Contains links covering all 37 docs files
- Titles match frontmatter injected by the codemod

**Step 3: Commit**

```bash
git add apps/oat-docs/index.md
git commit -m "chore(oat-docs): generate docs index"
```

---

## Phase 4: Build Verification

### Task p04-t01: Install dependencies and build

**Files:**
- Modify: `pnpm-lock.yaml` (via install)

**Step 1: Install**

```bash
pnpm install
```

**Step 2: Build the docs app**

```bash
pnpm build
```

**Step 3: Verify**

- Build completes without errors
- `apps/oat-docs/out/` directory exists (or `.next/` for dev)
- Run: `pnpm type-check` — no errors
- Run: `pnpm lint` — no errors

**Step 4: Commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: update lockfile for fumadocs dependencies"
```

---

### Task p04-t02: Spot-check rendered pages

**Files:**
- No file changes

**Step 1: Start dev server**

```bash
cd apps/oat-docs && pnpm dev
```

**Step 2: Verify pages**

Spot-check in browser (or via fetch):
- Home page renders
- `contributing` page — callout renders as styled blockquote
- A CLI page (e.g., `cli/bootstrap`) — content renders correctly
- A nested page (e.g., `cli/provider-interop/commands`) — navigation works
- Search dialog — type a query, results appear (FlexSearch)
- Dark/light mode toggle works

**Step 3: Stop dev server**

No commit — verification only.

---

### Task p04-t03: Run full workspace verification

**Files:**
- No file changes

**Step 1: Verify workspace**

```bash
pnpm build && pnpm test && pnpm type-check && pnpm lint
```

**Step 2: Verify**

All commands pass. No regressions in other packages.

No commit — verification only.

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| final | code | received | 2026-03-10 | reviews/final-review-2026-03-10.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 2 tasks - Migrate markdown (codemod dry-run + apply)
- Phase 2: 2 tasks - Scaffold Fumadocs app (backup/clean + scaffold/restore)
- Phase 3: 2 tasks - Update config + generate index
- Phase 4: 3 tasks - Build verification + spot-check + workspace verification

**Total: 9 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Fumadocs template: `.oat/templates/docs-app-fuma/`
- CLI source: `packages/cli/src/commands/docs/`
- MkDocs config: `apps/oat-docs/mkdocs.yml` (pre-migration)
