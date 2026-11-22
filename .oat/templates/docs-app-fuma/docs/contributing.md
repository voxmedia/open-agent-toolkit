---
title: Contributing
description: 'Authoring contract, generated files, supported syntax and validation.'
---

# Contributing to {{SITE_NAME}}

Ship documentation with the behavior it explains. Use the [docs toolchain guide](contributing/docs-toolchain.md) for setup and validation and [contributor guides](contributing/index.md) as the local map.

Agent working rules: `../AGENTS.md` (app-root source file).

## Authored and generated files

| Surface                                                               | Owner and action                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `docs/**/*.md`, including `docs/**/index.md`                          | Authored source; edit purpose and Contents maps directly.                 |
| `AGENTS.md` and this contributor guide                                | Authored working rules and human guidance; keep their audiences separate. |
| `docs/**/meta.json`                                                   | Committed derived sidebar; regenerate with nav sync, never hand-edit.     |
| App-root `index.md`                                                   | Generated machine inventory from Markdown; predev/prebuild regenerate it. |
| `.source/`, `.next/`, `out/`                                          | Generated collection, build and static export; do not edit.               |
| `app/`, `lib/`, `source.config.ts`, `next.config.js`, package scripts | Authored application/configuration; review tooling changes explicitly.    |

Fumadocs collections omit configured non-reader routes as well as navigation/manifest entries. Per-page `generateMetadata` reads title/description from loaded source. `/llms.txt`, `/llms-full.txt` and `/llms/<page-slugs>/content.md` (root `/llms/content.md`) serve the same loaded `.md` reader set, including readers omitted from a hand-authored sidebar. MDX is excluded. Agent bodies retain authored Markdown: resolve relative links against the listed source path, not `/llms/`; follow each canonical rendered URL for the site.

## Navigation contract

Every content directory has an authored `index.md` with a useful purpose paragraph and one `## Contents` local map. Prefer `.md` pages with nonempty `title` and `description` frontmatter and exactly one document H1. `overview.md` is deprecated.

Within `## Contents`, use dash-only links to sibling pages or child indexes, optionally followed by a description. A `### Label` starts a group and must contain at least one authored entry before the next group/end. Entries before the first group are ungrouped. A `*` or `+` link bullet, or an empty authored group, is an error naming the file and line. The map ends at the next level-two heading; fenced examples are ignored. A self-index link retains the existing landing-page behavior. Missing Contents keeps deterministic manifest fallback, but strict nav still requires an authored map and lists unlisted reader pages.

```markdown
## Contents

- [Start here](getting-started.md) - The first safe result.

### Contributor guides

- [Toolchain](contributing/index.md) - Local setup and authoring.
```

`documentation.navOwner: nav-sync` means nav sync owns derived navigation. With `hand-authored` or undeclared ownership, do not silently regenerate; agree the ownership/change first. Configured `documentation.nonReaderPaths` omits drafts/templates from navigation and manifests; an explicit Contents link does not override an exclusion. `documentation.excludes` affects only the manifest. Do not add an exclusion to hide an unlisted reader page.

## Add, move or rename a page

1. Read the nearest authored map and choose a path in its scope; create a child `index.md` when adding a directory.
2. Add useful title/description frontmatter, one H1, and the page's reader outcome. Use `.md`-suffixed source links such as `[Guide](guide.md)` and `[Section](section/index.md)`.
3. Update the nearest Contents map. For a move/rename, update both source and destination maps and every inbound link in the same change. Review old published URLs; agree a redirect or a static stub/recovery page when needed.
4. Refresh owned navigation, run the checks below and inspect the rendered links/navigation before committing. Never repair drift by hand-editing derived files.

## Supported Markdown features

Use the least complex layer that expresses the reader's need: **Markdown → existing transform → MDX**. Ordinary prose stays `.md`. Fumadocs MDX is for actual JSX/component needs; MkDocs does not compile MDX. MDX is excluded from OAT's Markdown manifest and the Fumadocs agent Markdown endpoints.

Tables, task lists, fenced code, callouts, Mermaid, `=== "Title"` tabs and `docs-*` figure fences are supported by the configured framework pipeline. Tabs may contain links, GFM and nested tabs in Fumadocs. Use a language on every fence and `bash` for shell commands.

=== "Syntax"

    ````text
    === "Example"

        > [!NOTE]
        > Read the local map before editing.

        | Check | Result |
        | --- | --- |
        | Reader links | Resolve |

        ```bash
        cd {{APP_CWD}}
        pnpm docs:lint
        ```
    ````

=== "Rendered"

    === "Example"

        > [!NOTE]
        > Read the local map before editing.

        | Check | Result |
        | --- | --- |
        | Reader links | Resolve |

        ```bash
        cd {{APP_CWD}}
        pnpm docs:lint
        ```

Not configured: arbitrary custom components, executable notebooks, API playgrounds or screenshot testing. Do not describe those as supported without an approved configuration and a working example. Check the actual package scripts: lint is {{LINT_STATUS}} and formatting is {{FORMAT_STATUS}}; disabled scripts only print a message.

## Figure fences

A `docs-*` fence draws a framed figure from ordinary Markdown in its body. GitHub, the agent endpoints and any reader of the source still see a readable code block. The eight fences are `docs-steps`, `docs-tree`, `docs-timeline`, `docs-terminal`, `docs-decision`, `docs-check`, `docs-compare` and `docs-annotate`; any other `docs-*` name fails `docs:check` and the build with the list of known fences. Attributes follow the language: `title="…"` labels the frame, and `frame="corners"`, `frame="rule"` or `frame="none"` replaces the default box.

- **State in words:** bold and italic set a figure's state (current, next, chosen, rejected), but agents and GitHub readers see only the source. Never let emphasis carry an important state alone; write it in the text too, for example `**brainstorming (current)**`.
- **Plain-text rows:** figure rows are plain text. Links and inline code lose their formatting in step titles and tight step bodies (`Title — body`), tree rows, timeline labels, check items, decision options, every `— note` and compare cells. Put a link in a loose step body, a loose timeline item's body, a decision's follow-up paragraph, an annotate note, or a paragraph after the figure.
- **No nesting:** figures may sit inside tabs, but a `docs-*` fence inside a figure body fails the build (`nested-docs-fence`). `docs:check` checks fence names at the top level and inside tabs only, so the build is what catches a nested one.
- **Four backticks:** write `docs-annotate` with a four-backtick outer fence so its inner code fence survives.

### Steps

`docs-steps` takes an ordered or unordered list, one item per step, numbered `01`, `02`, …. A loose item (blank lines between items) uses its first paragraph as the title and every later block as the body, which keeps links and code. A tight item reads `Title — body`. A **bold** title is the current step, an _italic_ title the next, and a plain title is done.

=== "Syntax"

    ````text
    ```docs-steps title="Publish a page"
    1. Draft the page (done)

       Write the Markdown under `docs/`.

    2. **Update the Contents map (current)**

       Add the page to the nearest `index.md`.

    3. *Run the checks (next)*

       Run `pnpm docs:check` before committing.
    ```
    ````

=== "Rendered"

    ```docs-steps title="Publish a page"
    1. Draft the page (done)

       Write the Markdown under `docs/`.

    2. **Update the Contents map (current)**

       Add the page to the nearest `index.md`.

    3. *Run the checks (next)*

       Run `pnpm docs:check` before committing.
    ```

### Tree

`docs-tree` takes a nested list, one node per item. `name — note` draws the note right-aligned. A **bold** node and its ancestors take the accent while the other rows recede. A trailing `/` marks a folder by convention only.

=== "Syntax"

    ````text
    ```docs-tree title="Docs app"
    - docs/
      - index.md — top-level Contents map
      - **contributing.md — this page (you are here)**
      - contributing/
        - docs-toolchain.md — setup and validation
    ```
    ````

=== "Rendered"

    ```docs-tree title="Docs app"
    - docs/
      - index.md — top-level Contents map
      - **contributing.md — this page (you are here)**
      - contributing/
        - docs-toolchain.md — setup and validation
    ```

### Timeline

`docs-timeline` takes a list of `label: text` items, split at the first `: `. `— note`, or the blocks of a loose item, adds a muted note. A plain item is done (●), a **bold** item is now (● in the accent) and an _italic_ item is next (○).

=== "Syntax"

    ````text
    ```docs-timeline title="Page states"
    - draft: written — not in a Contents map yet (done)
    - **review: linked and checked — the current state**
    - *published: built and deployed — the next state*
    ```
    ````

=== "Rendered"

    ```docs-timeline title="Page states"
    - draft: written — not in a Contents map yet (done)
    - **review: linked and checked — the current state**
    - *published: built and deployed — the next state*
    ```

### Terminal

`docs-terminal` keeps its body as raw lines, not Markdown. `$ cmd` is a command, `# …` a comment, a line starting with `✓` (or `✔`, `√`) a passing check, and anything else output. `title` defaults to `shell`, and `prompt="#"` changes the command glyph from `$`.

=== "Syntax"

    ````text
    ```docs-terminal title="validate"
    # from the app directory
    $ pnpm docs:check
    ✓ no errors
    ```
    ````

=== "Rendered"

    ```docs-terminal title="validate"
    # from the app directory
    $ pnpm docs:check
    ✓ no errors
    ```

### Decision

`docs-decision` takes a list of options, then optional paragraphs for what follows, drawn under a rule. A **bold** option is chosen (●), an _italic_ option rejected (×) and a plain option open (○); `— reason` is drawn muted after the option. `title` defaults to `decision`, and `status="…"` and `date="…"` label the first row.

=== "Syntax"

    ````text
    ```docs-decision title="Diagram source" status="accepted"
    - **Mermaid** — chosen: renders on GitHub and in the site
    - *SVG only* — rejected: no editable source
    - SVG pair beside Mermaid — open: for central or phone-sized diagrams

    Mermaid stays the source of truth.
    ```
    ````

=== "Rendered"

    ```docs-decision title="Diagram source" status="accepted"
    - **Mermaid** — chosen: renders on GitHub and in the site
    - *SVG only* — rejected: no editable source
    - SVG pair beside Mermaid — open: for central or phone-sized diagrams

    Mermaid stays the source of truth.
    ```

### Check

`docs-check` takes a GFM task list, tight or loose. `[x]` is done and `[ ]` open. `— note` goes under the item, and a nested list holds sub-tasks.

=== "Syntax"

    ````text
    ```docs-check title="Before committing"
    - [x] Title and description frontmatter
    - [x] Listed in the nearest Contents map
    - [ ] Checks pass — run them from the app directory
      - [x] docs:check
      - [ ] build
    ```
    ````

=== "Rendered"

    ```docs-check title="Before committing"
    - [x] Title and description frontmatter
    - [x] Listed in the nearest Contents map
    - [ ] Checks pass — run them from the app directory
      - [x] docs:check
      - [ ] build
    ```

### Compare

`docs-compare` takes a GFM table. The first column holds the row labels; a blank, `—` or `-` first header leaves that column unnamed. The other headers are options. `yes`, `true`, `✓` and `x` draw ✓; `no`, `false`, `-`, `–` and `—` draw –; any other text is drawn as written. `accent="Column"` highlights one column and the others recede.

=== "Syntax"

    ````text
    ```docs-compare title="Pick a shape" accent="Figure"
    |                    | List | Figure  | Mermaid |
    | ------------------ | ---- | ------- | ------- |
    | Reads on GitHub    | yes  | yes     | yes     |
    | Shows state        | no   | yes     | partial |
    | Draws edges        | no   | no      | yes     |
    ```
    ````

=== "Rendered"

    ```docs-compare title="Pick a shape" accent="Figure"
    |                    | List | Figure  | Mermaid |
    | ------------------ | ---- | ------- | ------- |
    | Reads on GitHub    | yes  | yes     | yes     |
    | Shows state        | no   | yes     | partial |
    | Draws edges        | no   | no      | yes     |
    ```

### Annotate

`docs-annotate` takes a code fence whose lines end in markers such as `// (1)`, `# (2)`, `-- (3)`, `/* (4) */` or `<!-- (5) -->`, then an ordered list: item 1 explains (1). Marked lines stay bright and the rest recede. Use four backticks on the outer fence, and set `title`: it defaults to `code`, because the highlighter adds no language class.

=== "Syntax"

    `````text
    ````docs-annotate title="globals.css"
    ```css
    @import 'tailwindcss';
    @import '@open-agent-toolkit/docs-theme/figures.css'; /* (1) */
    @source '../node_modules/@open-agent-toolkit/docs-theme/dist/**/*.js'; /* (2) */
    ```

    1. Adds the figure tokens and frame utilities.
    2. Generates the Tailwind classes the figure components use.
    ````
    `````

=== "Rendered"

    ````docs-annotate title="globals.css"
    ```css
    @import 'tailwindcss';
    @import '@open-agent-toolkit/docs-theme/figures.css'; /* (1) */
    @source '../node_modules/@open-agent-toolkit/docs-theme/dist/**/*.js'; /* (2) */
    ```

    1. Adds the figure tokens and frame utilities.
    2. Generates the Tailwind classes the figure components use.
    ````

## Diagrams and accessibility

Run the app’s docs:check script (from the repository root: `cd {{APP_CWD}} && pnpm docs:check`) before committing. It checks reader metadata/maps/links, navigation, contributor commands, real Mermaid syntax and unknown `docs-*` fence names without building the site. Errors fail; warnings prompt review. Fix authored sources, then explicitly sync owned navigation and retry.

Mermaid is the diagram source of truth. Important or phone-sized diagrams also get matching `<name>-light.svg` and `<name>-dark.svg` assets. Change the Mermaid and both SVGs in the same commit, preserving nodes, edges and labels. Each SVG uses `role="img"`, a descriptive `<title>` and `<desc>` (connected with `aria-labelledby`), a legible viewBox and readable labels. Keep image alt text concise, about 155 characters or less, and describe the diagram's meaning without inventing claims.

=== "Syntax"

    ````text
    === "Mermaid source"

        ```mermaid
        flowchart LR
          A[Read local map] --> B[Make a focused edit]
        ```
    ````

=== "Rendered"

    ```mermaid
    flowchart LR
      accTitle: Documentation edit
      accDescr: Read the local map before making a focused edit.
      A[Read local map] --> B[Make a focused edit]
    ```

Fumadocs images live under `public/diagrams/` and use root-relative `/diagrams/name-light.svg` and `/diagrams/name-dark.svg` links; the theme adds the base path and shows the matching theme. Place the pair in a Diagram tab beside a Mermaid source tab. Markdown images are zoomable; static search and the light/dark theme are configured.
