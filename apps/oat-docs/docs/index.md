---
title: OAT Documentation
description: 'An open-source toolkit for portable, provider-agnostic agent tooling and workflows.'
---

# OAT Documentation

Open Agent Toolkit (OAT) is an open-source toolkit for portable, provider-agnostic agent tooling and workflows. It lets teams define canonical agent capabilities once, sync them across providers, and optionally run tracked human-in-the-loop workflows on top.

OAT is organized as three distinct capabilities that can be used together or independently:

1. Provider interoperability CLI (canonical skills/agents + provider sync/drift tooling)
2. Reusable skills, CLI commands, and tooling for provider-agnostic development workflows
3. Optional workflow system (discovery/spec/design/plan/implement/review/PR lifecycle)

## Contents

- [Quickstart](quickstart.md) - Canonical Start Here page for choosing the right OAT adoption path.
- [Provider Sync](provider-sync/index.md) - Canonical section for provider interoperability, drift management, and canonical-to-provider sync.
- [Agentic Workflows](workflows/index.md) - Canonical section for tracked project workflows, ideas, lifecycle execution, and workflow-oriented skills.
- [Docs Tooling](docs-tooling/index.md) - Canonical section for docs app setup, docs commands, and docs maintenance workflows.
- [CLI Utilities](cli-utilities/index.md) - Canonical section for general OAT CLI surfaces outside provider sync, docs tooling, and tracked workflows.
- [Contributing](contributing/index.md) - Contributor-facing guide for code, docs, markdown features, and skill authoring.
- [Reference](reference/index.md) - Durable reference material for operating and maintaining OAT.

## Why OAT Exists

Teams often need some combination of:

- provider-specific agent instructions that stay aligned from one tool to another
- reusable skills and helper tooling that do not depend on one provider
- a more structured workflow for longer-running implementation work

OAT exists to make those layers work together without forcing teams to adopt all of them at once.

## Start Here

If you are new to OAT, start with [Quickstart](quickstart.md).

That page is the canonical path-selection guide. Use it to choose whether you need:

- provider sync
- agentic workflows
- docs tooling
- general CLI utilities

## Source-of-truth hierarchy

1. Runtime behavior: `packages/cli/src/**`
2. Skill behavior contracts: `.agents/skills/*/SKILL.md`
3. OAT templates and runtime state: `.oat/templates/**`, `.oat/sync/**`, `.oat/config.json`, `.oat/config.local.json`
4. Repo reference records: `.oat/repo/**`

## Where To Go Next

- New to OAT: [Quickstart](quickstart.md)
- Need canonical-to-provider sync: [Provider Sync](provider-sync/index.md)
- Need tracked project execution: [Agentic Workflows](workflows/index.md)
- Need docs app or docs maintenance tooling: [Docs Tooling](docs-tooling/index.md)
- Need general command-line help: [CLI Utilities](cli-utilities/index.md)
- Need stable contracts and reference material: [Reference](reference/index.md)
