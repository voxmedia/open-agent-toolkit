---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_inherited_context_revalidated: false
oat_generated: false
---

# Discovery: live-dogfood-convergence-config-unset

## Origin

Split from coordination parent `live-dogfood-convergence-workflow-friction`.

## Inherited Context

Parent discovery identified config unset handling as independently shippable workflow friction. It is the foundation child because quick routing depends on reliable active-project and config recovery.

## Child Scope

Improve config unset handling for required OAT workflow configuration so missing, invalid, or stale local config produces a clear recovery path.

## Known Dependencies

- None.

## Assumptions To Revalidate

- Revalidate inherited context before completing discovery.

## Likely Workflow Mode

quick

## Sibling Projects

- live-dogfood-convergence-quick-routing
- live-dogfood-convergence-staleness-threshold
