---
title: Getting Started
description: ""
---

# Getting Started

Use this guide to set up your local environment and preview {{SITE_NAME}}.

## Prerequisites

- Node.js 22+
- pnpm 10+ (or npm/yarn)

## Install dependencies

```bash
pnpm install
```

## Run the docs locally

```bash
pnpm dev
```

## Build for production

```bash
pnpm build
```

The static output is generated in the `out/` directory.

## Editing workflow

1. Update Markdown files under `docs/`.
2. Check the preview site for formatting and navigation.
3. Run the formatter and linter before committing.
4. Keep every directory discoverable through its `index.md` file.
