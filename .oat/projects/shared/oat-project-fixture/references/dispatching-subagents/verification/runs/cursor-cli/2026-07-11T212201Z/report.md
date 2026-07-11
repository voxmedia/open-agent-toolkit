# Cursor CLI combined-capability verification

## 1. Run identity and immutable provenance

- Run ID: `cursor-2026-07-11T212201Z`
- Run type / scope / harness / flavor: `canonical` / `combined-capability` / `cursor` / `cli`
- Fresh session: yes
- Working directory recorded before inputs and used for every probe: `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture`
- Commit: `82322c8bdc231e947176d12586f96a74fa06a4f0`
- UTC provenance capture: `2026-07-11T21:21:14Z`
- Root model as reported: `GPT-5.6 Terra`
- Cursor CLI version: `2026.07.09-a3815c0`
- Input SHA-256:
  - `claims.md`: `d2b47c872dcfc5558bddc25f93843ef83daf82f232e680a0fec767423d4dc781`
  - `protocol.md`: `5efecc56a386331b771d0519ff5ed6ed20b125d1323b4c2678fbf572b750cfb7`
  - `dispatching-subagents-cursor-draft.md`: `97c7f7ccd7453e5e0f98d6cf076b3cfb9ad5b0edd6fd660efa432ef4de0206c7`

## 2. Coverage and non-coverage

This packet covers the required combined Cursor CLI claim set. It does not test UI role configuration, production OAT roles, write authority, coordinator-to-worker behavior, p04 contracts, or p05 smoke behavior.

`CUR-P01` and `CUR-P02` are intentionally non-coverage: p04 contract tests and p05 smoke own them. `U-P08` is likewise outside this bounded capability protocol.

## 3. Root control surfaces and catalog snapshots

At `2026-07-11T21:21:14Z`, the live root tool schema exposed a native `Subagent` dispatch tool. Its model selector values, role-type values, and omit-model behavior are transcribed verbatim in `evidence.json` snapshot `root-native-1`. The schema says: “If omitted, the subagent uses the same model as the parent.”

At `2026-07-11T21:22:01Z`, `cursor-agent --list-models` produced the CLI account catalog recorded verbatim in `provider-cli-1`. These are distinct observed surfaces. No UI role configuration was read.

## 4. Generic topology probe and leaf sentinel

Before launch, native deadline: 300 seconds. The sole generic, read-only topology probe used role `generalPurpose` and explicit opaque selector `gpt-5.6-terra-medium`, copied byte-for-byte from `root-native-1`.

The launcher connection closed before completion: “The subagent's connection closed before it finished (the run was torn down mid-flight).” No Task-selection event, JSON stream record, nested catalog, leaf payload, leaf acceptance, or sentinel result was emitted. This is a terminal interrupted outcome; no retry, replacement model, role, or route was attempted. Runtime identity was `not-reported`.

Because structured native-dispatch selection evidence was not observable, launch-dependent native claim verdicts are inconclusive. No leaf sentinel launched.

## 5. Independent CLI control

Before launch, the CLI sentinel was declared as an independent capability control with a 300-second deadline. A fresh process ran from the recorded root:

`cursor-agent --trust --print --output-format json --model 'gpt-5.6-terra-medium' 'Reply with exactly this string and nothing else: OAT_CURSOR_CLI_SENTINEL_OK'`

It exited 0 with one JSON `result` record (`subtype: success`) containing `OAT_CURSOR_CLI_SENTINEL_OK`. The result record contained neither structured Task-selection evidence nor runtime model identity; runtime identity is therefore `not-reported`. The configured invocation is separately recorded in `evidence.json`.

## 6. Claim verdicts

| Claim   | Probe status | Verdict      | Evidence                                                                  |
| ------- | ------------ | ------------ | ------------------------------------------------------------------------- |
| CUR-M01 | executed     | inconclusive | Root schema and CLI catalog observed; UI was not observed.                |
| CUR-M02 | executed     | inconclusive | Root schema observed; nested catalog unavailable after interrupted child. |
| CUR-M03 | executed     | confirmed    | Schema documents parent-model use when omitted.                           |
| CUR-M04 | executed     | inconclusive | Explicit payload submitted; no structured launch acceptance emitted.      |
| CUR-M05 | executed     | confirmed    | Fresh explicit-model CLI sentinel completed.                              |
| CUR-M06 | executed     | confirmed    | Successful CLI JSON contained no Task-selection record.                   |
| CUR-M07 | executed     | confirmed    | Configured selectors are recorded; runtime identity absent.               |
| CUR-S01 | executed     | inconclusive | Exact observed root and CLI catalogs retained; nested catalog unobserved. |
| U-M01   | executed     | inconclusive | Nested catalog could not be observed.                                     |
| U-M02   | executed     | confirmed    | Fresh CLI launch has configured-invocation acceptance evidence.           |
| U-M03   | executed     | confirmed    | Successful CLI result lacked runtime identity.                            |
| U-P05   | executed     | confirmed    | CLI was declared independently and explicitly selected before launch.     |
| U-P06   | executed     | confirmed    | No fallback followed the interrupted native or accepted CLI probe.        |
| U-P09   | executed     | confirmed    | No continuation or replacement dispatch occurred.                         |

## 7. Contradictions and contract corrections

No claim was contradicted. The native topology launch did not produce sufficient structured evidence to confirm native selection or nested dispatch; this is recorded as inconclusive, not as a failed schema claim.

## 8. Recommended harness topology

For a bounded Cursor CLI capability control, enumerate the CLI account catalog, select an exact opaque CLI model before a fresh child launch, and retain configured invocation separately from runtime identity. Native topology verification needs a flavor that returns launcher-owned structured selection events and permits the one generic child to report its nested schema.

## 9. Redaction and raw evidence

Redaction review completed. No credentials or tokens are present. No `raw/` artifacts were created; the bounded catalog snapshots, launch payloads, diagnostics, and child result are retained in `evidence.json`.
