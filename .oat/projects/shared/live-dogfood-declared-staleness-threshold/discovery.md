---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_inherited_context_revalidated: false
oat_generated: false
---

# Discovery: live-dogfood-declared-staleness-threshold

## Origin

Split from coordination parent `live-dogfood-declared-workflow-friction-polish`.

## Inherited Context

Workflow-friction polish from the OAT workflow backlog. Shared constraint: keep this child independently shippable and avoid creating a shared design surface. This child is independent of the config and quick-routing sequence and owns knowledge staleness threshold messaging cleanup.

## Child Scope

Independent child: tune knowledge staleness threshold messaging.

## Known Dependencies

- None.

## Assumptions To Revalidate

- Revalidate inherited context before completing discovery.

## Likely Workflow Mode

quick

## Sibling Projects

- live-dogfood-declared-config-unset
- live-dogfood-declared-quick-routing
