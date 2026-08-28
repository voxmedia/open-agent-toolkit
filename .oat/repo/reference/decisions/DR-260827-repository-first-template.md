---
id: DR-260827-repository-first-template
title: Repository-first template precedence
date: 2026-08-27
status: accepted
legacy_id: null
---

# Repository-first template precedence

## Context

User-installed PJM templates should provide reusable defaults without overwriting repository-specific templates and policy.

## Decision

Resolve PJM templates in repository, user, then bundled-release order.

## Consequences

Repository owners retain authoritative customization, users can manage shared defaults once, and the CLI always has a bundled fallback.
