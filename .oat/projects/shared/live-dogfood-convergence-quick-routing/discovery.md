---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_inherited_context_revalidated: false
oat_generated: false
---

# Discovery: live-dogfood-convergence-quick-routing

## Origin

Split from coordination parent `live-dogfood-convergence-workflow-friction`.

## Inherited Context

Parent discovery identified quick-mode routing as independently shippable but dependent on config unset handling, because active project and config recovery determine the routing baseline.

## Child Scope

Improve quick-mode routing so terse lifecycle commands resolve active quick projects without unnecessary clarification churn.

## Known Dependencies

- live-dogfood-convergence-config-unset

## Assumptions To Revalidate

- Revalidate inherited context before completing discovery.

## Likely Workflow Mode

quick

## Sibling Projects

- live-dogfood-convergence-config-unset
- live-dogfood-convergence-staleness-threshold
