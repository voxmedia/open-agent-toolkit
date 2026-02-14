# Quickstart

## Prerequisites

- Node.js `22.17.0+`
- pnpm `10.13.1+`

## Install and verify

```bash
pnpm install
pnpm run cli -- --help
```

## Initialize canonical structure

```bash
pnpm run cli -- init --scope project
```

Creates canonical directories and can offer stray adoption/hook installation.

## Check status and sync

```bash
pnpm run cli -- status --scope all
pnpm run cli -- sync --scope all
pnpm run cli -- sync --scope all --apply
```

Notes:
- `sync` is dry-run by default.
- `--apply` performs filesystem changes.

## Typical OAT workflow (skills)

1. `oat-new-project` / `oat-open-project`
2. `oat-discovery`
3. `oat-spec`
4. `oat-design`
5. `oat-plan`
6. `oat-implement`
7. `oat-request-review` + `oat-receive-review`
8. `oat-pr-project`
9. `oat-complete-project`

## Reference artifacts

- `.oat/projects/shared/provider-interop-cli/implementation.md` (final summary + verification)
- `.oat/projects/shared/provider-interop-cli/plan.md` (phases and review table)
