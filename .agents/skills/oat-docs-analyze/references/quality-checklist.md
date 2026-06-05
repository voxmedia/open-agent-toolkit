# Docs Quality Checklist

Use this checklist when evaluating a docs surface.

## Structure

- Every docs directory has an `index.md`.
- Every `index.md` includes a `## Contents` section.
- `## Contents` is useful content, not a placeholder comment, empty list, or
  generic "add links here" scaffold.
- `## Contents` links describe sibling files and immediate child directories.
- Parent `## Contents` maps include immediate child directories that contain
  docs.
- Single-page directories still expose a useful `index.md` entrypoint or local
  section map.
- Asset-only directories are exempt when they contain no Markdown content and
  are not linked as navigable docs sections.
- `overview.md` is not used as the directory entrypoint.
- Plain docs content uses `.md` by default; `.mdx` is reserved for pages that
  need JSX/components or are explicitly allowed by local guidance.

## Links

- Local relative Markdown links resolve from the page where they appear.
- OAT/Fumadocs docs apps use `.md`-suffixed local links for docs pages,
  including `subdir/index.md` for child directory maps.
- Anchors on `.md` links are allowed, such as `page.md#section`.
- Extensionless local docs links are flagged when local guidance follows the
  OAT/Fumadocs `.md` link convention.
- Inline-code examples, fenced snippets, placeholder templates, external URLs,
  anchors-only links, `mailto:` links, and asset/image links are not false
  positives for broken docs-page links.

## Markdown Hygiene

- Opening code fences have language identifiers.
- Shell command examples follow the repo's documented fence convention; default
  to `sh` unless local guidance uses `bash` or the block requires Bash-only
  syntax.
- Headings are non-empty.
- Each authored page has at most one document-level H1 unless the file is an
  intentional imported README or generated/imported artifact.
- Frontmatter descriptions respect local length limits when those limits are
  documented.
- Descriptions are not ellipsis-truncated.
- Titles, descriptions, and metadata do not look like copied README boilerplate
  when rendered in docs navigation or search.

## Accuracy

- Commands match the current repo scripts and CLI surface.
- Referenced paths exist.
- Tooling/setup instructions are current.

## Discoverability

- Important pages are reachable from a parent `index.md` or site nav.
- Topic names are specific enough for agents to select the right page quickly.
- Large sections summarize what each child page covers.

## Docs App Contract

- `mkdocs.yml` exists when the repo is using an OAT docs app.
- Navigation is consistent with the docs tree.
- `docs/contributing.md` documents enabled plugins/extensions when an MkDocs app exists.

## Claims Are Evidence-Backed

- Non-obvious docs conventions are backed by concrete repo sources.
- Command, plugin, and nav claims cite config, setup docs, or repeated tree patterns.
- When canonical setup/config docs already exist, indexes and contributor docs prefer concise links over duplicating every detail inline.

## Progressive Disclosure

- Always-on docs pages keep only the minimal essential guidance inline.
- Deeper detail links to canonical docs, config, or examples instead of being copied into every index.
- `link_only`, `omit`, and `ask_user` decisions are used when that keeps the docs surface more accurate and maintainable.

## Drift Signals

- Nav points to missing files.
- Files exist but are not represented in indexes/nav.
- Index descriptions no longer match the content they point to.
- Generated root indexes include stale paths, omit authored-map entries, or
  order entries differently without documented generator semantics.
- Commands mention removed or renamed tooling.
- Docs claim plugin support or structure rules that are not backed by current repo evidence.
