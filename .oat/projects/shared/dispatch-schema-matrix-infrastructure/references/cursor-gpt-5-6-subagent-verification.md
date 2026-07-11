# Cursor GPT-5.6 Subagent Verification

This artifact records one canonical Cursor Task/subagent probe for every distinct GPT-5.6 candidate derived from recommendation version `2026-07-10.2`. Candidate strings are opaque: neither spelling nor broad catalog presence establishes subagent eligibility.

## Protocol metadata

<!-- OAT_CURSOR_METADATA_START -->

```json
{
  "schemaVersion": 1,
  "recommendationVersion": "2026-07-10.2",
  "recommendationSha256": "01cc3d6c1c451090a1a1439d4fbaa359e25f8e6edb93bb022558607f57234527",
  "sentinel": "OAT_CURSOR_SUBAGENT_MODEL_VALID",
  "canonicalPromptTemplate": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"<candidate>\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
  "canonicalCommandShape": [
    "cursor-agent",
    "[--api-key <redacted>]",
    "-p",
    "<canonical-prompt>",
    "--output-format=text",
    "--force"
  ],
  "captureRules": [
    "Invoke each distinct recommendation candidate exactly once; do not retry within this pass.",
    "Capture stdout and stderr separately, the direct child exit status or termination signal, and monotonic duration.",
    "Record only sanitized binary, version, credential-presence, and credential-store context; never persist credentials or tokens.",
    "Treat catalog output as diagnostic-only and never as proof of Task/subagent eligibility."
  ],
  "outcomeVocabulary": ["pending", "valid", "unknown-value", "unvalidated"],
  "catalogRole": "diagnostic-only"
}
```

<!-- OAT_CURSOR_METADATA_END -->

## Capture baseline

- Capture time: `2026-07-11T02:45:15Z`
- Recommendation: version `2026-07-10.2`, SHA-256 `01cc3d6c1c451090a1a1439d4fbaa359e25f8e6edb93bb022558607f57234527`
- `command -v cursor-agent`: `/Users/tstang/.local/bin/cursor-agent`
- `command -v agent`: `/Users/tstang/.local/bin/agent`
- `cursor-agent --version`: `2026.07.09-a3815c0` (exit 0)
- `agent --version`: `2026.07.09-a3815c0` (exit 0)
- `CURSOR_API_KEY`: present; value was used by the canonical implementation and replaced with `<redacted>` everywhere in this artifact
- `AGENT_CLI_CREDENTIAL_STORE`: unset
- Probe timeout: 10,000 ms per direct child, matching the availability implementation
- Recheck date for every non-valid result: `2026-07-18`

## Configured subset

The currently configured subset is called out separately from the full recommendation inventory. Configuration does not imply availability. All four configured candidates produced `unvalidated` results in this pass: none returned the exact sentinel or a recognized explicit subagent allow-list.

<!-- OAT_CURSOR_CONFIGURED_SUBSET_START -->

```json
{
  "candidates": [
    "gpt-5.6-luna-high",
    "gpt-5.6-terra-xhigh",
    "gpt-5.6-sol-high",
    "gpt-5.6-sol-max"
  ]
}
```

<!-- OAT_CURSOR_CONFIGURED_SUBSET_END -->

## Candidate inventory and live outcome

| Candidate              | Recommendation tier | Configured | Outcome     |
| ---------------------- | ------------------- | ---------- | ----------- |
| `gpt-5.6-luna-low`     | economy             | no         | unvalidated |
| `gpt-5.6-luna-medium`  | economy             | no         | unvalidated |
| `gpt-5.6-luna-high`    | economy             | yes        | unvalidated |
| `gpt-5.6-luna-xhigh`   | balanced            | no         | unvalidated |
| `gpt-5.6-terra-low`    | balanced            | no         | unvalidated |
| `gpt-5.6-terra-medium` | balanced            | no         | unvalidated |
| `gpt-5.6-terra-high`   | balanced            | no         | unvalidated |
| `gpt-5.6-terra-xhigh`  | balanced            | yes        | unvalidated |
| `gpt-5.6-sol-low`      | high                | no         | unvalidated |
| `gpt-5.6-sol-medium`   | high                | no         | unvalidated |
| `gpt-5.6-sol-high`     | high                | yes        | unvalidated |
| `gpt-5.6-sol-xhigh`    | frontier            | no         | unvalidated |
| `gpt-5.6-sol-max`      | frontier            | yes        | unvalidated |

## Outcome rules

- `valid`: the direct invocation exits successfully and stdout contains a line exactly equal to the sentinel, or Cursor returns an explicit subagent allow-list containing the exact candidate.
- `unknown-value`: Cursor returns an explicit subagent allow-list that excludes the exact candidate.
- `unvalidated`: no sentinel and no decisive allow-list result is available, including CLI absence, timeout, authentication failure, model-unavailable prose without the canonical allow-list grammar, or non-sentinel success.
- `pending`: the live probe has not yet been run. Only the protocol-stage checker invocation may allow this state.

A broad `cursor-agent models` or `cursor-agent --list-models` result is diagnostic-only. It can explain an `unvalidated` result but can never promote one to `valid`. No broad catalog command was needed or used as outcome proof in this pass.

## Evidence records

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-low",
  "tier": "economy",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-low\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-low\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "",
    "stderr": "ETIMEDOUT: spawnSync cursor-agent ETIMEDOUT",
    "directExitStatus": 143,
    "terminationSignal": null,
    "durationMs": 10015
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->
<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-medium",
  "tier": "economy",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-medium\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-medium\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "",
    "stderr": "ETIMEDOUT: spawnSync cursor-agent ETIMEDOUT",
    "directExitStatus": 143,
    "terminationSignal": null,
    "durationMs": 10015
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-high",
  "tier": "economy",
  "configured": true,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-high\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-high\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model unavailable: gpt-5.6-luna-high.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 9330
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-xhigh",
  "tier": "balanced",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-xhigh\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-luna-xhigh\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model `gpt-5.6-luna-xhigh` is unavailable, so no subagent was launched.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 8289
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-low",
  "tier": "balanced",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-low\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-low\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model unavailable. Available GPT‑5.6 models: `gpt-5.6-sol-high-fast`, `gpt-5.6-terra-medium`.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 9483
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-medium",
  "tier": "balanced",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-medium\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-medium\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "",
    "stderr": "ETIMEDOUT: spawnSync cursor-agent ETIMEDOUT",
    "directExitStatus": 143,
    "terminationSignal": null,
    "durationMs": 10013
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-high",
  "tier": "balanced",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-high\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-high\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model unavailable: `gpt-5.6-terra-high`. Available Terra model: `gpt-5.6-terra-medium`.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 9896
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-xhigh",
  "tier": "balanced",
  "configured": true,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-xhigh\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-terra-xhigh\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model `gpt-5.6-terra-xhigh` is unavailable. Available variant: `gpt-5.6-terra-medium`.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 8725
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-low",
  "tier": "high",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-low\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-low\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model `gpt-5.6-sol-low` is unavailable; the subagent was not launched. Available GPT-5.6 models: `gpt-5.6-sol-high-fast`, `gpt-5.6-terra-medium`.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 8680
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-medium",
  "tier": "high",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-medium\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-medium\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "",
    "stderr": "Connection lost, reconnecting to https://agentn.us.api5.cursor.sh (attempt 1)...\n\nETIMEDOUT: spawnSync cursor-agent ETIMEDOUT",
    "directExitStatus": 143,
    "terminationSignal": null,
    "durationMs": 10028
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-high",
  "tier": "high",
  "configured": true,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-high\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-high\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model unavailable. Available equivalent: `gpt-5.6-sol-high-fast`.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 8093
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-xhigh",
  "tier": "frontier",
  "configured": false,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-xhigh\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-xhigh\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "",
    "stderr": "ETIMEDOUT: spawnSync cursor-agent ETIMEDOUT",
    "directExitStatus": 143,
    "terminationSignal": null,
    "durationMs": 10030
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-max",
  "tier": "frontier",
  "configured": true,
  "status": "unvalidated",
  "probe": {
    "executed": true,
    "utcDate": "2026-07-11",
    "commandArgvSanitized": [
      "cursor-agent",
      "--api-key",
      "<redacted>",
      "-p",
      "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-max\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
      "--output-format=text",
      "--force"
    ],
    "prompt": "Validate whether a Cursor subagent Task can be launched with a specific model.\nUse the Task tool once with model \"gpt-5.6-sol-max\" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.\nAfter the subagent returns, print only its exact reply.",
    "stdout": "Model `gpt-5.6-sol-max` is unavailable. Available GPT-5.6 models: `gpt-5.6-sol-high-fast`, `gpt-5.6-terra-medium`.\n",
    "stderr": "",
    "directExitStatus": 0,
    "terminationSignal": null,
    "durationMs": 8504
  },
  "environment": {
    "selectedBinary": "cursor-agent",
    "binaryPath": "/Users/tstang/.local/bin/cursor-agent",
    "clientVersion": "2026.07.09-a3815c0",
    "cursorApiKey": "present",
    "credentialStore": "unset"
  },
  "outcomeBasis": "no-definitive-task-evidence",
  "catalogDiagnostic": "Not run. Broad catalog presence is diagnostic-only and cannot establish Task/subagent eligibility.",
  "recheckDate": "2026-07-18"
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->
