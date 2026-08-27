---
id: BL-260818-make-the-project-management
title: Make every OAT tool pack user-scope eligible
status: closed
priority: high
scope: feature
scope_estimate: XL
labels:
  - project-management
  - tool-packs
  - user-scope
assignee: null
created: 2026-08-18T20:43:22.823Z
updated: '2026-08-27T23:12:00Z'
associated_issues: []
external_plans: []
---

## Description

Make every OAT tool pack installable and operable at user scope through the
regular OAT CLI and direct-install lifecycle, including the project-management
pack. Preserve repository-owned project-management data and policy while
eliminating the need to check reusable managed skills, agents, and templates
into every repository. This should reduce repetitive version-bump commits,
tool-update pull requests, installation friction, and cross-repository drift.

Native plugin distribution is deferred from the immediate scope. The user-scope
model should remain a sound source for future plugin packaging, but it must
deliver value independently through the existing installation path.

## Acceptance Criteria

- Every OAT tool pack can be selected for user-scope installation, including
  `project-management`, without regressing existing user-eligible packs.
- Reusable project-management skills, agents, templates, scripts, and read-only
  resources work from user scope without requiring checked-in managed copies in
  each repository.
- Repository-owned PJM state, configuration, policy, backlog records, roadmaps,
  decisions, and other curated project data remain repository-local.
- User-scope project-management availability does not falsely imply that a
  repository's PJM surface has been initialized.
- `oat pjm init`, `oat pjm doctor`, backlog operations, decision workflows, and
  related writes continue to affect only their intended repository-local
  artifacts.
- Installer, update, removal, configuration, status, and doctor flows recognize
  user, project, and combined placement for every pack.
- Existing project-scope and direct-install behavior remains supported during
  migration, with explicit duplicate-source, precedence, version, ownership,
  and provenance diagnostics.
- A safe migration path removes only redundant OAT-managed assets and preserves
  curated PJM data and repository-specific customizations.
- Verification covers fresh user installation, project-to-user migration,
  updates, duplicate installations, removal, rollback, and representative
  provider materialization.
- Documentation clearly explains the user-versus-project ownership model,
  initialization boundary, update behavior, and future compatibility with
  native plugin packaging.
