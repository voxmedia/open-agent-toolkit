---
id: bl-c745
title: 'Add per-CLAUDE.md adoption opt-out for instruction sync'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels:
  - provider-sync
  - instructions
  - claude
  - ux
assignee: null
created: '2026-04-13T22:35:45Z'
updated: '2026-04-13T22:35:45Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

The new project-scoped instruction-sync workflow treats a readable `CLAUDE.md` without sibling `AGENTS.md` as an adoptable stray. That is coherent with the current canonical model, but it does not leave room for users who intentionally want some `CLAUDE.md` files to remain Claude-specific and never be promoted into canonical `AGENTS.md`.

We should add an explicit opt-out model so users can decide, per workflow or per path, whether Claude-only files are adoptable. The item should evaluate the main UX and implementation options, document tradeoffs, and choose a recommended path.

Options to evaluate:

1. Add explicit sync-time opt-in, such as `oat instructions sync --adopt-strays`, so Claude-only adoption is never implicit.
2. Add path-based config allow/deny controls so selected directories are excluded from adoption.
3. Add a per-file sentinel in `CLAUDE.md` that marks the file as Claude-only and non-adoptable.
4. Add an interactive approval flow for each stray item.

Recommended direction:

- Prefer an explicit adoption control first, either `--adopt-strays` or a path-based opt-out/allowlist model.
- Treat per-file sentinels as a secondary option only if the product explicitly wants file-local ownership markers.
- Avoid making implicit adoption more complex without giving users a predictable non-interactive policy.

## Acceptance Criteria

- Backlog follow-up defines the supported option set for non-adoptable Claude-only files, including tradeoffs for CLI UX, automation, and repository ergonomics.
- The recommended approach is explicit about whether adoption should remain default-on, become opt-in, or be controlled by path configuration.
- The chosen direction addresses non-interactive use, `--dry-run`, and recursive nested scan behavior.
- The chosen direction explains how `validate` should report Claude-only files that are intentionally not adoptable.
- The follow-up explicitly covers whether the control is per-run, per-path, per-file, or some combination.
