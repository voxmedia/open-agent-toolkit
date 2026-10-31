---
id: BL-261030-preflight-knowledge-index
title: Preflight knowledge-index mapper dispatch before replacing generated knowledge
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - dispatch
  - skills
assignee: null
created: 2026-10-30T22:27:34.886Z
updated: '2026-10-31T12:08:25Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/355
external_plans: []
---

## Description

oat-repo-knowledge-index removes owned generated outputs (Step 2) and writes the thin index (Step 4) before its first mapper launch (Step 4b), which is hard-coded to Claude launch arguments; a worker that never launched is read as read-only mode, and Step 6b hard-codes a maintainer-specific temp path. On a host that cannot launch the mapper role, prior generated knowledge is lost and only a thin index remains. Source: GitHub #355; triage record .oat/repo/pjm/triage/2026-10-30-untriaged-issues.md.

## Acceptance Criteria

- A host with no compatible mapper launch route leaves existing generated and manual knowledge unchanged.
- Capability or authorization failure is reported before ownership cleanup, thin-index creation, or background write probes.
- A worker that did not launch is classified as an unavailable route, not as read-only write permission; the read-only fallback requires an independently usable dispatch route.
- Claude-specific launch arguments (`oat-codebase-mapper`, `haiku`, background, `Explore`) live only in a labelled Claude route, or the workflow is explicitly gated to that route. Routing through `oat-dispatch-subagents` versus Claude-only gating is a planning decision.
- The hard-coded maintainer-specific temp path in Step 6b is removed.
- Supported mapper routes keep declared output ownership and correct template and frontmatter behavior; portable role text is not described as a registered native role.
- The skill's `metadata.version` and the lockstep package versions are bumped, and the shared skill contract tests pass.
