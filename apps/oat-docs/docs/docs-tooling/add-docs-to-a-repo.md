---
title: Add Docs to a New Repo
description: 'Step-by-step guide for adding an OAT-managed docs app to a repository.'
---

# Add Docs to a New Repo

Use this path when you want to add an OAT-managed docs app and the docs
analyze/apply workflow to a repository.

If you are developing inside the OAT repo itself, replace `oat ...` with
`pnpm run cli -- ...`.

## What this gives you

- a docs app scaffolded with OAT defaults (Fumadocs or MkDocs)
- `index.md`-driven navigation
- docs analysis and apply skills installed via the docs pack
- a repeatable workflow for finding gaps, verifying claims, and applying docs changes

## 1. Initialize OAT in the repo

```bash
oat init --scope project
```

This sets up the base OAT structure used by the CLI and installed tool packs.

## 2. Install the docs workflow skills

Preferred direct path:

```bash
oat tools install docs
```

Interactive path:

```bash
oat tools install
```

Legacy pack-specific path:

```bash
oat init tools docs
```

The docs pack installs `authoring-docs`, `oat-docs-authoring`,
`oat-docs-analyze`, `oat-docs-apply`, `oat-agent-instructions-analyze`, and
`oat-agent-instructions-apply`. For this quickstart, the authoring and docs
analysis/apply skills are the parts you need immediately.

## 3. Scaffold the docs app

Two paths — pick one:

### 3a. Preferred: the `oat-docs-bootstrap` skill (guided)

```text
/oat-docs-bootstrap
```

The docs-bootstrap skill wraps `oat docs init` with a seven-step guided flow: preflight detection (repo shape + existing-setup conflict surfacing), richer input gathering (including a site name distinct from the package name), the CLI invocation itself, labeled post-patches for open CLI gaps, install + build verification, post-scaffold config inspection, and a chunked educational walkthrough.

What the skill adds over the raw CLI:

- **Preflight + conflict resolution.** Detects existing `documentation` config / docs app dir / root `AGENTS.md` section and walks a deliberate resolution choice (replace, abort, repair, or deferred second-app) before any mutation.
- **Richer inputs.** Asks for a **site name** separate from the package name, so `createDocsConfig()` / layout branding / page metadata all converge on the same display title.
- **Post-scaffold patches for open CLI gaps.** Applied only when capability detection shows the CLI hasn't closed the gap. Each patch is labeled (e.g., `<!-- FP-12 patch -->`) so it can be removed deterministically when the upstream fix lands:
  - **FP-11** — Turbopack `root` for nested-standalone Fumadocs apps (suppresses the multiple-lockfile warning)
  - **FP-12** — `export const metadata = { title, description }` in `app/layout.tsx` (the only thing that populates page `<title>`, meta description, and Open Graph — `DocsLayout.branding.title` only renders nav chrome, and `createDocsConfig()` ignores `title` / `description` entirely)
  - **FP-13** — four scaffold-content fixes (empty per-page `description:` frontmatter, bare install/build commands missing `--filter` or `cd`-prefix for monorepo/nested shapes, false `docs:lint` claim when `lint=none`, Node version line that doesn't match the consuming repo's `.nvmrc` / `engines.node`)
  - **FP-15** — writes a task-framed `<appRoot>/AGENTS.md` bridge file when the CLI hasn't scaffolded one. The bridge is the docs app's runtime agent reference (separate audience from `docs/contributing.md`)
  - **FP-16** — rewrites `docs/index.md` `## Contents` links to the `.md`-suffixed form that `@open-agent-toolkit/docs-transforms` normalizes at build time (agent-friendlier than extension-less; routes correctly)
  - **FP-17** — trims `docs/contributing.md`'s "Agent guidance" section to a one-line pointer at the docs-app `AGENTS.md`, restoring the three-surfaces separation
- **Build verification.** Runs install + build, classifies failures against known patterns, stops on unknown errors rather than guessing.
- **Config inspection.** Reads `.oat/config.json` back, verifies paths exist on disk, handles the nested-standalone dual-config case, and collects the `requireForProjectCompletion` opt-in explicitly.
- **Root-build explanation.** When the CLI safely patches a compatible Turbo root `build` script, the walkthrough explains why the filter was added, shows the diff shape, and documents how to adjust or revert it. When the CLI skips the patch, the walkthrough relays the recommended manual snippet.
- **Educational walkthrough.** Seven sections covering the `documentation` config, the authored-source/generated-navigation model, the `## Contents` contract (with extension discipline), the three agent-instruction surfaces (root `AGENTS.md` pointer / docs-app `AGENTS.md` / `docs/contributing.md`), Fumadocs internals (or MkDocs Minimum Contract), and the OAT docs ecosystem (`oat-project-document`, `oat-docs-analyze`, `oat-docs-apply`).
- **Optional content kickoff.** Hands off to `oat-docs-analyze` + `oat-docs-apply` if you want to populate initial repo-specific content immediately.

Capability-gated: every post-patch self-ratchets off as CLI fixes land upstream. The skill's labeled markers (`<!-- FP-NN patch -->`) are how you find them later when the CLI catches up.

### 3b. Direct CLI (deterministic / non-interactive)

```bash
oat docs init --app-name my-docs
```

In interactive mode, you'll be prompted to choose a framework:

- **Fumadocs** — Next.js-based static site with FlexSearch, Mermaid diagrams, dark/light mode, and code copy buttons
- **MkDocs** — MkDocs Material with the OAT contributor contract

Default placement:

- monorepo: `apps/my-docs`
- single-package repo: `my-docs/` at repo root

You can override the target and framework explicitly:

```bash
# Fumadocs (non-interactive)
oat docs init --app-name my-docs --framework fumadocs --yes

# MkDocs (non-interactive)
oat docs init --app-name my-docs --framework mkdocs --yes
```

Use 3b when you want a fully headless scaffold (CI, automation) and can accept the raw CLI output without the guided post-patches.

For compatible Turbo monorepos, the CLI also patches the repo-root
`package.json` by default so root `pnpm build` excludes the new docs app and a
root `build:docs` script is available for docs-only builds. Use
`--no-root-patch` to opt out, or `--dry-run` to preview the diff without
writing it.

### 3c. Existing MkDocs content

Bootstrap is not the migration workflow. If you have an existing MkDocs site
and want to switch to Fumadocs, treat that as a separate migration workstream.
The CLI migration helper can convert common Markdown syntax and frontmatter:

```bash
oat docs migrate --docs-dir docs --config mkdocs.yml --apply
```

Run without `--apply` first to preview changes. For a full MkDocs-to-Fumadocs
refactor, use the assigned migration handoff guide or project plan; do not make
`oat-docs-bootstrap` own that migration.

## 4. Start authoring docs with the OAT contract

Use `oat-docs-authoring` for targeted OAT/Fumadocs content edits or local
restructuring. It uses `authoring-docs` for the portable documentation baseline
and adds the OAT-specific navigation, generated-index, and validation contract.

Core rules:

- every docs directory should have an `index.md`
- every `index.md` should include a `## Contents` section
- the `## Contents` section should map sibling pages and immediate child directories
- `## Contents` links should use `.md`-suffixed relative targets, including `subdir/index.md` for child directories

For **MkDocs** apps, regenerate navigation after adding or moving pages:

```bash
oat docs nav sync --target-dir apps/my-docs
```

For **Fumadocs** apps, the app-root docs index manifest is generated from the
Markdown file tree automatically via `predev`/`prebuild` hooks. You can also
run it manually:

```bash
oat docs generate-index --docs-dir docs
```

The generated app-root `index.md` is machine-owned and now starts with an
`AUTOGENERATED` warning comment. Edit authored pages and `## Contents` maps
under `docs/`, then compare the generated manifest against those maps when
checking freshness.

## 5. Analyze the docs surface

Use the skill, not the CLI stub, for the real analysis workflow.

If your host supports slash-skill invocation:

```text
/oat-docs-analyze
```

Otherwise invoke the skill by name in your agent host.

What `oat-docs-analyze` checks:

- index contract coverage
- nav drift
- stale or contradicted repo-checkable claims
- missing or thin content coverage based on repo features
- contributor/setup guidance gaps

## 6. Review the artifact and apply approved changes

Run the apply skill after analysis:

```text
/oat-docs-apply
```

`oat-docs-apply` consumes the analysis artifact, asks for approval, and applies
only the approved, evidence-backed recommendations.

Important:

- `oat docs analyze` and `oat docs apply` are CLI guidance entrypoints
- the actual analysis/apply workflow runs through the skills

## Typical loop

1. `oat init --scope project`
2. `oat tools install docs`
3. `oat docs init --app-name my-docs`
4. (optional) handle MkDocs migration as a separate workstream; use `oat docs migrate --docs-dir docs --config mkdocs.yml --apply` only for the syntax/frontmatter helper
5. Author docs with `index.md` + `## Contents`
6. `oat docs nav sync --target-dir apps/my-docs` (MkDocs) or `oat docs generate-index` (Fumadocs)
7. `/oat-docs-analyze`
8. `/oat-docs-apply`
9. Repeat as the codebase changes

## Related docs

- [`commands.md`](commands.md)
- [`workflows.md`](workflows.md)
- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)
