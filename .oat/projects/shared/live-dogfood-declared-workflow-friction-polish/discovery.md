---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_generated: false
---

# Discovery: live-dogfood-declared-workflow-friction-polish

## Split Rationale

Origin: declared
Interactive: true
Why: Keep the children independently shippable. The only sequencing constraint is config semantics before quick-mode routing wording; staleness threshold messaging can proceed independently. Avoid creating a shared design surface across the three children.

## Ordered Children

1. live-dogfood-declared-config-unset: Foundation child: handle unset config values cleanly and define status semantics.
   - Dependencies: None
   - Siblings: live-dogfood-declared-quick-routing, live-dogfood-declared-staleness-threshold
   - Inherited context: Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child owns clean unset config handling and status semantics that downstream routing wording can rely on.
2. live-dogfood-declared-quick-routing: Depends on config-unset: ensure quick-mode projects route to the right next skill.
   - Dependencies: live-dogfood-declared-config-unset
   - Siblings: live-dogfood-declared-config-unset, live-dogfood-declared-staleness-threshold
   - Inherited context: Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child should revalidate config semantics from live-dogfood-declared-config-unset before tightening quick-mode next-skill routing.
3. live-dogfood-declared-staleness-threshold: Independent child: tune knowledge staleness threshold messaging.
   - Dependencies: None
   - Siblings: live-dogfood-declared-config-unset, live-dogfood-declared-quick-routing
   - Inherited context: Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child is independent of the config and quick-routing sequence and owns knowledge staleness threshold messaging cleanup.

## Inherited Broad Context

- live-dogfood-declared-config-unset: Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child owns clean unset config handling and status semantics that downstream routing wording can rely on.
- live-dogfood-declared-quick-routing: Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child should revalidate config semantics from live-dogfood-declared-config-unset before tightening quick-mode next-skill routing.
- live-dogfood-declared-staleness-threshold: Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child is independent of the config and quick-routing sequence and owns knowledge staleness threshold messaging cleanup.

## Shared Constraints

- Foundation child: live-dogfood-declared-config-unset
- Initial active child: live-dogfood-declared-config-unset

## Integration Sketch

Keep the children independently shippable. The only sequencing constraint is config semantics before quick-mode routing wording; staleness threshold messaging can proceed independently. Avoid creating a shared design surface across the three children.
