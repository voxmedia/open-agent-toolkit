---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-05
oat_generated: true
oat_summary_last_task: p06-t06
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: docs-authoring-skills

## Overview

This quick-mode project shipped a layered documentation-authoring system for OAT. The new `authoring-docs` skill captures portable, evidence-first technical documentation standards, while `oat-docs-authoring` adds the OAT/Fumadocs contract for targeted edits inside existing OAT docs apps.

The project also hardened existing docs lifecycle surfaces so generated indexes, authored local maps, link hygiene, Markdown hygiene, bootstrap expectations, and MkDocs-to-Fumadocs migration boundaries are easier for agents to preserve.

## What Was Implemented

- Added `.agents/skills/authoring-docs` with provider-agnostic guidance for principles, workflow, information architecture, page types, writing style, documentation categories, templates, and review rubrics.
- Added `.agents/skills/oat-docs-authoring` as a thin OAT/Fumadocs wrapper that resolves docs roots, preserves authored `index.md` / `## Contents` maps, enforces `.md` links, distinguishes generated app-root manifests, and routes broad lifecycle work to the owning skills.
- Updated `oat-docs-analyze` to check generated-index freshness, local map drift, authored-link hygiene, Markdown hygiene, docs-app contract drift, and app/API/CLI/operations coverage.
- Updated `oat-docs-bootstrap` and docs-tooling pages to separate Fumadocs generated app-root manifests from MkDocs `mkdocs.yml` nav sync, and to keep migration outside bootstrap ownership.
- Polished the standalone MkDocs-to-OAT-Fumadocs migration handoff guide with execution phases, owner-review handling, validation discovery, and final-report expectations.
- Registered the new skills in the docs pack manifest and asset bundler, synced Claude/Cursor provider views, regenerated tracked docs/CLI outputs, and bumped all lockstep public packages to `0.1.22`.

## Key Decisions

- Kept `authoring-docs` free of OAT/Fumadocs-specific instructions so it can be reused as a general documentation-quality baseline.
- Made `oat-docs-authoring` a wrapper over `authoring-docs` instead of duplicating universal writing guidance.
- Kept `oat-docs-bootstrap` focused on new-app scaffolding and post-scaffold education; full MkDocs migrations remain a separate migration workstream.
- Kept `oat-docs-analyze` read-only by encoding drift and coverage checks into skill guidance and artifact templates rather than adding new CLI mutation behavior.

## Notable Challenges

- Parallel p03/p04/p05 fan-out was degraded to sequential execution because autonomous worktree bootstrap hit a shell compatibility issue and provider sync dirtied new worktrees before p06's owned sync phase.
- The p03 review required a fix so Fumadocs docs apps are classified before generic docs-root fallbacks.
- The p04 review required wording fixes so generated-index semantics no longer implied Fumadocs uses `documentation.index` the same way MkDocs uses `mkdocs.yml` nav.

## Verification

- Phase reviews p01 through p06 passed, with review-fix loops completed for p03 and p04.
- Final review passed with no Critical or Important findings.
- Validation included `pnpm oat:validate-skills`, CLI tests, docs lint, `pnpm build`, `pnpm build:docs`, `pnpm release:validate`, `pnpm format`, `pnpm lint`, `pnpm type-check`, and `pnpm test`.
