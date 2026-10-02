---
title: Core Concepts
description: Mental model for canonical assets, provider views, scopes, skills, and the optional workflow layer.
---

# Core Concepts

OAT combines a provider-sync layer, reusable skills and CLI tooling, and an optional workflow system. This page gives the high-level mental model so the detailed docs are easier to navigate.

## Choose What to Adopt

```mermaid
flowchart TD
  GOAL["What do you need first?"] --> SYNC["Align coding tools\nProvider Sync"]
  GOAL --> SKILLS["Help with one task\nReusable Skills"]
  GOAL --> WORK["Resume longer work\nWorkflows"]
  GOAL --> DOCS["Maintain documentation\nMarkdown or a docs site"]
  SYNC -.-> LATER["Add another path whenever useful"]
  SKILLS -.-> LATER
  WORK -.-> LATER
  DOCS -.-> LATER
```

- **Provider Sync:** `oat init --scope project`, choose providers, then `oat sync --scope project`.
- **Reusable skills:** `oat tools install --scope user`; no repository initialization is needed.
- **Tracked workflows:** `oat init --scope project`, `oat tools install workflows --scope project`, then `/oat-project-quick-start`.
- **Documentation:** `oat init --scope project`, `oat tools install docs --scope project`, then `/oat-docs-bootstrap` for plain Markdown or a docs site.

Choose a starting point, not a required sequence. Use provider sync to align coding tools, install reusable skills for individual tasks, add tracked workflows for longer work, or maintain plain Markdown or a docs site with Docs Tooling. You can combine these paths later.

Commands below the diagram run in a terminal; `/name` denotes an agent skill (`$name` in Codex). Pack installation has its own scope: project scope targets repository assets, but the core pack is user-only when installed. Skip guided pack setup if you only want provider sync. New tracked projects default to synced storage and need an `origin` remote; choose local project storage for origin-free work.

Continue with [Provider Sync](../provider-sync/index.md), [Tool Packs](tool-packs.md), [Choose a Workflow](../workflows/choose-workflow.md), or [Docs Tooling](../docs-tooling/index.md).

## Canonical Assets and Provider Views

OAT keeps canonical assets in repo-controlled locations and projects provider-specific views from that source of truth. The canonical form is what you edit and review directly; provider views are synchronized outputs that let Claude Code, Cursor, Copilot, Gemini, and Codex consume the same intent in their native layouts.

```mermaid
flowchart LR
  SKILLS[".agents/skills/"] --> OAT["oat sync"]
  AGENTS[".agents/agents/"] --> OAT
  RULES[".agents/rules/"] --> OAT
  OAT --> CLAUDE[".claude/"]
  OAT --> CURSOR[".cursor/"]
  OAT --> COPILOT[".github/"]
  OAT --> CODEX[".codex/"]
```

Gemini CLI is a native read-only consumer; OAT does not generate a `.gemini/` view through sync.

Use these docs next:

- [Provider Sync](../provider-sync/index.md)
- [Reference](../reference/index.md)

## Sync, Drift, and Adoption

`oat sync` applies canonical content to provider views, while `oat status` reports whether a provider is in sync, drifted, or missing content. Drift is expected when provider-side files diverge from canonical content; OAT now also covers canonical rule sync and stray adoption so you can bring unmanaged files back under the canonical model deliberately.

Use these docs next:

- [Provider Sync Commands](../provider-sync/commands.md)
- [Manifest and Drift](../provider-sync/manifest-and-drift.md)

## Scopes

Most OAT operations run in one of three scopes: `project`, `user`, or `all`. Project scope targets the current repository, user scope targets user-level installations, and `all` evaluates both. The same scope model appears across sync, status, and provider configuration commands, so it is worth learning early.

Use these docs next:

- [Scope and Surface](../provider-sync/scope-and-surface.md)
- [CLI Reference](../reference/cli-reference.md)

## Skills and CLI Commands

Skills are structured workflow instructions stored in `.agents/skills`, while CLI commands provide direct operational entry points like `oat init`, `oat sync`, or `oat docs init`. Some capabilities are primarily CLI-driven, some are primarily skill-driven, and some combine both. As a rule: use the CLI for direct system actions and use skills when you want guided lifecycle execution.

Use these docs next:

- [Skills](../skills/index.md)
- [Contributing Skills](../contributing/skills.md)

## The Three Usage Modes

OAT offers three capabilities you can use independently:

1. Provider sync and CLI interop only
2. Provider-agnostic tooling and reusable skills
3. Optional workflow/project lifecycle

These are choices, not required adoption stages. Use only interoperability, install task-oriented skills, or adopt the lifecycle when you need tracked discovery, planning, implementation, review, and PR flow.

Use these docs next:

- [Quickstart](quickstart.md)
- [Workflow & Projects](../workflows/projects/index.md)

## Human-in-the-Loop Lifecycle

The workflow system supports explicit checkpoints so a project can pause at selected moments for approval or direction. At the workflow level, HiLL gates control lifecycle routing across discovery, spec, design, plan, and implementation. During implementation, plan-phase checkpoints control where execution pauses between plan phases.

Use these docs next:

- [Workflow & Projects](../workflows/projects/index.md)
- [Hill Checkpoints](../workflows/projects/planning/hill-checkpoints.md)
