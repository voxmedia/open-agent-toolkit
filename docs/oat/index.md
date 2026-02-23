# OAT Documentation

Open Agent Toolkit (OAT) is an open-source toolkit built on open standards for defining and managing agent skills, subagents, and hooks across multiple AI coding providers (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex CLI). It provides a provider-agnostic interoperability layer first, with optional, Human-in-the-Loop Lifecycle (HiLL) workflow scaffolding layered on top.

OAT is organized as three distinct capabilities that can be used together or independently:

1. Provider interoperability CLI (canonical skills/agents + provider sync/drift tooling)
2. Reusable skills, CLI commands, and tooling for provider-agnostic development workflows
3. Optional workflow system (discovery/spec/design/plan/implement/review/PR lifecycle)

## Choose a usage path

- Interop-only users:
  - Start with `docs/oat/quickstart.md`
  - Then `docs/oat/cli/index.md` (bootstrap/tool-packs/diagnostics) and `docs/oat/cli/provider-interop/index.md` (status/sync/providers)
- Provider-agnostic tooling users:
  - Start with `docs/oat/skills/index.md`
  - Then `docs/oat/reference/index.md`
- Workflow users:
  - Start with `docs/oat/quickstart.md`
  - Then `docs/oat/workflow/index.md`, `docs/oat/projects/index.md`, and `docs/oat/skills/index.md`
- Ideas/brainstorming users:
  - Start with `docs/oat/ideas/index.md`

## Navigation

- Quickstart: `docs/oat/quickstart.md`
- CLI docs index: `docs/oat/cli/index.md`
- CLI design principles: `docs/oat/cli/design-principles.md`
- CLI bootstrap docs: `docs/oat/cli/bootstrap.md`
- CLI tool-pack docs: `docs/oat/cli/tool-packs-and-assets.md`
- CLI diagnostics docs: `docs/oat/cli/diagnostics.md`
- Provider interop docs index: `docs/oat/cli/provider-interop/index.md`
- Workflow docs index: `docs/oat/workflow/index.md`
- Skills map: `docs/oat/skills/index.md`
- Skills contracts: `docs/oat/skills/execution-contracts.md`
- Project docs index: `docs/oat/projects/index.md`
- Ideas docs index: `docs/oat/ideas/index.md`
- Reference docs index: `docs/oat/reference/index.md`

## Source-of-truth hierarchy

1. Runtime behavior: `packages/cli/src/**`
2. Skill behavior contracts: `.agents/skills/*/SKILL.md`
3. OAT templates and runtime state: `.oat/templates/**`, `.oat/sync/**`, `.oat/config.json`, `.oat/config.local.json`
4. Repo reference records: `.oat/repo/**`
