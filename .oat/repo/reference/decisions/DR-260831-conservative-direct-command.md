---
id: DR-260831-conservative-direct-command
title: Conservative direct-command validation
date: 2026-08-31
status: accepted
legacy_id: null
---

# Conservative direct-command validation

## Context

Lifecycle gate commands could be stored without the canonical structured-output form, but arbitrary wrappers and provider exec-target base commands are separate contracts that a narrow validator cannot safely interpret.

## Decision

Validate only recognized direct oat gate review commands before configuration writes, require oat --json gate review, preserve valid command text byte-for-byte, and leave wrappers, pipelines, and provider baseCommand values outside the classifier.

## Consequences

Malformed recognized lifecycle commands fail before shared, local, or user config mutation; unknown wrapper-heavy forms retain compatibility but are not covered by this validation guarantee.
