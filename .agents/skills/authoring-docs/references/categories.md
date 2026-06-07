---
title: Documentation Categories
description: Category-specific guidance for APIs, CLIs, apps, services, libraries, frameworks, monorepos, architecture, operations, and audience boundaries.
---

# Documentation Categories

Use category guidance after classifying the project. A repository can belong to
multiple categories; document the dominant reader path first, then add focused
reference, operational, or conceptual pages where the evidence supports them.

## APIs

API docs must help consumers integrate correctly without reading implementation
code.

Document:

- overview and use cases
- base URL, service location, or schema source
- environments
- authentication and authorization
- request and response formats
- status codes and error shape
- pagination, filtering, sorting, and limits
- idempotency, retries, and timeouts
- versioning, deprecation, and compatibility behavior
- webhooks, events, SDKs, or generated clients when applicable
- examples grounded in real routes, schemas, or tests
- support, ownership, or escalation when known

For REST or HTTP APIs, document method, path, side effects, auth requirement,
path and query parameters, request headers, request body, response body, status
codes, error codes, example request, example response, retry behavior,
idempotency, pagination, and deprecation notes.

For GraphQL, include endpoint, auth, schema source, common queries and
mutations, variables, fragments, pagination, errors, nullability, query cost or
depth limits, and deprecation policy.

For event-driven APIs, document event name, producer, known consumers,
transport, topic or stream, schema, example payload, ordering guarantees,
delivery guarantees, retry behavior, dead-letter behavior, idempotency
requirements, versioning, and backward compatibility.

For webhooks, document event types, endpoint expectations, signing and
verification, retry schedule, timeout, payload schema, idempotency, ordering,
testing tools, replay behavior, and security considerations.

Prefer machine-readable schemas where the repo has them: OpenAPI, GraphQL,
AsyncAPI, JSON Schema, Protocol Buffers, or generated types. Pair generated
reference with hand-written onboarding and workflow guides.

## CLIs

CLI docs must help readers run the right command safely. A CLI is both a human
interface and an automation interface.

Document:

- installation
- authentication
- configuration and precedence
- quick start
- common workflows
- command reference
- arguments, flags, inherited flags, aliases, and defaults
- environment variables and config files
- output formats and machine-readable output
- exit codes
- prompts and non-interactive behavior
- CI and scripting behavior
- logging, verbosity, retries, and timeouts
- dry-run behavior when supported
- production safety notes
- troubleshooting

For each command, include purpose, usage syntax, examples, side effects, output
shape, JSON shape if supported, exit codes, related commands, and any
environment or config keys it reads.

Do not invent exit codes. If exit codes are not explicit in source or docs, say
they are not documented.

## Apps and Services

Application and service docs should help people understand, run, change,
deploy, operate, and recover the system.

All apps and services should document:

- purpose, audience, and users
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

Frontend app docs should include routes, rendering model, data fetching, state
management, design system usage, feature flags, analytics, accessibility,
performance constraints, error boundaries, testing, local development, and
deployment.

Backend service docs should include service purpose, runtime, APIs, jobs,
queues, databases, caches, external services, configuration, auth, local
development, testing, deployment, observability, failure modes, and runbooks.

Worker and job docs should include trigger, input payload, output or side
effect, queue or scheduler, retry policy, timeout, concurrency, idempotency,
dead-letter behavior, observability, replay process, and failure modes.

Deployment docs should include where the system runs, deployment trigger,
environments, required permissions, pre-deploy checks, deployment steps,
post-deploy verification, rollback, and known risks.

Troubleshooting pages should be symptom-first and map symptoms to likely cause,
check, fix, and escalation.

## Libraries, Packages, SDKs, and Frameworks

Library and framework docs should help users decide whether to use the tool,
install it, learn the mental model, apply it correctly, and avoid misuse.

Document:

- purpose
- when to use it
- when not to use it
- installation
- version compatibility and peer dependencies
- quick start
- core concepts
- supported public API
- examples and recipes
- configuration
- extension points
- errors and side effects
- testing guidance
- migration guides
- release policy
- ownership and support model

Document only supported public API unless the repository explicitly treats an
internal surface as supported. For functions, classes, components, hooks, or
types, include purpose, signature, parameters, return value, errors, examples,
side effects, stability, and deprecation notes.

Frameworks need stronger conceptual docs than small libraries: design goals,
mental model, conventions, lifecycle, plugin model, file structure,
configuration model, defaults, escape hatches, anti-patterns, migrations, and
examples.

Component libraries should document import path, props, examples, states,
accessibility, design tokens, composition patterns, and when not to use a
component.

SDK docs should cover install, auth, client creation, common workflows, errors,
retries, pagination, async behavior, type generation, version compatibility,
and parity with the underlying service.

## Monorepos

Monorepo docs should help readers find the right package, app, service, or
workflow without already knowing the source tree.

Document:

- repo purpose and major workspaces
- package manager and workspace commands
- build, test, lint, and type-check strategy
- dependency graph or ownership map when available
- shared config and conventions
- release or deployment boundaries
- how to run one package or app
- how to add a new package or app
- generated artifacts and source-of-truth boundaries
- cross-package compatibility requirements

Avoid organizing docs only by implementation directory. Prefer audience,
product area, or workflow groupings, then link to package-level reference.

## Architecture and Operations

Architecture docs explain how the system works and why it is designed that way.
Operations docs explain how to run, observe, debug, recover, and safely change
the system.

Architecture docs should answer:

- What problem does this system solve?
- What are the main components?
- How does data flow through the system?
- What are the boundaries?
- What depends on this system, and what does it depend on?
- What tradeoffs and decisions shaped the design?
- What failure modes exist?
- What should future maintainers avoid breaking?

Use diagrams to clarify relationships, not to decorate. Every diagram should
have a title, purpose, scope, explanation, caveats, and last verified date when
it is highly operational.

Use architecture decision records for significant decisions such as database
choice, queueing model, API versioning, cache invalidation, auth model,
deployment topology, framework choice, migration strategy, or deprecation
strategy.

Operations docs should answer:

- Where does this run?
- How is it deployed and rolled back?
- How do I know it is healthy?
- Where are logs, metrics, traces, dashboards, and alerts?
- What are common failure modes?
- How do I recover from them?
- Who owns escalation?

Runbooks should include symptoms, impact, checks, mitigation, verification,
rollback, escalation, and known false positives. Alert docs should make every
alert actionable. Rollback docs must include exact steps or explicitly say the
rollback process is not documented.

## Internal and Public Docs

Internal and public docs share the same quality bar. The differences are
audience, assumptions, security, and support model.

Internal docs can include internal service names, environments, dashboards,
alerts, runbooks, deployment workflows, known consumers, support channels, and
escalation paths. They must not include secrets, credentials, tokens, private
keys, sensitive customer data, personal data, or private incident details that
do not belong in durable docs.

Public docs should include purpose, onboarding, installation, authentication
setup, permissions, examples, API or CLI reference, version compatibility,
migration guides, deprecation policy, support path, security guidance, and
accessibility or privacy notes when relevant.

Public docs should avoid internal URLs, private dashboards, Slack links,
deployment internals, customer-specific data, unapproved roadmap statements,
and implementation details that are not part of the public contract.

When converting internal docs to public docs, identify internal-only content,
remove or rewrite sensitive details, replace examples with public-safe values,
ensure links are public, remove private operational links, preserve user-facing
behavior, and add a public support path.
