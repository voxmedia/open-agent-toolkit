---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-08
oat_generated: false
---

# Discovery: complete-workflow

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Bundle the project close-out workflow to reduce ceremony. Three related improvements on the `complete-workflow` branch:

1. **project-document should auto-invoke pjm update repo reference** — when PJM infrastructure is present, `project document` should run `pjm update repo reference` automatically before scanning documentation surfaces. _(Already implemented in commits 1-2.)_

2. **S3 archive sync should exclude process artifacts** — reviews and PR descriptions (`reviews/*`, `pr/*`) should not be uploaded to S3 during archive sync. _(Already implemented in commit 2.)_

3. **Track installed tool packs in `.oat/config.json`** — the project-document skill's PJM detection currently checks for `.oat/repo/reference/` directory existence, but that directory can contain non-PJM artifacts. A stronger signal is to record which tool packs are installed in config and check `tools.project-management` instead.

This discovery covers item 3 only (items 1-2 are done).

## Key Decisions

1. **Config location:** Store in shared repo config (`.oat/config.json`) under a `tools` key, not local config — tool pack presence is repo-wide, not checkout-specific.
2. **Shape:** `tools: { "project-management": true, ... }` — a partial record of `PackName → boolean`. Only packs that have been installed are present; absence means "not tracked" (for backwards compat with repos that existed before this feature).
3. **Write triggers:** Set on `oat tools install` (init tools) and `oat tools update` (catches existing users). Clear on `oat tools remove --pack`.
4. **Read via CLI:** `oat config get tools.project-management` returns `'true'` or `'false'`, matching the existing boolean config pattern (e.g., `archive.s3SyncOnComplete`).
5. **Skill consumer:** `oat-project-document` Step 1 checks config instead of directory existence.

## Constraints

- Must follow existing config patterns: `OatConfig` interface, `normalizeOatConfig()`, `ConfigKey` type, `CONFIG_CATALOG`, `getConfigValue()`, `setConfigValue()`.
- `oat tools update --all` should reconcile `tools` config for existing repos that installed packs before this config existed (scan what's installed → set config).
- All 7 pack names must be representable: `core`, `ideas`, `docs`, `workflows`, `utility`, `project-management`, `research`.
- Existing tests must continue passing; new tests for new behavior.
- Publishable package change: requires version bumps and `pnpm release:validate` pass.

## Success Criteria

- `oat tools install` writes `tools.<pack>: true` for each installed pack.
- `oat tools update --all` reconciles `tools` config from filesystem scan.
- `oat tools remove --pack <pack>` sets `tools.<pack>: false`.
- `oat config get tools.project-management` returns `true`/`false`.
- `oat config set tools.<pack> <true|false>` works.
- `oat-project-document` Step 1 checks config instead of directory existence.
- All existing tests pass; new tests cover the config lifecycle.

## Out of Scope

- User-scope tool tracking (only project/repo scope).
- Retroactive migration of existing repos (update --all handles this on next run).
- UI changes beyond config get/set output.
