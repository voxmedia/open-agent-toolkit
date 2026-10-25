---
id: BL-261025-define-and-validate-the-base
title: Define and validate the base of documentation.ia track paths
status: wont_do
priority: low
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:06.044Z
updated: '2026-10-25T13:59:23Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

The base of `documentation.ia.tracks[].path` is undefined. The validator rejects only absolute, URL and `..` paths, nothing reads `tracks`, preset scaffolds write content-root-relative names, and the configuration reference documents only `decision` as repository-relative. Adopters cannot tell which base to use.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- The configuration reference states that track paths are content-root-relative (matching preset scaffolds), and validation rejects values that do not resolve under the content root.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-make-oat-docs-generators — Make OAT docs generators and writers predictable](../items/BL-261025-make-oat-docs-generators.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
