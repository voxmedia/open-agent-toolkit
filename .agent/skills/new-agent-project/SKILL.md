---
name: new-agent-project
description: Initialize a new agent project with structured workflow for discovery, planning, and implementation. Use when starting a new feature, refactor, or multi-session development task.
argument-hint: "[project-name]"
disable-model-invocation: true
allowed-tools: Bash(npx tsx:*), Read, AskUserQuestion, Task(explore-gather)
user-invocable: true
---

# New Agent Project

Initialize a new agent project with a structured workflow for discovery, planning, and implementation.

## Overview

This skill creates a project directory in `.agent/projects/<project-name>/` with documentation files that help maintain context across coding sessions. It also uses the `explore-gather` subagent to automatically gather relevant codebase context.

## Workflow

### Step 1: Gather Project Information

**Gather required information:**

1. **Project name** (kebab-case, e.g., `user-authentication-refactor`, `api-rate-limiting`)
   - If not provided in `$ARGUMENTS`, ask the user

2. **Project description** - Ask the user for a brief description of what this project will accomplish. This is used to gather relevant codebase context.

3. **Optional components** - ALWAYS ask the user which to include (default all to "yes"):
   - **Reviews directory** - For storing review documents (planning reviews, implementation reviews, etc.)
   - **Handoffs directory** - For context handoff documents between agent sessions or phases
   - **PR description file** - For drafting the pull request description

### Step 2: Create Project Scaffolding

Run the scaffolding script with the appropriate flags:

```bash
npx tsx .agent/scripts/new-agent-project.ts <project-name> [options]
```

**Options:**
- `--with-reviews` / `--no-reviews` - Include or exclude reviews directory
- `--with-handoffs` / `--no-handoffs` - Include or exclude handoffs directory
- `--with-pr-description` / `--no-pr-description` - Include or exclude PR description file

**Example:**
```bash
npx tsx .agent/scripts/new-agent-project.ts user-auth-refactor --with-reviews --with-handoffs --with-pr-description
```

### Step 3: Gather Codebase Context (Automatic)

After creating the project scaffolding, use the `explore-gather` subagent to automatically explore the codebase and gather relevant context based on the project description.

**Invoke the subagent:**
```
Use the explore-gather subagent to gather context for this project:
[Include the user's project description here]
```

The subagent will return structured exploration results including:
- Relevant source files
- Documentation references
- Related packages/dependencies
- Existing patterns and conventions
- Complexity indicators

**If the subagent fails or times out:**
- Inform the user that the subagent failed and you'll perform the exploration directly
- Perform the exploration yourself using Glob, Grep, and Read tools
- Search for relevant files, documentation, and patterns based on the project description
- Continue with the discovery phase using your own findings

### Step 4: Begin Discovery Phase

After gathering context, guide the user through the discovery phase:

1. Open `.agent/projects/<project-name>/discovery.md`
2. Add the exploration results under a "## Codebase Exploration Results" section
3. Review the findings with the user
4. Start gathering requirements by asking clarifying questions
5. Document functional and non-functional requirements
6. Identify constraints and dependencies
7. Confirm alignment before moving to planning

## Project Structure

The script creates the following structure:

```
.agent/projects/<project-name>/
├── discovery.md        # Requirements gathering and alignment
├── planning.md         # Detailed implementation planning
├── implementation.md   # Progress tracking and documentation
├── pr-description.md   # (optional) PR description draft
├── reviews/            # (optional) Review documents
│   └── README.md
└── handoffs/           # (optional) Context handoff documents
    └── README.md
```

### Core Files (Always Created)

- **discovery.md** - Gather and document project requirements, ask clarifying questions, confirm alignment
- **planning.md** - Outline approach, architecture decisions, implementation phases, risks
- **implementation.md** - Track progress, code changes, decisions, deviations from plan

### Optional Components

- **reviews/** - Store review documents generated during the project lifecycle (planning-review.md, implementation-review.md, phase-N-review.md)
- **handoffs/** - Store handoff documents for transitioning between agent sessions or phases
- **pr-description.md** - Draft PR description that evolves during implementation. Use the `/create-pr-description` skill to generate a comprehensive PR description based on git changes and project context.

## Key Principles

- **Discovery First**: Always start by understanding requirements fully
- **Context Gathering**: Use `explore-gather` to find relevant code and documentation
- **Iterative**: Collaborate with the user at each phase
- **Documentation**: Keep detailed notes for context across sessions
- **Handoffs**: Create handoff documents when transitioning between sessions or phases
- **Reviews**: Request reviews at key milestones to validate approach

## Subagent Integration

The `explore-gather` subagent is a fast exploration specialist that gathers relevant context for the project. It uses the Haiku model for speed and focuses on:

- Finding relevant source files and their purposes
- Locating related documentation (internal and external)
- Identifying package dependencies and relationships
- Discovering existing patterns and conventions to follow
- Assessing complexity indicators and potential challenges

**Note:** The subagent is read-only and will not modify any files. It reports findings without making recommendations - the main agent uses those findings to inform the discovery process.

## Additional Resources

See [.agent/README.md](../../README.md) for the complete agent workflow documentation.
