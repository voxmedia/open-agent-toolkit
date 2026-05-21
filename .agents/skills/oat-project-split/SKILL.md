---
name: oat-project-split
version: 1.0.0
description: Use when a discovery or brainstorm should split one broad scope into coordinated OAT child projects.
argument-hint: '--plan-file <path>'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(oat:*), Bash(pnpm:*), Glob, Grep, AskUserQuestion
---

# Split OAT Project

Decompose a confirmed multi-project discovery or brainstorm into a coordination-only parent and flat child projects.

## Mode Assertion

Use this skill only after one of these split triggers is present:

- The user explicitly declared the work is multiple projects.
- Discovery signals crossed the split threshold and the user confirmed.
- End-of-discovery convergence confirmed that the scope should split.
- The brainstorm destination picker selected a split into projects.

Detected split recommendations in non-interactive mode must fail fast through the CLI run command; do not silently split or silently continue as one project.

## Progress Indicators (User-Facing)

Print a banner once at start:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PROJECT SPLIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Before multi-step work, print step indicators:

- `[1/5] Writing coordination parent...`
- `[2/5] Scaffolding and seeding children...`
- `[3/5] Marking parent terminal...`
- `[4/5] Selecting active child...`
- `[5/5] Refreshing dashboard...`

## Process

### Step 1: Resolve Split Plan

Require a persisted `SplitPlanDocument` JSON file. If `$ARGUMENTS` does not include `--plan-file <path>`, ask for the plan file path before proceeding.

### Step 2: Run Split Orchestrator

Invoke the CLI as the single execution entry point:

```bash
oat project split run --plan-file "{plan-file}"
```

Use `--non-interactive` only when the caller is running without a human confirmation path.

### Step 3: Write Coordination Parent

The run command writes the parent project as `oat_kind: coordination`, persists `references/split-plan.json`, records ordered children in `state.md`, writes the broad `discovery.md` with any integration sketch, and removes executable phase files.

### Step 4: Scaffold + Seed Children

The run command scaffolds each child in plan order and writes split-specific child discovery content from scratch with the required inherited-context revalidation gate.

### Step 5: Mark Parent Terminal + Select Active Child

The run command marks the parent `oat_phase: decomposition` and `oat_phase_status: complete`, then activates the initial child using the repo-relative project path.

### Step 6: Resume From Partial State

If a previous split wrote a coordination parent but did not finish all children, the run command resumes from `references/split-plan.json`. Do not reconstruct missing child seed data from slugs alone.

## Success Criteria

- Coordination parent exists and has no `spec.md`, `design.md`, `plan.md`, or `implementation.md`.
- Parent `state.md` records `oat_kind: coordination`, ordered `oat_children`, and terminal decomposition status.
- `references/split-plan.json` contains the full `SplitPlanDocument`.
- Every child has seeded discovery content, parent/sibling/dependency links, and `oat_inherited_context_revalidated: false`.
- `.oat/config.local.json.activeProject` points at the repo-relative initial child path.
