---
title: Contributing to OAT Docs
description: 'Docs authoring contract for OAT: navigation, local workflow, and contributor guidance.'
---

# Contributing to OAT Docs

Documentation should ship with the code it explains. This page covers the core docs contract and local workflow; the syntax reference now lives in [Markdown Features](markdown-features.md).

## Navigation contract

- Every documentation directory must contain an `index.md`.
- Each `index.md` must include a `## Contents` section.
- The `## Contents` section is the machine-readable local map for sibling pages and child directories.

## Local workflow

1. Start the dev server from the repo root:

   ```bash
   pnpm dev:docs
   ```

2. Build the docs site locally (verifies the static export succeeds):

   ```bash
   pnpm build:docs
   ```

3. Check rendered links against a local or deployed docs host:

   ```bash
   pnpm docs:check-links
   # or target a local docs server explicitly
   pnpm docs:check-links --url http://127.0.0.1:3000/open-agent-toolkit/
   ```

4. Run Markdown linting:

   ```bash
   pnpm --filter oat-docs docs:lint
   ```

5. Run Markdown formatting:

   ```bash
   pnpm --filter oat-docs docs:format
   ```

## Authoring Expectations

- Keep docs aligned with the current repo behavior and current command surface.
- Prefer cross-links over duplicated conceptual content.
- When you add, remove, or rename docs pages, refresh the generated docs surface:

  ```bash
  pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
  ```

- Use [Markdown Features](markdown-features.md) for supported syntax and examples.

## Agent guidance

- Treat `index.md` plus its `## Contents` section as the local discovery source of truth.
- Prefer linking to source files and commands explicitly when documenting behavior.
- Regenerate the docs surface index after adding or removing pages.

## Related Guides

- [Markdown Features](markdown-features.md)
- [Docs Tooling](../docs-tooling/index.md)

## If You Are Trying To...

- use docs commands or bootstrap a docs app, start with [Docs Tooling](../docs-tooling/index.md)
- follow the authoring contract for `index.md` and navigation, stay on this page and then read [Docs Index Contract](../reference/docs-index-contract.md)
- understand supported markdown patterns, use [Markdown Features](markdown-features.md)
