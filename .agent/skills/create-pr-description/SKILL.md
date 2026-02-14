---
name: create-pr-description
description: Create a comprehensive PR description document based on git changes, planning documents, and project context. Use when ready to create or finalize a pull request description.
argument-hint: "[project-name] [--sha=<commit>] [--jira=<ticket>] [--detail=min|mod|max]"
disable-model-invocation: true
allowed-tools: Bash(git:*), Read, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Create PR Description

Creates a comprehensive PR description document based on git changes, planning documents, and project context.

## Arguments

Parse the following from `$ARGUMENTS`:
- **project-name or filename**: Where to save the PR description
- **--sha=<commit>**: Starting commit SHA for git diff analysis
- **--jira=<ticket>**: Jira ticket number or link
- **--detail=min|mod|max**: Detail level (minimum, moderate, maximum)

Example: `/create-pr-description user-auth-refactor --sha=abc123 --jira=JIRA-1234 --detail=max`

## Instructions

### Step 1: Determine File Location

If a project name/filename is provided in arguments, check if it matches an existing project directory under the configured projects root (or legacy `.agent/projects/`).

Determine projects root:
```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".agent/projects")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If `{project-name}` exists under `$PROJECTS_ROOT/`, use that project's `pr-description.md` file.
If not found, fallback to checking `.agent/projects/{project-name}/`.

If no location is provided, ask the user:
- **Option A**: `.agent/projects/pr-descriptions/<filename>.md` (standalone PRs)
- **Option B**: `${PROJECTS_ROOT}/<project-name>/pr-description.md` (existing project directory)

Suggest filename based on context:
- `<project-name>.md` (e.g., `openapi-automation-workflow.md`)
- `<jira-ticket>.md` (e.g., `JIRA-1234.md`)
- `pr-description.md` (if in project directory)

### Step 2: Gather Information

Only prompt for information not provided in arguments:

1. **Detail level**: Minimum / Moderate / Maximum (if not `--detail`)
2. **Jira ticket number/link** (if not `--jira`)
3. **Starting commit SHA** (if not `--sha`)
4. **Planning documents** to reference (from current chat or existing files)
5. **Repository URL** (e.g., `https://github.com/org/repo`) (for generating GitHub blob links)

Get current branch automatically:
- Run `git branch --show-current` to get the current branch name
- Use this branch name in all GitHub blob URLs

### Step 3: Analyze Changes

If commit SHA provided:
1. Run `git diff <sha>` to review all changes
2. Assess complexity and scope
3. **Recommend structure approach**:
   - **Standard template** (PULL_REQUEST_TEMPLATE.md structure) for:
     - Simple changes explainable in bullet points
     - Infrastructure/tooling setup
     - Documentation updates
     - Configuration changes
     - Bug fixes and straightforward features
     - File organization changes
   - **Expanded structure** for:
     - Complex multi-component features
     - Changes needing extensive context
     - Modifications affecting multiple systems
     - Performance optimizations needing detailed rationale
4. Wait for user confirmation of structure choice

### Step 4: Create PR Description

**For Standard Template Structure:**
Use these sections (matching PULL_REQUEST_TEMPLATE.md heading levels):
- **Purpose**: Context, Jira link, problem statement
- **Changes**: Bullet list with checkboxes, audience classification
- **Launch Plan**: Deployment steps, rollout plan
- **GIF**: Suggest relevant GIPHY GIF

**For Expanded Structure:**
Use these sections when standard template is insufficient:

```markdown
# [Project Name]

## Overview
Brief summary and purpose

## Context & Background
- Jira link: [TICKET-NUMBER](https://vmproduct.atlassian.net/browse/TICKET-NUMBER)
- Background and motivation
- Problem statement

## Changes Summary
High-level overview

## Detailed Implementation
### Component/Feature 1
- What was changed
- Why it was changed
- How it works

[Repeat for each major component]

## Technical Details
- Architecture decisions
- Dependencies added/removed
- Configuration changes
- Database changes

## Testing Strategy
- Unit tests
- Integration tests
- Manual testing performed

## Deployment Considerations
- Migration steps
- Environment variables
- Feature flags
- Rollback plan

## QA Notes
- Test scenarios
- Edge cases
- Known limitations

## Follow-up Items
- Future improvements
- Technical debt
- Related tickets
```

### Step 5: Content Guidelines

- **Use clear headings** organized by topic
- **Include code examples** when illustrating changes
- **Link to committed files** using GitHub blob URLs:
  - Format: `https://github.com/org/repo/blob/<branch-name>/<file-path>`
  - Example: `https://github.com/voxmedia/warehouse/blob/feature/openapi-automation/src/workflows/openapi-update.yml`
  - Get branch name by running `git branch --show-current`
  - Make links clickable: `[filename](blob-url)` or `[descriptive text](blob-url)`
- **Never reference `.agent/` directory** files (not version controlled, reviewers can't access)
- **Reference planning documents** as context but don't link to them in the PR description
- **Scale detail** to the requested level (minimum/moderate/maximum)
- **Include rationale** for decisions when using maximum detail

### Step 6: Review and Finalize

After creating the document:
1. Verify all Jira links are properly formatted
2. Verify all GitHub blob links use correct branch name and repository URL
3. Ensure no references to `.agent/` directory files
4. Confirm structure matches the chosen approach
5. Save to the agreed-upon file location

## Examples

### Basic Usage

```
/create-pr-description JIRA-1234
```

```
/create-pr-description openapi-automation --sha=def456 --detail=max
```

```
/create-pr-description user-auth-refactor --jira=DWP-123
```

### Conversational

```
Create a PR description for JIRA-1234 bug fix using the standard template
```

```
Create PR description for the OpenAPI automation workflow with maximum detail, starting from commit def456
```

```
Use the planning docs from the user-auth-refactor project to create the PR description
```
