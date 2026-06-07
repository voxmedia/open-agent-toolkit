# Docs Directory Assessment Criteria

Use these criteria to determine whether a directory should have its own `index.md` and how strongly missing coverage should be rated.

## Primary indicators

Treat a directory as a docs node when one or more of these is true:

- It contains one or more Markdown files.
- It has child directories that contain Markdown files.
- It represents a distinct product, package, workflow, or topic area.
- It is linked from another docs page as a navigable subsection.
- It is represented in a generated root index, sidebar metadata file, or local
  `## Contents` map.

Treat a directory as asset-only when it contains no Markdown files, contains no
Markdown-bearing child directory, and is only referenced as an image/file asset
container. Asset-only directories do not need their own `index.md`.

## Severity guidance

### High

Use `High` when the directory:

- Is a top-level docs section with no `index.md`
- Contains multiple pages or subtrees but lacks a local map
- Is important to setup, operations, or contributor workflows
- Is listed in a parent map or generated index but has no useful entrypoint

### Medium

Use `Medium` when the directory:

- Has an `index.md` but no useful `## Contents`
- Has a placeholder-only `## Contents`, such as an empty list, HTML comment, or
  generic scaffold text
- Still uses `overview.md` as the directory entrypoint
- Has a partial map that omits key siblings or child directories
- Is a single-page directory whose `index.md` does not orient readers to the
  page's purpose or downstream links
- Uses `.mdx` for plain Markdown content without local guidance or JSX/component
  evidence

### Low

Use `Low` when the directory:

- Is technically covered but the descriptions are vague
- Has minor organization issues that do not block discovery
- Has ordering drift between authored maps and generated indexes that does not
  break reachability and may reflect documented generator behavior

## Exclusions

Do not require `index.md` for:

- `node_modules/`
- `site/`
- build output directories
- hidden tool directories that are not part of the docs surface
- asset-only image, media, or attachment directories
