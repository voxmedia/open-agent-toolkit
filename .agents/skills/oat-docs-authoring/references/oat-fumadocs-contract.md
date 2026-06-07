---
title: OAT Fumadocs authoring contract
description: Authored source, navigation, link, file-type, generated-index, and exception rules for OAT/Fumadocs docs apps.
---

# OAT Fumadocs Authoring Contract

The OAT/Fumadocs contract is tooling-critical. It is not just style.

## Authored Source of Truth

- Author content under the authored docs root, usually `docs/` inside the docs
  app.
- Every Markdown-bearing content directory has an authored `index.md`.
- Every authored `index.md` that represents a content directory has a
  `## Contents` section.
- `## Contents` lists sibling pages and immediate child directories for that
  directory.
- If you create a child directory, create `child/index.md` and link it from the
  parent as `child/index.md`.

## Links in `## Contents`

Use file-path-friendly relative Markdown links:

- leaf page: `[Title](page.md)`;
- child directory: `[Section](section/index.md)`;
- avoid extensionless local docs links for new authored navigation entries;
- preserve anchors only when the target heading exists and the local renderer
  supports the anchor.

Existing extensionless links are drift, not precedent. Normalize them only when
the task scope or an approved recommendation covers that change.

## File Types

- Prefer `.md` for plain content pages.
- Use `.mdx` only for pages that need JSX, imports, custom components, or other
  MDX-only behavior.
- Do not create `overview.md` as a directory entrypoint. Use `index.md` with
  `## Contents`.
- Add or preserve at least `title` and `description` frontmatter on touched
  pages unless local guidance defines a stricter schema.

## Generated Root Indexes

Many OAT/Fumadocs apps have an app-root generated `index.md` that rolls up the
authored docs tree. Treat it as generated output.

- Do not hand-edit generated root indexes.
- Regenerate or freshness-check them through local scripts when navigation
  changes.
- Do not treat a generated-root entry as proof that the nearest parent
  `## Contents` is healthy.
- If generated output is intentionally gitignored or locally absent, record that
  in the handoff instead of inventing a manual replacement.

## Exceptions and Local Extensions

- Asset-only directories do not need `index.md` unless local guidance says so.
- Build output, hidden tool directories, and generated artifacts are not content
  directories.
- Optional Fumadocs metadata files, such as `meta.json`, may refine sidebar
  presentation when local style uses them. They do not replace `## Contents`.
- Preserve local audience routers, ownership notes, and app-shell
  customizations.

## Quick Check

For every touched directory or page, confirm:

- content directory has `index.md`;
- local `index.md` has useful `## Contents`;
- new links include `.md` or `subdir/index.md`;
- generated root index was not hand-edited;
- `.mdx` has a real reason;
- no new `overview.md` entrypoint was introduced.
