---
title: Docs Toolchain
description: 'Set up the local docs toolchain, preview changes and build the site.'
---

# Docs Toolchain

This page is for documentation contributors. Follow the [contributor map](index.md) and [authoring contract](../contributing.md); readers start with [Getting Started](../getting-started.md).

## Prerequisites

- Node.js {{NODE_REQUIREMENT}}
- pnpm 10+
- Python 3.11+ for the retained MkDocs tooling

This MkDocs/Material scaffold is **legacy**. [Material's upstream changelog](https://squidfunk.github.io/mkdocs-material/changelog/) states that it is in maintenance mode, with critical bug fixes and security updates through **May 5, 2027**, then upstream maintenance ends. The team identifies [Zensical](https://zensical.org/) as its maintained successor. This date applies to Material, not MkDocs core. Existing Python pins remain unchanged; the maintenance statement does not promise backports to these exact old pins. Plan an explicit tooling review before adopting this path for a new site.

## Install and preview

From the **repository root**, enter the docs app; subsequent commands run in the **app directory**:

```bash
cd {{APP_CWD}}
pnpm install
pnpm docs:setup
pnpm docs:dev
```

`setup-docs.sh` installs dependencies with the selected Python; it does not create a virtual environment. The static build output is `site/`. Activate a chosen environment before running setup.

## Validate before committing

From the **repository root**, enter the app and validate in this order:

```bash
cd {{APP_CWD}}
pnpm docs:format
pnpm docs:format:check
pnpm docs:lint
{{NAV_SYNC_CMD}}
{{NAV_SYNC_CHECK_CMD}}
pnpm docs:check
pnpm docs:build
```

Lint is {{LINT_STATUS}}; formatting is {{FORMAT_STATUS}}. Disabled scripts print a message and are not validation. Nav sync writes only approved, owned navigation; the read-only check fails on navigation drift. Inspect the rendered site for navigation, links, tabs and diagrams. The MkDocs test script also runs the portable docs checker.
