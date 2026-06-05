---
title: Docs authoring skill brainstorm notes
description: Working notes and decisions for the docs authoring skill brainstorm.
---

# Docs authoring skill brainstorm notes

## Session context

This brainstorm is exploring a reusable documentation-authoring capability for OpenAgent Toolkit and related documentation migrations.

The starting research pack was imported from `~/Downloads/vox-docs-authoring-skill.zip` into this directory.

## Decisions

### Skill names

- Use `authoring-docs` for the agnostic baseline skill.
- Use `oat-docs-authoring` for the OAT/Fumadocs wrapper skill.

## Working direction

The baseline skill should cover general-purpose technical documentation authoring across APIs, CLIs, applications, services, libraries, frameworks, monorepos, architecture docs, operations docs, and internal or public documentation.

The OAT/Fumadocs wrapper should layer on OAT-specific conventions such as authored `index.md` maps, `## Contents` sections, `.md`-suffixed links, generated navigation, generated root indexes, and Fumadocs-oriented troubleshooting.

## Analysis prompts

- `existing-oat-fumadocs-improvement-analysis-prompt.md` prompts an agent to analyze existing OAT Fumadocs docs apps for repo-specific improvement opportunities based on the baseline authoring guidance. It writes one improvement artifact per implementation under `existing-oat-fumadocs-improvements/`.
- `oat-docs-authoring-wrapper-pattern-analysis-prompt.md` prompts an agent to analyze existing OAT Fumadocs implementations for reusable conventions and takeaways that should shape the future `oat-docs-authoring` wrapper skill.

Both prompts currently scope analysis to these implementations:

- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`
- `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`
- `/Users/thomas.stang/Code/vox/duet/apps/duet-docs`
- `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`
- `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`
- `/Users/thomas.stang/Code/stoa/apps/documentation`

## Completed analysis implications

The wrapper-pattern analysis and per-repo improvement artifacts shift the brainstorm from broad docs-writing guidance toward a layered docs ecosystem:

- `authoring-docs` should remain the universal, evidence-first documentation quality baseline.
- `oat-docs-authoring` should be a thin OAT/Fumadocs wrapper focused on contract, placement, navigation, validation, migration pitfalls, and lifecycle-skill boundaries.
- `oat-docs-analyze` should absorb repeatable structural checks surfaced across the repos.
- Repo-specific improvement artifacts should become follow-up prompts or backlog items, not core skill content.

### Wrapper-skill implications

`oat-docs-authoring` should focus on:

- resolving the docs app root and authored docs root before editing
- reading local root/docs-app/area `AGENTS.md` and contributing guidance
- preserving local IA routers and Fumadocs shell customizations
- enforcing authored `docs/**/index.md` and `## Contents` local maps for content directories
- requiring `.md`-suffixed relative links and `subdir/index.md` child-directory links for new authored navigation entries
- distinguishing authored source files from generated app-root `index.md`
- regenerating and validating generated root indexes rather than hand-editing them
- defaulting to plain `.md` and using `.mdx` only when JSX/components are required
- avoiding `overview.md` as a directory entrypoint
- routing bulk audits, broad restructures, bootstrap work, and project-derived docs deltas to the existing lifecycle skills

### Analyzer-check implications

The repo analyses suggest repeatable `oat-docs-analyze` checks for:

- generated root index freshness and missing generated warning banners
- generated-root entries that are not reachable through authored parent `## Contents`
- missing `index.md` for Markdown-bearing content directories
- missing, weak, or placeholder `## Contents` sections
- extensionless authored relative Markdown links
- lingering `overview.md` files
- broken relative links
- unlabeled code fences
- unexpected `.mdx` usage for plain content
- disabled/no-op docs lint or format checks when the repo appears to need validation
- stale local authoring guidance that references old workflow names or omits current OAT/Fumadocs rules

### Bootstrap and migration implications

Migration should remain a standalone handoff-guide concern, not an `oat-docs-bootstrap` responsibility. The Duet and Honeycomb refactor lessons should primarily be used to dial in `mkdocs-to-oat-fumadocs-refactor-guide.md` for the remaining migration repo. `oat-docs-bootstrap` updates should be limited to bootstrap-relevant improvements, such as clearer generated-index/Fumadocs guidance or better post-scaffold checks.

### Follow-up workstreams

This should be one OAT project with several coordinated workstreams:

1. Create the agnostic `authoring-docs` baseline from the imported research pack.
2. Create the `oat-docs-authoring` wrapper as a thin overlay with OAT/Fumadocs reference files.
3. Update `oat-docs-analyze` with the repeatable structural and hygiene checks.
4. Update `oat-docs-bootstrap` only for bootstrap-relevant improvements, not migration ownership.
5. Dial in `mkdocs-to-oat-fumadocs-refactor-guide.md` as a standalone migration handoff document.
6. Optionally turn each per-repo improvement artifact into backlog items or project prompts.
