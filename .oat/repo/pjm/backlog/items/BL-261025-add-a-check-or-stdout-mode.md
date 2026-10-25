---
id: BL-261025-add-a-check-or-stdout-mode
title: Add a check or stdout mode to oat docs generate-index
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T00:22:27.208Z
updated: 2026-10-25T00:22:27.208Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

oat docs generate-index can only write its output file. Freshness checks therefore regenerate the committed manifest and diff it (the repository's own gate runs generate-index then git diff --exit-code), which dirties the working tree and cannot run read-only, for example inside oat-docs-analyze. Add a --check mode (exit 1 and name the output when it would change, writing nothing) or a stdout mode, mirroring oat docs nav sync --check.

Found while piloting the OAT docs tooling 0.3.31 rollout on a pilot consumer repository; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- `oat docs generate-index` offers a mode that compares the would-be output with the existing file and writes nothing, exiting 1 and naming the output when it is stale (or prints the manifest to stdout for external comparison).
- The repository gate and docs (`AGENTS.md` step 9, docs-tooling commands page) use the new mode where it replaces regenerate-and-diff.
- oat-docs-analyze can check manifest freshness without writing.
