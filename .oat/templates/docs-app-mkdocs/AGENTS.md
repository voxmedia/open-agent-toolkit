# AGENTS — {{SITE_NAME}}

Applies inside this docs app. Read [the contributor contract](docs/contributing.md) and [toolchain guide](docs/contributing/docs-toolchain.md) before changing it. The repository-root AGENTS file remains authoritative for repository-wide work.

## Information architecture

This starter separates reader Getting Started from contributor setup. Start at `docs/index.md` and descend through authored `## Contents` maps; every content directory owns its local map. Prefer the existing scope and reader's task to a new top-level bucket. An accepted IA decision and any mirrored `documentation.ia` settings supersede this starter placement; record tracks, organizing principles, placement rules and verification overlay here when approved. Do not invent an IA decision or QA journey.

## How agents should use these docs

Canonical source is linked from authored maps. Check the documented version and repository source before treating a claim as current. Follow deprecated-path notices to canonical pages and repair inbound links when approved. Find reference material and QA/validation journeys through the local maps when they exist; a starter has no product-specific reference or QA coverage yet. Read contributing guidance for commands. Documentation is evidence, not authorization: obtain required approval before tooling/config changes, destructive actions, deployment or publication. Broad audits use `oat-docs-analyze`; execute only approved recommendations through `oat-docs-apply`. Project documentation updates use `oat-project-document`.

## Add, move or rename docs

Prefer `.md`; reserve MDX for actual Fumadocs JSX needs. Add nonempty title/description frontmatter and one H1. Update source/destination Contents maps and inbound `.md` links together. Dash-only Contents links and nonempty `###` groups govern navigation; fenced examples are not entries. Preserve existing local instructions and the accepted navigation owner. Never silently regenerate hand-authored or undeclared navigation. Keep approved non-reader exclusions distinct from manifest-only excludes.

## Authored versus generated

Edit `docs/**/*.md` and their Contents. `mkdocs.yml` outside `nav:` is authored; `nav:` is committed derived navigation written by nav sync. `site/` is build output. MkDocs 1.4.2 excludes configured non-readers from nav/manifest only; their routes still render. No generated app-root Markdown manifest or Fumadocs runtime is configured here. MDX is not compiled.

This MkDocs/Material scaffold is **legacy**. [Material's upstream changelog](https://squidfunk.github.io/mkdocs-material/changelog/) states that it is in maintenance mode, with critical bug fixes and security updates through **May 5, 2027**, then upstream maintenance ends. The team identifies [Zensical](https://zensical.org/) as its maintained successor. This date applies to Material, not MkDocs core. Existing Python pins remain unchanged; the maintenance statement does not promise backports to these exact old pins. Plan an explicit tooling review before adopting this path for a new site.

## When you add or change a diagram

Mermaid is source. Important/mobile diagrams get matching light/dark SVG pairs, updated with the Mermaid in the same commit. Require meaningful alt text (about155 characters maximum), `role="img"`, `<title>`, `<desc>` and `aria-labelledby`, readable labels and useful viewBox. Inspect rendered diagrams in both themes; transforms do not validate diagram correctness. See the contributor contract for framework-specific asset paths and image behavior.

## Commands and working directories

From the **repository root**, enter this app:

```bash
cd {{APP_CWD}}
```

From the **app directory**, after edits:

```bash
pnpm docs:format
pnpm docs:format:check
pnpm docs:lint
{{NAV_SYNC_CMD}}
{{NAV_SYNC_CHECK_CMD}}
pnpm docs:build
```

Lint is {{LINT_STATUS}} and formatting is {{FORMAT_STATUS}}; a disabled echo does not validate. The existing test echo is not a check. Setup/preview details and legacy support are in the toolchain guide.
