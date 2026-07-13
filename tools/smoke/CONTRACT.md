# Smoke Runner and Evidence Contract

## Deterministic Contract Tier

`--harness deterministic --scenario implement` is the seconds-scale contract
tier. It replaces only provider and gate execution with local fakes. The run
still uses production provisioning, real parallel Git worktrees, the locked
ownership journal, immutable dispatch records, task commits and merges, review
artifact handling, evidence collection, assertions, and cleanup.

The deterministic topology records one root-to-phase-implementer launch per
phase, one root-owned reviewer launch per phase, five direct task commits, and
one final fake gate. Optional nested launches are validated when present but
are not required. It requires no provider credential, network access,
dependency installation, repository build, or repository-wide test inside a
disposable child.

Its failure controls prove:

- a child readiness failure is terminal before any launch;
- an accepted failed phase implementer has exactly one attempt and no later
  reviewer or gate;
- concurrent manifest updates retain both mutations under the production lock;
- an out-of-order state transition fails the production evidence assertion.

Other scenarios and operator mode are rejected before provisioning. Live
provider runs remain acceptance evidence for provider-specific behavior; they
are not the first debugging surface for orchestration contracts.

## Run Validity and Gate Liveness

A tracked smoke marker makes child containment, ownership registration,
expected-base verification, and fixture-scoped readiness run-validity
conditions. Failure of any condition is immediately fatal. Record
`invalid-run-abort`, terminate accepted handles owned by the run, preserve the
invalidating evidence, and clean only journal-owned resources. Do not dispatch
another phase implementer, optional worker, reviewer, or gate; do not degrade
to sequential execution; and do not treat cancellation as a child outcome or
replacement opportunity.

Gate execution tees target output while tracking activity. Every
`OAT_GATE_LIVENESS_INTERVAL_MS` (default 30 seconds), it emits target, elapsed,
idle, and hard-budget milliseconds. Output activity resets idle time but never
extends `OAT_GATE_EXEC_TIMEOUT_MS`; the hard timeout remains authoritative.

## Run Metadata and Report Publication

After provisioning creates the initial manifest, every drive, child,
collection, failure, and operator-return mutation goes through the locked
`updateSmokeManifest` journal API. Callers update the latest record under the
lock; they never rewrite a stale in-memory manifest over child ownership.

Collection writes `bundle.json`, `report.json`, and `report.md` to a unique
run-local `report-staging-*` directory under `tools/smoke/.runs/`. The `.runs/`
tree is ignored generated state and retains failed or interrupted evidence
until cleanup. A failing assertion never writes to the report root.

Only a fully bound passing report is directory-renamed into the
version-controlled `tools/smoke/reports/<harness>[/operator]/<scenario>/`
root. Published reports are acceptance evidence and must be committed; cleanup
does not own or remove them. Cleanup removes every journal-owned run directory
and refuses unjournaled run-descendant resources.

## Provisioning Manifest

The runner writes one JSON provisioning manifest before drive. It includes:

```json
{
  "appliedScenario": "plan-review | implement | full",
  "driveMode": "automated | operator",
  "gateRuntime": "exact independent review runtime for this harness",
  "gateTarget": "exact independent review target for this harness",
  "reportRoot": "/absolute/parent/tools/smoke/reports/<harness>[/operator]/<scenario>",
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
  "drive": {
    "driveMode": "automated | operator",
    "protocol": "tools/smoke/protocols/<harness>.md",
    "promptSha256": "64-character lowercase SHA-256 digest",
    "status": "dry-run-stub | awaiting-operator | running | completed | failed | operator-returned"
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
assertions. `driveMode` is part of the immutable run identity: branch names
carry `automated` or `operator`, and report roots are disjoint. Operator reports
always use the extra `operator/` path segment and never replace canonical
automated reports. `createdPaths`, `branch`, and `worktreePath` are the cleanup
allowlist.

`gateTarget` is selected before the run starts and is cross-runtime relative to
the root harness: Codex uses the trusted
`cursor-gpt-5-6-sol-max` target; Claude and both Cursor surfaces use
`codex-5-6-sol-max`. Every required gate invocation must pass this exact target.
Listing targets is a valid probe; invoking `oat gate review` as a probe is not,
because an accepted gate launch is terminal even when it fails.
When either the root or gate runtime is Cursor, preflight requires only
sanitized presence of `CURSOR_API_KEY`. Because Codex tool shells redact
provider credentials, Codex drives run through a runner-owned local mailbox
broker. The disposable local gate target invokes only the committed
worktree-mailbox client; the parent broker launches `cursor-agent` with the
retained API key.
Operator handoffs wrap Codex in the same broker launcher. The key value must
never enter config, manifests, the mailbox, logs, prompts, or evidence.
Both automated and operator Codex commands pass the manifest's canonical
`commonGitDir` and the runner-owned manifest directory through separate
`--add-dir` arguments. The primary worktree alone is insufficient because
linked-worktree commits create locks under shared Git metadata, while child
ownership registration atomically locks the provisioning manifest beside that
worktree.

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

Automated CLI drives run all stages by default:

```sh
node tools/smoke/runner/run-smoke.mjs \
  --harness <codex|claude|cursor-cli> \
  --scenario <plan-review|implement|full>
```

Preflight and every provider process prepend the committed
`tools/smoke/bin/oat` shim to `PATH`. The runner binds that shim through
`OAT_SMOKE_LOCAL_CLI` to the preflight-verified source workspace
`packages/cli/dist/index.js`, so the unbootstrapped disposable outer worktree
does not fall through to a global CLI. Child processes inherit the binding.
Preflight accepts only the repository-owned shim or the dist entrypoint itself
and still rejects an unrelated global executable. Printed operator handoffs
include both environment bindings and require a stable source build until
collection completes.

Operator-interactive drives are split so a noninteractive command cannot run
by accident:

```sh
node tools/smoke/runner/run-smoke.mjs \
  --harness <harness> --scenario <scenario> \
  --drive-mode operator --stage prepare
# Run the printed command and prompt in the operator TTY.
node tools/smoke/runner/run-smoke.mjs \
  --harness <harness> --scenario <scenario> \
  --drive-mode operator --stage collect
```

Cursor IDE uses the same prepare/collect shape without substituting a CLI drive;
its canonical report root omits the `operator/` segment because IDE execution is
operator-driven by definition.

Immediately after a nested worktree is created, the parent orchestrator
validates its tracked marker and journals the actual attached child branch,
canonical worktree path, shared Git common directory, and child ownership
baseline. No child process may start before this parent-side registration.
Registration is idempotent, so the init script repeats the same validation and
journal operation before any copy. Journal failure aborts before repository
setup.

For this repository, the first child command is the direct smoke-safe entrypoint
`bash scripts/worktree/init.sh`. Provider agents must not invoke it through
`pnpm run worktree:init`, because package-manager startup may perform a network
fetch before the script can select its smoke path. A valid marker selects a
closed containment path that copies only the recorded smoke config and
byte-compares it. Dependency installation, build, and validation remain owned
by repository bootstrap outside smoke mode; the runner does not prescribe a
package manager or dependency store. Primary environment, MCP, local-project,
and archive copies remain disabled, as do S3 archive sync, shared-hook setup,
local-path sync, and provider-view sync. Missing, malformed, untracked, or
out-of-run marker/config bindings fail before repository bootstrap can begin.
The command's process working directory must be the registered child worktree:
use the equivalent of
`(cd "$CHILD_WORKTREE" && bash scripts/worktree/init.sh)`. Executing the child
script by absolute path from the outer worktree is an invalid-run containment
failure.
Smoke children intentionally have no dependency install, so repository hooks
that require workspace tooling are unavailable there. Create every fixture task
commit with invocation-scoped hook isolation:
`git -c core.hooksPath=/dev/null commit ...`. Never mutate Git configuration or
substitute `--no-verify`.

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

## Production Evidence Inputs

The disposable workflow writes launcher-owned records before collection:

- `workspace/evidence/dispatch/<scope>-<action>-<role>-<attempt>.json` — one
  immutable record for every pre-start rejection or accepted launch. Including
  action and role prevents phase-implementer, optional-worker, and reviewer records from
  colliding at a shared phase scope. Create records only through
  `tools/smoke/evidence/record.mjs` with `--kind dispatch`.
  Resolve and retain launcher-owned selection and acceptance facts before
  launch, but do not publish an accepted record while its handle is running.
  After the handle terminates, publish exactly one record with `completed` or
  `failed`. A pre-start rejection is already terminal and may be published
  immediately.
- `workspace/evidence/orchestration/<sequence>-state-transition.json` —
  commit-bound plan-review transitions. Create records through the same command
  with `--kind state-transition`.
- `workspace/evidence/gates/<scope>.json` — the unmodified terminal output from
  `oat gate review --json`. A provider diagnostic may precede the final JSON
  envelope; the collector parses the terminal envelope without rewriting the
  source bytes and retains only gate-owned invocation fields, artifact
  identity, and corroboration statuses.

### Plan-review transition ordering

The plan-review scenario has three durable commits but only two journaled state
transitions:

1. The gate commits its active review artifact and changes the plan row from
   `pending` to `received`. This commit is **not** a state transition; the
   collector intentionally classifies that intermediate shape as `invalid`.
2. Review receive archives the unchanged review bytes and commits the terminal
   `passed` row while preserving the pre-review lifecycle frontmatter in
   `state.md`, `plan.md`, and `implementation.md`. Record this exact commit as
   sequence 1, `pre-review` → `reviewed`.
3. A separate readiness commit updates all three lifecycle artifacts to the
   implementation-ready preset without changing task IDs, task bodies, or
   parallel groups. Record this exact commit as sequence 2, `reviewed` →
   `implementation-ready`.

Never journal the gate artifact commit, combine the two journaled transitions
into one commit, or publish a transition record before the collector-observed
before/after states match its declared edge.

For sequence 1, corroboration compares the immutable manifest baseline with the
receive commit, intentionally spanning the unjournaled `received` gate commit.
Later sequences compare their direct parent. Evidence exposes this boundary as
`fromCommitSha`; sequence 1 must bind to `manifest.baselineCommitSha`, and
sequence 2 must bind directly to sequence 1's commit.

New dispatch records use schema version 2 and contain:

This is the smoke evidence projection, not a second dispatch policy. The
project adapter preserves the provider-neutral engine record unchanged, then
the launcher projects its exact selectors into `configuredInvocation`, its
selection facts into `selection`, and acceptance/outcome into `launch`.
Assertions consume only this stable projection and must not depend on skill
file names, provider-reference paths, or frontmatter versions.

```json
{
  "schemaVersion": 2,
  "scope": "p01",
  "attempt": 1,
  "action": "implementation",
  "role": "phase-implementer",
  "requestId": "launcher-assigned child request identifier",
  "ownership": {
    "launcherRole": "project-root | phase-agent",
    "parentRequestId": "manifest runIdentity or parent phase requestId",
    "parentScope": "project | p01"
  },
  "configuredInvocation": {
    "candidateTier": "high",
    "ceiling": "configured ceiling",
    "ceilingModelAxis": "selected:ceiling-model",
    "ceilingEffortAxis": "selected:ceiling-effort | not-applicable",
    "target": "exact selected target",
    "modelAxis": "selected:model",
    "effortAxis": "selected:effort | not-applicable",
    "policy": "dispatch policy"
  },
  "selection": {
    "reason": "native-catalog | native-catalog-unsatisfying | pre-start-rejection | inherit",
    "candidatesConsidered": [],
    "atOrBelowCeiling": true
  },
  "launch": {
    "status": "accepted | pre-start-rejected",
    "accepted": true,
    "mechanism": "native or CLI mechanism",
    "outcome": "completed | failed | rejected"
  },
  "runtimeIdentity": null
}
```

Human workflow notes and machine records share these semantic fields:

- `selection_reason` maps to the JSON wire path `selection.reason`.
- `candidates_considered` maps to
  `selection.candidatesConsidered`.

The names and mapping are normative. Evidence adapters must not introduce a
second synonym or infer either value from child output.

`requestId` and `ownership` are immutable launcher-owned evidence. Direct
phase implementers and phase reviewers use `launcherRole: "project-root"`,
`parentScope: "project"`, and the manifest `runIdentity` as
`parentRequestId`. Optional nested launches use
`launcherRole: "phase-agent"`, their phase ID as `parentScope`, and the
accepted parent phase implementer's `requestId` as `parentRequestId`. The
writer rejects missing or role/scope-conflicting ownership. Producers and
collectors must never infer ownership from child self-report.

Schema-v1 records remain readable so retained evidence packets can still be
verified, but they have no machine-verifiable launcher parentage. Reports for
those packets must say that direct-root ownership is unavailable rather than
retroactively inferring or attesting it. New producers must write schema
version 2.

`candidates_considered` is ordered decision evidence and must never be sorted
during writing or collection. `gate-target` is intentionally outside this
dispatch-record wire schema: lifecycle/phase gates use the separate canonical
gate JSON and review artifact envelope. The dispatch writer therefore rejects
`selection.reason: "gate-target"` instead of conflating gate and
implementation/self-review records.

The launcher records configured invocation and acceptance; it does not infer
runtime identity. Runtime identity is normalized to `reported` only when both
producer and model are present and provenance is one of `runtime-observed`,
`provider-output`, or `gate-corroborated`. Every other value becomes
`not-reported`.

The collector preserves structured provider candidates from the committed
fixture dispatch matrix and recomputes eligible candidates through the named
ceiling. A launch passes only when its candidate tier, selected model/effort
axes, ceiling model/effort axes, policy, and exact target are mutually
consistent. Claude and Cursor targets equal the selected opaque model string.
Codex targets equal the materialized phase-implementer or reviewer role while
model and effort remain separate axes. The launcher-provided
`atOrBelowCeiling` boolean is retained as source evidence but is not trusted by
assertions.

The harness protocols added in p05 own invoking these writers around real
provider launches and saving gate JSON. Fixture logs, exact task commits,
review artifacts/rows, Git topology, and the provisioning ownership journal
are independent durable corroboration; assertion logic does not accept
launcher booleans as proof of those outcomes. The collector-to-report
integration test exercises the minimum five-task fixture shape: two direct task
commits inside each parallel phase implementer and one direct fan-in task. This
preserves root-owned phase execution and independent phase review evidence
while making third-tier dispatch optional and benefit-driven.

## Normalization and Containment

Every worktree input is resolved before reading and must remain inside the
disposable worktree or fixture project. Symlink escapes fail collection.
Manifest branch names pass `git check-ref-format`; commit identifiers must be
full lowercase SHAs; Git invocations use full refs and explicit argument
boundaries.

Normalized sections whitelist fields and omit timestamps and absolute paths.
Contract-required absolute manifest, journal, and writable-root paths exist
only under `source.rawPaths`. Configured invocation and runtime-observed
identity remain separate objects.

## Assertions and Report Binding

The `plan-review` profile compares the baseline and current substantive plan,
requires the canonical nine task IDs, verifies commit-bound atomic state
transitions, and exactly cross-checks the plan gate artifact against gate JSON.
The `implement` profile requires exactly one accepted completed launch per
task (while allowing explicit rejections before acceptance), exact
at-or-below-ceiling selection, nine marker commits/log lines, journaled flat
parallel branches, p01/p02-before-p03 fan-in, phase gate corroboration, and
explicit runtime identity status. `full` adds the final gate and unions both
profiles.

Parallel proof maps p01 and p02 task commits to two distinct journaled refs
created from the same manifest baseline, rejects cross-phase ancestry, checks
every p01/p02/p03 task commit's exact log-only write, requires both branch
heads as parents of true multi-parent integrations reachable from outer
`HEAD`, and then requires every p03 task commit after both merges. Transition
proof parses complete preset fingerprints from committed `plan.md`, `state.md`,
and `implementation.md` parent/post images.

Review proof models the normal receive lifecycle: the gate names the tracked
active artifact, receive moves identical bytes to ignored
`reviews/archived/`, and the terminal `passed` row names the archived path. The
collector binds archived bytes to the latest committed active blob reachable
from outer `HEAD` and requires a later receive commit touching the active path
and plan. It also requires successful non-blocking and receive-eligible gate
output plus exact agreement among top-level `gateInvocation`,
`dispatchReport.gateInvocation`, corroboration expected/actual invocation,
artifact frontmatter, and canonical repo-relative project identity.

Generate and verify a report with:

```sh
node tools/smoke/evidence/report.mjs \
  --bundle <out>/bundle.json \
  --out <out>
node tools/smoke/evidence/report.mjs --check <out>/report.json \
  --expect-profile <plan-review|implement|full|unavailable-target|post-acceptance-failure>
```

`report.json` contains the SHA-256 digest and sibling path of its bound
`bundle.json`. Check mode rereads that bundle, validates the digest, recomputes
the scenario profile, requires bundle kind and schema version 1, requires the
caller's explicit expected profile, and requires byte-equivalent structured
results. It does not trust report status, assertion IDs, severities, summary
counts, or the bundle's scenario as the caller's intent.

## Negative Controls

Unavailable-target evidence is built from the real `PreflightError.report`
plus an explicit post-command inventory of manifests, branches, and worktrees;
all inventories must be empty. Post-acceptance failure evidence consumes the
same ordered dispatch attempts as positive runs. Any launch after an accepted
failure is a Critical violation, while explicit pre-start rejections before
the accepted launch remain valid.

After capturing the failed runner's stdout/stderr, normalize the unavailable
control with:

```sh
node tools/smoke/evidence/negative.mjs \
  --harness <harness> \
  --preflight <captured-output> \
  --repository <repo-root> \
  --runs-dir <repo-root>/tools/smoke/.runs \
  --out tools/smoke/reports/negative-controls/<harness>
```
