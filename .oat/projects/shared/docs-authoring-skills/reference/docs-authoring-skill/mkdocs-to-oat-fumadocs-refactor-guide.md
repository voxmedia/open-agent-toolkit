---
title: MkDocs to OAT Fumadocs refactor guide
description: Agent handoff guide for migrating an existing MkDocs docs app to OAT Fumadocs using lessons from prior refactors.
---

# MkDocs to OAT Fumadocs refactor guide

## Source projects reviewed

Citation shorthand used below:

- `duet:<path>:<line>` refers to `/Users/thomas.stang/Code/vox/duet/.oat/projects/archived/fumadocs-refactor/<path>`.
- `honeycomb:<path>:<line>` refers to `/Users/thomas.stang/Code/vox/honeycomb/.oat/projects/archived/fumadocs-refactor/<path>`.
- `oat:<path>:<line>` refers to `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/<path>`.

Reviewed projects and artifacts:

- Duet `fumadocs-refactor`
  - Project artifacts: `state.md`, `discovery.md`, `plan.md`, `implementation.md`, `summary.md`, `pr/description.md`.
  - Migration reference: `reference/corrections-log.md`, `reference/invalid-references-to-remove.md`, `reference/runbook.md`.
  - Repo files inspected for final shape: `apps/duet-docs/package.json`, `apps/duet-docs/AGENTS.md`, `apps/duet-docs/CLAUDE.md`, `apps/duet-docs/index.md`, `apps/duet-docs/docs/index.md`, `apps/duet-docs/next.config.js`, `apps/duet-docs/source.config.ts`, `apps/duet-docs/.markdownlint.jsonc`, `apps/duet-docs/.oxfmtrc.json`.
- Honeycomb `fumadocs-refactor`
  - Project artifacts: `state.md`, `discovery.md`, `plan.md`, `implementation.md`, `summary.md`, `pr/project-pr-2026-06-01.md`.
  - Review/reference artifacts: `reference/runbook.md`, `reviews/p02-review-2026-06-01.md`, `reviews/p03-review-2026-06-01.md`, `reviews/p04-review-2026-06-01.md`, `reviews/p05-review-2026-06-01.md`, `reviews/p06-review-2026-06-01.md`, `reviews/final-review-2026-06-01.md`.
  - Repo files inspected for final shape: `apps/honeycomb-docs/package.json`, `apps/honeycomb-docs/AGENTS.md`, `apps/honeycomb-docs/CLAUDE.md`, `apps/honeycomb-docs/index.md`, `apps/honeycomb-docs/docs/index.md`, `apps/honeycomb-docs/next.config.js`, `apps/honeycomb-docs/source.config.ts`, `apps/honeycomb-docs/.markdownlint.jsonc`, `apps/honeycomb-docs/.oxfmtrc.json`.
- OAT docs standards reviewed: `apps/oat-docs/AGENTS.md`, `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`, `.agents/skills/oat-docs-analyze/SKILL.md`, `.agents/skills/oat-docs-analyze/references/quality-checklist.md`, `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`, `.agents/skills/oat-docs-bootstrap/SKILL.md`, plus the docs-authoring research pack in this brainstorm directory.
- Additional reference repos checked for docs build/dev isolation: `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`, `/Users/thomas.stang/Code/vox/duet/apps/duet-docs`, `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`, `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`, `/Users/thomas.stang/Code/stoa/apps/documentation`.

## When to use this guide

Use this guide when converting an existing MkDocs docs app into an OAT-convention Fumadocs app.

Do not use it as the primary guide for a brand-new docs surface. For a new docs surface, use `oat-docs-bootstrap` and then optionally run a content audit. This guide assumes there is existing content, existing navigation, existing build/deploy behavior, and possibly legacy MkDocs syntax or source-code references that must be preserved, converted, or deleted.

## Scope boundary

This is a standalone migration handoff. It can reference OAT docs conventions, compare against bootstrap-generated app shells, and reuse commands already present in the target repo, but it does not modify `oat-docs-bootstrap` or make bootstrap own migration completion.

Use bootstrap outputs as a scaffold reference only after the migration agent has inventoried the existing repo. If the target has `mkdocs.yml`, Python docs tooling, populated docs trees, deploy workflows, or source-to-doc reference systems, treat the work as migration first and bootstrap second.

The migration agent owns these outputs for the target repo: a converted Fumadocs app shell, converted authored docs, updated local `index.md` maps, regenerated derived files, current OAT config, coherent instruction surfaces, validation evidence, render evidence, and owner-review items for anything unverifiable.

## Migration principles

- **Inventory before editing.** Honeycomb's successful migration started with counts and concrete facts: 122 Markdown files, about 42 directories, 38 `overview.md`, MkDocs tooling, syntax features, deploy workflow, docs indexing, OAT config, Node/pnpm constraints, and app path decisions (`honeycomb:discovery.md:28-56`).
- **Trust current source over old docs or PR narratives.** Duet explicitly made current `main` the source of truth after a framework upgrade was partially reverted (`duet:discovery.md:43-46`).
- **Preserve integration surfaces unless there is a reason to rename.** Honeycomb migrated in place because CI, Docs MCP indexing, and OAT config already referenced `apps/honeycomb-docs` (`honeycomb:discovery.md:69-70`).
- **Treat authored indexes as the navigation contract.** OAT docs guidance makes `docs/**/index.md` `## Contents` the source of truth and generated artifacts derived output (`oat:apps/oat-docs/AGENTS.md:13-20`).
- **A green build is not enough.** Duet's build succeeded while MkDocs figures dropped images; render checks against `out/` were required (`duet:reference/invalid-references-to-remove.md:53-96`).
- **Delete or rewrite removed systems.** Duet rewrote/deleted Redis GraphQL cache docs after verifying the subsystem was gone; it did not preserve stale architecture for continuity (`duet:reference/corrections-log.md:199-221`).
- **Use tooling boundaries deliberately.** Formatter handles layout; markdownlint handles content/structure/accessibility; neither substitutes for source accuracy verification (`duet:reference/corrections-log.md:222-249`).
- **Keep docs app build/dev isolated.** In monorepos, root `build` and root `dev` should not build or start the docs app. Expose explicit docs commands such as `build:docs` and `dev:docs`; Honeycomb also had to prevent root `turbo test` from pulling in the docs Next build (`honeycomb:implementation.md:194-202`).
- **Capture uncertainty.** If a command, deploy path, external tool, ownership claim, or source reference cannot be verified, flag it for owner decision instead of guessing.

## Preflight inventory

Before editing, inspect and record:

- Existing MkDocs config and nav
  - `mkdocs.yml`, especially `nav:`, `theme`, `plugins`, and `markdown_extensions`.
  - Whether `mkdocs.yml` is authored or generated.
- Docs tree shape
  - Count Markdown files.
  - Count directories that contain Markdown.
  - List missing `index.md`.
  - List `overview.md` files.
  - Identify images/assets directories.
- Generated or authored index files
  - Existing landing pages.
  - Generated root indexes.
  - Any instructions saying a file is generated.
- Links and extensions
  - Relative links without `.md`.
  - Links to `overview.md`.
  - Anchors that may change after headings are rewritten.
  - Source-code `@docs` annotations or generated docs-reference maps.
- Plugin/extension usage
  - `!!!` and `???` admonitions.
  - `=== "Tab"` content tabs.
  - Mermaid code fences.
  - `<figure markdown>` blocks.
  - Image attr lists such as `{ width="400" }`.
  - Snippet includes such as `--8<--`.
  - Jinja/macros such as `{{ }}` or `{% %}`.
- Code examples and Markdown features
  - Nested code fences.
  - Fenced path trees incorrectly labeled as a programming language.
  - Placeholder URLs with angle brackets.
  - Fences that should be `text`, `sh`, `yaml`, `json`, `ts`, or `tsx`.
- Package scripts
  - Existing docs build/dev/format scripts.
  - Whether root `build` or root `dev` includes the docs app; in monorepos they should not.
  - Whether explicit root `build:docs` and `dev:docs` commands exist or should be added.
  - Whether root `test`, `lint`, or `type-check` includes the docs app unintentionally.
  - Whether a docs app package has scripts that root Turborepo will schedule unexpectedly.
- OAT docs tooling/config packages
  - `@open-agent-toolkit/docs-config`.
  - `@open-agent-toolkit/docs-theme`.
  - `@open-agent-toolkit/docs-transforms`.
  - `@open-agent-toolkit/cli`.
  - `fumadocs-*`, `next`, `react`, `tailwindcss`.
- Docs AGENTS/contributing files
  - Root `AGENTS.md` documentation section.
  - Docs-app `AGENTS.md`.
  - Docs-app `CLAUDE.md` shim if that runtime is supported.
  - Human-facing `docs/contributing.md` and whether it still describes MkDocs.
- CI/deploy/indexing
  - `.github/workflows/deploy-docs.yml`.
  - Docs indexing workflows.
  - S3 bucket or hosting target.
  - Build output directory (`site/` for MkDocs, `out/` for static Fumadocs).
- Repo-level OAT config
  - `.oat/config.json` documentation block.
  - Whether `tooling` is `mkdocs` or `fumadocs`.
  - Whether the `root`, `index`, and stale `config` keys are correct.

## Recommended migration sequence

1. **Freeze the source of truth.**
   - Identify the branch/base commit and current source files.
   - If a prior PR or migration narrative disagrees with current code, trust the tree. Duet's post-revert framework state required this decision (`duet:discovery.md:43-46`).
2. **Run the preflight inventory.**
   - Save counts and findings in the project artifact or handoff notes.
   - Include unsupported syntax counts, path decisions, deploy behavior, and OAT config state.
3. **Decide app path and package identity.**
   - Prefer in-place migration when existing CI/indexing/config points at the current path.
   - Collect separate site display name, package name, target dir, and site description.
4. **Scaffold or hand-author the Fumadocs app shell.**
   - Use OAT CLI when safe.
   - If CLI would clobber important existing files, hand-author the small Fumadocs app shell from a known OAT reference app.
   - Ensure `app/layout.tsx` exports site metadata and sets `DocsLayout` branding.
5. **Update package scripts and dependencies.**
   - Add Fumadocs/OAT/Next/React/Tailwind dependencies.
   - Add `predev`, `prebuild`, `build`, `dev`, `start`.
   - Add `docs:lint`, `docs:lint:fix`, `docs:format`, `docs:format:check`.
   - In monorepos, exclude the docs package from default root `build` and root `dev`, and add explicit root `build:docs` and `dev:docs` commands.
   - Check root `test`, lint, and type-check task graphs so they do not schedule the docs build unintentionally.
   - Add formatter guardrails before running the formatter.
6. **Migrate content structure.**
   - Move or keep docs under the app's `docs/`.
   - Rename `overview.md` entrypoints to `index.md`.
   - Add frontmatter with quoted strings where needed.
   - Create `index.md` for every content directory.
7. **Translate `mkdocs.yml` nav into local maps.**
   - For each directory, author `## Contents` with sibling pages and child directories.
   - Use `.md`-suffixed links and `subdir/index.md`.
   - Do not hand-edit generated root index output.
8. **Convert MkDocs-only syntax.**
   - Convert admonitions to GFM callouts.
   - Convert titled callouts using a bold lead line, not inline title text.
   - Convert `<figure markdown>` to plain Markdown images or a supported component.
   - Inline or remove unsupported snippets/macros unless they are literal examples inside fenced code.
9. **Run formatter/lint cleanup.**
   - Run formatter first, then lint autofix, then manually fix remaining content findings.
   - Watch for formatter corruption in nested fences and tutorial content.
10. **Generate indexes and build.**
    - Run the local index-generation command discovered from package scripts or OAT config.
    - Run the docs build.
    - Confirm generated root index has a generated warning.
    - Confirm `out/` exists.

11. **Verify rendered HTML.**
    - Inspect exported pages for callouts, images, tabs, Mermaid, and no literal MkDocs syntax.
    - A build-only verification is insufficient.

12. **Update CI/config/agent surfaces.**

- Convert deploy workflow from Python/MkDocs to Node/Fumadocs.
- Update `.oat/config.json`.
- Update root/docs-app `AGENTS.md`, docs-app `CLAUDE.md`, and human contributing docs.
- Delete `mkdocs.yml`, `requirements.txt`, `setup-docs.sh`, or legacy files only after the Fumadocs build is proven.

13. **Run content accuracy verification.**

- Split by content cluster when large.
- Verify commands, package scripts, source paths, exports, env vars, config keys, versions, workflows, observability, and deploy claims against current source.

14. **Repair source doc references.**

- If source files contain `@docs` annotations or generated docs-reference maps, update them after `overview.md`→`index.md` renames and route changes.

15. **Produce the handoff.**

- Include files changed, artifacts inspected, validation commands, unresolved uncertainties, and owner-decision items.

## Mapping MkDocs concepts to OAT Fumadocs

- **`mkdocs.yml nav:` → `docs/**/index.md` `## Contents`\*\*
  - Translate global nav into local maps. Each directory owns its immediate children.
  - Generated root index and framework navigation derive from these maps.
- **`overview.md` → `index.md`**
  - Use `index.md` for directory entrypoints. Update links and source annotations.
- **Extensionless MkDocs links → `.md`-suffixed authored links**
  - Use `[Page](page.md)` and `[Section](section/index.md)`.
  - OAT link transforms normalize `.md` and `dir/index.md` for routes.
- **MkDocs admonitions → GFM callouts**
  - `!!! warning "Title"` becomes:
    - `> [!WARNING]`
    - `> **Title**`
    - `> Body`
- **MkDocs content tabs → OAT-supported tabs**
  - `=== "Tab"` was preserved in both migrations when the OAT `remark-tabs` transform handled it.
- **Mermaid fences → Mermaid component rendering**
  - Keep Mermaid code fences and verify rendered HTML includes Mermaid markers.
- **`<figure markdown>` and attr-list image syntax → Markdown image or component**
  - Plain `![Alt](path)` is safest unless a real component is required.
- **Snippet includes/macros → inline content or literal examples**
  - If `--8<--`, `{{ }}`, or `{% %}` are active MkDocs features, inline or remove them.
  - If they are inside code fences as examples, keep them and ensure the fence language prevents MDX interpretation.
- **MkDocs Python tooling → Node/Fumadocs tooling**
  - Remove Python-only `requirements.txt` and setup scripts after the Fumadocs build is proven.
  - Convert CI from `mkdocs build`/`site/` to `pnpm --filter <docs> build`/`out/`.
- **Generated files**
  - Generated root index should carry an autogen warning and be regenerated by `predev`/`prebuild`.
  - Do not hand-edit generated files.

## Known pitfalls from prior refactors

### Current source disagrees with migration narrative

- **Seen in:** duet
- **Evidence:** Duet found a PR narrative saying Next 16/React 19/Turbopack had shipped, but current `main` had reverted network apps to Next 14/React 18/webpack; docs accuracy used current files as source of truth (`duet:discovery.md:43-46`).
- **Risk:** Docs preserve stale framework versions, commands, imports, or architecture because the migration used old context.
- **Recommended handling:** Audit against current source after structural migration. Do not trust old docs, PR descriptions, or partial refactor notes without checking the tree.
- **Validation:** Compare docs claims against `package.json`, source files, workflows, config, and tests.

### Invalid or stale OAT config blocks docs generation

- **Seen in:** both
- **Evidence:** Duet fixed a trailing comma in `.oat/config.json` that blocked `oat docs generate-index` (`duet:reference/corrections-log.md:28`); Honeycomb preflight found `tooling: mkdocs` and a stale `config` pointer that needed conversion (`honeycomb:discovery.md:55-56`).
- **Risk:** Build fails before Next, OAT workflows point at the wrong docs tool, or generated index paths are missing.
- **Recommended handling:** Parse `.oat/config.json` before and after edits. Update `documentation.root`, `documentation.tooling`, and `documentation.index`; remove stale MkDocs config keys.
- **Validation:** Run `jq . .oat/config.json` or equivalent, then run docs index generation.

### `overview.md` renames can break source references

- **Seen in:** honeycomb
- **Evidence:** Honeycomb's `overview.md`→`index.md` rename later broke `@docs` paths and URL derivation for 80 files until tooling and overrides were repaired (`honeycomb:implementation.md:227`).
- **Risk:** Rendered docs work, but source-code reference checks fail or send readers to dead routes.
- **Recommended handling:** Inventory source annotations before renaming; update doc-ref tooling, overrides, route derivation, and source comments in the same migration.
- **Validation:** Run the repo's docs-reference check or grep source for old paths.

### Unquoted scoped package names break frontmatter

- **Seen in:** honeycomb
- **Evidence:** Honeycomb p02 review found six unquoted `@` titles; after quoting, all 125 pages parsed cleanly (`honeycomb:implementation.md:166-168`).
- **Risk:** Build or metadata extraction fails on package docs.
- **Recommended handling:** Quote all generated frontmatter strings, especially scoped package names and punctuation-heavy values.
- **Validation:** Build the docs app or run a frontmatter parse sweep.

### Titled callouts lose titles if generated inline

- **Seen in:** honeycomb
- **Evidence:** `oat docs migrate` emitted inline titles; `remark-github-blockquote-alert` discarded 69 of 73 custom titles until converted to bold lead-line shape (`honeycomb:implementation.md:172-177`).
- **Risk:** Important warning/context labels disappear in rendered docs.
- **Recommended handling:** Convert titled admonitions to marker-only first line plus bold lead title in the body.
- **Validation:** Grep for `^> \[![A-Z]+\] .+` and inspect rendered HTML.

### MkDocs figures and attr lists can drop images

- **Seen in:** duet
- **Evidence:** Duet documented 52 `<figure markdown>` blocks across eight files; the relay page rendered 0 images until conversion (`duet:reference/invalid-references-to-remove.md:95-96`).
- **Risk:** Architecture diagrams and screenshots silently disappear from exported docs.
- **Recommended handling:** Convert to plain Markdown images with alt text or a supported image component; remove attr-list width syntax unless replaced by valid JSX/HTML.
- **Validation:** Inspect exported HTML for expected `<img>` tags and bundled images.

### Formatter corruption of tutorial examples

- **Seen in:** both
- **Evidence:** Duet's runbook documents formatter corruption classes and the `embeddedLanguageFormatting: "off"` guardrail (`duet:reference/runbook.md:389-396`); Honeycomb p04 fixed two Important oxfmt corruptions in `contributing.md` (`honeycomb:implementation.md:183-192`).
- **Risk:** Examples become syntactically invalid while lint/build still pass.
- **Recommended handling:** Add `.oxfmtrc.json` before formatting; use `text` fences for paths/trees/output; avoid nested fences inside same-language outer fences when possible.
- **Validation:** Review formatter diffs; run `docs:format:check`; spot-check complex examples.

### Root commands start or build the docs app by default

- **Seen in:** honeycomb; confirmed across reference repos
- **Evidence:** Root `turbo test` depended on `build`, which scheduled `@honeycomb/docs#build`; app `turbo.json` override fixed it (`honeycomb:implementation.md:200-202`). Reference repos consistently make docs build/dev opt-in: Turborepo monorepos exclude docs from root build/dev and expose docs-specific commands where applicable.
- **Risk:** Routine repo build/dev/test/lint/type-check becomes slower, flaky, or blocked by the Fumadocs Next build.
- **Recommended handling:** In monorepos, root `build` and root `dev` should exclude the docs package. Add explicit `build:docs` and `dev:docs` commands. Avoid docs app `test`, `lint`, or `type-check` scripts unless they are intended to participate in root tasks; add app-level `turbo.json` task overrides if root task dependencies would otherwise schedule docs.
- **Validation:** Dry-run or run root `build`, `dev`, `test`, lint, and type-check and confirm docs is absent from default graphs. Then verify `build:docs` and `dev:docs` opt in.

### Generated index can be mistaken for authored content

- **Seen in:** both
- **Evidence:** OAT guidance says generated artifacts are rewritten and should not be hand-edited (`oat:apps/oat-docs/AGENTS.md:19-20`); Duet runbook repeats that root `index.md` is clobbered on every build (`duet:reference/runbook.md:385-386`).
- **Risk:** Manual edits disappear or navigation drift accumulates.
- **Recommended handling:** Put the authoring map in `docs/**/index.md` `## Contents`; ensure generated root index carries an autogen warning.
- **Validation:** Regenerate index and inspect the diff.

### Legacy architecture docs can be worse than missing docs

- **Seen in:** duet
- **Evidence:** Redis GraphQL cache docs described a removed subsystem and were rewritten/deleted after source verification (`duet:reference/corrections-log.md:199-221`).
- **Risk:** Readers follow removed commands, env vars, workflows, or operational procedures.
- **Recommended handling:** During accuracy verification, treat missing source backing as a blocker for that claim. Rewrite to the current system or delete the stale page.
- **Validation:** Confirm source files, workflows, CLI commands, env vars, and runtime behavior exist.

### CI deploy conversion can miss install or output-directory details

- **Seen in:** honeycomb
- **Evidence:** Honeycomb Phase 6 replaced Python/MkDocs with `pnpm install --frozen-lockfile`, `pnpm --filter @honeycomb/docs build`, and `out/` sync while preserving bucket/triggers/roles; install was required because setup action used `run_install: false` (`honeycomb:implementation.md:204-213`).
- **Risk:** CI builds locally but deploy workflow fails or syncs an empty/stale directory.
- **Recommended handling:** Convert both build command and output path. Preserve deploy credentials and triggers unless deliberately changing hosting.
- **Validation:** Inspect CI YAML and run equivalent build locally.

## Content migration guidance

- Preserve accurate existing content, but do not preserve obsolete structure for nostalgia.
- Convert directory overview pages into `index.md` maps and concise orientation pages.
- Add frontmatter to every page with a title and useful one-sentence description.
- Keep image assets in place if references can remain stable; document nonstandard asset directories.
- Preserve tabs and Mermaid where OAT transforms support them.
- Convert admonitions and images to supported Markdown/Fumadocs patterns.
- Replace MkDocs authoring instructions in `docs/contributing.md` with Fumadocs/OAT instructions.
- Keep code examples grounded in current repo files. If a snippet is illustrative, label it as such.
- For generated or code-derived content, add source-of-truth links instead of duplicating long details everywhere.
- When content is stale and source backing is gone, delete or rewrite it. Do not leave a page that appears authoritative but is no longer true.
- For large docs trees, split accuracy verification into clusters such as apps, packages, cross-cutting, docs-app self, operations, and APIs.

## Link and navigation migration guidance

- Build the navigation from local maps:
  - Every Markdown-bearing directory gets `index.md`.
  - Every `index.md` gets `## Contents`.
  - `## Contents` lists immediate sibling pages and child directories.
- Use `.md`-suffixed relative links:
  - Leaf page: `[Configuration](configuration.md)`.
  - Child directory: `[Packages](packages/index.md)`.
- Do not hand-edit:
  - generated root `index.md`,
  - generated route/nav files,
  - stale `mkdocs.yml` nav after Fumadocs owns navigation.
- After moving pages:
  - Update old and new parent `index.md`.
  - Update in-page links.
  - Update source-code doc references.
  - Regenerate root index.
- Avoid `overview.md`:
  - Rename to `index.md`.
  - Update all references.
  - Repair doc-ref tooling if it assumes `overview.md`.
- Validate nav:
  - No content directory missing `index.md`.
  - No `index.md` missing `## Contents`.
  - No important page omitted from its parent map.
  - No generated output edited without authored source changes.

## Validation checklist

- Structural checks
  - [ ] No `overview.md` remains unless intentionally kept outside the docs surface.
  - [ ] Every Markdown-bearing directory has `index.md`.
  - [ ] Every `index.md` has `## Contents`.
  - [ ] `## Contents` links use `.md` or `subdir/index.md`.
  - [ ] Generated root `index.md` exists and has an autogen warning.
- Syntax/render checks
  - [ ] No active MkDocs admonition syntax remains.
  - [ ] Titled callouts use bold lead lines.
  - [ ] Former figures render as images.
  - [ ] Tabs render.
  - [ ] Mermaid renders.
  - [ ] Snippets/macros are either inline, removed, or literal fenced examples.
- Tooling checks
  - [ ] `pnpm install` or repo-equivalent install succeeds.
  - [ ] `pnpm --filter <docs-package> build` succeeds.
  - [ ] `docs:lint` succeeds.
  - [ ] `docs:format:check` succeeds.
  - [ ] Root `build` and root `dev` do not build or start docs in monorepos.
  - [ ] Explicit root `build:docs` and `dev:docs` commands opt into docs where applicable.
  - [ ] Root `test`, `lint`, and `type-check` do not schedule docs build unless intended.
- Config checks
  - [ ] `.oat/config.json` parses as JSON.
  - [ ] `.oat/config.json` documentation block uses `tooling: fumadocs`.
  - [ ] CI deploy builds Fumadocs and syncs `out/`.
  - [ ] Docs indexing path still points at the authored docs tree.
  - [ ] `AGENTS.md` surfaces and `CLAUDE.md` shim are coherent.
- Accuracy checks
  - [ ] Package scripts documented in docs exist.
  - [ ] CLI commands and flags exist.
  - [ ] Import/export examples resolve.
  - [ ] Environment variables are consumed or explicitly historical.
  - [ ] Workflow names and paths exist.
  - [ ] Deployment/observability claims are current.
  - [ ] Removed subsystems are not described as current.
- Render checks
  - [ ] Exported `out/` exists.
  - [ ] Spot-check representative pages in each major section.
  - [ ] Grep exported HTML for literal `!!!`, `<figure markdown`, `--8<--`, or unintended macro syntax.
  - [ ] Confirm image-heavy pages contain expected `<img>` output.

## Handoff summary template

Use this at the end of a migration:

```md
## Migration handoff

### Files changed

- `<docs-app>/...`
- `.oat/config.json`
- `.github/workflows/deploy-docs.yml`
- `AGENTS.md`

### Sources inspected

- `mkdocs.yml`
- `<docs-app>/package.json`
- `.oat/config.json`
- `.github/workflows/deploy-docs.yml`
- `<docs-app>/docs/**`
- `<source files used for accuracy checks>`

### Structural migration

- Markdown files migrated: `<count>`
- Directories with `index.md`: `<count>/<count>`
- `overview.md` remaining: `<count>`
- Generated root index: `<path>`

### Syntax migration

- Admonitions converted: `<count>`
- Figures/images converted: `<count>`
- Tabs preserved: `<count>`
- Mermaid preserved: `<count>`
- Snippets/macros resolved: `<count>`

### Validation

- Install: `<command>` — `<result>`
- Build: `<command>` — `<result>`
- Lint: `<command>` — `<result>`
- Format check: `<command>` — `<result>`
- Render checks: `<summary>`
- Source accuracy checks: `<summary>`

### Uncertainties and owner-review items

- `<item needing human confirmation>`

### Follow-up tasks

- `<task>`
```

## Open questions

- For the remaining MkDocs migration, which MkDocs plugins, macros, or repository-specific link/reference systems are actually active and need bespoke conversion?
- Should generated frontmatter always be emitted as quoted strings or through a YAML serializer to prevent quoting bugs?
- Which root package script patterns are safe for automatic docs build/dev isolation patches, and which should be surfaced as manual diffs?
- If the target repo has source-to-doc reference tooling, what project-specific repair command should be run after `overview.md`→`index.md` renames?
- What is the expected long-term migration path for repos that still need MkDocs-only plugins with no OAT/Fumadocs equivalent?
- Should this migration handoff require render checks against `out/` before a migration can be marked complete?
