---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Agent Skill Framework + Workflow Orchestration

**Key Characteristics:**
- Agent-agnostic skills system compatible with Claude Code, Cursor, and other AI assistants
- Monorepo with pnpm workspaces
- OAT workflow methodology (Discovery → Spec → Design → Plan → Implement)
- Knowledge-first enforcement (codebase analysis before development)
- Templated, traceability-driven design with human-in-the-loop checkpoints

## Layers

**Skill Definition Layer:**
- Location: `.agent/skills/`
- Contains: SKILL.md manifests, reference templates, embedded scripts
- Purpose: Define executable agent workflows

**Project Orchestration Layer:**
- Location: `.agent/projects/`
- Contains: discovery.md, spec.md, design.md, plan.md, implementation.md
- Purpose: Manage multi-phase projects with state tracking

**Knowledge Base Layer:**
- Location: `.oat/knowledge/repo/`
- Contains: project-index.md, architecture.md, stack.md, etc.
- Purpose: Store analyzed codebase metadata

**Configuration & Templates Layer:**
- Location: `.oat/templates/`, root config files
- Contains: OAT document templates, build configs
- Purpose: Provide reusable templates and configuration

**CLI & Runtime Layer:**
- Location: `packages/cli/src/`
- Contains: CLI implementation (currently placeholder)
- Purpose: Programmatic access to OAT tools

## Data Flow

**Workflow Initialization:**
1. Developer invokes `/oat:progress` or skill shortcut
2. Skill loads project-index.md for orientation
3. If stale/missing, `/oat:index` is recommended
4. `/oat:index` spawns parallel mapper agents
5. Mappers write enriched documents to `.oat/knowledge/repo/`

**Project Execution:**
1. Discovery → discovery.md
2. Specification → spec.md
3. Design → design.md
4. Planning → plan.md (with task IDs: p01-t01, etc.)
5. Implementation → per-task commits
6. Review → reviews/ directory
7. PR → pr-description.md

## Key Abstractions

**Skill:**
- Reusable workflow definition in SKILL.md
- Markdown-based with embedded prompts and process steps

**Workflow Phase:**
- Distinct stage (Discovery, Spec, Design, Plan, Implement)
- Phase-specific document with defined structure

**Project:**
- Collection of artifacts for a development initiative
- Directory with discovery.md, planning.md, implementation.md

**Knowledge Document:**
- Analysis of codebase aspect
- Markdown with frontmatter metadata

## Entry Points

**Skill Shortcuts:**
- `/oat:progress` - Check project status
- `/oat:index` - Generate/refresh knowledge base
- `/oat:discovery` - Start discovery phase
- `/oat:spec`, `/oat:design`, `/oat:plan`, `/oat:implement`
- `/oat:request-review`, `/oat:receive-review`
- `/oat:pr-progress`, `/oat:pr-project`

**CLI:**
- `npx openskills read <skill-name>`
- `pnpm build`, `pnpm dev`, `pnpm test`

## Error Handling

**Strategy:** Fail loudly with actionable guidance

**Patterns:**
- Missing knowledge base → recommend `/oat:index`
- Git context lost → frontmatter tracks HEAD_SHA
- Phase dependency violations → check prerequisites
- Graceful degradation → thin index for quick feedback

---

*Architecture analysis: 2026-01-28*
