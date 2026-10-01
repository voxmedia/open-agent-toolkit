---
id: BL-260718-support-fumadocs-in-oat-docs
title: Teach oat docs nav sync to write Fumadocs navigation from index.md Contents maps
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - docs-cli
  - fumadocs
assignee: null
created: 2026-07-18T18:04:19.719Z
updated: 2026-10-01T04:36:56.000Z
associated_issues: []
external_plans: []
---

## Description

'oat docs nav sync' hard-requires mkdocs.yml: --target-dir help text says 'Docs app directory containing mkdocs.yml' and packages/cli/src/commands/docs/nav/sync.ts:73-83 reads/writes join(appRoot, 'mkdocs.yml') unconditionally. The toolkit's own flagship docs app (apps/oat-docs) is Fumadocs, so the command cannot run against it at all - authored index.md Contents maps are the only navigation source there. Evidence: 2026-07-18 wave-skills-promotion p04-t01 - the phase implementer followed plan guidance to run nav sync after wiring authored navigation and found it MkDocs-only; the Fumadocs-equivalent step is explicit generate-index + build. Suggested fix: either implement a Fumadocs adapter for nav sync (derive meta.json/page tree from authored Contents maps) or make the command detect the framework and fail with actionable guidance; audit bundled skills/docs that recommend 'oat docs nav sync' generically (e.g. docs-pack skills) for framework-conditional wording.

Decided 2026-09-30 (operator): implement the Fumadocs adapter; detecting the
framework and failing with guidance is not enough. `apps/oat-docs` has no
`meta.json` files today, so its sidebar uses Fumadocs' default file-tree order
rather than the authored Contents maps. Planned for the next backlog wave after
`BL-260927-expose-a-scoped-template`.

## Acceptance Criteria

- `oat docs nav sync` detects the docs app framework. The MkDocs path is
  unchanged and keeps its tests.
- For a Fumadocs app, it writes a `meta.json` in each docs directory with an
  `index.md`. The `pages` order comes from that `index.md`'s authored Contents
  map, and the folder title comes from its heading.
- Pages and subdirectories that a Contents map does not list are reported by
  path (and in `--json`), not silently dropped or reordered.
- A second run with no doc changes writes nothing and reports no changes.
- `--target-dir` help and the docs describe both frameworks, and the help
  snapshot is updated.
- Running it on `apps/oat-docs` produces a sidebar that matches the Contents
  maps, the generated `meta.json` files are committed, and `pnpm build:docs`
  passes.
- Bundled skills and docs that recommend `oat docs nav sync` (docs-pack
  skills, docs-app scaffolding guidance) use framework-correct wording, with
  skill version bumps.
- Tests cover a nested Fumadocs fixture, unlisted pages, idempotence, and an
  isolated `HOME`.
