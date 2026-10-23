---
title: Docs Toolchain
description: 'Set up the local docs toolchain, preview changes and build the site.'
---

# Docs Toolchain

This page is for documentation contributors. Follow the [contributor map](index.md) and [authoring contract](../contributing.md); readers start with [Getting Started](../getting-started.md).

## Prerequisites

- Node.js {{NODE_REQUIREMENT}}
- pnpm 10+

## Install and preview

From the **repository root**, enter the docs app; subsequent commands run in the **app directory**:

```bash
cd {{APP_CWD}}
pnpm install
pnpm dev
```

Fumadocs generates a static export under `out/`. `pnpm start` expects a Next server and is not the static-export preview command; serve `out/` with a static HTTP server and mount the configured base path.

## Validate before committing

From the **app directory**, in this order:

```bash
pnpm docs:format
pnpm docs:format:check
pnpm docs:lint
{{NAV_SYNC_CMD}}
{{NAV_SYNC_CHECK_CMD}}
pnpm build
```

Lint is {{LINT_STATUS}}; formatting is {{FORMAT_STATUS}}. Disabled scripts print a message and are not validation. Nav sync writes only approved, owned navigation; the read-only check fails on drift or unlisted reader pages. Inspect the rendered site for navigation, links, tabs and diagrams.

From the **app directory**, regenerate the machine inventory when needed:

```bash
{{GENERATE_INDEX_CMD}}
```

The app's predev/prebuild hooks regenerate it automatically. This does not replace authored Contents or navigation checks.
