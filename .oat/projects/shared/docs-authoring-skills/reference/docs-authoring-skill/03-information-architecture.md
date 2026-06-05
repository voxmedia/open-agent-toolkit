---
title: Information Architecture
description: Standard documentation structure for cohesive repo docs.
---

# Information Architecture

The documentation structure should feel consistent across repos, even when the systems differ.

Consistency makes docs easier to browse, easier to review, easier to migrate, and easier for agents to use as context.

## Standard top-level model

Use this conceptual model:

```txt
Start here
How-to guides
Reference
Concepts
Operations
```

These labels are friendlier than formal documentation-theory labels, but they map cleanly to the underlying types:

| Product label | Documentation type       | Reader question                                |
| ------------- | ------------------------ | ---------------------------------------------- |
| Start here    | Tutorial and orientation | “What is this and how do I begin?”             |
| How-to guides | How-to                   | “How do I complete this task?”                 |
| Reference     | Reference                | “What are the exact facts?”                    |
| Concepts      | Explanation              | “How does this work and why?”                  |
| Operations    | How-to plus reference    | “How do I run, observe, fix, or recover this?” |

## Default repo structure

```txt
docs/
├── index.md
├── getting-started.md
├── how-to/
│   ├── local-development.md
│   ├── testing.md
│   ├── deployment.md
│   └── troubleshooting.md
├── reference/
│   ├── configuration.md
│   ├── environment-variables.md
│   ├── commands.md
│   ├── api.md
│   └── errors.md
├── concepts/
│   ├── architecture.md
│   ├── data-flow.md
│   ├── auth.md
│   └── caching.md
└── operations/
    ├── runbook.md
    ├── observability.md
    ├── alerts.md
    └── rollback.md
```

Do not create empty pages for symmetry. Use the structure as a guide, not theater.

## Minimum docs by repo size

### Tiny repo

A tiny repo can use a single `README.md` or `docs/index.md` if it covers:

- purpose
- install or setup
- usage
- configuration
- testing
- ownership

Recommended:

```txt
README.md
```

### Small repo

A small repo should separate overview, usage, and reference.

```txt
docs/
├── index.md
├── getting-started.md
├── how-to.md
└── reference.md
```

### Medium repo

A medium repo should use the standard structure.

```txt
docs/
├── index.md
├── getting-started.md
├── how-to/
├── reference/
├── concepts/
└── operations/
```

### Large repo or platform

A large repo or platform should group by product area or audience, but still preserve the same doc types.

```txt
docs/
├── index.md
├── getting-started.md
├── apps/
├── services/
├── packages/
├── guides/
├── reference/
├── concepts/
└── operations/
```

Avoid organizing only by implementation directory. Readers usually do not arrive knowing the source tree.

## Landing page contract

Every docs site or repo docs entry point should answer:

1. What is this?
2. Why does it exist?
3. Who is it for?
4. What are the main capabilities?
5. What are the boundaries and non-goals?
6. How do I get started?
7. What are the most common tasks?
8. Where is the reference material?
9. How is it operated?
10. Who owns it?

Recommended landing page outline:

```md
# Project name

One short paragraph explaining what this project is and why it exists.

## Who this is for

Describe maintainers, contributors, consumers, operators, stakeholders, or external users.

## What this project does

List the primary responsibilities.

## What this project does not do

List boundaries and non-goals.

## Quick start

Link to the shortest safe path.

## Common tasks

Link to common how-to guides.

## Architecture

Summarize major components and link to deeper concept docs.

## Operations

Link to deployment, observability, runbooks, and rollback.

## Reference

Link to API, CLI, configuration, errors, and schema docs.

## Ownership

List owning team, support channel, escalation path, and related systems.
```

## Navigation principles

Good navigation is boring.

Use predictable labels:

- Getting started
- Local development
- Testing
- Deployment
- Configuration
- Environment variables
- API reference
- CLI reference
- Architecture
- Data flow
- Authentication
- Observability
- Troubleshooting
- Runbook
- Rollback

Avoid clever labels:

- “Magic”
- “Internals and stuff”
- “Deep cuts”
- “Misc”
- “Everything else”

## Page naming

Use task names for how-to guides:

```txt
how-to/add-a-new-route.md
how-to/deploy-to-production.md
how-to/rotate-api-credentials.md
```

Use topic names for concepts:

```txt
concepts/authentication.md
concepts/event-delivery.md
concepts/caching.md
```

Use noun names for reference:

```txt
reference/environment-variables.md
reference/cli.md
reference/api.md
reference/errors.md
```

## Cross-linking rules

Link between doc types intentionally.

A tutorial should link to:

- related how-to guides
- relevant reference pages
- conceptual background for later learning

A how-to guide should link to:

- reference pages for options
- concepts for why the task works
- operations pages for production safety

A reference page should link to:

- how-to guides that demonstrate common use
- concepts that explain important semantics

An explanation page should link to:

- how-to guides for tasks
- reference pages for precise details
- runbooks for operational response

## Monorepo structure

For monorepos, avoid one giant docs section that hides ownership.

Recommended pattern:

```txt
docs/
├── index.md
├── platform/
│   ├── concepts/
│   ├── how-to/
│   └── reference/
├── apps/
│   └── app-name/
├── services/
│   └── service-name/
├── packages/
│   └── package-name/
└── operations/
```

Each app, service, or package should still have its own overview page.

## Generated reference docs

Generated reference docs are good, but they need context.

Use generated docs for:

- API schemas
- CLI command reference
- typedoc or API extraction
- Terraform module inputs and outputs
- GraphQL schema reference

Pair generated docs with hand-written pages:

- getting started
- common workflows
- concepts
- examples
- migration guides
- troubleshooting

Generated reference is necessary. It is not sufficient.

## Deprecated docs

Never silently leave deprecated docs in the main path.

When docs are deprecated:

- move them under a clearly named deprecated section
- add a warning at the top
- link to the replacement
- include a date or version
- remove or noindex if they are harmful

Example:

```md
> [!WARNING]
> This page documents the legacy deployment workflow used before March 2025. Use the current deployment guide instead.
```
