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
pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```
