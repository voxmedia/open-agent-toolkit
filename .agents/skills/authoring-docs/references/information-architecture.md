---
title: Information Architecture
description: Standard documentation structure, naming, navigation, and cross-linking.
---

# Information Architecture

Documentation structure should feel predictable across repositories even when
the systems differ. Consistency makes docs easier to browse, review, migrate,
and use as agent context.

## Standard Top-Level Model

Use this conceptual model:

```txt
Start here
How-to guides
Reference
Concepts
Operations
```

These labels map to reader needs:

| Product Label | Documentation Type       | Reader Question                              |
| ------------- | ------------------------ | -------------------------------------------- |
| Start here    | Tutorial and orientation | What is this and how do I begin?             |
| How-to guides | How-to                   | How do I complete this task?                 |
| Reference     | Reference                | What are the exact facts?                    |
| Concepts      | Explanation              | How does this work and why?                  |
| Operations    | How-to plus reference    | How do I run, observe, fix, or recover this? |

## Default Repo Structure

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

Do not create empty pages for symmetry. Use the structure as a guide, not
theater.

## Scale the Structure to the Repo

Tiny repos can use a single `README.md` if it covers purpose, install or setup,
usage, configuration, testing, and ownership.

Small repos should separate overview, usage, and reference.

Medium repos should use the standard structure.

Large repos or platforms can group by product area or audience, but should keep
the same doc types recognizable. Avoid organizing only by implementation
directory; readers usually do not arrive knowing the source tree.

## Landing Page Contract

Every docs entry point should answer:

1. What is this?
2. Why does it exist?
3. Who is it for?
4. What are the main capabilities?
5. What are the boundaries and non-goals?
6. How do I get started?
7. What are the common tasks?
8. Where is the reference material?
9. How is it operated?
10. Who owns it?

## Navigation Principles

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

Avoid clever labels such as `Misc`, `Magic`, `Deep cuts`, or `Everything else`.

## Page Naming

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

## Cross-Linking Rules

Link between doc types intentionally.

A tutorial should link to related how-to guides, relevant reference pages, and
conceptual background for later learning.

A how-to guide should link to reference pages for options, concepts for why the
task works, and operations pages for production safety.

A reference page should link to tutorials or how-to guides that show common use.

An explanation page should link to runbooks, deployment guides, API or CLI
reference, and ADRs when available.
