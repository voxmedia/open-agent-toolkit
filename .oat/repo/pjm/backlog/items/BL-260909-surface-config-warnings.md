---
id: BL-260909-surface-config-warnings
title: Surface config warnings on every reader path and document the warnings field
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - config
  - docs
  - cli
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:40.658Z
updated: 2026-09-09T08:35:40.658Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p08 (`2026-09-08-warn-when-documentation-root-is-unreadable.md`) deferred follow-ups. (1) Wire `readOatConfigWithWarnings` into `instructions.utils.ts` (~`:303`) so `oat instructions sync` / `validate` also warn on an unreadable `documentation.root`; add the corresponding sentence to `configuration.md`. (2) `config get` gained a second config read — share one read between `runGet` / `runList` and `resolveEffectiveConfig` (needs `resolve.ts`). (3) Pin that `config get <key> --json` carries the `documentation.root` warning. (4) A wrong-typed `documentation` container, `config dump`, and `instructions validate` stay silent today — decide per surface and pin. (5) Document the `warnings` JSON field on the config commands' reference page.

## Acceptance Criteria

- Every listed reader path either emits the warning or has a pinned, documented reason not to.
- `config get` performs one config read per invocation (control counts reads).
- The `warnings` JSON field is documented and pinned by a `--json` test.
