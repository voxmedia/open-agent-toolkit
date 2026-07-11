---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_template: true
oat_template_name: smoke-fixture
oat_dispatch_policy:
  ceiling: high
  matrix:
    codex:
      candidates: [gpt-5.6-terra-medium]
    claude:
      candidates: [claude-4.6-sonnet-medium-thinking]
    cursor:
      candidates: [gpt-5.6-terra-medium]
      model: cursor-opaque-terra-medium
---

# Fixture State

Canonical `pre-review` state for the smoke fixture. The named `high` ceiling
is a budget maximum; each provider has a lower, exact candidate for observable
selection evidence.
