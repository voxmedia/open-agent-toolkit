# Codex combined-capability verification

## 1. Run identity and immutable provenance

- Run ID: `codex-2026-07-11T205116Z`
- Run type: `canonical`; harness: `codex`; scope: `combined-capability`; flavor: `not-applicable`.
- Fresh root session: reported as canonical by the operator; no observed contamination.
- Captured at: `2026-07-11T20:51:16Z`.
- Working directory: `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture`.
- Repository commit: `d3288a056eae214d1eb617e51d1ea94da5291619`.
- Inputs read, in the required order: `claims.md` (`d2b47c872dcfc5558bddc25f93843ef83daf82f232e680a0fec767423d4dc781`), `protocol.md` (`5efecc56a386331b771d0519ff5ed6ed20b125d1323b4c2678fbf572b750cfb7`), and `dispatching-subagents-codex-draft.md` (`b811d1d769194b5db6ae278da22290e623a0c41980578cfe470914d3569103a0`).
- Runtime: root reports itself as Codex based on GPT-5; no root reasoning-effort selector was reported. `codex --version` returned `codex-cli 0.144.1`.

## 2. Coverage and non-coverage

This packet covers every required combined-scope Codex claim: native `COD-M01`, `COD-M02`, `COD-M03`, `COD-M04`, `COD-M05`, `COD-M06`, `COD-M08`, `COD-S01`, `U-M01`, `U-M02`, `U-M03`, `U-P06`, `U-P09`; and CLI `COD-M07`, `U-P05` (de-duplicating the shared rows).

`U-P08` is non-coverage: review routing is phase-scoped and owned by the p04/p05 work specified in the claims ledger. `COD-P01` and production coordinator-to-worker behavior are likewise outside this capability protocol.

## 3. Root control surfaces and snapshots

The root native catalog was transcribed from the live `agents.spawn_agent` tool schema at `2026-07-11T20:50:35Z`, not from materialized configuration. It exposed agent types `oat-codebase-mapper`, all listed `oat-phase-implementer*` and `oat-reviewer*` variants, `skeptical-evaluator`, `default`, `explorer`, and `worker`; models `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, and `gpt-5.4`; and efforts `low`, `medium`, `high`, `xhigh`, `max`, and `ultra`. The root schema also exposed `fork_turns` (`none`, `all`, or a positive integer), and optional explicit `model` and `reasoning_effort`; omitted overrides inherit the parent model.

`agents.max_depth` was effectively `2`, sourced from the repository `.codex/config.toml` `[agents]` section. The user config contained `max_depth = 3`, but the project setting is the applicable repository-level value. The same user config independently declared `sandbox_mode = "danger-full-access"`; `codex exec --help` independently exposed `--sandbox` values `read-only`, `workspace-write`, and `danger-full-access`. These are separate configuration/control surfaces; this run did not exercise write authority.

The accepted depth-1 child separately reported a live nested `agents.spawn_agent` schema with the same selector catalog. That is an independent nested-dispatch observation, not an inference from the root catalog.

## 4. Native generic topology probe and leaf

Before launch, the native deadline was declared as 240 seconds. One generic `default` topology child was launched with explicit `model: gpt-5.6-luna`, `reasoning_effort: low`, and required self-contained `fork_turns: none`. The launcher returned task `/root/codex_topology_probe` and nickname `Hilbert`, which is acceptance evidence. Its complete prompt and its structured report are preserved in `evidence.json`.

The accepted child reported nested spawn availability and launched exactly one depth-2 `default` leaf with the same explicit pair and `fork_turns: none`. It reported the launcher result as successfully launched, with task `/root/codex_topology_probe/nested_leaf` and nickname `Godel`; its verbatim result was `OAT_CODEX_NESTED_SENTINEL_OK`. Neither child self-reported a runtime model identity. That absence did not alter either accepted launch record.

No other topology role/model/route was attempted, and no continuation was launched.

## 5. Independent CLI control

Before launch, the CLI deadline was declared as 240 seconds and this was declared independent of the native scope. `codex exec --help` exposed `--model <MODEL>` and `-c/--config <key=value>`; the latter accepts `model_reasoning_effort` configuration. One command was invoked:

```text
codex exec --ephemeral --ignore-rules --sandbox read-only --json --model gpt-5.6-luna -c 'model_reasoning_effort="low"' 'Reply with exactly this string and nothing else: OAT_CODEX_CLI_SENTINEL_OK' < /dev/null
```

It exited `0`, emitted a thread-start event, and returned exactly `OAT_CODEX_CLI_SENTINEL_OK` in the completed agent message. A transport/auth diagnostic also appeared, but did not prevent completion. No CLI continuation or alternate CLI route was launched.

## 6. Claim verdicts

| Claim   | Probe status | Verdict   | Evidence mode  | Rationale                                                                                           |
| ------- | ------------ | --------- | -------------- | --------------------------------------------------------------------------------------------------- |
| COD-M01 | executed     | confirmed | schema         | Root live spawn schema exposed types, model/effort overrides, and fork/inheritance controls.        |
| COD-M02 | executed     | confirmed | launch         | Generic native topology payload was accepted.                                                       |
| COD-M03 | executed     | confirmed | config         | Effective project `agents.max_depth` was 2, sufficient for root → child → leaf.                     |
| COD-M04 | executed     | confirmed | runtime-report | Accepted generic child exposed nested spawn and reported one accepted exact leaf with fixed result. |
| COD-M05 | executed     | confirmed | config         | Depth and sandbox/write controls were independently exposed and configured.                         |
| COD-M06 | executed     | confirmed | launch         | Both native launches were accepted without child runtime identity self-report.                      |
| COD-M07 | executed     | confirmed | help           | Live CLI help exposed model/config controls; independent explicit CLI sentinel completed.           |
| COD-M08 | executed     | confirmed | launch         | Explicit type/model/effort overrides with `fork_turns: none` were accepted.                         |
| COD-S01 | executed     | confirmed | schema         | Timestamped root and nested catalog snapshots are recorded.                                         |
| U-M01   | executed     | confirmed | runtime-report | Root and nested catalogs were observed in separate dispatcher invocations.                          |
| U-M02   | executed     | confirmed | launch         | Native and independently declared CLI acceptance records are launcher evidence.                     |
| U-M03   | executed     | confirmed | launch         | No runtime model identity was used as availability evidence.                                        |
| U-P05   | executed     | confirmed | launch         | CLI was declared as an independent capability control before either route completed.                |
| U-P06   | executed     | confirmed | launch         | No fallback followed an accepted launch; the sole leaf was the separately authorized nested action. |
| U-P09   | executed     | confirmed | launch         | No continuation or replacement route was launched.                                                  |

## 7. Contradictions and contract corrections

None. The CLI transport/auth diagnostic is recorded as a diagnostic, not a contradiction, because the command completed successfully with the fixed sentinel.

## 8. Recommended harness topology

For a bounded topology probe, use `default` with explicit `gpt-5.6-luna` / `low` and `fork_turns: none`; project `agents.max_depth = 2` admits exactly one nested leaf. Preserve acceptance, child outcome, and any runtime identity as separate evidence fields. Use the independent read-only `codex exec` route only as its declared CLI-capability control, not after native acceptance.

## 9. Redaction and raw evidence

All included command lines, prompts, selectors, launcher paths, and diagnostics were reviewed for credentials and tokens; none are present. No `raw/` directory was created because the JSON packet retains the bounded supporting data.
