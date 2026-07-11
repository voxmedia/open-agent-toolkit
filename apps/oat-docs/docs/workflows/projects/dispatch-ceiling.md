---
title: Dispatch Policy
description: 'How OAT combines owned provider candidate ladders, project and phase named maximum ceilings, exact task dispatch, and provider-specific enforcement.'
---

# Dispatch Policy

OAT dispatch policy separates reusable provider choices from project-specific
constraints:

- A **candidate ladder** is an ordered provider column stored in user, shared,
  or repo-local config. Each named tier contains one or more exact candidates.
- A **named ceiling** is a project or phase maximum such as `balanced` or
  `high`. It is not an enduring model-family or effort preference.
- A **task target** is one exact configured candidate selected at invocation
  time at or below the named maximum.

The CLI command remains `oat project dispatch-ceiling resolve` for compatibility.
Legacy `workflow.dispatchCeiling.*` and `oat_dispatch_ceiling` values remain
readable, but new projects use ordered candidates plus `oat_dispatch_policy`.

For raw config keys, see [Configuration](../../cli-utilities/configuration.md).
For the coordinator and task-worker loop, see
[Implementation Execution](implementation-execution.md).

## Named Policy Choices

| Choice                  | Mode    | Named maximum | Eligible configured tiers                |
| ----------------------- | ------- | ------------- | ---------------------------------------- |
| `Economy`               | managed | `economy`     | Economy                                  |
| `Balanced`              | managed | `balanced`    | Economy, Balanced                        |
| `High`                  | managed | `high`        | Economy, Balanced, High                  |
| `Frontier`              | managed | `frontier`    | Economy, Balanced, High, Frontier        |
| `Uncapped`              | managed | none          | Any configured candidate OAT can resolve |
| `Inherit Host Defaults` | inherit | none          | OAT does not select provider controls    |

A named `High` ceiling therefore keeps configured Economy, Balanced, and High
candidates eligible and available. It does not pin Sol, `opus`, one Cursor
string, or one effort value. The task coordinator chooses the lowest exact
candidate it judges sufficient for each bounded task.

`Uncapped` is explicit managed state. It is not represented by omitted policy
state. `Unresolved` is a planning or preflight deferral and cannot begin
implementation.

## Ownership and Adoption

Adopt the complete bundled recommendation into one explicit owning scope:

```bash
# Team-owned, tracked repo configuration
oat config adopt dispatch-matrix --shared

# Checkout-specific repo configuration
oat config adopt dispatch-matrix --local

# Personal defaults across repositories
oat config adopt dispatch-matrix --user
```

Adoption fills missing provider/tier cells and records
`workflow.dispatchCeiling.recommendationVersion`; it does not replace explicit
existing cells. Planning shows the complete recommendation before asking which
scope should own it. If the resulting ladder is still missing or incomplete,
planning remains blocked rather than replacing the user's explicit values.

The ownership boundary is deliberate:

| Source                                     | Config location                | Codex materialization output          |
| ------------------------------------------ | ------------------------------ | ------------------------------------- |
| Shared or repo-local project configuration | `.oat/config*.json`            | Tracked project `.codex` view         |
| Active-project sparse override             | Project `state.md`             | Tracked project `.codex` view         |
| User configuration                         | `~/.oat/config.json`           | User `~/.codex` view                  |
| Supported OAT catalogue                    | Bundled recommendation/catalog | Tracked project `.codex` view on sync |

Project-generated roles remain visible to version control. OAT does not
auto-ignore them. User-generated roles remain outside the repository under the
user home directory.

The reusable ladder and active project ceiling have separate ownership. A
project-specific policy or ceiling belongs in that project's `state.md`; do not
write it into user `~/.oat/config.json` merely because the reusable ladder is
user-owned.

## Config Shapes

An ordered candidate cell uses `candidates`:

```json
{
  "workflow": {
    "dispatchCeiling": {
      "providers": {
        "codex": {
          "balanced": {
            "candidates": [
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "low"
              },
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "medium"
              },
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "high"
              }
            ]
          }
        },
        "claude": {
          "balanced": { "candidates": ["sonnet"] }
        },
        "cursor": {
          "balanced": {
            "candidates": [
              "gpt-5.6-terra-low",
              "gpt-5.6-terra-medium",
              "gpt-5.6-terra-high"
            ]
          }
        }
      }
    }
  }
}
```

Each candidate can also be a fallback route. Route entries are attempted only
through the resolver's bounded escalation level; a route does not change the
named maximum.

Project state records only the active named maximum:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
```

Do not copy compiled `providers` targets into this shape. An optional plan
`## Dispatch Profile` row may narrow one phase to another named maximum at or
below the project maximum. Blank or `auto` uses the project value.

Managed uncapped and inherit/default shapes are explicit:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: uncapped
  source: project-state
```

```yaml
oat_dispatch_policy:
  mode: inherit
  source: project-state
```

## Complete Bundled Recommendation

The bundled ladder contains every supported candidate, not only the final
candidate in each tier:

- **Codex:** Luna at `low`, `medium`, `high`, and `xhigh`; Terra at `low`,
  `medium`, `high`, and `xhigh`; Sol at `low`, `medium`, `high`, `xhigh`, and
  `max`.
- **Claude:** `haiku`, `sonnet`, `opus`, and `fable` across the ordered named
  tiers.
- **Cursor:** opaque strings corresponding to the same 13 configured positions.
  OAT does not parse those strings to infer family, effort, cost, or capability.

The final candidate in a named tier defines that tier's reviewer ceiling. Lower
reviewer selection requires a separate reviewed contract; a normal reviewer
does not use task candidate flags.

## Exact Task Resolution

Planning and implementation preflight resolve the active policy first:

```bash
oat project dispatch-ceiling resolve \
  --provider codex \
  --preflight \
  --json
```

Before each managed capped implementation or fix task, the phase coordinator
classifies the bounded task and requests one exact configured candidate. It
passes the recorded project or narrower phase maximum through the
invocation-only `--ceiling-tier` option:

```bash
# Codex: exact model plus effort
oat project dispatch-ceiling resolve \
  --provider codex \
  --role implementer \
  --ceiling-tier high \
  --candidate-model gpt-5.6-terra \
  --candidate-effort medium \
  --json

# Claude: exact model argument
oat project dispatch-ceiling resolve \
  --provider claude \
  --role implementer \
  --ceiling-tier high \
  --candidate-model sonnet \
  --json

# Cursor: exact opaque configured string
oat project dispatch-ceiling resolve \
  --provider cursor \
  --role implementer \
  --ceiling-tier high \
  --candidate-model 'opaque:model/balanced [v2]' \
  --json
```

`--ceiling-tier` accepts `economy`, `balanced`, `high`, or `frontier`. It
overrides a layered active-policy ceiling for that resolver invocation only. It
does not modify user, shared, local, or project configuration.

Successful JSON reports:

- top-level `source: invocation` for the ephemeral maximum
- `providers.<provider>.cellSource` for the config layer that owns the selected
  candidate definition
- `selection.ceilingTier`, `selection.candidateTier`, and
  `selection.requestedCandidate`
- the exact provider-specific `dispatchArgs`

The resolver rejects a missing candidate, an above-ceiling candidate, an
ambiguous route, malformed ordering, a reviewer candidate request, or controls
that cannot compile exactly. The coordinator blocks instead of reusing its own
target, a base role, or a provider default.

`--preferred` remains available for legacy scalar ceilings and managed
`Uncapped` compatibility. It is not the exact managed task-worker selection
path.

## Provider Enforcement

| Provider | Exact task invocation                                                                                                              | Failure behavior                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Codex    | Use `providers.codex.dispatchArgs.variant` as `agent_type`; otherwise launch a fresh child pinned to the returned model and effort | Block if neither exact route is usable    |
| Claude   | Pass `providers.claude.dispatchArgs.model` as the actual Task `model`                                                              | Block if the model cannot be applied      |
| Cursor   | Pass `providers.cursor.dispatchArgs.model` byte-for-byte as the actual invocation model; treat it as opaque                        | Block rather than normalize or substitute |
| Other    | Use a registered provider adapter when it can compile exact controls                                                               | Unsupported providers remain advisory     |

Materialized Codex roles exist before task dispatch after project/user sync.
The supported catalogue is committed project output; custom Codex candidates
materialize according to config ownership. Workflow correctness still keeps a
fresh pinned-child fallback and does not require provider restart or hot reload.

Reviewers use the final candidate at the configured review ceiling. Managed
`Uncapped` and explicit inherit/default behavior retain their documented base
reviewer behavior. A timeout retry preserves the same exact role or complete
Claude/Cursor model payload.

### Cursor evidence authority

Cursor resolution and runtime evidence answer different questions. Resolution
proves which opaque candidate OAT requested. A stream-JSON Task start and
correlated completion prove launcher behavior only when the model argument is
preserved byte-for-byte. An accepted Task plus the child sentinel establishes
argument eligibility for that account and client; a structured rejection can
establish `unknown-value`. Runtime producer identity remains `not-reported`
unless trusted Cursor telemetry or Cursor support independently confirms it.

The [2026-07-11 GPT-5.6 evidence record](https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md)
ran positive and negative controls before candidate probes. Neither control
emitted a Task event, so the harness stopped without probing the 13 recommended
arguments or exploratory `gpt-5.6-sol-high-fast`. This is a harness/account
boundary, not model rejection, and it supports no recommendation change.

Tracked evidence exposes only an allowlisted event projection and
non-reversible identifier hashes. Exact request/session/tool-call IDs and
credential-redacted raw streams stay in gitignored local project storage for
support diagnosis.

## Coordinator and Worker Layers

`oat-phase-implementer` has two explicit modes:

1. **Phase coordinator:** reads phase artifacts once, preserves dependency
   order, selects one exact candidate per task, waits for each worker, verifies
   its result and commit, then performs phase-wide integration review. It does
   not implement ordinary tasks itself.
2. **Task worker:** receives exactly one Task Scope with one task ID, file
   boundary, verification commands, commit convention, and exact dispatch
   payload. It implements and commits that task, then stops.

Workers run serially in the same worktree. Parallelism remains limited to
plan-declared phase worktrees. See
[Implementation Execution](implementation-execution.md) for the full loop.

## Dispatch Report V1 and Producer Provenance

Resolver calls that pass `--report-scope` and `--report-action` include a
`dispatchReport` object in JSON output. Consumers must require
`dispatchReport.schemaVersion: 1` before dispatch. The report keeps four
different decisions separate:

| Report area                                                         | What it means                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `policy`                                                            | The resolved managed/inherit policy, its status, name, and source    |
| `selection.ceilingTier` / `selection.ceilingTarget`                 | The maximum allowed tier and its boundary target                     |
| `selection.requestedCandidate` / `candidateTier` / `candidateIndex` | The exact candidate requested for this bounded task and its position |
| `selection.exactSelectedTarget` / `route.target`                    | The compiled provider target and actual invocation route             |

A named policy or ceiling is never a substitute for the requested candidate or
exact selected target. `requestedControls` records what OAT put into the host
payload. `configuredDefaults` records fallback configuration and is explicitly
not a runtime observation.

`gateInvocation` is an immutable copy of configured gate controls.
`runtimeIdentity` is separate and stays `not-reported` until independently
observed or otherwise supported runtime evidence exists. Requested controls,
configured defaults, role-name parsing, and reviewer self-identification do not
become observed runtime identity.

Human output comes from `formatDispatchReport(dispatchReport)`. Dispatch notes
also retain a parseable compatibility stamp for later review gates:

```text
Dispatch: scope=p06-t03 action=implementation role=implementer producer=gpt-5.6-sol provenance=declared model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high
```

The stamp must be derived through `toDispatchStampRecord(dispatchReport)` and
`formatDispatchStamp`; callers must not reconstruct it from policy labels, role
names, candidate strings, or target names. `producer` is the runtime model slug
when OAT can establish it; otherwise it is `unknown`. `provenance` is
`declared`, `observed`, `inferred`, or `unknown`. Selected model and effort axes
can remain exact even when runtime producer identity is not reported.

## Legacy Compatibility

The following remain readable during migration:

- `workflow.dispatchCeiling.preset`
- bare `workflow.dispatchCeiling.providers.<provider>` values
- project `oat_dispatch_ceiling`
- `--preferred` resolver selection

Legacy preset names map to managed named tiers: `cost-conscious` to Economy,
`balanced` to Balanced, and `maximum` to High. Legacy values are migration
inputs, not evidence that a new project should persist exact provider-family
pins.
