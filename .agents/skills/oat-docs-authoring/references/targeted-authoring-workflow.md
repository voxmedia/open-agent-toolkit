---
title: Targeted OAT docs authoring workflow
description: Focused edit loop for small OAT/Fumadocs documentation authoring and restructuring tasks.
---

# Targeted OAT Docs Authoring Workflow

Use this workflow when the user asks for a focused docs addition, repair, move,
or review inside an existing OAT/Fumadocs docs app.

## 1. Bound the Change

- Restate the requested target in terms of pages or directories.
- Identify whether the work is content authoring, local restructuring, link
  repair, or review.
- If the task becomes setup, repo-wide audit, recommendation-driven apply,
  project-derived documentation, or full migration work, stop and route through
  `references/lifecycle-boundaries.md`.

## 2. Gather Evidence

- Read local instructions before editing.
- Inspect current docs pages in the target area.
- Inspect source code, package scripts, CLI help, schemas, tests, or deployment
  files needed to support factual claims.
- Use `authoring-docs` for page type, evidence quality, writing style,
  templates, and review rubric.

## 3. Preserve Local Navigation

- Read the nearest authored map before changing a page.
- For moves or renames, update links to the old path in the same change.
- Preserve local audience routers, area ownership notes, and sidebar metadata
  when present.

For page moves and renames:

- update both the old parent and new parent `## Contents` sections;
- search for links to the old path before finishing;
- preserve optional local sidebar metadata, such as `meta.json`, when present;
- regenerate or freshness-check the generated root index after authored maps
  change;
- do not treat a generated-root entry as proof that the nearest parent map is
  correct.

## 4. Validate Locally

- Read package scripts before choosing validation commands.
- Run generation or validation scripts that are relevant to the touched files.
- For render-sensitive Markdown, inspect the rendered result when practical.

## 5. Report Clearly

Handoff with:

- files changed;
- source evidence inspected;
- maps and links updated;
- generated artifacts checked or regenerated;
- validation command results;
- unresolved facts or owner-review items.
