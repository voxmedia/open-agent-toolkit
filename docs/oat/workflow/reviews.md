# Reviews

Review loop:

1. Request review (`oat-request-review`)
2. Receive and process findings (`oat-receive-review`)
3. Convert accepted findings into fix tasks
4. Implement fixes
5. Re-review until passing state

## Status model

Review status progression (in `plan.md` Reviews table):
- `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

Policy in current workflow:
- Critical/Important: required to address
- Medium: required unless explicitly approved for deferral
- Minor: default to address unless intentionally deferred
