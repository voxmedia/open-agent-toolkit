# Cursor IDE dispatch verification

## 1. Run identity and immutable provenance

- Run ID: `cursor-2026-07-11T210832Z`
- Run type: `canonical`; scope: `combined-capability`; harness: `cursor`; flavor: `ide`
- Captured: `2026-07-11T21:13:45Z`
- Repository commit: `3111442a0831c3e5f1305968313f16fde7f2be40`
- Root model reported: `GPT-5.6 Terra`
- Cursor CLI version output: `3.10.20`; account access was unblocked during this run.
- `claims.md`: `d2b47c872dcfc5558bddc25f93843ef83daf82f232e680a0fec767423d4dc781`
- `protocol.md`: `5efecc56a386331b771d0519ff5ed6ed20b125d1323b4c2678fbf572b750cfb7`
- `dispatching-subagents-cursor-draft.md`: `97c7f7ccd7453e5e0f98d6cf076b3cfb9ad5b0edd6fd660efa432ef4de0206c7`

## 2. Coverage and non-coverage

This packet covers the Cursor IDE native and Cursor CLI capability claim sets, deduplicated for combined scope.

Excluded from verdict rows: `CUR-P01` and `CUR-P02`; p04 contract tests and p05 smoke own them. Also excluded: full production coordinator/worker behavior, review routing, write authority, and UI role-configuration observation.

## 3. Root control surfaces and catalog snapshots

Root native schema snapshot: `2026-07-11T21:07:00Z`, source `tool-schema`.

Exact root model selector values:

```text
claude-fable-5-thinking-high
claude-opus-4-8-thinking-high
claude-sonnet-5-thinking-high
composer-2.5-fast
glm-5.2-high
gpt-5.5-medium
gpt-5.6-sol-medium
gpt-5.6-terra-medium
grok-4.5-fast-xhigh
```

Available agent/role types:

```text
generalPurpose
explore
shell
cursor-guide
ci-investigator
bugbot
security-review
best-of-n-runner
oat-codebase-mapper
oat-phase-implementer
oat-reviewer
skeptical-evaluator
codex-rescue
consensus-section-runner
```

Documented omit-model behavior, verbatim: `If omitted, the subagent uses the same model as the parent agent.`

The root schema snapshot treats all model selector values as opaque. The separately invoked `cursor-agent --list-models` returned the account catalog; every exact selector is retained in `evidence.json` as `provider-cli-1`. No UI role configuration was inspected.

## 4. Generic topology probe and leaf sentinel

Before the native launch, a 120-second deadline was declared. Exactly one generic read-only `generalPurpose` topology probe was launched with explicit selector `gpt-5.6-terra-medium`; its launcher status was accepted and child outcome completed. Its complete payload is retained in `evidence.json` as `native-topology`. Runtime identity was not reported.

The child independently observed a nested schema at `2026-07-11T21:08:00Z`. Its exact models, roles, and omit-model wording exactly matched the root snapshot above; this is recorded as an independent snapshot, not as inherited evidence.

Before its one nested leaf launch, the child received a 120-second deadline. It launched exactly one read-only `generalPurpose` leaf with explicit nested-catalog selector `gpt-5.6-terra-medium`. Launcher status was accepted, child outcome completed, runtime identity was not reported, and the verbatim result was:

```text
OAT_CURSOR_NESTED_SENTINEL_OK
```

No continuation, replacement model, replacement role, or fallback route was attempted after either accepted native launch.

## 5. Independent CLI control

Before CLI enumeration, the CLI capability was declared independent from the native scope and its potential sentinel was bounded to 120 seconds. The account catalog was successfully enumerated.

The first exact-model command was rejected before start because it lacked the CLI-required explicit workspace-trust flag. After the user approved workspace trust, the same exact selector and fixed prompt were retried with `--trust`; its 120-second deadline was declared before launch.

The trusted CLI sentinel was accepted and completed:

```text
OAT_CURSOR_CLI_SENTINEL_OK
```

Its JSON result contained success metadata and the fixed result, but no structured Task-selection event or runtime model-identity field. This confirms absent CLI Task observability for this invocation; process completion was not used as Task-selection evidence.

## 6. Claim verdicts

| Claim   | Probe status | Verdict   | Basis                                                                                      |
| ------- | ------------ | --------- | ------------------------------------------------------------------------------------------ |
| CUR-M01 | executed     | confirmed | Native schema and independent CLI account catalog observed; UI remains a separate surface. |
| CUR-M02 | executed     | confirmed | Independent root and nested opaque-selector schema snapshots captured.                     |
| CUR-M03 | executed     | confirmed | Root schema documents parent-model inheritance on omission.                                |
| CUR-M04 | executed     | confirmed | Explicit byte-for-byte native selector was accepted.                                       |
| CUR-M05 | executed     | confirmed | CLI accepted the exact catalog selector independently of native Task.                      |
| CUR-M06 | executed     | confirmed | Successful JSON result contained no structured Task-selection event.                       |
| CUR-M07 | executed     | confirmed | Requested selectors and absent runtime identity remain separate.                           |
| CUR-S01 | executed     | confirmed | Exact root, nested, and CLI catalogs captured.                                             |
| U-M01   | executed     | confirmed | Root and nested catalogs independently materialized and timestamped.                       |
| U-M02   | executed     | confirmed | Native launcher acceptance recorded separately from outcome.                               |
| U-M03   | executed     | confirmed | Missing runtime identity did not negate accepted launches.                                 |
| U-P05   | executed     | confirmed | CLI control declared independently, never used as fallback.                                |
| U-P06   | executed     | confirmed | No replacement route followed accepted native launches.                                    |
| U-P09   | executed     | confirmed | No continuation/replacement ambiguity; nested leaf was separately authorized.              |

## 7. Contradictions and contract corrections

No contradiction was observed.

## 8. Recommended harness topology

For this observed IDE session, use a generic read-only native topology probe with a freshly captured exact selector; have the child independently snapshot its own catalog before any nested selection. Treat a CLI route as an independently declared pre-start control and only select it from a successfully enumerated CLI account catalog. Do not use CLI process completion to infer Task-selection evidence.

## 9. Redaction and raw evidence

No credentials or tokens are included. `evidence.json` contains bounded payloads, launcher status, outcomes, and redacted diagnostics. No `raw/` evidence was retained.
