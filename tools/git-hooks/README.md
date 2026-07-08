# Git Hooks

Repository git hooks for code quality and consistency.

## What They Do

- `pre-commit` - runs `lint-staged`
- `commit-msg` - validates commit messages with `commitlint`
- `pre-push` - runs public package version-bump validation, canonical skill version-bump validation, plus `type-check`, `lint`, and `format`
- `post-checkout` - runs `pnpm install` when lockfile-sensitive branch switches happen

## Toolchain Resolution

All managed repo hooks source `repo-toolchain.sh` before running workspace
commands. The helper:

- changes to the current checkout root
- loads `.nvmrc` through nvm when available
- runs pnpm through Corepack, falling back to the current `pnpm` only when
  Corepack is unavailable

This keeps hooks on the repo's declared Node/pnpm toolchain even when a shell
has multiple Node versions or a Codex/runtime pnpm earlier in `PATH`.

The `pre-commit` OAT status check uses the repo-local source CLI when this
repository's source tree is present:

```bash
corepack pnpm run --silent cli:source -- status --scope project --hook
```

It falls back to global `oat status --scope project --hook` only when the
repo-local source CLI is not present.

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
