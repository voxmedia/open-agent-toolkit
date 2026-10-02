---
title: Docs Index Contract
description: 'Authored Contents, owned Fumadocs sidebar metadata, separate agent inventories, and MkDocs navigation.'
---

# Docs Index Contract

OAT docs navigation starts from authored `docs/**/index.md` files. Each `## Contents` section is the local source of truth for sibling pages and child directories. Generated artifacts are derived from docs source and should not be edited directly. The framework determines which generated artifact is produced, but the authored `## Contents` contract is the same for humans and agents.

## Rules

- Every documentation directory must contain an `index.md`.
- Every `index.md` must include a `## Contents` section.
- The `## Contents` section is the machine-readable local map for sibling pages and child directories.
- Every `## Contents` link should use a `.md`-suffixed relative target, including child directory links such as `subdir/index.md`.
- Do not hand-edit generated navigation or generated root-index artifacts.
- For Fumadocs, run `oat docs nav sync --framework fumadocs` after structural changes. Contents determines sidebar membership/order; frontmatter titles determine leaf and section labels. A page or child section needs exactly one physical-parent ownership entry, with a matching label.
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

For this Fumadocs app, ignored `docs/**/meta.json` files project authored Contents into the installed Fumadocs loader. The app-root `.oat-fumadocs-nav.json` sidecar records generated paths and last-written content hashes. It is not Fumadocs metadata. The generated root manifest, `apps/oat-docs/index.md`, remains a separate agent inventory, not the rendered sidebar source.

`oat docs generate-index` walks the Markdown file tree under `docs/` and writes the app-root generated manifest. The app scripts run:

```bash
pnpm -w run cli:source -- docs nav sync --framework fumadocs --target-dir apps/oat-docs
fumadocs-mdx
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

Consumer scaffolds run the installed `oat docs nav sync --framework fumadocs --target-dir .` from the app directory, then `fumadocs-mdx`, then `oat docs generate-index`. This repository uses its branch workspace `cli:source` entry instead; do not copy it into consumer apps.

`pnpm docs:validate` checks navigation and source routes/anchors without requiring or writing metadata, sidecar, `.source` or `out`. Direct `pnpm docs:test` generates temporary fixtures for the installed MDX/loader consumers. Catalog validation is not enrolled until the catalog exists.

The public CLI's `--validate-only` is Fumadocs-only source validation. `--check` additionally compares existing output and detects missing, different and stale files without writing; the modes are mutually exclusive.

Fumadocs generated behavior:

- Sidebar entries preserve Contents order; root and child landings appear once through native ownership.
- Cross-section and fragment links are validated but remain body links: sidebar duplicates would change the installed loader's breadcrumbs and previous/next traversal.
- Ordinary Markdown routes and a `/` loader base are supported. External or query-bearing navigation links, MDX/custom slugs and separator syntax are unsupported. Fenced examples are ignored. Deployment basePath is not baked into metadata.

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
- The compiler rejects orphan or duplicate ownership, unresolved targets/fragments and leaf/section label mismatches before writing.
- Existing metadata is replaced or deleted only with sidecar ownership and matching last-written hashes. Unowned, externally edited, traversal or symlink paths fail closed. Preserve authored bytes; never edit hashes to adopt files. Back up proven disposable output with its sidecar before removing only those files and regenerating.
- Metadata files are written atomically, with the sidecar last; a partial I/O failure still requires inspection. This is not a multi-file transaction.
- Ignore metadata and sidecar in Git and source bundles. Format `docs/**/*.md`, not the entire directory: reformatting generated JSON changes ownership hashes.

## Authoring guidance

- Use `index.md` as the local discovery surface for humans and agents.
- Add a short topic description next to each link so agents can choose the right file without opening every page.
- Update `## Contents` whenever you add, remove, rename, or reorder docs files in a directory.
- Regenerate framework navigation after structural changes: `nav sync --framework fumadocs` for owned metadata, or `nav sync --framework mkdocs` for `mkdocs.yml`; refresh the separate Fumadocs agent inventory with `generate-index`.
- Refresh or freshness-check the generated artifact before committing structural docs changes.

## If You Are Trying To...

- learn the docs workflow or docs commands as a user, start with [Docs Tooling](../docs-tooling/index.md)
- contribute or restructure docs in this repo, pair this contract with [Contributing to OAT Docs](../contributing/documentation.md)
