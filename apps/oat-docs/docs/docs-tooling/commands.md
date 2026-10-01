---
title: Documentation Commands
description: 'Markdown bootstrap/adoption, framework scaffolding, external manifests, and framework navigation helpers.'
---

# Documentation Commands

OAT includes a dedicated docs command family for bootstrapping and maintaining
plain Markdown documentation and apps using **Fumadocs** (Next.js-based)
or **MkDocs Material**.

## Quick Look

- What it does: documents the docs-specific CLI surface for scaffolding apps, migrating markdown, generating Fumadocs app-root index manifests, and syncing MkDocs navigation.
- When to use it: when you already know you are working on a docs surface and need the exact command-level behavior.
- Primary commands: `oat docs init`, `oat docs migrate`, `oat docs generate-index`, `oat docs nav sync`

## Command surface

| Command                   | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `oat docs init`           | Set up Markdown files or a docs app; additively adopt Markdown.           |
| `oat docs migrate`        | Convert MkDocs admonitions to GFM callouts and inject frontmatter.        |
| `oat docs generate-index` | Generate a manifest from Markdown files, outside authored content.        |
| `oat docs nav sync`       | Regenerate MkDocs `mkdocs.yml` navigation from directory `index.md` maps. |
| `oat docs analyze`        | CLI entrypoint that points users to the `oat-docs-analyze` skill.         |
| `oat docs apply`          | CLI entrypoint that points users to the `oat-docs-apply` skill.           |

## Which Generation Command To Run

Use the framework-specific generated-artifact command:

- Fumadocs apps run `fumadocs-mdx` and `oat docs generate-index`. In this repo, `predev` and `prebuild` regenerate `apps/oat-docs/index.md` from `apps/oat-docs/docs`.
- MkDocs apps use `oat docs nav sync` to regenerate the `nav:` block in `mkdocs.yml` from authored directory `index.md` `## Contents` sections.

Markdown needs no generation command or site build; optional inventories require
explicit external output and retain the authored config index. Both frameworks keep authored `## Contents` sections as the source of local discovery. The generated artifact differs by framework.

## `oat docs init`

Use `oat docs init` to bootstrap Markdown documentation or scaffold a framework app.

> **Consider the `oat-docs-bootstrap` skill instead.** The skill wraps `oat docs init` with preflight detection, richer input gathering (site name distinct from package name), capability-gated post-patches that close open CLI gaps (site-title metadata, Turbopack root, template-content fixes, docs-app `AGENTS.md` bridge, `## Contents` link extensions, `contributing.md` three-surfaces cleanup), build verification, config inspection, and a seven-section educational walkthrough. See [Add Docs to a Repo §3a](add-docs-to-a-repo.md#3a-preferred-the-oat-docs-bootstrap-skill-guided) for the full flow. The CLI documented here remains the authoritative surface for flags and is the right choice when you need a deterministic, non-interactive scaffold (CI, automation).

Key behavior:

- prompts for Markdown, Fumadocs, or MkDocs in interactive mode
- detects monorepo vs single-package repo shape
- Markdown defaults to literal `docs` in every repo shape; framework apps default
  to `apps/<app-name>` for monorepos
- framework apps default to `<app-name>/` at repo root for single-package repos
- sets `documentation.tooling`, `documentation.root`, and `documentation.index` in `.oat/config.json`
- for framework apps, when the repo root exposes a compatible Turbo `scripts.build`, patches it to exclude the new docs app from the default root build and adds a root-level `build:docs` script
- prints a unified diff before writing the root `package.json` change and returns a manual snippet when the patch is skipped because the build script is missing, non-Turbo, or ambiguous

Markdown setup:

- Creates only authored root `index.md` and `contributing.md` baseline pages,
  with metadata, context and real relative `.md` Contents links.
- Records literal root/tooling/authored index and managed root guidance; no
  docs-root AGENTS, app package, dependencies, package/Turbo patch or site build.
- Populated targets require `--adopt` even with `--yes`. Adoption only adds missing
  baseline files; existing malformed indexes and local instructions are preserved
  with audit advice. It does not claim full OAT conformity.
- When the root `index.md` is missing, its initial Contents map includes existing
  sibling pages and usable immediate child indexes. Readable child-index symlinks
  resolving inside the repository are supported. Unusable child indexes are
  preserved and omitted from the map with audit advice. An existing root index
  is preserved rather than rebuilt.
- During this discovery, directories containing only `AGENTS.md` or `CLAUDE.md`
  do not trigger missing-index advice. If permissions prevent inspection of a
  nested directory, bootstrap preserves it, reports that it was not inspected,
  and continues checking readable siblings. Required root-baseline and target
  safety checks remain strict; use analyze/apply for approved content repairs.
- Unsafe roots and incompatible documentation config fail before writes.
  Explicit framework selection retains its existing replacement behavior over
  Markdown config, without migrating or deleting old Markdown content.
- `--dry-run` reports planned changes without writes. Manual-required/blocked
  guidance yields `partial`/exit `1`; a real partial may already have written
  files/config. Converged adoption is `ok`/exit `0` with no changes.
- Lint/format defaults are `none`; selecting existing tools never installs them.

```bash
oat docs init --framework markdown --site-name "Project Docs" --yes
oat docs init --framework markdown --target-dir handbook --adopt --dry-run --yes
oat docs init --framework markdown --target-dir handbook --adopt --yes
```

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
- `--framework <markdown|fumadocs|mkdocs>` (default: `fumadocs` in non-interactive mode)
- `--site-name <name>` (site display title or Markdown documentation title)
- `--description <text>` (documentation description, optional)
- `--lint <none|markdownlint-cli2>`
- `--format <oxfmt|none>`
- `--adopt` (Markdown only; add missing baseline files, preserve existing bytes)
- `--dry-run` (Markdown only; nonmutating files/config/guidance preview)
- `--no-root-patch` (inapplicable to Markdown, as is `--app-name`)
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
- resolves omitted paths from `.oat/config.json` rather than the current directory: configured Markdown uses the literal `documentation.root` for `--docs-dir` and requires explicit `--output`; other tooling defaults to `<documentation.root>/docs` when present or `<documentation.root>` otherwise, with app-root manifest output `<documentation.root>/index.md`
- treats explicitly supplied `--docs-dir` / `--output` paths as overrides resolved from the current directory
- fails with exit code `2` before generating or writing anything when an omitted path has no non-empty `documentation.root` to resolve against, or when the configured root is not a directory
- refuses unsafe output targets with exit code `1` before generation, for derived and explicit paths alike, comparing symlink-resolved paths: inside the docs directory it indexes, equal to `documentation.config`, or ending in `.yml` / `.yaml` in any case. A derived output whose existing file lacks the `AUTOGENERATED` header is refused too; naming that path with `--output` overwrites it explicitly only when no other output guard applies. Configured Markdown additionally protects its full canonical content root and authored `documentation.index`, independently of selected source; narrowed sources and symlink aliases cannot bypass that guard. A refused target is an actionable flag error (`1`); unusable path configuration is a separate condition and exits `2`, so scripts can branch on the two
- refuses a symlink chain that exceeds its own 32-hop cap, naming the path you supplied or the CLI derived rather than an intermediate link, and addressing the flag that owns it: an unusable **output** chain names `--output` and exits `1`; an unusable **docs directory** chain names `--docs-dir` and, when the directory was derived from `documentation.root` rather than passed explicitly, also names the `oat config set documentation.root <path>` repair and exits `2` as unusable path configuration. That cap governs the dangling links the command walks itself; a chain the operating system refuses first surfaces as its own `ELOOP` error with exit `1`, which is what a too-deep chain reports on a platform whose own limit is 32 or lower
- writes configuration only for the Fumadocs manifest transition — recording the manifest it just wrote inside `documentation.root` in `documentation.index`, when `documentation.tooling` is `fumadocs` or the config declares neither `tooling` nor `config`. Markdown and MkDocs configurations are never written, and `documentation.root` and `documentation.config` are never modified
- prepends an `AUTOGENERATED` warning comment to the output and rewrites the file on every run; do not hand-edit the generated `index.md`
- should be freshness-checked against authored `docs/**/index.md` `## Contents` maps before treating it as navigation evidence
- sorting: `index.md` first, then directories before files, then lexical
- reports the derived docs directory in human output and as `docsDir` / `docsDirSource` under `--json`, alongside `excludes` — the effective exclusion list, `documentation.excludes` merged with the `--exclude` flags exactly as it was handed to the generator
- says where to look when a manifest is empty rather than reporting a bare `0 entries`: which exclusion patterns were active, or that the docs directory held no indexable pages. The wording is observational — the command reports indexed entries, not pattern matches, so it names the exclusions without asserting they are the cause. An empty manifest is a report, not a failure — the file is still written, so a stale index is never left behind, and the command still exits `0`
- omits pages matching the exclusion list. Nothing is excluded by default; once listed, non-page Markdown such as `CLAUDE.md` or `AGENTS.md` stops reaching the manifest. Patterns come from `documentation.excludes` in `.oat/config.json` and from repeated `--exclude` flags, and the flags **extend** the configured list rather than replacing it. A directory left empty by exclusion emits no heading, and an empty list produces byte-identical output to no exclusions at all

Supported flags:

- `--docs-dir <path>` (Markdown: literal configured root; others: `<root>/docs`, falling back to `<root>`)
- `--output <path>` (required external output for configured Markdown; otherwise defaults to `<root>/index.md`)
- `--exclude <glob>` (repeatable; additive to `documentation.excludes`)

### Exclusion patterns

Patterns match the path of each candidate **relative to the docs directory being indexed** — `api/auth.md`, `api/nested` — never an absolute or current-directory-relative path, and never the repository-relative path.

| Pattern        | Matches                                                  |
| -------------- | -------------------------------------------------------- |
| `CLAUDE.md`    | only the root-level `CLAUDE.md`; patterns are anchored   |
| `**/CLAUDE.md` | `CLAUDE.md` at any depth, including the docs root        |
| `*.md`         | root-level Markdown only; `*` never crosses `/`          |
| `drafts/`      | the `drafts` directory and everything beneath it         |
| `drafts`       | the same directory; the trailing `/` only forbids a file |
| `api/**/*.md`  | Markdown at any depth under `api/`, including `api/x.md` |

A trailing `/` restricts a pattern to directories and never matches a file; without it, a pattern that matches a directory path still prunes that directory. `**` spans `/` only as a whole path segment — inside a segment (`a**b`) it is an ordinary single-segment wildcard. Matching is case-sensitive, `/` is the separator on every platform, and only `*` and `**` are metacharacters — every other character, `.` included, is literal. A leading `./` or `/` is stripped, so both spellings anchor at the docs root.

Example:

```bash
# Framework defaults from .oat/config.json
oat docs generate-index

# Optional Markdown manifest: output outside the entire configured content root
oat docs generate-index --docs-dir handbook --output .oat/docs-manifest.md

# Portable explicit framework form, resolved from the current directory
oat docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md

# Persist the repository's own exclusions, then add a one-off
oat config set documentation.excludes "**/CLAUDE.md,**/AGENTS.md"
oat docs generate-index --exclude 'drafts/'
```

See [Documentation path resolution](../reference/oat-directory-structure.md#documentation-path-resolution) for Markdown literal roots, framework app roots, and legacy source-root compatibility.

The Fumadocs scaffold runs this automatically via `predev`/`prebuild` npm
script hooks.

## `oat docs nav sync`

Use nav sync in MkDocs apps after adding, removing, or renaming docs pages.

The command reads only the reserved `## Contents` section from each directory
`index.md` and regenerates the `nav:` block in `mkdocs.yml`.

Plain Markdown needs file/link checks and authored Contents maintenance, without
site nav generation. For Fumadocs apps, regenerate the root markdown manifest with `oat docs generate-index` instead.

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
