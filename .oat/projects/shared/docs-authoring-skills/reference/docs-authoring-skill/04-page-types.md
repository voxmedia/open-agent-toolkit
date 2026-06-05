---
title: Documentation Page Types
description: How to write tutorials, how-to guides, reference docs, and explanation pages.
---

# Documentation Page Types

Most documentation problems come from mixing different kinds of information into one page.

Use four primary page types:

- tutorials
- how-to guides
- reference
- explanation

A page can contain supporting material from another type, but it should have one primary job.

## Tutorial

A tutorial teaches through a guided path.

Use tutorials when the reader is new to the project or workflow.

Good tutorial topics:

- run the app locally for the first time
- send the first API request
- run the first CLI command
- create the first integration
- make the first contribution
- deploy to a non-production environment

### Tutorial rules

- Assume the reader is capable but unfamiliar with this system.
- State prerequisites before steps.
- Use one successful path.
- Avoid branching.
- Show expected output.
- Explain only enough to keep the reader oriented.
- End with a working result.
- Link to deeper docs for next steps.

### Tutorial outline

````md
# Tutorial: Run the project locally

Use this tutorial to get the project running locally for the first time.

## Prerequisites

- Required tools
- Required accounts
- Required permissions
- Required environment variables

## What you will do

By the end, you will have:

- cloned the repo
- installed dependencies
- started the local server
- verified the app works

## Steps

### 1. Clone the repo

```sh
git clone <repo-url>
cd <repo>
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment

```sh
cp .env.example .env.local
```

Explain the minimum required values.

### 4. Start the app

```sh
pnpm dev
```

### 5. Verify it works

Open:

```txt
http://localhost:3000
```

Expected result:

```txt
Describe what success looks like.
```

## Troubleshooting

List common first-run failures and fixes.

## Next steps

Link to related how-to, reference, and concept pages.
````

## How-to guide

A how-to guide helps a reader complete a specific task.

Good how-to topics:

- add a new route
- add a new CLI command
- rotate a secret
- deploy a service
- run a migration
- debug a failed worker
- add a feature flag
- create a webhook consumer
- onboard a new service consumer

### How-to rules

- Title the page as a task.
- Start with when to use the guide.
- State prerequisites.
- Use numbered steps.
- Include verification.
- Include rollback or cleanup when relevant.
- Keep conceptual explanation brief.
- Link to reference and concept pages.

### How-to outline

````md
# How to <complete a task>

Use this guide when you need to <specific outcome>.

## Prerequisites

- Required access
- Required tools
- Required context
- Required environment

## Steps

### 1. <Do the first thing>

```sh
command goes here
```

Explain what this does.

### 2. <Do the next thing>

Continue with the minimum safe path.

## Verify the change

```sh
verification command
```

Expected result:

```txt
expected output
```

## Roll back

Explain how to undo the change safely.

## Troubleshooting

| Problem        | Cause        | Fix          |
| -------------- | ------------ | ------------ |
| Specific error | Likely cause | Concrete fix |

## Related docs

- Link to concepts
- Link to reference
- Link to runbook
````

## Reference

Reference documentation provides exact facts.

Good reference topics:

- API endpoints
- GraphQL schema
- CLI commands
- environment variables
- configuration
- error codes
- event schemas
- package exports
- permissions
- cache keys
- feature flags

### Reference rules

- Do not bury facts in prose.
- Use tables, lists, and code blocks.
- Include required vs optional.
- Include defaults.
- Include types.
- Include constraints.
- Include examples.
- Include versioning and deprecation notes.
- Avoid tutorials inside reference pages.

### Reference outline

````md
# Configuration reference

This page lists all supported configuration options.

| Name            | Type   | Required | Default | Description                 |
| --------------- | ------ | -------: | ------- | --------------------------- |
| `EXAMPLE_VALUE` | string |      Yes | none    | Explain what this controls. |

## Examples

```sh
EXAMPLE_VALUE=example pnpm dev
```

## Related docs

- Link to setup guide
- Link to architecture explanation
````

## Explanation

Explanation helps readers understand how and why the system works.

Good explanation topics:

- architecture
- data flow
- rendering model
- caching strategy
- auth model
- queueing model
- consistency model
- failure modes
- tradeoffs
- migration strategy
- design constraints

### Explanation rules

- Start with the problem or design pressure.
- Explain the mental model.
- Be honest about tradeoffs.
- Include diagrams when helpful.
- Link to ADRs or RFCs when available.
- Do not turn explanation pages into step-by-step guides.
- Do not hide operational instructions only in explanation pages.

### Explanation outline

```md
# Architecture

This page explains how the system works and why it is designed this way.

## Summary

Briefly describe the architecture.

## Goals

List the system goals.

## Non-goals

List what the system intentionally does not handle.

## Components

Describe each major component.

## Data flow

Explain the lifecycle of a request, event, job, or user action.

## Key decisions

Explain important decisions and tradeoffs.

## Failure modes

Describe how the system fails and how those failures are contained.

## Related docs

- Link to runbook
- Link to deployment guide
- Link to API or CLI reference
```

## Mixed pages

Some pages legitimately mix types.

Examples:

- a landing page can include orientation, links, and a small quick start
- a runbook can include reference tables and task steps
- an API guide can include conceptual auth explanation and endpoint reference links

The rule is not “never mix.”

The rule is: know the primary job of the page and keep the rest subordinate.

## Smell test

| If the reader asks                | They need    | Do not give them            |
| --------------------------------- | ------------ | --------------------------- |
| “I am new. Walk me through this.” | Tutorial     | Full API reference          |
| “How do I do X?”                  | How-to guide | Architecture essay          |
| “What does this option mean?”     | Reference    | A blog post                 |
| “Why does this behave this way?”  | Explanation  | A command list              |
| “Production is broken. What now?” | Runbook      | Historical background first |
