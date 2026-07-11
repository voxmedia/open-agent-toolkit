---
oat_status: complete
oat_template: false
---

# Discovery: Smoke Fixture

## Goal

Exercise OAT lifecycle orchestration with deterministic, isolated tasks.

## Decision

The fixture contains three phases with three tasks each. `p01` and `p02` may
run in parallel because each task appends only to that phase's dedicated log;
`p03` is the sequential fan-in phase.
