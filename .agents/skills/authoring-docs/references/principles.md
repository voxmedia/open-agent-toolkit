---
title: Documentation Principles
description: Core principles for evidence-first technical documentation.
---

# Documentation Principles

Documentation is part of the system. Maintain it with the same seriousness as
code, tests, configuration, infrastructure, and runbooks.

The goal is not to produce many pages. The goal is to reduce confusion, support
safe change, and make the system legible to humans and agents.

## Start With the Reader's Job

Write from the reader's task, not the source tree.

Weak:

```md
This service uses HTTP handlers, queues, and PostgreSQL.
```

Stronger:

```md
Use this service to publish content lifecycle events. The service accepts HTTP
requests, persists event state in PostgreSQL, and processes asynchronous work
through queue-backed workers.
```

Purpose comes first. Implementation details follow when they help the reader.

## Task Completion Beats Encyclopedic Completeness

Most readers arrive with a problem:

- How do I run this locally?
- How do I deploy this?
- What does this flag do?
- Why did this job fail?
- What request shape should I send?
- Can I safely change this config?

Complete docs are useful only when structured around those moments.

## Separate Documentation Modes

Tutorials, how-to guides, reference pages, explanations, and runbooks do
different jobs. Keep each page's primary job clear. Do not turn a first-run
tutorial into a full reference manual, or a reference page into a long
architecture essay.

## Make Context Explicit for Agents

Agents do not know which conventions are local, current, or tribal. Write down
exact commands, paths, service names, environment names, runtime versions,
configuration keys, ownership when known, constraints, non-goals, failure modes,
and uncertainty.

## Prefer Boring Consistency

Across repositories, readers should know where to find setup, commands,
configuration, API or CLI reference, deployment, observability, runbooks,
architecture, and ownership. Familiar structure lowers cognitive load.

## Lead With the Safe Path

Document the common path first. Then explain variations, edge cases, production
caveats, failure modes, unsafe commands, rollback, and compatibility
boundaries.

## Treat Reference as a Contract

Reference docs for APIs, commands, configuration, events, packages, and
environment variables should include names, types, required or optional status,
defaults, allowed values, constraints, examples, errors, version notes, and
deprecation notes when those facts exist.

## Treat Operations Docs as Safety Equipment

Runbooks are not background reading. They should help someone recover a system
under pressure with symptoms, impact, likely causes, dashboards, logs, commands,
verification, rollback, escalation, and known false positives.

## Give Internal Docs the Same Quality Bar

Internal docs can assume more context only when that context is linked or
explained. They still need accurate examples, safe operations guidance, and
clear ownership. Internal docs often guide production changes and future agent
work.

## Make Docs Age Visibly

Docs get stale. Include version compatibility, last-verified dates for
operational procedures, supported environments, deprecated behavior, ownership,
source-of-truth links, and generated-reference markers when useful. Avoid
claims like "new," "soon," or "temporary" without dates or issue links.
