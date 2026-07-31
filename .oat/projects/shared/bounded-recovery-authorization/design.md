---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-31
oat_generated: false
oat_template: true
oat_template_name: design
---

# Design: bounded-recovery-authorization

## Overview

The change combines prevention with bounded recovery. Before each planned task
commit, the phase implementer runs the task's declared verification plus every
applicable check that is discoverable and proportionate to that task's changed
surface. Broad tests and builds remain phase-level when running them per task
would be disproportionate. This ordering catches task-local defects before
history is written without pretending that lint or type-check can detect
composition failures such as missing build output.

When task-transition or phase verification discovers an obvious in-scope
defect after commit, the already-authorized phase continues on the same
implementation target and creates a separate recovery commit. The accepted
task commit is never amended. Recovery is automatic only while scope,
mechanical certainty, safety, target identity, verification evidence, and the
project-level retry budget all remain valid; otherwise the phase stops for
operator direction.

The contracts explicitly distinguish three cases: accepted-launch route/model
replacement remains forbidden; bounded same-target append-only repair is a
continuation under existing phase authority; and consequential or
scope-expanding recovery requires new user direction. Canonical assets own this
policy, provider agents are regenerated views, and behavioral contract tests
pin both the allowed recovery path and every stop boundary.

## Architecture

_Pending collaborative validation._

## Component Design

_Pending collaborative validation._

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._

## References

- Discovery: `discovery.md`
