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

#### Full lifecycle lane

1. `oat-project-new` / `oat-project-open`
2. `oat-project-discover`
3. `oat-project-spec`
4. `oat-project-design`
5. `oat-project-plan`
6. `oat-project-implement`
7. `oat-project-review-provide` + `oat-project-review-receive`
8. `oat-project-pr-final`
9. `oat-project-complete`

#### Quick lane (discovery -> plan -> implement)

1. `oat-project-quick-start`
2. `oat-project-implement`
3. `oat-project-review-provide` / `oat-project-pr-final`
4. Optional: `oat-project-promote-full`

#### Imported plan lane

1. `oat-project-import-plan` (source markdown path required)
2. `oat-project-implement`
3. `oat-project-review-provide` / `oat-project-pr-final`
4. Optional: `oat-project-promote-full`

Import discovery note:
- To include extra provider-plan folders in recent-file discovery, set `OAT_PROVIDER_PLAN_DIRS` as a colon-separated list before running `oat-project-import-plan`.

### Workflow artifacts (if using workflow mode)

- `.oat/projects/<scope>/<project>/implementation.md` (final summary + verification)
- `.oat/projects/<scope>/<project>/plan.md` (phases and review table)
- `.oat/projects/<scope>/<project>/references/imported-plan.md` (when using import lane)
