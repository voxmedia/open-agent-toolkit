---
id: DR-261024-reader-first-starter-ownership
title: Reader-first starter ownership
date: 2026-10-24
status: accepted
legacy_id: null
---

# Reader-first starter ownership

## Context

Issue #367 P9-P18 found reader onboarding mixed with framework/toolchain setup and duplicated scaffold guidance ownership. Approved p05 required coherent reader/contributor maps and parity with the actual pinned framework loader and flagship app.

## Decision

Let the CLI own framework scaffold AGENTS, keep Getting Started for readers, and put contributor/toolchain instructions under contributing. Maintain an explicit template/runtime parity set and static-export agent Markdown endpoints from the same loaded non-reader-filtered .md reader set.

## Consequences

Markdown mode creates no docs-root AGENTS. Per-page exports use /llms/<page-slugs>/content.md, exclude MDX and honor basePath; raw Markdown is not a second transform pipeline. MkDocs/Material stays a disclosed legacy alternative, and non-reader exclusion is not a privacy guarantee. Evidence: docs-skills-ia-367 accepted p05/p07, implementation.md Outcome 7 and delivery checklist P9-P18.
