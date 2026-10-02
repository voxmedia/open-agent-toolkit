---
id: DR-261001-authored-markdown-indexes
title: Authored Markdown indexes
date: 2026-10-01
status: accepted
legacy_id: null
---

# Authored Markdown indexes

## Context

Human and agent context entrypoints must not be overwritten by a generated inventory, including when a narrowed source scan would otherwise bypass protection.

## Decision

Keep authored index.md context and Contents maps in Markdown-bearing directories. Require explicit external output for optional generated inventories and protect the full configured content root plus authored entrypoint without repointing documentation.index.

## Consequences

Generated inventories do not satisfy authored-context obligations. Canonical and lexical path checks reject narrowed and alias overwrites, asset-only directories retain exemptions, and Fumadocs manifest behavior remains unchanged.
