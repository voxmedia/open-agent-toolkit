---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_generated: false
---

# Discovery: live-dogfood-detected-workflow-friction

## Split Rationale

Origin: detected-mid-stream
Interactive: true
Why: Use the coordination parent to preserve broad workflow-polish context and lifecycle evidence quality. Child projects should revalidate inherited context before planning and can ship as separate PRs.

## Ordered Children

1. live-dogfood-detected-config-unset: Improve config unset handling for required OAT workflow configuration so missing or invalid local state produces clear recovery choices.
   - Dependencies: None
   - Siblings: live-dogfood-detected-quick-routing, live-dogfood-detected-staleness-threshold
   - Inherited context: Parent discovery identified config unset handling as independently shippable workflow friction. It is the foundation child because quick routing depends on reliable active-project/config recovery.
2. live-dogfood-detected-quick-routing: Improve quick-mode routing so terse lifecycle commands resolve active quick projects without unnecessary clarification churn.
   - Dependencies: live-dogfood-detected-config-unset
   - Siblings: live-dogfood-detected-config-unset, live-dogfood-detected-staleness-threshold
   - Inherited context: Parent discovery identified quick-mode routing as independently shippable but dependent on config unset handling, because active project/config recovery determines the routing baseline.
3. live-dogfood-detected-staleness-threshold: Clean up knowledge staleness threshold behavior so warnings are calibrated, actionable, and useful during discovery.
   - Dependencies: None
   - Siblings: live-dogfood-detected-config-unset, live-dogfood-detected-quick-routing
   - Inherited context: Parent discovery identified knowledge staleness threshold cleanup as independently shippable and suitable for a separate PR. The stale-knowledge warning from this dogfood run is evidence for this child.

## Inherited Broad Context

- live-dogfood-detected-config-unset: Parent discovery identified config unset handling as independently shippable workflow friction. It is the foundation child because quick routing depends on reliable active-project/config recovery.
- live-dogfood-detected-quick-routing: Parent discovery identified quick-mode routing as independently shippable but dependent on config unset handling, because active project/config recovery determines the routing baseline.
- live-dogfood-detected-staleness-threshold: Parent discovery identified knowledge staleness threshold cleanup as independently shippable and suitable for a separate PR. The stale-knowledge warning from this dogfood run is evidence for this child.

## Shared Constraints

- Foundation child: live-dogfood-detected-config-unset
- Initial active child: live-dogfood-detected-config-unset

## Integration Sketch

Use the coordination parent to preserve broad workflow-polish context and lifecycle evidence quality. Child projects should revalidate inherited context before planning and can ship as separate PRs.
