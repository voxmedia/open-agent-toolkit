---
id: DR-260906-fumadocs-config-write-survives
title: Fumadocs config write survives a declared documentation config
date: 2026-09-06
status: accepted
legacy_id: null
---

# Fumadocs config write survives a declared documentation config

## Context

The docs-index plan carried two overlapping config-write rules that conflicted when documentation.tooling is fumadocs and documentation.config is set, which is this repository's own live config shape. The bootstrap transition documented in oat-docs-bootstrap depends on generation updating documentation.index to the app-root manifest.

## Decision

Generation updates documentation.index whenever tooling is fumadocs and the output lies inside documentation.root; it never writes config when tooling names anything other than fumadocs, or when tooling is undeclared and documentation.config is set.

## Consequences

Both branches are pinned by tests that fail from both sides when the tooling discriminator is removed; the plan clause was amended to match; MkDocs configuration is never touched.
