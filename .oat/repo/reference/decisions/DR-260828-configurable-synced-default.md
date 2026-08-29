---
id: DR-260828-configurable-synced-default
title: Configurable synced default
date: 2026-08-28
status: accepted
legacy_id: null
---

# Configurable synced default

## Context

Cross-machine continuity was the main reason projects used shared scope, but shared scope necessarily exposes lifecycle artifacts on the work branch.

## Decision

Default new projects to synced through projects.defaultScope while preserving explicit shared and local scope selections.

## Consequences

Most new projects gain branch-clean cross-machine persistence; repositories can retain legacy behavior by configuring shared, and local continues to mean machine-only.
