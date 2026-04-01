---
id: bl-ea64
title: 'Optional S3 archival in oat-project-complete workflow'
status: closed
priority: medium
scope: feature
scope_estimate: L
labels: ['tooling', 'archive']
assignee: null
created: '2026-03-08T00:00:00Z'
updated: '2026-03-31T00:00:00Z'
associated_issues: []
---

## Description

Delivered optional S3-backed archive sync as part of the `archive-sync-closeout-config` project.

Key outcomes:

- Added shared archive settings in `.oat/config.json`: `archive.s3Uri`, `archive.s3SyncOnComplete`, and `archive.summaryExportPath`.
- `oat-project-complete` still archives locally, but can now upload the archived project to a repo-scoped S3 path and export `summary.md` into a durable tracked directory.
- Added `oat project archive sync [project-name]` so archived projects can be synced back down from S3 into `.oat/projects/archived/`.
- Added warning/failure shaping around AWS CLI detection and access so completion remains local-first while explicit sync commands fail fast.

Links:

- Project: `.oat/projects/shared/archive-sync-closeout-config/`
- Summary: `.oat/projects/shared/archive-sync-closeout-config/summary.md`
- Commands: `packages/cli/src/commands/project/archive/`

## Acceptance Criteria

- Shared archive config exists for S3 archive base URI, completion-time S3 enablement, and optional summary export path.
- Completing a project always archives locally and can also sync to S3 when configured.
- Explicit archive sync is available for all archived projects or one named archived project.
- Missing or unusable AWS CLI configuration produces clear warnings during completion and clear errors during explicit sync.
