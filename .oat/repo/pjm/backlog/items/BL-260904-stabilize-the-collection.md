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
updated: 2026-09-07T01:13:05Z
associated_issues: []
external_plans: []
---

## Description

CI on PR #253 (docs-only, rebased on origin/main cf0159893) failed once in packages/cli/src/engine/engine.integration.test.ts > sync engine integration > preserves a same-target user replacement during disablement: collectionResults[0].status was 'partial' instead of 'changed' for action detach-collection. Main's own CI passed on the identical code, the case passed 3/3 locally, and the re-run passed, so the assertion is order- or timing-sensitive in the collection-detach path delivered by PR #255. Reproduce under load or with seeded ordering, then either make the detach status deterministic or make the assertion tolerate the legitimate partial outcome with a documented reason.

## Confirmed Mechanism and Recovery Evidence

Required CI run `34067919653`, job `101579854352`, reproduced the `partial`
outcome on Ubuntu. Linux reused the deleted symlink inode while the fixture
recreated identical raw link text, so the conservative production identity
guard could not prove that the link was a user replacement.

Recovery commit `ddddba079ef92814aaeb79534ba5eab4a09efe4b` changed only the
fixture. It uses raw link text `../.agents/./skills`, which differs from the
stored `../.agents/skills` while resolving to the same canonical directory.
This makes replacement identity deterministic across macOS and Linux without
weakening the expected `changed` status or changing production behavior.

The focused integration suite and later exact-head CI passed. Keep this item
open until the separate ten-consecutive-uncached-run criterion below is
verified explicitly.

## Acceptance Criteria

- The `partial` outcome is reproduced deterministically (under load, with seeded ordering, or by tracing the detach path) and its cause is recorded in the item.
- Either the detach-collection status is made deterministic for a same-target user replacement, or the assertion accepts the legitimate outcome with a comment explaining why both statuses are correct.
- The case passes ten consecutive uncached runs (`HOME=$(mktemp -d) pnpm exec turbo run test --force` or a focused loop) before the item closes.
