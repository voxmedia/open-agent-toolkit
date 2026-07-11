# Cursor IDE Dispatch Verification Report

## 1. Run identity and immutable input provenance

- Run ID: `cursor-ide-2026-07-11T205622Z`
- Recorded run type: `pilot/noncanonical` (downgraded from the session's
  `canonical` declaration); scope: `combined-capability`; harness: `cursor`;
  flavor: `ide`.
- Native working directory:
  `/Users/tstang/.cursor/worktrees/open-agent-toolkit__SSH__tstang-mini_/l4vt`
- CLI working directory:
  `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture`
- Repository commit: `3111442a0831c3e5f1305968313f16fde7f2be40`
- Root model reported by this session: `GPT-5.6 Terra`
- Cursor version: `3.10.20`
- Provenance verification timestamp: `2026-07-11T20:56:10Z`
- `claims.md`: `d2b47c872dcfc5558bddc25f93843ef83daf82f232e680a0fec767423d4dc781`
- `protocol.md`: `5efecc56a386331b771d0519ff5ed6ed20b125d1323b4c2678fbf572b750cfb7`
- `dispatching-subagents-cursor-draft.md`: `97c7f7ccd7453e5e0f98d6cf076b3cfb9ad5b0edd6fd660efa432ef4de0206c7`

The first two provenance-shell attempts returned no observable completion
state. They were identical read-only attempts to capture Git metadata, input
hashes, version information, and the clock. The successful provenance capture
above occurred after the native probe. The native and CLI actions also ran in
the two different working directories recorded above. This packet is therefore
noncanonical and not promotion eligible.

## 2. Coverage and excluded behavior

Native and CLI were declared as independent capability controls before the native launch. Native scope executed. CLI enumeration was blocked by the locked macOS login keychain, so no CLI sentinel was launched.

Not covered: UI role configuration; production coordinator/worker behavior; write authority; planning/implementation review routing; `CUR-P01`; and `CUR-P02`. The latter two are owned by p04 contract tests and p05 smoke evidence.

## 3. Root control surfaces and catalog snapshots

Root native schema snapshot: `2026-07-11T20:51:00Z` (session timestamp resolution). Tool: `Subagent`. Available types: `generalPurpose`, `explore`, `shell`, `cursor-guide`, `ci-investigator`, `bugbot`, `security-review`, `best-of-n-runner`, `oat-codebase-mapper`, `oat-phase-implementer`, `oat-reviewer`, `skeptical-evaluator`, `codex-rescue`, `consensus-section-runner`.

Root native model selectors, verbatim: `claude-fable-5-thinking-high`, `claude-opus-4-8-thinking-high`, `claude-sonnet-5-thinking-high`, `composer-2.5-fast`, `glm-5.2-high`, `gpt-5.5-medium`, `gpt-5.6-sol-medium`, `gpt-5.6-terra-medium`, `grok-4.5-fast-xhigh`. The documented omit-model behavior is that the nested agent uses the parent agent’s model.

CLI account enumeration at `2026-07-11T20:56:10Z` failed before catalog output: “Your macOS login keychain is locked.” No UI catalog was inspected.

## 4. Generic topology probe and leaf sentinel

Before launch, the native topology probe was assigned a 180-second deadline. It used generic read-only `generalPurpose` with explicit opaque selector `gpt-5.6-terra-medium`. Launcher acceptance was observed; its outcome completed. Runtime identity was `not-reported`.

The child independently snapshot its nested schema at `2026-07-11T20:52:00Z` and reported the same exact selector and type arrays above. It documented the same omit-model behavior. It launched exactly one nested generic read-only leaf, with a 180-second inherited probe deadline, using its own exact selector `gpt-5.6-terra-medium`. The leaf was accepted and returned exactly `OAT_CURSOR_NESTED_SENTINEL_OK`; runtime identity was `not-reported`.

No continuation, replacement native route, production OAT role, or second leaf was attempted.

## 5. Independent CLI control

Before attempted enumeration, the CLI sentinel was declared as an independent control with a 120-second deadline. The required account catalog command failed due to the locked keychain, leaving no exact account selector available. Therefore no CLI sentinel was launched. No structured Task/selection events were observable; CLI Task observability is inconclusive.

## 6. Claim verdicts

| Claim   | Probe status | Verdict      | Basis                                                                                      |
| ------- | ------------ | ------------ | ------------------------------------------------------------------------------------------ |
| CUR-M01 | executed     | inconclusive | Native schema and blocked CLI control observed; UI configuration was not observed.         |
| CUR-M02 | executed     | confirmed    | Root and child independently reported opaque, exact model arrays.                          |
| CUR-M03 | executed     | confirmed    | Both schema snapshots documented parent-model behavior when omitted.                       |
| CUR-M04 | executed     | confirmed    | Exact root selector payload was accepted.                                                  |
| CUR-M05 | blocked      | inconclusive | CLI account catalog was blocked before an explicit-model launch.                           |
| CUR-M06 | not_run      | inconclusive | No CLI sentinel could run, so no structured Task event surface was observable.             |
| CUR-M07 | executed     | confirmed    | Native configured selector and missing runtime identity were recorded separately.          |
| CUR-S01 | executed     | inconclusive | Root and nested catalogs were captured; CLI catalog was unavailable.                       |
| U-M01   | executed     | confirmed    | Root and nested catalogs were timestamped as independent invocation observations.          |
| U-M02   | executed     | confirmed    | Launcher acceptance was recorded separately from child completion.                         |
| U-M03   | executed     | confirmed    | Both native launches retained `not-reported` runtime identity without negating acceptance. |
| U-P05   | executed     | confirmed    | CLI was declared independently and no post-acceptance native fallback was attempted.       |
| U-P06   | executed     | confirmed    | The accepted topology launch was terminal; no replacement route was launched.              |
| U-P09   | executed     | confirmed    | No continuation or replacement dispatch occurred.                                          |

## 7. Contradictions and contract corrections

No contradiction was observed. The post-probe provenance capture and mixed
working directories prevent this packet from satisfying the protocol's clean
canonical-promotion condition.

## 8. Recommended harness topology

For a fresh rerun: capture immutable provenance and root schema first; dispatch one explicit-model generic read-only native topology probe; permit its one exact nested leaf; independently enumerate the unlocked CLI catalog and run at most one explicit-model CLI sentinel.

## 9. Redaction and raw evidence

No credentials or tokens were recorded. `raw/` was not created because the structured packet contains the bounded evidence needed for these verdicts.
