---
title: Architecture and Operations Documentation
description: Standards for architecture docs, ADRs, runbooks, observability, rollback, and failure modes.
---

# Architecture and Operations Documentation

Architecture docs explain how the system works and why it is designed that way.

Operations docs explain how to run, observe, debug, recover, and safely change the system.

Both are required for systems that matter in production.

## Architecture docs should answer

- What problem does this system solve?
- What are the main components?
- How does data flow through the system?
- What are the system boundaries?
- What does this system depend on?
- What depends on this system?
- What are the key tradeoffs?
- What failure modes exist?
- What decisions shaped the design?
- What should future maintainers avoid breaking?

## Architecture overview template

```md
# Architecture

This page explains how `<system>` works and why it is designed this way.

## Summary

One or two paragraphs describing the system.

## Goals

- Goal 1
- Goal 2
- Goal 3

## Non-goals

- Non-goal 1
- Non-goal 2

## System context

Describe users, external systems, and dependencies.

## Components

| Component | Responsibility         | Notes                 |
| --------- | ---------------------- | --------------------- |
| API       | Handles HTTP requests. | Runs in `<runtime>`.  |
| Worker    | Processes async jobs.  | Reads from `<queue>`. |
| Database  | Stores primary data.   | PostgreSQL.           |

## Data flow

Describe the lifecycle of a request, event, job, or user action.

## Key decisions

Summarize major architecture decisions and link to ADRs.

## Failure modes

Describe how the system fails and how failures are contained.

## Related docs

- Runbook
- Deployment guide
- Observability
- API reference
```

## Diagrams

Use diagrams to clarify relationships, not to decorate.

Good diagram subjects:

- system context
- container or service boundaries
- request flow
- event flow
- job lifecycle
- deployment topology
- auth flow
- cache invalidation flow

Every diagram should include:

- title
- purpose
- scope
- explanation
- caveats
- last verified date if highly operational

## C4-style architecture docs

For larger systems, use a layered approach:

1. System context: who and what interacts with the system.
2. Containers: deployable apps, services, databases, queues, caches.
3. Components: major internal modules inside a container.
4. Code: only when necessary for complex internals.

Do not start with code-level diagrams unless readers already understand the system context.

## Architecture decision records

Use ADRs for significant technical decisions.

Good ADR subjects:

- database choice
- queueing model
- API versioning model
- cache invalidation strategy
- auth model
- deployment topology
- framework choice
- migration strategy
- deprecation strategy

ADR template:

```md
# ADR <number>: <decision title>

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

- Links to architecture docs, PRs, RFCs, or runbooks
```

## Operations docs should answer

- Where does this run?
- How is it deployed?
- How is it rolled back?
- How do I know it is healthy?
- Where are logs, metrics, and traces?
- What alerts exist?
- What are common failure modes?
- How do I recover from them?
- Who owns escalation?

## Operations docs structure

```txt
operations/
├── runbook.md
├── observability.md
├── alerts.md
├── deployment.md
├── rollback.md
└── incident-response.md
```

Small systems can combine these, but production systems should not hide them.

## Runbook template

````md
# Runbook

Use this runbook when `<system>` is unhealthy or degraded.

## Service summary

| Field               | Value        |
| ------------------- | ------------ |
| Owner               | `<team>`     |
| Support channel     | `<channel>`  |
| Runtime             | `<runtime>`  |
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

### Symptom: API error rate is elevated

Impact:

- User-visible requests may fail.

Checks:

1. Check API error dashboard.
2. Check recent deployments.
3. Check dependency health.

Mitigation:

1. Roll back recent deployment if correlated.
2. Disable affected feature flag if available.
3. Escalate to owning team.

Verification:

- Error rate returns below threshold.
- Health check returns `ok`.
- User-facing smoke test passes.
````

## Observability docs

Observability docs should include:

- dashboards
- logs
- metrics
- traces
- monitors
- alert thresholds
- SLOs if defined
- how to correlate requests
- request IDs
- deployment markers
- known noisy alerts

Template:

```md
# Observability

## Dashboards

| Dashboard    | Purpose                       | Link     |
| ------------ | ----------------------------- | -------- |
| API overview | Request rate, errors, latency | `<link>` |

## Logs

| Source   | Query     | Notes                 |
| -------- | --------- | --------------------- |
| API logs | `<query>` | Includes request IDs. |

## Metrics

| Metric                       | Meaning                     | Alert threshold |
| ---------------------------- | --------------------------- | --------------- |
| `service.request.error_rate` | Percent of failed requests. | `<threshold>`   |

## Traces

Describe trace service names and how to follow a request.
```

## Alert docs

Alert docs should make each alert actionable.

```md
# Alerts

| Alert               | Meaning                               | Impact               | First check           | Runbook |
| ------------------- | ------------------------------------- | -------------------- | --------------------- | ------- |
| High API error rate | Requests are failing above threshold. | User-visible errors. | Check recent deploys. | Link    |
```

For each alert, document:

- trigger condition
- severity
- owner
- user impact
- common causes
- first checks
- mitigation
- escalation
- false positives

## Rollback docs

Rollback docs must be concrete.

Include:

- when to roll back
- who can approve
- exact rollback steps
- expected duration if known
- data migration caveats
- verification
- forward-fix alternative
- escalation

Template:

````md
# Rollback

## When to roll back

Roll back when:

- production error rate increases after deployment
- critical workflow is broken
- data corruption risk is detected

## Roll back the app

```sh
<rollback-command>
```

## Verify rollback

Check:

- health endpoint
- error dashboard
- key user workflow
- worker backlog

## Data migration caveats

Document whether database migrations are reversible.
````

## Failure modes

Failure mode docs should be honest.

For each failure mode, document:

- trigger
- symptom
- user impact
- detection
- containment
- recovery
- prevention

Template:

```md
# Failure modes

| Failure mode         | Symptom            | Impact      | Recovery                        |
| -------------------- | ------------------ | ----------- | ------------------------------- |
| Database unavailable | API returns 500    | Writes fail | Restore DB or fail over         |
| Queue backlog        | Delayed processing | Events lag  | Scale workers or pause producer |
```

## Architecture and operations anti-patterns

Avoid:

- architecture pages without diagrams or component descriptions
- diagrams with no explanation
- ADRs that record what happened but not why
- runbooks that only say “contact team”
- rollback pages without commands or links
- dashboards listed without explaining what to check
- alert pages without mitigation
- failure modes documented only after incidents and never maintained
