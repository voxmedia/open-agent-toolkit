---
title: Markdown Features
description: 'Supported markdown patterns for OAT docs, including frontmatter, callouts, Mermaid, tabs, and code blocks.'
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
change the Mermaid, update both SVGs in the same change.

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

## Authoring Reminder

After adding or reorganizing docs pages, refresh the generated docs surface:

```bash
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```
