# Open Agent Toolkit (OAT)

Open Agent Toolkit (OAT) is an open-source toolkit for portable, provider-agnostic agent tooling and workflows. It lets teams define canonical agent capabilities once, sync them across providers, and optionally run tracked human-in-the-loop workflows on top.

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

```mermaid
flowchart TD
  Start["Starting point"] --> Q1{"Need cross-provider sync and drift checks only?"}
  Q1 -->|Yes| A["Interop-only mode"]
  Q1 -->|No| Q2{"Need durable project artifacts and phase gates?"}
  Q2 -->|No| B["Provider-agnostic tooling mode"]
  Q2 -->|Yes| C["Workflow mode"]
```

| Mode                      | Best for                                                                  | Primary entry points                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interop-only              | Canonical skill/agent/rule sync + drift diagnostics + tool-pack lifecycle | `oat init`, `oat tools ...`, `oat status`, `oat sync`, `oat instructions ...`, `oat providers ...`, `oat cleanup ...`, `oat doctor`                 |
| Provider-agnostic tooling | Reusing skills/utilities without spec-driven lifecycle overhead           | `apps/oat-docs/docs/skills/index.md`, `apps/oat-docs/docs/skills/docs-workflows.md`, `apps/oat-docs/docs/cli/docs-apps.md`, selected `oat-*` skills |
| Workflow                  | Structured execution with durable artifacts and review gates              | `oat-project-new`/`oat-project-open`, then lane-specific skills                                                                                     |

### A) Interop-only mode (CLI only)

Use OAT only for cross-provider asset management:

- Initialize canonical directories
- Detect drift and strays
- Sync provider views safely
- Validate AGENTS.md to CLAUDE.md pointer integrity and repair drift
- Manage installed tools: list, inspect, install, update, and remove (`oat tools ...`) with auto-sync
- Audit and clean workflow/project hygiene drift
- Run diagnostics

Primary commands:

- `oat init`
- `oat status`
- `oat sync`
- `oat instructions validate`
- `oat instructions sync`
- `oat tools list`
- `oat tools outdated`
- `oat tools info <name>`
- `oat tools install`
- `oat tools update [name] --pack --all`
- `oat tools remove [name] --pack --all`
- `oat providers list`
- `oat providers inspect <provider>`
- `oat providers set`
- `oat cleanup project`
- `oat cleanup artifacts`
- `oat doctor`

This mode is useful even if you do not use OAT workflow skills at all.

### B) Provider-agnostic tooling mode (skills + utilities)

Use reusable skills and tooling without adopting the spec-driven project lifecycle:

- Draft ideas and plans with your preferred provider
- Keep plan-first docs outside OAT, then sync/import into an OAT project when ready
- Reuse provider-agnostic helper skills and commands
- Adopt only the pieces you need for your team’s workflow

Start points:

- [Skills overview](apps/oat-docs/docs/skills/index.md)
- [Docs workflows](apps/oat-docs/docs/skills/docs-workflows.md)
- [Docs app commands](apps/oat-docs/docs/cli/docs-apps.md)
- [Add docs to a new repo](apps/oat-docs/docs/cli/docs-consumer-quickstart.md)
- [Reference](apps/oat-docs/docs/reference/index.md)

### C) Workflow mode (skills + project artifacts)

Use OAT lifecycle skills when you want explicit checkpoints and durable project artifacts.

Recommended when:

- You want traceable artifacts (`state/spec/design/plan/implementation`) for handoffs and audits.
- You want review/fix loops and PR artifacts driven by a consistent workflow contract.
- You want the option to start fast (quick/import) and promote to spec-driven lifecycle later.

Lane options (all converge on implementation + project review workflows):

| Lane          | Typical sequence                                                                                            | Best fit                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Spec-Driven   | Discovery -> Spec -> Design -> Plan -> Implement -> Project review loop -> Docs sync (optional)             | New initiatives or higher-risk changes that need strong artifact rigor                   |
| Quick         | Quick start (adaptive discovery + [optional lightweight design] + plan) -> Implement -> Project review loop | Bounded features with clear requirements; can promote to spec-driven if complexity grows |
| Imported-plan | Plan with provider -> Import to OAT project -> Implement -> Project review loop                             | External/provider-authored plans you want normalized into OAT artifacts                  |

Shared across lanes:

- Review/fix loops (`oat-project-review-provide` + `oat-project-review-receive` for local, `oat-project-review-receive-remote` for GitHub PR feedback)
- Ad-hoc reviews (`oat-review-provide` + `oat-review-receive` for local, `oat-review-receive-remote` for GitHub PR feedback)
- PR artifacts (`oat-project-pr-progress`, `oat-project-pr-final`)
- Optional promotion to spec-driven lifecycle (`oat-project-promote-spec-driven`) where applicable

This layer is optional and can build on top of interop + provider-agnostic tooling.

## Core Model

OAT centers on canonical agent assets and explicit workflow artifacts.

- Canonical assets:
  - `.agents/skills/`
  - `.agents/agents/`
  - `.agents/rules/`
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
pnpm run cli -- help
```

### 2) Initialize and inspect

```bash
pnpm run cli -- init --scope project
pnpm run cli -- status --scope all
pnpm run cli -- providers list
```

### 3) Sync provider views (when needed)

```bash
pnpm run cli -- sync --scope all
```

Notes:

- `sync` mutates by default; use `--dry-run` to preview changes without writing.
- Project provider support is configured in `.oat/sync/config.json` (set via `oat init` interactive prompt or `oat providers set`).
- Canonical subagents in `.agents/agents/*.md` are the source of truth. For Codex project scope, `sync` generates `.codex/agents/*.toml` and merges `.codex/config.toml`.
- Canonical rules in `.agents/rules/*.md` are the source of truth. `sync` renders provider-specific rule files such as `.claude/rules/*.md`, `.cursor/rules/*.mdc`, and `.github/instructions/*.instructions.md`.
- Stray adoption in `oat init` / `oat status` reconciles canonical plus the adopted provider first; run `oat sync --scope all` for cross-provider fanout.
- In non-interactive contexts, set provider intent explicitly:
  - `pnpm run cli -- providers set --scope project --enabled claude,codex --disabled cursor`

### 3.5) Install or update OAT tool packs (optional)

```bash
pnpm run cli -- tools install
pnpm run cli -- tools outdated
pnpm run cli -- tools update --all
```

Notes:

- `tools install` installs OAT skills/agents/templates/scripts by pack (`core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`) and auto-syncs provider views. The core pack (diagnostics, passive docs access) always installs at user scope.
- `tools outdated` shows which installed tools have available updates.
- `tools update --all` updates all outdated tools to bundled versions.
- Use `--no-sync` on any mutation command to skip auto-sync.

### 3.6) Bootstrap or maintain a docs app (optional)

```bash
pnpm run cli -- docs init --app-name my-docs
pnpm run cli -- docs nav sync --target-dir apps/my-docs
```

Notes:

- `docs init` scaffolds an MkDocs Material docs app with OAT defaults.
- `docs nav sync` regenerates `mkdocs.yml` navigation from directory `index.md` `## Contents` sections.
- `docs analyze` and `docs apply` expose the docs workflow entrypoints and pair with the `oat-docs-analyze` / `oat-docs-apply` skills.
- For the full consumer setup flow, see [Add docs to a new repo](apps/oat-docs/docs/cli/docs-consumer-quickstart.md).

### 4) Validate instruction pointers (recommended)

```bash
pnpm run cli -- instructions validate
pnpm run cli -- instructions sync
```

Notes:

- `instructions validate` is read-only.
- `instructions sync` mutates by default; use `--dry-run` to preview changes.
- Use `instructions sync --force` to overwrite mismatched `CLAUDE.md` files.

### 5) Audit and clean project/artifact hygiene (optional)

```bash
pnpm run cli -- cleanup project
pnpm run cli -- cleanup artifacts
```

Notes:

- Cleanup commands mutate by default; use `--dry-run` to preview changes.
- `cleanup artifacts` uses interactive triage in TTY contexts by default.
- In non-interactive contexts, use `--all-candidates --yes` to allow stale-candidate mutation.

### 6) Bootstrap a new worktree checkout

```bash
pnpm run worktree:init
```

This installs dependencies, builds packages, and applies project-scope sync links in one step.
For a guided OAT-aware setup flow (create/reuse worktree + readiness checks), use the `oat-worktree-bootstrap` skill.

Maintenance note:

- `pnpm oat:validate-skills` routes to `oat internal validate-oat-skills` and validates required `oat-*` skill structure.

## Consumer CLI Usage (Without pnpm)

If you are using OAT CLI as a consumer, prefer the `oat` executable interface rather than repo scripts.

Public package names for release automation in this repo:

- `@tkstang/oat-cli`
- `@tkstang/oat-docs-config`
- `@tkstang/oat-docs-theme`
- `@tkstang/oat-docs-transforms`

Once published, install the CLI with npm:

```bash
npm install -g @tkstang/oat-cli
oat --help
```

Or run it without a global install:

```bash
npx @tkstang/oat-cli --help
pnpm dlx @tkstang/oat-cli --help
```

Fumadocs helper packages are published separately:

```bash
pnpm add @tkstang/oat-docs-config @tkstang/oat-docs-theme @tkstang/oat-docs-transforms
```

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
oat sync --scope all
oat instructions validate
```

## Interop-Only Quickstart (Consumer Intent)

Once you have an `oat` executable available in your environment:

```bash
oat init --scope project
oat providers set --scope project --enabled claude,codex --disabled cursor
oat status --scope all
oat sync --scope all
oat instructions validate
oat instructions sync
oat tools install
oat tools list
oat tools outdated
oat tools update --all
oat cleanup project
oat cleanup artifacts
oat doctor --scope all
```

This gives you the core value of OAT without adopting workflow artifacts.

## Workflow At A Glance

```mermaid
flowchart LR
  SpecDriven["Spec-Driven lane: discover -> spec -> design -> plan"] --> Mode{"Implementation mode?"}
  Quick["Quick lane: oat-project-quick-start\n(adaptive discovery + optional design)"] --> Mode
  Import["Imported lane: oat-project-import-plan"] --> Mode
  Mode -->|Sequential| ImplementSeq["oat-project-implement"]
  Mode -->|Subagent-driven| ImplementSub["oat-project-subagent-implement"]
  SetMode["oat project set-mode <mode>"] --> Mode
  ImplementSeq --> Reconcile{"Manual commits to reconcile?"}
  ImplementSub --> Reconcile
  Reconcile -->|Yes| ReconcileSkill["oat-project-reconcile"]
  ReconcileSkill --> Review{"Review context?"}
  Reconcile -->|No| Review
  Review -->|Project-scoped local| ProjectReview["oat-project-review-provide + oat-project-review-receive"]
  Review -->|Project-scoped remote| ProjectReviewRemote["oat-project-review-receive-remote"]
  Review -->|Ad-hoc local| AdHocReview["oat-review-provide + oat-review-receive"]
  Review -->|Ad-hoc remote| AdHocReviewRemote["oat-review-receive-remote"]
  ProjectReview --> PR["PR artifacts: oat-project-pr-progress / oat-project-pr-final"]
  Next["oat-project-next\n(auto-router)"] -.->|"reads state,\ninvokes next skill"| SpecDriven
  Next -.-> Quick
  Next -.-> Import
  Next -.-> ImplementSeq
  Next -.-> Review
  Next -.-> PR
```

### Choose a lane

1. Spec-Driven workflow lane
   - Create/open project (`oat-project-new` / `oat-project-open`)
   - Discovery (`oat-project-discover`)
   - Spec (`oat-project-spec`)
   - Design (`oat-project-design`)
   - Plan (`oat-project-plan`)
   - Implement (`oat-project-implement` or `oat-project-subagent-implement`)
   - Documentation sync (`oat-project-document`, optional)
2. Quick workflow lane
   - Quick start (`oat-project-quick-start` — adaptive discovery with solution space exploration for exploratory requests, minimal ceremony for well-understood ones)
   - Decision point: straight to plan, optional lightweight `design.md`, or promote to spec-driven
   - Implement (`oat-project-implement` or `oat-project-subagent-implement`)
   - Optional promotion (`oat-project-promote-spec-driven`)
3. Imported-plan workflow lane
   - Produce discovery/plan externally with provider tooling
   - Import external plan (`oat-project-import-plan`)
   - Implement (`oat-project-implement` or `oat-project-subagent-implement`)
   - Optional promotion (`oat-project-promote-spec-driven`)

### Typical lane sequences

1. Provider-plan import sequence
   - External discovery + planning with provider tooling
   - `oat-project-import-plan`
   - `oat-project-implement` or `oat-project-subagent-implement`
   - `oat-project-review-provide` + `oat-project-review-receive`
   - `oat-project-pr-final`
   - `oat-project-document` (optional)
   - `oat-project-complete`
2. Quick-start sequence
   - `oat-project-quick-start` (adaptive discovery + optional lightweight design + plan)
   - `oat-project-implement` or `oat-project-subagent-implement`
   - `oat-project-review-provide` + `oat-project-review-receive`
   - `oat-project-pr-final`
   - `oat-project-document` (optional)
   - `oat-project-complete`

### Shared workflow options

1. Routing and next-step checks:
   - `oat-project-next` — reads project state and invokes the correct next skill automatically (one command to continue working)
   - `oat-project-progress` — read-only diagnostic with drift detection that suggests reconciliation when manual commits are detected
2. Reconciliation (manual commit → task mapping):
   - `oat-project-reconcile` — analyzes untracked commits, maps them to planned tasks using five signals, and updates tracking artifacts after human confirmation
3. Execution mode persistence:
   - `oat project set-mode <single-thread|subagent-driven>`
4. Canonical plan-writing contract:
   - `oat-project-plan-writing` (shared spec-driven/quick/import planning semantics)
5. Review path selection:
   - Project-scoped review: `oat-project-review-provide` + `oat-project-review-receive` (local) / `oat-project-review-receive-remote` (GitHub PR)
   - Ad-hoc/non-project review: `oat-review-provide` + `oat-review-receive` (local) / `oat-review-receive-remote` (GitHub PR)
6. PR generation:
   - Progress PR: `oat-project-pr-progress`
   - Final PR: `oat-project-pr-final`
7. Documentation sync (optional):
   - `oat-project-document` — reads project artifacts and code to identify docs needing updates, presents a delta plan, and applies approved changes
8. Lifecycle completion:
   - `oat-project-complete` (with optional active-project cleanup)

## Documentation

Start here:

- [OAT overview](apps/oat-docs/docs/index.md)
- [Quickstart](apps/oat-docs/docs/quickstart.md)

Section indexes:

- [Workflow](apps/oat-docs/docs/workflow/index.md)
- [Skills](apps/oat-docs/docs/skills/index.md)
- [Projects](apps/oat-docs/docs/projects/index.md)
- [CLI](apps/oat-docs/docs/cli/index.md)
- [Provider interop](apps/oat-docs/docs/cli/provider-interop/index.md)
- [Reference](apps/oat-docs/docs/reference/index.md)

## Development Commands

```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
```
