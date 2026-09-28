---
id: BL-260830-persist-instruction-sync
title: Persist instruction sync strategy in config and init
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - provider-sync
  - instructions
  - config
  - onboarding
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:53.128Z
updated: 2026-09-28T00:44:49.000Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-28ce. Persist the pointer, symlink, or copy strategy in configuration and expose the choice during initialization.

Note 2026-09-27: `BL-260927-make-claude-md-shims-opt` changes the default
strategy to no shims (operator direction) and persists the strategy in
`.oat/config.json`. It expects to absorb this item; the migration criterion
below conflicts with the new default and is resolved there. Do not plan this
item separately.

## Disposition

Absorbed by `BL-260927-make-claude-md-shims-opt` (backlog-wave-2, p02). One
line per acceptance criterion below:

- Persist a validated strategy — project configuration: delivered by p02-t01 as `documentation.instructionSyncStrategy` in `.oat/config.json` (`none | pointer | symlink | copy`, validated fail-closed, set with `oat config set/get/unset`). User configuration: dropped, because shims are a per-repository choice under the new default.
- Init exposes the choice: dropped. The default is `none`, and opting in is one `oat config set documentation.instructionSyncStrategy <strategy>`, so no init prompt is needed.
- Precedence and effective-strategy reporting: delivered by p02-t01. `oat instructions sync` and `oat instructions validate` both resolve `--strategy`, then the configured key, then the built-in default, and report the effective strategy as `strategy` in `--json` and human output.
- Migration preserves existing installations: superseded by `DR-260927-claude-md-shims-are-opt`, under which a non-dry-run sync automatically removes OAT-managed shims instead of preserving them.

## Acceptance Criteria

- Project and user configuration can persist a validated pointer, symlink, or copy strategy.
- Init exposes the choice and non-interactive execution has a documented deterministic default.
- Sync resolves precedence consistently and status reports the effective strategy.
- Migration preserves existing installations unless the operator changes configuration.
