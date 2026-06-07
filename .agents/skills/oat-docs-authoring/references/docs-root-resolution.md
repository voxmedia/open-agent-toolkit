---
title: OAT docs root resolution
description: How to resolve OAT/Fumadocs app roots, authored docs roots, generated index outputs, and local instruction surfaces before editing.
---

# OAT Docs Root Resolution

Do not assume the docs app lives at `apps/oat-docs`. Resolve the app and source
roots before editing.

## Resolution Order

1. Read repo-level instructions.
   - Root `AGENTS.md` often names the docs app root, framework, and generated
     index file.
   - A docs-app `AGENTS.md` may override or narrow the repo-level guidance.
2. Inspect `.oat/config.json`.
   - Prefer documented `documentation.root` values for the docs app root.
   - Treat `documentation.index` as the generated root index when present; it
     may not be the same as the authored docs root.
   - If config is incomplete, keep resolving from local files instead of
     guessing.
3. Inspect package scripts in likely docs app directories.
   - Look for `predev`, `prebuild`, `fumadocs-mdx`, `oat docs generate-index`,
     docs lint/format scripts, and local build commands.
   - Use the scripts as evidence for generated-artifact ownership and
     validation, not as a substitute for reading docs instructions.
4. Inspect Fumadocs files when the task touches framework behavior.
   - `source.config.ts`, `next.config.*`, and `app/layout.*` can reveal source
     config, transforms, base paths, static export behavior, branding, metadata,
     or custom components.
   - Content-only edits usually should not modify these files.
   - Site chrome, browser metadata, search behavior, image handling, and base
     paths can be wired separately. Preserve local customizations unless the
     user explicitly asked for app-shell work.
5. Resolve the authored docs root.
   - The common root is `<docs-app>/docs`, but local guidance is authoritative.
   - Find the top-level authored `index.md`, then follow `## Contents` maps to
     the target area.

## Instruction Surfaces

Read applicable local guidance before placing content:

- repo-root `AGENTS.md`;
- docs-app `AGENTS.md`;
- nested `AGENTS.md` files in the target area;
- human contributing or documentation-authoring pages;
- nearest parent `index.md` with `## Contents`.

Keep the audiences distinct. Runtime agent instructions belong in `AGENTS.md`;
rendered human docs should describe durable authoring conventions and shipped
behavior.

## Output of This Step

Before editing, know:

- docs app root;
- authored docs root;
- generated root index path, if any;
- nearest parent `index.md` map;
- relevant local validation scripts;
- any local exception or router that affects placement.
