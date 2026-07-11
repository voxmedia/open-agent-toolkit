# Dispatch Verification Summary

> **Status:** canonical capability verification complete. Confirmed mechanisms
> are ready for p04 promotion with provider qualifications. Snapshot catalogs,
> inconclusive findings, and p05 workflow behavior remain outside the promoted
> core contract.

## Readiness Matrix

| Harness target | Canonical evidence                    | Required claim results                       | Promotion disposition                                                     |
| -------------- | ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Claude         | `runs/claude/2026-07-11T205550Z/`     | 15 confirmed; 0 contradicted; 0 inconclusive | Promote confirmed native/CLI mechanisms with surface qualifications       |
| Codex          | `runs/codex/2026-07-11T205116Z/`      | 15 confirmed; 0 contradicted; 0 inconclusive | Promote confirmed native/CLI mechanisms with configuration qualifications |
| Cursor IDE     | `runs/cursor-ide/2026-07-11T210832Z/` | 14 confirmed; 0 contradicted; 0 inconclusive | Promote IDE native/CLI mechanisms; keep catalogs as snapshots             |
| Cursor CLI     | `runs/cursor-cli/2026-07-11T212201Z/` | 9 confirmed; 0 contradicted; 5 inconclusive  | Promote exact CLI mechanisms; retain native topology as inconclusive      |

The Claude canonical packet also contains one confirmed supplementary schema
observation (`CLA-M06`) and two deliberately unrun/inconclusive supplementary
rows (`CLA-M03`, `CLA-M09`). The separate Claude supplementary packet corrected
a speculative tool-grant finding without changing canonical claim verdicts.

## Cross-Harness Agreements

The canonical runs converge on these provider-neutral mechanisms:

1. Native and CLI controls answer different questions. When both are declared
   before launch, the CLI control is independent evidence rather than fallback.
2. Root native, nested native, provider CLI, workflow, and materialized
   configuration are distinct sources. UI configuration must remain separate
   when it is actually inspected.
3. Role, model, effort, inheritance, fork context, configured invocation,
   runtime identity, and child outcome must remain separate fields.
4. Launcher acceptance and terminal child outcome are independent.
5. Missing runtime identity does not negate an accepted configured invocation.
6. An accepted launch is terminal for automatic replacement eligibility.
7. Catalog arrays are timestamped snapshots, not durable provider inventories.
8. Exact selection is surface-relative; one provider-neutral scalar cannot
   represent every harness.

These agreements are reflected in `../contract.md`.

## Provider Results

### Claude

Confirmed mechanisms:

- The native `Agent` surface supports a named role plus a tier-alias model.
- Model resolution is explicit call → agent-definition default → parent
  inheritance.
- A generic inherited depth-1 child received native nested dispatch and
  launched an explicit-model depth-2 sentinel.
- The nested model enum was pre-call schema evidence; the nested agent-type
  catalog became visible only after the first nested call.
- Native Agent has no effort control, while Workflow schema and CLI expose
  effort on different surfaces.
- `claude -p` accepts full model IDs; the exact-ID sentinel completed and
  exposed runtime identity through `modelUsage`.
- Accepted children expose continuation handles.
- `Task` remains a recognized agent tool-grant alias for the live `Agent` tool.

Qualifications:

- Generic nesting is capability evidence, not production-role cooperation.
- Production coordinator/reviewer behavior and review policy remain p05 scope.
- Exact dated model IDs are CLI-expressible, not native-Agent-expressible.

### Codex

Confirmed mechanisms:

- Agent type, model, reasoning effort, service tier, fork context, depth, and
  sandbox are independent controls.
- Root and nested schemas were separately observed.
- An explicit generic coordinator launched an explicit depth-2 leaf and both
  completed.
- The tested exact overrides used the schema-compatible `fork_turns: none`
  mode.
- Effective depth 2 was sufficient for the tested topology.
- An independent exact model/effort `codex exec` sentinel completed.
- Native depth and write authority are separate controls.

Qualifications:

- Effective depth and selector catalogs are run-specific configuration or
  snapshots.
- Write-capable production behavior was not exercised.
- Runtime model identity was not required or independently reported.

### Cursor IDE

Confirmed mechanisms:

- Native model selectors are opaque, per-dispatcher strings.
- Omitted native model uses documented parent inheritance.
- Root and nested catalogs were independently captured.
- An explicit generic native coordinator and depth-2 leaf completed.
- An independent exact account-catalog CLI sentinel completed.
- CLI completion emitted no structured Task-selection event.
- Requested selector and runtime identity remained separate; runtime identity
  was not reported.

Qualifications:

- The matching root/nested catalogs in this run do not override earlier
  evidence of a narrow nested catalog.
- A workspace-trust rejection occurred before child start; the same route ran
  after explicit operator approval with `--trust`.
- UI role configuration was not inspected.

### Cursor CLI

Confirmed mechanisms:

- The headless root exposed a native `Subagent` schema and documented
  omit-model inheritance.
- A fresh exact account-catalog CLI child completed.
- The successful CLI JSON contained no Task-selection event or runtime model
  identity.
- The run followed no-replacement terminality after the native interruption
  and the accepted CLI launch.

Inconclusive findings:

- The native topology connection closed mid-flight.
- No structured native acceptance event, nested catalog, or leaf sentinel was
  observable.
- Root/nested catalog independence and explicit native acceptance therefore
  remain inconclusive for this flavor.
- The full root/nested/CLI snapshot claim is inconclusive because no nested
  catalog was returned.

Do not infer Cursor IDE nesting behavior into the CLI flavor.

## Corrections to the Frozen Drafts

The flat drafts remain immutable verification inputs. The verified provider
references supersede these draft assertions:

| Draft assertion                                                     | Verified correction                                                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Claude has no effort axis                                           | Native Agent has no effort parameter; Workflow and CLI expose effort controls                         |
| One exact Claude model value can pass through every surface         | Native Agent uses tier aliases; CLI can accept full model IDs                                         |
| Every dispatcher can snapshot every native catalog before selection | Claude nested model selectors were pre-call visible, but nested agent types were post-first-call only |
| Claude `Task` tool grant may be dead                                | Controlled supplementary probes confirmed `Task` resolves to live `Agent`; only naming drift remains  |
| Cursor native topology can be generalized across IDE and CLI        | IDE generic depth-2 completed; CLI native topology remained inconclusive                              |
| A provider/account catalog is stable enough for durable guidance    | Cursor catalogs varied across invocations and flavors; every exact list remains a snapshot            |
| Process completion establishes inner Task selection                 | Cursor CLI completed without any structured Task-selection event                                      |

## Promotion Decisions

Promote into the p04 core skill:

- the provider-neutral selection and evidence model in `../contract.md`;
- per-dispatch catalog-source separation;
- surface-aware exactness;
- explicit leaf selection and deliberate inheritance;
- accepted-launch terminality;
- selection reason and candidates considered;
- separate launch status, child outcome, runtime identity, diagnostics, and
  continuation records.

Promote only into provider references:

- control names and selector granularity;
- native topology results;
- catalog visibility timing;
- CLI invocation shapes;
- provider-specific identity and continuation evidence;
- flavor-specific inconclusive findings.

Do not promote as durable facts:

- dated catalog contents or counts;
- Cursor root/nested catalog equality;
- any universal Cursor CLI native topology;
- UI configuration effects;
- effective Codex depth as a global default;
- production role cooperation inferred from generic probes.

## Non-Coverage and Next Evidence

Phase p04 contract tests own:

- planning self-review inheritance policy;
- implementation reviewer-at-ceiling policy;
- gate independence and fail-closed behavior;
- consumer skill loading and shared record-field names.

Phase p05 live smoke runs own:

- production coordinator-to-worker behavior;
- write-capable task execution;
- review and gate routing;
- Cursor CLI production behavior after the capability-run interruption;
- Claude production-role nesting and review behavior.

## Provenance

| Target     | Run ID                      | Input commit                               | Packet                                |
| ---------- | --------------------------- | ------------------------------------------ | ------------------------------------- |
| Codex      | `codex-2026-07-11T205116Z`  | `d3288a056eae214d1eb617e51d1ea94da5291619` | `runs/codex/2026-07-11T205116Z/`      |
| Claude     | `claude-2026-07-11T205550Z` | `3111442a0831c3e5f1305968313f16fde7f2be40` | `runs/claude/2026-07-11T205550Z/`     |
| Cursor IDE | `cursor-2026-07-11T210832Z` | `3111442a0831c3e5f1305968313f16fde7f2be40` | `runs/cursor-ide/2026-07-11T210832Z/` |
| Cursor CLI | `cursor-2026-07-11T212201Z` | `82322c8bdc231e947176d12586f96a74fa06a4f0` | `runs/cursor-cli/2026-07-11T212201Z/` |

All four runs used byte-identical shared `claims.md` and `protocol.md` inputs by
SHA-256. Each run also recorded the hash of its expected provider-specific
draft, even where the enclosing repository commit differed.
