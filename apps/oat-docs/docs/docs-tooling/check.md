---
title: Check Documentation
description: Validate reader structure, links, navigation, contributor commands and accessible diagram sources without building a site.
---

# Check Documentation

Run the portable checker before committing documentation. It reads authored
Markdown/MDX, config, local package scripts and diagram assets; it never builds a
site, runs page scripts or MDX, executes documented commands, or fetches links.

```bash
oat docs check
oat docs check --target-dir docs-site
oat docs check --rule description h1 --rule links --json
```

Omitted targets use `documentation.root`, then the existing `docs` fallback.
Framework app roots resolve to their content directory. A literal Markdown root
stays literal even with a child named `docs`. The checker never reads
`node_modules` or hidden directories such as `.git` and `.oat`. An explicit
target other than the configured root is checked without the configured policy;
the text output prints a notice that says so and names the mode. Targeting a
configured framework app's `docs/` content directory checks it as Markdown and
skips navigation, so the notice suggests the app root instead. Notices never
appear in `--json` output. Paths in findings are deterministic,
content-root-relative POSIX paths; physical line locations are included when
available, including nested supported tabs. No sidebar or default manifest is
required for Markdown.

## Results and repair

Errors exit **1**; warning-only runs exit **0**. System/runtime failures retain
exit **2**. Unknown rule IDs and malformed checker config are actionable
`configuration` findings. JSON has exactly these top-level keys:

```json
{
  "summary": { "errors": 1, "warnings": 0 },
  "findings": [
    {
      "ruleId": "description",
      "severity": "error",
      "path": "guide.md",
      "line": 1,
      "message": "Frontmatter description is required and must be nonempty."
    }
  ]
}
```

Fix the authored page, its local Contents map and inbound links together. For
owned generated navigation, run `oat docs nav sync`, then rerun the checker.
Hand-authored or undeclared navigation is compared for membership/order without
requiring generated display labels, title fields or YAML formatting; do not
silently regenerate it. A page listed in Contents must be reachable from some
sidebar entry: its own folder's `pages`, a rest entry, a borrow from another
folder such as `"../install"`, a root-relative link item to its URL, or the
folder's `pagesIndex` (a page path, or a link to the folder's own URL). Only
folders the sidebar attaches from the docs root count: a link to a folder's URL
reaches its landing page, not its other pages. Every
`pages` or `nav` entry must name an existing page or folder, and listed pages keep
their Contents order. Separators and their labels, MkDocs section labels and
nesting, link items, rest entries and borrowed pages are presentation and are
not compared. Messages name the mismatch: a missing reader page or folder, a
missing target, or an order difference with both orders. Missing optional
Fumadocs metadata, metadata objects without `pages`, and absent MkDocs `nav`
skip comparison. Present `pages` must be an array of strings. Implicit Fumadocs order is not
compared. Nav-sync ownership retains its existing strict read-only freshness check. Generated inventories are separate: regenerate configured output
and check its Git diff after the build. A build that rewrites the inventory does
not prove the committed copy was fresh.

The framework starters provide `docs:check`; MkDocs `test` runs the checker too.
Both build scripts run it before navigation/build. In OAT's workspace, from the
repository root use `pnpm --filter oat-docs docs:check`. The existing
`pnpm docs:validate` also keeps OAT-specific hosted README, skill catalog and
live-consumer checks. Review warnings; avoid blanket suppressions.

## Stable rules and default counting

Threshold names below are keys of `documentation.check.thresholds`. Comparisons
are strictly **above** the stated limits except depth, which triggers **at** its
threshold. Counts use authored reader `.md`/`.mdx` files and real Markdown nodes;
fenced examples do not become headings, links, groups or diagrams. YAML
frontmatter, GFM/reference links, explicit heading IDs, static HTML and supported
recursive tabs participate.

| Rule ID                 | Default behavior                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `directory-index`       | Error for a reader-bearing directory without `index.md` and a nonempty dash-bullet Contents map, invalid map grammar or unresolved strict Contents target. Ancestors of reader pages participate.                                                                                                                                   |
| `root-width`            | Flat root Contents links warn above `rootWarn: 10`, error above `rootError: 14`. Real groups exempt the width.                                                                                                                                                                                                                      |
| `contents-width`        | Ungrouped Contents links warn above `contentsWarn: 10`, error above `contentsError: 15`. `catalog: true` or the recognized OAT generated-index marker exempts only this width rule.                                                                                                                                                 |
| `leaf-size`             | Direct reader pages include index. A leaf has no reader-bearing child directory: index-only errors; two total pages warn.                                                                                                                                                                                                           |
| `folder-size`           | Direct reader pages including index warn above `folderWarn: 12`, error above `folderError: 20`, unless the index has real groups.                                                                                                                                                                                                   |
| `depth`                 | Content root is depth 0; warn at `depthWarn: 4`, error at `depthError: 5`.                                                                                                                                                                                                                                                          |
| `page-length`           | Warn above `pageLines: 500` physical source lines. Explicit `type: reference` or `reference`/`references` path segments use `referenceLines: 1000` and warn above `referenceH3: 40` real H3 headings. No default length error limit. `line` is the first physical line past the line limit, or the first H3 past the heading limit. |
| `frontmatter`           | Unreadable source, invalid YAML or a non-mapping frontmatter document errors. Read failures use relative paths and safe error codes; invalid metadata skips description validation while independent body checks continue at physical positions.                                                                                    |
| `description`           | Missing/empty frontmatter description errors; character lengths below `descriptionMin: 40` or above `descriptionMax: 160` warn.                                                                                                                                                                                                     |
| `h1`                    | Error unless each page has exactly one real H1.                                                                                                                                                                                                                                                                                     |
| `links`                 | Error for unresolved in-root source links/anchors. No network checking. Ordinary escaping links are provenance warnings and their targets are not read. Contents links retain stricter local-map rules.                                                                                                                             |
| `contents-description`  | Error for descriptions ending in an ellipsis/truncation.                                                                                                                                                                                                                                                                            |
| `overview`              | Warn below `overviewWords: 10` before Contents.                                                                                                                                                                                                                                                                                     |
| `contents-separator`    | Warn when Contents descriptions mix separators in a tree.                                                                                                                                                                                                                                                                           |
| `navigation`            | Error for explicit navigation drift. Nav-sync freshness stays strict; hand-authored/undeclared compare membership and order only (separators, labels, links and borrows are not compared), and absent optional meta/pages/nav skips comparison. Markdown skips it.                                                                  |
| `commands`              | Error for missing literal contributor scripts; framework app targets try the app package first, then the repository root. Implicit pnpm shorthand also accepts installed package/workspace `.bin` entries. Explicit pnpm run/npm run stays script-only; unresolved context errors; echo scripts warn.                               |
| `mermaid`               | Parse every real Mermaid fence using the pinned Mermaid parser. Invalid syntax errors.                                                                                                                                                                                                                                              |
| `diagram-pairs`         | Diagram light/dark SVG siblings and both page references are required. Conventional diagram paths and explicit paired references participate; ordinary logos are not diagrams.                                                                                                                                                      |
| `diagram-accessibility` | Mermaid missing `accTitle`/`accDescr` warns. SVGs require `role="img"`, nonempty title/desc. Rendered diagrams without page-visible explanatory text or an associated long description warn.                                                                                                                                        |
| `diagram-freshness`     | Warn when changed Mermaid lacks both associated SVG changes; association follows the actual section/tab group. Missing usable Git comparison is explicitly unverified.                                                                                                                                                              |
| `image-alt`             | Warn for empty, filename/slug-like or longer than `altMax: 155` image alt text.                                                                                                                                                                                                                                                     |
| `provenance`            | Warn for planning/backlog/home paths, configured ticket/milestone patterns and ordinary links escaping the root. Legitimate reader docs remain visible.                                                                                                                                                                             |

These are lint limits, distinct from authoring targets for concise pages and
focused maps. `documentation.nonReaderPaths` uses the existing
[bounded matcher](commands.md#exclusion-patterns) for reader inventory and checks.
`documentation.excludes` remains manifest-only and cannot hide reader defects.

## Contributor command context

Literal pnpm script and npm run examples in `contributing.md`/`.mdx` and
`contributing/**` are checked against package manifests. Each code block starts
at the repository root. For a framework app target with its own `package.json`,
it also starts at the app root, which is tried first: a script defined by the app
resolves there, a script only the repository root defines still resolves, and a
missing script names both manifests. Markdown targets use the repository root
only. Use executable `cd`, `-w`/`--workspace-root`, `--dir` or literal `--filter`
selection to establish another context. Prose such as “from
the app directory” alone does not change it. Built-in package-manager commands
and illustrative placeholders are recognized; commands are never run.

Implicit pnpm shorthand (for example, `pnpm tsc`) may use an installed entry in
that package's or the workspace root's `node_modules/.bin`. Only its presence is
checked. Explicit `pnpm run tsc` and `npm run tsc` still require a package script.
System PATH lookup is outside this check; before dependencies are installed, a
binary shorthand may be reported missing. Use `pnpm exec` for explicit binary examples.

## Diagram comparison and limits

Syntax validation lazily loads the pinned Mermaid parser with a real Node DOM
and strict sanitization; script execution and resource loading stay disabled.
It does not render or prove semantic/visual correctness. Inspect both themes
for important diagrams. Put meaningful `accTitle` and `accDescr` in Mermaid,
keep SVG title/desc and page explanations, and change both theme SVGs with source.

Freshness uses the merge base against `documentation.check.diagramBaseRef`
(default `origin/main` when available), plus committed, staged, unstaged and
untracked changes. It never mutates Git. PR checkout/fetch must provide the base;
without one, static validation still runs and freshness is reported unverified.
Bootstrap supplies concrete checker → framework build → configured-manifest
freshness CI guidance. Markdown runs only the checker unless an external generated
manifest was explicitly configured.

## Configure narrow policy

`documentation.check` is a shared repository object preserved by real config
commands. Rule values are `error`, `warn` or `off`; `--rule` selects checks without
changing policy. `frontmatter` and `mermaid` govern syntax independently from
`description` and `diagram-accessibility`; metadata/accessibility exceptions do
not suppress syntax or body findings. Explicit `warn`/`off` settings or exceptions
for the syntax rule itself remain supported. Exceptions use the same bounded path matcher, a stable rule ID
and a mandatory nonempty reason; omitted exception severity means `off`.

```bash
oat config set documentation.check '{"rules":{"image-alt":"warn"},"thresholds":{"referenceLines":1200},"exceptions":[{"path":"reference/decisions.md","rule":"provenance","reason":"Reader-facing decision pointers preserve canonical rationale."}],"provenance":{"ticketPatterns":["TICKET-[0-9]+"],"milestonePatterns":["Milestone [0-9]+"]},"diagramBaseRef":"origin/main"}'
oat config get documentation.check --json
oat config dump --json
oat config unset documentation.check --shared
```

Numeric thresholds are nonnegative safe integers with ordered warn/error and
min/max pairs. Patterns must compile as regular expressions. Unknown names,
invalid values, blank reasons and escaping exception paths are rejected rather
than silently dropped. Keep decision-pointer exceptions narrow and justified;
metadata/maps/links should normally be repaired in source.
