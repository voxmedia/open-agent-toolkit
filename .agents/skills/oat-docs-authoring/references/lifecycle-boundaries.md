---
title: OAT docs authoring lifecycle boundaries
description: Routing and self-correction rules for OAT docs setup, audit, apply, project-documentation, and migration workflows.
---

# OAT Docs Authoring Lifecycle Boundaries

Use `oat-docs-authoring` for targeted authoring and small local restructuring.
Route larger lifecycle work to its owner.

## Routing Rules

| Request shape                                                           | Owner                      | Why                                                                                                                        |
| ----------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| New docs app setup, scaffold repair, package/app shell bootstrap        | `oat-docs-bootstrap`       | Bootstrap owns preflight, inputs, `oat docs init`, post-scaffold checks, config inspection, and walkthrough.               |
| Read-only docs audit, structure analysis, coverage review, drift report | `oat-docs-analyze`         | Analyze owns inventory, evidence gathering, severity-rated findings, and analysis artifacts.                               |
| Applying approved analysis recommendations or batch docs changes        | `oat-docs-apply`           | Apply owns branch creation, approved changes, deterministic nav sync, verification, commit, and optional PR.               |
| Docs updates derived from an active OAT project                         | `oat-project-document`     | Project-document owns artifact/code scanning, docs delta planning, approval, and project provenance.                       |
| Existing MkDocs app to OAT/Fumadocs migration                           | Standalone migration guide | Migration needs inventory, syntax conversion, app-shell work, render checks, config/CI changes, and owner-review handling. |

If a request mixes targeted authoring with lifecycle work, split it:

1. Complete the lifecycle step through the owning skill or guide.
2. Return to `oat-docs-authoring` only for a focused follow-up edit.

## Self-Correction Rules

Stop and reroute when you notice:

- a new docs app is needed before content can be authored;
- the user asked for "audit docs", "find all gaps", or similar broad analysis;
- an analysis artifact or recommendation list is the source of truth;
- the docs change is derived from OAT project artifacts rather than a direct
  authoring request;
- the migration requires converting MkDocs config, Python tooling, legacy
  syntax, deploy workflows, or `overview.md` trees;
- you are hand-editing a generated root index, generated route output,
  `mkdocs.yml` nav, or other derived artifact;
- you are treating the generated root index as source instead of checking the
  nearest authored `## Contents`.

## Migration Pointer

Full MkDocs-to-OAT-Fumadocs migration is not bootstrap and is not targeted
authoring. Use the standalone `mkdocs-to-oat-fumadocs-refactor-guide.md` handoff
when available, and keep the migration in an OAT project or explicit migration
branch with owner-review items for unverifiable claims.

For migration-sensitive follow-up after the migration workflow has created a
Fumadocs app, this wrapper can help with a specific page, local map, link, or
render issue. Keep that follow-up narrow.
