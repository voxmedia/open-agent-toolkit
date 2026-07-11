---
oat_current_task: null
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_template: true
oat_template_name: smoke-fixture
oat_kind: implementation
oat_phase: plan
oat_phase_status: in_progress
oat_dispatch_policy:
  mode: managed
  policy: high
  matrix:
    codex:
      balanced:
        candidates:
          - harness: codex
            model: gpt-5.6-terra
            effort: medium
      high:
        candidates:
          - harness: codex
            model: gpt-5.6-sol
            effort: high
    claude:
      balanced:
        candidates:
          - sonnet
      high:
        candidates:
          - opus
    cursor:
      balanced:
        candidates:
          - fixture-cursor-opaque-medium
      high:
        candidates:
          - fixture-cursor-opaque-high
  source: project-state
oat_workflow_mode: quick
oat_workflow_origin: native
oat_generated: false
---

# Fixture State

Canonical `pre-review` state for the smoke fixture. The named `high` ceiling
is a budget maximum. Its sparse provider matrix declares eligible lower
candidates and valid High-tier ceiling targets; launch resolution records the
exact selected target separately.
