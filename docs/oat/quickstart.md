# Quickstart

## Prerequisites

- Node.js `22.17.0+`
- pnpm `10.13.1+`

## Path A: Interop-only (CLI)

```bash
pnpm install
pnpm run cli -- --help
```

### Initialize canonical structure

```bash
pnpm run cli -- init --scope project
```

Creates canonical directories and can offer stray adoption/hook installation.

### Check status and sync

```bash
pnpm run cli -- status --scope all
pnpm run cli -- sync --scope all
pnpm run cli -- sync --scope all --apply
```

Notes:
- `sync` is dry-run by default.
- `--apply` performs filesystem changes.

### Consumer usage (without pnpm scripts)

When `@oat/cli` is consumed as a built package or linked binary, use `oat` directly:

```bash
oat --help
oat init --scope project
oat status --scope all
oat sync --scope all --apply
oat doctor --scope all
```

## Path B: Provider-agnostic tooling (skills + utilities)

Use shared skills and helper tooling without adopting the full OAT project lifecycle.

This is also the right path for plan-first ideation that can later be synced/imported into an OAT project.

Start here:
- `docs/oat/skills/index.md`
- `docs/oat/reference/index.md`

## Path C: Workflow layer (optional)

The workflow layer can be adopted when you want structured project execution and review gates.

### Typical OAT workflow (skills)

1. `oat-new-project` / `oat-open-project`
2. `oat-discovery`
3. `oat-spec`
4. `oat-design`
5. `oat-plan`
6. `oat-implement`
7. `oat-request-review` + `oat-receive-review`
8. `oat-pr-project`
9. `oat-complete-project`

### Workflow artifacts (if using workflow mode)

- `.oat/projects/<scope>/<project>/implementation.md` (final summary + verification)
- `.oat/projects/<scope>/<project>/plan.md` (phases and review table)
