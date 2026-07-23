---
id: DR-260723-directional-utility-dependency
title: Directional utility dependency
date: 2026-07-23
status: accepted
legacy_id: null
---

# Directional utility dependency

## Context

Utility installation supports individual skill selection, so dispatch mechanics could otherwise be installed without their required model-selection guidance.

## Decision

Selecting oat-dispatch-subagents automatically includes subagent-orchestration, while selecting subagent-orchestration alone remains valid.

## Consequences

Managed dispatch has a reliable guidance dependency and fails closed when it is unavailable, while portable guidance remains independently installable.
