---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_generated: false
---

# Discovery: dogfood-declared-workflow-friction-polish

## Split Rationale

Origin: declared
Interactive: true
Why: Ship the config command first, then use the clarified config semantics for quick-mode routing guidance and staleness-threshold configuration.

## Ordered Children

1. dogfood-config-unset: Add an oat config unset command for removing config values.
   - Dependencies: None
   - Siblings: dogfood-quick-routing, dogfood-staleness-threshold
   - Inherited context: Backlog quick-win batch context: remove workflow friction by adding a small config mutation helper.
2. dogfood-quick-routing: Clarify quick-mode resume routing from oat-project-plan.
   - Dependencies: dogfood-config-unset
   - Siblings: dogfood-config-unset, dogfood-staleness-threshold
   - Inherited context: Backlog quick-win batch context: clarify quick-mode routing once config helper assumptions are known.
3. dogfood-staleness-threshold: Add configurable staleness threshold to oat config.
   - Dependencies: dogfood-config-unset
   - Siblings: dogfood-config-unset, dogfood-quick-routing
   - Inherited context: Backlog quick-win batch context: add a user-configurable threshold after config command semantics are clear.

## Inherited Broad Context

- dogfood-config-unset: Backlog quick-win batch context: remove workflow friction by adding a small config mutation helper.
- dogfood-quick-routing: Backlog quick-win batch context: clarify quick-mode routing once config helper assumptions are known.
- dogfood-staleness-threshold: Backlog quick-win batch context: add a user-configurable threshold after config command semantics are clear.

## Shared Constraints

- Foundation child: dogfood-config-unset
- Initial active child: dogfood-config-unset

## Integration Sketch

Ship the config command first, then use the clarified config semantics for quick-mode routing guidance and staleness-threshold configuration.
