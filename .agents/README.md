# Agent Instructions

This document provides guidance for creating and managing AI agent rules across different platforms.

## Agent Project Structure

This project supports multiple AI coding assistants through a structured approach:

- `.oat/projects/shared/` - Agent project documentation (gitignored)
- `.agents/skills/` - Canonical shared skills for provider sync
- `.cursor/rules/` - Cursor-specific rules
- `CLAUDE.md` - Claude Code project instructions
- `AGENTS.md` - Project-level skill and workflow instructions

### Skills

Skills live in `.agents/skills/` and sync to provider views via `oat sync --apply`.

See [AI Skills Documentation](apps/honeycomb-docs/docs/ai/skills.md) for details.

## Agent-Agnostic Project Structure

The `.oat/projects/` and `.agents/` directories contain documentation and skills that work with any AI coding assistant (Cursor, GitHub Copilot, Claude, etc.):

- `.oat/projects/shared/` - Personal project documentation (gitignored)
- `.agents/skills/` - Canonical shared skills
- `.agents/skills/<skill>/scripts/` - Skill-local helper scripts

### Projects Directory Structure

The `.oat/projects/shared/` directory supports two organizational approaches:

#### Option 1: Project-Specific Directories
For complex features or multi-session development work:

```
.oat/projects/shared/
├── keep.md
├── user-authentication-refactor/
│   ├── discovery.md          # Requirements gathering
│   ├── planning.md           # Implementation planning
│   ├── implementation.md     # Progress tracking
│   ├── pr-description.md     # (optional) PR draft
│   ├── reviews/              # (optional) Review documents
│   │   └── README.md
│   └── handoffs/             # (optional) Context handoffs
│       └── README.md
└── api-rate-limiting/
    ├── discovery.md
    ├── planning.md
    ├── implementation.md
    └── pr-description.md
```

#### Option 2: Standalone PR Descriptions
For quick fixes, small changes, or one-off improvements:

```
.oat/projects/shared/
├── keep.md
├── pr-descriptions/
│   ├── keep.md
│   ├── quick-bug-fix.md
│   ├── JIRA-1234.md
│   └── hotfix-security-patch.md
```

### Creating a New Project

Use the scaffolding script to quickly set up a new agent project from the project root:

```bash
npx tsx .agents/skills/new-agent-project/scripts/new-agent-project.ts <project-name> [options]
```

**Options:**
- `--with-reviews` / `--no-reviews` - Include or exclude reviews directory
- `--with-handoffs` / `--no-handoffs` - Include or exclude handoffs directory
- `--with-pr-description` / `--no-pr-description` - Include or exclude PR description file

If options are not provided, you will be prompted interactively.

**AI Assistant Skills:**
- `/new-agent-project` - Available in both Claude Code and Cursor

This creates a new directory in `.oat/projects/shared/<project-name>/` with:

**Core files (always created):**
- `discovery.md` - Requirements gathering and alignment
- `planning.md` - Detailed implementation planning
- `implementation.md` - Progress tracking and documentation

**Optional components:**
- `pr-description.md` - PR description draft
- `reviews/` - Directory for review documents
- `handoffs/` - Directory for context handoff documents

### Typical Development Workflow

1. **Discovery Phase** (`discovery.md`)
   - Gather and document project requirements
   - Ask clarifying questions and identify constraints
   - Understand functional and non-functional requirements
   - Confirm alignment with stakeholders before planning

2. **Planning Phase** (`planning.md`)
   - Outline project requirements and approach
   - Collaborate with AI assistant to refine the plan
   - Reference existing codebase patterns and constraints
   - Document architectural decisions and alternatives considered

3. **Implementation Phase** (`implementation.md`)
   - Track progress and decisions made during development
   - Document code changes and rationale
   - Note any deviations from the original plan
   - Record challenges encountered and solutions found
   - Maintain detailed notes to serve as reference for PR description

4. **PR Creation Phase** (`pr-description.md` or standalone file)
   - Review implementation.md for comprehensive context
   - Reference planning and discovery docs to understand project catalyst
   - Create comprehensive PR description for GitHub
   - Include testing notes and deployment considerations
   - Use the PR Description Rules for guidance on structure and placement
   - Use the `/create-pr-description` skill to generate a comprehensive PR description based on git changes and project context

5. **Reviews** (`reviews/` directory)
   - Request reviews at key milestones to validate approach
   - Store planning reviews, implementation reviews, and code reviews
   - Use reviews to catch issues early and ensure quality
   - Typical files: `planning-review.md`, `implementation-review.md`, `phase-N-review.md`

6. **Handoffs** (`handoffs/` directory)
   - Create handoff documents when transitioning between sessions or phases
   - Enable fresh agent sessions to pick up context efficiently
   - Useful for multi-phase projects or parallel agent work
   - Include: current state, work completed, work remaining, key decisions, next steps

### Benefits of This Approach

- **Continuity**: Maintain context across coding sessions
- **AI Collaboration**: Assistants can reference previous decisions and context
- **Personal Documentation**: Keep working notes private to your local machine (if/once you're ready to create finalized documentation for the team, use the MkDocs app and reference these files)
- **PR Quality**: Rich context for creating comprehensive PR descriptions
- **Agent Agnostic**: Works with any AI coding assistant
- **Session Independence**: Handoff documents enable clean context transitions between agent sessions
- **Quality Gates**: Review documents provide checkpoints for validating approach and catching issues

## Subagents (Claude Code Only)

Subagents are specialized AI assistants that can be delegated to for focused tasks. They live in `.claude/agents/` and are only available in Claude Code (not Cursor).

### Available Subagents

| Subagent | Model | Purpose |
|----------|-------|---------|
| `explore-gather` | Haiku | Fast codebase exploration for discovery phase |
| `plan-reviewer` | Sonnet | Review planning documents for completeness and feasibility |
| `doc-validator` | Haiku | Validate documentation against repository standards |

### Usage

Subagents are invoked automatically or manually:

- **`explore-gather`**: Automatically invoked by `/new-agent-project` skill after you provide a project description
- **`plan-reviewer`**: Invoke manually after completing planning.md
- **`doc-validator`**: Invoke manually when creating/updating documentation

**Example manual invocation:**
```
Use the plan-reviewer subagent to review:
.oat/projects/shared/my-feature/planning.md
```

### Loading Subagents

After pulling changes that add or modify subagents:

1. Run `/agents` in Claude Code to reload, OR
2. Restart your Claude Code session

See [AI Subagents Documentation](apps/honeycomb-docs/docs/ai/subagents.md) for full details.

## Creating Cursor Rules

Cursor rules are stored in `.cursor/rules/` directory as `.mdc` files with front matter:

```markdown
---
description: Brief description of the rule
globs: file/pattern/to/match/**/*.ext
alwaysApply: false
---

# Rule Title

Rule content in markdown format...
```

### Front Matter Options:
- `description`: Brief explanation of what the rule does
- `globs`: File patterns where this rule applies (comma-separated for multiple patterns)
- `alwaysApply`: Set to `true` if rule should always be active, `false` if context-dependent

### Best Practices:
- Use descriptive filenames (e.g., `pr-description-rules.mdc`)
- Include clear examples and use cases
- Specify appropriate glob patterns to target relevant files
- Document when to use vs. when not to use the rule

## Creating Claude Markdown Rules

Claude rules are stored in `CLAUDE.md` file in the project root. They use a simpler format without front matter:

```markdown
# Rule Title

Rule content in markdown format...
```

### Example File and Opt-in Approach

This project includes `CLAUDE.example.md` as a reference template generated from the Cursor rules using the conversion tool. The actual `CLAUDE.md` file is gitignored to make it opt-in - it won't automatically appear in your codebase.

To use Claude instructions, you can:

1. Copy `CLAUDE.example.md` to `CLAUDE.md` to use the converted rules
2. Use the example as a starting point and customize `CLAUDE.md` for your needs
3. Create your own `CLAUDE.md` from scratch

This opt-in approach ensures developers only get Claude instructions if they explicitly want them.

## Converting Cursor Rules to Claude Rules

Use the `cursor-rules-to-claude` tool to convert Cursor rules to Claude format:

```bash
npx cursor-rules-to-claude [options]

Options:
  --overwrite        Overwrite CLAUDE.md instead of appending (default: false)
  --rules-dir <dir>  Cursor rules directory (default: ".cursor/rules")
  --output <file>    Output file (default: "CLAUDE.md")
  --help             Display help
  --version          Display version
```

### Examples:

```bash
# Convert all rules and append to CLAUDE.md
npx cursor-rules-to-claude

# Overwrite CLAUDE.md with converted rules
npx cursor-rules-to-claude --overwrite

# Generate the example file (how CLAUDE.example.md was created)
npx cursor-rules-to-claude --output CLAUDE.example.md --overwrite

# Convert rules from custom directory
npx cursor-rules-to-claude --rules-dir .cursor/rules

# Output to custom file
npx cursor-rules-to-claude --output AI-INSTRUCTIONS.md
```

### Using the Example File:

```bash
# Copy example to create your own CLAUDE.md
cp CLAUDE.example.md CLAUDE.md

# Or customize it as needed for your workflow
```
