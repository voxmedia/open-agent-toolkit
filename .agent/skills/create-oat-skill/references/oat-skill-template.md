---
name: {skill-name}
description: {One sentence: when to use this skill}
argument-hint: "[args]"
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

- Before multi-step work, print 2–5 short step indicators (don’t print a line for every shell command).
- For long-running operations, print a brief “starting…” line and a matching “done” line (duration optional).

## Process

### Step 0: Resolve Active Project (project-scoped skills)

If this skill is project-scoped, resolve `PROJECT_PATH` and `PROJECTS_ROOT`:

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo \".agent/projects\")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If `PROJECT_PATH` is missing/invalid:
- Ask for `{project-name}`
- Set `PROJECT_PATH="${PROJECTS_ROOT}/{project-name}"`
- Write `.oat/active-project`

### Step 1: {First Step}

{Instructions…}

### Step 2: {Second Step}

{Instructions…}

## Success Criteria

- ✅ {Criterion}
- ✅ {Criterion}
