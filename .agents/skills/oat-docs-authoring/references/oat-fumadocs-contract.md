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

## Owned Sidebar Generation

In apps using `oat docs nav sync --framework fumadocs`, Contents owns sidebar membership/order and frontmatter titles own leaf/section labels. Every canonical page/child section needs one physical-parent entry. Root and child landings attach once through native loader ownership. Cross-links remain in page bodies to preserve canonical breadcrumbs and previous/next.

Scaffold hooks run installed `oat docs nav sync --framework fumadocs --target-dir .` from the app directory before `fumadocs-mdx`, then the separate `generate-index` inventory. Repository-specific source CLI entries do not belong in consumer scaffolds.

The compiler supports ordinary `.md` file-derived routes with a root loader base and relative links/fragments. External/query-bearing Contents links, MDX/custom slugs and separator syntax need a separately approved integration, not guessed loader configuration. Fenced examples are ignored; deployment basePath stays in the renderer.

Ignored `docs/**/meta.json` and app-root `.oat-fumadocs-nav.json` are generated output. Replacement/deletion requires sidecar ownership and matching last-written hashes. Preserve unowned/edited bytes; never adopt them by editing hashes. Back up proven disposable output with its sidecar before removing only those files and regenerating. Traversal/symlink paths are refused, and partial writes still require inspection. Format authored Markdown, not generated JSON.

## Separate Agent Inventory

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
- Preserve authored metadata in apps with a different approved local integration. Do not point the owned compiler at it and silently adopt it; compiler-owned metadata never replaces authored Contents.
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
