---
title: Docs Index Contract
description: 'Docs source contract: authored index.md maps, generated Fumadocs manifests, and MkDocs nav sync.'
---

# Docs Index Contract

OAT docs navigation starts from authored `docs/**/index.md` files. Each `## Contents` section is the local source of truth for sibling pages and child directories. Generated artifacts are derived from docs source and should not be edited directly. The framework determines which generated artifact is produced, but the authored `## Contents` contract is the same for humans and agents.

## Rules

- Every documentation directory must contain an `index.md`.
- Every `index.md` must include a `## Contents` section.
- The `## Contents` section is the machine-readable local map for sibling pages and child directories.
- Every `## Contents` link should use a `.md`-suffixed relative target, including child directory links such as `subdir/index.md`.
- Do not hand-edit generated navigation or generated root-index artifacts.
- For Fumadocs, refresh or freshness-check the generated app-root manifest after adding, removing, or renaming Markdown files. Compare that manifest against authored `## Contents` maps for drift; reordering `## Contents` does not reorder the generated manifest's file-tree sort.
- For MkDocs, run `oat docs nav sync` after adding, removing, renaming, or reordering pages. It regenerates `mkdocs.yml` from authored `## Contents` maps and preserves the order declared in each local map.

## `## Contents` format

Use Markdown bullet links for sibling pages and child directories:

```md
## Contents

- [Getting Started](getting-started.md) - Setup and local workflow.
- [Reference](reference/index.md) - Reference pages for the subsystem.
```

Notes:

- Links after `## Contents` can include short human-readable descriptions.
- Child directories should link to their `index.md`.
- Leaf pages should link to their `.md` filename.
- Prose outside `## Contents` is ignored by nav generation and remains freeform; it can explain scope, reader paths, or migration status.

## Fumadocs Generation

For this Fumadocs app, rendered page routing and sidebar data come from the Fumadocs file/source pipeline over `apps/oat-docs/docs`. The generated root manifest, `apps/oat-docs/index.md`, is an inventory for agents and tooling; it is not the rendered sidebar/page-tree source.

`oat docs generate-index` walks the Markdown file tree under `docs/` and writes the app-root generated manifest. The app scripts run:

```bash
fumadocs-mdx
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

`oat docs generate-index` rewrites the generated root manifest from the docs source tree. It is the command to use after adding, removing, or retiring pages in this Fumadocs app. Do not use `oat docs nav sync` as the Fumadocs regeneration step.

Fumadocs generated behavior:

- Generated entries are ordered by the file-tree generator: `index.md` first, directories before files, then lexical order.
- Reordering a `## Contents` block does not reorder the generated manifest's file-tree sort.
- Generated manifests should carry an autogen warning and are rewritten by `predev` / `prebuild`.

## MkDocs Nav Sync

MkDocs apps use `oat docs nav sync --target-dir <docs-app-dir>` to walk the docs tree from `docs/index.md` downward and regenerate the `nav:` block in `mkdocs.yml` from discovered directory `index.md` files.

MkDocs generated behavior:

- Root `docs/index.md` becomes `Home`.
- Child directory `index.md` files become section landing pages.
- Nested entries are emitted in the order they appear under each local `## Contents` block.
- `mkdocs.yml` may contain other configuration, but its `nav:` block is derived from authored `## Contents`.

## Generated-file boundaries

- Edit authored files under `docs/`, especially the nearest `index.md` and `## Contents`.
- Do not hand-edit a Fumadocs app-root generated `index.md`; regenerate it from the docs source tree.
- Do not hand-maintain MkDocs `nav:` entries when the local workflow uses `oat docs nav sync`.
- If a Fumadocs generated manifest lists pages that are missing from authored `## Contents`, treat that as authored-source drift or intentional generator-inventory behavior to verify before relying on the generated file as navigation evidence.

## Authoring guidance

- Use `index.md` as the local discovery surface for humans and agents.
- Add a short topic description next to each link so agents can choose the right file without opening every page.
- Update `## Contents` whenever you add, remove, rename, or reorder docs files in a directory.
- Regenerate the framework-specific artifact after structural changes: `generate-index` for Fumadocs root manifests, `nav sync` for MkDocs `mkdocs.yml`.
- Refresh or freshness-check the generated artifact before committing structural docs changes.

## If You Are Trying To...

- learn the docs workflow or docs commands as a user, start with [Docs Tooling](../docs-tooling/index.md)
- contribute or restructure docs in this repo, pair this contract with [Contributing to OAT Docs](../contributing/documentation.md)
