---
id: DR-260716-transcript-metadata-is
title: Transcript metadata is observability
date: 2026-07-16
status: accepted
legacy_id: null
---

# Transcript metadata is observability

## Context

Stdout-only liveness made active silent reviews look hung, but provider transcript schemas and session correlation are unstable.

## Decision

Probe bounded transcript filesystem mtime and size without reading content, and label project-scoped versus ambient evidence explicitly.

## Consequences

Operators can distinguish observable activity from silence without treating metadata as health, extending budgets, or changing pass/fail.
