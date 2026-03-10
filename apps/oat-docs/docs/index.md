---
title: OAT Documentation
description: ""
---

# OAT Documentation

Open Agent Toolkit (OAT) is an open-source toolkit built on open standards for defining and managing agent skills, subagents, and hooks across multiple AI coding providers (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex CLI). It provides a provider-agnostic interoperability layer first, with optional, Human-in-the-Loop Lifecycle (HiLL) workflow scaffolding layered on top.

OAT is organized as three distinct capabilities that can be used together or independently:

1. Provider interoperability CLI (canonical skills/agents + provider sync/drift tooling)
2. Reusable skills, CLI commands, and tooling for provider-agnostic development workflows
3. Optional workflow system (discovery/spec/design/plan/implement/review/PR lifecycle)

## Contents

- [Quickstart](quickstart.md) - Core setup and repo development paths.
- [CLI](cli/index.md) - Bootstrap, diagnostics, tool packs, and provider interop commands.
- [Workflow](workflow/index.md) - Lifecycle phases, HiLL checkpoints, reviews, and PR flow.
- [Projects](projects/index.md) - Project artifact structure and state handling.
- [Skills](skills/index.md) - Skill families and execution contracts.
- [Ideas](ideas/index.md) - Lightweight brainstorming and summarization workflow.
- [Reference](reference/index.md) - Durable reference material for operating and maintaining OAT.
- [Contributing](contributing.md) - Authoring conventions and plugin inventory for this docs app.

## Choose a usage path

- Interop-only users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`cli/index.md`](cli/index.md) and [`cli/provider-interop/index.md`](cli/provider-interop/index.md)
- Provider-agnostic tooling users:
  - Start with [`skills/index.md`](skills/index.md)
  - Then [`reference/index.md`](reference/index.md)
- Workflow users:
  - Start with [`quickstart.md`](quickstart.md)
  - Then [`workflow/index.md`](workflow/index.md), [`projects/index.md`](projects/index.md), and [`skills/index.md`](skills/index.md)
- Ideas/brainstorming users:
  - Start with [`ideas/index.md`](ideas/index.md)

## Navigation

- Quickstart: [`quickstart.md`](quickstart.md)
- CLI docs index: [`cli/index.md`](cli/index.md)
- CLI design principles: [`cli/design-principles.md`](cli/design-principles.md)
- CLI bootstrap docs: [`cli/bootstrap.md`](cli/bootstrap.md)
- CLI tool-pack docs: [`cli/tool-packs-and-assets.md`](cli/tool-packs-and-assets.md)
- CLI diagnostics docs: [`cli/diagnostics.md`](cli/diagnostics.md)
- Provider interop docs index: [`cli/provider-interop/index.md`](cli/provider-interop/index.md)
- Workflow docs index: [`workflow/index.md`](workflow/index.md)
- Skills map: [`skills/index.md`](skills/index.md)
- Skills contracts: [`skills/execution-contracts.md`](skills/execution-contracts.md)
- Project docs index: [`projects/index.md`](projects/index.md)
- Ideas docs index: [`ideas/index.md`](ideas/index.md)
- Reference docs index: [`reference/index.md`](reference/index.md)

## Source-of-truth hierarchy

1. Runtime behavior: `packages/cli/src/**`
2. Skill behavior contracts: `.agents/skills/*/SKILL.md`
3. OAT templates and runtime state: `.oat/templates/**`, `.oat/sync/**`, `.oat/config.json`, `.oat/config.local.json`
4. Repo reference records: `.oat/repo/**`
