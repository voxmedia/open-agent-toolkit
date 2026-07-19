---
id: BL-260718-support-fumadocs-in-oat-docs
title: Support Fumadocs in oat docs nav sync (currently MkDocs-only)
status: open
priority: medium
scope: task
scope_estimate: null
labels:
  - docs-cli
  - fumadocs
assignee: null
created: 2026-07-18T18:04:19.719Z
updated: 2026-07-18T18:04:19.719Z
associated_issues: []
external_plans: []
---

## Description

'oat docs nav sync' hard-requires mkdocs.yml: --target-dir help text says 'Docs app directory containing mkdocs.yml' and packages/cli/src/commands/docs/nav/sync.ts:73-83 reads/writes join(appRoot, 'mkdocs.yml') unconditionally. The toolkit's own flagship docs app (apps/oat-docs) is Fumadocs, so the command cannot run against it at all - authored index.md Contents maps are the only navigation source there. Evidence: 2026-07-18 wave-skills-promotion p04-t01 - the phase implementer followed plan guidance to run nav sync after wiring authored navigation and found it MkDocs-only; the Fumadocs-equivalent step is explicit generate-index + build. Suggested fix: either implement a Fumadocs adapter for nav sync (derive meta.json/page tree from authored Contents maps) or make the command detect the framework and fail with actionable guidance; audit bundled skills/docs that recommend 'oat docs nav sync' generically (e.g. docs-pack skills) for framework-conditional wording.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
