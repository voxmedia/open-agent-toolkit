---
id: BL-261025-narrow-the-oat-docs-check
title: Narrow the oat docs check provenance rule and allow line or pattern exceptions
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:30:48.382Z
updated: 2026-10-25T05:30:48.382Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

The `provenance` rule in `oat docs check` produces many false positives in consumer repositories, and its only remedy is too coarse.

- The home-path pattern `(?:~\/|\/Users\/|\/home\/)` (`packages/cli/src/commands/docs/check/reader-rules.ts`) is unanchored, so it matches relative paths such as `fixture/home/` and a product's own documented install locations (for example `~/.<product>/`), which made up most hits in one repository.
- The `.oat/` and home-path patterns run on every source line, including fenced code examples and legitimate config references such as `.oat/config.json`.
- `documentation.check.exceptions` match a path and rule only (`checker.ts`), so allowing one documented home path turns off `.oat/`, backlog-reference and link-escape detection for the whole file. The message suggests a reason-bearing exception that cannot target one line or one pattern.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- Home-path detection is anchored to path starts (start of line, whitespace, quote or backtick) and does not match relative `…/home/` segments.
- Fenced code and recognized config-file references are either skipped or reported separately from prose planning leaks, as documented.
- Exceptions can narrow to a pattern (for example an allowed home-path prefix) or a line, without suppressing other provenance or link checks in the same file.
- Regression tests at the `checkDocs` boundary cover the false positives above and keep real backlog/planning leaks reported.
