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
pnpm run cli -- init tools
```

Notes:

- Installs OAT tool packs (`ideas`, `workflows`, `utility`) into canonical directories.
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
oat init tools
oat status --scope all
oat sync --scope all
oat instructions validate
oat instructions sync
oat remove skills --pack utility
oat doctor --scope all
oat project new my-project --mode spec-driven
```

## Path B: Provider-agnostic tooling (skills + utilities)

Use shared skills and helper tooling without adopting the spec-driven OAT project lifecycle.

This is also the right path for plan-first ideation that can later be synced/imported into an OAT project.

Start here:

- [`skills/index.md`](skills/index.md)
- [`skills/docs-workflows.md`](skills/docs-workflows.md)
- [`cli/docs-apps.md`](cli/docs-apps.md)
- [`cli/docs-consumer-quickstart.md`](cli/docs-consumer-quickstart.md)
- [`reference/index.md`](reference/index.md)

## Path C: Workflow layer (optional)

The workflow layer can be adopted when you want structured project execution and review gates.

### Typical OAT workflow (skills)

#### Spec-Driven workflow lane

1. `oat-project-new` / `oat-project-open`
2. `oat-project-discover`
3. `oat-project-spec`
4. `oat-project-design`
5. `oat-project-plan`
6. Implementation mode:
   - `oat-project-implement` (sequential, default)
   - `oat-project-subagent-implement` (parallel/subagent-driven)
7. `oat-project-review-provide` + `oat-project-review-receive`
8. `oat-project-pr-final`
9. `oat-project-document` (optional — sync documentation surfaces)
10. `oat-project-complete`

#### Quick lane (discovery -> plan -> implement)

1. `oat-project-quick-start`
2. Implementation mode:
   - `oat-project-implement` (sequential, default)
   - `oat-project-subagent-implement` (parallel/subagent-driven)
3. `oat-project-review-provide` / `oat-project-pr-final`
4. `oat-project-document` (optional — sync documentation surfaces)
5. Optional: `oat-project-promote-spec-driven`

#### Imported plan lane

1. `oat-project-import-plan` (source markdown path required)
2. Implementation mode:
   - `oat-project-implement` (sequential, default)
   - `oat-project-subagent-implement` (parallel/subagent-driven)
3. `oat-project-review-provide` / `oat-project-pr-final`
4. `oat-project-document` (optional — sync documentation surfaces)
5. Optional: `oat-project-promote-spec-driven`

Import discovery note:

- To include extra provider-plan folders in recent-file discovery, set `OAT_PROVIDER_PLAN_DIRS` as a colon-separated list before running `oat-project-import-plan`.

### Workflow artifacts (if using workflow mode)

- `.oat/projects/<scope>/<project>/implementation.md` (final summary + verification)
- `.oat/projects/<scope>/<project>/plan.md` (phases and review table)
- `.oat/projects/<scope>/<project>/references/imported-plan.md` (when using import lane)
