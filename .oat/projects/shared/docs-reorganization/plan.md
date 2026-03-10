---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-10
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: docs-reorganization

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Reorganize OAT documentation around audience-driven navigation (User Guide vs. Developer Guide), elevate provider interop, consolidate scattered docs sections, add visual elements, and break Contributing into focused sub-pages.

**Architecture:** Content reorganization of `apps/oat-docs/docs/` — moving files into new directory structure, rewriting index pages and nav, updating cross-references, and adding Mermaid diagrams and tabbed content.

**Tech Stack:** Markdown, MkDocs Material (pymdownx.tabbed, superfences/mermaid, admonitions), mkdocs.yml nav config

**Commit Convention:** `docs(pNN-tNN): {description}` - e.g., `docs(p01-t01): scaffold new directory structure`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Directory Structure and File Moves

Establish the new audience-driven directory layout and move existing files into position. No content changes yet — pure structural moves to avoid mixing concerns.

### Target Directory Structure

```
docs/
  index.md                          (rewrite)
  quickstart.md                     (trim — move workflow detail out)
  guide/                            (NEW — User Guide)
    index.md                        (NEW)
    concepts.md                     (NEW — Core Concepts)
    getting-started.md              (from cli/bootstrap.md — reframed)
    provider-sync/                  (ELEVATED from cli/provider-interop/)
      index.md                      (from cli/provider-interop/index.md — reframed)
      scope-and-surface.md          (move)
      commands.md                   (move)
      providers.md                  (move — add tabs per provider)
      manifest-and-drift.md         (move)
      config.md                     (move)
    tool-packs.md                   (from cli/tool-packs-and-assets.md)
    documentation/                  (NEW — consolidated)
      index.md                      (NEW — hub page)
      quickstart.md                 (from cli/docs-consumer-quickstart.md)
      commands.md                   (from cli/docs-apps.md)
      workflows.md                  (from skills/docs-workflows.md)
    workflow/                       (MERGED — workflow + projects)
      index.md                      (rewrite — unified intro)
      lifecycle.md                  (move)
      artifacts.md                  (from projects/artifacts.md)
      state-machine.md              (from projects/state-machine.md)
      hil-checkpoints.md            (move)
      reviews.md                    (move)
      pr-flow.md                    (move)
    skills/                         (consumer-focused)
      index.md                      (rewrite — add "Key Skills by Use Case")
    ideas/                          (move)
      index.md                      (move)
      lifecycle.md                  (move)
    cli-reference.md                (NEW — lean command index + global options)
  contributing/                     (NEW — Developer Guide, broken into sub-pages)
    index.md                        (NEW — developer onboarding hub)
    code.md                         (NEW — dev setup, testing, PR process)
    documentation.md                (from contributing.md — reframed, minus plugin inventory)
    markdown-features.md            (NEW — extracted plugin/extension reference card)
    skills.md                       (from skills/execution-contracts.md — reframed as authoring guide)
    design-principles.md            (from cli/design-principles.md — move)
    commit-conventions.md           (from reference/commit-conventions.md — move)
    hooks-and-safety.md             (from cli/provider-interop/hooks-and-safety.md — move)
  reference/                        (slimmed — shared reference)
    index.md                        (rewrite)
    file-locations.md               (stays)
    directory-structure.md          (from oat-directory-structure.md)
    docs-index-contract.md          (stays)
    troubleshooting.md              (stays)
```

### Task p01-t01: Scaffold New Directory Structure

**Files:**
- Create: `docs/guide/index.md` (placeholder)
- Create: `docs/guide/provider-sync/` (directory)
- Create: `docs/guide/documentation/` (directory)
- Create: `docs/guide/workflow/` (directory)
- Create: `docs/guide/skills/` (directory)
- Create: `docs/guide/ideas/` (directory)
- Create: `docs/contributing/` (directory)

**Step 1: Create directories and placeholders**

Create the new directory structure with minimal placeholder `index.md` files that satisfy the `## Contents` contract. These will be properly written in later tasks.

**Step 2: Verify**

Run: `find apps/oat-docs/docs/ -type d | sort` to confirm directory structure matches plan.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/guide/ apps/oat-docs/docs/contributing/
git commit -m "docs(p01-t01): scaffold new audience-driven directory structure"
```

---

### Task p01-t02: Move Provider Interop Files to guide/provider-sync/

**Files:**
- Move: `docs/cli/provider-interop/index.md` → `docs/guide/provider-sync/index.md`
- Move: `docs/cli/provider-interop/scope-and-surface.md` → `docs/guide/provider-sync/scope-and-surface.md`
- Move: `docs/cli/provider-interop/commands.md` → `docs/guide/provider-sync/commands.md`
- Move: `docs/cli/provider-interop/providers.md` → `docs/guide/provider-sync/providers.md`
- Move: `docs/cli/provider-interop/manifest-and-drift.md` → `docs/guide/provider-sync/manifest-and-drift.md`
- Move: `docs/cli/provider-interop/config.md` → `docs/guide/provider-sync/config.md`
- Move: `docs/cli/provider-interop/hooks-and-safety.md` → `docs/contributing/hooks-and-safety.md`

**Step 1: Move files**

Use `git mv` for each file to preserve history.

**Step 2: Verify**

Confirm `docs/cli/provider-interop/` is empty (or removed) and files exist in new locations.

**Step 3: Commit**

```bash
git commit -m "docs(p01-t02): elevate provider interop to guide/provider-sync"
```

---

### Task p01-t03: Move Workflow and Projects Files to guide/workflow/

**Files:**
- Move: `docs/workflow/lifecycle.md` → `docs/guide/workflow/lifecycle.md`
- Move: `docs/workflow/hil-checkpoints.md` → `docs/guide/workflow/hil-checkpoints.md`
- Move: `docs/workflow/reviews.md` → `docs/guide/workflow/reviews.md`
- Move: `docs/workflow/pr-flow.md` → `docs/guide/workflow/pr-flow.md`
- Move: `docs/projects/artifacts.md` → `docs/guide/workflow/artifacts.md`
- Move: `docs/projects/state-machine.md` → `docs/guide/workflow/state-machine.md`

**Step 1: Move files**

Use `git mv` for each. The old `workflow/index.md` and `projects/index.md` will be superseded by the new `guide/workflow/index.md` written in Phase 2.

**Step 2: Remove old directories**

Remove `docs/workflow/` and `docs/projects/` (including their index files) once all content has been moved.

**Step 3: Verify**

Confirm files in `docs/guide/workflow/` and old directories removed.

**Step 4: Commit**

```bash
git commit -m "docs(p01-t03): merge workflow and projects into guide/workflow"
```

---

### Task p01-t04: Move Documentation Files to guide/documentation/

**Files:**
- Move: `docs/cli/docs-consumer-quickstart.md` → `docs/guide/documentation/quickstart.md`
- Move: `docs/cli/docs-apps.md` → `docs/guide/documentation/commands.md`
- Move: `docs/skills/docs-workflows.md` → `docs/guide/documentation/workflows.md`

**Step 1: Move files**

Use `git mv`.

**Step 2: Commit**

```bash
git commit -m "docs(p01-t04): consolidate docs pages into guide/documentation"
```

---

### Task p01-t05: Move Remaining Files to New Locations

**Files:**
- Move: `docs/cli/bootstrap.md` → `docs/guide/getting-started.md`
- Move: `docs/cli/tool-packs-and-assets.md` → `docs/guide/tool-packs.md`
- Move: `docs/skills/index.md` → `docs/guide/skills/index.md`
- Move: `docs/skills/execution-contracts.md` → `docs/contributing/skills.md`
- Move: `docs/ideas/index.md` → `docs/guide/ideas/index.md`
- Move: `docs/ideas/lifecycle.md` → `docs/guide/ideas/lifecycle.md`
- Move: `docs/cli/design-principles.md` → `docs/contributing/design-principles.md`
- Move: `docs/reference/commit-conventions.md` → `docs/contributing/commit-conventions.md`
- Move: `docs/contributing.md` → `docs/contributing/documentation.md`
- Move: `docs/cli/diagnostics.md` → keep for cli-reference.md content extraction
- Move: `docs/cli/local-paths.md` → keep for cli-reference.md content extraction

**Step 1: Move files**

Use `git mv`.

**Step 2: Clean up old empty directories**

Remove `docs/cli/`, `docs/skills/`, `docs/ideas/`, `docs/projects/` once empty.

**Step 3: Verify**

Confirm no orphaned files remain in old directories.

**Step 4: Commit**

```bash
git commit -m "docs(p01-t05): move remaining files to audience-driven locations"
```

---

## Phase 2: Index Pages and Navigation

Write all new and rewritten `index.md` files, the new `mkdocs.yml` nav, and any new pages (Core Concepts, CLI Reference, contributing sub-pages).

### Task p02-t01: Write Homepage (index.md)

**Files:**
- Modify: `docs/index.md`

**Step 1: Rewrite**

- Keep the OAT introduction and three-capability overview.
- Update `## Contents` to reflect new structure (guide/, contributing/, reference/).
- Rewrite `## Choose a usage path` to link to new locations.
- Remove the redundant `## Navigation` section.
- Keep `## Source-of-truth hierarchy`.

**Step 2: Verify**

Confirm all links resolve to files that exist.

**Step 3: Commit**

```bash
git commit -m "docs(p02-t01): rewrite homepage for audience-driven nav"
```

---

### Task p02-t02: Write User Guide Index (guide/index.md)

**Files:**
- Modify: `docs/guide/index.md`

**Step 1: Write**

Brief intro positioning this as the user-facing guide. `## Contents` listing all guide sub-sections: Core Concepts, Getting Started, Provider Sync, Tool Packs, Documentation, Workflow & Projects, Skills, Ideas, CLI Reference.

**Step 2: Commit**

```bash
git commit -m "docs(p02-t02): write user guide index page"
```

---

### Task p02-t03: Write Core Concepts Page (guide/concepts.md)

**Files:**
- Create: `docs/guide/concepts.md`

**Step 1: Write**

Synthesize the key mental model concepts from existing content (not net-new):
- **Canonical assets and provider views** — what they are, how the source-of-truth works
- **Sync and drift** — conceptual explanation of the sync model
- **Scopes** — project vs. user
- **Skills** — what a skill is, how they relate to CLI commands
- **The three usage modes** — interop-only, provider-agnostic tooling, workflow layer
- **Human-in-the-Loop Lifecycle (HiLL)** — brief conceptual intro

Keep each concept to 3-5 sentences. Link to detailed pages for more.

**Step 2: Commit**

```bash
git commit -m "docs(p02-t03): add core concepts page"
```

---

### Task p02-t04: Write Contributing Section Index and Sub-Pages

**Files:**
- Modify: `docs/contributing/index.md`
- Create: `docs/contributing/code.md`
- Modify: `docs/contributing/documentation.md` (reframe, remove plugin inventory)
- Create: `docs/contributing/markdown-features.md` (extracted reference card)
- Modify: `docs/contributing/skills.md` (reframe as authoring guide)

**Step 1: Write contributing/index.md**

Developer onboarding hub with one-sentence routing to each sub-page.

**Step 2: Write contributing/code.md**

New page covering: dev environment setup (`pnpm install`, `pnpm build`), monorepo structure, running tests (`pnpm test`), linting (`pnpm lint`, `pnpm format`), TypeScript conventions, PR expectations.

**Step 3: Reframe contributing/documentation.md**

Remove the plugin/extension inventory (moved to markdown-features.md). Keep: nav contract, local workflow, agent guidance.

**Step 4: Write contributing/markdown-features.md**

Extract from old contributing.md: all plugin descriptions and extension docs. Add usage examples for: admonitions/callouts, tabbed content, Mermaid diagrams, code highlighting, collapsible details, emoji, snippets. This becomes the bookmark-able reference card.

**Step 5: Reframe contributing/skills.md**

Expand from execution-contracts.md: add practical guidance on skill structure, manifest fields, creating a new skill, testing. Keep frontmatter spec and governance rules.

**Step 6: Commit**

```bash
git commit -m "docs(p02-t04): write contributing section with sub-pages"
```

---

### Task p02-t05: Write CLI Reference Page (guide/cli-reference.md)

**Files:**
- Create: `docs/guide/cli-reference.md`

**Step 1: Write**

Lean command reference page. Pull the command tables from current `cli/index.md` (bootstrap commands, tool management, instruction integrity, provider-interop commands, diagnostics, project lifecycle, repo state, internal commands, global options). Organized as a scannable reference — no conceptual content, just commands + purpose + link to detailed page.

Include content from `cli/diagnostics.md` and `cli/local-paths.md` inline (or as sections) since these are short reference pages that don't warrant their own files in the new structure.

**Step 2: Commit**

```bash
git commit -m "docs(p02-t05): add lean CLI reference page"
```

---

### Task p02-t06: Write Section Index Pages

**Files:**
- Modify: `docs/guide/provider-sync/index.md` (reframe intro, update Contents links)
- Modify: `docs/guide/workflow/index.md` (unified intro merging workflow + projects intros)
- Modify: `docs/guide/documentation/index.md` (hub page linking the three docs sub-pages)
- Modify: `docs/guide/skills/index.md` (add "Key Skills by Use Case" section)
- Modify: `docs/guide/ideas/index.md` (minor link updates)
- Modify: `docs/reference/index.md` (slimmed — remove items that moved to contributing)

**Step 1: Write each index**

Each must satisfy the `## Contents` contract and link to children correctly.

For `guide/skills/index.md`: add a new "Key Skills by Use Case" section at the top listing the 5-6 most common skills with one-line descriptions, before the full catalog tables. Add a link to `contributing/skills.md` for skill authoring.

For `guide/workflow/index.md`: merge the intros from `workflow/index.md` and `projects/index.md` into a unified narrative.

**Step 2: Verify**

All `## Contents` links resolve.

**Step 3: Commit**

```bash
git commit -m "docs(p02-t06): write section index pages with Contents contract"
```

---

### Task p02-t07: Update mkdocs.yml Navigation

**Files:**
- Modify: `apps/oat-docs/mkdocs.yml`

**Step 1: Write new nav**

```yaml
nav:
  - Home: index.md
  - Quickstart: quickstart.md
  - User Guide:
      - guide/index.md
      - Core Concepts: guide/concepts.md
      - Getting Started: guide/getting-started.md
      - Provider Sync:
          - guide/provider-sync/index.md
          - Scope and Surface: guide/provider-sync/scope-and-surface.md
          - Commands: guide/provider-sync/commands.md
          - Providers: guide/provider-sync/providers.md
          - Manifest and Drift: guide/provider-sync/manifest-and-drift.md
          - Config: guide/provider-sync/config.md
      - Tool Packs: guide/tool-packs.md
      - Documentation:
          - guide/documentation/index.md
          - Quickstart: guide/documentation/quickstart.md
          - Commands: guide/documentation/commands.md
          - Workflows: guide/documentation/workflows.md
      - Workflow & Projects:
          - guide/workflow/index.md
          - Lifecycle: guide/workflow/lifecycle.md
          - Artifacts: guide/workflow/artifacts.md
          - State Machine: guide/workflow/state-machine.md
          - HiLL Checkpoints: guide/workflow/hil-checkpoints.md
          - Reviews: guide/workflow/reviews.md
          - PR Flow: guide/workflow/pr-flow.md
      - Skills:
          - guide/skills/index.md
      - Ideas:
          - guide/ideas/index.md
          - Lifecycle: guide/ideas/lifecycle.md
      - CLI Reference: guide/cli-reference.md
  - Developer Guide:
      - contributing/index.md
      - Contributing Code: contributing/code.md
      - Contributing Docs: contributing/documentation.md
      - Markdown Features: contributing/markdown-features.md
      - Writing Skills: contributing/skills.md
      - CLI Design Principles: contributing/design-principles.md
      - Commit Conventions: contributing/commit-conventions.md
      - Hooks and Safety: contributing/hooks-and-safety.md
  - Reference:
      - reference/index.md
      - File Locations: reference/file-locations.md
      - Directory Structure: reference/directory-structure.md
      - Docs Index Contract: reference/docs-index-contract.md
      - Troubleshooting: reference/troubleshooting.md
```

**Step 2: Verify**

Verify all referenced files exist on disk.

**Step 3: Commit**

```bash
git commit -m "docs(p02-t07): update mkdocs.yml nav for audience-driven structure"
```

---

## Phase 3: Cross-Reference Updates

Fix all internal links broken by file moves. Update the quickstart to trim workflow detail.

### Task p03-t01: Audit and Fix Cross-References

**Files:**
- Modify: all moved files that contain relative links to other docs pages

**Step 1: Find broken links**

Search all `.md` files under `docs/` for markdown links `](...)` and verify each target exists at the referenced path. Pay special attention to:
- Relative links in moved files (paths changed)
- Links from non-moved files pointing to old locations
- `reference/` pages linking to content now in `contributing/`

**Step 2: Fix each broken link**

Update to correct relative path from the file's new location.

**Step 3: Verify**

Re-run the link audit to confirm zero broken internal links.

**Step 4: Commit**

```bash
git commit -m "docs(p03-t01): fix cross-references after file moves"
```

---

### Task p03-t02: Trim Quickstart Page

**Files:**
- Modify: `docs/quickstart.md`

**Step 1: Trim**

- Keep Path A (Interop-only) — this is the core quickstart content.
- Keep Path B (Provider-agnostic tooling) — brief with links to guide/skills/ and guide/documentation/.
- Trim Path C (Workflow layer) — reduce to a brief overview (5-10 lines) with link to `guide/workflow/lifecycle.md` for the full lane descriptions. The detailed spec-driven/quick/import lane walkthroughs move to the workflow section.
- Update all links to point to new file locations.

**Step 2: Commit**

```bash
git commit -m "docs(p03-t02): trim quickstart, link to workflow section for detail"
```

---

### Task p03-t03: Add Audience Cross-Links

**Files:**
- Modify: `docs/guide/skills/index.md` — add "Want to create a skill? See [Writing Skills](../../contributing/skills.md)"
- Modify: `docs/guide/provider-sync/index.md` — add link to `contributing/hooks-and-safety.md` for implementation-level safety details
- Modify: `docs/contributing/documentation.md` — add link to `guide/documentation/index.md` for user-facing docs overview
- Modify: `docs/reference/docs-index-contract.md` — add links to both `guide/documentation/` (user) and `contributing/documentation.md` (contributor)

**Step 1: Add cross-links**

Brief callout or note at the bottom of each page linking to the other-audience version.

**Step 2: Commit**

```bash
git commit -m "docs(p03-t03): add audience cross-links between user and developer guides"
```

---

## Phase 4: Visual Elements and Content Enhancement

Add Mermaid diagrams and tabbed content to key pages.

### Task p04-t01: Add Mermaid Diagrams

**Files:**
- Modify: `docs/guide/workflow/lifecycle.md` — workflow lifecycle flowchart
- Modify: `docs/guide/workflow/state-machine.md` — state transition diagram
- Modify: `docs/guide/provider-sync/index.md` — canonical → manifest → provider view sync flow
- Modify: `docs/guide/concepts.md` — simple architecture overview (three-tier capabilities)

**Step 1: Write diagrams**

For each page, add a Mermaid diagram using ```` ```mermaid ```` fencing. Diagrams should supplement, not replace, the existing prose.

- **Workflow lifecycle:** flowchart showing discovery → spec → design → plan → implement → review → PR → complete, with quick lane shortcut
- **State machine:** stateDiagram-v2 showing project states and transitions
- **Provider sync flow:** flowchart showing canonical assets → sync engine → provider views (fan-out to Claude, Cursor, Codex, Copilot, Gemini)
- **Architecture overview:** simple block diagram showing the three capability tiers

**Step 2: Verify**

Confirm Mermaid renders in MkDocs dev server (already configured in `mkdocs.yml` superfences).

**Step 3: Commit**

```bash
git commit -m "docs(p04-t01): add Mermaid diagrams for key flows"
```

---

### Task p04-t02: Add Tabbed Content

**Files:**
- Modify: `docs/guide/provider-sync/providers.md` — tab per provider
- Modify: `docs/guide/skills/index.md` — tab per skill family
- Modify: `docs/contributing/markdown-features.md` — tabbed examples showing syntax + rendered output

**Step 1: Add tabs**

Use `pymdownx.tabbed` syntax:

```markdown
=== "Claude Code"

    Provider-specific content...

=== "Cursor"

    Provider-specific content...
```

For providers.md: each tab shows the provider's directory layout, supported features, and any quirks.
For skills index: tabs for Lifecycle, Ideas, Review/PR, Documentation, Utility families.
For markdown-features.md: tabs showing raw syntax vs. rendered output for each feature.

**Step 2: Verify**

Confirm tabs render correctly in MkDocs dev server.

**Step 3: Commit**

```bash
git commit -m "docs(p04-t02): add tabbed content for providers, skills, and markdown features"
```

---

## Phase 5: Final Verification

### Task p05-t01: Full Link Audit and Nav Sync

**Files:**
- Verify: all `docs/**/*.md` files
- Verify: `apps/oat-docs/mkdocs.yml`

**Step 1: Link audit**

Scan every markdown file for internal links and verify targets exist. Check that no file references old paths.

**Step 2: Nav sync**

Verify every file in the nav exists and every `.md` file in `docs/` is reachable from the nav.

**Step 3: Contents contract**

Verify every `index.md` has a `## Contents` section with links to its children.

**Step 4: Commit (if fixes needed)**

```bash
git commit -m "docs(p05-t01): final link audit and nav verification fixes"
```

---

### Task p05-t02: Build Verification

**Step 1: Build docs**

Run MkDocs build to verify no errors:

```bash
cd apps/oat-docs && mkdocs build --strict 2>&1
```

**Step 2: Fix any build errors**

Address any warnings or errors from strict build.

**Step 3: Final commit (if fixes needed)**

```bash
git commit -m "docs(p05-t02): fix build errors from strict mkdocs build"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| p05 | code | pending | - | - |
| final | code | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 5 tasks - Directory structure and file moves
- Phase 2: 7 tasks - Index pages, new pages, and navigation
- Phase 3: 3 tasks - Cross-reference fixes and content trimming
- Phase 4: 2 tasks - Mermaid diagrams and tabbed content
- Phase 5: 2 tasks - Final verification and build

**Total: 19 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
