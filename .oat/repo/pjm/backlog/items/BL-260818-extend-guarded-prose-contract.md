---
id: BL-260818-extend-guarded-prose-contract
title: Extend guarded-prose contract tests to docs-app mirrors
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - testing
  - docs
  - explainer-kit
assignee: null
created: 2026-08-18T00:00:46.965Z
updated: 2026-08-18T00:00:46.965Z
associated_issues: []
external_plans: []
---

## Description

`contracts.test.mjs` forbids the phrase 'complete PublishReceiptV1' in `.agents/skills/explainer-kit/references/extension-contract.md`, but the docs-app page duplicating that prose (`apps/oat-docs/docs/workflows/skills/explainer-kit.md`) had no guard, so the exact forbidden phrase survived there until the explainer-improvements-v2 post-completion docs sync found it. Either extend guarded-prose assertions to docs-app mirrors of skill-reference content, or replace duplicated passages with cross-links so only one guarded copy exists. Related (mechanism differs): BL-260714-executable-backstops covers authoring guidance for executable backstops generally; this item is the concrete docs-mirror coverage gap. Source: explainer-improvements-v2 retro RP-02.

## Acceptance Criteria

- Every skill-reference passage with a guarded-prose contract test either has the same guard applied to its docs-app mirror or the mirror is replaced by a cross-link.
- A regression test proves the guard fires on a docs-app copy of a forbidden phrase (red/green).

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
