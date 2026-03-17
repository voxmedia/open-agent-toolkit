---
title: Quickstart
description: 'Quick-start guides for interop-only, provider-agnostic tooling, and optional workflow adoption.'
---

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
```

Notes:

- `sync` mutates by default; use `--dry-run` to preview changes without writing.

### Install or update OAT tool packs (optional)

```bash
pnpm run cli -- tools install
# or install just the project-management pack
pnpm run cli -- tools install project-management
```

Notes:

- Installs OAT tool packs (`ideas`, `workflows`, `utility`, `project-management`, `research`) into canonical directories.
- `oat init tools` remains available as a backward-compatible install path.
- If installed OAT skills are older than bundled versions, interactive runs prompt for selective updates.
- Non-interactive runs report outdated skills without updating them.

### Remove installed skills or packs (optional)

```bash
pnpm run cli -- remove skill oat-idea-scratchpad
pnpm run cli -- remove skills --pack utility
```

Notes:

- `oat remove` mutates by default; use `--dry-run` to preview deletions.
- Managed provider views are removed alongside canonical skill deletion; unmanaged views are preserved with warnings.

### Validate instruction pointers

```bash
pnpm run cli -- instructions validate
pnpm run cli -- instructions sync
```

Notes:

- `instructions validate` is read-only.
- `instructions sync` mutates by default; use `--dry-run` to preview changes.
- Use `instructions sync --force` if you intend to overwrite mismatched `CLAUDE.md` content.

### Additional CLI commands

```bash
# Mode-aware project scaffold
pnpm run cli -- project new my-project --mode quick

# Bootstrap or maintain a docs app
pnpm run cli -- docs init --app-name my-docs
pnpm run cli -- docs nav sync --target-dir apps/my-docs

# Manage the file-backed backlog directly
pnpm run cli -- backlog generate-id add-webhook-support --created-at 2026-03-15T14:30:00Z
pnpm run cli -- backlog regenerate-index

# Internal oat-* skill validation (primary path)
pnpm oat:validate-skills
```

### Worktree setup

Use `oat-worktree-bootstrap` for an OAT-aware guided flow when creating or resuming git worktree checkouts. It resolves worktree paths, runs bootstrap checks (`worktree:init`, tests), and validates project sync state before implementation.

### Consumer usage (without pnpm scripts)

When `@oat/cli` is consumed as a built package or linked binary, use `oat` directly:

```bash
oat --help
oat init --scope project
oat tools install
oat status --scope all
oat sync --scope all
oat instructions validate
oat instructions sync
oat remove skills --pack utility
oat doctor --scope all
oat project new my-project --mode spec-driven
oat backlog regenerate-index
```

## Path B: Provider-agnostic tooling (skills + utilities)

Use shared skills and helper tooling without adopting the spec-driven OAT project lifecycle.

This is also the right path for plan-first ideation that can later be synced/imported into an OAT project.

Start here:

- [`guide/skills/index.md`](guide/skills/index.md)
- [`guide/documentation/workflows.md`](guide/documentation/workflows.md)
- [`guide/documentation/commands.md`](guide/documentation/commands.md)
- [`guide/documentation/quickstart.md`](guide/documentation/quickstart.md)
- [`reference/index.md`](reference/index.md)

## Path C: Workflow layer (optional)

Adopt the workflow layer when you want tracked project artifacts, explicit review gates, and resumable execution state.

Start with:

- [`guide/workflow/index.md`](guide/workflow/index.md)
- [`guide/workflow/lifecycle.md`](guide/workflow/lifecycle.md)
- [`guide/workflow/artifacts.md`](guide/workflow/artifacts.md)

Typical entry points:

- Spec-driven work: `oat-project-new` or `oat-project-open`, then discovery → spec → design → plan → implement
- Quick work: `oat-project-quick-start`, then plan or lightweight design as needed before implementation
- Imported plans: `oat-project-import-plan`, then tracked implementation and review

Implementation modes:

- `oat-project-implement` for sequential execution
- `oat-project-subagent-implement` for parallel/subagent-driven execution

Review and close-out:

- `oat-project-review-provide` / `oat-project-review-receive`
- `oat-project-pr-progress` or `oat-project-pr-final`
- `oat-project-document` and `oat-project-complete` when the work is ready to close

If you are importing plans from external provider plan folders, set `OAT_PROVIDER_PLAN_DIRS` before running `oat-project-import-plan`.
