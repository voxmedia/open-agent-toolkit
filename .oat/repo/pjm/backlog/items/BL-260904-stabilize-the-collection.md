---
id: BL-260904-stabilize-the-collection
title: Stabilize the collection-detach engine integration test
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - tests
  - flaky
  - sync
  - collections
assignee: null
created: 2026-09-04T03:52:05.890Z
updated: 2026-09-04T03:52:05.890Z
associated_issues: []
external_plans: []
---

## Description

CI on PR #253 (docs-only, rebased on origin/main cf0159893) failed once in packages/cli/src/engine/engine.integration.test.ts > sync engine integration > preserves a same-target user replacement during disablement: collectionResults[0].status was 'partial' instead of 'changed' for action detach-collection. Main's own CI passed on the identical code, the case passed 3/3 locally, and the re-run passed, so the assertion is order- or timing-sensitive in the collection-detach path delivered by PR #255. Reproduce under load or with seeded ordering, then either make the detach status deterministic or make the assertion tolerate the legitimate partial outcome with a documented reason.

## Acceptance Criteria

- The `partial` outcome is reproduced deterministically (under load, with seeded ordering, or by tracing the detach path) and its cause is recorded in the item.
- Either the detach-collection status is made deterministic for a same-target user replacement, or the assertion accepts the legitimate outcome with a comment explaining why both statuses are correct.
- The case passes ten consecutive uncached runs (`HOME=$(mktemp -d) pnpm exec turbo run test --force` or a focused loop) before the item closes.
