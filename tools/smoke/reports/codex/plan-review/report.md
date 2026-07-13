# Smoke Evidence Report

**Scenario:** plan-review
**Status:** passed
**Assertions:** 5 passed / 0 failed
**Bundle SHA-256:** 3719a28893bacc73ed06c8c3f42f8ea8ba48015f0b30f4a1f1d305d945c021d2
**Authority:** `report.json` is authoritative; this Markdown is a derived view.

| Assertion                           | Severity  | Status | Description                                                                                  |
| ----------------------------------- | --------- | ------ | -------------------------------------------------------------------------------------------- |
| manifest-ready                      | important | passed | Provisioning manifest is ready for the selected scenario.                                    |
| plan-review-substantive-plan-stable | important | passed | Plan hash, task IDs, and parallel groups are unchanged across resume.                        |
| review-gate-corroborated-plan       | important | passed | Every required gate review exactly matches gate-owned invocation and corroboration evidence. |
| review-disposition-durable-plan     | important | passed | Every required review has a durable artifact commit and terminal plan row.                   |
| plan-review-state-transitions       | important | passed | Pre-review state advances atomically through reviewed to implementation-ready.               |

## Evidence

### manifest-ready

```json
{
  "appliedScenario": "plan-review",
  "provisioningState": "ready",
  "readiness": {
    "status": "ready"
  }
}
```

### plan-review-substantive-plan-stable

```json
{
  "baselineSubstantivePlanHash": "5558233d7fd23465aa1462a4ec86c47a74a59788f10f8412d4816185fb7bafdd",
  "substantivePlanHash": "5558233d7fd23465aa1462a4ec86c47a74a59788f10f8412d4816185fb7bafdd",
  "taskIds": ["p01-t01", "p01-t02", "p02-t01", "p02-t02", "p03-t01"]
}
```

### review-gate-corroborated-plan

```json
{
  "matchedScopes": ["plan"],
  "requiredScopes": ["plan"]
}
```

### review-disposition-durable-plan

```json
{
  "durableScopes": ["plan"],
  "requiredScopes": ["plan"]
}
```

### plan-review-state-transitions

```json
{
  "expectedStates": ["reviewed", "implementation-ready"],
  "transitionIndexes": [2, 3],
  "transitions": [
    {
      "artifactChanges": {
        "implementation": true,
        "plan": true,
        "state": true
      },
      "commitSha": "b584eaa757fa55a5bdec9282bccc50cad5b0c08d",
      "contentChanged": true,
      "event": "state-transition",
      "from": "pre-review",
      "fromCommitSha": "2c695b5df0d128ae5505469afe503dc5d16b6e81",
      "observedFrom": "pre-review",
      "observedTo": "reviewed",
      "parentSha": "3e1d61caa53709481d6139152feda78ce54dee81",
      "reachableFromHead": true,
      "sequence": 1,
      "to": "reviewed"
    },
    {
      "artifactChanges": {
        "implementation": true,
        "plan": true,
        "state": true
      },
      "commitSha": "7fc0e6d144283e10a3e627534e23bb3c041582ca",
      "contentChanged": true,
      "event": "state-transition",
      "from": "reviewed",
      "fromCommitSha": "b584eaa757fa55a5bdec9282bccc50cad5b0c08d",
      "observedFrom": "reviewed",
      "observedTo": "implementation-ready",
      "parentSha": "b584eaa757fa55a5bdec9282bccc50cad5b0c08d",
      "reachableFromHead": true,
      "sequence": 2,
      "to": "implementation-ready"
    }
  ]
}
```
