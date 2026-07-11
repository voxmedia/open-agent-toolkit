# Smoke Runner and Evidence Contract

## Provisioning Manifest

The runner writes one JSON provisioning manifest before drive. It includes:

```json
{
  "appliedScenario": "plan-review | implement | full",
  "worktreePath": "/absolute/disposable/worktree",
  "fixtureProjectPath": "/absolute/disposable/worktree/.oat/projects/smoke-fixture",
  "createdPaths": [],
  "branch": "flat-collision-resistant-name",
  "effectiveCloseoutPolicy": {
    "source": "local",
    "value": {
      "preApproval": [],
      "postApproval": []
    }
  },
  "writableRoots": []
}
```

`appliedScenario` is the authoritative scenario selector for evidence
assertions. `createdPaths`, `branch`, and `worktreePath` are the cleanup
allowlist.

`effectiveCloseoutPolicy` records the approval-aware closeout policy applied
from the disposable `.oat/config.local.json` override. Both lists are empty, so
summary, documentation, PR, and other closeout child steps are ineligible
without changing final verification, review, and approval ordering.

## Evidence Paths

The collector writes an evidence bundle to `<out>/bundle.json` and an
assertion report to `<out>/report.json`. Both paths are outside the disposable
worktree and are recorded by the runner.

## Collector Invocation

```sh
node tools/smoke/evidence/collect.mjs \
  --worktree <worktree-path> \
  --manifest <manifest-path> \
  --out <evidence-output-directory>
```

The collector reads the manifest's `appliedScenario`, fixture logs, dispatch
records, review artifacts, and Git history.
