---
title: Docs Index Contract
description: 'Docs source contract: authored index.md maps, generated Fumadocs manifests, and MkDocs nav sync.'
---

# Docs Index Contract

OAT docs navigation starts from authored `docs/**/index.md` files. Each `## Contents` section is the local source of truth for sibling pages and child directories. Generated artifacts are derived from docs source and should not be edited directly.

## Rules

- Every documentation directory must contain an `index.md`.
- Every `index.md` must include a `## Contents` section.
- Every `## Contents` link should use a `.md`-suffixed relative target, including child directory links such as `subdir/index.md`.
- Generated navigation artifacts must be refreshed from authored `## Contents` after adding, removing, renaming, or reordering pages.

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
- Prose outside `## Contents` is ignored by nav generation and remains freeform.

## Navigation generation

Fumadocs and MkDocs use the same authored source, but they do not use the same generated artifact.

For Fumadocs docs apps, `oat docs generate-index` walks the Markdown file tree under `docs/` and writes the app-root generated manifest, for example `apps/oat-docs/index.md`.

```bash
pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

For MkDocs docs apps, `oat docs nav sync --target-dir <docs-app-dir>` walks the docs tree from `docs/index.md` downward and updates the `nav:` entries in `mkdocs.yml`.

Generated behavior:

- Root `docs/index.md` becomes `Home`.
- Child directory `index.md` files become section landing pages.
- Fumadocs generated entries are ordered by the file-tree generator: `index.md` first, directories before files, then lexical order.
- MkDocs nested entries are emitted in the order they appear under each local `## Contents` block.
- Fumadocs generated manifests should carry an autogen warning and are rewritten by `predev` / `prebuild`.
- MkDocs `mkdocs.yml` may contain other configuration, but its `nav:` block is derived from authored `## Contents`.

## Generated-file boundaries

- Edit authored files under `docs/`, especially the nearest `index.md` and `## Contents`.
- Do not hand-edit a Fumadocs app-root generated `index.md`; regenerate it from the docs source tree.
- Do not hand-maintain MkDocs `nav:` entries when the local workflow uses `oat docs nav sync`.
- If a Fumadocs generated manifest lists pages that are missing from authored `## Contents`, treat that as authored-source drift or intentional generator-inventory behavior to verify before relying on the generated file as navigation evidence.

## Authoring guidance

- Use `index.md` as the local discovery surface for humans and agents.
- Add a short topic description next to each link so agents can choose the right file without opening every page.
- Update `## Contents` whenever you add, remove, rename, or reorder docs files in a directory.
- Refresh or freshness-check the generated artifact before committing structural docs changes.

## If You Are Trying To...

- learn the docs workflow or docs commands as a user, start with [Docs Tooling](../docs-tooling/index.md)
- contribute or restructure docs in this repo, pair this contract with [Contributing to OAT Docs](../contributing/documentation.md)
