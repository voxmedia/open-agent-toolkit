---
title: Application and Service Documentation
description: Standards for frontend apps, backend services, workers, and internal systems.
---

# Application and Service Documentation

Application and service docs should help people understand, run, change, deploy, operate, and recover the system.

This file covers frontend apps, backend services, full-stack apps, workers, jobs, and internal systems.

## Required docs for any app or service

Every app or service should document:

- purpose
- audience and users
- local development
- testing
- configuration
- dependencies
- deployment
- observability
- ownership
- troubleshooting
- architecture summary
- operational risks

## App or service overview template

````md
# <Project name>

<One short paragraph explaining what this project is and why it exists.>

## Who this is for

- maintainers
- contributors
- consumers
- operators
- stakeholders

## What this project does

- Responsibility 1
- Responsibility 2
- Responsibility 3

## What this project does not do

- Non-goal 1
- Non-goal 2

## Quick start

```sh
pnpm install
pnpm dev
```

## Common tasks

- Link to local development
- Link to testing
- Link to deployment
- Link to troubleshooting

## Architecture

Brief summary and link to architecture docs.

## Operations

Link to runbook, dashboards, alerts, logs, and rollback.

## Ownership

Owning team, support channel, escalation path.
````

## Local development docs

Local development docs should include:

- required tools
- runtime versions
- package manager
- dependency installation
- environment variables
- local services
- database setup
- seed data
- start commands
- expected URLs
- verification steps
- common first-run failures

Template:

````md
# Local development

Use this guide to run the project locally.

## Prerequisites

| Tool    | Version     | Notes                               |
| ------- | ----------- | ----------------------------------- |
| Node.js | `<version>` | Source: `.nvmrc` or `package.json`. |
| pnpm    | `<version>` | Source: `packageManager` field.     |

## Install dependencies

```sh
pnpm install
```

## Configure environment

```sh
cp .env.example .env.local
```

## Start local dependencies

```sh
docker compose up
```

## Start the app

```sh
pnpm dev
```

## Verify

Open:

```txt
http://localhost:3000
```

Expected result:

```txt
Describe the success state.
```
````

## Testing docs

Testing docs should include:

- test command
- unit tests
- integration tests
- end-to-end tests
- test data
- external dependencies
- CI behavior
- how to run one test
- how to update snapshots
- debugging tips

Template:

````md
# Testing

## Run all tests

```sh
pnpm test
```

## Run one test file

```sh
pnpm test <path-to-test>
```

## Test types

| Type        | Command                 | Description               |
| ----------- | ----------------------- | ------------------------- |
| Unit        | `pnpm test:unit`        | Tests isolated code.      |
| Integration | `pnpm test:integration` | Tests service boundaries. |
| End-to-end  | `pnpm test:e2e`         | Tests user workflows.     |

## CI

Describe which tests run in CI and what blocks merge.
````

## Frontend application docs

Frontend app docs should include:

- routes
- rendering model
- data fetching
- state management
- design system usage
- feature flags
- analytics
- accessibility
- performance constraints
- error boundaries
- testing
- local development
- deployment

### Routes page

```md
# Routes

| Route            | Purpose      | Data source     | Notes  |
| ---------------- | ------------ | --------------- | ------ |
| `/`              | Home page    | `<data source>` | Notes. |
| `/articles/[id]` | Article page | `<data source>` | Notes. |
```

### Rendering model page

Document:

- server rendering
- static generation
- client rendering
- caching
- revalidation
- edge/runtime constraints
- preview mode
- personalization boundaries

### Data fetching page

Document:

- API clients
- caching behavior
- error handling
- loading states
- auth context
- retry behavior
- test strategy

### Accessibility page

Document:

- semantic HTML expectations
- keyboard behavior
- focus management
- color contrast requirements
- screen reader behavior
- testing tools
- known gaps

## Backend service docs

Backend service docs should include:

- service purpose
- runtime
- APIs
- jobs
- queues
- databases
- caches
- external services
- configuration
- auth
- local development
- testing
- deployment
- observability
- failure modes
- runbooks

### Dependencies page

```md
# Dependencies

| Dependency  | Type      | Environment         | Purpose                     | Failure impact                       |
| ----------- | --------- | ------------------- | --------------------------- | ------------------------------------ |
| PostgreSQL  | Database  | all                 | Stores primary records.     | API requests fail or degrade.        |
| Redis       | Cache     | all                 | Caches computed responses.  | Higher latency or fallback behavior. |
| EventBridge | Event bus | staging, production | Publishes lifecycle events. | Consumers stop receiving updates.    |
```

## Worker and job docs

Worker docs should include:

- trigger
- input payload
- output or side effect
- queue or scheduler
- retry policy
- timeout
- concurrency
- idempotency
- dead-letter behavior
- observability
- replay process
- failure modes

Template:

````md
# `<worker-name>` worker

## Purpose

Explain what the worker does.

## Trigger

Describe queue, event, schedule, or manual trigger.

## Input

```json
{
  "id": "example"
}
```

## Side effects

- Updates database record
- Publishes event
- Calls external API

## Retry behavior

Document retry count, backoff, timeout, and dead-letter behavior.

## Idempotency

Explain whether the worker can safely process duplicate messages.

## Observability

Link logs, traces, metrics, and dashboards.
````

## Configuration docs

Configuration docs should include:

- env var name
- type
- required
- default
- environments
- description
- example
- source or owner

Template:

```md
# Configuration

| Name   | Type   | Required | Default | Environments | Description      |
| ------ | ------ | -------: | ------- | ------------ | ---------------- |
| `PORT` | number |       No | `3000`  | local        | Local HTTP port. |
```

## Deployment docs

Deployment docs should include:

- where the service runs
- deployment trigger
- environments
- required permissions
- pre-deploy checks
- deployment steps
- post-deploy verification
- rollback
- known risks

Template:

````md
# Deployment

## Environments

| Environment | URL or location | Trigger          |
| ----------- | --------------- | ---------------- |
| Staging     | `<location>`    | Merge to `main`. |
| Production  | `<location>`    | Manual approval. |

## Deploy

```sh
<deploy-command>
```

## Verify

Check:

- health endpoint
- logs
- dashboard
- user-visible smoke test

## Roll back

Document the exact rollback process.
````

## Troubleshooting docs

Troubleshooting pages should be symptom-first.

```md
# Troubleshooting

| Symptom              | Likely cause         | Check                    | Fix                                 |
| -------------------- | -------------------- | ------------------------ | ----------------------------------- |
| API returns 500      | Database unavailable | Check database dashboard | Restart dependency or fail over     |
| Worker backlog grows | External API errors  | Check worker logs        | Pause producer or retry failed jobs |
```

## Ownership docs

Ownership should be explicit.

```md
# Ownership

| Area                 | Owner    | Contact     | Escalation |
| -------------------- | -------- | ----------- | ---------- |
| Service code         | `<team>` | `<channel>` | `<path>`   |
| Production incidents | `<team>` | `<channel>` | `<path>`   |
| API contract         | `<team>` | `<channel>` | `<path>`   |
```

If ownership is missing, mark it.

## App and service anti-patterns

Avoid:

- README-only docs for complex services
- deployment steps without rollback
- local setup without verification
- architecture diagrams without explanation
- dependency lists without failure impact
- environment variables without defaults or descriptions
- runbooks that start with “ask someone”
- stale screenshots as source of truth
- operations docs that omit dashboards and alerts
