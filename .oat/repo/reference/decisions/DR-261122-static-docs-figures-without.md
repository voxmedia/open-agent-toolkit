---
id: DR-261122-static-docs-figures-without
title: Static docs figures without motion
date: 2026-11-22
status: accepted
legacy_id: null
---

# Static docs figures without motion

## Context

Upstream mdxcn components animate with the motion library, which risks hydration mismatches and empty frames for print, no-JS and agent readers, and adds a dependency to every downstream docs app.

## Decision

OAT's vendored figure components are static server components: no motion, no React context, and no content hidden in the server HTML.

## Consequences

Figures are fully visible on first render for every reader, and downstream apps take no motion dependency. Upstream animation changes are not tracked; any future motion would need a new decision.
