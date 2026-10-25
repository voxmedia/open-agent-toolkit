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
- A directory whose `index.md` is its only page may instead list same-page heading anchors (`[Setup](#setup)`) as an in-page table of contents; anywhere else, Contents links must target pages or sections.
- Fumadocs and MkDocs share this authored contract, but they regenerate different artifacts.

Within Contents, use dash-only link bullets with optional descriptions. A `### Label` introduces a group containing at least one authored entry; entries before the first group stay ungrouped. `*`/`+` link bullets and empty groups produce file/line errors. The map ends at the next level-two heading, and fenced examples are ignored. A self-index link retains landing-page behavior. Missing Contents retains deterministic manifest fallback, while strict nav still requires maps and reports unlisted reader pages.

```markdown
## Contents

- [Reader guide](guide.md) - Reach a useful result.

### More detail

- [Reference](reference/index.md) - Local reference map.
```

| Surface                                            | Authored or generated                                       |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `docs/**/*.md`, including directory indexes        | Authored reader content and local maps                      |
| App `AGENTS.md`, config, source loader and scripts | Authored working rules and tooling                          |
| `docs/**/meta.json`                                | Committed derived sidebar; regenerate with nav sync         |
| App-root `index.md`                                | Generated Markdown inventory; predev/prebuild regenerate it |
| `.source/`, `.next/`, `out/`                       | Generated collection/build/export; never edit               |

`documentation.navOwner: nav-sync` authorizes navigation generation. Agree ownership before changing hand-authored or undeclared navigation. `documentation.nonReaderPaths` excludes non-reader content from nav, manifests and the Fumadocs collection; explicit Contents links do not override it. `documentation.excludes` affects only the manifest. Do not use exclusions to conceal an unlisted reader page.

To add a page, choose its scope from the nearest map, add title/description frontmatter and one H1, then update Contents. To move or rename, update both maps and inbound links in the same commit, and agree how old published URLs will resolve (redirect or static recovery page). Add a child `index.md` when adding a directory. Use `.md`-suffixed source links; the link transform produces rendered routes.

## Supported features and diagrams

Use **Markdown → existing transform → MDX** in that order. Tables, task lists, fenced code, callouts, nested tabs and Mermaid are configured. MDX is for actual JSX/component needs and is excluded from the Markdown manifest and agent endpoints. See [Markdown Features](markdown-features.md) for paired Syntax/Rendered examples.

Not configured: executable notebooks, API playgrounds, screenshot testing. The portable checker validates Mermaid syntax with the installed parser; a successful build alone does not prove diagram validity or visual correctness. Keep language labels on code fences and use `bash` for shell commands.

Mermaid is diagram source; include `accTitle` and `accDescr`. Important or phone-sized diagrams also get matching light/dark SVGs under `public/diagrams/`, linked as `/diagrams/name-light.svg` and `/diagrams/name-dark.svg`; the theme adds the base path, selects the theme and supports zoom. Update source and both SVGs in the same commit. Use descriptive SVG `<title>`/`<desc>` with `role="img"` and `aria-labelledby`, readable labels and concise meaningful image alt text (about 155 characters or less).

## Local workflow

All commands below run from the **repository root**. Contributor setup is in [Code Contributions](code.md).

1. Start the dev server:

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
   pnpm --filter oat-docs docs:format:check
   ```

Run portable validation from the repository root before committing:

```bash
pnpm --filter oat-docs docs:check
pnpm docs:validate
```

The first command checks reader structure/metadata/links, contributor commands, navigation and diagrams without a build. Errors fail; warnings prompt review. The second retains flagship hosted README/catalog/live-consumer checks too. See [Check Documentation](../docs-tooling/check.md) for policy, counting and repair guidance.

## Authoring Expectations

- Keep docs aligned with the current repo behavior and current command surface.
- Give each Markdown or MDX page exactly one document H1. `pnpm docs:validate`
  reports the file and count when a page has zero or multiple H1s. ATX and
  Setext headings count, including headings inside blockquotes or lists;
  frontmatter and fenced code do not.
- Prefer cross-links over duplicated conceptual content.
- Use `oat-docs-authoring` for targeted OAT/Fumadocs docs edits; it delegates
  universal page-quality guidance to `authoring-docs` and keeps local
  navigation, generated-index, and validation expectations in scope.
- When you add, remove, or rename docs pages in this Fumadocs app, refresh the generated Fumadocs root index. It is a generated file-tree manifest that should be checked against authored `docs/**/index.md` maps, not hand-edited:

  ```bash
  pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
  ```

- Then refresh the sidebar navigation. `oat docs nav sync` rewrites the committed `meta.json` files from the `## Contents` maps and reports any page no map lists; list the page in its directory's `## Contents` rather than editing `meta.json`. The build runs the read-only `--check` form and fails while the navigation is stale or a page is unlisted:

  ```bash
  pnpm -w run cli:source -- docs nav sync --target-dir apps/oat-docs
  pnpm -w run cli:source -- docs nav sync --target-dir apps/oat-docs --check
  pnpm docs:validate
  ```

- In MkDocs apps, the same `oat docs nav sync` command refreshes the `nav:` block in `mkdocs.yml` instead.
- Use [Markdown Features](markdown-features.md) for supported syntax and examples.

Agent working rules: `../../AGENTS.md` (app-root source file).

## Related Guides

- [Markdown Features](markdown-features.md)
- [Docs Tooling](../docs-tooling/index.md)

## If You Are Trying To...

- use docs commands or bootstrap a docs app, start with [Docs Tooling](../docs-tooling/index.md)
- follow the authoring contract for `index.md` and navigation, stay on this page and then read [Docs Index Contract](../reference/docs-index-contract.md)
- understand supported markdown patterns, use [Markdown Features](markdown-features.md)
