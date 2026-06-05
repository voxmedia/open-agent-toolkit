---
name: oat-docs-authoring
version: 1.0.0
description: Use when authoring or restructuring targeted content inside an existing OAT/Fumadocs docs app. Preserves OAT docs navigation, generated indexes, and validation boundaries.
argument-hint: '[docs task or target path]'
disable-model-invocation: false
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# OAT Docs Authoring

Use this skill for targeted documentation authoring and small structural edits
inside an existing OAT/Fumadocs docs app.

This is a thin wrapper over `authoring-docs`. Load `authoring-docs` for
universal evidence gathering, page-type selection, writing style, templates,
and review standards. Keep this wrapper focused on OAT/Fumadocs placement,
navigation, generated artifacts, validation, and lifecycle boundaries.

## Prerequisites

- The repository already has an OAT/Fumadocs docs app or a clearly identified
  target docs app that follows OAT conventions.
- The task is a targeted authoring, restructuring, repair, or review task, not
  a new docs-app bootstrap, broad audit, or approved bulk-apply workflow.

## Mode Assertion

**OAT MODE: Docs Authoring Wrapper**

**Purpose:** Author or restructure focused docs content while preserving the
OAT/Fumadocs source-of-truth contract.

**BLOCKED Activities:**

- Bootstrapping a new docs app.
- Running a broad read-only docs audit as an ad hoc manual review.
- Applying a batch of approved audit recommendations.
- Writing project-derived release or feature docs from active OAT project
  artifacts.
- Running a full MkDocs-to-OAT-Fumadocs migration.
- Treating generated navigation artifacts as editable source.

**ALLOWED Activities:**

- Creating or improving targeted docs pages inside an existing docs app.
- Moving or renaming a small number of docs pages when the local maps are
  updated in the same change.
- Repairing local navigation, frontmatter, link, or Markdown issues near the
  requested target.
- Reviewing a docs change for OAT/Fumadocs contract fit.

**Self-Correction Protocol:**
If you catch yourself:

- Writing general documentation guidance already covered by `authoring-docs` ->
  STOP and reference the baseline instead.
- Expanding a targeted task into a repo-wide audit -> STOP and route to
  `oat-docs-analyze`.
- Applying a broad set of recommendations -> STOP and route to `oat-docs-apply`.
- Bootstrapping or repairing a docs app shell -> STOP and route to
  `oat-docs-bootstrap`.
- Migrating an existing MkDocs docs app to OAT/Fumadocs -> STOP and use the
  standalone migration guide; bootstrap is not the migration workflow.
- Editing generated root indexes or derived navigation output -> STOP and move
  the change back to authored docs sources.
- Treating generated root indexes as proof of local navigation health -> STOP
  and inspect the nearest authored `## Contents` map.

**Recovery:**

1. Re-state the narrower target and the lifecycle skill, if any, that owns the
   larger work.
2. Continue only with authored docs files and local validation relevant to the
   target.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can
tell what is happening after they confirm.

- Print a phase banner once at start:

  ```txt
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ DOCS AUTHORING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```

- Print each step indicator at the start of that step, not all at once upfront:
  - `[1/5] Resolving docs app and local instructions...`
  - `[2/5] Inspecting source evidence and navigation maps...`
  - `[3/5] Authoring targeted docs changes...`
  - `[4/5] Regenerating or checking derived docs artifacts...`
  - `[5/5] Running validation and preparing handoff...`

## Process

### Step 1: Resolve the Authoring Target

Identify the docs task, target reader, docs app root, authored docs root, and
nearest local instruction files. Read repository and docs-app guidance before
choosing placement.

Use `references/lifecycle-boundaries.md` first when the request may be setup,
audit, apply, project-documentation, or migration work.

Use `references/docs-root-resolution.md` before assuming any path. OAT docs apps
commonly live outside `apps/oat-docs`, and `.oat/config.json` may describe the
generated root index separately from the authored docs root.

If the request needs universal documentation standards, load `authoring-docs`
and use its reference map for evidence gathering, page type, writing style,
templates, and review rubric.

### Step 2: Inspect Evidence and Local Maps

Ground every new or changed claim in source evidence. Inspect the nearest
authored navigation map for the target area before adding, moving, or deleting a
page.

Use `references/targeted-authoring-workflow.md` for the focused edit loop.

### Step 3: Edit Authored Docs Sources

Edit source docs pages and local maps together. Keep changes near the requested
target unless the user explicitly approved broader restructuring.

Use `references/oat-fumadocs-contract.md` for the concrete authored-source
rules: `index.md`, `## Contents`, `.md` links, generated root indexes, Markdown
defaults, and asset-only exceptions.

Prefer plain Markdown for content pages. Use MDX only when local guidance and
the task require JSX or custom components.

### Step 4: Check Generated Artifacts and Validation

Regenerate or freshness-check derived docs artifacts using local scripts when
the change affects navigation or generated indexes. Run the docs app's local
validation commands when they exist and are meaningful.

Use `references/validation.md` for script discovery, generated-index checks,
and render spot-check guidance.

### Step 5: Handoff

Summarize changed files, evidence inspected, local maps updated, generated
artifacts regenerated or intentionally not run, validation commands, unresolved
facts, and any recommended lifecycle follow-up.

## Reference Map

Load only the references needed for the task:

- `references/docs-root-resolution.md`: resolve docs app root, authored docs
  root, generated root index, and local instruction surfaces.
- `references/lifecycle-boundaries.md`: route setup, audits, applies,
  project-derived docs, and migrations to the correct workflow owner.
- `references/oat-fumadocs-contract.md`: OAT/Fumadocs authored-source and
  generated-artifact contract.
- `references/targeted-authoring-workflow.md`: focused OAT/Fumadocs authoring
  flow for small edits.
- `references/validation.md`: local validation, generated-index, and render
  spot-check guidance.
- `authoring-docs`: universal documentation-quality baseline.

## Examples

Basic usage:

```txt
/oat-docs-authoring apps/oat-docs/docs/reference/
```

Conversational triggers:

```txt
Add a new OAT docs page and wire it into the local Contents map.
Move this Fumadocs page without breaking generated navigation.
Review this docs change for OAT index contract issues.
Fix the local docs links near this page.
```

## Success Criteria

- The task stayed within targeted authoring or restructuring scope.
- Universal docs quality came from `authoring-docs` instead of duplicated
  wrapper prose.
- Authored docs source files and local maps were updated together.
- Generated artifacts were checked or regenerated when navigation changed.
- Local validation ran, or the handoff explains why it was not available or not
  meaningful.
