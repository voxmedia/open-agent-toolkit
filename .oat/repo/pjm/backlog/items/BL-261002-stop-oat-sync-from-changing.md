---
id: BL-261002-stop-oat-sync-from-changing
title: Stop oat sync from changing user values in .codex/config.toml
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - sync
  - provider-sync
  - codex
  - config
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:51.027Z
updated: 2026-10-02T18:40:51.027Z
associated_issues: []
external_plans: []
---

## Description

`oat sync` upserts two user settings in an existing `.codex/config.toml`
without asking: it sets `[features] multi_agent = true` and raises
`[agents] max_depth` to at least 2. In the reproduction a user's
`multi_agent = false` became `true` and `max_depth = 1` became `2`. Other user
keys (`model`, `[mcp_servers.*]`) were kept.

Why it matters: a user or team that deliberately turned off Codex multi-agent
execution, or limited nesting depth, has that choice reversed on every sync,
with no message. `provider-sync/providers.md` describes the capability floor,
but the adoption-facing pages said "your settings stay".

Reproduced with the branch CLI. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/editorial/fact-sheet-pages.verify.md` (finding W1; untracked
in the project when this item was filed).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry A3.

## Acceptance Criteria

- `oat sync` never lowers or overrides a value the user set explicitly for
  `[features] multi_agent` or `[agents] max_depth`. Where OAT needs a higher
  value, sync reports the conflict (and, where appropriate, refuses the Codex
  role step) instead of rewriting the user's value. Alternatively, a decision
  record states that OAT owns these keys, and sync prints what it changed.
- Absent keys may still be added, and the output names each key added.
- A regression test seeds `multi_agent = false` and `max_depth = 1` and asserts
  the chosen behavior; it fails if the silent rewrite returns.
- The docs branch `docs-overhaul-readme-visual` pages describing Codex config (`reference/what-oat-writes.md:90`,
  `provider-sync/pilot-with-a-team.md:184`, `provider-sync/providers.md:60-73`)
  match the shipped behavior.
