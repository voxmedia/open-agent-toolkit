---
title: Docs Index Contract
description: 'Docs source contract: authored Markdown context/maps, optional external inventories, Fumadocs manifests and meta.json navigation, and MkDocs nav sync.'
---

# Docs Index Contract

OAT docs navigation starts from authored `docs/**/index.md` files. Each `## Contents` section is the local source of truth for sibling pages and child directories. Generated artifacts are derived from docs source and should not be edited directly. The framework determines which generated artifact is produced, but the authored `## Contents` contract is the same for humans and agents.

## Rules

- Every non-excluded Markdown-bearing content directory must contain an authored `index.md`; asset-only directories are exempt.
- Preserve useful audience/scope context, ownership guidance, and existing local instructions. Authored pages need nonempty title/description metadata.
- Every `index.md` must include a `## Contents` section.
- The `## Contents` section is the machine-readable local map for sibling pages and child directories.
- Every `## Contents` link should use a `.md`-suffixed relative target, including child directory links such as `subdir/index.md`.
- Do not hand-edit generated navigation or generated root-index artifacts.
- For Fumadocs, refresh or freshness-check the generated app-root manifest after adding, removing, or renaming Markdown files. Compare that manifest against authored `## Contents` maps for drift; the manifest follows each local Contents order, with deterministic unlisted fallback entries.
- Run `oat docs nav sync` after adding, removing, renaming, or reordering pages. It regenerates the framework's navigation from authored `## Contents` maps and preserves the order declared in each local map: the `nav:` block in `mkdocs.yml` for MkDocs, and one `meta.json` per docs directory for Fumadocs.

## `## Contents` format

Use dash-prefixed Markdown links for sibling pages and child directories. Optional third-level headings start ordered groups:

```md
## Contents

- [Getting Started](getting-started.md) - Setup and local workflow.

### Reference

- [Reference](reference/index.md) - Reference pages for the subsystem.
```

Notes:

- Links after `## Contents` can include short human-readable descriptions.
- Groups start at `### <Label>` and end at the next group or the next second-level heading. Links before the first group remain ungrouped. Fumadocs emits `---Label---` before the first retained entry; MkDocs emits a labeled nested list. Filtering a self-index or non-reader link never leaves an empty separator.
- A group with no authored entries is an error with its file and line; add a dash link or remove the empty heading. A `*` or `+` link bullet is also an error with file and line; replace it with `-`.
- Child directories should link to their `index.md`.
- Leaf pages should link to their `.md` filename.
- An index-only leaf, a directory whose `index.md` is its only reader page and that has no child sections, may list same-page heading anchors such as `[Setup](#setup)` as an in-page table of contents. Each must be a valid Markdown link; a destination Markdown renders as plain text, such as `(#set up)`, is an error. Nav sync adds no navigation entry for them, `oat docs check` reports an anchor whose heading does not exist, and the `leaf-size` rule warns that the section could be flattened. In any other directory a same-page anchor in Contents is an error: link a page or section instead.
- Prose outside `## Contents` is ignored by nav generation and remains freeform; it can explain scope, reader paths, or migration status.

## Plain Markdown Ownership

Configured Markdown uses `documentation.root` literally, even with a child named
`docs`. The configured `<root>/index.md` is authored context plus a Contents map;
edit it directly. Bootstrap/adoption creates missing baseline files and root
guidance, but content gaps remain analyze/apply work. No app package, site build,
nav sync, default manifest, or docs-root AGENTS creation is required.

Optional inventories need explicit output outside the full configured content
tree, for example `oat docs generate-index --docs-dir docs --output .oat/docs-manifest.md`.
Default generation is refused, as is output to the authored index or any part of
the full root, even with narrowed source flags or symlink aliases. Generation
never repoints the configured authored index.

## Fumadocs Generation

For this Fumadocs app, rendered page routing comes from the Fumadocs file/source pipeline over `apps/oat-docs/docs`, and the sidebar order comes from the committed `meta.json` files that `oat docs nav sync` writes (see [Fumadocs Nav Sync](#fumadocs-nav-sync)). The generated root manifest, `apps/oat-docs/index.md`, is an inventory for agents and tooling; it is not the rendered sidebar/page-tree source.

`oat docs generate-index` walks the Markdown file tree under `docs/` and writes the app-root generated manifest. The app scripts run:

```bash
fumadocs-mdx
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

`oat docs generate-index` rewrites the generated root manifest from the docs source tree. Run it after adding, removing, or retiring pages in this Fumadocs app, and run `oat docs nav sync` as well so the sidebar's `meta.json` files follow the same change. The two commands produce different artifacts: `generate-index` writes the agent-facing inventory and `nav sync` writes the sidebar navigation.

Fumadocs generated behavior:

- The inventory stays hierarchical. Each local Contents orders its surviving direct entries; a cross-directory link orders its containing direct entry without duplicating the page. Child directory titles come from their index frontmatter title, then H1, then slug, independently of nav labels.
- Remaining entries use deterministic index/directories/files/lexical fallback and carry `[unlisted in Contents]` when a Contents map exists. With no Contents map the inventory keeps its fallback order; malformed present Contents reports the shared grammar errors.
- Generated manifests should carry an autogen warning and are rewritten by `predev` / `prebuild`.
- Manifest links are relative to the manifest file, so the app-root `index.md` links docs pages as `docs/<path>.md`.

## Fumadocs Nav Sync

In a Fumadocs app (detected by its `source.config.ts`), `oat docs nav sync --target-dir <docs-app-dir>` writes one `meta.json` beside every docs directory `index.md`. The files are generated and committed; edit the `## Contents` map, not the `meta.json`.

Fumadocs generated behavior:

- `pages` follows the order of the directory's `## Contents` links. The root list starts with `index`; a child directory appears by its folder name, and its own `index.md` becomes that folder's landing page. A folder whose `meta.json` keeps `root: true` or a nonempty trimmed string also lists `index` first, because Fumadocs gives a root folder no implicit landing page. OAT source config narrowly adapts the pinned metadata schema to accept these named roots.
- Navigation is strict: there is no `"..."` rest entry. A page or folder that no `## Contents` map lists stays out of the sidebar, and the command reports it by path in its human output and in `--json` (`unlisted`). Add the page to its directory's `## Contents` map to show it.
- A `## Contents` link to a page in another directory is written as a Fumadocs link entry such as `[Writing Skills](/contributing/skills)`, so each page belongs to exactly one folder.
- A page or folder whose name Fumadocs would read as a `pages` directive, such as `!hidden`, `z...a`, `...name`, or `---`, is written in the local-path form `./!hidden` so it stays a page entry.
- The folder `title` comes from the `index.md` frontmatter `title`, falling back to its first `#` heading.
- Keys nav sync does not own, such as `icon` or `defaultOpen`, are kept.
- Existing files are compared by meaning, not bytes, so a second run with no docs changes writes nothing, even after a formatter rewrites the files.
- `.md` and `.mdx` pages can both be listed; each appears in `pages` by its file name without the extension.

`oat docs nav sync --check` computes the same result and writes nothing. It exits 1 when a `meta.json` file is missing or would change, or a page or folder is unlisted, and names each one, listing missing files separately. In this app, `prebuild` runs it, so `pnpm build:docs` fails until the `## Contents` maps and the committed `meta.json` files agree.

## MkDocs Nav Sync

MkDocs apps use `oat docs nav sync --target-dir <docs-app-dir>` to walk the docs tree from `docs/index.md` downward and regenerate the `nav:` block in `mkdocs.yml` from discovered directory `index.md` files.

MkDocs generated behavior:

- Root `docs/index.md` becomes `Home`.
- Child directory `index.md` files become section landing pages.
- Nested entries are emitted in the order they appear under each local `## Contents` block, including labeled groups.
- `mkdocs.yml` may contain other configuration, but its `nav:` block is derived from authored `## Contents`.

## Non-reader paths and ownership

Shared `documentation.nonReaderPaths` declares drafts/templates outside the reader tree using the [bounded exclusion grammar](../docs-tooling/commands.md#exclusion-patterns), relative to the content root. It applies only to the configured app/content root. Navigation inventory, explicit Contents links, read-only nav checks and manifests skip matches; an explicit link does not override an exclusion. Excluded subtrees are not read, rewritten or cleaned by nav sync. A missing reader entry remains an error in Fumadocs `--check`. Existing `documentation.excludes` affects manifests only.

Fumadocs collections also omit matching pages and metadata when `defineDocs` uses OAT's `docs` and `meta` source options with an explicit repository config path. The pinned MkDocs 1.4.2 has no configurable rendering exclusion: these pages leave navigation and manifests but still render as routes. This setting is not a way to keep private content out of a MkDocs site.

Fresh Fumadocs/MkDocs init explicitly writes `documentation.navOwner: nav-sync` and generates navigation after scaffold/config succeeds. Their generated `prebuild` / `docs:build` scripts run `nav sync --check`. Existing hand-authored or undeclared surfaces are preserved through bootstrap and use analyze/apply to choose ownership; absence never implies permission to regenerate. With `hand-authored`, the writing `oat docs nav sync` refuses and `--check` compares membership and order only; an undeclared owner gets a warning to declare one. Markdown has no sidebar or nav sync.

## Generated-file boundaries

- Edit authored files under the resolved content root (`docs/` inside framework apps, or the literal configured Markdown root), especially the nearest `index.md` and `## Contents`.
- Do not hand-edit a Fumadocs app-root generated `index.md`; regenerate it from the docs source tree.
- Do not hand-maintain MkDocs `nav:` entries or Fumadocs `meta.json` `pages` lists when the local workflow uses `oat docs nav sync`.
- If a Fumadocs generated manifest lists pages that are missing from authored `## Contents`, treat that as authored-source drift or intentional generator-inventory behavior to verify before relying on the generated file as navigation evidence.

## Authoring guidance

- Use `index.md` as the local discovery surface for humans and agents.
- Add a short topic description next to each link so agents can choose the right file without opening every page.
- Update `## Contents` whenever you add, remove, rename, or reorder docs files in a directory.
- Markdown checks authored files/links, regenerating optional external manifests only when declared. Frameworks regenerate their artifacts after structural changes: `nav sync` for MkDocs `mkdocs.yml` and Fumadocs `meta.json` navigation, plus `generate-index` for Fumadocs root manifests.
- Refresh or freshness-check the generated artifact before committing structural docs changes.

## If You Are Trying To...

- learn the docs workflow or docs commands as a user, start with [Docs Tooling](../docs-tooling/index.md)
- contribute or restructure docs in this repo, pair this contract with [Contributing to OAT Docs](../contributing/documentation.md)
