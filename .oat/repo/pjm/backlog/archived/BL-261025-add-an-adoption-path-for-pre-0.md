---
id: BL-261025-add-an-adoption-path-for-pre-0
title: Add an adoption path for pre-0.3.31 Fumadocs apps whose guidance assumes
  nav sync
status: wont_do
priority: high
scope: task
scope_estimate: M
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T00:22:30.905Z
updated: '2026-10-25T13:59:23Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

0.3.31 treats an unset documentation.navOwner as undeclared and offers no migration prompt, even when the app's AGENTS guidance (scaffolded before 0.3.31) says meta.json comes from nav sync and oat docs nav sync --check proves the committed meta.json files are generated. Such apps lose automatic regeneration expectations until someone hand-records navOwner. Provide an evidence-backed adoption path (for example analyze or bootstrap proposing navOwner: nav-sync, with approval) without changing undeclared semantics for apps that lack that evidence.

Found while piloting the OAT docs tooling 0.3.31 rollout on a pilot consumer repository; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- For a Fumadocs app with undeclared `documentation.navOwner`, analyze or bootstrap detects evidence that navigation is generated (guidance that says so and a passing `oat docs nav sync --check`) and proposes recording `navOwner: nav-sync` as an explicit-approval recommendation.
- Undeclared semantics stay unchanged for apps without that evidence; nothing regenerates navigation without approval.
- Docs describe the upgrade path for apps scaffolded before 0.3.31.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
