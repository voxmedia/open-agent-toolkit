---
id: BL-261025-report-accurate-lines-for-oat
title: Report accurate lines for oat docs check structural and separator findings
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:00.729Z
updated: 2026-10-25T05:31:00.729Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

Several `oat docs check` findings point at the wrong place or none.

- `contents-separator` keeps only the last location per separator style (`separators.set(entry.separator, …)` in `packages/cli/src/commands/docs/check/reader-rules.ts`), so it flags a consistent page and misses others that use the minority separator.
- Structural findings (`contents-width`, `root-width`, `overview`, `directory-index`, unlisted `navigation`) have no `line`, although most could point at the `## Contents` heading or the entry.
- Text output sends findings to stderr and only the summary to stdout, so piping the check shows just the summary.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- `contents-separator` reports every entry (or the first per file) that uses a minority separator, with its physical line.
- Structural findings carry a `line` where a heading or entry exists, without changing the G5 JSON keys.
- The text-output stream split is either documented or changed so piped output includes findings.
