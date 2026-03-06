# Docs Directory Assessment Criteria

Use these criteria to determine whether a directory should have its own `index.md` and how strongly missing coverage should be rated.

## Primary indicators

Treat a directory as a docs node when one or more of these is true:

- It contains one or more Markdown files.
- It has child directories that contain Markdown files.
- It represents a distinct product, package, workflow, or topic area.
- It is linked from another docs page as a navigable subsection.

## Severity guidance

### High

Use `High` when the directory:

- Is a top-level docs section with no `index.md`
- Contains multiple pages or subtrees but lacks a local map
- Is important to setup, operations, or contributor workflows

### Medium

Use `Medium` when the directory:

- Has an `index.md` but no useful `## Contents`
- Still uses `overview.md` as the directory entrypoint
- Has a partial map that omits key siblings or child directories

### Low

Use `Low` when the directory:

- Is technically covered but the descriptions are vague
- Has minor organization issues that do not block discovery

## Exclusions

Do not require `index.md` for:

- `node_modules/`
- `site/`
- build output directories
- hidden tool directories that are not part of the docs surface
