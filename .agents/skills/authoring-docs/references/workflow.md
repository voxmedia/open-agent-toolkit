---
title: Documentation Authoring Workflow
description: Evidence-first workflow for creating, migrating, or improving docs.
---

# Documentation Authoring Workflow

The job is not to write plausible documentation. The job is to extract truth
from the repository, organize it, and make it usable.

## 1. Classify the Project

Identify the primary project type before writing:

- frontend app
- backend service
- full-stack app
- API service
- CLI
- library, package, framework, or SDK
- infrastructure module
- worker or job processor
- event-driven system
- documentation-only repo
- mixed monorepo

Repos can have multiple types. Document the dominant reader path first, then
add category-specific coverage.

## 2. Inventory Sources of Truth

Inspect likely evidence before editing.

For package-based projects, check package metadata, lockfiles, runtime version
files, build config, source entry points, scripts, tests, and CI.

For APIs, check route definitions, controllers, middleware, schema files,
OpenAPI, GraphQL, protobuf, tests, and generated clients.

For CLIs, check `bin` entries, command definitions, flag parsing,
configuration loading, environment variables, tests, and existing examples.

For services and infrastructure, check Docker files, compose files, workflows,
Terraform, Kubernetes, Helm, serverless or CDK configuration, deployment
manifests, monitor definitions, dashboards, and runbooks.

For existing docs, check README files, docs directories, contribution guides,
changelogs, ADRs, RFCs, and migration notes.

## 3. Build a Docs Inventory

Create a lightweight inventory before making broad changes.

| Area              | Exists? | Quality            | Source of Truth         | Action          |
| ----------------- | ------: | ------------------ | ----------------------- | --------------- |
| Landing page      |  Yes/No | Good/Stale/Missing | README or docs index    | Update/Create   |
| Getting started   |  Yes/No | Good/Stale/Missing | scripts, README, tests  | Update/Create   |
| Local development |  Yes/No | Good/Stale/Missing | package scripts, config | Update/Create   |
| Testing           |  Yes/No | Good/Stale/Missing | package scripts, CI     | Update/Create   |
| Deployment        |  Yes/No | Good/Stale/Missing | CI, infra               | Verify/Create   |
| API reference     |  Yes/No | Good/Stale/Missing | schema/routes           | Generate/Create |
| CLI reference     |  Yes/No | Good/Stale/Missing | CLI source              | Generate/Create |
| Configuration     |  Yes/No | Good/Stale/Missing | env/config files        | Create          |
| Architecture      |  Yes/No | Good/Stale/Missing | source, infra           | Create          |
| Operations        |  Yes/No | Good/Stale/Missing | monitors, runbooks      | Create          |
| Troubleshooting   |  Yes/No | Good/Stale/Missing | issues, tests, logs     | Create          |

## 4. Identify Reader Personas

Most docs serve one or more of these readers:

- new contributor
- maintainer
- service consumer
- CLI user
- API consumer
- operator on call
- reviewer
- product stakeholder
- support engineer
- AI agent making future changes

Write pages for actual tasks, not org-chart abstractions.

## 5. Decide the Minimum Useful Set

Most repos need a landing page, getting started, local development, testing,
configuration reference, deployment or release docs if deployable, and
ownership.

Then add category-specific pages. APIs need auth, examples, endpoint or
operation reference, and error behavior. CLIs need command reference, config,
output, exit codes, and automation behavior. Production systems need
observability, runbooks, rollback, and failure modes.

## 6. Preserve Existing Intent

Do not blindly replace existing docs. Existing pages often contain historical
context, production details, migration notes, local setup caveats, owner
knowledge, and important links. Extract useful facts, remove duplication, and
restructure around reader needs.

## 7. Ground Every Claim

For each factual statement, ask where it came from. Good sources include source
code, schemas, package scripts, configuration files, CI workflows, deployment
manifests, tests, generated types, and current docs that still match behavior.

Weak sources include stale comments, guessed conventions, issue titles without
details, inferred ownership, and copied docs from a similar repo. Mark weak but
useful facts as needing verification.

## 8. Write in Layers

For each topic, prefer this order:

1. Purpose
2. Common path
3. Example
4. Verification
5. Edge cases
6. Troubleshooting
7. Related reference
8. Deeper explanation

This keeps pages useful under time pressure.

## 9. Verify and Handoff

Run relevant checks when available: docs build, link check, formatter,
generated-reference command, examples, tests, or local preview. Handoff with
files changed, evidence inspected, verification results, unresolved facts, and
recommended next improvements.
