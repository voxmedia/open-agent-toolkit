---
title: Documentation
description: 'Guide to OAT documentation app setup, docs commands, and docs analysis/apply workflows.'
---

# Documentation

Use this section when you are setting up, maintaining, or restructuring a docs surface with OAT.

OAT supports both Fumadocs and MkDocs. In either case, the core contract is the same: each directory gets an `index.md`, and each index owns a `## Contents` section that supports local discovery and generated navigation.

## Contents

- [Quickstart](quickstart.md) - Bootstrap a docs app and adopt the docs workflow in a repo.
- [Commands](commands.md) - Docs CLI surface for init, migration, index generation, and nav sync.
- [Workflows](workflows.md) - How the docs CLI helpers pair with `oat-docs-analyze` and `oat-docs-apply`.

## Choose an Entry Point

- Start with [Quickstart](quickstart.md) when you are adding a docs app to a repo.
- Use [Commands](commands.md) when you already have a docs app and need the exact CLI surface.
- Use [Workflows](workflows.md) when you want a controlled analyze/apply loop for docs changes instead of manual edits.

## Related Reference

- [Docs Index Contract](../../reference/docs-index-contract.md) - Rules for `index.md` and `## Contents`.
- [CLI Reference](../cli-reference.md) - Shallow map of the full OAT CLI surface.
