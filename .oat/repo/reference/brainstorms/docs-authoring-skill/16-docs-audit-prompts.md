---
title: Docs Audit Prompts and Agent Workflows
description: Reusable prompts and workflows for documentation migration and improvement.
---

# Docs Audit Prompts and Agent Workflows

Use these prompts and workflows when an agent is helping migrate or improve docs.

They are written to be copied into tasks, issues, or agent instructions.

## Repository docs audit prompt

```md
You are auditing this repository's documentation.

Goals:

1. Identify the project type.
2. Inventory existing documentation.
3. Compare existing docs to the standard docs structure.
4. Identify stale, missing, duplicated, or risky docs.
5. Propose a migration plan to Markdown/Fumadocs.
6. Do not invent facts.
7. Mark uncertainty explicitly.

Inspect at minimum:

- README.md
- docs/
- package scripts
- config files
- source entry points
- API schemas
- CLI command definitions
- CI workflows
- deployment manifests
- tests
- observability or runbook files

Return:

- project type
- reader personas
- current docs inventory
- missing docs
- stale or risky docs
- proposed information architecture
- high-priority pages to create first
- facts that need owner verification
```

## Docs migration prompt

```md
Migrate this repository's documentation to the standard Markdown docs structure.

Rules:

- Preserve accurate existing content.
- Remove or consolidate duplication.
- Do not invent commands, env vars, APIs, deployment steps, ownership, or infrastructure.
- Use plain Markdown.
- Add frontmatter with `title` and `description` when creating new pages.
- Use the standard structure where applicable:
  - index
  - getting started
  - how-to
  - reference
  - concepts
  - operations
- Include verification and rollback for risky tasks.
- Add clearly marked notes for missing facts.

After editing, provide a handoff summary with:

- files changed
- facts grounded in repo sources
- uncertainty or owner-review items
- recommended next docs improvements
```

## API docs prompt

```md
Create or improve API documentation for this repository.

Inspect:

- route definitions
- controllers
- middleware
- auth code
- OpenAPI files
- GraphQL schema
- tests
- existing docs
- generated clients

Document:

- overview
- auth
- environments
- endpoints or operations
- request and response shapes
- errors
- pagination
- rate limits if known
- idempotency if known
- retries and timeouts if known
- examples
- versioning and deprecation behavior if known

Do not invent endpoints or fields. If behavior is unclear, mark it.
```

## CLI docs prompt

```md
Create or improve CLI documentation for this repository.

Inspect:

- package.json `bin`
- command definitions
- flag parsing
- config loading
- environment variables
- tests
- README examples

Document:

- install
- auth
- config
- quick start
- command reference
- arguments
- flags
- examples
- output
- JSON output if supported
- exit codes if known
- non-interactive and CI behavior
- troubleshooting

Do not invent commands, flags, output, or exit codes. If exit codes are not explicit in the source, say they are not documented.
```

## Backend service docs prompt

```md
Create or improve backend service documentation.

Inspect:

- service entry point
- routes or handlers
- jobs and workers
- database access
- queues and event buses
- cache clients
- external services
- config files
- package scripts
- Docker and deployment files
- CI workflows
- tests

Document:

- purpose
- dependencies
- local development
- testing
- configuration
- APIs
- jobs and workers
- data flow
- deployment
- observability
- failure modes
- runbook
- rollback if known
- ownership if known

Mark missing operational facts clearly.
```

## Frontend app docs prompt

```md
Create or improve frontend application documentation.

Inspect:

- routing files
- app entry points
- components
- data fetching code
- state management
- design system usage
- feature flags
- analytics
- tests
- build and deployment config

Document:

- app purpose
- local development
- routes
- rendering model
- data fetching
- state management
- accessibility expectations
- analytics
- testing
- deployment
- troubleshooting
- ownership

Do not invent user flows or routes. Ground route docs in source files.
```

## Library or framework docs prompt

```md
Create or improve library/framework documentation.

Inspect:

- package exports
- public types
- README
- examples
- tests
- package metadata
- peer dependencies
- changelog

Document:

- purpose
- when to use
- when not to use
- installation
- quick start
- core concepts
- public API
- examples
- extension points
- compatibility
- migration notes
- release policy if known
- ownership

Do not document private internals as public API unless the repo explicitly treats them as supported.
```

## Operations docs prompt

```md
Create or improve operations documentation for this production system.

Inspect:

- deployment workflows
- infrastructure files
- dashboards or monitor definitions
- logging and tracing config
- alerts
- existing runbooks
- health checks
- incident notes if present in repo

Document:

- where it runs
- how to deploy
- how to roll back
- health checks
- logs
- metrics
- traces
- dashboards
- alerts
- common incidents
- failure modes
- escalation

Do not invent dashboards, links, alert thresholds, or rollback steps. Mark missing operations data clearly.
```

## Page rewrite prompt

```md
Rewrite this documentation page to improve clarity and structure.

Rules:

- Preserve accurate facts.
- Remove duplication.
- Use the correct doc type: tutorial, how-to, reference, or explanation.
- Add prerequisites for task pages.
- Add verification for task pages.
- Add rollback for risky operations.
- Use tables for reference data.
- Use code block language identifiers.
- Avoid vague phrases like “normal process” or “just run.”
- Do not add unsupported facts.

Return the rewritten Markdown and a brief explanation of what changed.
```

## Missing docs prioritization prompt

```md
Given this repository, prioritize the missing documentation.

Rank missing pages by impact:

1. Blocks onboarding
2. Blocks safe production operation
3. Blocks integration or consumption
4. Causes repeated team questions
5. Causes agent confusion
6. Creates public user confusion

Return a prioritized list with:

- page title
- doc type
- audience
- why it matters
- source files to inspect
- recommended outline
```

## Documentation PR summary template

```md
## Summary

- <Change 1>
- <Change 2>
- <Change 3>

## Sources inspected

- `<file>`
- `<file>`
- `<file>`

## Docs structure

- Added/updated landing page
- Added/updated how-to guides
- Added/updated reference pages
- Added/updated concepts
- Added/updated operations docs

## Needs owner review

- <Unverified fact or missing context>

## Not included

- <Explicitly out-of-scope docs>
```

## Agent self-check before final response

Before finishing, the agent should verify:

- Did I inspect enough source files?
- Did I avoid inventing facts?
- Did I mark uncertainty?
- Did I use the standard structure?
- Did I include prerequisites and verification?
- Did I include rollback for risky operations?
- Did I document exact commands and paths?
- Did I preserve useful existing content?
- Did I avoid public/private leakage?
- Did I leave a useful handoff summary?
