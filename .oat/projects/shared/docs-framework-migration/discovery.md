---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-03-08
oat_generated: false
---

# Discovery: docs-framework-migration

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Migrate OAT's docs framework from MkDocs Material to Fumadocs (Next.js-based) to provide a more modern, polished UI for documentation sites. OAT scaffolds docs sites for consumer repos across the org, so this is a platform-level decision — not just swapping one site's framework. The docs packages will be open source as part of OAT.

Key goals:
- Authors continue writing plain markdown (no MDX/JSX authoring)
- Build-time transforms handle any syntax bridging
- Beautiful default UI out of the box for every scaffolded site
- AI-friendly docs surface with generated navigation artifacts
- MkDocs remains a supported option for consumers who prefer it

## Clarifying Questions

### Question 1: Framework Choice

**Q:** What's driving the move away from MkDocs Material?
**A:** The deployed sites could look nicer. Fumadocs has beautiful UI. This matters because OAT is about to roll out docs sites to all repos across the org.
**Decision:** Fumadocs chosen for its modern Next.js-based UI, with MkDocs retained as an alternative option.

### Question 2: Authoring Format

**Q:** Are you willing to convert all .md to .mdx and author in JSX going forward?
**A:** No. Prefer to keep authoring in plain markdown and have build-time transforms handle conversion.
**Decision:** Plain markdown authoring is non-negotiable. Remark/rehype plugins handle the transform layer at build time.

### Question 3: Admonition Syntax

**Q:** Should we build a transform for MkDocs `!!!` admonition syntax, or convert to GFM callouts?
**A:** Convert to GFM callouts (`> [!NOTE]`). They're a de facto standard, familiar to devs, and render on GitHub/Obsidian/VS Code.
**Decision:** One-time codemod from `!!!` to GFM callouts. No ongoing transform needed.

### Question 4: Package Location

**Q:** Where should the shared docs packages live — in the OAT monorepo or separate repos?
**A:** In the OAT monorepo alongside the CLI.
**Decision:** Packages live in `packages/` within the OAT monorepo, managed by Turborepo.

### Question 5: Package Structure

**Q:** Should remark transforms be bundled in docs-config or separated?
**A:** Separate. Transforms (syntax conversion) are different from config (framework wiring). And plugins (new capabilities) would be yet another concern.
**Decision:** Three packages: docs-config (framework wiring), docs-transforms (AST syntax conversion), docs-theme (visual components/layout).

### Question 6: Docs Index

**Q:** Should nav be defined in a config file (like mkdocs.yml) or derived from folder structure?
**A:** Folder structure is the source of truth. An `index.md` is generated as a discoverability artifact (not authored). Titles come from frontmatter, descriptions from frontmatter too. This is a flat content index for AI, not a navigation/layout artifact.
**Decision:** Generated `index.md` at docs app root (not inside `docs/` to avoid rendering as a page). AI agents use this as their entry point.

### Question 7: Search

**Q:** What search solution? Willing to pay for hosted search?
**A:** No. Use FlexSearch — fully client-side, no cost, works with static export.
**Decision:** FlexSearch built into the default config.

### Question 8: Deployment

**Q:** How will docs sites be deployed?
**A:** Static export to S3. These are mostly internal docs.
**Decision:** Next.js `output: 'export'` producing static HTML/CSS/JS.

### Question 9: MkDocs Support

**Q:** Should the CLI still support scaffolding MkDocs sites?
**A:** Yes. The existing MkDocs scaffold already works. Add a framework choice prompt to `oat docs init`.
**Decision:** `oat docs init` offers framework choice (Fumadocs or MkDocs). Existing MkDocs templates retained.

### Question 10: Documentation Config

**Q:** How do skills/tools know which framework a repo uses?
**A:** The `.oat/config.json` `documentation` section already has `tooling` field. Add a `documentation.index` field pointing to the docs entry point (`index.md` for Fumadocs, `mkdocs.yml` for MkDocs).
**Decision:** Add `documentation.index` to config schema. Skills read this to understand the docs surface without needing framework-specific logic.

### Question 11: Frontmatter Convention

**Q:** Should pages have `description` frontmatter?
**A:** Yes. AI generates descriptions, they flow into `index.md`, landing pages, search indexing, and HTML meta tags. Fumadocs already supports `title` and `description` as first-class frontmatter fields.
**Decision:** `description` frontmatter is a convention. Migration codemod seeds empty `description: ""` for AI to fill.

### Question 12: Scaffold Customization

**Q:** Should consumer config live in a separate file or be interpolated at scaffold time?
**A:** Interpolate at scaffold time. Config (title, description) is set once and rarely changes. No need for an extra config file.
**Decision:** Token interpolation into generated files, same approach as current MkDocs scaffold.

## Options Considered

### Option A: Thin Scaffold, Heavy Packages (Chosen)

**Description:** Scaffolded docs app is a shell (4-5 files) that imports everything from OAT packages. All framework wiring, transforms, and theme components live in shared packages.

**Pros:**
- Upgrading is trivial — bump package versions
- Consistency across org guaranteed by packages
- Consumer repos have minimal docs boilerplate

**Cons:**
- Less flexibility for heavy customization
- Debugging requires understanding package internals

### Option B: Fat Scaffold, Light Packages

**Description:** Scaffold generates a full Fumadocs app with all config inline. Packages just export transforms and some theme components.

**Pros:**
- Each repo is self-contained
- Easy to understand and customize

**Cons:**
- Upgrading means re-scaffolding or manual sync across every repo
- Drift across org over time

### Option C: Ejectable Scaffold

**Description:** Start with Option A but provide `oat docs eject` to inline everything.

**Pros:**
- Best of both — simple by default, full control when needed

**Cons:**
- Ejected repos lose automatic upgrades
- More CLI code to maintain
- Creates two classes of docs apps

**Chosen:** A

**Summary:** Thin scaffold with heavy packages. OAT owns the complexity, consumer repos just write markdown. Nobody needs to customize Fumadocs wiring — if they do, they can override at the Next.js level without a formal eject mechanism.

## Key Decisions

1. **Framework:** Fumadocs (Next.js) as the primary docs framework, MkDocs Material retained as alternative
2. **Authoring:** Plain markdown only — no MDX/JSX authoring required
3. **Syntax strategy:** Codemod to universal standards (GFM callouts) where possible; build-time transforms only for syntax with no universal equivalent (tabs)
4. **Package architecture:** Three packages — docs-config, docs-transforms, docs-theme — in the OAT monorepo
5. **Docs index:** Generated `index.md` with titles and descriptions from frontmatter for AI discoverability; placed at docs app root (not inside `docs/`)
6. **Config integration:** `documentation.index` field in `.oat/config.json` points to the docs surface entry point
7. **Search:** FlexSearch (client-side, free)
8. **Deployment:** Static export (`output: 'export'`), deploy to S3 or wherever
9. **Open source:** All packages are open source as part of OAT; branding is configurable, not hardcoded

## Constraints

- Authors must be able to write plain `.md` files with no JSX
- Must support static export (no Node.js server at runtime)
- MkDocs must remain a supported scaffold option
- Packages must be framework-agnostic in branding (no org-specific logos/colors hardcoded)
- Must work with any package manager (npm, pnpm, yarn)

## Success Criteria

- `oat docs init` scaffolds a working Fumadocs site with one command
- Authors write standard markdown and get a polished docs site
- Existing MkDocs content migrates with `oat docs migrate` (admonitions, frontmatter titles)
- `index.md` generation works and provides useful AI entry point with descriptions
- FlexSearch works out of the box with static export
- MkDocs scaffold still works as an alternative

## Out of Scope

- Docusaurus support (future extensibility point, not built now)
- Updating `oat-docs-analyze` / `oat-docs-apply` skills for Fumadocs awareness (follow-up work)
- Custom docs plugins (capabilities like auto-linking, code injection — future `@oat/docs-plugins` package)
- Doc versioning
- Hosted search integrations (Algolia, Orama, etc.)

## Deferred Ideas

- **Docusaurus support** — Architecture supports adding another framework choice later; just needs template set
- **`@oat/docs-plugins`** — Future package for capability-adding plugins (auto-linking, code snippet injection, API doc generation, changelog injection)
- **Auto-generated `index.md` pages** — Pull sibling `description` frontmatter to build Contents sections automatically
- **Doc versioning** — Not needed for internal docs, could add later

## Open Questions

- **Tabs transform complexity:** How complex is the `=== "Tab"` → `<Tabs>` remark transform in practice? Need to prototype to assess effort.
- **Fumadocs static export limitations:** Are there any FlexSearch or Fumadocs UI features that don't work with `output: 'export'`? Need to validate.
- **Theme customization surface:** What exactly does `@oat/docs-theme` expose for branding — just colors/logo, or full layout overrides?
- **`oat docs migrate` for non-MkDocs repos:** Should the migrate command be smart enough to detect framework, or always require explicit source format?

## Assumptions

- Fumadocs' `remarkMdxMermaid` plugin handles ` ```mermaid ` fenced blocks without content changes
- Fumadocs' `remarkDirectiveAdmonition` supports GFM-style `> [!NOTE]` callouts
- FlexSearch works fully in static export mode
- Consumer repos have Node.js available (reasonable since OAT is already a Node.js CLI)

## Risks

- **Fumadocs single maintainer:** The project has one primary maintainer. If they stop maintaining it, OAT owns the dependency.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** OAT wraps Fumadocs completely — consumer repos never import it directly. Could swap the underlying framework without changing the authoring contract.

- **MkDocs syntax edge cases:** Migration codemod may miss edge cases in admonition syntax (nested admonitions, admonitions in lists, etc.)
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Dry-run mode catches issues before applying. Small enough file count to review manually.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-spec` (after HiLL approval if configured).
