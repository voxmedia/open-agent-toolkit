---
title: Documentation Principles
description: Core principles for writing technical documentation across software projects.
---

# Documentation Principles

Documentation is part of the system. It should be maintained with the same seriousness as code, tests, infrastructure, and operational playbooks.

The goal is not to produce a lot of pages. The goal is to reduce confusion, support safe change, and make the system legible to humans and agents.

## Reader-first, not system-first

Start from the reader's job.

Bad:

```md
This service uses Lambda, EventBridge, and SQS.
```

Better:

```md
Use this service to publish content lifecycle events. Events are delivered asynchronously through EventBridge and processed by queue-backed workers.
```

The improved version starts with purpose. It still includes implementation details, but only after the reader understands what the system does.

## Task completion beats encyclopedic completeness

Most readers arrive with a problem:

- “How do I run this locally?”
- “How do I deploy this?”
- “What does this flag do?”
- “Why did this job fail?”
- “What API shape should I send?”
- “Can I safely change this config?”

Write for those moments.

Complete docs are useful only when they are structured around reader needs. A giant page with every fact in no useful order is not documentation. It is a junk drawer.

## Separate modes of documentation

Tutorials, how-to guides, reference, and explanation do different jobs.

A tutorial should not become a full reference manual.

A reference page should not become a long conceptual essay.

A runbook should not hide the architecture model.

An architecture page should not be the only place that explains how to roll back production.

Use separation to keep each page useful.

## Make docs explicit enough for agents

AI agents are unforgiving readers. They do not know which project conventions are tribal knowledge and which are universal. They can misread implicit context as fact.

Write the missing context down.

Good documentation for agents includes:

- exact commands
- exact file paths
- exact service names
- exact environment names
- exact runtime versions
- exact config keys
- exact ownership or escalation path when known
- explicit uncertainty when unknown
- links to related docs
- constraints and non-goals
- failure modes and recovery steps

This also makes the docs better for humans.

## Prefer boring consistency

Cohesion matters more than cleverness.

Across repos, readers should know where to find:

- local development instructions
- commands
- environment variables
- API reference
- deployment steps
- observability
- runbooks
- architecture
- ownership

A familiar shape lowers cognitive load and makes docs easier for agents to navigate.

## Optimize for the common path, then expose the edges

Lead with the standard safe path.

Then document:

- variations
- edge cases
- production caveats
- failure modes
- unsafe commands
- rollback procedures
- compatibility boundaries

Do not make new readers choose between five paths before they have achieved one successful outcome.

## Treat reference as a contract

Reference documentation must be precise.

For APIs, commands, configuration, events, packages, and environment variables, include:

- name
- type
- required or optional
- default
- allowed values
- constraints
- examples
- errors
- version notes
- deprecation notes

Reference pages should be easy to skim and hard to misunderstand.

## Treat operations docs as safety equipment

Operations docs should not be aspirational. They should help someone recover a system under pressure.

Runbooks must include:

- symptoms
- impact
- likely causes
- dashboards
- logs
- commands
- verification
- rollback
- escalation
- known false positives

Do not bury critical production recovery information in prose-heavy architecture pages.

## Internal docs deserve the public-docs quality bar

Internal documentation can assume more context, but it should not be sloppy.

Internal docs are often more operationally important than public docs. They guide production changes, incident response, onboarding, and future agent work.

The difference between internal and public docs is not quality. The difference is audience, security, and assumed context.

## Documentation should explain what not to do

Non-goals and anti-patterns prevent misuse.

Include “do not use this when” sections for:

- internal packages
- services with narrow ownership
- APIs with sharp edges
- CLIs that mutate production
- frameworks with intended extension points
- deprecated systems

Good docs make the safe path obvious and the unsafe path visible.

## Documentation should age visibly

Docs get stale. Make staleness easier to detect.

Include when useful:

- version compatibility
- last verified dates for operational procedures
- supported environments
- deprecated behavior
- ownership
- source of truth links
- generated reference markers

Avoid claims like “new,” “temporary,” and “soon” without dates or issue links.

## The best docs reduce human interrupts

A strong docs set should reduce:

- Slack questions
- onboarding meetings
- repeated PR comments
- production handholding
- reverse engineering
- accidental misuse
- agent hallucination

When a question repeats, the answer belongs in docs.
