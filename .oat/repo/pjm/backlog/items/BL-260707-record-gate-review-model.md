---
id: BL-260707-record-gate-review-model
title: 'Record gate review model provenance in artifacts'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [reviews, workflow-gates, provenance]
assignee: null
created: '2026-07-07T05:23:03Z'
updated: '2026-07-07T05:23:03Z'
associated_issues: [BL-260707-ask-to-enable-phase-review]
oat_template: true
oat_template_name: backlog-item
---

## Description

Gate-generated review artifacts should record historical provenance for the model or target that ran the review. Phase review gates and other `oat gate review` runs are dispatched through a configured target, so OAT should be able to include useful provenance in the review artifact without relying on transcript archaeology.

The exact fields may need a little design care because providers differ in what they expose. At minimum, the artifact should identify the gate target and the intended provider/model selection when known; where the actual runtime model can be confirmed, the artifact should capture that distinction clearly.

## Acceptance Criteria

- Review artifacts produced through `oat gate review` include frontmatter provenance identifying that the artifact came from a gate run and which configured gate target executed it.
- The artifact records intended provider/model or tier information when the gate target configuration supplies it.
- If the actual model can be reliably detected from the gate runner, that value is recorded separately from the intended/requested model.
- The provenance field names and docs make unknown or provider-advisory cases explicit rather than implying certainty.
- Existing review artifact parsing and review-receive flows continue to work for artifacts without the new provenance fields.
