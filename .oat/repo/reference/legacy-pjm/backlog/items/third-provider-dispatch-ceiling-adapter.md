---
id: bl-c3d8
title: 'Third-provider dispatch-ceiling adapter (e.g. Cursor)'
status: open # open | in_progress | closed | wont_do
priority: low # urgent | high | medium | low | none
priority_reviewed: '2026-05-29'
scope: feature # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: ['dispatch-ceiling', 'provider-interop', 'follow-up']
assignee: null
created: '2026-05-29T04:30:00Z'
updated: '2026-05-29T04:30:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

`dispatch-ceiling-ux` (ADR-019) introduced a provider adapter registry
(`packages/cli/src/providers/ceiling/registry.ts`) that declares per-provider
ceiling enforcement: Codex → pinned variants, Claude → per-call Task `model`,
and unknown providers → advisory. The registry left a clean extension point but
ships with only the codex and claude adapters; any other provider currently
resolves to `advisory` (the ceiling is recorded as intent but not enforced).

This item tracks adding a real adapter for a third provider — Cursor is the
likely first candidate — so its dispatch is enforced rather than advisory.

**Origin:** Explicitly out of scope for `dispatch-ceiling-ux` (see its
`design.md` Out of Scope + Open Questions, and `discovery.md`). The registry was
built to make this a drop-in addition without schema changes.

## Acceptance Criteria

- A new `ProviderCeilingAdapter` for the target provider is registered, declaring
  `supportsCeiling`, `validValues`, `mechanism`, and `compileToDispatchArgs(value, role, ctx)`.
- The resolver (`oat project dispatch-ceiling resolve`) returns the provider's
  `mode` as `enforced` (not `advisory`) when a value resolves, with the correct
  `dispatchArgs`.
- Verify-on-upgrade behaves correctly for the provider's tier ordering (or is
  documented as not-applicable if the provider has no tier upgrade concept).
- Lifecycle skill dispatch + the enforced/advisory/unsupported logs reflect the
  new mechanism without provider-specific branching in the skills.
- Unit coverage mirrors the codex/claude adapter tests; no migration of stored
  ceilings is required (the `providers.*` shape already accommodates new keys).

## Notes

- Decide whether the third provider's valid values need their own preset-table
  column or whether presets remain codex/claude-only with the new provider set
  via advanced/manual selection.
