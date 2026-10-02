---
id: BL-261002-fix-oat-config-describe-gaps
title: Fix oat config describe gaps and make config unset reach the layer that
  holds the key
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - config
  - cli
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:03.872Z
updated: 2026-10-02T18:41:03.872Z
associated_issues: []
external_plans: []
---

## Description

- **D3. `oat config describe` gaps.** It has no entries for Cursor ladder
  columns, tier cells or `recommendationVersion`, although `oat config set`
  accepts them; it names `oat providers set` as the owner of the sync strategy
  (that command cannot set it); it lists `tools.<pack>` as living only in
  `.oat/config.json` although user-scope installs write `~/.oat/config.json`;
  it names `oat config set` as the owner of `pjm.remote.storage.state` although
  `config set` refuses `shared`; and it lists the provider `description`
  default as `none` although an unset value inherits the repository value.
- **D4. `oat config unset` with no layer flag only clears local config**
  (`commands/config/index.ts:1577,2935,4102-4128`), so unsetting a user- or
  shared-level key silently does nothing.

Why it matters: `config describe` is the place users go to find out where a
setting lives and how to change it; wrong answers send them to commands that
cannot work. A silent no-op `unset` leaves users believing a setting was
removed.

Confirmed by reading source and `config describe` output (not a full
reproduction of D4). Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/E-pjm-remote-backlog.verify.md`,
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/C-provider-sync.verify.md` (finding (d)),
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/F-config-scopes-packs-docs.verify.md`.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry D3, D4.

## Acceptance Criteria

- Every key `oat config set` accepts has a `config describe` entry, and each
  entry's owner command, file locations and default are correct (a test
  cross-checks the describe catalog against the set allowlist).
- `oat config unset <key>` with no layer flag either clears the layer that
  currently supplies the value or exits non-zero naming that layer; it never
  reports success after changing nothing. A regression test covers a
  user-level and a shared-level key.
- `reference/configuration.md` and `reference/cli-reference.md` on the docs branch `docs-overhaul-readme-visual`
  match the fixed behavior.
