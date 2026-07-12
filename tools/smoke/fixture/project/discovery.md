---
oat_status: complete
oat_template: false
---

# Discovery: Smoke Fixture

## Goal

Exercise OAT lifecycle orchestration with deterministic, isolated tasks.

## Decision

The fixture contains five tasks across three phases: two tasks each in `p01`
and `p02`, plus one task in `p03`. `p01` and `p02` may run in parallel because
each task appends only to that phase's dedicated log; `p03` is the sequential
fan-in phase.
