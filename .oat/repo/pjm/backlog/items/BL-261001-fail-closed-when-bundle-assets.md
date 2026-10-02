---
id: BL-261001-fail-closed-when-bundle-assets
title: Fail closed when bundle-assets lookups come back empty
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - cli
  - build
  - safety
assignee: null
created: 2026-10-01T19:19:36.657Z
updated: 2026-10-01T19:19:36.657Z
associated_issues: []
external_plans: []
---

## Description

`packages/cli/scripts/bundle-assets.sh` builds source paths as
`DOCS_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get docsRoot)"` (and the same
for the migration prompt and dispatch matrix). When the `node ... --get` call
prints nothing, the path collapses to the repository root and
`cp -R "${DOCS_SOURCE}/." "${STAGING}/docs/"` copies the whole repository into
its own staging directory, recursing until the disk fills. Observed 2026-10-01
in Wave 3 (p05-t03): `pnpm run worktree:init` in a probe worktree with a
throwaway `HOME` hit "No space left on device"; the implementer killed it.

## Acceptance Criteria

- `bundle-assets.sh` fails with a clear error when any inventory lookup prints
  nothing or resolves to the repository root, instead of copying.
- Staging is never inside a copied source tree.
- A test (or script check) reproduces the empty-lookup case and shows it
  fails closed.
