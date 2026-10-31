---
id: BL-260726-validate-cursor-pin-effort
title: Validate Cursor pin effort rungs at sync time
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - cursor
  - dispatch
  - validation
assignee: null
created: 2026-07-26T00:23:22.505Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

Cursor silently substitutes a default when it cannot resolve a pin component. An unknown family falls back to the default model (claude-opus-9[effort=high] resolved to cursor-grok-4.5-high-fast) and an unknown effort falls back to the family default rung (claude-opus-5[effort=ultra] resolved to claude-opus-5-thinking-high). No error or warning is surfaced. The default rung is family-specific and not always high: Opus 4.7 defaults to xhigh while Opus 5 defaults to high. A typo in a pinned selector therefore ships a working-but-wrong model that silently tracks a vendor-side default. Validate frontmatterModel effort values against the known rung set during sync or catalog validation so a typo fails loudly. Evidence: .oat/projects/shared/opus-5-model-guidance/references/g01-probe-results.md

**Delivery status (2026-10-31):** Landed: probe-record consistency. Sync
rejects a direct-ID pin whose probe record is missing or names a different
resolved model, and a mapping without gate approval (#178, `61e1d4c11`;
`packages/cli/src/providers/cursor/codec/sync-extension.test.ts:304`).
Remaining: family-aware rung validation of `frontmatterModel`; most mappings
carry no probe record, so the consistency check alone does not catch a typo.

## Acceptance Criteria

- Catalog validation parses each `frontmatterModel` into its family and effort
  components and checks both against the known Cursor rung set.
- An unknown family or an effort value outside that family's rungs fails
  loudly — a hard error during catalog validation, and a clear message naming
  the offending selector and the valid rungs for that family.
- Validation is family-aware rather than assuming a shared rung set, since
  rungs differ by family and the default rung is not uniformly `high`
  (Opus 4.7 defaults to `xhigh`, Opus 5 to `high`).
- Regression tests cover a valid selector, an unknown family, an unknown
  effort, and a selector whose requested rung equals its family default — the
  last because a default-rung result cannot by itself prove the effort
  parameter was honored.
