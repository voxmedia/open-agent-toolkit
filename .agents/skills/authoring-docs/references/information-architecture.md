---
title: Information Architecture
description: Reader-first axes, presets, placement, navigation, and cross-linking.
---

# Information Architecture

Choose structure from reader work, not the source tree or a preset label. Use
this generic method without an external playbook. Repository evidence and
exemplars may inform a proposal; private examples never enter this baseline.
Resolve advisory inputs with [Guidance sources](guidance-sources.md).

## Contents

- [Five axes](#five-axes) — Decide readers, entry keys, page jobs, verification and scale.
- [Presets](#presets) — Name the nearest pattern after making those decisions.
- [Standard section set per track](#standard-section-set-per-track) — Familiar sections within a chosen track.
- [Placement and section entries](#placement-and-section-entries) — Keep facts canonical and routes useful.
- [Landing page contract](#landing-page-contract) — Orient readers and route their next action.
- [Specialized tracks](#specialized-tracks) — Agent, Product and QA reading contexts.
- [Navigation principles](#navigation-principles) — Labels, naming and cross-links.

## Five axes

1. **Readers and work contexts:** Who must succeed, doing what? Separate using,
   integrating, maintaining, operating and independently verifying only where
   their entry paths differ. One person can occupy several contexts.
2. **Organizing principle within each track:** What is the reader's entry key:
   task, capability, domain, command, unit or page type? Choose per track rather
   than forcing one principle across all readers.
3. **Page purpose:** Give each page one job: tutorial, how-to, reference,
   explanation, runbook, feature guide, validation matrix, solution or decision
   record. Supporting content stays subordinate to that job.
4. **Verification overlay:** Does someone outside the builders verify behavior
   from these docs? Choose Product/Engineering/QA pairing only for independent
   behavioral verification; otherwise use agent-only checks or none. A UI alone
   does not justify three tracks.
5. **Size gate:** Page count chooses how much structure to materialize, not
   which audience or organizing principle to select. Under about 15 reader
   pages, prefer one flat index with grouped headings. A tiny repo can keep a
   single README covering purpose, setup, usage, configuration, tests and ownership.

Read manifests, UI navigators/journeys, CLI `bin`, routers, IaC, `e2e/` or
`.maestro/`, existing docs and independently consumed monorepo units. Ask only
questions whose answers change a decision: reader work contexts, independent
verification, facts canonical elsewhere and links that must survive. Do not ask
for an archetype label. Show two plausible candidates using the
[IA Proposal template](templates.md#ia-proposal).

## Presets

Presets are names for decisions, not a mandatory directory generator. The six
approved labels and choose-when signals are:

| Preset                  | Choose when                                                                             | Typical entry key                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Product/Engineering/QA  | Product readers and independent verifiers need paired behavior and implementation views | Feature or journey in Product/QA; domain or implementation contract in Engineering |
| Consumer and Maintainer | Using or integrating differs materially from changing and operating the system          | Consumer tasks; maintainer architecture and operations                             |
| Domain Engineering      | Engineers arrive by subsystem, capability or repeated independently consumed unit       | Domain catalog, capability lanes or uniform unit catalog                           |
| Task Type               | One shared reader track serves first success, tasks, lookup and understanding           | Page type: tutorial, how-to, reference, explanation                                |
| Toolkit and CLI         | Users enter through tools, commands and reusable workflows                              | Tool or command family and its tasks/contracts                                     |
| Flat Small              | Fewer than about 15 reader pages do not justify directory layers                        | Grouped headings in one index, preserving the chosen reader model                  |

The single-track, capability-lane, domain-catalog and unit-catalog shapes fit
these presets; they are not additional labels. A unit catalog may follow
implementation directories when every unit uses the same page set and readers
recognize those units. Otherwise avoid organizing only by implementation path.
Aim for about seven root entries; group beyond about 8–10. Do not create empty
pages or parallel facts for symmetry. Re-evaluate materialized depth as content
grows, without changing the audience solely because page count grew.

## Standard section set per track

The former top-level model is a reusable section set **within** each track.
Choose only sections with useful content and use locally familiar labels.

| Section      | Observed labels             | Reader question                            |
| ------------ | --------------------------- | ------------------------------------------ |
| Start here   | Getting started, Tutorial   | What is this and how do I begin?           |
| Tasks        | How-to, Workflows           | How do I complete this task?               |
| Reference    | API, CLI, Configuration     | What are the exact facts?                  |
| Explanation  | Architecture, Concepts      | How does this work and why?                |
| Operations   | Delivery, Runbooks          | How do I run, observe, fix or recover it?  |
| Contributing | Development, Docs authoring | How do I change this system or these docs? |

Docs-about-docs belongs under Contributing, never in a separate reader track.
Small structures can use sections in an index rather than directories.

## Placement and section entries

- One canonical page per fact. Shared contracts live in one Reference and
  other pages link to them. Routing pages own no facts beyond orientation.
- Domain-specific runbooks live with their domain; shared Operations contains
  deployment-wide procedures. Do not split recovery instructions from the
  domain just to fill a standard section.
- Planning artifacts, execution journals and raw evidence stay outside reader
  docs. A durable decision record can explain an accepted design; it is not a
  copy of a project plan.
- Every section has an entry page with a purpose paragraph and one-line-described
  links in its `## Contents` map. “Directory map for X” is not a useful description.
- Preserve existing useful intent, canonical facts and inbound links when
  proposing changes. List link survival constraints before moving anything.

## Landing page contract

The root answers **what**, **why**, **who** and **where to start**. Route the
rest by track, job, capability or page type instead of repeating every section.
Keep capabilities and boundaries/non-goals clear; point to first success,
common tasks, reference, operations and ownership. A route can answer a
question by linking to its canonical page rather than duplicating facts.

## Specialized tracks

**Agent guides:** Organize around repeatable tasks and exact contracts. Link
canonical human-readable facts rather than cloning them. Include inputs,
constraints, source paths, validation and handoff; distinguish durable guides
from transient prompts, plans and execution evidence.

**Product and QA:** Product describes intended behavior, user concepts,
journeys and boundaries; Engineering explains implementation contracts; QA
states independently checkable scenarios and expected outcomes. For a triad,
use filename/slug parity for paired features and reciprocal links. A Product
feature must link to its QA validation and Engineering counterpart (and back).
Quote exact UI literals only when verified against source; distinguish a user
concept from literal screen text. Do not fabricate test IDs or independent
verification needs. Feature and QA validation page templates are not included here;
use the page-type guidance and IA Proposal template to plan their content.

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
