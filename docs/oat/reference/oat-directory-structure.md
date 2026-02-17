# `.oat` Directory Structure

This document is the canonical reference for what lives under `.oat/`, what each file or directory does, and which parts are source-of-truth vs generated runtime state.

## Scope model

OAT uses two scopes for `.oat` data:

- Project scope: `<repo>/.oat/`
- User scope: `~/.oat/`

Project scope is used for project workflows and repo-local sync state. User scope is used for global ideas and user-level sync state.

## Top-level project `.oat/` layout

```text
.oat/
  active-project
  active-idea
  projects-root
  projects/
    shared/
    local/
    archived/
  ideas/
  sync/
    manifest.json
    config.json
  templates/
  scripts/
  repo/
    knowledge/
    reference/
    reviews/
    archive/
```

## Top-level entries

| Path | Purpose | Notes |
|------|---------|-------|
| `.oat/active-project` | Pointer to the active project path | Used by project skills to resume context |
| `.oat/active-idea` | Pointer to active idea | Used by idea skills |
| `.oat/projects-root` | Optional override for default projects root | Defaults to `.oat/projects/shared` |
| `.oat/projects/` | OAT project artifacts | `shared`, `local`, `archived` scopes |
| `.oat/ideas/` | Project-level ideas store | Often gitignored |
| `.oat/sync/` | Interop sync state/config | See details below |
| `.oat/templates/` | Artifact templates used by OAT skills | Source for scaffolding |
| `.oat/scripts/` | OAT utility scripts | Internal workflow utilities |
| `.oat/repo/` | Repo-level knowledge/reference/review artifacts | Durable operational records |

## `.oat/sync/` details

| Path | Purpose |
|------|---------|
| `.oat/sync/manifest.json` | Records sync-managed provider entries and drift contract state |
| `.oat/sync/config.json` | Sync behavior config (default strategy + provider-level settings) |

`config.json` currently includes:

- `version`
- `defaultStrategy`
- `providers.<provider>.enabled`
- `providers.<provider>.strategy` (optional override)

Primary ways this file is managed:

- `oat init --scope project` (interactive provider selection)
- `oat providers set --scope project --enabled ... --disabled ...`

## Project artifact structure

Each OAT project lives under:

- `.oat/projects/shared/<project>/`
- `.oat/projects/local/<project>/`
- `.oat/projects/archived/<project>/`

Typical contents:

```text
<project>/
  state.md
  discovery.md
  spec.md
  design.md
  plan.md
  implementation.md
  reviews/
  pr/
  references/
```

### Core artifact roles

| File | Purpose |
|------|---------|
| `state.md` | Lifecycle routing state (`oat_phase`, status, current task pointers) |
| `discovery.md` | Problem framing and requirements discovery notes |
| `spec.md` | Formalized requirements |
| `design.md` | Technical architecture/design decisions |
| `plan.md` | Executable task/phase plan and review table |
| `implementation.md` | Execution log, progress table, outcomes, verification history |
| `reviews/*.md` | Review artifacts from review skills |
| `pr/*.md` | PR description artifacts |
| `references/*` | Imported or supporting source material |

Not all workflow modes require every artifact:

- `full`: discovery + spec + design + plan + implementation
- `quick`: discovery + plan + implementation (spec/design optional)
- `import`: imported plan + implementation (spec/design optional)

## `.oat/repo/` structure

| Path | Purpose |
|------|---------|
| `.oat/repo/knowledge/` | Generated codebase knowledge indexes |
| `.oat/repo/reference/` | Repo-level reference docs (backlog, external plans, etc.) |
| `.oat/repo/reviews/` | Repo-scoped review artifacts (ad-hoc/non-project) |
| `.oat/repo/archive/` | Archived repo-level artifacts |

## User scope (`~/.oat/`)

Common user-scope entries:

```text
~/.oat/
  ideas/
  active-idea
  sync/
    manifest.json
```

User scope is primarily for:

- User-level ideas
- User-level provider sync state where applicable

## Practical guidance

- Treat `.oat/templates/` as scaffolding source.
- Treat `.oat/sync/manifest.json` and `.oat/sync/config.json` as runtime state/config.
- Treat project artifacts under `.oat/projects/**` as lifecycle source-of-truth for workflow execution.
- Keep `state.md`, `plan.md`, and `implementation.md` consistent after each workflow step.
