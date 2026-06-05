---
title: CLI Documentation
description: Standards and templates for documenting command-line tools.
---

# CLI Documentation

CLI docs must help readers run the right command safely.

A CLI is both a user interface and an automation interface. Its docs need to serve humans at a terminal and scripts running in CI.

## Required CLI docs

Every CLI should document:

- installation
- authentication
- configuration
- quick start
- common workflows
- command reference
- arguments
- flags
- environment variables
- config file behavior
- output formats
- JSON or machine-readable output
- exit codes
- prompts and non-interactive behavior
- scripting behavior
- CI behavior
- logging and verbosity
- dry-run behavior if supported
- production safety notes
- troubleshooting

## CLI docs structure

Recommended structure:

```txt
docs/
├── getting-started.md
├── how-to/
│   ├── authenticate.md
│   ├── configure.md
│   ├── run-common-workflow.md
│   ├── use-json-output.md
│   └── run-in-ci.md
├── reference/
│   ├── commands.md
│   ├── configuration.md
│   ├── environment-variables.md
│   ├── output.md
│   └── exit-codes.md
└── concepts/
    ├── authentication.md
    ├── configuration-precedence.md
    └── execution-model.md
```

## CLI overview template

````md
# CLI overview

The `<tool>` CLI lets you <primary purpose> from a terminal or automation environment.

## Install

```sh
<install-command>
```

## Authenticate

```sh
<tool> auth login
```

## First command

```sh
<tool> <command>
```

Expected output:

```txt
<expected output>
```

## Common tasks

- Link to task guide
- Link to task guide

## Reference

- Command reference
- Configuration reference
- Environment variables
- Exit codes
````

## Command page template

````md
# `<tool> <command>`

Describe what the command does in one or two sentences.

## Usage

```sh
<tool> <command> [arguments] [flags]
```

## Examples

```sh
<tool> <command> example
<tool> <command> example --json
<tool> <command> example --dry-run
```

## Arguments

| Argument | Required | Description           |
| -------- | -------: | --------------------- |
| `name`   |      Yes | Explain the argument. |

## Flags

| Flag        | Type    | Default | Description                                    |
| ----------- | ------- | ------- | ---------------------------------------------- |
| `--json`    | boolean | `false` | Output machine-readable JSON.                  |
| `--dry-run` | boolean | `false` | Show what would happen without making changes. |

## Output

Default output:

```txt
<example human-readable output>
```

JSON output:

```json
{
  "status": "ok"
}
```

## Exit codes

| Code | Meaning                           |
| ---: | --------------------------------- |
|    0 | Success                           |
|    1 | Validation or configuration error |
|    2 | Operation failed                  |

## Related commands

- Link to related command
````

## Command reference requirements

For each command, document:

- purpose
- usage syntax
- aliases
- arguments
- flags
- inherited flags
- defaults
- environment variables used
- config keys used
- output shape
- JSON output shape
- exit codes
- side effects
- examples
- related commands

## Examples should be copyable

Bad:

```md
Run the command with the right options.
```

Better:

````md
Create a staging deployment:

```sh
example deploy --env staging
```
````

## Document side effects

Every mutating command should say what it changes.

Example:

```md
> [!WARNING]
> `example deploy --env production` creates a production deployment and updates live traffic after the deployment passes health checks.
```

## Document configuration precedence

CLI users need to know which config wins.

Example:

```md
# Configuration precedence

The CLI resolves configuration in this order, from highest to lowest priority:

1. command flags
2. environment variables
3. project config file
4. user config file
5. built-in defaults
```

## Document non-interactive behavior

Automation needs predictable behavior.

Document:

- how to disable prompts
- whether prompts fail in CI
- required flags for CI
- token-based auth
- output modes
- exit codes
- retries
- timeouts

Example:

````md
## CI usage

Use `--yes` to disable confirmation prompts and `--json` for machine-readable output.

```sh
example deploy --env staging --yes --json
```
````

## Output docs

Document both human-readable and machine-readable output.

Output reference template:

````md
# Output reference

## Default output

Default output is intended for humans and may change between minor releases.

## JSON output

JSON output is intended for automation and follows the schema below.

```json
{
  "id": "run_123",
  "status": "succeeded",
  "url": "https://example.com"
}
```

| Field    | Type   | Description         |
| -------- | ------ | ------------------- |
| `id`     | string | Unique run ID.      |
| `status` | string | Run status.         |
| `url`    | string | URL for the result. |
````

## Exit codes

Exit codes are part of the scripting contract.

Recommended baseline:

| Code | Meaning                                   |
| ---: | ----------------------------------------- |
|    0 | Success                                   |
|    1 | Usage, validation, or configuration error |
|    2 | Command failed after valid input          |
|    3 | Partial failure                           |
|    4 | Authentication or authorization failure   |
|    5 | Network or dependency failure             |
|  124 | Timeout                                   |
|  130 | Interrupted by user                       |

Use the CLI's actual behavior if it differs. Do not invent exit codes.

## Troubleshooting CLI docs

Troubleshooting should map symptoms to fixes.

```md
# CLI troubleshooting

| Problem             | Likely cause                                      | Fix                                                |
| ------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `command not found` | CLI is not installed or not on `PATH`.            | Reinstall the CLI and restart the shell.           |
| `not authenticated` | Missing or expired token.                         | Run `<tool> auth login`.                           |
| Command hangs in CI | The command is waiting for an interactive prompt. | Add `--yes` or the required non-interactive flags. |
```

## Generated command docs

Generate CLI reference from the CLI source when possible.

Good generated docs include:

- exact usage
- aliases
- flags
- inherited flags
- examples
- completion data

But generated command reference still needs hand-written docs for:

- installation
- auth
- config
- workflows
- mental model
- CI usage
- troubleshooting
- production safety

## CLI docs anti-patterns

Avoid:

- only documenting `--help`
- no examples
- examples that cannot be copy-pasted
- hidden production impact
- no exit codes
- no JSON output docs
- no config precedence
- no CI guidance
- command pages with long architecture essays
- generated reference without workflow guides

## CLI quality bar

A CLI docs set is good when a reader can:

- install the tool
- authenticate
- run a first successful command
- complete the top workflows
- look up every flag
- understand output
- script safely in CI
- troubleshoot common failures
- know which commands mutate production
