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
- `oat docs generate-index` generates a Fumadocs app-root docs index manifest from the Markdown file tree
- `oat docs nav sync` regenerates MkDocs `mkdocs.yml` nav from `index.md` `## Contents` sections
- `oat docs analyze` and `oat docs apply` expose the workflow surface in CLI help

### Skills

- `authoring-docs` is the provider-agnostic baseline for evidence-first
  technical documentation: page types, information architecture, category
  guidance, templates, and review rubrics
- `oat-docs-authoring` layers the OAT/Fumadocs docs-app contract on top of
  `authoring-docs` for targeted authoring, restructuring, link repair, and
  local navigation maintenance inside an existing OAT docs app
- `oat-docs-bootstrap` is the guided onramp for adding a docs app to a repo —
  wraps `oat docs init` with preflight detection, richer input gathering (site
  name distinct from package name), labeled post-patches for open CLI gaps,
  build verification, config inspection, and an educational walkthrough
- `oat-docs-analyze` evaluates a docs surface for structure, drift, coverage,
  contributor guidance, and docs-app contract issues, then runs the shared
  auto artifact-review loop to verify the generated analysis artifact's
  evidence, severities, and recommendations
- `oat-docs-apply` consumes the analysis artifact and applies only approved,
  evidence-backed recommendations
- `oat-project-document` performs post-implementation docs sync for a tracked project,
  including finding missing coverage for newly shipped capability areas and
  recommending new docs pages or directories when existing docs do not provide
  a natural home. See the [project lifecycle post-implementation flow](../workflows/projects/lifecycle.md#post-implementation-flow)
  for where this runs in the tracked project flow.

## Contract model

The docs workflow mirrors the agent-instructions analyze/apply split:

- Analyze owns discovery, evidence gathering, confidence, and disclosure decisions
- Analyze also owns accuracy verification of the generated analysis artifact
  through the shared auto artifact-review loop before the apply workflow consumes
  it
- Apply consumes the artifact, asks for approval, and must not invent new docs conventions

This keeps deterministic behavior in the CLI and judgment-heavy behavior in the
skills.

## Typical flow

1. Bootstrap a docs app with `oat-docs-bootstrap` (preferred — guided, includes post-scaffold patches and walkthrough) or `oat docs init` directly (CLI-only / non-interactive workflows)
2. (Optional) If migrating from MkDocs, handle that as a separate migration workstream; `oat docs migrate --docs-dir docs --config mkdocs.yml --apply` is only the syntax/frontmatter helper
3. Use `oat-docs-authoring` for targeted OAT/Fumadocs authoring work, with `authoring-docs` as the universal documentation-quality baseline
4. Author docs so every directory has an `index.md` with a `## Contents` section
5. Keep local `## Contents` sections current
6. Refresh generated artifacts:
   - **MkDocs:** `oat docs nav sync`
   - **Fumadocs:** `oat docs generate-index` (runs automatically via `predev`/`prebuild` hooks)
7. Run `oat-docs-analyze`; by default it verifies the generated analysis artifact
   through `workflow.autoArtifactReview.analysis`
8. Review the artifact and run `oat-docs-apply`

## Progressive disclosure

The docs workflow expects local indexes to guide discovery without forcing agents
to open every page.

- keep local topic summaries in `index.md`
- link to deeper setup/config/reference material when full detail is not needed inline
- let the analysis artifact decide what should be inline, link-only, omitted, or escalated to the user

## Related docs

- [`commands.md`](commands.md)
- [`add-docs-to-a-repo.md`](add-docs-to-a-repo.md)
- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)
- [`../contributing/skills.md`](../contributing/skills.md)
