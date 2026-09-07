---
id: BL-260906-report-errno-for-asset-root
title: Report errno for asset root stat failures and reset the statRedirects test seam
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - cli
assignee: null
created: 2026-09-06T01:23:56.832Z
updated: 2026-09-06T01:23:56.832Z
associated_issues: []
external_plans: []
---

## Description

Wave 1 p03 review follow-ups: the outer stat catch in resolveAssetsRoot collapses every non-CliError root failure into 'Assets directory not found' (a real EACCES on a complete override root is reported as missing); include the errno as validateBundleStructure now does. Add afterEach(() => statRedirects.clear()) next to the file-global seam in assets.test.ts.

## Acceptance Criteria

- The root-level `stat` catch in `resolveAssetsRoot` reports the errno for non-`ENOENT` failures (for example `EACCES`) instead of "Assets directory not found", with a test that fails if the errno is dropped.
- `assets.test.ts` resets the file-global `statRedirects` seam in an `afterEach` hook.
