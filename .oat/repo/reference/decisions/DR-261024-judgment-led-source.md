---
id: DR-261024-judgment-led-source
title: Judgment-led source verification
date: 2026-10-24
status: accepted
legacy_id: null
---

# Judgment-led source verification

## Context

Issue #367 P24 needs source-aware Product, Engineering and QA assessments, but literal occurrence does not establish runtime or semantic truth. The accepted public synthetic p08 prototype supports narrow occurrence evidence rather than a generic registry or scenario engine.

## Decision

Keep all six P24 assessments in oat-docs-analyze after reconciling authored accepted triad IA and its config mirror. Use oat docs literals only for bounded line-local, case-sensitive substring occurrences with one strict entity decode; require actual mapping/source/registry evidence for judgments.

## Consequences

Missing evidence remains unverified/ask_user, not-found alone is not contradiction, and comments or dead code can match. Canonical selected page/source identities and contained non-symlink inputs are checked; the helper adds no G5 severity or runtime verdict. Evidence: docs-skills-ia-367 plan.md p08, accepted p08 and references/p08-source-verification-prototype.md.
