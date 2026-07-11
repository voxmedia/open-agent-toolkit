# Dispatch Verification Claims Ledger

> **Status:** validation draft. Stable IDs in this ledger identify claims for
> verification reports; they do not imply that a claim is confirmed.

This ledger separates provider mechanisms, per-run snapshots, and OAT policy.
Verification reports MUST return one verdict row for every in-scope claim ID.
Current verdicts and promotion readiness belong in `summary.md`, not here.

## Classification

| Kind        | Meaning                                         | Promotion rule                                  |
| ----------- | ----------------------------------------------- | ----------------------------------------------- |
| `mechanism` | Provider or harness behavior that can be tested | Promote only with canonical run evidence        |
| `snapshot`  | Dated catalog, version, or session observation  | Never promote as a stable normative inventory   |
| `policy`    | OAT-owned selection, safety, or evidence rule   | Validate with contract tests and p05 smoke runs |

## Verdict Contract

Every run records both fields:

- `probe_status`: `executed`, `blocked`, or `not_run`.
- `verdict`: `confirmed`, `contradicted`, or `inconclusive`.
- `evidence_mode`: `schema`, `launch`, `help`, `config`, or `runtime-report`.

`contradicted` requires an executed probe whose evidence conflicts with the
claim. `inconclusive` means the probe could not run or its evidence did not
resolve the claim. `confirmed` requires `probe_status: executed`; a documented
schema observation is an executed schema probe, not `not_run`. Absence of
evidence is never `contradicted`.

For `policy` claims, a run verdict describes whether the run adhered to the
policy. It does not establish that the policy is universally correct.

## Provider-Neutral Claims

| ID      | Kind        | Claim                                                                                                                   | Verification surface          |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `U-M01` | `mechanism` | A native catalog belongs to one dispatcher invocation; root and nested catalogs are independent observations.           | Native schema observations    |
| `U-M02` | `mechanism` | Launcher acceptance is authoritative configured-invocation evidence.                                                    | Native and CLI launch records |
| `U-M03` | `mechanism` | Runtime identity evidence is optional and must not be used as an availability probe.                                    | Native and CLI launch records |
| `U-P01` | `policy`    | Snapshot the current dispatcher's native catalog immediately before selection.                                          | Contract tests and p05 smoke  |
| `U-P02` | `policy`    | Intersect configured candidates, the named ceiling, and the current native catalog without rewriting opaque IDs.        | Contract tests and p05 smoke  |
| `U-P03` | `policy`    | Coordinator inheritance is explicit and allowed only when the root is suitable.                                         | Contract tests and p05 smoke  |
| `U-P04` | `policy`    | Leaf workers never silently inherit an expensive root; select an exact native or pre-start CLI target.                  | Contract tests and p05 smoke  |
| `U-P05` | `policy`    | A CLI route is a recorded pre-start selection, not fallback after an accepted native launch.                            | Protocol audit and p05 smoke  |
| `U-P06` | `policy`    | Accepted launch outcomes are terminal for fallback eligibility, including failure, timeout, and `BLOCKED`.              | Protocol audit and p05 smoke  |
| `U-P07` | `policy`    | Catalog mismatch advice may suggest additions but never removal based only on native absence.                           | Contract tests                |
| `U-P08` | `policy`    | Review routing remains phase-scoped: planning inherits, implementation targets the ceiling, and gates stay independent. | Contract tests and p05 smoke  |
| `U-P09` | `policy`    | Continuing the same accepted child for the same bounded scope is not fallback; launching a replacement route is.        | Protocol audit and p05 smoke  |

`U-P08` is outside the bounded capability protocol. Name it under report
non-coverage; p04 contract tests and p05 live evidence own its disposition.

## Codex Claims

| ID        | Kind        | Claim                                                                                                              | Required evidence                                |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `COD-M01` | `mechanism` | The root native spawn schema exposes the selectable agent types and any model, effort, or inheritance controls.    | Root schema source and exact selectors           |
| `COD-M02` | `mechanism` | A generic native topology agent type can be launched and its complete payload acceptance observed.                 | Topology probe payload and launch event          |
| `COD-M03` | `mechanism` | Effective native depth is observable; depth 2 is required for root → coordinator → leaf topology.                  | Effective `agents.max_depth` and source          |
| `COD-M04` | `mechanism` | A generic topology probe with nested spawn can enumerate its selectors and launch one exact depth-2 leaf sentinel. | Nested schema, payload, acceptance, fixed result |
| `COD-M05` | `mechanism` | Native depth and filesystem write authority are independent controls.                                              | Configuration or schema inspection only          |
| `COD-M06` | `mechanism` | Missing child self-reported identity does not negate an accepted native launch.                                    | Acceptance plus runtime-confirmation field       |
| `COD-M07` | `mechanism` | `codex exec` exposes an explicit model and reasoning-effort route for a fresh CLI child.                           | Live help plus independent CLI control           |
| `COD-M08` | `mechanism` | Exact role/model overrides are compatible with the host's required self-contained fork-context mode.               | Live spawn schema and accepted payload           |
| `COD-S01` | `snapshot`  | The exact root and nested agent-type/model catalogs observed in this run.                                          | Timestamped catalog snapshots                    |
| `COD-P01` | `policy`    | Actual production coordinator-to-worker behavior is validated by p05, not by substituting topology-probe behavior. | p05 live smoke                                   |

## Claude Claims

| ID        | Kind        | Claim                                                                                                              | Required evidence                                          |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `CLA-M01` | `mechanism` | The root native Agent/Task surface exposes named-agent and explicit model selectors.                               | Root schema and exact selector enum                        |
| `CLA-M02` | `mechanism` | Model resolution distinguishes explicit call selection, named-agent definition default, and parent inheritance.    | Schema precedence text; schema mode is sufficient          |
| `CLA-M03` | `mechanism` | A named OAT agent and an explicit per-call model selector can be combined in one native payload.                   | Coordinator payload and acceptance                         |
| `CLA-M04` | `mechanism` | A generic topology-probe child materializes a nested Agent/Task surface and exposes its own selector catalog.      | Generic child-reported nested schema                       |
| `CLA-M05` | `mechanism` | When generic nested dispatch exists, one exact-model leaf sentinel can be accepted and return the fixed result.    | Leaf payload, acceptance, and fixed result                 |
| `CLA-M06` | `mechanism` | The Workflow dispatch surface resolves the same named-agent registry while exposing model and effort controls.     | Live Workflow schema; launch only if separately authorized |
| `CLA-M07` | `mechanism` | `claude -p` exposes an explicit model route for a fresh CLI child.                                                 | Live help plus independent CLI control                     |
| `CLA-M08` | `mechanism` | Configured invocation and runtime-observed identity are separable evidence layers.                                 | Requested selectors and runtime-confirmation field         |
| `CLA-M09` | `mechanism` | The production phase-coordinator role may accept launch while refusing unrelated topology-probe work by contract.  | Named-role launch status and child outcome                 |
| `CLA-M10` | `mechanism` | Accepted Claude children expose a continuation handle that can resume the same child without replacement dispatch. | Launcher-owned child ID and continuation controls          |
| `CLA-M11` | `mechanism` | Omitting the model on a generic agent with no definition default inherits the parent model at runtime.             | One omit-model topology probe and child identity           |
| `CLA-S01` | `snapshot`  | The exact root and nested named-agent/model/effort selectors observed in this run.                                 | Timestamped catalog snapshots                              |
| `CLA-P01` | `policy`    | OAT must choose and document which Claude dispatch surface is sanctioned for coordinators, workers, and reviewers. | p04 design decision and contract tests                     |
| `CLA-P02` | `policy`    | Actual production coordinator-to-worker behavior is validated by p05, not by substituting topology-probe behavior. | p05 live smoke                                             |

The bounded native protocol tests Agent/Task through a generic topology probe.
`CLA-M06` is schema observation only unless the operator separately authorizes a
Workflow launch. `CLA-M09` is already observed by the noncanonical pilot but is
not repeated by default. `CLA-P01` and `CLA-P02` are not settled by provider
capability alone.

## Cursor Claims

| ID        | Kind        | Claim                                                                                                                          | Required evidence                               |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `CUR-M01` | `mechanism` | Native Task, Cursor CLI account catalog, and UI role configuration are distinct control surfaces.                              | Schema, CLI help/catalog, and dated UI evidence |
| `CUR-M02` | `mechanism` | Native Task model selectors are opaque and belong to the current dispatcher invocation.                                        | Root and nested schema sources                  |
| `CUR-M03` | `mechanism` | Omitting the native Task model invokes documented inheritance/default behavior rather than exact selection.                    | Tool-schema contract and bounded observation    |
| `CUR-M04` | `mechanism` | An exact native Task model selector can be passed byte-for-byte and launcher acceptance observed in Cursor IDE.                | Native payload and acceptance event             |
| `CUR-M05` | `mechanism` | Cursor CLI accepts an explicit opaque model selector independently of the native Task catalog.                                 | CLI help/catalog and independent control        |
| `CUR-M06` | `mechanism` | Cursor CLI structured Task-selection evidence may be absent even when the CLI process runs.                                    | Structured CLI event capture                    |
| `CUR-M07` | `mechanism` | Configured invocation and runtime-observed identity are separable evidence layers.                                             | Requested selector and runtime confirmation     |
| `CUR-S01` | `snapshot`  | The exact root, nested, and CLI catalogs observed in this run.                                                                 | Timestamped catalog snapshots                   |
| `CUR-P01` | `policy`    | Native catalog mismatch advice suggests compatible additions without removing CLI-capable ladder entries.                      | Contract tests                                  |
| `CUR-P02` | `policy`    | A below-ceiling phase coordinator whose nested catalog lacks the ceiling reviewer selects an exact CLI reviewer before launch. | P04 contract tests and p05 smoke                |

## Run Coverage

A report declares one of these scopes and uses the exact required ID set below:

- `native-capability`: the shared native IDs plus the harness native IDs.
- `cli-capability`: the shared CLI IDs plus the harness CLI IDs.
- `combined-capability`: both independent scopes in one packet.
- `supplementary`: a bounded observation that does not satisfy full canonical
  coverage.

### Shared required IDs

- Native: `U-M01`, `U-M02`, `U-M03`, `U-P06`, `U-P09`.
- CLI: `U-M02`, `U-M03`, `U-P05`, `U-P06`, `U-P09`.

### Harness required IDs

| Harness    | Native                                                                                 | CLI                                        | Supplementary or p05-owned                            |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Codex      | `COD-M01`–`COD-M06`, `COD-M08`, `COD-S01`                                              | `COD-M07`                                  | `COD-P01`                                             |
| Claude     | `CLA-M01`, `CLA-M02`, `CLA-M04`, `CLA-M05`, `CLA-M08`, `CLA-M10`, `CLA-M11`, `CLA-S01` | `CLA-M07`, `CLA-M08`                       | `CLA-M03`, `CLA-M06`, `CLA-M09`, `CLA-P01`, `CLA-P02` |
| Cursor IDE | `CUR-M01`, `CUR-M02`, `CUR-M03`, `CUR-M04`, `CUR-M07`, `CUR-S01`                       | `CUR-M05`, `CUR-M06`, `CUR-M07`, `CUR-S01` | `CUR-P01`, `CUR-P02`                                  |
| Cursor CLI | `CUR-M01`, `CUR-M02`, `CUR-M03`, `CUR-M04`, `CUR-M06`, `CUR-M07`, `CUR-S01`            | `CUR-M05`, `CUR-M06`, `CUR-M07`, `CUR-S01` | `CUR-P01`, `CUR-P02`                                  |

Ranges are inclusive. A combined report de-duplicates IDs that occur in both
native and CLI sets. Claims outside the selected set appear under non-coverage,
not as artificial verdict rows.

Pilot runs may exercise any subset, but every omitted in-scope claim must still
appear as `not_run` / `inconclusive`.
