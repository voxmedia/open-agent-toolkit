---
title: Documentation Templates
description: Copyable Markdown templates for common technical documentation pages.
---

# Documentation Templates

Use these templates as starting points. Delete sections that do not apply. Do not keep empty boilerplate.

## Repo landing page

````md
---
title: <Project name>
description: <Short description>
---

# <Project name>

<One short paragraph explaining what this project is and why it exists.>

## Who this is for

- <Persona 1>
- <Persona 2>

## What this project does

- <Responsibility 1>
- <Responsibility 2>

## What this project does not do

- <Non-goal 1>
- <Non-goal 2>

## Quick start

```sh
<command>
```

## Common tasks

- [Run locally](./how-to/local-development.md)
- [Run tests](./how-to/testing.md)
- [Deploy](./how-to/deployment.md)
- [Troubleshoot](./how-to/troubleshooting.md)

## Architecture

<Summarize major components and link to concepts.>

## Operations

<Link to runbooks, dashboards, alerts, rollback.>

## Reference

- [Configuration](./reference/configuration.md)
- [Environment variables](./reference/environment-variables.md)
- [API reference](./reference/api.md)
- [Commands](./reference/commands.md)

## Ownership

| Area | Owner    | Contact     | Escalation |
| ---- | -------- | ----------- | ---------- |
| Code | `<team>` | `<channel>` | `<path>`   |
````

## Getting started tutorial

````md
---
title: Getting started
description: Run the project for the first time.
---

# Getting started

Use this tutorial to get `<project>` running for the first time.

## Prerequisites

| Requirement     | Version or access | Notes                               |
| --------------- | ----------------- | ----------------------------------- |
| Node.js         | `<version>`       | Source: `.nvmrc` or `package.json`. |
| Package manager | `<manager>`       | Source: `packageManager`.           |

## What you will do

By the end, you will have:

- installed dependencies
- configured local environment
- started the project
- verified it works

## 1. Install dependencies

```sh
<install-command>
```

## 2. Configure environment

```sh
cp .env.example .env.local
```

Set these required values:

| Name        | Description   |
| ----------- | ------------- |
| `<ENV_VAR>` | <Description> |

## 3. Start the project

```sh
<start-command>
```

## 4. Verify

Open:

```txt
<local-url>
```

Expected result:

```txt
<expected output or UI state>
```

## Troubleshooting

| Problem   | Cause   | Fix   |
| --------- | ------- | ----- |
| <Problem> | <Cause> | <Fix> |

## Next steps

- [Local development](./how-to/local-development.md)
- [Testing](./how-to/testing.md)
````

## How-to guide

````md
---
title: How to <complete a task>
description: <Short description of task outcome>
---

# How to <complete a task>

Use this guide when you need to <specific outcome>.

## Prerequisites

- <Requirement 1>
- <Requirement 2>

## Steps

### 1. <Do the first thing>

```sh
<command>
```

<Explain what this does.>

### 2. <Do the next thing>

```sh
<command>
```

## Verify

```sh
<verification-command>
```

Expected output:

```txt
<expected output>
```

## Roll back

<Explain how to undo the change safely.>

## Troubleshooting

| Problem   | Cause   | Fix   |
| --------- | ------- | ----- |
| <Problem> | <Cause> | <Fix> |

## Related docs

- [Configuration](../reference/configuration.md)
````

## Configuration reference

```md
---
title: Configuration reference
description: Environment variables and configuration options.
---

# Configuration reference

This page lists supported configuration options.

## Environment variables

| Name   | Type   | Required | Default | Environments | Description      |
| ------ | ------ | -------: | ------- | ------------ | ---------------- |
| `PORT` | number |       No | `3000`  | local        | Local HTTP port. |

## Configuration files

| File         | Purpose                   |
| ------------ | ------------------------- |
| `.env.local` | Local environment values. |

## Configuration precedence

1. Command flags
2. Environment variables
3. Project config file
4. Built-in defaults
```

## API endpoint reference

````md
---
title: POST /examples
description: Create an example resource.
---

# `POST /examples`

Creates an example resource.

## Authentication

Requires <auth method> with <scope or permission>.

## Request

```json
{
  "name": "Example"
}
```

| Field  | Type   | Required | Description          |
| ------ | ------ | -------: | -------------------- |
| `name` | string |      Yes | Human-readable name. |

## Response

```json
{
  "id": "example_123",
  "name": "Example"
}
```

| Field  | Type   | Description          |
| ------ | ------ | -------------------- |
| `id`   | string | Unique identifier.   |
| `name` | string | Human-readable name. |

## Errors

| Status | Code              | Meaning                 | Fix                    |
| -----: | ----------------- | ----------------------- | ---------------------- |
|    400 | `invalid_request` | The request is invalid. | Check required fields. |

## Example

```sh
curl -X POST "$BASE_URL/examples" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example"}'
```
````

## CLI command reference

````md
---
title: <tool> <command>
description: <Short command description>
---

# `<tool> <command>`

<Describe what the command does.>

## Usage

```sh
<tool> <command> [arguments] [flags]
```

## Examples

```sh
<tool> <command> <example>
<tool> <command> <example> --json
```

## Arguments

| Argument     | Required | Description   |
| ------------ | -------: | ------------- |
| `<argument>` |      Yes | <Description> |

## Flags

| Flag     | Type    | Default | Description                   |
| -------- | ------- | ------- | ----------------------------- |
| `--json` | boolean | `false` | Output machine-readable JSON. |

## Output

```txt
<example output>
```

## JSON output

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

## Related commands

- [`<tool> <related-command>`](./related-command.md)
````

## Architecture page

```md
---
title: Architecture
description: How the system works and why it is designed this way.
---

# Architecture

This page explains how `<system>` works and why it is designed this way.

## Summary

<One or two paragraphs.>

## Goals

- <Goal 1>
- <Goal 2>

## Non-goals

- <Non-goal 1>
- <Non-goal 2>

## System context

<Describe users, external systems, and dependencies.>

## Components

| Component   | Responsibility   | Notes   |
| ----------- | ---------------- | ------- |
| <Component> | <Responsibility> | <Notes> |

## Data flow

<Explain request, event, job, or user-action flow.>

## Key decisions

- <Decision and rationale>

## Failure modes

| Failure mode | Symptom   | Impact   | Recovery   |
| ------------ | --------- | -------- | ---------- |
| <Failure>    | <Symptom> | <Impact> | <Recovery> |

## Related docs

- [Runbook](../operations/runbook.md)
- [Deployment](../how-to/deployment.md)
```

## Runbook

````md
---
title: Runbook
description: How to operate and recover the system.
---

# Runbook

Use this runbook when `<system>` is unhealthy or degraded.

## Service summary

| Field               | Value        |
| ------------------- | ------------ |
| Owner               | `<team>`     |
| Support channel     | `<channel>`  |
| Production location | `<location>` |
| Dashboard           | `<link>`     |
| Logs                | `<link>`     |
| Alerts              | `<link>`     |

## Health checks

```sh
curl <health-url>
```

Expected output:

```json
{
  "status": "ok"
}
```

## Common incidents

### Symptom: <symptom>

Impact:

- <Impact>

Checks:

1. <Check>
2. <Check>

Mitigation:

1. <Step>
2. <Step>

Verification:

- <Verification step>

Escalation:

- <Escalation path>
````

## ADR

```md
---
title: ADR <number>: <decision>
description: Architecture decision record.
---

# ADR <number>: <decision>

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

What problem, constraint, or pressure led to this decision?

## Decision

What decision was made?

## Consequences

What are the benefits, costs, tradeoffs, and risks?

## Alternatives considered

What options were considered and rejected?

## Related docs

- <Links>
```
