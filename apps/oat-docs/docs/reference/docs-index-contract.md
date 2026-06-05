---
title: Docs Index Contract
description: 'Index.md contract for OAT docs apps, including Fumadocs generated-index behavior and MkDocs nav sync behavior.'
---

# Docs Index Contract

OAT docs apps use each directory `index.md` as the authored local map. The `## Contents` contract supports humans and agents, while framework-specific generated artifacts may use either the docs file tree or authored contents depending on the docs framework.

## Rules

- Every documentation directory must contain an `index.md`.
- Every `index.md` must include a `## Contents` section.
- The `## Contents` section is the machine-readable local map for sibling pages and child directories.
- Do not hand-edit generated navigation or generated root-index artifacts.

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
- Prose outside `## Contents` remains freeform and can explain scope, reader paths, or migration status.

## Fumadocs Generation

For this Fumadocs app, rendered page routing and sidebar data come from the Fumadocs file/source pipeline over `apps/oat-docs/docs`. The generated root manifest, `apps/oat-docs/index.md`, is an inventory for agents and tooling; it is not the rendered sidebar/page-tree source.

The app scripts run:

```bash
fumadocs-mdx
pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

`oat docs generate-index` rewrites the generated root manifest from the docs source tree. It is the command to use after adding, removing, or retiring pages in this Fumadocs app. Do not use `oat docs nav sync` as the Fumadocs regeneration step.

## MkDocs Nav Sync

MkDocs apps use `oat docs nav sync --target-dir <docs-app-dir>` to walk the docs tree from `docs/index.md` downward and regenerate the `nav:` block in `mkdocs.yml` from discovered directory `index.md` files.

MkDocs generated behavior:

- Root `docs/index.md` becomes `Home`.
- Child directory `index.md` files become section landing pages.
- Nested entries are emitted in the order they appear under each local `## Contents` block.

## Authoring guidance

- Use `index.md` as the local discovery surface for humans and agents.
- Add a short topic description next to each link so agents can choose the right file without opening every page.
- Update `## Contents` whenever you add, remove, or rename docs files in a directory.
- Regenerate the framework-specific artifact after structural changes: `generate-index` for Fumadocs root manifests, `nav sync` for MkDocs `mkdocs.yml`.

## If You Are Trying To...

- learn the docs workflow or docs commands as a user, start with [Docs Tooling](../docs-tooling/index.md)
- contribute or restructure docs in this repo, pair this contract with [Contributing to OAT Docs](../contributing/documentation.md)
