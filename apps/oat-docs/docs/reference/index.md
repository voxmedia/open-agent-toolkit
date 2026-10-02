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

Use OAT's general CLI for repository setup, tool-pack management, configuration and diagnostics independently of provider sync, docs tooling or tracked workflows.

Start with [Getting Started](../getting-started/index.md) for bootstrap and tool packs. See [Configuration](configuration.md) for settings, [Config and Local State](config-and-local-state.md) for diagnostics, and [Advanced](../workflows/advanced/index.md) for workflow gates.
