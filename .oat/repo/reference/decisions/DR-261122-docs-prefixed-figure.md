---
id: DR-261122-docs-prefixed-figure
title: Docs-prefixed figure components via withDocsFigures
date: 2026-11-22
status: accepted
legacy_id: null
---

# Docs-prefixed figure components via withDocsFigures

## Context

The fence transform emits component names that the docs app must provide. Names like Steps collide with Fumadocs built-ins, and figures must recognize their children even when the host overrides tags such as p, ul and li.

## Decision

docs-theme exports withDocsFigures(components), which adds the eight Docs-prefixed components (DocsSteps, DocsTree, ...) and marks overridden host tags, plus a ./figures.css export with scoped --graph-\* tokens. It replaces upstream withMdxcn. A contract test asserts the exported components match the DOCS_FENCES table.

## Consequences

Scaffolded apps wire figures with one wrapper call and one CSS import. Existing apps that bump packages without wrapping get MDX's missing-component error the first time a page uses a figure, and oat-docs-analyze repairs legacy scaffolds.
