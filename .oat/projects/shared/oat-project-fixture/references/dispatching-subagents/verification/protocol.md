# Dispatching Subagents — Verification Protocol v2

> **Status:** validation draft. This protocol is additive and does not replace
> the current flat verification prompt until a pilot run has exercised its
> schema and all path updates land atomically.

## Purpose

Verify provider dispatch mechanisms without promoting volatile catalogs or
provider-specific behavior into the provider-neutral contract. The protocol is
for fresh root sessions, p04 evidence reconciliation, and later drift rechecks.
It is not a live workflow smoke test and does not validate review-routing policy.

Read `claims.md` before launching probes. A canonical report returns one row for
every claim in its declared scope.

## Run Types

| Type                 | Use                                                            | Promotion eligible |
| -------------------- | -------------------------------------------------------------- | ------------------ |
| `pilot/noncanonical` | Exercise the protocol or investigate schema gaps               | No                 |
| `canonical`          | Fresh-session verification against immutable identified inputs | Yes                |
| `supplementary`      | Narrow drift check, catalog snapshot, or follow-up observation | No                 |

## Safety Boundary

- Read-only probes only. Do not modify repository files, user configuration,
  provider configuration, or generated agent assets.
- Do not start an OAT project workflow.
- Declare and record a deadline before every child launch. No probe may be
  unbounded.
- Permit at most one native generic **topology probe** per harness.
- When the topology probe exposes nested dispatch, permit at most one native
  depth-2 **leaf sentinel**.
- Permit at most one independent provider CLI sentinel per harness.
- The topology probe returns structured catalog and control-surface data; it
  is not a fixed-string sentinel.
- Leaf and CLI sentinels perform no repository or shell writes and return only
  the fixed string named by the harness instructions.
- Stop selection for a probe after an accepted launch. Do not attempt a second
  role, model, or route for that probe. An accepted topology probe may still run
  the one separately authorized nested leaf probe.
- Continuing the same accepted child for the same bounded probe is allowed when
  the harness exposes a continuation handle. Record it as continuation, not as
  a new launch or fallback.
- Record timeout, interruption, provider error, or `BLOCKED` as a terminal child
  outcome, never as pre-start rejection.
- Report unavailable or inconclusive controls honestly.
- Redact credentials, tokens, and unrelated configuration from all artifacts.

## Independent Verification Scopes

Native and CLI controls answer different questions. Running both is not
fallback when they are declared as independent scopes before either launch.

### Native capability

1. Record root schema selectors and their source.
2. Launch one generic topology probe with a complete recorded payload. Do not
   use a production OAT role whose contract rejects schema-probe work.
3. Have the accepted topology probe record its own nested schema.
4. If nested dispatch exists, launch one leaf sentinel and record its complete
   payload, acceptance event, and fixed result.
5. After topology-probe acceptance, do not try another topology route. After
   leaf acceptance, do not try another leaf route.

### CLI capability

1. Record installed/readiness state and live help or model controls.
2. Declare the CLI sentinel as an independent capability control.
3. Launch at most one fixed-result read-only sentinel.
4. Record acceptance separately from child outcome.
5. Do not use the result as fallback evidence for the native scope.

### Outside this protocol

- Planning self-review inheritance.
- Implementation self-review ceiling enforcement.
- Phase and lifecycle gate independence.
- Write-capable worker permissions.
- Full coordinator-to-worker workflow behavior.
- Production agent-role cooperation with out-of-scope diagnostic prompts.
- Catalog stability across accounts, sessions, or provider releases.

P04 contract tests and p05 live smoke runs own those behaviors.

## Required Run Packet

Write each packet under:

```text
verification/runs/<harness>/<ISO-8601-UTC-timestamp>/
├── report.md
├── evidence.json
└── raw/
```

`raw/` is optional. Commit only bounded, redacted evidence that materially
supports a verdict.

## Evidence Schema

`evidence.json` uses this provider-neutral shape. Provider-specific selectors
remain opaque strings. The example deadline is illustrative; every real value
must be a positive integer declared before launch.

```json
{
  "schemaVersion": 1,
  "run": {
    "runId": "<harness>-<ISO-8601-UTC-timestamp>",
    "runType": "pilot/noncanonical | canonical | supplementary",
    "scope": "native-capability | cli-capability | combined-capability | supplementary",
    "harness": "claude | codex | cursor",
    "freshSession": true,
    "capturedAt": "<ISO-8601 UTC>",
    "workingDirectory": "<absolute path>",
    "repositoryCommit": "<full SHA>",
    "inputHashes": {
      "claims.md": "<sha256>",
      "protocol.md": "<sha256>",
      "provider-draft.md": "<sha256>"
    },
    "runtime": {
      "rootModel": "<reported selector or unknown>",
      "versions": {}
    },
    "redactionStatus": "reviewed | incomplete"
  },
  "catalogSnapshots": [
    {
      "snapshotId": "root-native-1",
      "dispatchContext": "root-native | nested-native | provider-cli | ui",
      "source": "tool-schema | materialized-config | cli-help | cli-catalog | ui | other",
      "observedAt": "<ISO-8601 UTC>",
      "roles": [],
      "models": [],
      "efforts": [],
      "inheritance": "<documented behavior or unknown>"
    }
  ],
  "launches": [
    {
      "probeId": "native-topology | native-leaf | cli-sentinel",
      "verificationScope": "native-capability | cli-capability",
      "role": "<named role or none>",
      "agentDefinition": "<named definition or none>",
      "modelSelector": "<opaque selector, inherited, or none>",
      "modelSelectorGranularity": "tier-alias | exact-model-id | opaque | inherited | none",
      "effortSelector": "<opaque selector, inherited, not-exposed, or none>",
      "selectionSource": "explicit-call | agent-definition | parent-inheritance | cli",
      "catalogSnapshotId": "<snapshot ID or none>",
      "deadlineSeconds": 300,
      "payload": {},
      "launchStatus": "accepted | rejected-before-start | not-launched",
      "childOutcome": "completed | failed | timeout | interrupted | blocked | contract-refusal | not-observed",
      "configuredInvocationEvidence": [],
      "runtimeConfirmation": "<observed selector or not-reported>",
      "result": "<fixed result or structured topology summary>",
      "continuationEvents": []
    }
  ],
  "claims": [
    {
      "claimId": "<stable ID from claims.md>",
      "probeStatus": "executed | blocked | not_run",
      "verdict": "confirmed | contradicted | inconclusive",
      "observationKind": "mechanism | snapshot | policy",
      "evidenceMode": "schema | launch | help | config | runtime-report",
      "evidenceRefs": [],
      "rationale": "<short evidence-based explanation>"
    }
  ]
}
```

An accepted launch with a refusal, failure, or timed-out child remains
`accepted`; preserve the terminal result in `childOutcome`. A missing runtime
identity is `not-reported`, not launch rejection. A continuation event must
reference the existing probe and must not change its role, model, or route.

## Report Contract

`report.md` is the human-readable projection of `evidence.json`:

1. Run identity and immutable input provenance.
2. Coverage and explicitly excluded behavior.
3. Root control surfaces and catalog snapshots.
4. Generic topology probe and optional leaf sentinel.
5. Independent CLI control, when in scope.
6. Claim verdict table keyed by stable claim ID.
7. Contradictions and contract corrections.
8. Recommended harness topology.
9. Redaction statement and raw-evidence manifest.

Do not collapse role, agent definition, model, effort, inheritance, and runtime
identity into one field.

## Harness Requirements

### Codex

- Record effective `agents.max_depth` and its source.
- Distinguish registered agent type from model and reasoning-effort selectors.
- Use `OAT_CODEX_NESTED_SENTINEL_OK` for the leaf result.
- Inspect current `codex exec` model and effort controls for the independent CLI
  scope.
- Do not infer Claude or Cursor behavior.

### Claude

- Record the exact root Agent/Task model enum and named-agent controls.
- Distinguish explicit call model, agent-definition default, and parent
  inheritance.
- Use a generic agent type for the topology probe; production OAT roles may
  correctly reject unrelated schema-transcription work.
- Record whether the generic topology probe receives nested Agent/Task.
- Use `OAT_CLAUDE_NESTED_SENTINEL_OK` for the leaf result.
- Observe Workflow model/effort controls separately; do not launch Workflow
  unless the run explicitly adds that supplementary scope.
- Inspect current `claude -p` model controls for the independent CLI scope.
- Do not infer Codex or Cursor behavior.

### Cursor

- Treat the IDE native schema, CLI account catalog, and UI configuration as
  separate sources.
- Preserve opaque model selectors exactly.
- Use `OAT_CURSOR_NESTED_SENTINEL_OK` for the leaf result.
- Mark CLI Task observability inconclusive when structured evidence is absent;
  process completion alone does not confirm Task selection.
- Do not infer Codex or Claude behavior.

## Promotion Gate

A claim is promotion eligible only when:

- a canonical fresh-session run identifies immutable inputs;
- the required probe executed;
- the verdict is `confirmed` with concrete evidence references;
- the evidence describes a mechanism, not a transient inventory;
- configured invocation, runtime identity, and child outcome remain separate;
- provider-specific facts remain in the provider reference.

Contradicted and inconclusive claims remain explicit. Snapshot observations may
inform diagnostics and future rechecks but never become stable model lists in
the canonical skill.

`confirmed` with `probe_status: not_run` is invalid. Split schema/documentation
claims from behavioral claims when only one evidence mode executed.
