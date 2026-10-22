# MkDocs to OAT/Fumadocs migration guide

Use this standalone handoff for an explicitly approved migration of an existing MkDocs site. Bootstrap creates an app; targeted authoring edits content; neither performs a full migration. Keep migration work in an OAT project or an explicit migration branch, with the agreed scope and owner recorded before changes.

This guide is reconstructed from current OAT CLI, template and authoring contracts. The older project-local handoff mentioned in OAT's docs-authoring project summary was unavailable; this is not a copy of that historical document.

## Preflight: inventory before mutation

1. Read repository and docs-local instructions, `mkdocs.yml`, `.oat/config.json`, Python dependency files, docs package scripts and deployment workflows. Resolve the actual content root, published URL/base path and build output; do not assume `docs/` or GitHub Pages.
2. Inventory every source page, attachment, image, local link, anchor, nav entry and public URL. Record pages outside nav too. Keep a before/after mapping for every source path and URL; never silently drop an unlisted page.
3. Inventory MkDocs-specific features: admonitions, tabs, includes/macros, plugin-generated pages, API generation, Mermaid, custom assets/theme, search and redirects. Distinguish supported conversion from manual work and unsupported features.
4. Find claims requiring code/config evidence, confidential material, unresolved product behavior and owner-only knowledge. Record owner-review items rather than guessing or publishing uncertain claims.
5. Discover validation commands and required runtimes from scripts, CI and contributor instructions. Establish a baseline with exact commands and exit codes, including existing failures. Agree on the target app location, dependency policy, URL preservation strategy and deployment change with the user.

Produce an inventory and proposed migration scope for approval. Do not overwrite the MkDocs app, clear its configuration, delete Python tooling or switch deployment as a side effect of preparing a proposal.

## Phase 1: create the approved target app

Use `oat docs init --help` to inspect installed capabilities. Scaffold Fumadocs into an empty, approved destination with `--framework fumadocs`, a package/app name, site name, description and target directory. Bootstrap can guide this step, but creating a second app does not imply support for two active `documentation` entries: the current config describes one surface. Explicitly agree when the configured docs root will switch, and preserve the old config for rollback.

Read the rendered package scripts and configuration. The current Fumadocs template uses Next static export, trailing slashes and unoptimized images through `createDocsConfig`. For nested-standalone repos only, it forwards an ESM-safe app directory as `turbopack.root`; monorepo and single-package scaffolds use Next.js root discovery. Preserve the site's base path and `NEXT_PUBLIC_BASE_PATH`; set site identity through layout metadata and `DocsLayout` branding, not factory title options.

Install using the repository's package-manager conventions. Keep dependency or workspace changes visible in the migration diff. Do not delete the old site yet.

## Phase 2: migrate content without losing source

Copy approved content and assets into the target content root, retaining the source until parity is verified. Use the inventory to account for every file.

`oat docs migrate` converts supported MkDocs admonitions and injects missing frontmatter in `.md` files. It is a dry run by default; `--apply` writes changes. `--config` supplies MkDocs nav title hints, not a complete navigation or app migration. For example, from the repository root:

```bash
# Replace paths with the approved destination and preserved source config.
oat docs migrate --docs-dir apps/handbook/docs --config documentation/mkdocs.yml
# Review the preview and approve the content conversion before writing.
oat docs migrate --docs-dir apps/handbook/docs --config documentation/mkdocs.yml --apply
```

The command does not migrate app shells, deployment, plugins, macros, redirects or all Markdown extensions. Review seeded descriptions for meaningful content; metadata injection is not editorial completion. Convert unsupported syntax manually within the approved scope, preferring `.md` and using `.mdx` only where components require it. Preserve code examples, cautions, provenance and external attributions.

## Phase 3: preserve navigation, links and URLs

Create authored `index.md` pages with purpose and `## Contents` maps in each content directory. Map every retained page into the approved tree; use `.md` or `subdir/index.md` targets and the current dash-bullet Contents grammar. When consolidating `overview.md`, carry its content and inbound references into `index.md` and retain the old-URL mapping.

Run `oat docs nav sync --target-dir <app-root>` to generate committed `docs/**/meta.json` navigation from authored maps. Resolve unlisted pages explicitly. Do not hand-edit generated navigation. The separate app-root `index.md` manifest is generated by `oat docs generate-index` through the scaffold's `predev`/`prebuild`; it is not the authored root page.

Rewrite inbound links, relative assets and anchors using the before/after map. Test public URLs under the real base path. Choose an approved host-compatible recovery for moved URLs; do not assume Next redirects work with static export. If old URLs cannot be preserved, report the exact break and obtain a decision before deployment changes or source deletion.

## Phase 4: validate the migration

Discover and run the target app's actual lint, format, build and any link checks. Do not treat disabled/no-op scripts as validation. Run nav sync's read-only `--check` form to check committed navigation. Run existing repository gates required for package, config and workflow changes; keep exact exit codes and distinguish new failures from the baseline.

Inspect the static output and use the available browser to spot-check:

- landing and deeply nested pages, sidebar labels/order and search;
- old and new URLs, anchors, relative links and base-path assets;
- admonitions, tabs, tables, Mermaid, code blocks and custom components;
- title/description metadata, theme and layout behavior.

A successful build does not prove rendering or link parity. If a check cannot run, record the missing evidence and owner action; do not mark it verified. Review every inventory entry as migrated, deliberately retained, or explicitly approved for retirement, with a reason.

## Phase 5: review, switch and retain rollback

Present the content conservation diff, URL map, validation evidence, unresolved owner-review items, config changes and deployment proposal. Obtain user approval before switching the configured docs surface, changing publication workflows or retiring the old site. Use `oat-docs-analyze` for a read-only audit and the appropriate reviewed workflow for follow-up changes; do not assume docs-apply may edit app-shell or deployment configuration.

Only after parity and approval, remove obsolete MkDocs dependencies/configuration and update repository guidance to the new authored source, generated artifacts and commands. Keep an explicit rollback reference to the prior site/config/deployment. Package publishing and production deployment require their own authorization.

## Final report

Report the approved scope, changed files and commits; source-to-target page and URL dispositions; commands and exit codes; rendered spot checks; the configured docs root and publication behavior; known failures and unverified evidence; owner-review items and decisions; and the rollback reference. State whether the migration is ready for owner acceptance, rather than treating the absence of build errors as acceptance.

## Current contract references

Within this installed skill, read [lifecycle boundaries](lifecycle-boundaries.md), [the Fumadocs contract](oat-fumadocs-contract.md) and [validation](validation.md). Load `authoring-docs` from installed scope for universal evidence and writing guidance. Inspect installed CLI help and rendered templates before executing commands; the consuming repository's instructions and approved migration scope remain authoritative.
