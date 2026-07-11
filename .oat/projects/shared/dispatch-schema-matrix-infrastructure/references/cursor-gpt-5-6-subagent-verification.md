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

## Configured subset

The currently configured subset is called out separately from the full recommendation inventory. It receives the same one-probe-per-candidate treatment; configuration does not imply availability.

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

## Candidate inventory

| Candidate              | Recommendation tier | Configured | Initial state |
| ---------------------- | ------------------- | ---------- | ------------- |
| `gpt-5.6-luna-low`     | economy             | no         | pending       |
| `gpt-5.6-luna-medium`  | economy             | no         | pending       |
| `gpt-5.6-luna-high`    | economy             | yes        | pending       |
| `gpt-5.6-luna-xhigh`   | balanced            | no         | pending       |
| `gpt-5.6-terra-low`    | balanced            | no         | pending       |
| `gpt-5.6-terra-medium` | balanced            | no         | pending       |
| `gpt-5.6-terra-high`   | balanced            | no         | pending       |
| `gpt-5.6-terra-xhigh`  | balanced            | yes        | pending       |
| `gpt-5.6-sol-low`      | high                | no         | pending       |
| `gpt-5.6-sol-medium`   | high                | no         | pending       |
| `gpt-5.6-sol-high`     | high                | yes        | pending       |
| `gpt-5.6-sol-xhigh`    | frontier            | no         | pending       |
| `gpt-5.6-sol-max`      | frontier            | yes        | pending       |

## Outcome rules

- `valid`: the direct invocation exits successfully and stdout contains a line exactly equal to the sentinel, or Cursor returns an explicit subagent allow-list containing the exact candidate.
- `unknown-value`: Cursor returns an explicit subagent allow-list that excludes the exact candidate.
- `unvalidated`: no sentinel and no decisive allow-list result is available, including CLI absence, timeout, authentication failure, or non-sentinel success.
- `pending`: the live probe has not yet been run. Only the protocol-stage checker invocation may allow this state.

A broad `cursor-agent models` or `cursor-agent --list-models` result is diagnostic-only. It can explain an `unvalidated` result but can never promote one to `valid`. Every non-valid final result carries a concrete recheck date.

## Evidence records

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-low",
  "tier": "economy",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-medium",
  "tier": "economy",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-high",
  "tier": "economy",
  "configured": true,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-luna-xhigh",
  "tier": "balanced",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-low",
  "tier": "balanced",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-medium",
  "tier": "balanced",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-high",
  "tier": "balanced",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-terra-xhigh",
  "tier": "balanced",
  "configured": true,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-low",
  "tier": "high",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-medium",
  "tier": "high",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-high",
  "tier": "high",
  "configured": true,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-xhigh",
  "tier": "frontier",
  "configured": false,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->

<!-- OAT_CURSOR_EVIDENCE_RECORD_START -->

```json
{
  "candidate": "gpt-5.6-sol-max",
  "tier": "frontier",
  "configured": true,
  "status": "pending",
  "probe": {
    "executed": false,
    "utcDate": null,
    "commandArgvSanitized": [],
    "prompt": null,
    "stdout": null,
    "stderr": null,
    "directExitStatus": null,
    "terminationSignal": null,
    "durationMs": null
  },
  "environment": {
    "selectedBinary": null,
    "binaryPath": null,
    "clientVersion": null,
    "cursorApiKey": "not-recorded",
    "credentialStore": "not-recorded"
  },
  "outcomeBasis": "pending",
  "catalogDiagnostic": null,
  "recheckDate": null
}
```

<!-- OAT_CURSOR_EVIDENCE_RECORD_END -->
