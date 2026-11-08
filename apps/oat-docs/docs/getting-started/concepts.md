---
title: Core Concepts
description: Mental model for canonical assets, provider views, scopes, skills, and the optional workflow layer.
---

# Core Concepts

OAT combines a provider-sync layer, reusable skills and CLI tooling, and an optional workflow system. This page gives the high-level mental model so the detailed docs are easier to navigate.

## Choose What to Adopt

OAT has one core path and two optional parts. You edit canonical skills, agents, and rules once and `oat sync` writes the provider views your coding tools need; tool packs (such as `workflows` and `docs`) install more skills, and tracked projects keep a record under `.oat/projects/` in the storage scope you choose.

=== "Diagram"

    ![Skills, agents and rules in .agents/ flow through oat sync to provider views; optional tool packs and tracked projects work on their own or together](/diagrams/oat-at-a-glance-light.svg)
    ![Skills, agents and rules in .agents/ flow through oat sync to provider views; optional tool packs and tracked projects work on their own or together](/diagrams/oat-at-a-glance-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart TD
      accTitle: OAT at a glance
      accDescr: Canonical skills, agents and rules in .agents/ flow through oat sync into provider views, and some providers read .agents/ directly. Tool packs install skills and agents into .agents/ or ~/.agents/. Tracked projects keep a record under .oat/projects/ in one storage scope: synced by default, shared or local. Use any part on its own.
      CANON["Canonical assets\n.agents/\nskills · agents · rules"] --> SYNC["oat sync\ngenerate views"]
      SYNC --> VIEWS["Provider views\n.claude/ .cursor/\n.github/ .codex/"]
      CANON -.->|"some providers read .agents/ directly"| VIEWS
      PACKS["Tool packs\noat tools install\nproject or user scope · core is user-only"] -.->|"installs skills and agents into\n.agents/ or ~/.agents/"| CANON
      PROJECTS["Tracked projects\nworkflows-pack skills keep a record\n.oat/projects/"] -.->|"one storage scope per project"| SYNCED["synced (default)\nown Git ref, pushed to origin\nneeds an origin remote"]
      PROJECTS -.-> SHARED["shared\ncommitted on the current branch"]
      PROJECTS -.-> LOCAL["local\nthis machine only, gitignored"]
      %% Footer in the SVGs: Use any part on its own; combine them when useful.
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

The top row of the diagram in [Choose What to Adopt](#choose-what-to-adopt) shows this flow: `oat sync` writes provider views under `.claude/`, `.cursor/`, `.github/`, and `.codex/` from canonical skills, agents, and rules in `.agents/`, and some providers read `.agents/` directly (Cursor, Copilot, and Codex read skills from `.agents/skills`).

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

In tracked projects the two divide the work. Skills make the judgment calls; they read project state through `oat project status` instead of parsing files, rely on CLI checks that refuse an invalid plan, journal, or closeout, and write some records only through the CLI. When `oat` is missing, autonomous and cloud runs restore it or stop rather than approximate state.

=== "Diagram"

    ![Skills decide discovery, design and review findings; they call the oat CLI, which reads project state, checks boundaries and writes owned records](/diagrams/prose-and-cli-light.svg)
    ![Skills decide discovery, design and review findings; they call the oat CLI, which reads project state, checks boundaries and writes owned records](/diagrams/prose-and-cli-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart TD
      accTitle: Skills decide, the CLI enforces
      accDescr: Skills decide discovery depth, design choices and review findings, then call the oat CLI instead of hand-parsing state. The CLI reads project state for skills, runs boundary checks that refuse an invalid plan, journal or closeout, and writes the records it owns. When oat is missing, autonomous and cloud runs restore it or stop rather than approximate state.
      SKILL["Skills decide\ndiscovery depth, design choices,\nreview findings"] -->|calls| CLI["The CLI enforces\nskills call it instead of hand-parsing"]
      CLI --> READ["oat project status\nreads project state\nfor skills"]
      CLI --> CHECK["Boundary checks\nrefuse an invalid plan,\njournal or closeout"]
      CLI --> WRITE["Records it owns\nproject log,\ncompleted state"]
      SKILL -.->|"oat missing\nautonomous, cloud runs"| STOP["Restore oat or stop\nnever approximate state or transitions"]
    ```

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
