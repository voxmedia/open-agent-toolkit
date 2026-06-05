---
id: bl-4b5a
title: 'Clarify docs generate-index ordering semantics'
status: open
priority: low
scope: task
scope_estimate: S
labels: [docs, docs-generation, cli, fumadocs]
assignee: null
created: '2026-06-05T19:54:56Z'
updated: '2026-06-05T19:54:56Z'
associated_issues: []
oat_template: false
---

## Description

After restoring authored `## Contents` maps in the OAT Fumadocs docs app, the regenerated root manifest still follows the `oat docs generate-index` tree sorting behavior instead of the authored top-level `docs/index.md` order.

This is not a rendered-navigation bug. The Fumadocs app builds its live page tree from `fumadocs-mdx` over `apps/oat-docs/docs`, not from the generated app-root `apps/oat-docs/index.md`. The issue is only that the generated inventory can be read as if it preserves authored map order unless the docs and command help make the sorting semantics explicit.

Exact evidence from the 2026-06-05 docs cleanup:

- Authored `apps/oat-docs/docs/index.md` lists top-level entries as Quickstart, User Guide, Provider Sync, Agentic Workflows, Docs Tooling, CLI Utilities, Contributing, and Reference.
- Regenerated `apps/oat-docs/index.md` lists directories in generator order: CLI Utilities, Contributing, Docs Tooling, Guide, Provider Sync, Reference, Workflows, then Quickstart.
- The command used was `pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`, which reported `Generated index with 9 entries`.

The generated manifest is fresh and includes the right pages, but the ordering divergence can mislead agents that expect the generated root inventory to reflect the authored local map order.

## Acceptance Criteria

- [ ] Docs and command help clearly state that `oat docs generate-index` emits a generated inventory sorted by tree rules, not by authored `## Contents` order.
- [ ] Tests cover at least one docs tree where authored `## Contents` order differs from lexical/tree order.
- [ ] OAT docs explain that the generated app-root `index.md` is not the rendered Fumadocs sidebar/page-tree source.
- [ ] Optional: evaluate whether a future `--order authored` mode would be useful for agent-facing generated inventories.
