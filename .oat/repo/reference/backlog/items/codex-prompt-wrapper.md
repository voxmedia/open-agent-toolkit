---
id: bl-cbdd
title: 'Optional Codex prompt-wrapper generation for synced OAT skills'
status: open
priority: medium
scope: feature
scope_estimate: M
labels: ['tooling', 'codex']
assignee: null
created: '2026-02-14T00:00:00Z'
updated: '2026-02-14T00:00:00Z'
associated_issues: []
---

## Description

Codex users may want thin `.codex/prompts` wrappers for synced `oat-*` skills, but the wrappers should remain optional and must not duplicate workflow logic that already lives in the skills themselves.

Proposed change:

- Add opt-in generation of minimal `.codex/prompts` wrappers for `oat-*` skills when users sync skills to Codex.
- Keep the wrappers as aliases only so the skill files remain the single source of truth.
- Make the feature optional so repositories that do not want Codex-specific files are unaffected.

Links:

- Related backlog area: invocation compatibility standardization

## Acceptance Criteria

- Users can opt into generating thin `.codex/prompts` wrappers during Codex sync.
- Generated wrappers stay minimal and do not duplicate workflow logic.
- Repositories that do not enable the feature do not receive Codex-specific files.
