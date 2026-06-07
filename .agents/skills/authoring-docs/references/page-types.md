---
title: Documentation Page Types
description: Guidance for tutorials, how-to guides, reference docs, explanations, and runbooks.
---

# Documentation Page Types

Most documentation problems come from mixing different kinds of information into
one page. A page can contain supporting material from another type, but it
should have one primary job.

## Tutorial

A tutorial teaches through a guided path. Use tutorials when the reader is new
to the project or workflow.

Good tutorial topics include running the app locally for the first time,
sending the first API request, running the first CLI command, creating the first
integration, making the first contribution, or deploying to a non-production
environment.

Rules:

- Assume the reader is capable but unfamiliar with this system.
- State prerequisites before steps.
- Use one successful path.
- Avoid branching.
- Show expected output.
- Explain only enough to keep the reader oriented.
- End with a working result.
- Link to deeper docs for next steps.

## How-To Guide

A how-to guide helps a reader complete a specific task.

Good how-to topics include adding a route, adding a CLI command, rotating a
secret, deploying a service, running a migration, debugging a worker, adding a
feature flag, creating a webhook consumer, or onboarding a service consumer.

Rules:

- Title the page as a task.
- Start with when to use the guide.
- State prerequisites.
- Use numbered steps.
- Include verification.
- Include rollback or cleanup when relevant.
- Keep conceptual explanation brief.
- Link to reference and concept pages.

## Reference

Reference documentation provides exact facts.

Good reference topics include API endpoints, GraphQL schema, CLI commands,
environment variables, configuration, error codes, event schemas, package
exports, permissions, cache keys, and feature flags.

Rules:

- Do not bury facts in prose.
- Use tables, lists, and code blocks.
- Include required vs optional status.
- Include defaults, types, constraints, examples, and errors.
- Include versioning and deprecation notes when known.
- Avoid tutorials inside reference pages.

## Explanation

Explanation helps readers understand how and why the system works.

Good explanation topics include architecture, data flow, rendering model,
caching strategy, auth model, queueing model, consistency model, failure modes,
tradeoffs, migration strategy, and design constraints.

Rules:

- Start with the problem or design pressure.
- Explain the mental model.
- Be honest about tradeoffs.
- Include diagrams when helpful.
- Link to ADRs or RFCs when available.
- Do not turn explanation pages into step-by-step guides.
- Do not hide operational instructions only in explanation pages.

## Runbook

A runbook is operational how-to plus reference. Use it when the reader needs to
recover or safely operate a system.

Rules:

- Start with symptoms and impact.
- Include first checks, dashboards, logs, metrics, or traces.
- List likely causes and known false positives.
- Provide mitigation steps and exact commands or links.
- Include verification, rollback, and escalation.
- Avoid long historical background before recovery steps.

## Mixed Pages

Some pages legitimately mix types. A landing page can include orientation,
links, and a small quick start. A runbook can include reference tables and task
steps. An API guide can include conceptual auth explanation plus endpoint
reference links.

The rule is not "never mix." The rule is to know the primary job of the page
and keep everything else subordinate.

## Smell Test

| If the Reader Asks              | They Need    | Do Not Give Them            |
| ------------------------------- | ------------ | --------------------------- |
| I am new. Walk me through this. | Tutorial     | Full API reference          |
| How do I do X?                  | How-to guide | Architecture essay          |
| What does this option mean?     | Reference    | A blog post                 |
| Why does this behave this way?  | Explanation  | A command list              |
| Production is broken. What now? | Runbook      | Historical background first |
