---
id: BL-260826-populate-native-subagent
title: Populate native subagent runtime identity from provider transcript metadata
status: closed
priority: high
scope: feature
scope_estimate: M
labels:
  - subagents
  - dispatch
  - provenance
  - codex
  - claude
assignee: null
created: 2026-08-26T05:15:31.163Z
updated: '2026-09-03T00:56:43Z'
associated_issues: []
external_plans: []
---

## Description

Populate the existing optional runtime-observation layer from sanitized,
provider-specific native-agent transcript metadata. Codex rollout session and
turn records can corroborate child lineage, role, model, effort, and service
tier when present; current Claude native-child transcripts also report model,
effort, and service tier, while Cursor remains not-reported. Preserve immutable
configured invocation evidence and every pre-launch policy, ceiling, role,
authority, fork, and fallback control. Source:
[GitHub issue #211](https://github.com/voxmedia/open-agent-toolkit/issues/211).

## Acceptance Criteria

- Codex parsing returns source-qualified child lineage, role, model, effort,
  service tier when present, and the applicable turn without reading
  conversation content.
- Codex correlation covers roots, depth-1 and depth-2 children, fork-free
  launches, and forked histories containing embedded parent records.
- Claude parsing returns source-qualified child model, effort, and service tier
  when present while retaining `not-exposed` for an unselectable native effort
  axis.
- Cursor runtime identity remains explicitly `not-reported`; requested tool
  arguments and materialized-pin acceptance never become runtime observation.
- Dispatch reports preserve immutable configured invocation and record matching,
  missing, and mismatching observations separately. A post-acceptance mismatch
  cannot trigger replacement, fallback, or retry.
- Metadata-only fixtures and a current Codex depth-2 integration check cover the
  parsers without storing prompts or message content.
- Documentation distinguishes harness-applied settings from provider-backend
  attestation and uses provenance values implemented by the production schema.
- Codex materialized roles and all provider policy, ceiling, selection,
  authority, fork, and fallback controls remain unchanged.
