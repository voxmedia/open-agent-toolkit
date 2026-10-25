---
id: BL-261025-correct-oat-docs-generate
title: Correct oat docs generate-index counts, header wording and drift guidance
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:02.051Z
updated: 2026-10-25T05:31:02.051Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`oat docs generate-index` output misleads in three ways.

- "Generated index with N entries" (`packages/cli/src/commands/docs/index-generate/index.ts`) counts top-level items; a manifest with 63 page links reported 3.
- The header "Fresh Fumadocs apps regenerate this manifest in predev/prebuild." is emitted for every Fumadocs app, including long-standing ones, and the header line changes depending on whether the root config is found.
- Moving to 0.3.32 changes manifests beyond the documented link prefix: ordering follows Contents instead of alphabetical, group labels use child index titles, and the banner is new. oat-docs-analyze (Step 6, generated-manifest comparison) mentions only the link prefix, so analysts report expected regeneration as content drift.

Output-relative links that defeat `/tmp` freshness diffs are tracked in BL-261025-add-a-check-or-stdout-mode.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- The success message counts page links (or names both counts).
- Header wording is accurate for existing apps and does not depend on config discovery.
- oat-docs-analyze describes the full 0.3.32 manifest change set so it is not reported as drift.
