---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_generated: false
---

# Discovery: live-dogfood-convergence-workflow-friction

## Split Rationale

Origin: detected-convergence
Interactive: true
Why: Use the coordination parent to preserve broad workflow-friction context and lifecycle evidence quality. Child projects should revalidate inherited context before planning and can ship as separate PRs.

## Ordered Children

1. live-dogfood-convergence-config-unset: Improve config unset handling for required OAT workflow configuration so missing, invalid, or stale local config produces a clear recovery path.
   - Dependencies: None
   - Siblings: live-dogfood-convergence-quick-routing, live-dogfood-convergence-staleness-threshold
   - Inherited context: Parent discovery identified config unset handling as independently shippable workflow friction. It is the foundation child because quick routing depends on reliable active-project and config recovery.
2. live-dogfood-convergence-quick-routing: Improve quick-mode routing so terse lifecycle commands resolve active quick projects without unnecessary clarification churn.
   - Dependencies: live-dogfood-convergence-config-unset
   - Siblings: live-dogfood-convergence-config-unset, live-dogfood-convergence-staleness-threshold
   - Inherited context: Parent discovery identified quick-mode routing as independently shippable but dependent on config unset handling, because active project and config recovery determine the routing baseline.
3. live-dogfood-convergence-staleness-threshold: Clean up knowledge staleness threshold behavior so warnings are calibrated, actionable, and useful during discovery.
   - Dependencies: None
   - Siblings: live-dogfood-convergence-config-unset, live-dogfood-convergence-quick-routing
   - Inherited context: Parent discovery identified knowledge staleness threshold cleanup as independently shippable and suitable for a separate PR. The stale-knowledge warning from this dogfood run is evidence for this child.

## Inherited Broad Context

- live-dogfood-convergence-config-unset: Parent discovery identified config unset handling as independently shippable workflow friction. It is the foundation child because quick routing depends on reliable active-project and config recovery.
- live-dogfood-convergence-quick-routing: Parent discovery identified quick-mode routing as independently shippable but dependent on config unset handling, because active project and config recovery determine the routing baseline.
- live-dogfood-convergence-staleness-threshold: Parent discovery identified knowledge staleness threshold cleanup as independently shippable and suitable for a separate PR. The stale-knowledge warning from this dogfood run is evidence for this child.

## Shared Constraints

- Foundation child: live-dogfood-convergence-config-unset
- Initial active child: live-dogfood-convergence-config-unset

## Integration Sketch

Use the coordination parent to preserve broad workflow-friction context and lifecycle evidence quality. Child projects should revalidate inherited context before planning and can ship as separate PRs.
