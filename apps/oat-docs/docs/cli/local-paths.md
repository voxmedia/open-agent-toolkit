---
title: Local Path Management
description: 'Managing gitignored local directories synced between main repo and worktrees via oat local.'
---

# Local Path Management

The `oat local` command group manages **local-only paths** — directories that are gitignored but need to be copied between the main repo and worktrees.

Common use cases:

- `.oat/ideas/` — project-level idea brainstorming (gitignored)
- `.oat/projects/**/reviews` — review artifacts scoped to specific projects
- Any directory that should persist locally but not be committed

## Config

Local paths are declared in `.oat/config.json` under the `localPaths` key:

```json
{
  "version": 1,
  "localPaths": [".oat/ideas", ".oat/projects/**/reviews"]
}
```

Entries support glob patterns (`*`, `**`, `?`, `[`). Glob patterns are expanded at runtime by `sync` and `status`; `apply` writes them as-is to `.gitignore` (which handles globs natively).

Path validation rejects absolute paths, parent-relative paths (`../`), and empty strings.

## Commands

### `oat local status`

List configured `localPaths` with existence and `.gitignore` membership status.

```text
oat local status [--json]
```

For each path (glob-expanded), reports:

- **exists** — whether the directory exists on disk
- **gitignored** — whether the path is covered by a `.gitignore` entry

Drift detection: if a path exists but is not gitignored, status flags it so you can run `oat local apply` to fix.

### `oat local apply`

Write a managed section in `.gitignore` for all configured `localPaths`.

```text
oat local apply [--dry-run] [--json]
```

Manages a fenced section in `.gitignore` between marker comments:

```text
# OAT local paths
.oat/ideas/
.oat/projects/**/reviews/
# END OAT local paths
```

- Creates `.gitignore` if it doesn't exist
- Replaces existing managed section on re-run
- Removes managed section when `localPaths` is empty
- `--dry-run` shows what would change without writing

### `oat local sync`

Copy `localPaths` between the main repo and a worktree.

```text
oat local sync <worktree-path> [--from] [--force] [--json]
```

| Option    | Description                             |
| --------- | --------------------------------------- |
| (default) | Copy from main repo **to** the worktree |
| `--from`  | Copy **from** the worktree back to main |
| `--force` | Overwrite existing paths at destination |

Glob patterns in `localPaths` are expanded against the source root before copying. Each expanded path is copied recursively.

Reports per-path status: `copied`, `skipped` (exists without `--force`), or `missing` (source doesn't exist / glob matches nothing).

### `oat local add`

Add paths to the `localPaths` config.

```text
oat local add <paths...> [--json]
```

- Deduplicates and sorts entries
- Validates paths (rejects absolute, parent-relative, empty)
- Reports which paths were added, already present, or rejected

### `oat local remove`

Remove paths from the `localPaths` config.

```text
oat local remove <paths...> [--json]
```

- Reports which paths were removed and which were not found

## Worktree Integration

The worktree bootstrap skills (`oat-worktree-bootstrap`, `oat-worktree-bootstrap-auto`) automatically run `oat local sync` after creating a new worktree. This copies all configured `localPaths` from the main repo into the new worktree so that gitignored working state (ideas, reviews, etc.) is available immediately.

The autonomous bootstrap script also copies `.oat/config.local.json` to propagate active project context.
