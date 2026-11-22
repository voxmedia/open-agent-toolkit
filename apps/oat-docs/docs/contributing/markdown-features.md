---
title: Markdown Features
description: 'Supported markdown patterns for OAT docs, including frontmatter, callouts, Mermaid, tabs, code blocks and docs-* figure fences.'
---

# Markdown Features

This page is the syntax reference for the markdown patterns supported by the current OAT docs app.

## Frontmatter

Every page should include `title` and `description` in YAML frontmatter.

=== "Syntax"

    ```yaml
    ---
    title: Page Title
    description: A short summary of the page.
    ---
    ```

## Callouts

GitHub-style blockquote callouts are supported.

=== "Syntax"

    ```text
    > [!NOTE]
    > Useful supporting context.

    > [!WARNING]
    > Important caution for the reader.
    ```

=== "Rendered"

    > [!NOTE]
    > Useful supporting context.

    > [!WARNING]
    > Important caution for the reader.

## Mermaid Diagrams

Fenced code blocks with `mermaid` are rendered as diagrams.

=== "Syntax"

    ````text
    ```mermaid
    flowchart LR
      A[Read docs tree] --> B[Generate index]
    ```
    ````

=== "Rendered"

    ```mermaid
    flowchart LR
      A[Read docs tree] --> B[Generate index]
    ```

Rendered Mermaid diagrams use the site palette. Click or tap one to open it
full screen at a legible size; on a phone, pan to see the rest. Press Escape,
the close button, or click again to close it.

## Images and Diagram SVGs

Every Markdown image opens in a zoom view when clicked. SVG images open full
screen at a legible size, like Mermaid diagrams. Put images under
`public/` and link them with a root-relative path such as
`/diagrams/name.svg`; the site adds its base path.

Name a pair of files `<name>-light.<ext>` and `<name>-dark.<ext>` to show one
image per site theme. Place both images together; each is shown only in its
theme.

A diagram that needs to read well, especially on a phone, gets a hand-drawn SVG
pair next to its Mermaid source. Mermaid stays the source of truth: when you
change the Mermaid, update both SVGs in the same commit, preserving nodes, edges and labels. Give each SVG `role="img"` and descriptive `<title>`/`<desc>` elements connected by `aria-labelledby`; keep labels readable and Markdown alt text concise (about 155 characters or less).

=== "Syntax"

    ````text
    === "Diagram"

        ![What the diagram shows](/diagrams/name-light.svg)
        ![What the diagram shows](/diagrams/name-dark.svg)

    === "Mermaid source"

        ```mermaid
        flowchart LR
          A[Read docs tree] --> B[Generate index]
        ```
    ````

The alt text describes what the diagram shows and claims nothing the Mermaid
does not.

## Tabs

Tab groups use the existing tab transform syntax:

=== "Syntax"

    ```text
    === "pnpm"

        pnpm install

    === "npm"

        npm install
    ```

=== "Rendered"

    === "pnpm"

        pnpm install

    === "npm"

        npm install

## Code Blocks

Standard fenced code blocks support syntax highlighting and optional file-title metadata.

Use a language identifier on every opening fence. In this docs app, use `bash` for shell commands because the existing examples and repo scripts are Bash-oriented; use `sh` only when the command is intentionally POSIX-shell-specific.

=== "Syntax"

    ````text
    ```typescript title="src/example.ts"
    const greeting = 'hello world';
    console.log(greeting);
    ```
    ````

=== "Rendered"

    ```typescript title="src/example.ts"
    const greeting = 'hello world';
    console.log(greeting);
    ```

## Figure Fences

A `docs-*` fence draws a framed figure from ordinary Markdown in its body. GitHub, the agent endpoints and any reader of the source still see a readable code block. The eight fences are `docs-steps`, `docs-tree`, `docs-timeline`, `docs-terminal`, `docs-decision`, `docs-check`, `docs-compare` and `docs-annotate`; any other `docs-*` name fails `pnpm --filter oat-docs docs:check` and the build with the list of known fences. Attributes follow the language: `title="…"` labels the frame, and `frame="corners"`, `frame="rule"` or `frame="none"` replaces the default box.

- **State in words:** bold and italic set a figure's state (current, next, chosen, rejected), but agents and GitHub readers see only the source. Never let emphasis carry an important state alone; write it in the text too, for example `**brainstorming (current)**`.
- **Plain-text rows:** figure rows are plain text. Links and inline code lose their formatting in step titles and tight step bodies (`Title — body`), tree rows, timeline labels, check items, decision options, every `— note` and compare cells. Put a link in a loose step body, a loose timeline item's body, a decision's follow-up paragraph, an annotate note, or a paragraph after the figure.
- **No nesting:** figures may sit inside tabs, but a `docs-*` fence inside a figure body fails the build (`nested-docs-fence`). The docs checker checks fence names at the top level and inside tabs only, so the build is what catches a nested one.
- **Four backticks:** write `docs-annotate` with a four-backtick outer fence so its inner code fence survives.

### Steps

`docs-steps` takes an ordered or unordered list, one item per step, numbered `01`, `02`, …. A loose item (blank lines between items) uses its first paragraph as the title and every later block as the body, which keeps links and code. A tight item reads `Title — body`. A **bold** title is the current step, an _italic_ title the next, and a plain title is done.

=== "Syntax"

    ````text
    ```docs-steps title="Publish a page"
    1. Draft the page (done)

       Write the Markdown under `docs/`; [Documentation](documentation.md) has the page contract.

    2. **Update the Contents map (current)**

       Add the page to the nearest `index.md`.

    3. *Run the checks (next)*

       Run `pnpm --filter oat-docs docs:check` before committing.
    ```
    ````

=== "Rendered"

    ```docs-steps title="Publish a page"
    1. Draft the page (done)

       Write the Markdown under `docs/`; [Documentation](documentation.md) has the page contract.

    2. **Update the Contents map (current)**

       Add the page to the nearest `index.md`.

    3. *Run the checks (next)*

       Run `pnpm --filter oat-docs docs:check` before committing.
    ```

### Tree

`docs-tree` takes a nested list, one node per item. `name — note` draws the note right-aligned. A **bold** node and its ancestors take the accent while the other rows recede. A trailing `/` marks a folder by convention only.

=== "Syntax"

    ````text
    ```docs-tree title="apps/oat-docs"
    - docs/
      - index.md — top-level Contents map
      - contributing/
        - documentation.md — docs contract and workflow
        - **markdown-features.md — this page (you are here)**
    ```
    ````

=== "Rendered"

    ```docs-tree title="apps/oat-docs"
    - docs/
      - index.md — top-level Contents map
      - contributing/
        - documentation.md — docs contract and workflow
        - **markdown-features.md — this page (you are here)**
    ```

### Timeline

`docs-timeline` takes a list of `label: text` items, split at the first colon followed by a space. `— note`, or the blocks of a loose item, adds a muted note. A plain item is done (●), a **bold** item is now (● in the accent) and an _italic_ item is next (○).

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
    # from the repository root
    $ pnpm --filter oat-docs docs:check
    ✓ no errors
    ```
    ````

=== "Rendered"

    ```docs-terminal title="validate"
    # from the repository root
    $ pnpm --filter oat-docs docs:check
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
    - [ ] Checks pass — run them from the repository root
      - [x] docs:check
      - [ ] build
    ```
    ````

=== "Rendered"

    ```docs-check title="Before committing"
    - [x] Title and description frontmatter
    - [x] Listed in the nearest Contents map
    - [ ] Checks pass — run them from the repository root
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

## Authoring Reminder

After adding, moving or renaming pages, update both authored maps and inbound links. From the **repository root**, refresh and validate the generated surfaces:

```bash
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

```bash
pnpm -w run cli:source -- docs nav sync --target-dir apps/oat-docs
pnpm -w run cli:source -- docs nav sync --target-dir apps/oat-docs --check
pnpm --filter oat-docs docs:format
pnpm --filter oat-docs docs:format:check
pnpm --filter oat-docs docs:lint
pnpm docs:validate
pnpm build:docs
```

These checks cover navigation, source contracts, formatting and build output. Inspect rendered tabs, diagrams and figures too; they do not validate Mermaid syntax, figure grammar or accessibility automatically. Agent rules live in `../../AGENTS.md` (app-root source file).
