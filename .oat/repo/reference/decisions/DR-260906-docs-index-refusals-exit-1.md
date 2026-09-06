---
id: DR-260906-docs-index-refusals-exit-1
title: Docs-index refusals exit 1 and configuration errors exit 2
date: 2026-09-06
status: accepted
legacy_id: null
---

# Docs-index refusals exit 1 and configuration errors exit 2

## Context

oat docs generate-index gained a refusal set (output inside the indexed tree, equal to documentation.config, YAML, unmarked derived output, symlink hop cap) alongside its unusable-configuration errors. The external plan mandated exit 2 only for configuration resolution, and packages/cli/AGENTS.md classifies actionable user errors as exit 1.

## Decision

Refusals exit 1 with an actionable message naming the flag to change; unusable configuration (missing documentation.root, root not a directory) exits 2 with a repair command.

## Consequences

Scripts can distinguish a wrong flag from a broken environment; consumers that branched on an undifferentiated exit 2 must re-check; the split is documented on the docs-tooling commands page.
