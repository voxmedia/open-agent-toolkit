---
title: OAT Documentation
description: 'Canonical guide to OAT covering provider sync, workflow execution, docs tooling, and contributor guidance.'
---

# OAT Documentation

Open Agent Toolkit (OAT) is an open-source toolkit built on open standards for defining and managing agent skills, subagents, and hooks across multiple AI coding providers (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex CLI). It provides a provider-agnostic interoperability layer first, with optional, Human-in-the-Loop Lifecycle (HiLL) workflow scaffolding layered on top.

OAT is organized as three distinct capabilities that can be used together or independently:

1. Provider interoperability CLI (canonical skills/agents + provider sync/drift tooling)
2. Reusable skills, CLI commands, and tooling for provider-agnostic development workflows
3. Optional workflow system (discovery/spec/design/plan/implement/review/PR lifecycle)

## Contents

- [Quickstart](quickstart.md) - Shared entry point for interop-only, tooling, and workflow adoption.
- [User Guide](guide/index.md) - User-facing guide for provider sync, docs tooling, workflow execution, skills, and ideas.
- [Contributing](contributing/index.md) - Contributor-facing guide for code, docs, markdown features, and skill authoring.
- [Reference](reference/index.md) - Durable reference material for operating and maintaining OAT.

## Choose a usage path

- Provider sync and CLI users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`guide/provider-sync/index.md`](guide/provider-sync/index.md) and [`guide/cli-reference.md`](guide/cli-reference.md)
- Docs-tooling users:
  - Start with [`guide/documentation/index.md`](guide/documentation/index.md)
  - Then [`guide/documentation/commands.md`](guide/documentation/commands.md)
- Workflow users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`guide/workflow/index.md`](guide/workflow/index.md), [`guide/skills/index.md`](guide/skills/index.md), and [`reference/index.md`](reference/index.md)
- Contributors:
  - Start with [`contributing/index.md`](contributing/index.md)
  - Then route into code, docs, markdown features, or skill authoring guidance
- Idea and backlog users:
  - Start with [`guide/ideas/index.md`](guide/ideas/index.md)

## Source-of-truth hierarchy

1. Runtime behavior: `packages/cli/src/**`
2. Skill behavior contracts: `.agents/skills/*/SKILL.md`
3. OAT templates and runtime state: `.oat/templates/**`, `.oat/sync/**`, `.oat/config.json`, `.oat/config.local.json`
4. Repo reference records: `.oat/repo/**`
