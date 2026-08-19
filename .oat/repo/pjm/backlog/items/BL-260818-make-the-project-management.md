---
id: BL-260818-make-the-project-management
title: Make the project-management pack user-scope and plugin eligible
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - project-management
  - plugin-distribution
  - tool-packs
assignee: null
created: 2026-08-18T20:43:22.823Z
updated: 2026-08-18T20:43:22.823Z
associated_issues: []
external_plans: []
---

## Description

Extend OAT's plugin distribution model so project-management capabilities can eventually be installed once at user scope and receive provider-managed updates. Preserve repository-owned PJM data and policy while eliminating the need to check managed skill and template copies into every repository, reducing repetitive version-bump commits, tool-update PRs, installation friction, and cross-repository drift.

## Acceptance Criteria

- Define the boundary between globally distributed capabilities and repository-owned PJM state, configuration, policy, backlog records, roadmaps, and decisions.
- Package the `project-management` skills and required read-only resources so they work from a user-level plugin without relying on checked-in `.agents/skills` or `.oat/templates` copies.
- Keep `oat pjm init`, `oat pjm doctor`, backlog operations, and decision workflows writing only their intended repository-local artifacts.
- Support provider-managed plugin upgrades so users receive compatible workflow updates without per-repository tool-update commits.
- Preserve project-scoped and direct-install compatibility during migration, including explicit duplicate-source, precedence, version, and provenance diagnostics.
- Ensure user-level availability does not falsely imply that a repository's PJM surface has been initialized.
- Provide a safe migration path for repositories to remove redundant managed skill and template copies without removing curated PJM data.
- Verify fresh installation, upgrade, duplicate installation, removal, rollback, and representative provider behavior.
- Document the resulting user-versus-project ownership model and its compatibility relationship with the OAT CLI.
