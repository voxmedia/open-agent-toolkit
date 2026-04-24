---
id: bl-cbdd
title: 'Optional Codex prompt-wrapper generation for synced OAT skills'
status: closed
priority: medium
priority_reviewed: '2026-04-24'
scope: feature
scope_estimate: M
labels: ['tooling', 'codex']
assignee: null
created: '2026-02-14T00:00:00Z'
updated: '2026-04-24T00:00:00Z'
closed: '2026-04-24T00:00:00Z'
closed_reason: wont_do
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

## Closure Note (2026-04-24)

Closed as won't-do. Codex has deprecated `.codex/prompts/` as a first-class invocation path for agent packs, so shipping opt-in prompt wrappers targeting that directory is no longer a forward-compatible approach. If a replacement Codex surface emerges that warrants OAT skill wrappers, that would be captured as a new item with fresh assumptions rather than reviving this one.
