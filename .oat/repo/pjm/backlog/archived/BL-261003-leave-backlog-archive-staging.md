---
id: BL-261003-leave-backlog-archive-staging
title: Leave backlog archive staging to callers and report complete result paths
status: closed
priority: medium
scope: bug
scope_estimate: S
labels: []
assignee: null
created: 2026-10-03T19:13:38.485Z
updated: '2026-10-05T03:05:34Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/348
external_plans: []
---

## Description

Source: [GitHub #348](https://github.com/voxmedia/open-agent-toolkit/issues/348).

**Confirmed but narrower than reported.** Archive deliberately uses git mv with unstaged filesystem fallback, and config-and-local-state docs already name git mv. Successful JSON omits staging contract. Disposable git probe shows RM rename: staged rename retains pre-update content, with status/completed edits unstaged; git add old path exits 128. No real partial user commit reproduced.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Make archive staging caller-owned: the archive command changes files without staging and reports every affected source/destination, item, completed ledger, index and rewritten reference path.
- The lifecycle commit step stages the complete operation through the shared exact-path primitive, preserving unrelated staged changes and preventing partial commits after old-path failures.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

packages/cli/src/commands/backlog/archive.ts:180,328,343; archive.test.ts stages tracked item; .oat/repo/pjm/AGENTS.md Backlog Lifecycle. Merged PR #127 established archive behavior.

Related owner: [BL-260927-share-one-hook-safe-exact-path — Share one hook-safe exact-path commit primitive across CLI and skill](../archived/BL-260927-share-one-hook-safe-exact-path.md). Preserve its existing scope and acceptance criteria.
