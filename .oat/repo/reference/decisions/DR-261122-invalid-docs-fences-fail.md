---
id: DR-261122-invalid-docs-fences-fail
title: Invalid docs fences fail the build
date: 2026-11-22
status: accepted
legacy_id: null
---

# Invalid docs fences fail the build

## Context

A misspelled or nested docs- fence would otherwise ship silently as a plain code block, hiding the author's mistake.

## Decision

remarkDocsFences fails the build with a positioned error for an unknown docs- fence name (unknown-docs-fence) or a docs- fence nested inside another figure (nested-docs-fence). oat docs check reports unknown names on Fumadocs apps through a docs-fences error rule, outside figure bodies, which the build covers.

## Consequences

Authors see typos at check or build time with the authored line. Adding a figure requires updating DOCS_FENCES, which keeps the transform, components and checker in step. Column positions for tab content inside list or blockquote containers remain a deferred limitation.
