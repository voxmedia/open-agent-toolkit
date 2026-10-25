---
id: DR-261025-approved-docs-tooling-updates
title: Approved docs tooling updates include the app-local CLI
date: 2026-10-25
status: accepted
legacy_id: null
---

# Approved docs tooling updates include the app-local CLI

## Context

Amends DR-261024-explicit-docs-apply-approvals. That record, following the docs-skills-ia-367 plan's G4, limited an individually approved tooling update to the docs app's `@open-agent-toolkit/docs-*` dependencies, supported `oat docs migrate` conversions and build verification. A pilot consumer repository showed the gap: the docs app also declares `@open-agent-toolkit/cli` (typically as a devDependency) and runs `oat docs generate-index` in `predev`/`prebuild`. The five public packages release in lockstep, so a `docs-*` bump that leaves the app-local CLI behind makes that CLI write a different generated manifest than the operator's CLI, and the two keep rewriting each other. Offline drift already reported the app-local CLI, but only as a manual command outside apply's tooling update.

## Decision

An individually approved tooling update may also bump the docs app's own `@open-agent-toolkit/cli` dependency, in the dependency section the app already declares it, to the same bundled version as the `docs-*` packages, include the resulting lockfile change, and regenerate the app's generated manifest (`index.md`) with that upgraded app-local CLI. Analyze reports older app-local CLI drift inside the `tooling-update` recommendation (`approval: explicit`) together with `docs-*` drift, each with its exact upgrade command preserving its dependency section.

## Consequences

The approval boundary is otherwise unchanged: tooling updates stay `approval: explicit`, need individual approval by ID, and blanket or unattended runs skip and report them. No other application dependency, framework upgrade, host setting or app-shell rebuild is permitted, and scaffold changes the CLI cannot make (app config, routes, package scripts) remain manual. `ahead` and `unverified` statuses still supply no upgrade command and authorize nothing. oat-docs-analyze, its artifact template, oat-docs-apply and the public docs workflows page carry the new scope, and the apply approval-contract test guards the clause.
