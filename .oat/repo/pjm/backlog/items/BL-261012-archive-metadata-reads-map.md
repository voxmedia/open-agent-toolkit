---
id: BL-261012-archive-metadata-reads-map
title: Archive metadata reads map EACCES to a missing file
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - artifact-cleanup
assignee: null
created: 2026-10-12T16:35:10.119Z
updated: 2026-10-12T16:35:10.119Z
associated_issues: []
external_plans: []
---

## Description

Out-of-lane note from the artifact-cleanup complexity review (2026-10-12): readArchiveMetadataAt in packages/cli/src/commands/project/archive/archive-utils.ts maps every read error, EACCES included, to null, so a permission failure on .oat-archive-source.json is indistinguishable from an absent marker and reads as 'changed after evaluation'. Distinguish ENOENT from other errno values and surface the rest as an operational refusal.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
