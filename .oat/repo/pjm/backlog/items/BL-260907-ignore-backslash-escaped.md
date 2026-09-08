---
id: BL-260907-ignore-backslash-escaped
title: Ignore backslash-escaped emphasis in skill-script reference extraction
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - cli
  - skills
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:40.256Z
updated: 2026-09-07T14:05:40.256Z
associated_issues: []
external_plans: []
---

## Description

The skill-script-reference extractor from wave-5 p06 (packages/cli/src/commands/init/tools/shared/skill-script-references.ts) treats an escaped underscore (`\_.oat/scripts/x.sh\_`) as opening emphasis, so the extracted token keeps a trailing backslash and reports a false positive (zero live instances today; review round 2 m1). Return null from `readOpeningEmphasis` when the run is preceded by a backslash, with a fixture.

## Acceptance Criteria

- [ ] `readOpeningEmphasis` returns null for a backslash-preceded emphasis run and the extracted reference has no trailing backslash
- [ ] A fixture with the escaped form passes the contract test with zero violations
