---
id: bl-4f60
title: 'Update AGENTS.md with documentation surface info during `oat docs init`'
status: closed
priority: high
scope: feature
scope_estimate: M
labels: ['docs', 'agents']
assignee: null
created: '2026-03-08T00:00:00Z'
updated: '2026-03-10T00:00:00Z'
associated_issues: []
---

## Description

Delivered managed AGENTS.md documentation-surface updates during `oat docs init` using a shared section-upsert helper.

Key outcomes:

- Added `upsertAgentsMdSection()` for managed HTML-comment-delimited AGENTS.md sections.
- Wired `oat docs init` to record docs root, framework, and key file paths after scaffold.
- Added shared utility coverage and docs-init integration tests.

Links:

- Shared utility: `packages/cli/src/commands/shared/agents-md.ts`
- Docs init: `packages/cli/src/commands/docs/init/index.ts`
- Tests: `packages/cli/src/commands/shared/agents-md.test.ts`, `packages/cli/src/commands/docs/init/index.test.ts`

## Acceptance Criteria

- Added idempotent AGENTS.md managed-section upsert support.
- `oat docs init` writes documentation-surface metadata after scaffold.
- Added shared utility and docs-init test coverage.
