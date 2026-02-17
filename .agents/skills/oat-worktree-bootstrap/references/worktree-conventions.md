# Worktree Conventions

## Root Selection Priority

1. Explicit `--path <root>` argument
2. `OAT_WORKTREES_ROOT` environment variable
3. `.oat/config.json` -> `worktrees.root`
4. Existing local roots (prefer `.worktrees`, then `worktrees`)
5. Existing sibling root (`../<repo>-worktrees`)
6. Fallback default (`../<repo>-worktrees`)

For relative paths, resolve from repository root.

## Safety Rules

- Validate branch names before creation.
- Never create nested worktrees inside tracked source directories.
- For repo-local roots (`.worktrees`, `worktrees`), ensure the root is ignored by git.
- Default base reference for new branches is `origin/main`.
- If `git worktree add` fails, stop and present remediation rather than retrying silently.

## Baseline Readiness

Run baseline commands before reporting ready:

```bash
pnpm run worktree:init
pnpm run cli -- status --scope project
```

If checks fail, stop and report exact remediation.

If baseline tests fail, require explicit user override before proceeding.

## Typical Paths

- Local hidden root: `.worktrees/<branch>`
- Local visible root: `worktrees/<branch>`
- Sibling root: `../<repo>-worktrees/<branch>`
- Global root (explicit): `~/.oat/worktrees/<repo>/<branch>`
