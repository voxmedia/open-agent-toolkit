---
id: BL-261001-escape-directive-like
title: Escape directive-like filenames in Fumadocs nav sync output
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - docs-cli
  - fumadocs
assignee: null
created: 2026-10-01T20:42:42.874Z
updated: 2026-10-01T20:42:42.874Z
associated_issues: []
external_plans: []
---

## Description

Deferred from the Wave 3 exit gate (`reviews/archived/final-review-2026-10-01T203319Z.md`,
M1). `oat docs nav sync` writes a Contents entry such as `[Hidden](!hidden.md)`
into Fumadocs `meta.json` as `"!hidden"`. Fumadocs 16.10.2 treats a leading
`!` as an exclusion directive (`fumadocs-core` loader), so the page is absent
from the sidebar, while the reachability calculation in
`packages/cli/src/commands/docs/nav/fumadocs.ts` (around 230 and 305) treats it
as a literal name, so sync and `--check` report no unlisted pages or drift.
Other directive prefixes (`...`, `z...a`, `[`, `---`) may collide the same way.
The real loader accepts the local-path form `./!hidden`. No shipped docs page
is affected (all 70 `apps/oat-docs` pages appear in the tree).

## Acceptance Criteria

- Local page and folder entries are written so Fumadocs cannot read them as
  directives (for example the `./name` form), and reachability uses the same
  form.
- A regression lists a directive-prefixed filename and asserts, through the
  real loader, that it appears in the primary tree and that `--check` agrees.
