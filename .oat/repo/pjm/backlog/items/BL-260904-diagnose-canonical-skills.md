---
id: BL-260904-diagnose-canonical-skills
title: Diagnose canonical skills missing from a provider view at resolution time
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - provider-sync
  - skills
  - diagnostics
  - cli
assignee: null
created: 2026-09-04T21:32:37.762Z
updated: 2026-09-04T21:32:37Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/203
external_plans: []
---

## Description

GitHub issue #203: a canonical skill can exist in the installed toolkit while a repository's generated provider view omits it, so invocation looks unsupported until an operator searches the canonical source. PR #249 and PR #255 delivered the status half: oat status names missing and outdated pack assets per scope with a recovery command and reports provider drift with refresh advice. Still missing is a resolution-time diagnostic that names the missing or stale skill and its canonical version, says which provider view is stale and whether the drift is additive, modified, or removed, distinguishes missing distribution from an unknown skill, and suggests the narrowest safe oat sync --scope command without mutating views. Reuse the existing drift detector; status stays read-only and sync stays explicit.

## Acceptance Criteria

- A canonical skill missing from a provider view is diagnosed by name and canonical version at skill-resolution time, naming the stale provider view and classifying the drift as additive, modified, or removed.
- The diagnostic distinguishes missing distribution from an unknown skill.
- The suggested repair is the narrowest safe `oat sync --scope ...` command; resolution and status stay read-only and never read a stale provider copy silently.
- A post-sync check proves the provider view matches the canonical skill version.
- Focused tests cover missing, modified, removed, and unknown-skill cases across project and user scope.
