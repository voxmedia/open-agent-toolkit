# OAT Dogfood Workflow Implementation Plan

> **Optional:** If using Claude Code with superpowers plugin, you can use `superpowers:executing-plans` to execute this plan. Otherwise, execute tasks step-by-step.

**Goal:** Build the OAT workflow system (knowledge generation → discovery → spec → design → plan → implement) by dogfooding it to build itself.

**Architecture:** Skill-coordinated workflow using frontmatter metadata for routing and state management. Knowledge generation via parallel mapper pattern (GSD vendoring). Atomic commits per task with conventional format. Phase-based human-in-the-loop gates.

**Tech Stack:** TypeScript, openskills CLI, git, YAML frontmatter, Zod validation

---

## Phase 1: Foundation & Knowledge Generation

### Task 1: Create Base Directory Structure

**Files:**
- Create: `.oat/knowledge/.gitkeep`
- Create: `.oat/templates/.gitkeep`

**Step 1: Create knowledge directory**

```bash
mkdir -p .oat/knowledge
touch .oat/knowledge/.gitkeep
```

**Step 2: Create templates directory**

```bash
mkdir -p .oat/templates
touch .oat/templates/.gitkeep
```

**Step 3: Verify directory structure**

Run: `ls -la .oat/`
Expected: knowledge/ and templates/ directories exist

**Step 4: Commit**

```bash
git add .oat/
git commit -m "chore: create .oat/ directory structure

- .oat/knowledge/ for codebase analysis artifacts
- .oat/templates/ for workflow templates"
```

---

### Task 2: Vendor GSD Codebase Mapper Agent

**Files:**
- Create: `.agent/agents/oat-codebase-mapper/AGENT.md`
- Create: `.agent/skills/oat-project-index/references/templates/stack.md`
- Create: `.agent/skills/oat-project-index/references/templates/architecture.md`
- Create: `.agent/skills/oat-project-index/references/templates/structure.md`
- Create: `.agent/skills/oat-project-index/references/templates/integrations.md`
- Create: `.agent/skills/oat-project-index/references/templates/testing.md`
- Create: `.agent/skills/oat-project-index/references/templates/conventions.md`
- Create: `.agent/skills/oat-project-index/references/templates/concerns.md`

**Step 1: Create agent directory**

```bash
mkdir -p .agent/agents/oat-codebase-mapper
mkdir -p .agent/skills/oat-project-index/references/templates
```

**Step 2: Copy GSD codebase-mapper agent with attribution header**

Read source: `/Users/thomas.stang/Code/workflow-research/get-shit-done/agents/gsd-codebase-mapper.md`

Create: `.agent/agents/oat-codebase-mapper/AGENT.md` with header:

```markdown
<!--
Vendored from: workflow-research/get-shit-done/agents/gsd-codebase-mapper.md
License: MIT
Attribution: Original work from Get Shit Done workflow system
Modified: 2026-01-27 - Adapted for OAT project structure
-->

[rest of agent content]
```

**Step 3: Adapt agent for OAT paths**

Edit `.agent/agents/oat-codebase-mapper/AGENT.md`:
- Change `.planning/codebase/` → `.oat/knowledge/`
- Update file references to OAT structure
- Add frontmatter generation for all output files

**Step 4: Copy template files from GSD**

Read source templates from: `/Users/thomas.stang/Code/workflow-research/get-shit-done/agents/gsd-codebase-mapper/templates/`

For each template file, add attribution header and frontmatter:

```markdown
---
oat_generated: true
oat_generated_at: YYYY-MM-DD
oat_source_head_sha: {git rev-parse HEAD}
oat_source_main_merge_base_sha: {git merge-base HEAD origin/main}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-project-index"
---

<!--
Template vendored from: workflow-research/get-shit-done/agents/gsd-codebase-mapper/templates/
License: MIT
-->

[rest of template content]
```

**Step 5: Verify all templates exist**

Run: `ls -la .agent/skills/oat-project-index/references/templates/`
Expected: 7 template files (stack.md, architecture.md, structure.md, integrations.md, testing.md, conventions.md, concerns.md)

**Step 6: Commit**

```bash
git add .agent/agents/oat-codebase-mapper/ .agent/skills/oat-project-index/references/
git commit -m "feat(p01-t02): vendor GSD codebase-mapper agent

- Copied from workflow-research/get-shit-done/
- Added MIT license attribution headers
- Adapted paths for OAT structure (.oat/knowledge/)
- Added frontmatter generation to templates
- 7 template files for codebase analysis"
```

---

### Task 3: Create project-index Template

**Files:**
- Create: `.oat/templates/project-index.md`

**Step 1: Create template with SuperClaude-style structure**

```markdown
---
oat_generated: true
oat_generated_at: YYYY-MM-DD
oat_source_head_sha: {sha}
oat_source_main_merge_base_sha: {merge_base_sha}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-project-index"
---

# {Project Name}

## Overview
{2-3 sentence project description}

## Purpose
{Why this project exists, problems it solves}

## Technology Stack
{High-level tech overview - see stack.md for details}

## Architecture
{High-level architecture - see architecture.md for details}

## Key Features
- {Feature 1}
- {Feature 2}
- {Feature 3}

## Project Structure
{Brief directory overview - see structure.md for details}

## Getting Started
{Quick start instructions}

## Development Workflow
{Common development commands and patterns}

## Testing
{Testing approach - see testing.md for details}

## Known Issues
{Link to concerns.md}

---

**Generated Knowledge Base Files:**
- [stack.md](.oat/knowledge/stack.md) - Technologies and dependencies
- [architecture.md](.oat/knowledge/architecture.md) - System design and patterns
- [structure.md](.oat/knowledge/structure.md) - Directory layout
- [integrations.md](.oat/knowledge/integrations.md) - External services
- [testing.md](.oat/knowledge/testing.md) - Test structure and practices
- [conventions.md](.oat/knowledge/conventions.md) - Code style and patterns
- [concerns.md](.oat/knowledge/concerns.md) - Technical debt and issues
```

**Step 2: Verify template exists**

Run: `cat .oat/templates/project-index.md | head -20`
Expected: Template with frontmatter and structure

**Step 3: Commit**

```bash
git add .oat/templates/project-index.md
git commit -m "feat(p01-t03): add project-index template

- SuperClaude-style high-level overview
- Links to detailed knowledge files
- Includes frontmatter for generation tracking"
```

---

### Task 4: Create oat-project-index Skill

**Files:**
- Create: `.agent/skills/oat-project-index/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .agent/skills/oat-project-index
```

**Step 2: Write complete skill with orchestration logic**

Create `.agent/skills/oat-project-index/SKILL.md`:

```markdown
---
name: oat-project-index
description: Generate or regenerate comprehensive knowledge base of the codebase
---

# Knowledge Base Generation

Generate a comprehensive analysis of the codebase using parallel mapper agents.

## Process

### Step 1: Check Existing Knowledge

```bash
ls -la .oat/knowledge/ 2>/dev/null
```

**If exists:**
- List current files with timestamps
- Ask: "Refresh (delete + regenerate) or Skip?"
- If Refresh: `rm -rf .oat/knowledge/*.md && mkdir -p .oat/knowledge`
- If Skip: Exit

**If doesn't exist:**
- Continue to Step 2

### Step 2: Create Knowledge Directory

```bash
mkdir -p .oat/knowledge
```

### Step 3: Get Git SHAs for Frontmatter

```bash
# Get current HEAD SHA
HEAD_SHA=$(git rev-parse HEAD)

# Get merge base with origin/main (fallback to HEAD if not available)
MERGE_BASE_SHA=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

Store as `HEAD_SHA` and `MERGE_BASE_SHA` for frontmatter.

### Step 4: Spawn Parallel Mapper Agents

Use Task tool with `subagent_type="oat-codebase-mapper"` and `run_in_background=true`.

**Agent 1: Tech Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase tech stack"
```

Prompt:
```
Focus: tech

Analyze this codebase for technology stack and external integrations.

Write these documents to .oat/knowledge/:
- stack.md - Languages, runtime, frameworks, dependencies, configuration
- integrations.md - External APIs, databases, auth providers, webhooks

Use templates from .agent/skills/oat-project-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-project-index"
---

Explore thoroughly. Write documents directly. Return confirmation only.
```

**Agent 2: Architecture Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase architecture"
```

Prompt:
```
Focus: arch

Analyze this codebase architecture and directory structure.

Write these documents to .oat/knowledge/:
- architecture.md - Pattern, layers, data flow, abstractions, entry points
- structure.md - Directory layout, key locations, naming conventions

Use templates from .agent/skills/oat-project-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-project-index"
---

Explore thoroughly. Write documents directly. Return confirmation only.
```

**Agent 3: Quality Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase conventions"
```

Prompt:
```
Focus: quality

Analyze this codebase for coding conventions and testing patterns.

Write these documents to .oat/knowledge/:
- conventions.md - Code style, naming, patterns, error handling
- testing.md - Framework, structure, mocking, coverage

Use templates from .agent/skills/oat-project-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-project-index"
---

Explore thoroughly. Write documents directly. Return confirmation only.
```

**Agent 4: Concerns Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase concerns"
```

Prompt:
```
Focus: concerns

Analyze this codebase for technical debt, known issues, and areas of concern.

Write this document to .oat/knowledge/:
- concerns.md - Tech debt, bugs, security, performance, fragile areas

Use template from .agent/skills/oat-project-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-project-index"
---

Explore thoroughly. Write document directly. Return confirmation only.
```

### Step 5: Wait for Agent Completion

Read each agent's output file to collect confirmations.

Expected format:
```
## Mapping Complete

**Focus:** {focus}
**Documents written:**
- `.oat/knowledge/{DOC1}.md` ({N} lines)
- `.oat/knowledge/{DOC2}.md` ({N} lines)
```

### Step 6: Verify All Documents Created

```bash
ls -la .oat/knowledge/
wc -l .oat/knowledge/*.md
```

**Checklist:**
- All 7 documents exist
- No empty documents (each >20 lines)
- All have frontmatter with oat_generated: true

### Step 7: Generate project-index.md

Read all 7 knowledge files to extract key information.

Use template: `.oat/templates/project-index.md`

Write `.oat/knowledge/project-index.md` with:
- Frontmatter with same SHAs as other files
- High-level overview synthesized from detailed files
- Links to all 7 knowledge files

### Step 8: Verify project-index

```bash
cat .oat/knowledge/project-index.md | head -50
```

Expected: Complete overview with frontmatter and links

### Step 9: Commit Knowledge Base

```bash
git add .oat/knowledge/
git commit -m "docs: generate knowledge base

- project-index.md - High-level codebase overview
- stack.md - Technologies and dependencies
- architecture.md - System design and patterns
- structure.md - Directory layout
- conventions.md - Code style and patterns
- testing.md - Test structure and practices
- integrations.md - External services and APIs
- concerns.md - Technical debt and issues

Generated from commit: {MERGE_BASE_SHA}"
```

### Step 10: Output Summary

```
Knowledge base generated in .oat/knowledge/

Files created:
- project-index.md ({N} lines) - High-level overview
- stack.md ({N} lines) - Technologies and dependencies
- architecture.md ({N} lines) - System design and patterns
- structure.md ({N} lines) - Directory layout
- conventions.md ({N} lines) - Code style and patterns
- testing.md ({N} lines) - Test structure and practices
- integrations.md ({N} lines) - External services and APIs
- concerns.md ({N} lines) - Technical debt and issues

---

Next: Start a project with /new-agent-project or explore knowledge files
```

## Success Criteria

- .oat/knowledge/ directory with 8 files (7 analysis + 1 index)
- All files have frontmatter with both head_sha and merge_base_sha
- Commit created with conventional format
- User presented with clear summary and next steps
```

**Step 3: Verify skill content**

Run: `wc -l .agent/skills/oat-project-index/SKILL.md`
Expected: ~200-250 lines with complete orchestration logic

**Step 4: Commit**

```bash
git add .agent/skills/oat-project-index/SKILL.md
git commit -m "feat(p01-t04): implement oat-project-index skill

- Parallel mapper orchestration (4 agents)
- Frontmatter with head_sha + merge_base_sha
- project-index.md synthesis
- Staleness checking support
- Clear user output"
```

---

### Task 5: Register oat-project-index Skill

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add oat-project-index to skills table**

Edit `AGENTS.md`, add after existing skills:

```markdown
<skill>
<name>oat-project-index</name>
<description>Generate or regenerate comprehensive knowledge base of the codebase using parallel mapper agents.</description>
<location>project</location>
</skill>
```

**Step 2: Verify skill appears**

Run: `cat AGENTS.md | grep -A 2 "oat-project-index"`
Expected: Skill entry visible

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "feat(p01-t05): register oat-project-index skill

- Added to AGENTS.md skills table
- Now available via npx openskills read oat-project-index"
```

---

## Phase 2: Workflow Skills - Discovery

### Task 6: Create Discovery and State Templates

**Files:**
- Create: `.oat/templates/discovery.md`
- Create: `.oat/templates/state.md`

**Step 1: Write discovery template**

Create `.oat/templates/discovery.md`:

```markdown
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
---

# Discovery: {Project Name}

## Initial Request

{Copy of user's initial request}

## Clarifying Questions

### Question 1: {Topic}

**Q:** {Question}
**A:** {User's answer}
**Decision:** {What this means for the project}

## Options Considered

### Option A: {Approach Name}

**Description:** {What this approach involves}

**Pros:**
- {Benefit 1}
- {Benefit 2}

**Cons:**
- {Drawback 1}
- {Drawback 2}

**Chosen:** {A/B/Neither} - {Rationale}

## Key Decisions

1. **{Decision Category}:** {Decision made and why}
2. **{Decision Category}:** {Decision made and why}

## Constraints

- {Constraint 1}
- {Constraint 2}

## Success Criteria

- {Criterion 1}
- {Criterion 2}

## Out of Scope

- {Thing we explicitly decided not to do}
- {Thing we might do later}

## Next Steps

Ready for `oat-project-spec` to create formal specification.
```

**Step 2: Write state template**

Create `.oat/templates/state.md`:

```markdown
---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hil_phases: []
oat_parallel_execution: false
---

# Project State: {Project Name}

**Status:** Discovery
**Started:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

## Current Phase

Discovery - Gathering requirements and understanding the problem space

## Progress

- ✓ Discovery started
- ⧗ Awaiting user input

## Blockers

None

## Next Milestone

Complete discovery and move to specification phase
```

**Step 3: Verify templates exist**

```bash
ls -la .oat/templates/
```

Expected: discovery.md and state.md present

**Step 4: Commit**

```bash
git add .oat/templates/discovery.md .oat/templates/state.md
git commit -m "feat(p02-t06): add discovery phase templates

- discovery.md for conversation record
- state.md for workflow tracking
- Phase-based HiL gates (oat_hil_phases)"
```

---

### Task 7: Create oat-project-discover Skill

**Files:**
- Create: `.agent/skills/oat-project-discover/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .agent/skills/oat-project-discover
```

**Step 2: Write skill with discovery process**

Create `.agent/skills/oat-project-discover/SKILL.md`:

```markdown
---
name: oat-project-discover
description: Start discovery phase - gather requirements and understand the problem through structured dialogue
---

# Discovery Phase

Gather requirements and understand the problem space through natural collaborative dialogue.

## Prerequisites

**Required:** Knowledge base must exist. If missing, run `oat-project-index` first.

## Process

### Step 1: Check Knowledge Base Exists

```bash
ls .oat/knowledge/project-index.md 2>/dev/null
```

**If missing:** Block and require `oat-project-index` first.

### Step 2: Check Knowledge Staleness

Read frontmatter from `.oat/knowledge/project-index.md`:

```bash
head -20 .oat/knowledge/project-index.md | grep "oat_source_"
```

Get current HEAD and merge base:
```bash
CURRENT_HEAD=$(git rev-parse HEAD)
CURRENT_MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

**Enhanced staleness check:**
1. Age: Compare `oat_generated_at` vs today (warn if >7 days)
2. Git diff: `git diff --stat {merge_base_sha}..HEAD` (warn if >20 files changed)
3. Line changes: `git diff --shortstat {merge_base_sha}..HEAD` (warn if significant)

**If stale:** Display prominent warning, recommend `oat-project-index` to refresh

### Step 3: Create Project Directory

Ask user for project name (slug format, e.g., "user-auth-refactor").

```bash
mkdir -p .agent/projects/{project-name}
```

### Step 4: Initialize State

Copy template: `.oat/templates/state.md` → `.agent/projects/{project-name}/state.md`

Update frontmatter and content with project details.

### Step 5: Initialize Discovery Document

Copy template: `.oat/templates/discovery.md` → `.agent/projects/{project-name}/discovery.md`

Update with user's initial request.

### Step 6: Read Relevant Knowledge

Read for context:
- `.oat/knowledge/project-index.md`
- `.oat/knowledge/architecture.md`
- `.oat/knowledge/conventions.md`
- `.oat/knowledge/concerns.md`

### Step 7: Ask Clarifying Questions

**One question at a time.** After each answer:
1. Add to discovery.md "Clarifying Questions" section
2. Update frontmatter: `oat_last_updated: {today}`

### Step 8: Explore Approaches

Propose 2-3 approaches with pros/cons. Document in discovery.md.

### Step 9: Confirm Key Decisions

Update discovery.md sections: Decisions, Constraints, Success Criteria, Out of Scope

### Step 10: Mark Discovery Complete

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: oat-project-spec
---
```

### Step 11: Commit Discovery

**Note:** This shows what users will do when USING oat-project-discover.
During implementation of OAT itself, use standard commit format.

```bash
git add .agent/projects/{project-name}/
git commit -m "docs: complete discovery for {project-name}

Key decisions:
- {Decision 1}
- {Decision 2}

Ready for specification phase"
```

### Step 12: Output Summary

```
Discovery phase complete for {project-name}.

Next: Create specification with oat-project-spec
```
```

**Step 3: Commit**

```bash
git add .agent/skills/oat-project-discover/SKILL.md
git commit -m "feat(p02-t07): implement oat-project-discover skill

- Knowledge staleness checking (age + git diff)
- Iterative Q&A with discovery.md updates
- Approach exploration and decision capture
- State management with frontmatter"
```

---

### Task 8: Create Specification Template

**Files:**
- Create: `.oat/templates/spec.md`

**Step 1: Write spec template**

Create `.oat/templates/spec.md`:

```markdown
---
oat_status: draft
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
---

# Specification: {Project Name}

## Problem Statement

{Clear description of the problem being solved}

## Goals

### Primary Goals
- {Goal 1}
- {Goal 2}

### Secondary Goals
- {Nice-to-have 1}

## Non-Goals

- {Explicitly out of scope 1}
- {Explicitly out of scope 2}

## Requirements

### Functional Requirements

**FR1: {Requirement Name}**
- **Description:** {What the system must do}
- **Acceptance Criteria:**
  - {Criterion 1}
  - {Criterion 2}
- **Priority:** P0 / P1 / P2

### Non-Functional Requirements

**NFR1: {Requirement Name}**
- **Description:** {Performance, security, usability requirement}
- **Acceptance Criteria:**
  - {Measurable criterion}
- **Priority:** P0 / P1 / P2

## Constraints

- {Technical constraint 1}
- {Business constraint 1}

## Dependencies

- {External system 1}
- {Existing component 1}

## High-Level Design (Proposed)

{Brief proposed approach - 2-3 paragraphs}

**Key Components:**
- {Component 1} - {Brief description}

**Alternatives Considered:**
- {Alternative 1} - {Why rejected}

**Open Questions:**
- {Question needing resolution}

## Success Metrics

- {Measurable metric 1}
- {Measurable metric 2}

## References

- Discovery: `.agent/projects/{project-name}/discovery.md`
- Knowledge Base: `.oat/knowledge/project-index.md`
```

**Step 2: Commit**

```bash
git add .oat/templates/spec.md
git commit -m "feat(p02-t08): add specification template

- Functional and non-functional requirements
- Priority levels (P0/P1/P2)
- High-level design section (for quick mode)
- Codex ordering: discovery → spec → design"
```

---

### Task 9: Create oat-project-spec Skill

**Files:**
- Create: `.agent/skills/oat-project-spec/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .agent/skills/oat-project-spec
```

**Step 2: Write skill with spec process**

Create `.agent/skills/oat-project-spec/SKILL.md`:

```markdown
---
name: oat-project-spec
description: Create formal specification from discovery - define requirements, constraints, and success criteria
---

# Specification Phase

Transform discovery insights into a formal, detailed specification.

## Prerequisites

**Required:** Discovery must be complete with `oat_ready_for: oat-project-spec`.

## Process

### Step 1: Verify Discovery Complete

Check `.agent/projects/{project-name}/discovery.md` frontmatter for `oat_status: complete`

### Step 2: Read Discovery Context

Read complete discovery.md to extract:
- Problem statement
- Key decisions
- Constraints
- Success criteria
- Out of scope

### Step 3: Initialize Specification

Copy `.oat/templates/spec.md` → `.agent/projects/{project-name}/spec.md`

### Step 4-6: Write Spec Sections

- Problem Statement (from discovery)
- Goals and Non-Goals
- Functional Requirements (with P0/P1/P2 priorities)
- Non-Functional Requirements
- Constraints and Dependencies

### Step 7: Write High-Level Design (Proposed)

**2-3 paragraphs** outlining approach:
- Key components
- Data flow
- Integration points
- Alternatives considered

This seeds the design phase without committing to full architecture.

### Step 8: Review with User

Present spec in 200-300 word sections. Validate each before continuing.

### Step 9: Mark Specification Complete

Update frontmatter:
```yaml
---
oat_status: approved
oat_ready_for: oat-project-design
---
```

### Step 10: Commit Specification

**Note:** Usage example - during OAT implementation, use standard format.

```bash
git commit -m "docs: complete specification for {project-name}

{N} functional requirements (P0/P1/P2)
{N} non-functional requirements

Ready for design phase"
```

### Step 11: Output Summary

```
Specification complete.

Next: Create detailed design with oat-project-design
```
```

**Step 3: Commit**

```bash
git add .agent/skills/oat-project-spec/SKILL.md
git commit -m "feat(p02-t09): implement oat-project-spec skill

- Transform discovery to formal requirements
- Priority levels for all requirements
- High-Level Design section for quick mode
- Incremental user review"
```

---

### Task 10: Create Design Template

**Files:**
- Create: `.oat/templates/design.md`

**Step 1: Write design template**

Create `.oat/templates/design.md` with comprehensive structure (architecture, components, data model, API design, data flows, error handling, security, performance, testing, migration, monitoring).

**Step 2: Commit**

```bash
git add .oat/templates/design.md
git commit -m "feat(p02-t10): add design template

- System components with interfaces
- Data model and API design
- Security and performance considerations
- Full mode required for OAT dogfood"
```

---

### Task 11: Create oat-project-design Skill

**Files:**
- Create: `.agent/skills/oat-project-design/SKILL.md`

**Step 1-2: Implement design skill**

Full design process with incremental user review.

**Step 3: Commit**

```bash
git add .agent/skills/oat-project-design/SKILL.md
git commit -m "feat(p02-t11): implement oat-project-design skill

- Comprehensive technical design
- Architecture approval gate before planning
- Codex ordering: spec → design → plan"
```

---

### Task 12: Create Plan Template

**Files:**
- Create: `.oat/templates/plan.md`

**Step 1: Write plan template**

Standard TDD task format with bite-sized tasks (2-5 minutes).

**Step 2: Commit**

```bash
git add .oat/templates/plan.md
git commit -m "feat(p02-t12): add plan template

- Bite-sized TDD tasks
- Atomic commits
- Optional superpowers:executing-plans reference"
```

---

### Task 13: Create oat-project-plan Skill

**Files:**
- Create: `.agent/skills/oat-project-plan/SKILL.md`

**Step 1-2: Implement planning skill**

Break design into phases and bite-sized tasks.

**Step 3: Commit**

```bash
git add .agent/skills/oat-project-plan/SKILL.md
git commit -m "feat(p02-t13): implement oat-project-plan skill

- Phase and task breakdown
- TDD discipline enforced
- Exact files, code, commands"
```

---

### Task 14: Create Implementation Template

**Files:**
- Create: `.oat/templates/implementation.md`

**Step 1: Write implementation template**

Single file with phase sections (Codex mode-based approach for v1).

**Step 2: Commit**

```bash
git add .oat/templates/implementation.md
git commit -m "feat(p02-t14): add implementation template

- Single file for v1 (serial execution)
- Per-phase files when oat_parallel_execution: true
- Progress tracking and decisions log"
```

---

### Task 15: Create oat-project-implement Skill

**Files:**
- Create: `.agent/skills/oat-project-implement/SKILL.md`

**Step 1-2: Implement execution skill**

Execute plan task-by-task with state tracking and HiL gates.

**Step 3: Commit**

```bash
git add .agent/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t15): implement oat-project-implement skill

- Task-by-task execution with TDD
- Phase-based HiL gates
- State recovery from interruptions
- Mode-based implementation logs"
```

---

### Task 16: Create oat-project-progress Router Skill

**Files:**
- Create: `.agent/skills/oat-project-progress/SKILL.md`

**Step 1-2: Implement router skill**

Knowledge-first enforcement, staleness detection, next skill recommendation.

**Step 3: Commit**

```bash
git add .agent/skills/oat-project-progress/SKILL.md
git commit -m "feat(p02-t16): implement oat-project-progress router

- Knowledge-first enforcement
- Enhanced staleness detection
- Project status and next-skill routing
- Blocker detection"
```

---

### Task 17: Register All Workflow Skills

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add all skills to table**

Add: oat-project-discover, oat-project-spec, oat-project-design, oat-project-plan, oat-project-implement, oat-project-progress

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "feat(p02-t17): register all OAT workflow skills

- oat-project-discover: requirements gathering
- oat-project-spec: formal specification
- oat-project-design: technical architecture
- oat-project-plan: implementation planning
- oat-project-implement: execution with state tracking
- oat-project-progress: workflow router"
```

---

## Phase 3: Documentation and Examples

### Task 18: Update README

**Files:**
- Modify: `README.md`

**Step 1-2: Add OAT Workflow section**

Document workflow phases, knowledge base, progress checking.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs(p03-t18): document OAT workflow in README

- Knowledge base generation
- Workflow phases (discovery → spec → design → plan → implement)
- Progress checking with oat-project-progress"
```

---

### Task 19: Final Verification

**Files:**
- None (verification task)

**Step 1: Verify all skills registered**

```bash
cat AGENTS.md | grep "<name>oat-"
```

Expected: 6 skills (index, discovery, spec, design, plan, implement, progress)

**Step 2: Verify all templates exist**

```bash
ls -la .oat/templates/
```

Expected: 7 templates

**Step 3: Verify directory structure**

```bash
tree -L 3 .agent/ .oat/
```

**Step 4: Verify all skills load**

```bash
npx openskills read oat-project-index,oat-project-discover,oat-project-spec,oat-project-design,oat-project-plan,oat-project-implement,oat-project-progress
```

Expected: All skills load without errors

**Step 5: Run type check and lint**

```bash
pnpm type-check
pnpm lint
```

Expected: No errors

---

## Implementation Complete

**3 Phases:**
- Phase 1: Foundation & Knowledge Generation (5 tasks)
- Phase 2: Workflow Skills (12 tasks)
- Phase 3: Documentation (2 tasks)

**Total: 19 tasks**

All blockers from feedback addressed:
- ✅ Vendoring paths fixed (workflow-research/get-shit-done/)
- ✅ skill.json removed (only SKILL.md needed)
- ✅ Superpowers references made optional
- ✅ Both SHA fields added (head_sha + merge_base_sha)
- ✅ Clear separation of implementation vs usage examples
- ✅ Codex ordering: discovery → spec → design → plan
- ✅ Single implementation.md for v1
- ✅ Phase-based HiL gates (oat_hil_phases)

Ready for execution.
