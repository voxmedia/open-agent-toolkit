---
title: Docs App Commands
description: 'Docs scaffolding CLI surface for Fumadocs/MkDocs, migration, index generation, and nav sync.'
---

# Docs App Commands

OAT includes a dedicated docs command family for bootstrapping and maintaining
documentation apps. Two frameworks are supported: **Fumadocs** (Next.js-based)
and **MkDocs Material**.

## Command surface

| Command                   | Purpose                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `oat docs init`           | Scaffold a new docs app (Fumadocs or MkDocs).                                        |
| `oat docs migrate`        | Convert MkDocs admonitions to GFM callouts and inject frontmatter.                   |
| `oat docs generate-index` | Generate a docs index from the markdown file tree.                                   |
| `oat docs nav sync`       | Regenerate `mkdocs.yml` navigation from directory `index.md` `## Contents` sections. |
| `oat docs analyze`        | CLI entrypoint that points users to the `oat-docs-analyze` skill.                    |
| `oat docs apply`          | CLI entrypoint that points users to the `oat-docs-apply` skill.                      |

## `oat docs init`

Use `oat docs init` to scaffold a docs app that follows the OAT docs contract.

Key behavior:

- prompts for framework choice (Fumadocs or MkDocs) in interactive mode
- detects monorepo vs single-package repo shape
- defaults to `apps/<app-name>` for monorepos
- defaults to `<app-name>/` at repo root for single-package repos
- sets `documentation.tooling`, `documentation.root`, and `documentation.index` in `.oat/config.json`

Fumadocs scaffold:

- thin Next.js app importing from `@oat/docs-config`, `@oat/docs-theme`, `@oat/docs-transforms`
- static export (`output: 'export'`) with FlexSearch, Mermaid diagrams, dark/light mode
- `predev`/`prebuild` hooks run `oat docs generate-index` automatically
- starter docs: `docs/index.md`, `docs/getting-started.md`, `docs/contributing.md`

MkDocs scaffold:

- MkDocs Material with OAT contributor contract (unchanged from previous behavior)
- includes `docs/index.md`, `docs/contributing.md`, and the local tooling needed to run the app

Supported flags:

- `--app-name <name>`
- `--target-dir <path>`
- `--framework <fumadocs|mkdocs>` (default: `fumadocs` in non-interactive mode)
- `--description <text>` (site description, optional)
- `--format <oxfmt|none>`
- `--yes`

Examples:

```bash
# Interactive (prompts for framework choice)
oat docs init --app-name my-docs

# Fumadocs (non-interactive)
oat docs init --app-name my-docs --framework fumadocs --yes

# MkDocs (non-interactive)
oat docs init --app-name my-docs --framework mkdocs --yes
```

## `oat docs migrate`

Use `oat docs migrate` to convert MkDocs-flavored markdown to GFM-compatible
format for Fumadocs.

Key behavior:

- converts MkDocs `!!!` / `???` admonition syntax to GFM `> [!TYPE]` blockquote callouts
- maps 14 MkDocs admonition types to 5 GFM types (NOTE, WARNING, TIP, IMPORTANT, CAUTION)
- injects `title` frontmatter from `mkdocs.yml` nav entries (falls back to first `# heading`, then filename)
- seeds empty `description: ""` frontmatter when missing
- dry-run by default; use `--apply` to write changes

Supported flags:

- `--docs-dir <path>` (default: `docs`)
- `--config <path>` (path to `mkdocs.yml` for nav title extraction)
- `--apply` (write changes to disk; default is dry-run)

Example:

```bash
# Preview changes
oat docs migrate --docs-dir docs --config mkdocs.yml

# Apply changes
oat docs migrate --docs-dir docs --config mkdocs.yml --apply
```

## `oat docs generate-index`

Use `oat docs generate-index` to produce a markdown index from the docs file
tree. The generated index lists all pages with titles and descriptions, organized
by directory structure.

Key behavior:

- recursively walks the docs directory
- extracts page titles from frontmatter (falls back to first `# heading`, then filename title-case)
- includes descriptions from frontmatter when present
- outputs to app root (`index.md`) by default, not inside the docs directory
- updates `documentation.index` in `.oat/config.json`
- sorting: `index.md` first, then directories before files, then lexical

Supported flags:

- `--docs-dir <path>` (default: `docs`)
- `--output <path>` (default: `index.md` at app root)

Example:

```bash
oat docs generate-index --docs-dir docs
```

The Fumadocs scaffold runs this automatically via `predev`/`prebuild` npm
script hooks.

## `oat docs nav sync`

Use nav sync after adding, removing, or renaming docs pages.

The command reads only the reserved `## Contents` section from each directory
`index.md` and regenerates the `nav:` block in `mkdocs.yml`.

Example:

```bash
oat docs nav sync --target-dir apps/oat-docs
```

Related reference:

- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)

## `oat docs analyze` and `oat docs apply`

These CLI commands intentionally reserve the docs workflow surface without
duplicating the skill logic in Commander handlers.

- `oat docs analyze` routes users to the `oat-docs-analyze` workflow
- `oat docs apply` routes users to the `oat-docs-apply` workflow

Use the CLI entrypoints when you want discoverable command help. Use the skills
when you want the actual docs analysis/apply execution flow.

Related docs:

- [`../skills/docs-workflows.md`](../skills/docs-workflows.md)
