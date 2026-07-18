---
title: CLI Utilities
description: Standalone adoption lane for general OAT CLI surfaces outside provider sync, docs tooling, and tracked workflows.
---

# CLI Utilities

CLI Utilities is the OAT lane for the useful command surface that does not primarily belong to Provider Sync, Docs Tooling, or tracked workflow lifecycle execution.

Use this section when you want bootstrap guidance, tool-pack lifecycle details, configuration help, and general-purpose command references. It covers general-purpose setup, configuration, pack-management, and diagnostic utilities that support the rest of the toolkit without being specific to provider sync, docs tooling, or tracked workflow execution.

## Contents

- [CLI Bootstrap](bootstrap.md) - Foundational `oat init` guidance outside provider-sync-specific onboarding.
- [Tool Packs and Installed Assets](tool-packs.md) - Bundled packs and `oat tools` lifecycle commands.
- [Configuration](configuration.md) - OAT configuration guidance across shared, local, user, and provider-sync surfaces.
- [Config and Local State](config-and-local-state.md) - Utility command groups for config, local state, diagnostics, and related inspection flows.
- [Project Log](project-log.md) - Append-only project observations, synthesis, inspection, and durable roll-up.
- [Backlog Lifecycle](backlog-lifecycle.md) - Backlog item states, atomic close-out with `oat backlog archive`, and lifecycle drift detection in `oat pjm doctor`.
- [Workflow Gates](workflow-gates.md) - Completion-safe headless reviews, budgets, liveness evidence, and cross-runtime dispatch with `oat gate`.

## What Lives Here

This section collects the command groups that help you initialize OAT, manage installed packs, inspect local or config state, and use the wider CLI without implying that you are adopting provider sync or tracked workflows.

Examples include:

- bootstrap and setup flows such as `oat init`
- bundled pack management through `oat tools`
- general configuration guidance
- workflow gate commands for per-skill final checks and cross-runtime review dispatch
- utility command groups for config, local state, diagnostics, and related inspection flows

## Who It's For

- Users getting OAT set up in a repo
- Teams managing installed tool packs and local config
- People who need a general command map without diving into workflow lifecycle docs

## When To Use This Section

Use CLI Utilities when:

- you are first setting up OAT in a repo
- you need to install or update OAT packs
- you are looking for configuration or local-state inspection help
- you need the general CLI surface without committing to one of the deeper lanes yet

## Start Here

- Use [CLI Bootstrap](bootstrap.md) when you are starting with `oat init`.
- Go to [Tool Packs](tool-packs.md) when you are managing bundled OAT packs and installed assets.
- Read [Configuration](configuration.md) for config semantics, or [Config and Local State](config-and-local-state.md) for inspection and diagnostic command groups.
- Use [Workflow Gates](workflow-gates.md) when you want a skill to run a configured final command before it is considered done.

## Common Tasks

- Bootstrap OAT in a repo with [CLI Bootstrap](bootstrap.md).
- Manage installed packs in [Tool Packs](tool-packs.md).
- Adjust settings in [Configuration](configuration.md).
- Use [Config and Local State](config-and-local-state.md) for the utility command groups that support inspection and diagnostics.
- Configure cross-runtime review gates in [Workflow Gates](workflow-gates.md).

## Go Deeper

- [CLI Bootstrap](bootstrap.md) - Foundational `oat init` guidance outside provider-sync-specific onboarding.
- [Tool Packs](tool-packs.md) - Bundled packs and `oat tools` lifecycle commands.
- [Configuration](configuration.md) - OAT configuration guidance.
- [Config and Local State](config-and-local-state.md) - Utility command groups for config, local state, diagnostics, and related inspection flows.
- [Workflow Gates](workflow-gates.md) - Per-skill final commands and cross-runtime review dispatch.
