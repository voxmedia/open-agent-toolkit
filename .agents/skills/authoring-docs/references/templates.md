---
title: Documentation Templates
description: Rules for using reusable documentation templates without keeping empty boilerplate.
---

# Documentation Templates

Use templates as starting points, not as forms to fill mechanically. Delete
sections that do not apply, merge sections when the repo is small, and add
sections when the evidence requires them.

## Template Rules

- Keep placeholders only while drafting; replace or remove them before
  publishing.
- Do not keep empty headings for symmetry.
- Preserve accurate existing content before introducing a new shape.
- Add frontmatter only when the target docs system uses it.
- Use exact commands, paths, versions, configuration keys, and source links.
- Mark missing ownership, deployment, or operations facts explicitly.
- Include verification for task pages.
- Include rollback or cleanup for risky operations.
- Prefer local repository templates when they exist.

## Landing Page

````md
# <Project name>

<One short paragraph explaining what this project is and why it exists.>

## Who this is for

- <Persona>

## What this project does

- <Responsibility>

## What this project does not do

- <Non-goal>

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

<Link to runbooks, dashboards, alerts, and rollback.>

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

## Getting Started Tutorial

````md
# Getting started

Use this tutorial to get `<project>` running for the first time.

## Prerequisites

| Requirement   | Version or access | Source or notes |
| ------------- | ----------------- | --------------- |
| <Requirement> | <Version/access>  | <Source>        |

## What you will do

By the end, you will have installed dependencies, configured local environment,
started the project, and verified it works.

## 1. Install dependencies

```sh
<install-command>
```

## 2. Configure environment

```sh
<config-command>
```

## 3. Start the project

```sh
<start-command>
```

## 4. Verify

```sh
<verification-command>
```

Expected output:

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

## How-To Guide

````md
# How to <complete a task>

Use this guide when you need to <specific outcome>.

## Prerequisites

- <Requirement>

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

## Configuration Reference

```md
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

## API Endpoint Reference

````md
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

| Field | Type   | Description        |
| ----- | ------ | ------------------ |
| `id`  | string | Unique identifier. |

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

## CLI Command Reference

````md
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

Only include this table when exit-code meanings are explicit in source or
existing documentation. If they are not explicit, say exit codes are not
documented.

| Code     | Source-backed meaning  |
| -------- | ---------------------- |
| `<code>` | `<documented meaning>` |

## Related commands

- [`<tool> <related-command>`](./related-command.md)
````

## Architecture Page

```md
# Architecture

This page explains how `<system>` works and why it is designed this way.

## Summary

<One or two paragraphs.>

## Goals

- <Goal>

## Non-goals

- <Non-goal>

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

## Architecture Decision Record

```md
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

## Documentation Audit Summary

````md
# Documentation audit: <repo>

## Summary

<Short summary of current docs quality.>

## Project type

- <frontend app/backend service/API/CLI/library/framework/etc.>

## Current docs

| Page        | Type    | Quality | Notes                          |
| ----------- | ------- | ------- | ------------------------------ |
| `README.md` | Landing | 2       | Useful but missing deployment. |

## Missing docs

| Missing page     | Priority | Why it matters                                     |
| ---------------- | -------: | -------------------------------------------------- |
| Deployment guide |     High | Production changes need verification and rollback. |

## Stale or risky docs

| Page        | Issue                    | Recommended action          |
| ----------- | ------------------------ | --------------------------- |
| `README.md` | Command no longer exists | Update from `package.json`. |

## Recommended structure

```txt
docs/
├── index.md
├── getting-started.md
├── how-to/
├── reference/
├── concepts/
└── operations/
```

## Follow-up questions

- <Question that needs owner verification>
````

## Documentation Handoff Summary

```md
## Summary

- <Change>

## Sources inspected

- `<file>`

## Docs structure

- Added/updated landing page
- Added/updated how-to guides
- Added/updated reference pages
- Added/updated concepts
- Added/updated operations docs

## Verification

- `<command>`: pass/fail

## Needs owner review

- <Unverified fact or missing context>

## Not included

- <Explicitly out-of-scope docs>
```
