---
name: { skill-name }
version: 1.0.0
# Required: semver. Start new skills at 1.0.0; bump patch/minor/major for fixes, backward-compatible additions, and breaking changes.
description: Use when {trigger condition}. {What this skill does for disambiguation.}
argument-hint: '[args]'
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep
user-invocable: true
---

# {Skill Title}

{1–2 sentences describing what this skill does.}

## Prerequisites

- {What must exist before running this skill}

## Mode Assertion

**OAT MODE: {Mode Name}**

**Purpose:** {What this phase accomplishes}

**BLOCKED Activities:**

- {Explicitly forbidden behaviors}

**ALLOWED Activities:**

- {Explicitly allowed behaviors}

**Self-Correction Protocol:**
If you catch yourself:

- {Deviation} → STOP ({what to do})

**Recovery:**

1. {Step}
2. {Step}

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ {LABEL}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators with the `[N/N]` format, e.g.:
  - `[1/3] {First major action}…`
  - `[2/3] {Second major action}…`
  - `[3/3] {Final action}…`
- Replace the examples above with skill-specific step labels that match the actual process steps. Do not leave generic placeholders.

## Process

### Step 0: Resolve Active Project (project-scoped skills)

If this skill is project-scoped, resolve `PROJECT_PATH` and `PROJECTS_ROOT`:

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo \".oat/projects/shared\")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If `PROJECT_PATH` is missing/invalid:

- Ask for `{project-name}`
- Set `PROJECT_PATH="${PROJECTS_ROOT}/{project-name}"`
- Persist with `oat config set activeProject "$PROJECT_PATH"`.
- TODO(back-compat): validate `oat config` exists on older target branches before relying on this snippet.

### Step 1: {First Step}

{Instructions…}

### Step 2: {Second Step}

{Instructions…}

## Success Criteria

- ✅ {Criterion}
- ✅ {Criterion}
