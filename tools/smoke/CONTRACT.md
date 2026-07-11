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
  "runIdentity": "same immutable identity as branch",
  "commonGitDir": "/canonical/shared/git/common-directory",
  "sourceCommitSha": "40-character source SHA",
  "baselineCommitSha": "40-character fixture baseline SHA",
  "branchOwnership": {
    "createdByRun": true,
    "branch": "flat-collision-resistant-name",
    "baseCommitSha": "40-character source SHA",
    "baselineCommitSha": "40-character fixture baseline SHA",
    "runIdentity": "same immutable identity as branch"
  },
  "ownershipJournal": {
    "schemaVersion": 1,
    "resources": [
      {
        "baselineCommitSha": "40-character child ownership baseline SHA",
        "branch": "actual child branch",
        "commonGitDir": "/canonical/shared/git/common-directory",
        "registeredAt": "ISO-8601 timestamp",
        "runIdentity": "same immutable identity as branch",
        "worktreePath": "/canonical/child/worktree"
      }
    ]
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
  "intendedSmokeBootstrap": {
    "branch": "flat-collision-resistant-name",
    "configSha256": "64-character lowercase SHA-256 digest",
    "configSource": "/absolute/disposable/worktree/.oat/config.local.json",
    "manifestPath": "/absolute/disposable/run/provisioning-manifest.json",
    "markerPath": "/absolute/disposable/worktree/.oat/smoke-bootstrap.json",
    "runIdentity": "same immutable identity as branch",
    "policy": {
      "build": {
        "allowed": true,
        "argv": ["run", "build"],
        "outputScope": "disposable-child-worktree"
      },
      "config": {
        "copy": "marker-source-only",
        "preserveBytes": true
      },
      "copyPrimary": {
        "archivedProjects": false,
        "environment": false,
        "localProjects": false,
        "mcp": false
      },
      "dependencyInstall": {
        "argv": [
          "install",
          "--offline",
          "--frozen-lockfile",
          "--ignore-scripts"
        ],
        "lifecycleScripts": false,
        "lockfile": "frozen",
        "network": "offline"
      },
      "localPathSync": false,
      "providerViewSync": false,
      "s3ArchiveSync": false,
      "sharedHooks": false
    }
  },
  "effectiveSmokeBootstrap": {
    "branch": "flat-collision-resistant-name",
    "configSha256": "64-character lowercase SHA-256 digest",
    "configSource": "/absolute/disposable/worktree/.oat/config.local.json",
    "manifestPath": "/absolute/disposable/run/provisioning-manifest.json",
    "markerPath": "/absolute/disposable/worktree/.oat/smoke-bootstrap.json",
    "runIdentity": "same immutable identity as branch",
    "policy": "identical to intendedSmokeBootstrap.policy"
  },
  "writableRoots": []
}
```

`appliedScenario` is the authoritative scenario selector for evidence
assertions. `createdPaths`, `branch`, and `worktreePath` are the cleanup
allowlist.

Manifest updates are published with a sibling temporary file and atomic rename.
Nested ownership registrations additionally use a bounded exclusive sibling
lock, reread the manifest while holding that lock, and publish with
temp-file-plus-rename so concurrent phase registrations cannot lose one
another.
Partial manifests have `readiness.status: "not-ready"` and record only the
`intendedCloseoutPolicy`. `effectiveCloseoutPolicy` is added after the
disposable `.oat/config.local.json` has been written and the CLI resolves that
local value. Provisioning sets `provisioningState: "ready"` and
`readiness.status: "ready"` immediately before the manifest becomes eligible
for drive.

`sourceCommitSha` is the commit from which the disposable branch was created.
After applying the selected preset, provisioning commits the fixture project
and workspace seed logs as `baselineCommitSha`. The baseline also contains the
tracked schema-v2 `.oat/smoke-bootstrap.json` marker. The marker binds the
external manifest path, branch, and immutable run identity. The local config is written before
that commit but excluded from it, so the provisioning worktree remains clean
except for the expected untracked `.oat/config.local.json`. Child worktrees
inherit the marker, fixture, and workspace while the marker identifies the
absolute config source, its SHA-256 digest, and the provisioning manifest.

Before normal worktree initialization performs any copy, the init script checks
for the tracked smoke marker and validates it against the ready manifest and
baseline commit. It then atomically journals the actual attached child branch,
canonical worktree path, shared Git common directory, and child ownership
baseline. Journal failure aborts before package tooling. A valid marker selects
a closed bootstrap path: copy only the
recorded smoke config and byte-compare it, run
`pnpm install --offline --frozen-lockfile --ignore-scripts`, then run
`pnpm run build`. The build is allowed because generated content stays inside
the disposable child worktree. Primary environment, MCP, local-project, and
archive copies remain disabled, as do S3 archive sync, shared-hook setup,
local-path sync, and provider-view sync. Missing, malformed, untracked, or
out-of-run marker/config bindings fail before normal bootstrap can begin.

`branchOwnership` is absent until this run successfully creates the branch. Its
source and immutable baseline SHAs bind cleanup authority to the created ref; a
`smoke-*` name alone never establishes ownership. Repository hooks are disabled
with invocation-scoped Git configuration for outer worktree creation and the
baseline commit.

Cleanup validates the matching marker from every recorded ownership baseline.
Current branch tips and worktree HEADs may advance through legitimate lifecycle
commits, but each must remain a descendant of its immutable baseline. Cleanup
refuses divergent tips, mismatched shared Git directories, missing baseline
markers, and run-descendant worktrees or branches absent from the journal. Once
all resources are corroborated, it removes journaled child worktrees before the
outer worktree, then child branches before the outer branch. Interrupted states
where a journaled worktree is already absent remain recoverable; contradictory
or unjournaled resources fail closed.

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
