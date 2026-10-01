---
title: Add or Adopt Docs in a Repo
description: 'Step-by-step guide for adding or adopting OAT-managed documentation to a repository.'
---

# Add or Adopt Docs in a Repo

Use this path when you want to add or adopt documentation and the docs
analyze/apply workflow to a repository.

If you are developing inside the OAT repo itself, replace `oat ...` with
`pnpm run cli -- ...`.

## What this gives you

- plain Markdown files or a docs app scaffolded with OAT defaults (Fumadocs or MkDocs)
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

## 3. Set up the documentation surface

Choose Markdown files or a framework app, using the guided skill or direct CLI.

### 3a. Preferred: the `oat-docs-bootstrap` skill (guided)

```text
/oat-docs-bootstrap
```

The docs-bootstrap skill offers Markdown, Fumadocs, and MkDocs. Configured tooling is authoritative; framework evidence is checked before plain-directory evidence. A root README alone does not trigger adoption, and an empty selected target stays fresh setup. Markdown uses file checks and an adopt/audit handoff, with no app questions, dependencies, framework patches, docs-root AGENTS, or site build.

For framework apps, it wraps `oat docs init` with a seven-step guided flow: preflight detection (repo shape + existing-setup conflict surfacing), richer input gathering (including a site name distinct from the package name), the CLI invocation itself, labeled post-patches for open CLI gaps, install + build verification, post-scaffold config inspection, and a chunked educational walkthrough.

What the framework path adds over the raw CLI:

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

- **Markdown** — authored files, context indexes, and Contents maps without a site framework
- **Fumadocs** — Next.js-based static site with FlexSearch, Mermaid diagrams, dark/light mode, and code copy buttons
- **MkDocs** — MkDocs Material with the OAT contributor contract

Framework default placement:

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
`--no-root-patch` to opt out. `--dry-run` is available only for Markdown
files/config/guidance; it does not preview framework package patches.

### Plain Markdown: fresh setup or additive adoption

```bash
# Fresh default root: docs/ in every repository shape
oat docs init --framework markdown --site-name "Project Docs" --yes

# Existing content: preview, then explicitly adopt without overwriting files
oat docs init --framework markdown --target-dir handbook --adopt --dry-run --yes
oat docs init --framework markdown --target-dir handbook --adopt --yes
```

Markdown creates missing `index.md` and `contributing.md` baseline pages and
records `documentation.tooling: "markdown"`, the literal root, and its authored
`<root>/index.md`. A nested `<root>/docs` remains a subsection. Root managed
Documentation guidance names these paths; bootstrap creates no docs-root
`AGENTS.md` and preserves one already present. It creates no app package,
framework config, dependencies, or install/dev/build commands. Lint/format
choices default to `none` and never install tools.

A default setup records:

```json
{
  "documentation": {
    "tooling": "markdown",
    "root": "docs",
    "index": "docs/index.md"
  }
}
```

A populated target is refused without `--adopt`, including with `--yes`.
Adoption preserves existing page/index/local-instruction bytes and adds only
missing baseline files. Missing child indexes, metadata, context, or Contents
remain audit gaps: run `oat-docs-analyze`, then `oat-docs-apply` for approved
repairs. Successful config/guidance setup does not prove full content conformity.
See [Markdown setup details](commands.md#oat-docs-init) for initial Contents
discovery and repair advice for optional child indexes and unreadable directories.

Incompatible declared tooling/root/index or unsafe paths are refused before
writes. Selecting a framework explicitly retains its existing replacement
prompt/`--yes` behavior, including over configured Markdown: config may change
while old Markdown files remain. This is not an automatic content migration.

Dry-run writes nothing. Manual-required or blocked guidance returns `partial`
and exit `1`; files/config are planned, not completed. A real partial run may
already have created baseline files and config: follow its reported state and
preserve those files when retrying. Converged repeated adoption returns `ok`,
exit `0`, and no changes.

Markdown indexes are authored. Optional inventories require external output:

```bash
oat docs generate-index --docs-dir handbook --output .oat/docs-manifest.md
```

Default generation is refused for configured Markdown. External output cannot
be inside the full configured content root or overwrite its authored index,
even with a narrowed `--docs-dir`. It never repoints `documentation.index`.

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

Use `oat-docs-authoring` for targeted OAT Markdown/Fumadocs content edits or local
restructuring. It uses `authoring-docs` for the portable documentation baseline
and adds the OAT-specific navigation, generated-index, and validation contract.

Core rules:

- every non-excluded Markdown-bearing docs directory should have an authored `index.md`
- preserve useful audience/scope context and nonempty title/description metadata
- honor asset-only exceptions, configured excludes, and existing local instructions
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
6. Check Markdown files/links, or refresh declared artifacts with `oat docs nav sync --target-dir apps/my-docs` (MkDocs) / `oat docs generate-index` (Fumadocs)
7. `/oat-docs-analyze`
8. `/oat-docs-apply`
9. Repeat as the codebase changes

## Related docs

- [`commands.md`](commands.md)
- [`workflows.md`](workflows.md)
- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)
