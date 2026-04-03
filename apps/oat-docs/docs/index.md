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

## Choose a usage path

- Provider sync users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`provider-sync/index.md`](provider-sync/index.md)
- Agentic workflow users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`workflows/index.md`](workflows/index.md)
- Docs-tooling users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`docs-tooling/index.md`](docs-tooling/index.md)
- General CLI users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`cli-utilities/index.md`](cli-utilities/index.md) and [`reference/index.md`](reference/index.md)
- Contributors:
  - Start with [`contributing/index.md`](contributing/index.md)
  - Then route into code, docs, markdown features, or skill authoring guidance

## Source-of-truth hierarchy

1. Runtime behavior: `packages/cli/src/**`
2. Skill behavior contracts: `.agents/skills/*/SKILL.md`
3. OAT templates and runtime state: `.oat/templates/**`, `.oat/sync/**`, `.oat/config.json`, `.oat/config.local.json`
4. Repo reference records: `.oat/repo/**`
