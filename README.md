# Open Agent Toolkit (OAT)

Open Agent Toolkit (OAT) is an open-source toolkit built on open standards for defining and managing agent skills, subagents, and hooks across multiple AI coding providers (Claude Code, Cursor, Codex CLI). It provides a provider-agnostic interoperability layer first, with optional, human-in-the-loop workflow scaffolding layered on top.

OAT has three distinct capabilities:

1. Provider interoperability CLI for syncing/managing canonical skills and sub-agents across tools.
2. Reusable skills, CLI commands, and tooling that support provider-agnostic development workflows.
3. Optional workflow system for structured discovery/spec/design/plan/implement execution.

You can use any capability independently.

## What This Repo Contains

This repository currently includes three core pieces:

- Workflow skills in `.agents/skills`
  - Skills drive OAT lifecycle behavior and quality gates.
- Project artifacts under `.oat/projects/...`
  - Discovery/spec/design/plan/implementation/review/PR records.
- Provider interop CLI in `packages/cli`
  - Commands for canonical asset management, provider sync, drift detection, and diagnostics.

## Three Ways To Use OAT

### A) Interop-only mode (CLI only)

Use OAT only for cross-provider asset management:

- Initialize canonical directories
- Detect drift and strays
- Sync provider views safely
- Run diagnostics

Primary commands:
- `oat init`
- `oat status`
- `oat sync`
- `oat providers ...`
- `oat doctor`
- `oat project new <name>`

This mode is useful even if you do not use OAT workflow skills at all.

### B) Provider-agnostic tooling mode (skills + utilities)

Use reusable skills and tooling without adopting the full project lifecycle:

- Draft ideas and plans with your preferred provider
- Keep plan-first docs outside OAT, then sync/import into an OAT project when ready
- Reuse provider-agnostic helper skills and commands
- Adopt only the pieces you need for your team’s workflow

Start points:
- [Skills overview](docs/oat/skills/index.md)
- [Reference](docs/oat/reference/index.md)

### C) Workflow mode (skills + project artifacts)

Use OAT lifecycle skills to run full project execution with checkpoints:

- Discovery -> Spec -> Design -> Plan -> Implement
- Review receive/fix loops
- PR artifact generation
- Lifecycle completion and archival

This layer is optional and can build on top of interop + provider-agnostic tooling.

## Core Model

OAT centers on canonical agent assets and explicit workflow artifacts.

- Canonical assets:
  - `.agents/skills/`
  - `.agents/agents/`
- Workflow artifacts:
  - `.oat/projects/<scope>/<project>/state.md`
  - `.oat/projects/<scope>/<project>/{discovery,spec,design,plan,implementation}.md`
  - `.oat/projects/<scope>/<project>/reviews/*.md`
  - `.oat/projects/<scope>/<project>/pr/*.md`

If you are interop-only, you can ignore most project artifact files.

## Quickstart (Repo Development)

### 1) Install and verify

```bash
pnpm install
pnpm run cli -- --help
```

### 2) Initialize and inspect

```bash
pnpm run cli -- init --scope project
pnpm run cli -- status --scope all
```

### 3) Sync provider views (when needed)

```bash
pnpm run cli -- sync --scope all
pnpm run cli -- sync --scope all --apply
```

Notes:
- `sync` is dry-run by default.
- `--apply` performs filesystem updates.

Maintenance note:
- `pnpm oat:validate-skills` routes to `oat internal validate-oat-skills` and validates required `oat-*` skill structure.

## Consumer CLI Usage (Without pnpm)

If you are using OAT CLI as a consumer, prefer the `oat` executable interface rather than repo scripts.

Current state:
- `@oat/cli` is currently private in this repository (`packages/cli/package.json` has `"private": true`), so registry `npx` usage is not available yet.

Run from source with npm:

```bash
cd packages/cli
npm install
npm run build
node dist/index.js --help
node dist/index.js status --scope project
```

Optional local linking for `oat` command:

```bash
cd packages/cli
npm link
oat --help
oat sync --scope all --apply
```

## Interop-Only Quickstart (Consumer Intent)

Once you have an `oat` executable available in your environment:

```bash
oat init --scope project
oat status --scope all
oat sync --scope all
oat sync --scope all --apply
oat doctor --scope all
```

This gives you the core value of OAT without adopting workflow artifacts.

## Workflow At A Glance

### Full workflow lane

1. Create/open project (`oat-project-new` / `oat-project-open`)
2. Discovery (`oat-project-discover`)
3. Spec (`oat-project-spec`)
4. Design (`oat-project-design`)
5. Plan (`oat-project-plan`)
6. Implement (`oat-project-implement`)
7. Review loop (`oat-project-review-provide` + `oat-project-review-receive`)
8. PR generation (`oat-project-pr-progress` / `oat-project-pr-final`)
9. Complete lifecycle (`oat-project-complete`)

### Quick workflow lane

1. Quick start (`oat-project-quick-start`)
2. Implement (`oat-project-implement`)
3. Review/PR (`oat-project-review-provide`, `oat-project-pr-final`)
4. Optional promotion to full lifecycle (`oat-project-promote-full`)

### Imported-plan workflow lane

1. Import external plan (`oat-project-import-plan`)
2. Implement (`oat-project-implement`)
3. Review/PR (`oat-project-review-provide`, `oat-project-pr-final`)
4. Optional promotion to full lifecycle (`oat-project-promote-full`)

## Documentation

Start here:

- [OAT overview](docs/oat/index.md)
- [Quickstart](docs/oat/quickstart.md)

Section indexes:

- [Workflow](docs/oat/workflow/index.md)
- [Skills](docs/oat/skills/index.md)
- [Projects](docs/oat/projects/index.md)
- [CLI](docs/oat/cli/index.md)
- [Provider interop](docs/oat/cli/provider-interop/index.md)
- [Reference](docs/oat/reference/index.md)

## Development Commands

```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
```
