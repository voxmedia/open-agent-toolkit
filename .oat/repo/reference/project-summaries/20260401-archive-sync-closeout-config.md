---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-31
oat_generated: true
oat_summary_last_task: p04-t07
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: archive-sync-closeout-config

## Overview

This project added a more durable closeout path for OAT projects without changing the default local-only archive workflow. The goal was to let teams keep archived projects and project summaries available across machines and collaborators, while also making OAT configuration easier to discover from both the CLI and the docs.

## What Was Implemented

The shared OAT config model now supports three archive settings in `.oat/config.json`: `archive.s3Uri`, `archive.s3SyncOnComplete`, and `archive.summaryExportPath`. The `oat config` command surface was extended to read, write, and describe those settings, and `git.defaultBranch` was wired into the same supported-key path so the config catalog reflects real command behavior rather than just documentation.

Archive handling moved into a CLI-owned helper layer. That helper now owns repo-scoped S3 archive URI construction, local archived-project path resolution, AWS CLI preflight checks, completion-time archive behavior, dated snapshot naming for S3 and exported summaries, and the split between warning-tolerant completion flows and fail-fast explicit archive sync commands.

OAT now has a public `oat project archive sync [project-name]` command. Remote archive snapshots are stored as dated flat names like `YYYYMMDD-project-name`. With no argument, sync selects the latest dated remote snapshot for each project and materializes it into `.oat/projects/archived/<project>/`; with a positional project name it does the same for one project. The command supports `--dry-run`, supports `--force` for named-project replacement, skips work when the local archive already came from the latest remote snapshot, and surfaces clear errors when AWS CLI is missing or unusable.

Closeout behavior also changed. `oat-project-complete` still archives locally first, but can now upload a dated S3 snapshot and export a dated copy of `summary.md` to a durable tracked directory when configured. `oat-project-pr-final` and `oat-project-complete` both now auto-refresh `summary.md` when it is missing or stale rather than relying on a prompt-driven step.

Config discoverability was improved in both code and docs. `oat config describe` now exposes a grouped catalog covering shared repo, repo-local, user, and sync/provider config surfaces, including wildcard provider keys. The project also updated the CLI/reference docs and added a dedicated configuration guide so the config model is easier to understand from the top-level docs surfaces instead of only from deep reference pages.

## Key Decisions

- Use the AWS CLI instead of adding AWS SDK dependencies so archive sync could reuse a familiar external tool and stay lightweight inside the CLI package.
- Keep the remote archive layout repo-scoped while storing dated snapshots as `<archive.s3Uri>/<repo-slug>/YYYYMMDD-<project-name>`, which keeps archive history readable without nesting by project name.
- Use a positional `project-name` for `oat project archive sync [project-name]` to match existing OAT command conventions for target entities.
- Treat S3 and exported summaries as immutable dated snapshots, while keeping the local archive as a latest-only bare project cache for day-to-day reference.
- Treat `oat config describe` as the canonical discovery surface for config ownership while leaving mutation ownership split between `oat config set` and specialized commands such as `oat providers set`.
- Keep completion warning-tolerant for remote archive failures, but make explicit archive sync commands fail fast so closeout remains durable locally while direct sync operations stay strict.

## Notable Challenges

The project crossed CLI behavior, skill contracts, and documentation, so the implementation had to keep those surfaces aligned rather than treating them as separate follow-up work. One concrete example was the docs/help phase surfacing an overly narrow archive helper type during `pnpm build:docs`, which required a small compile-time fix in the helper layer before the docs verification could pass cleanly.

The final review also exposed several public-contract gaps that were worth fixing immediately: missing guard-path tests, missing JSON-mode tests, duplicated helper types, and a wildcard config-catalog regression gap. Those findings turned into a dedicated Phase 4 review-fix pass, which hardened the public archive/config surfaces without changing the feature scope.

## Tradeoffs Made

- Archive sync defaults to non-destructive reconciliation rather than making remote authoritative. That preserves unrelated local-only archive data, but it also means stale local extras are not cleaned up automatically.
- `--force` is limited to named-project syncs, which keeps the command safer and narrower at the cost of not offering a one-shot “replace every local archive from S3” mode.
- Summary export is opt-in through `archive.summaryExportPath` rather than being inferred from directory existence. That reduces surprising behavior, but it requires explicit setup even in repos that already have a likely destination directory.
- Exported summaries and S3 uploads now use dated snapshot names for readability and collision avoidance, while local archive sync materializes the latest remote snapshot into the bare project-name directory.

## Integration Notes

- Shared archive settings live in `.oat/config.json` and are available through `oat config get`, `oat config set`, `oat config list`, and `oat config describe`.
- Provider sync settings remain owned by `.oat/sync/config.json` and `oat providers set`, but they are now also visible through `oat config describe`.
- Completion-time archive behavior is now CLI-owned rather than skill-local, so future changes to archive/S3 behavior should start in `packages/cli/src/commands/project/archive/archive-utils.ts`.
- Documentation sync for this project was completed after implementation, and the project state now records `oat_docs_updated: complete`.

## Follow-up Items

- Deferred review finding `m4`: `resolveUniqueArchivePath` still has a theoretical timestamp-collision edge case if two archive completions collide twice on the same derived suffix. The finding was intentionally deferred because the failure mode is unlikely and did not justify expanding the scope of this project.
