---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-03
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_checkpoints: true
oat_plan_source: imported # spec-driven | quick | imported
oat_import_reference: references/imported-plan.md # e.g., references/imported-plan.md
oat_import_source_path: .oat/repo/reference/external-plans/docs-readability-reorg-plan.md # original source path provided by user
oat_import_provider: codex # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: docs-readability-reorg

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Reorganize the OAT docs and README surfaces so newcomers can understand the product quickly, choose the right adoption path easily, and still reach all existing technical detail without information loss.

**Architecture:** Reframe the docs around canonical top-level adoption lanes, rewrite the docs entrypoints so overview and routing are separated, move deep utility/reference material to the correct owning sections, and realign README files so they point outward to the docs site instead of duplicating dense documentation.

**Tech Stack:** OAT docs app markdown content, generated docs navigation/indexing, repository README surfaces, and package README files.

**Commit Convention:** `docs(pNN-tNN): {description}` - e.g., `docs(p01-t01): establish top-level docs IA`

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user
- [ ] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Navigation and entrypoint restructuring

### Task p01-t01: Establish the new top-level docs information architecture

**Files:**

- Modify: `apps/oat-docs/index.md`
- Modify: docs section index files that define top-level navigation and routing
- Modify: any docs-app navigation/config files required by the current framework

**Step 1: Write docs acceptance check (RED)**

TODO: Record the target top-level IA and point nav/routing at the new canonical sections before all moved pages exist.

Run: `pnpm build:docs`
Expected: Build or route validation highlights missing destinations until the new section pages exist.

**Step 2: Implement (GREEN)**

Create or update the top-level docs structure so these canonical sections exist:

- `/` (overview)
- `/quickstart` (Start Here)
- `/provider-sync`
- `/workflows`
- `/docs-tooling`
- `/cli-utilities`
- `/reference`
- `/contributing`

Run: `pnpm build:docs`
Expected: The site builds with the new top-level IA in place.

**Step 3: Refactor**

Tighten nav labels and section descriptions so each section has a clear ownership boundary.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: No missing top-level routes or broken internal structure caused by the new IA.

**Step 5: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p01-t01): establish top-level docs IA"
```

---

### Task p01-t02: Rewrite the overview and Start Here entrypoints

**Files:**

- Modify: homepage docs source for `/`
- Modify: `apps/oat-docs/docs/quickstart.md`

**Step 1: Write docs acceptance check (RED)**

TODO: Capture the target separation:

- `/` explains OAT and points to `/quickstart`
- `/quickstart` performs the path selection
- the two pages do not duplicate the same routing logic

Run: `pnpm build:docs`
Expected: Manual review shows the current entrypoints still overlap and need separation.

**Step 2: Implement (GREEN)**

Rewrite `/` as a concise overview page and rewrite `/quickstart` as the single newcomer decision page with paths for:

- Provider Sync
- Agentic Workflows
- Docs Tooling
- CLI Utilities

**Step 3: Refactor**

Tighten copy so the homepage introduces OAT without becoming a second quickstart.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: `/` and `/quickstart` render cleanly and serve distinct roles.

**Step 5: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p01-t02): separate overview from start-here routing"
```

---

### Task p01-t03: Create the new section landings and overview pages

**Files:**

- Create or modify section landing pages for provider sync, workflows, docs tooling, and CLI utilities
- Modify existing index pages that currently live under `guide/`

**Step 1: Write docs acceptance check (RED)**

TODO: Define the standard landing-page structure for every major section:

- what this section is
- who it’s for
- start here
- common tasks
- go deeper

Run: `pnpm build:docs`
Expected: Current section pages do not yet present a consistent entry format.

**Step 2: Implement (GREEN)**

Create or rewrite section landing pages and overview pages so each section has a consistent and scannable entry surface.

**Step 3: Refactor**

Normalize section intros, CTA phrasing, and cross-links.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: All section landing pages build and route correctly.

**Step 5: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p01-t03): add section landings and overviews"
```

---

## Phase 2: Content migration and readability framing

### Task p02-t01: Move Provider Sync and Agentic Workflows content into canonical section routes

**Files:**

- Move or rewrite existing `guide/provider-sync/*`
- Move or rewrite existing `guide/workflow/*`
- Move or rewrite `guide/skills` and `guide/ideas*`

**Step 1: Write docs acceptance check (RED)**

TODO: Create a migration checklist mapping old guide content to the new canonical Provider Sync and Workflows routes.

Run: `pnpm build:docs`
Expected: The new section routes are incomplete until moved content is in place.

**Step 2: Implement (GREEN)**

Move and rewrite content into the new canonical Provider Sync and Workflows locations. Preserve technical detail; reorganize rather than remove.

**Step 3: Refactor**

Tighten route ownership, headings, and local cross-links. Move `Skills` to a task-first structure while keeping the full catalog as secondary content.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: Provider Sync and Workflows content renders at the new canonical routes without missing references.

**Step 5: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p02-t01): move provider-sync and workflow content"
```

---

### Task p02-t02: Move Docs Tooling and CLI Utilities content into their canonical sections

**Files:**

- Move or rewrite existing `guide/documentation/*`
- Split `guide/getting-started`
- Move `guide/tool-packs`
- Move `guide/configuration`
- Create: `/cli-utilities/config-and-local-state`

**Step 1: Write docs acceptance check (RED)**

TODO: Record which docs pages now own docs-tooling content versus CLI-utilities content, including utility-command extraction from CLI Reference.

Run: `pnpm build:docs`
Expected: The moved section ownership is incomplete until the pages are relocated and cross-linked.

**Step 2: Implement (GREEN)**

Move docs-tooling and CLI-utility content into their canonical homes. Extract deep utility command detail out of CLI Reference into `/cli-utilities/config-and-local-state`.

**Step 3: Refactor**

Trim duplicated explanations and ensure docs-tooling pages point outward to the docs index contract instead of re-explaining it.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: Docs Tooling and CLI Utilities pages render and CLI Reference can remain shallow.

**Step 5: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p02-t02): reorganize docs-tooling and cli-utilities content"
```

---

### Task p02-t03: Add progressive disclosure to the highest-density docs pages

**Files:**

- Modify: lifecycle, provider-sync commands, manifest-and-drift, tool-packs, state-machine, repo-analysis, bootstrap, and docs commands pages

**Step 1: Write docs acceptance check (RED)**

TODO: Define the required framing for dense pages:

- overview intro
- Quick Look block
- existing technical detail preserved below

Run: `pnpm build:docs`
Expected: Current dense pages lack consistent top-level framing.

**Step 2: Implement (GREEN)**

Add overview intros and Quick Look blocks to the priority high-density pages while preserving the existing technical detail.

**Step 3: Refactor**

Standardize Quick Look wording and make sure no detail was silently deleted during cleanup.

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: Priority pages render with improved scannability and preserved detail.

**Step 5: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p02-t03): add progressive disclosure to dense docs pages"
```

---

## Phase 3: README realignment and final audit

### Task p03-t01: Rewrite the root README as an overview and quick-start document

**Files:**

- Modify: `README.md`

**Step 1: Write docs acceptance check (RED)**

TODO: Capture the README boundary:

- concise overview
- very short quickstart
- links to deployed docs
- no dense command-manual behavior

Run: `pnpm build:docs`
Expected: N/A for docs build; manual review should show the current README is still too dense.

**Step 2: Implement (GREEN)**

Rewrite the root README to focus on orientation, quick start, and links to the deployed docs site and key section entrypoints.

**Step 3: Refactor**

Reduce duplicate explanation where the docs site already owns the detail.

**Step 4: Verify**

Run: `rg -n 'apps/oat-docs/docs|docs/skills|docs/cli' README.md`
Expected: Internal source-path style links are removed or replaced with user-facing docs links.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs(p03-t01): tighten root readme and link to full docs"
```

---

### Task p03-t02: Tighten package and tooling READMEs and run a final audit

**Files:**

- Modify: `packages/cli/README.md`
- Modify: `packages/docs-config/README.md`
- Modify: `packages/docs-theme/README.md`
- Modify: `packages/docs-transforms/README.md`
- Modify as needed: `tools/git-hooks/README.md`

**Step 1: Write docs acceptance check (RED)**

TODO: Define package README expectations:

- package-local orientation
- install
- minimal usage
- exports or representative commands
- links outward to docs for depth

Run: `rg -n 'archive|workflow mode|manifest|drift|long command' packages/**/README.md tools/git-hooks/README.md`
Expected: Existing READMEs may still contain dense detail that belongs on the docs site.

**Step 2: Implement (GREEN)**

Rewrite package and tooling READMEs so they stay concise, package-specific, and linked to the full docs.

**Step 3: Refactor**

Make README structure consistent without over-homogenizing package-specific examples.

**Step 4: Verify**

Run: `rg -n 'https://voxmedia.github.io/open-agent-toolkit|https://github.com/voxmedia/open-agent-toolkit' packages/**/README.md tools/git-hooks/README.md README.md`
Expected: README files link to the correct public docs or repository surfaces.

**Step 5: Commit**

```bash
git add README.md packages tools/git-hooks
git commit -m "docs(p03-t02): align package readmes with docs-first strategy"
```

---

## Phase 4: Review fixes

### Task p04-t01: (review) Remove empty legacy guide subdirectories

**Files:**

- Modify: `apps/oat-docs/docs/guide/`

**Step 1: Understand the issue**

Review finding: Five empty legacy subdirectories remain under `apps/oat-docs/docs/guide/` after the content migration.
Location: `apps/oat-docs/docs/guide/`

**Step 2: Implement fix**

Remove the empty legacy subdirectories that no longer own content:

- `apps/oat-docs/docs/guide/documentation/`
- `apps/oat-docs/docs/guide/provider-sync/`
- `apps/oat-docs/docs/guide/workflow/`
- `apps/oat-docs/docs/guide/skills/`
- `apps/oat-docs/docs/guide/ideas/`

Keep the compatibility material that still matters, including `guide/index.md` and `guide/concepts.md`.

**Step 3: Verify**

Run: `find apps/oat-docs/docs/guide -empty -type d`
Expected: Only intentionally empty directories remain, or no stale migrated-guide directories remain.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/guide
git commit -m "fix(p04-t01): remove empty legacy guide directories"
```

---

### Task p04-t02: (review) Remove obsolete overview deprecation note from docs index contract

**Files:**

- Modify: `apps/oat-docs/docs/reference/docs-index-contract.md`

**Step 1: Understand the issue**

Review finding: The docs index contract still says `overview.md` is deprecated, even though the reorganized docs now intentionally use `overview.md` as descriptive leaf pages beside section `index.md` files.
Location: `apps/oat-docs/docs/reference/docs-index-contract.md`

**Step 2: Implement fix**

Remove the obsolete deprecation note so the contract reflects the current intended structure instead of documenting a historical migration concern.

**Step 3: Verify**

Run: `rg -n "overview\\.md is deprecated" apps/oat-docs/docs/reference/docs-index-contract.md`
Expected: No matches.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/reference/docs-index-contract.md
git commit -m "fix(p04-t02): update docs index contract wording"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                       |
| ------ | -------- | ------- | ---------- | ---------------------------------------------- |
| p01    | code     | pending | -          | -                                              |
| p02    | code     | pending | -          | -                                              |
| p03    | code     | pending | -          | -                                              |
| final  | code     | passed  | 2026-04-03 | reviews/archived/final-review-2026-04-03-v2.md |
| spec   | artifact | pending | -          | -                                              |
| design | artifact | pending | -          | -                                              |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - establish the new docs IA and entrypoints
- Phase 2: 3 tasks - move guide content and add progressive disclosure
- Phase 3: 2 tasks - realign READMEs and run a final audit
- Phase 4: 2 tasks - address selected review-fix cleanup items

**Total: 10 tasks**

Final review passed. Ready for summary/docs/PR finalization.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
