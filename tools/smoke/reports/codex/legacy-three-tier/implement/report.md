# Smoke Evidence Report

**Scenario:** implement
**Status:** passed
**Assertions:** 9 passed / 0 failed
**Bundle SHA-256:** 4e3a69c52024ed85ae11cbc2c240561961395913a841a0030453edf98df9770a
**Authority:** `report.json` is authoritative; this Markdown is a derived view.

| Assertion                                 | Severity  | Status | Description                                                                                  |
| ----------------------------------------- | --------- | ------ | -------------------------------------------------------------------------------------------- |
| manifest-ready                            | important | passed | Provisioning manifest is ready for the selected scenario.                                    |
| implement-dispatch-completeness           | important | passed | Every one of the five fixture tasks has exactly one accepted completed launch.               |
| implement-exact-target-within-ceiling     | important | passed | Every task records an exact selected target at or below the named ceiling.                   |
| implement-fixture-markers-and-commits     | important | passed | Every task has exactly one fixture marker and one exact task commit.                         |
| implement-parallel-isolation              | important | passed | Parallel phases used disjoint writes, separate worktrees, and flat branch names.             |
| implement-fan-in-reconciliation           | important | passed | Fan-in completed after all declared dependencies.                                            |
| review-gate-corroborated-implementation   | important | passed | Every required gate review exactly matches gate-owned invocation and corroboration evidence. |
| review-disposition-durable-implementation | important | passed | Every required review has a durable artifact commit and terminal plan row.                   |
| implement-runtime-identity-status         | important | passed | Runtime identity is recorded or explicitly marked not-reported.                              |

## Evidence

### manifest-ready

```json
{
  "appliedScenario": "implement",
  "provisioningState": "ready",
  "readiness": {
    "status": "ready"
  }
}
```

### implement-dispatch-completeness

```json
{
  "failingTasks": [],
  "taskIds": ["p01-t01", "p01-t02", "p02-t01", "p02-t02", "p03-t01"]
}
```

### implement-exact-target-within-ceiling

```json
{
  "failingScopes": []
}
```

### implement-fixture-markers-and-commits

```json
{
  "commitFailures": [],
  "markerFailures": []
}
```

### implement-parallel-isolation

```json
{
  "journalBranches": [
    "smoke-automated-2026-07-12T20-55-25-660Z-955f7961-07a3-487e-b804-9bba1e7dc994-p01",
    "smoke-automated-2026-07-12T20-55-25-660Z-955f7961-07a3-487e-b804-9bba1e7dc994-p02"
  ],
  "mergeIndexes": {
    "p01": 4,
    "p02": 8
  },
  "phaseStarts": {
    "p01": "ae636cc88e2f86bd237a6ad015fe9817bbd16b6b",
    "p02": "ae636cc88e2f86bd237a6ad015fe9817bbd16b6b"
  },
  "phaseBranches": {
    "p01": "smoke-automated-2026-07-12T20-55-25-660Z-955f7961-07a3-487e-b804-9bba1e7dc994-p01",
    "p02": "smoke-automated-2026-07-12T20-55-25-660Z-955f7961-07a3-487e-b804-9bba1e7dc994-p02"
  }
}
```

### implement-fan-in-reconciliation

```json
{
  "indexes": {
    "p01-t01": 1,
    "p01-t02": 2,
    "p02-t01": 5,
    "p02-t02": 6,
    "p03-t01": 11
  }
}
```

### review-gate-corroborated-implementation

```json
{
  "matchedScopes": ["final"],
  "requiredScopes": ["final"]
}
```

### review-disposition-durable-implementation

```json
{
  "durableScopes": ["final"],
  "requiredScopes": ["final"]
}
```

### implement-runtime-identity-status

```json
{
  "invalidScopes": []
}
```
