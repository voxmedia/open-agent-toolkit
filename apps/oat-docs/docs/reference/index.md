---
title: Reference
description: 'Durable reference material for OAT file locations, docs contracts, directory structure, and troubleshooting.'
---

# Reference

Use this section for durable facts and contracts that should stay stable even as the user-facing adoption lanes and contributor flows evolve.

Contributor how-to material now lives under `contributing/`, and user-facing routing now lives in the top-level adoption lanes.

## Contents

- [Configuration](configuration.md) - OAT configuration guidance across shared, local, user, and provider-sync surfaces.
- [Config and Local State](config-and-local-state.md) - Utility command groups for config, local state, diagnostics, and related inspection flows.
- [CLI Reference](cli-reference.md) - Shallow map of the OAT command surface with links to owning sections.
- [File Locations](file-locations.md) - Where core OAT files, assets, and artifacts live.
- [Docs Index Contract](docs-index-contract.md) - Authored `index.md` maps, `.md` links, generated Fumadocs manifests, and MkDocs nav sync boundaries.
- [`.oat` Directory Structure](oat-directory-structure.md) - Canonical `.oat/` tree map and the role of each major directory.
- [Troubleshooting](troubleshooting.md) - Common issues, diagnostics, and remediation guidance.
- [Project Artifacts](project-artifacts.md) - What lives in `state.md`, `discovery.md`, `plan.md`, `implementation.md`, and related files.
- [State Machine](project-state-machine.md) - Lifecycle and review status transitions across a project.
- [Repository PR Comment Analysis](repository-pr-comments.md) - Repo-wide PR comment collection and triage workflows.

## What Belongs Here

- stable file and directory contracts
- docs-system rules that other pages should link to instead of re-explaining
- troubleshooting material that remains relevant across workflow and docs changes

## Related Sections

- [CLI Reference](cli-reference.md) for the command-surface map
- [Docs Tooling](../docs-tooling/index.md) for docs app setup and workflow guidance
- [Contributing](../contributing/index.md) for code, docs, and skill-authoring practices

## General CLI Adoption Guidance

Canonical section for general OAT CLI surfaces outside provider sync, docs tooling, and tracked workflows.

Bootstrap, tool packs, configuration, and general CLI surfaces.

CLI Utilities is the OAT lane for the useful command surface that does not primarily belong to Provider Sync, Docs Tooling, or tracked workflow lifecycle execution.

Use this section when you want bootstrap guidance, tool-pack lifecycle details, configuration help, and general-purpose command references. It covers general-purpose setup, configuration, pack-management, and diagnostic utilities that support the rest of the toolkit without being specific to provider sync, docs tooling, or tracked workflow execution.

This section collects the command groups that help you initialize OAT, manage installed packs, inspect local or config state, and use the wider CLI without implying that you are adopting provider sync or tracked workflows.

Examples include:

- Teams managing installed tool packs and local config

- People who need a general command map without diving into workflow lifecycle docs

Use CLI Utilities when:

- you need the general CLI surface without committing to one of the deeper lanes yet

- Read [Configuration](configuration.md) for config semantics, or [Config and Local State](config-and-local-state.md) for inspection and diagnostic command groups.

Standalone adoption lane for general OAT CLI surfaces outside provider sync, docs tooling, and tracked workflows.

For onboarding, use [Getting Started](../getting-started/index.md). For settings and diagnostics, use [Configuration](configuration.md) and [Config and Local State](config-and-local-state.md); workflow gates are owned by [Advanced](../workflows/advanced/index.md).
