---
title: State Machine
description: 'Workflow and review state transitions across lifecycle phases and checkpoints.'
---

# State Machine

## Lifecycle progression

Typical progression:

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

## Review progression

In `plan.md` Reviews table:

- `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

## Guardrail

Do not move to the next lifecycle state if review/state artifacts indicate unresolved gates.

## Reference artifacts

- `.oat/projects/<scope>/<project>/state.md`
- `.oat/projects/<scope>/<project>/plan.md` (`## Reviews`)
- `.oat/projects/<scope>/<project>/implementation.md`
