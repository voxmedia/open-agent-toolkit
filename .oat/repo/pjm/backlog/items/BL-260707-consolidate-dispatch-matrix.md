---
id: BL-260707-consolidate-dispatch-matrix
title: 'Consolidate dispatch matrix normalization and traversal'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [dispatch-matrix, maintainability, review-followup]
assignee: null
created: '2026-07-07T21:16:23Z'
updated: '2026-07-07T21:16:23Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

Final review for `multi-family-dispatch` accepted deferring a Medium maintenance
risk: dispatch matrix normalization and cell traversal are duplicated across
config normalization, project-state parsing, `oat config adopt`, and the doctor
dispatch-matrix check. Behavior is currently consistent and covered by tests,
but the next cell-shape change could drift if these paths are updated
independently.

## Acceptance Criteria

- Extract one shared dispatch matrix normalizer consumed by config
  normalization and project-state parsing.
- Extract one shared dispatch matrix cell-ref walker consumed by config adopt
  and the doctor check.
- Preserve current behavior for bare provider values, tier maps, ordered route
  cells, malformed cells, and sparse project overrides.
- Cover the shared helpers and consuming command paths with the existing
  dispatch matrix resolver/config/doctor test surface.
- Use the next matrix cell-shape change, such as GPT 5.6 axis-shape work, as
  the trigger to prioritize this item if it is still open.
