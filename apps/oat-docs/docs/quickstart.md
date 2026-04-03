---
title: Quickstart
description: 'Start-here guide for choosing the right OAT adoption path.'
---

# Quickstart

Use this page to choose the OAT path that matches what you are actually trying to do.

This page is intentionally lightweight. It is not the full command manual. Once you choose a path, continue into the owning section for the deeper operational detail.

## Choose a Path

### Provider Sync

Use this path when you want canonical skills, agents, and rules to stay aligned across provider surfaces such as Claude, Cursor, Copilot, Gemini, or Codex.

Best fit:

- you want cross-provider sync and drift checks
- you care about canonical-to-provider asset management
- you do not necessarily need tracked project workflows

Continue here:

- [Provider Sync](provider-sync/index.md)

### Agentic Workflows

Use this path when you want tracked, resumable implementation work with explicit lifecycle artifacts, reviews, and handoff-friendly state.

Best fit:

- you want structured project execution
- you want lifecycle artifacts like `state.md`, `plan.md`, and `implementation.md`
- you want a workflow layer on top of the base CLI/tooling

Continue here:

- [Agentic Workflows](workflows/index.md)

### Docs Tooling

Use this path when you are bootstrapping or maintaining a documentation surface with OAT.

Best fit:

- you need docs app setup or maintenance workflows
- you care about docs navigation, docs commands, and docs-specific analysis/apply flows
- you want the docs-system contract rather than the broader workflow layer

Continue here:

- [Docs Tooling](docs-tooling/index.md)

### CLI Utilities

Use this path when you want general OAT CLI help outside the dedicated provider-sync, workflows, and docs-tooling lanes.

Best fit:

- you want bootstrap/setup guidance
- you want tool-pack, configuration, local-state, or utility command guidance
- you want a general CLI surface map rather than one specific product lane

Continue here:

- [CLI Utilities](cli-utilities/index.md)

## If You Are Unsure

Start with the path that best matches the primary thing you need right now.

- If you are trying to sync canonical assets across tools, choose Provider Sync.
- If you are trying to run a tracked implementation workflow, choose Agentic Workflows.
- If you are working on the docs system itself, choose Docs Tooling.
- If you mainly need command-line setup or utility guidance, choose CLI Utilities.

You can adopt more than one lane over time. OAT is designed so these sections can be used together or independently.
