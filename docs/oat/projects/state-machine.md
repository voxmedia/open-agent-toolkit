# State Machine

## Workflow-level lifecycle

Typical state progression:

1. Discovery in progress
2. Ready for spec
3. Spec in progress
4. Ready for design
5. Design in progress
6. Ready for plan
7. Plan in progress
8. Ready for implement
9. Implement in progress
10. Complete

## Review lifecycle

In `plan.md` Reviews table:
- `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

## Key guardrail

State artifacts must stay consistent across `state.md`, `plan.md`, and `implementation.md` to avoid routing/checkpoint drift.
