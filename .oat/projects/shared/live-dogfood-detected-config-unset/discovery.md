---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_inherited_context_revalidated: false
oat_generated: false
---

# Discovery: live-dogfood-detected-config-unset

## Origin

Split from coordination parent `live-dogfood-detected-workflow-friction`.

## Inherited Context

Parent discovery identified config unset handling as independently shippable workflow friction. It is the foundation child because quick routing depends on reliable active-project/config recovery.

## Child Scope

Improve config unset handling for required OAT workflow configuration so missing or invalid local state produces clear recovery choices.

## Known Dependencies

- None.

## Assumptions To Revalidate

- Revalidate inherited context before completing discovery.

## Likely Workflow Mode

quick

## Sibling Projects

- live-dogfood-detected-quick-routing
- live-dogfood-detected-staleness-threshold
