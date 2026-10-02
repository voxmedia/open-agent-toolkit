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
- Use `.md`-suffixed relative links in `## Contents`: `[Page](page.md)` for leaf pages and `[Section](subdir/index.md)` for child directories.
- Fumadocs and MkDocs share this authored contract, but they regenerate different artifacts.
- Contents controls sidebar membership/order; frontmatter titles control leaf and section labels. Each page and child section needs exactly one physical-parent ownership entry. Cross-links remain in page bodies, preserving canonical breadcrumbs and previous/next.

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
- Use `oat-docs-authoring` for targeted OAT/Fumadocs docs edits; it delegates
  universal page-quality guidance to `authoring-docs` and keeps local
  navigation, generated-index, and validation expectations in scope.
- After navigation edits, validate authored sources and exercise the real loader before building. These commands do not require app-level generated output:

  ```bash
  pnpm docs:validate
  pnpm docs:test
  ```

- `predev` / `prebuild` run branch `cli:source` nav sync with `--framework fumadocs`, then `fumadocs-mdx`, then the separate app-root agent-index generator. Consumer scaffolds use the installed `oat` binary. MkDocs remains the default framework and refreshes `mkdocs.yml`.
- Do not hand-edit ignored metadata or its app-root ownership sidecar. Generation may acknowledge existing bytes exactly equal to current computed output for the same path without rewriting them to heal partial generation/lost sidecars; semantic JSON equality is insufficient. Different unowned/edited bytes, malformed sidecars and symlinked paths still fail closed. Preserve bytes and back up proven disposable files with their sidecar before removing only those files and regenerating. Never edit hashes to bypass refusal.
- After Contents changes during a running dev server, rerun generation and restart the server; predev/prebuild hooks are not a Contents watcher.
- Format `docs/**/*.md`, never the whole docs directory: reformatting generated JSON correctly breaks last-written ownership hashes. `--validate-only` is source-only; output-comparing `--check` is read-only but requires generation first.
- Use [Markdown Features](markdown-features.md) for supported syntax and examples.

## Agent guidance

- Treat `index.md` plus its `## Contents` section as the local discovery source of truth.
- Prefer linking to source files and commands explicitly when documenting behavior.
- Regenerate or freshness-check the docs surface index after adding, removing, renaming, or reordering pages.

## Related Guides

- [Markdown Features](markdown-features.md)
- [Docs Tooling](../docs-tooling/index.md)

## If You Are Trying To...

- use docs commands or bootstrap a docs app, start with [Docs Tooling](../docs-tooling/index.md)
- follow the authoring contract for `index.md` and navigation, stay on this page and then read [Docs Index Contract](../reference/docs-index-contract.md)
- understand supported markdown patterns, use [Markdown Features](markdown-features.md)
