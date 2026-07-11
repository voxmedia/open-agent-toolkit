# Verification Run Packets

Store each verification run under:

```text
<harness>/<ISO-8601-UTC-timestamp>/
├── report.md
├── evidence.json
└── raw/
```

Supported harness directories are `claude/`, `codex/`, `cursor-ide/`, and
`cursor-cli/`.

Each packet should identify the harness, Cursor flavor when applicable, run
status, fresh-session status, repository commit, verified input revision or
hashes, probe timestamps, exact payloads, launch outcomes, claim verdicts, and
redaction status. Label pilot runs explicitly as `pilot/noncanonical`.

Raw evidence must be bounded and scrubbed of credentials, authentication
tokens, and unrelated user or provider configuration.
