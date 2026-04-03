---
title: CLI Utilities Overview
description: Plain-language explanation of the OAT CLI surface that lives outside provider sync, docs tooling, and tracked workflows.
---

# CLI Utilities Overview

Not every OAT command belongs to a single product lane. Some commands are general-purpose setup, configuration, pack-management, or diagnostic utilities that support the rest of the toolkit without being specific to provider sync, docs tooling, or tracked workflow execution.

That is what this section covers.

## What Lives Here

- bootstrap and setup flows such as `oat init`
- bundled pack management through `oat tools`
- general configuration guidance
- utility command groups for config, local state, diagnostics, and related inspection flows

## When To Use This Section

Use CLI Utilities when:

- you are first setting up OAT in a repo
- you need to install or update OAT packs
- you are looking for configuration or local-state inspection help
- you need the general CLI surface without committing to one of the deeper lanes yet

## Continue Here

- [CLI Bootstrap](../guide/getting-started.md) for initial setup
- [Tool Packs](../guide/tool-packs.md) for pack lifecycle management
- [Configuration](../guide/configuration.md) for config semantics
- [CLI Reference](../reference/cli-reference.md) for the wider utility command map
