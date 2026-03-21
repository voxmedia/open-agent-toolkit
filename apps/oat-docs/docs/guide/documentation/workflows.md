---
title: Docs Workflows
description: 'Docs CLI helpers and skills for analysis and controlled documentation updates.'
---

# Docs Workflows

OAT’s docs workflow combines deterministic CLI helpers with higher-judgment
skills for analysis and controlled updates.

Install the workflow skills with `oat tools install docs` (preferred) or
`oat init tools docs` before using the analyze/apply flow in a new repo.

## Docs workflow pieces

### CLI helpers

- `oat docs init` scaffolds a docs app (Fumadocs or MkDocs)
- `oat docs migrate` converts MkDocs admonitions to GFM callouts and injects frontmatter
- `oat docs generate-index` generates a docs index from the markdown file tree
- `oat docs nav sync` regenerates mkdocs.yml nav from `index.md` `## Contents` sections
- `oat docs analyze` and `oat docs apply` expose the workflow surface in CLI help

### Skills

- `oat-docs-analyze` evaluates a docs surface for structure, drift, coverage,
  contributor guidance, and docs-app contract issues
- `oat-docs-apply` consumes the analysis artifact and applies only approved,
  evidence-backed recommendations

## Contract model

The docs workflow mirrors the agent-instructions analyze/apply split:

- Analyze owns discovery, evidence gathering, confidence, and disclosure decisions
- Apply consumes the artifact, asks for approval, and must not invent new docs conventions

This keeps deterministic behavior in the CLI and judgment-heavy behavior in the
skills.

## Typical flow

1. Bootstrap a docs app with `oat docs init` (choose Fumadocs or MkDocs)
2. (Optional) If migrating from MkDocs: `oat docs migrate --docs-dir docs --config mkdocs.yml --apply`
3. Author docs so every directory has an `index.md` with a `## Contents` section
4. Keep local `## Contents` sections current
5. Sync navigation:
   - **MkDocs:** `oat docs nav sync`
   - **Fumadocs:** `oat docs generate-index` (runs automatically via `predev`/`prebuild` hooks)
6. Run `oat-docs-analyze`
7. Review the artifact and run `oat-docs-apply`

## Progressive disclosure

The docs workflow expects local indexes to guide discovery without forcing agents
to open every page.

- keep local topic summaries in `index.md`
- link to deeper setup/config/reference material when full detail is not needed inline
- let the analysis artifact decide what should be inline, link-only, omitted, or escalated to the user

## Related docs

- [`commands.md`](commands.md)
- [`quickstart.md`](quickstart.md)
- [`../../reference/docs-index-contract.md`](../../reference/docs-index-contract.md)
- [`../../contributing/skills.md`](../../contributing/skills.md)
