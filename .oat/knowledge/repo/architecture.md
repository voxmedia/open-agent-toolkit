---
oat_generated: true
oat_generated_at: 2026-02-02
oat_source_head_sha: d25643fb7a57fd977d1a9590690d26986d2d0ce8
oat_source_main_merge_base_sha: 6c147615ba8cf567d29814f1fe1d5667fc6e6fdf
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Modular monorepo with structured agent workflow system for AI-assisted development

**Key Characteristics:**
- Monorepo structure using pnpm workspaces with Turborepo orchestration
- Layered architecture separating agent skills, CLI tooling, and workflow templates
- Knowledge-first development with generated codebase indexes
- Human-in-the-loop gates for multi-phase development workflows
- Agent-agnostic skill system supporting Claude Code, Cursor, and CLI

## Layers

**Agent Skills Layer:**
- Purpose: Reusable workflow skills for different development phases (discovery, spec, design, plan, implement)
- Location: `.agents/skills/`
- Contains: OAT workflow skills, project scaffold skills, documentation skills
- Depends on: Templates, reference documentation, project context
- Used by: Claude Code, Cursor, CLI tools via openskills framework

**OAT Knowledge Generation Layer:**
- Purpose: Generates comprehensive codebase analysis used by subsequent workflow phases
- Location: `.oat/knowledge/repo/`, `.oat/templates/`, `.oat/scripts/`
- Contains: Project index templates, analysis scripts, knowledge base generation logic
- Depends on: Project codebase analysis, git information, file system access
- Used by: Discovery, spec, design, plan, and implement phases

**Project Workflow Layer:**
- Purpose: Tracks project state and artifacts across development phases
- Location: `.oat/projects/shared/`, `.oat/projects/`
- Contains: Discovery docs, specifications, designs, implementation plans, reviews, handoffs
- Depends on: OAT knowledge, skill templates, git state
- Used by: Agents executing workflow phases, review processes

**CLI Layer:**
- Purpose: Command-line interface for OAT operations and skill management
- Location: `packages/cli/`
- Contains: TypeScript CLI implementation, command handlers
- Depends on: Node.js 22.17.0+, TypeScript
- Used by: Manual OAT operations, CI/CD workflows, development automation

**Configuration Layer:**
- Purpose: Centralized configuration and workflow state management
- Location: Root-level config files, project-specific state.md files
- Contains: Biome linting, Turborepo task graph, commitlint rules, git hooks
- Depends on: Package managers, build tools, git
- Used by: Build system, linting, commit validation, git hooks

## Data Flow

**Knowledge Generation Flow:**

1. User invokes `/oat:index` skill
2. oat-index analyzes project structure, dependencies, entry points
3. Mapper agents generate specialized analyses (stack.md, architecture.md, structure.md, etc.)
4. Knowledge base stored in `.oat/knowledge/repo/` with project-index.md as entry point
5. Subsequent phases reference generated knowledge for context

**Project Workflow Flow:**

1. `/oat:discovery` phase gathers requirements, creates discovery.md
2. `/oat:spec` phase creates formal specification from discovery insights
3. `/oat:design` phase creates technical design from specification
4. `/oat:plan` phase breaks design into TDD tasks with stable IDs (pNN-tNN format)
5. `/oat:implement` phase executes plan tasks with state tracking
6. Optional `/oat:request-review` gates phases before completion
7. `/oat:pr-project` creates final PR description with full context

**State Management:**
- Project state tracked in `.oat/projects/shared/{name}/state.md`
- Workflow progress tracked via HiL (Human-in-the-Loop) checkpoints
- Git commits linked to task IDs for full traceability
- Knowledge staleness detected via timestamp and git diff checks (>7 days or >20 files changed)

## Key Abstractions

**Agent Skill:**
- Purpose: Reusable workflow unit that can be invoked from Claude Code, Cursor, or CLI
- Examples: `.agents/skills/oat-discovery/`, `.agents/skills/oat-implement/`, `.agents/skills/create-skill/`
- Pattern: YAML manifest + Markdown instructions, referenced via openskills framework

**OAT Project:**
- Purpose: Container for all artifacts related to a development task or feature
- Examples: `.oat/projects/shared/{name}/discovery.md`, `.oat/projects/shared/{name}/`
- Pattern: Structured directory with discovery, spec, design, plan, implementation, and optional reviews/handoffs

**Knowledge Base:**
- Purpose: Generated codebase analysis that informs all subsequent development phases
- Examples: `.oat/knowledge/repo/project-index.md`, `stack.md`, `architecture.md`
- Pattern: Templates filled in by analysis agents, referenced in discovery and planning phases

**TDD Task:**
- Purpose: Atomic unit of implementation work with test-driven structure
- Pattern: Stable ID (pNN-tNN), RED/GREEN/REFACTOR phases, verification commands, commit message
- References: Linked to specification acceptance criteria, tracked in implementation.md

## Entry Points

**CLI Entry Point:**
- Location: `packages/cli/src/index.ts`
- Triggers: `oat` command or `pnpm cli`
- Responsibilities: Command-line interface for OAT operations (currently placeholder)

**Skill Entry Points (Claude Code/Cursor):**
- Locations: `.agents/skills/*/SKILL.md`
- Triggers: `/oat:progress`, `/oat:discovery`, `/oat:spec`, `/oat:design`, `/oat:plan`, `/oat:implement`
- Responsibilities: Invoke workflow phases, provide interactive guidance, generate artifacts

**Knowledge Generation Entry Point:**
- Location: `.agents/skills/oat-index/SKILL.md`
- Triggers: `/oat:index` command
- Responsibilities: Analyze codebase structure, generate knowledge base in `.oat/knowledge/repo/`

**Project Initialization Entry Point:**
- Location: `.agents/skills/oat-new-project/SKILL.md`
- Triggers: `/oat:new-project` command
- Responsibilities: Create new project directory structure under `.oat/projects/`

## Error Handling

**Strategy:** Graceful degradation with context preservation

**Patterns:**
- Knowledge staleness warnings when index >7 days old or >20 files changed
- Mode assertions at phase boundaries (BLOCKED vs ALLOWED activities)
- Self-correction protocols when deviating from workflow
- Human-in-the-loop gates for quality checkpoints before phase transitions

## Cross-Cutting Concerns

**Logging:** Structured logging via `@honeycomb/logger` package (when applicable), console output for CLI

**Validation:** Biome linting for code quality, commitlint for commit messages, TypeScript for type safety

**Traceability:** Stable task IDs linking tasks → commits → PR descriptions, git history as source of truth

---

*Architecture analysis: 2026-02-02*