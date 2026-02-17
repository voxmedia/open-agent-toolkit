# Worktree Conventions

## Root Selection Priority

1. Explicit `--path <root>` argument
2. `OAT_WORKTREES_ROOT` environment variable
3. Existing local roots (prefer `.worktrees`, then `worktrees`)
4. Existing sibling root (`../<repo>-worktrees`)
5. Fallback default (`../<repo>-worktrees`)

## Safety Rules

- Validate branch names before creation.
- Never create nested worktrees inside tracked source directories.
- For repo-local roots (`.worktrees`, `worktrees`), ensure the root is ignored by git.

## Baseline Readiness

Run baseline commands before reporting ready:

```bash
pnpm run worktree:init
pnpm run cli -- status --scope project
```

If checks fail, stop and report exact remediation.

## Typical Paths

- Local hidden root: `.worktrees/<branch>`
- Local visible root: `worktrees/<branch>`
- Sibling root: `../<repo>-worktrees/<branch>`
- Global root (explicit): `~/.oat/worktrees/<repo>/<branch>`
