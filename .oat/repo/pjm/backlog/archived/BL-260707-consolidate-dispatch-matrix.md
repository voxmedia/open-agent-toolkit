---
id: BL-260707-consolidate-dispatch-matrix
title: 'Consolidate dispatch matrix normalization and traversal'
status: closed # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [dispatch-matrix, maintainability, review-followup]
assignee: null
created: '2026-07-07T21:16:23Z'
updated: '2026-07-11T03:25:42Z'
associated_issues: []
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

## Completion Evidence

- `97dcab1a` introduced the canonical normalizer and cell-ref walker;
  `86900b29` and `b615abd0` adopted shared normalization in layered config and
  project-state parsing.
- `ec189c6c` and `6fe49d1c` moved config adoption and doctor traversal to the
  shared refs; `2d789a92` preserved direct-target compatibility.
- Bare values, tier maps, ordered candidate routes, malformed siblings, sparse
  overrides, and candidate indices are covered by dispatch-matrix,
  oat-config, resolve, resolver, config, and doctor tests.
- The GPT-5.6 candidate-ladder work was the planned trigger and exercised the
  shared helpers across all consuming command paths.
- Phase p05 focused verification passed 724/724 tests, and full repository and
  release validation passed for version `0.1.49`.
