---
id: bl-ea64
title: 'Optional S3 archival in oat-project-complete workflow'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['tooling', 'archive']
assignee: null
created: '2026-03-08T00:00:00Z'
updated: '2026-03-08T00:00:00Z'
associated_issues: []
---

## Description

Completed projects currently archive only to `.oat/projects/archived/` on the local filesystem. Teams that want durable off-repo storage or a centralized project history across repositories do not have a built-in cloud archival path.

Proposed change:

- Add optional S3 bucket configuration to `.oat/config.json`, including bucket and prefix settings.
- During `oat-project-complete`, upload the archived project directory to S3 when configuration and AWS credentials are available.
- Detect AWS credentials through the standard AWS SDK credential chain.
- Preserve the project directory structure under a configurable S3 prefix.
- Warn on missing credentials or upload failure without blocking the local archive path.
- Add a `--skip-s3` flag so users can bypass S3 upload for an individual completion.

Links:

- Related skill: `.agents/skills/oat-project-complete/SKILL.md`
- Config: `.oat/config.json`

## Acceptance Criteria

- Users can configure an S3 bucket in `.oat/config.json` and completed projects upload automatically.
- Local archive always succeeds regardless of S3 status.
- S3 upload failure produces a clear warning rather than a hard error.
- Credentials are detected through the standard AWS SDK credential chain without custom auth config.
- A `--skip-s3` flag allows bypassing S3 upload for individual completions.
