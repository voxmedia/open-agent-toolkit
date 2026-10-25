---
id: BL-261025-keep-files-oat-writes-or
title: Keep files OAT writes or rewrites stable under the repository formatter
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:05.385Z
updated: 2026-10-25T05:31:05.385Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

Files OAT writes or rewrites are not stable under the repository formatter, so consumer repositories that run oxfmt fail their format check after an ordinary OAT command.

- `oat config set` rewrites the whole `.oat/config.json` in its own JSON style (for example expanding unrelated short arrays).
- `oat docs nav sync` writes `meta.json` with one array item per line; `--check` compares by meaning, so it passes, but the formatter rewrites the file.
- `oat decision new` rewrites the whole `decisions/index.md` table unpadded (about 65 lines of churn per record in a consumer repository; this repository saw a 636-line diff for two records until oxfmt restored it).

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- Commands that rewrite tracked files either preserve untouched bytes (minimal diff) or emit the formatter's canonical shape.
- Tests cover a config set, a nav sync and a decision index regeneration followed by a formatter check.
