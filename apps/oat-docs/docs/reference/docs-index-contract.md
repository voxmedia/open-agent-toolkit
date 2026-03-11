---
title: Docs Index Contract
description: 'Navigation generation contract: index.md format and authoring guidance.'
---

# Docs Index Contract

OAT docs navigation is generated from each directory `index.md`, not from hand-maintained `mkdocs.yml` trees.

## Rules

- Every documentation directory must contain an `index.md`.
- Every `index.md` must include a `## Contents` section.
- The `## Contents` section is the only machine-readable source used by `oat docs nav sync`.
- `overview.md` is deprecated. Replace it with `index.md`, or convert it to a descriptive leaf page when the directory already has its own `index.md`.

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
- Prose outside `## Contents` is ignored by nav generation and remains freeform.

## Navigation generation

`oat docs nav sync --target-dir <docs-app-dir>` walks the docs tree from `docs/index.md` downward and regenerates `mkdocs.yml` `nav` entries from the discovered `index.md` files.

Generated behavior:

- Root `docs/index.md` becomes `Home`.
- Child directory `index.md` files become section landing pages.
- Nested entries are emitted in the order they appear under each local `## Contents` block.

## Authoring guidance

- Use `index.md` as the local discovery surface for humans and agents.
- Add a short topic description next to each link so agents can choose the right file without opening every page.
- Update `## Contents` whenever you add, remove, or rename docs files in a directory.
