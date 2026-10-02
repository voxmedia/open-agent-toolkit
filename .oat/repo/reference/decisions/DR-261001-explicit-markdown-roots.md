---
id: DR-261001-explicit-markdown-roots
title: Explicit Markdown roots
date: 2026-10-01
status: accepted
legacy_id: null
---

# Explicit Markdown roots

## Context

Plain Markdown needed an explicit bootstrap mode without a site application, and nested docs directories could otherwise replace the configured content root.

## Decision

Use the existing documentation config contract with tooling markdown, a dedicated literal content root (default docs), and its authored index.md. Retain framework and undeclared-tooling root heuristics.

## Consequences

Markdown creates no docs application, dependencies, or site commands. Config, generation, skills, and instruction consumers must agree on the literal root and exclude the complete content tree from pointer writes.
