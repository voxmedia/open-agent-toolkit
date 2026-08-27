---
id: BL-260827-clean-up-tool-pack-lifecycle
title: Clean up tool-pack lifecycle and config contracts
status: open
priority: medium
scope: feature
scope_estimate: S
labels:
  - tool-packs
  - config
  - lifecycle
assignee: null
created: 2026-08-27T22:35:47.168Z
updated: 2026-08-27T22:35:47.168Z
associated_issues: []
external_plans: []
---

## Description

Resolve the five remaining reviewed lifecycle and configuration consistency gaps: seed-if-missing digest classification, explicit legacy pack adoption reporting, content drift detection beyond versions, prevention of newly-written legacy-conflict states, and removal of the inert per-pack force option.

## Acceptance Criteria

- Source-backed `seed-if-missing` assets compare installed and bundled content
  digests so unchanged defaults are not mislabeled as retained overrides;
  generated seeds preserve their generation-aware presence/schema contracts.
- Legacy repository scans report the exact pack intents they adopted instead
  of silently promoting every detected project pack.
- Skill and agent inventory detects content drift even when the installed and
  bundled version metadata match.
- `oat config set tools.<pack> false` cannot create the legacy-conflict state
  that OAT otherwise treats as read-only migration input.
- The inert per-pack `--force` option is removed or given a defined, tested
  behavior; focused lifecycle/config tests and the complete release gates pass.
