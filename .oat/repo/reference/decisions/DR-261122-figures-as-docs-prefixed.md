---
id: DR-261122-figures-as-docs-prefixed
title: Figures as docs-prefixed fenced code blocks
date: 2026-11-22
status: accepted
legacy_id: null
---

# Figures as docs-prefixed fenced code blocks

## Context

OAT docs needed rich figures (steps, trees, timelines) authored in plain Markdown that still reads well on GitHub. The candidates were fenced code blocks, remark directives, or raw JSX.

## Decision

Docs figures are fenced code blocks whose language carries a docs- prefix (docs-steps, docs-tree, docs-timeline, docs-terminal, docs-decision, docs-check, docs-compare, docs-annotate). A remark transform, remarkDocsFences in docs-transforms, turns each fence into a component at build time, following the existing Mermaid and tabs pattern.

## Consequences

Sources stay readable on GitHub and in MkDocs, where the fences render as plain code. The prefix avoids collisions with real code languages and makes figure usage greppable. One DOCS_FENCES table drives the transform, the components and the checker.
