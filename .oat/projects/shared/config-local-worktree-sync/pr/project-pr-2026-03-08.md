---
oat_generated: true
oat_generated_at: 2026-03-08
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/config-local-worktree-sync
---

# feat: configurable local paths + worktree sync

## Summary

Adds a `localPaths` config key and full `oat local` CLI command group for managing gitignored directories that need to be synced between the main repo and worktrees. Also migrates active idea tracking from legacy pointer files to config-based resolution (`activeIdea` in `config.local.json` / `~/.oat/config.json`), with a hard cutover across all 4 idea skills. Worktree bootstrap skills are updated to automatically propagate config and sync local paths on worktree creation.

## What Shipped

### `oat local` command group (new)
- **`oat local add/remove`** — manage `localPaths` in `.oat/config.json` with path validation (rejects absolute, parent-relative, empty paths)
- **`oat local apply`** — write a managed `.gitignore` section with marker comments for configured paths (supports raw glob patterns)
- **`oat local sync <path>`** — bulk copy `localPaths` to/from worktrees with glob expansion, `--from`/`--force` flags
- **`oat local status`** — drift detection with glob-aware gitignore matching

### Config-based active idea (migration)
- `activeIdea` key in `OatLocalConfig` (repo) and `UserConfig` (`~/.oat/config.json`)
- Resolution: repo config > user config precedence
- All 4 idea skills (`oat-idea-new`, `oat-idea-ideate`, `oat-idea-summarize`, `oat-idea-scratchpad`) migrated from `.oat/active-idea` pointer files
- Legacy pointer file references removed

### Worktree bootstrap integration
- Manual bootstrap skill (`oat-worktree-bootstrap`) updated: copies config, runs `oat local sync`
- Autonomous bootstrap script (`oat-worktree-bootstrap-auto`) updated: propagates `config.local.json`, runs `oat local sync`
- Legacy `.oat/active-idea` removed from copy loop

## Verification

- 830 tests pass (108 test files), 26 new tests added
- Lint: clean (Biome, 271 files)
- Type-check: clean
- Grep: no residual `active-idea` pointer file references in skills or gitignore

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| plan | artifact | passed | 2026-03-08 | reviews/artifact-plan-review-2026-03-08.md |
| final | code | passed | 2026-03-08 | reviews/final-review-2026-03-08-v3.md |

3 review cycles: v1 found 5 findings (C1 path traversal, I1 stale bookkeeping, I2 glob expansion, M1 apply default, m1 unused import) — all resolved. v2 found 1 finding (I1 false drift warnings) — resolved. v3 passed clean.

## References

- [Plan](https://github.com/tkstang/open-agent-toolkit/blob/config-local-worktree-sync/.oat/projects/shared/config-local-worktree-sync/plan.md)
- [Implementation](https://github.com/tkstang/open-agent-toolkit/blob/config-local-worktree-sync/.oat/projects/shared/config-local-worktree-sync/implementation.md)
- [Imported Source](https://github.com/tkstang/open-agent-toolkit/blob/config-local-worktree-sync/.oat/projects/shared/config-local-worktree-sync/references/imported-plan.md)
- [Reviews](https://github.com/tkstang/open-agent-toolkit/tree/config-local-worktree-sync/.oat/projects/shared/config-local-worktree-sync/reviews)
