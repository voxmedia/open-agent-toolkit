# Git Hooks

Repository git hooks for code quality and consistency.

## What They Do

- `pre-commit` - runs `lint-staged`
- `commit-msg` - validates commit messages with `commitlint`
- `pre-push` - runs public package version-bump validation, canonical skill version-bump validation, plus `type-check`, `lint`, and `format`
- `post-checkout` - runs `pnpm install` when lockfile-sensitive branch switches happen

## Default Behavior

Hooks are installed automatically on `pnpm install`.

- setup is silent when hooks are already configured
- set `GIT_HOOKS=0` to skip installation in CI, Docker, or one-off local runs
- intentionally disabled hooks stay disabled until you re-enable them

## Common Commands

```bash
pnpm hooks:status
pnpm hooks:enable-all
pnpm hooks:disable-all
pnpm hooks enable pre-commit
pnpm hooks disable pre-push
```

## Temporarily Skip Hook Setup

```bash
GIT_HOOKS=0 pnpm install
```

## Notes

- Hooks are installed as managed wrapper scripts in Git's active hooks directory
- The wrappers dispatch to the current checkout's `tools/git-hooks/` scripts, so they work correctly from git worktrees
- Disabled hooks are tracked in Git's active hooks directory via `.disabled-hooks`
- Git `core.hooksPath` is unset so hooks run from Git's default hooks directory
