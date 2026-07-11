# Codex Dispatch Verification — 2026-07-11T20:22:08Z

> **Run status: PILOT / NONCANONICAL.** The root session authored and reviewed
> protocol v2 before probing. This packet stress-tests the Codex surface; it is
> not promotion-grade evidence.

## Provenance

- repository commit: `101075cacae15591a0c1b2b1735dc12ab8d224a0`
- fresh session: **no**
- scope: `combined-capability`
- input hashes (SHA-256):
  - `claims.md`: `4e7fbd7c1bad71d0e2781e1c32e5c55e67ed8efbb894187157a653e2119e9557`
  - `protocol.md`: `0c0b57747f27121af7162a071009f94e60dd2288f72eb184573fcd473a6490cd`
  - `dispatching-subagents-codex-draft.md`: `b811d1d769194b5db6ae278da22290e623a0c41980578cfe470914d3569103a0`

## Runtime

- harness: Codex
- configured root model: `gpt-5.6-sol`
- configured root effort: `high`
- CLI version: `codex-cli 0.144.1`
- working directory:
  `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture`
- effective `agents.max_depth`: `3`, from `~/.codex/config.toml`

The configured root values are configuration evidence, not runtime identity
corroboration.

## Root Native Catalog

- enumeration source: live root `spawn_agent` schema
- agent type, model, reasoning effort, service tier, and fork context are
  separate payload controls
- model override labels: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`,
  `gpt-5.5`, `gpt-5.4`
- omitted model/effort/service tier inherit from the parent
- explicit role/model overrides require the host-compatible self-contained
  fork context rather than a full-history fork

The complete verbatim root agent-type list is recorded in `evidence.json`.

## Nested Native Catalog

- topology probe payload: default agent type, `gpt-5.6-terra`, effort `low`,
  `fork_turns: none`
- accepted: yes; child path `/root/codex_topology_probe`
- nested spawn available: yes
- child-reported models: the same five model override labels
- child-reported efforts: `low`, `medium`, `high`, `xhigh`, `max`, `ultra`
- exact nested agent-type inventory: **inconclusive** because the pilot child
  compressed variant families into brace expressions instead of returning
  verbatim selectable strings

## Native Sentinel

- leaf payload: default agent type, `gpt-5.6-luna`, effort `low`,
  `fork_turns: none`
- accepted: yes; child path
  `/root/codex_topology_probe/codex_nested_sentinel`
- result: `OAT_CODEX_NESTED_SENTINEL_OK`
- runtime identity: `not-reported`

Depth-2 native dispatch with explicit model and effort controls is confirmed at
the configured-invocation layer.

## CLI Surface

- help confirms `--model`, generic `-c key=value` configuration overrides,
  `--sandbox read-only`, `--ephemeral`, `--ignore-rules`, and JSONL output
- sentinel used explicit `gpt-5.6-luna` plus
  `model_reasoning_effort="low"`, ephemeral mode, read-only sandbox, and no
  repository requirement
- accepted: yes
- result: `OAT_CODEX_CLI_SENTINEL_OK`
- runtime identity: `not-reported`; JSONL did not expose the executing model ID
- diagnostic: one MCP transport reported `AuthorizationRequired`; the turn
  still completed successfully, so the diagnostic did not change launch status
  or child outcome

## Claim Verdicts

| Claim     | Probe status | Verdict      | Evidence mode  | Note                                                |
| --------- | ------------ | ------------ | -------------- | --------------------------------------------------- |
| `U-M01`   | executed     | confirmed    | schema         | Root and nested catalogs were separate observations |
| `U-M02`   | executed     | confirmed    | launch         | Native and CLI acceptance were observable           |
| `U-M03`   | executed     | confirmed    | runtime-report | Missing runtime identity did not negate acceptance  |
| `U-P05`   | executed     | confirmed    | launch         | CLI control was declared independent, not fallback  |
| `U-P06`   | executed     | confirmed    | launch         | No alternate route followed acceptance              |
| `U-P09`   | not_run      | inconclusive | schema         | No continuation was exercised                       |
| `COD-M01` | executed     | confirmed    | schema         | Root selectors were transcribed verbatim            |
| `COD-M02` | executed     | confirmed    | launch         | Generic topology payload was accepted               |
| `COD-M03` | executed     | confirmed    | config         | Effective max depth was 3                           |
| `COD-M04` | executed     | inconclusive | launch         | Leaf succeeded; nested role list was compressed     |
| `COD-M05` | executed     | confirmed    | config         | Depth and write/sandbox controls are independent    |
| `COD-M06` | executed     | confirmed    | launch         | Accepted children did not need identity self-report |
| `COD-M07` | executed     | confirmed    | help           | Explicit CLI model/effort sentinel succeeded        |
| `COD-M08` | executed     | confirmed    | launch         | Exact overrides accepted with `fork_turns: none`    |
| `COD-S01` | executed     | inconclusive | schema         | Root exact; nested role snapshot incomplete         |

Policy verdicts describe this run's adherence, not universal policy truth.

## Contract Corrections

1. Canonical prompts must require verbatim selector arrays and forbid brace,
   range, wildcard, or family shorthand.
2. Fork-context mode is part of the exact Codex payload. A host may reject a
   specialized role/model override paired with an incompatible full-history
   fork before launch.
3. Nonfatal diagnostics need a separate evidence field; they do not imply
   launch rejection or child failure.
4. Requested model/effort and runtime-confirmed identity remain separate. This
   CLI JSONL surface did not corroborate runtime model identity.

## Coverage / Non-Coverage

Covered: root native selectors, effective depth, generic depth-1 topology,
explicit depth-2 leaf, CLI help, and one ephemeral read-only CLI sentinel.

Not covered: production phase-coordinator behavior (`COD-P01`), write-capable permissions,
continuation, review routing, catalog stability across sessions, or complete
nested role enumeration.

## Recommended Harness Topology

```text
Codex root
  → generic topology probe, fork_turns:none
      → exact default leaf, model + effort, depth 2
```

Production OAT roles require self-contained Phase Scope or Task Scope packets;
p05 live smoke evidence owns their behavioral validation.
