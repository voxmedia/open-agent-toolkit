---
id: DR-260830-typed-portability-classifier
title: Typed portability classifier
date: 2026-08-30
status: accepted
legacy_id: null
---

# Typed portability classifier

## Context

The cross-skill portability ratchet did not cover canonical agent paths, and separate matching logic for manifest-derived user-default assets and every canonical agent could drift or miss new bare reads.

## Decision

Use one lexical classifier that emits typed skill and agent findings with exact evidence, while retaining both independent scan scopes. Keep the historical skill baseline unchanged and require a zero-executable baseline for agent targets.

## Consequences

New bare canonical-agent reads fail with exact source-to-target evidence and both coverage perspectives remain active if manifest representation changes. The repository accepts a small amount of duplicate scanning to avoid duplicated matching semantics or a silent coverage assumption.
