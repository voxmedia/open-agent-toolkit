# Smoke Evidence Report

**Scenario:** implement
**Status:** passed
**Assertions:** 10 passed / 0 failed
**Bundle SHA-256:** 0bf523ad84e1e776b7e19bf259f4f959a3dfe7274e6f4c4779b70209e9476328
**Authority:** `report.json` is authoritative; this Markdown is a derived view.

| Assertion                                 | Severity  | Status | Description                                                                                                                                                                                      |
| ----------------------------------------- | --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| manifest-ready                            | important | passed | Provisioning manifest is ready for the selected scenario.                                                                                                                                        |
| implement-dispatch-completeness           | important | passed | Every phase has one accepted completed phase implementer and reviewer launch; retained schema-v1 evidence does not prove direct-root ownership.                                                  |
| implement-exact-target-within-ceiling     | important | passed | Every phase implementer, reviewer, and optional nested launch records an exact target at or below the named ceiling.                                                                             |
| implement-fixture-markers-and-commits     | important | passed | Every task has exactly one fixture marker and one exact task commit.                                                                                                                             |
| implement-parallel-isolation              | important | passed | Parallel phases used disjoint writes, separate worktrees, and flat branch names.                                                                                                                 |
| implement-fan-in-reconciliation           | important | passed | Fan-in completed after all declared dependencies.                                                                                                                                                |
| implement-phase-review-acceptance-bound   | important | passed | Every phase reviewer dispatch has exactly one passed row and scoped artifact bound byte-for-byte to reachable fixture history; retained schema-v1 evidence does not prove direct-root ownership. |
| review-gate-corroborated-implementation   | important | passed | Every required gate review exactly matches gate-owned invocation and corroboration evidence.                                                                                                     |
| review-disposition-durable-implementation | important | passed | Every required review has a durable artifact commit and terminal plan row.                                                                                                                       |
| implement-runtime-identity-status         | important | passed | Runtime identity is recorded or explicitly marked not-reported.                                                                                                                                  |

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
  "failingDispatches": [],
  "ownershipEvidence": "unavailable-schema-v1",
  "ownershipFailures": [],
  "phaseIds": ["p01", "p02", "p03"],
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
    "smoke-automated-2026-07-13T00-28-52-722Z-80480da7-aa2f-48fb-8d1e-2d1a0163c55a-p01",
    "smoke-automated-2026-07-13T00-28-52-722Z-80480da7-aa2f-48fb-8d1e-2d1a0163c55a-p02"
  ],
  "mergeIndexes": {
    "p01": 4,
    "p02": 8
  },
  "phaseStarts": {
    "p01": "84354cad693b43a71b7961a35938761f241365b8",
    "p02": "84354cad693b43a71b7961a35938761f241365b8"
  },
  "phaseBranches": {
    "p01": "smoke-automated-2026-07-13T00-28-52-722Z-80480da7-aa2f-48fb-8d1e-2d1a0163c55a-p01",
    "p02": "smoke-automated-2026-07-13T00-28-52-722Z-80480da7-aa2f-48fb-8d1e-2d1a0163c55a-p02"
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
    "p03-t01": 10
  }
}
```

### implement-phase-review-acceptance-bound

```json
{
  "failures": [],
  "ownershipEvidence": "unavailable-schema-v1",
  "requiredScopes": ["p01", "p02", "p03"]
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
