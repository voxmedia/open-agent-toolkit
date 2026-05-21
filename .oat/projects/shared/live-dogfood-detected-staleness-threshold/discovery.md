---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_inherited_context_revalidated: false
oat_generated: false
---

# Discovery: live-dogfood-detected-staleness-threshold

## Origin

Split from coordination parent `live-dogfood-detected-workflow-friction`.

## Inherited Context

Parent discovery identified knowledge staleness threshold cleanup as independently shippable and suitable for a separate PR. The stale-knowledge warning from this dogfood run is evidence for this child.

## Child Scope

Clean up knowledge staleness threshold behavior so warnings are calibrated, actionable, and useful during discovery.

## Known Dependencies

- None.

## Assumptions To Revalidate

- Revalidate inherited context before completing discovery.

## Likely Workflow Mode

quick

## Sibling Projects

- live-dogfood-detected-config-unset
- live-dogfood-detected-quick-routing
