---
id: BL-260908-validate-the-catalog-refresh
title: Validate the catalog-refresh policy state in normalizeSyncEvidence
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - cli
  - tools
  - wave-6-followup
assignee: null
created: 2026-09-08T05:07:58.933Z
updated: 2026-09-08T05:07:58.933Z
associated_issues: []
external_plans: []
---

## Description

Wave-6 p01's `visibilityFor` uses an exhaustive switch with a `never` default that now throws on an unrecognized catalog-refresh policy state, and that state is reachable from payload data: `normalizeSyncEvidence` (`commands/tools/shared/sync-evidence.ts`) shape-checks `providerRefreshAdvice[].visibility.policy` and casts it, and the advice policy outranks `capability.catalogRefresh` in the lifecycle projection, so a malformed advice payload would throw inside an already-succeeded `install`/`update`/`remove` — contradicting the module's promise never to throw there. Latent while sync is in-process (producer and consumer share a build). p01 round-2 review Medium.

## Acceptance Criteria

- [ ] `normalizeSyncEvidence` validates the policy state against the known set and drops or marks unknown states instead of casting
- [ ] The `never` switch stays compile-time-only (a control proves an unknown state in advice never throws inside a lifecycle command)
