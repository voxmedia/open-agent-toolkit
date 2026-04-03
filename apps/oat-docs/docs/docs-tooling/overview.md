---
title: Docs Tooling Overview
description: Plain-language explanation of OAT docs support, docs app choices, and the index contract.
---

# Docs Tooling Overview

OAT can help bootstrap and maintain a structured docs surface, not just code and provider assets. The docs tooling is built around a simple contract: each directory owns an `index.md`, and that index owns a `## Contents` section that supports local discovery and generated navigation.

OAT supports both Fumadocs and MkDocs. The site framework changes the surrounding app setup, but the underlying documentation contract stays the same.

## When To Use This Section

Use Docs Tooling when:

- you are adding a docs app to a repo
- you need to keep index pages and nav structure in sync
- you want a controlled analyze/apply loop for docs restructuring work

## Typical Flow

1. Bootstrap or adopt a docs app in the repo.
2. Use the docs commands to generate or sync index/navigation structure.
3. Apply the docs workflow when you want analysis-backed restructuring rather than ad hoc manual edits.

## Continue Here

- [Add Docs to a Repo](add-docs-to-a-repo.md) for initial setup
- [Commands](commands.md) for the CLI surface
- [Workflows](workflows.md) for governed docs changes
- [Docs Index Contract](../reference/docs-index-contract.md) for the underlying rules
