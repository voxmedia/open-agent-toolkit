---
title: Docs App Commands
description: 'Docs scaffolding CLI surface for Fumadocs/MkDocs, migration helpers, Fumadocs index generation, and MkDocs nav sync.'
---

# Docs App Commands

OAT includes a dedicated docs command family for bootstrapping and maintaining
documentation apps. Two frameworks are supported: **Fumadocs** (Next.js-based)
and **MkDocs Material**.

## Quick Look

- What it does: documents the docs-specific CLI surface for scaffolding apps, migrating markdown, generating Fumadocs app-root index manifests, and syncing MkDocs navigation.
- When to use it: when you already know you are working on a docs surface and need the exact command-level behavior.
- Primary commands: `oat docs init`, `oat docs migrate`, `oat docs generate-index`, `oat docs nav sync`

## Command surface

| Command                   | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| `oat docs init`           | Scaffold a new docs app (Fumadocs or MkDocs).                                 |
| `oat docs migrate`        | Convert MkDocs admonitions to GFM callouts and inject frontmatter.            |
| `oat docs generate-index` | Generate a Fumadocs app-root docs index manifest from the Markdown file tree. |
| `oat docs nav sync`       | Regenerate MkDocs `mkdocs.yml` navigation from directory `index.md` maps.     |
| `oat docs analyze`        | CLI entrypoint that points users to the `oat-docs-analyze` skill.             |
| `oat docs apply`          | CLI entrypoint that points users to the `oat-docs-apply` skill.               |

## Which Generation Command To Run

Use the framework-specific generated-artifact command:

- Fumadocs apps run `fumadocs-mdx` and `oat docs generate-index`. In this repo, `predev` and `prebuild` regenerate `apps/oat-docs/index.md` from `apps/oat-docs/docs`.
- MkDocs apps use `oat docs nav sync` to regenerate the `nav:` block in `mkdocs.yml` from authored directory `index.md` `## Contents` sections.

Both frameworks keep authored `## Contents` sections as the source of local discovery. The generated artifact differs by framework.

## `oat docs init`

Use `oat docs init` to scaffold a docs app that follows the OAT docs contract.

> **Consider the `oat-docs-bootstrap` skill instead.** The skill wraps `oat docs init` with preflight detection, richer input gathering (site name distinct from package name), capability-gated post-patches that close open CLI gaps (site-title metadata, Turbopack root, template-content fixes, docs-app `AGENTS.md` bridge, `## Contents` link extensions, `contributing.md` three-surfaces cleanup), build verification, config inspection, and a seven-section educational walkthrough. See [Add Docs to a Repo §3a](add-docs-to-a-repo.md#3a-preferred-the-oat-docs-bootstrap-skill-guided) for the full flow. The CLI documented here remains the authoritative surface for flags and is the right choice when you need a deterministic, non-interactive scaffold (CI, automation).

Key behavior:

- prompts for framework choice (Fumadocs or MkDocs) in interactive mode
- detects monorepo vs single-package repo shape
- defaults to `apps/<app-name>` for monorepos
- defaults to `<app-name>/` at repo root for single-package repos
- sets `documentation.tooling`, `documentation.root`, and `documentation.index` in `.oat/config.json`
- when the repo root exposes a compatible Turbo `scripts.build`, patches it to exclude the new docs app from the default root build and adds a root-level `build:docs` script
- prints a unified diff before writing the root `package.json` change and returns a manual snippet when the patch is skipped because the build script is missing, non-Turbo, or ambiguous

Fumadocs scaffold:

- thin Next.js app importing from `@open-agent-toolkit/docs-config`, `@open-agent-toolkit/docs-theme`, `@open-agent-toolkit/docs-transforms`
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
- `--lint <none|markdownlint-cli2>`
- `--format <oxfmt|none>`
- `--no-root-patch`
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

Use `oat docs generate-index` to produce a generated Markdown manifest from the
docs file tree. In Fumadocs apps this is the app-root `index.md`, outside the
authored `docs/` source tree. The generated index lists all pages with titles
and descriptions, organized by directory structure.

Key behavior:

- recursively walks the docs directory
- extracts page titles from frontmatter (falls back to first `# heading`, then filename title-case)
- includes descriptions from frontmatter when present
- outputs to app root (`index.md`) by default, not inside the docs directory
- updates `documentation.index` in `.oat/config.json`
- prepends an `AUTOGENERATED` warning comment to the output and rewrites the file on every run; do not hand-edit the generated `index.md`
- should be freshness-checked against authored `docs/**/index.md` `## Contents` maps before treating it as navigation evidence
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

Use nav sync in MkDocs apps after adding, removing, or renaming docs pages.

The command reads only the reserved `## Contents` section from each directory
`index.md` and regenerates the `nav:` block in `mkdocs.yml`.

For Fumadocs apps, regenerate the root markdown manifest with `oat docs generate-index` instead.

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

- [`workflows.md`](workflows.md)
