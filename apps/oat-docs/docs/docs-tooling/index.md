---
title: Docs Tooling
description: Standalone adoption lane for docs app setup, docs commands, and docs maintenance workflows.
---

# Docs Tooling

Docs Tooling is the OAT lane for setting up, maintaining, and restructuring a documentation surface with OAT.

Use this section when you are adopting the docs app workflow in a repo, maintaining generated navigation, or using the analyze/apply docs workflows. OAT supports both Fumadocs and MkDocs: the site framework changes the surrounding app setup and generated artifacts, but the underlying documentation contract stays centered on `index.md` and `## Contents`.

## Contents

- [Add Docs to a New Repo](add-docs-to-a-repo.md) - Bootstrap a docs app and adopt the docs workflow in a repo.
- [Docs App Commands](commands.md) - Docs CLI surface for init, migration, index generation, and nav sync.
- [Docs Workflows](workflows.md) - How the docs CLI helpers pair with analyze/apply workflows.

## What This Section Is

This section explains how OAT supports docs surfaces, how the index contract works in practice, and which commands or workflows to use for bootstrapping, maintenance, and restructure work.

## Who It's For

- Repos adding a docs app for the first time
- Teams maintaining directory indexes and generated navigation
- Users who want a controlled analyze/apply flow for docs changes

## Start Here

- Use [Add Docs to a Repo](add-docs-to-a-repo.md) when you are bootstrapping a docs surface.
- Go to [Commands](commands.md) when you already have a docs app and need the CLI surface.
- Use [Workflows](workflows.md) when you want analysis-backed restructuring rather than ad hoc manual edits.

## Common Tasks

- Bootstrap docs app support with [Add Docs to a Repo](add-docs-to-a-repo.md).
- Maintain docs structure with [Commands](commands.md).
- Use the governed workflow in [Workflows](workflows.md).
- Check the underlying docs contract in [Docs Index Contract](../reference/docs-index-contract.md).

## Go Deeper

- [Add Docs to a Repo](add-docs-to-a-repo.md) - Bootstrap a docs app and adopt the docs workflow in a repo.
- [Commands](commands.md) - Docs CLI surface for init, migration, index generation, and nav sync.
- [Workflows](workflows.md) - How the docs CLI helpers pair with analyze/apply workflows.
- [Docs Index Contract](../reference/docs-index-contract.md) - Framework-neutral `index.md` rules plus Fumadocs and MkDocs generation notes.
