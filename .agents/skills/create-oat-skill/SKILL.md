---
name: create-oat-skill
description: Use when adding a new oat-* workflow skill or lifecycle action. Scaffolds the skill with OAT conventions like mode assertions, progress banners, and project-root resolution.
argument-hint: "[skill-name]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Create OAT Skill

Create a new OAT workflow skill under `.agents/skills/` that follows OAT conventions (mode assertion, progress banners, project resolution, and safe bash patterns).

## Baseline Guidance (Required)

This skill is a specialization of the general skill-creation workflow.

- Follow the baseline principles and structure from `.agents/skills/create-skill/SKILL.md` (progressive disclosure, section layout, examples, troubleshooting, success criteria).
- This skill adds/overrides only the OAT-specific requirements (progress banners, `{PROJECTS_ROOT}` + `.oat/active-project` resolution, and OAT-safe bash patterns).

## When to Use

Use when:
- Adding a new `oat-*` workflow skill
- Adding a new workflow phase or lifecycle action
- Standardizing a “one-off” workflow into a reusable OAT skill

## When NOT to Use

Don’t use when:
- You only need to update an existing skill
- The workflow is still exploratory and may change daily

## Arguments

Parse from `$ARGUMENTS`:
- **skill-name**: (required) kebab-case name (e.g., `oat-backlog-refine`, `oat-archive-project`)

## Workflow

### Step 1: Collect Inputs

If not provided, ask the user for:
- Skill name (kebab-case)
- Description using the create-skill formula: `Use when [trigger condition]. [What it does for disambiguation].`
- Whether this is `oat-*` (should be for this skill)
- Whether it needs project context (`.oat/active-project`) or is repo-level

### Step 2: Draft the Skill Using the OAT Template

Use `.agents/skills/create-oat-skill/references/oat-skill-template.md` as the base.

**Required sections (don’t omit):**
- `## Mode Assertion`
- `## Progress Indicators (User-Facing)` (with separator banner)
- `### Step 0: Resolve Active Project` (if project-scoped)
- `## Success Criteria`

**Progress indicators (required):**
- Start-of-skill banner with horizontal separators:
  - `OAT ▸ {LABEL}` (uppercase label)
- A few short step indicators for multi-step work (2–5 lines)
- For long-running operations, print a “starting…” line and a “done” line (duration optional)

### Step 3: Apply OAT Conventions

**Project root resolution (required for project-scoped skills):**
- Always resolve `{PROJECTS_ROOT}` via:
  - `$OAT_PROJECTS_ROOT` env var
  - `.oat/projects-root`
  - fallback `.oat/projects/shared`
- Never hardcode `.oat/projects/shared` directly except as the fallback.

**Active project (required for project-scoped skills):**
- Prefer `.oat/active-project` as the pointer.
- If missing/invalid: prompt for `{project-name}`, derive `PROJECT_PATH="${PROJECTS_ROOT}/{project-name}"`, then write `.oat/active-project`.

**Bash safety (recommended):**
- Prefer portable bash (`set -eu`, avoid `pipefail` unless explicitly handled).
- Quote variables; validate user-provided names; prevent path traversal.

### Step 4: Create Files

Create:
- `.agents/skills/{skill-name}/SKILL.md`

If the skill needs templates/scripts, add:
- `.agents/skills/{skill-name}/references/…`
- `.agents/skills/{skill-name}/scripts/…`

### Step 5: Register the Skill

Update `AGENTS.md` to include the new skill under `<available_skills>`.

If `npx openskills sync -y` is available, it can be used. Otherwise, update `AGENTS.md` manually.

Run OAT validator and resolve findings:

```bash
pnpm oat:validate-skills
```

## Examples

### Basic Usage

```
/create-oat-skill oat-backlog-refine
```

### Conversational

```
We should add a new OAT skill to archive completed projects. Create the skill with the standard OAT sections and progress banners.
```

## Success Criteria

- ✅ New skill created at `.agents/skills/{skill-name}/SKILL.md`
- ✅ Skill includes required OAT sections (mode + progress + project resolution if applicable)
- ✅ Skill registered in `AGENTS.md`
- ✅ `pnpm oat:validate-skills` passes
