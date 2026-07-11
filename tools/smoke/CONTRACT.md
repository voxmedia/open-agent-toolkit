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
  "sourceCommitSha": "40-character source SHA",
  "baselineCommitSha": "40-character fixture baseline SHA",
  "branchOwnership": {
    "createdByRun": true,
    "branch": "flat-collision-resistant-name",
    "baseCommitSha": "40-character source SHA",
    "expectedTipCommitSha": "40-character fixture baseline SHA"
  },
  "provisioningState": "ready",
  "readiness": {
    "status": "ready"
  },
  "intendedCloseoutPolicy": {
    "source": "local",
    "value": {
      "preApproval": [],
      "postApproval": []
    }
  },
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

Manifest updates are published with a sibling temporary file and atomic rename.
Partial manifests have `readiness.status: "not-ready"` and record only the
`intendedCloseoutPolicy`. `effectiveCloseoutPolicy` is added after the
disposable `.oat/config.local.json` has been written and the CLI resolves that
local value. Provisioning sets `provisioningState: "ready"` and
`readiness.status: "ready"` immediately before the manifest becomes eligible
for drive.

`sourceCommitSha` is the commit from which the disposable branch was created.
After applying the selected preset, provisioning commits the fixture project
and workspace seed logs as `baselineCommitSha`. The local config is excluded
from that commit and remains local to the disposable worktree, so child
worktrees created from the baseline inherit fixture content but not the local
override.

`branchOwnership` is absent until this run successfully creates the branch. Its
base and expected-tip SHAs bind cleanup authority to the created ref; a
`smoke-*` name alone never establishes ownership. Cleanup force-deletes only
when the manifest identity, current branch tip, and registered worktree agree.
Missing or contradictory ownership fails closed and preserves the branch.

Both closeout policy lists are empty, so summary, documentation, PR, and other
closeout child steps are ineligible without changing final verification,
review, and approval ordering.

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
