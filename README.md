# Open Agent Toolkit (OAT)

A structured workflow system for AI-assisted software development with human-in-the-loop checkpoints, knowledge-first enforcement, and full traceability from requirements to implementation.

## Overview

OAT provides a disciplined approach to AI-assisted development through:

- **Knowledge-first enforcement** - Requires codebase analysis before starting work
- **Phased workflow** - Discovery → Spec → Design → Plan → Implement
- **Human-in-the-loop gates** - Configurable checkpoints for review and approval
- **TDD discipline** - Red-green-refactor pattern in implementation
- **Full traceability** - Requirements linked to tasks linked to commits

## Quick Start

**In Claude Code or Cursor:**
```
/oat:progress    # Check status and get guidance
/oat:index       # Generate codebase knowledge base (required first)
/oat:discovery   # Start a new project
```

**Sync skills/providers locally:**
```bash
pnpm run cli sync --scope all --apply
```

## Workflow Phases

```
/oat:index → /oat:discovery → /oat:spec → /oat:design → /oat:plan → /oat:implement
```

### 1. Knowledge Generation (`/oat:index`)

Generate comprehensive codebase analysis using parallel mapper agents. Creates a knowledge base in `.oat/knowledge/repo/` that subsequent phases reference.

**Output:** `project-index.md`, entrypoint analyses, architecture documentation

### 2. Discovery (`/oat:discovery`)

Gather requirements through structured dialogue. Understand the problem, explore constraints, and capture decisions.

**Output:** `.oat/projects/{name}/discovery.md`

### 3. Specification (`/oat:spec`)

Create formal requirements with acceptance criteria from discovery insights. Produces a testable specification.

**Output:** `.oat/projects/{name}/spec.md`

### 4. Design (`/oat:design`)

Create detailed technical design from specification. Documents architecture, interfaces, and implementation approach.

**Output:** `.oat/projects/{name}/design.md`

### 5. Planning (`/oat:plan`)

Break design into bite-sized TDD tasks with stable IDs, verification commands, and commit messages.

**Output:** `.oat/projects/{name}/plan.md`

### 6. Implementation (`/oat:implement`)

Execute plan tasks with state tracking. Follows TDD discipline, commits per task, and stops at phase boundaries for review.

**Output:** `.oat/projects/{name}/implementation.md`

## Running Skills

**In Claude Code or Cursor:**
```
/oat:progress
/oat:discovery
/oat:spec
```

**Canonical-first workflow:**
```bash
pnpm run cli status --scope all
pnpm run cli sync --scope all --apply
```

## Human-in-the-Loop (HiL) Gates

Configure checkpoints in `state.md`:

```yaml
oat_hil_checkpoints: ["discovery", "spec", "design"]
oat_hil_completed: ["discovery"]
```

- **Workflow HiL** - Gates between workflow phases (discovery → spec → design → plan → implement)
- **Plan phase checkpoints** - Gates at plan phase boundaries during implementation. Configure via `oat_plan_hil_phases` in plan.md (empty = stop at every phase; set to the last phase like `["p03"]` to stop only at the end; or list specific phases like `["p01", "p04"]`)

## Directory Structure

```
.oat/
├── knowledge/repo/       # Generated codebase analysis
│   ├── project-index.md  # Main knowledge index
│   └── entrypoints/      # Per-entrypoint analyses
├── templates/            # Document templates
│   ├── discovery.md
│   ├── spec.md
│   ├── design.md
│   ├── plan.md
│   └── implementation.md
└── scripts/              # Utility scripts
    └── generate-thin-index.sh

.agents/
├── skills/               # OAT skill definitions
│   ├── oat-index/
│   ├── oat-discovery/
│   ├── oat-spec/
│   ├── oat-design/
│   ├── oat-plan/
│   ├── oat-implement/
│   └── oat-progress/
.oat/projects/            # Project-specific documents
    └── <project-name>/
        ├── state.md          # Workflow state
        ├── discovery.md      # Requirements gathering
        ├── spec.md           # Formal specification
        ├── design.md         # Technical design
        ├── plan.md           # Implementation tasks
        └── implementation.md # Progress tracking
```

## Key Features

### Staleness Detection

OAT tracks when knowledge was generated and warns when it may be outdated:
- Age check (>7 days)
- Git diff check (>20 files changed since generation)

### Stable Task IDs

Tasks use stable IDs (`p01-t03` = Phase 1, Task 3) for traceability across plan, implementation, and commits.

### Mode Assertions

Each phase declares what activities are BLOCKED vs ALLOWED, with self-correction protocols when deviating.

### TDD Format

Plan tasks follow red-green-refactor:
1. Write test (RED)
2. Run test → expect failure
3. Write implementation (GREEN)
4. Run test → expect pass
5. Refactor if needed

## Development Commands

```bash
pnpm build        # Build all packages
pnpm lint         # Lint code using Biome
pnpm type-check   # TypeScript type checking
pnpm test         # Run tests
```

## Technology Stack

- **Runtime:** Node.js 22.17.0, TypeScript 5.8.3
- **Build:** Turborepo with pnpm workspaces
- **Linting:** Biome 2.3.11
- **AI Integration:** Claude Code, Cursor

## License

MIT
