---
title: Agent Workflow for Documentation
description: Required workflow for AI agents writing grounded technical documentation.
---

# Agent Workflow for Documentation

This workflow is mandatory for agents creating, migrating, or improving docs.

The job is not to write plausible documentation. The job is to extract truth from the repo, organize it, and make it usable.

## 1. Classify the project

Identify the primary project type before writing.

Common types:

- frontend app
- backend service
- full-stack app
- API service
- CLI
- library or package
- framework
- SDK
- infrastructure module
- worker or job processor
- event-driven system
- documentation-only repo
- mixed monorepo

A repo can have multiple types. Document the dominant type first, then add category-specific docs.

## 2. Inventory the repo

Inspect likely source-of-truth files.

For Node/TypeScript projects:

```txt
package.json
pnpm-lock.yaml
yarn.lock
package-lock.json
tsconfig.json
next.config.*
vite.config.*
src/
app/
pages/
components/
lib/
server/
cli/
bin/
```

For APIs:

```txt
openapi.yaml
openapi.json
schema.graphql
src/routes/
src/controllers/
src/resolvers/
src/middleware/
api/
proto/
```

For CLIs:

```txt
bin/
cli/
src/commands/
src/options/
src/config/
package.json bin field
README command examples
```

For services and infrastructure:

```txt
Dockerfile
docker-compose.yml
.github/workflows/
terraform/
infra/
k8s/
helm/
serverless.yml
sst.config.*
cdk/
```

For observability and operations:

```txt
datadog/
dashboards/
monitors/
alerts/
runbooks/
logging config
tracing config
```

For existing docs:

```txt
README.md
docs/
CONTRIBUTING.md
CHANGELOG.md
ADR/
rfc/
```

## 3. Build a docs inventory

Create a quick inventory before editing.

Use this table internally or in a migration issue:

| Area              | Exists? | Quality            | Source of truth         | Action             |
| ----------------- | ------: | ------------------ | ----------------------- | ------------------ |
| Landing page      |  Yes/No | Good/Stale/Missing | README                  | Update             |
| Getting started   |  Yes/No | Good/Stale/Missing | README, package scripts | Create             |
| Local development |  Yes/No | Good/Stale/Missing | package scripts         | Update             |
| Testing           |  Yes/No | Good/Stale/Missing | package scripts, CI     | Update             |
| Deployment        |  Yes/No | Good/Stale/Missing | CI, infra               | Verify             |
| API reference     |  Yes/No | Good/Stale/Missing | schema/routes           | Generate or create |
| CLI reference     |  Yes/No | Good/Stale/Missing | CLI source              | Generate or create |
| Configuration     |  Yes/No | Good/Stale/Missing | env/config files        | Create             |
| Architecture      |  Yes/No | Good/Stale/Missing | source, infra           | Create             |
| Operations        |  Yes/No | Good/Stale/Missing | monitors, dashboards    | Create             |
| Troubleshooting   |  Yes/No | Good/Stale/Missing | issues, tests, logs     | Create             |

## 4. Identify reader personas

Most docs should serve at least one of these personas:

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

Write pages for actual reader needs, not org-chart abstractions.

## 5. Decide the minimum useful docs set

Every repo should have:

- landing page
- getting started
- local development
- testing
- configuration reference
- deployment or release docs if deployable
- ownership

Then add category-specific docs:

| Project type    | Additional docs                                             |
| --------------- | ----------------------------------------------------------- |
| API             | API reference, auth, errors, examples, versioning           |
| CLI             | command reference, flags, output, exit codes, config        |
| frontend app    | routes, data fetching, state, accessibility, analytics      |
| backend service | dependencies, data flow, jobs, queues, database, runbook    |
| library         | install, usage, public API, examples, compatibility         |
| framework       | concepts, extension points, conventions, anti-patterns      |
| infrastructure  | inputs, outputs, environments, state, apply/rollback, risks |

## 6. Preserve and improve existing intent

Do not blindly replace existing docs.

Existing docs often contain:

- historical context
- hidden production details
- migration notes
- local setup hacks
- owner knowledge
- links to dashboards or workflows

Extract useful facts, remove duplication, and restructure around the standard information architecture.

## 7. Ground every claim

For each factual statement, ask: where did this come from?

Good sources:

- source code
- schema files
- package scripts
- config files
- CI workflows
- deployment manifests
- existing docs
- tests
- generated types
- README examples that still match code

Weak sources:

- old comments
- stale docs
- issue titles without detail
- guessed conventions
- inferred ownership
- copied docs from a similar repo

If a fact is weak but useful, mark it as needing verification.

## 8. Write in layers

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

## 9. Avoid duplication

Duplication creates staleness.

Instead of repeating the same command everywhere:

- put the command in the reference page
- link to it from how-to guides
- repeat only the minimum required snippet where it improves task flow

Duplicate intentionally only when the user would otherwise fail a high-value task.

## 10. Add uncertainty deliberately

Do not hide uncertainty.

Use clear markers:

```md
> [!NOTE]
> This deployment workflow is inferred from `.github/workflows/deploy.yml` and has not been verified against a production deploy.
```

```md
> [!WARNING]
> This runbook does not document rollback. Confirm rollback behavior before relying on it during an incident.
```

## 11. Produce a handoff summary

When finishing a docs migration or update, include:

- what changed
- what sources were used
- what remains uncertain
- what docs still need owner review
- any risky assumptions

Example:

```md
## Handoff

Updated docs for local development, configuration, and deployment.

Grounded in:

- `package.json`
- `.github/workflows/deploy.yml`
- `src/config.ts`
- existing `README.md`

Needs owner review:

- production rollback steps
- Datadog dashboard links
- owning Slack channel
```

## 12. Stop conditions

Stop and mark uncertainty when:

- commands cannot be verified from repo files
- ownership is missing
- deployment behavior is unclear
- code and docs disagree
- public/private boundary is unclear
- a generated schema is missing
- an operation appears destructive

Stopping does not mean doing nothing. Write the safe, grounded parts and call out what must be verified.
