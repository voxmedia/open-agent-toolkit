---
title: OAT docs authoring validation
description: Local validation, generated-index checks, and render spot-check guidance for targeted OAT/Fumadocs docs changes.
---

# OAT Docs Authoring Validation

Validation is local to the docs app. Read scripts and instructions before
choosing commands.

## Script Discovery

Inspect the docs app `package.json` and local instructions for:

- `predev` or `prebuild` generation steps;
- `fumadocs-mdx`;
- `oat docs generate-index`;
- docs lint, format, type-check, test, or build scripts;
- intentionally disabled or no-op scripts.

Use the local script names and package manager style already present in the
repo. Do not invent universal docs commands.

## Generated Index Checks

When navigation, file placement, or `## Contents` changes:

- regenerate the generated root index through the local command when available;
- if generation is tied to `predev` or `prebuild`, run the smallest local
  command that updates or checks the generated output;
- inspect the generated diff for stale paths, missing pages, unexpected
  ordering drift, or missing generated-file warning banners;
- leave generated output unedited by hand.

If generated output is ignored, absent by policy, or cannot be produced in the
current environment, record the exact reason in the handoff.

## Local Contract Checks

Before finishing:

- every touched content directory has `index.md`;
- every touched authored `index.md` has a meaningful `## Contents`;
- parent maps include new or moved immediate children;
- links to moved files were updated;
- new local navigation links use `.md` or `subdir/index.md`;
- no new `overview.md` or unnecessary `.mdx` page was introduced.

## Render Spot Checks

Build success is not always enough for render-sensitive content. Spot-check the
rendered result when changes include:

- migrated MkDocs syntax;
- callouts, tabs, Mermaid, images, iframes, or custom MDX components;
- large link rewrites or directory moves;
- frontmatter or metadata behavior;
- app-shell or layout changes.

Use the app's local dev or build workflow when practical. If rendering cannot
be checked, state that explicitly.
