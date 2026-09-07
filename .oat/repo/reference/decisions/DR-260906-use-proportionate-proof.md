---
id: DR-260906-use-proportionate-proof
title: Use proportionate proof instead of universal TDD
date: 2026-09-06
status: accepted
legacy_id: null
---

# Use proportionate proof instead of universal TDD

## Context

Mandatory test-first wording can cause agents to build low-value fixtures and harnesses for prose, mechanical changes, or other work where that ceremony does not improve confidence.

## Decision

Require each Lite task to declare a proof strategy proportionate to its observable risk. Behavioral changes need fail-capable evidence, while static, build, documentation, or visual proof may be used when appropriate.

## Consequences

Review judges whether evidence matches the declared risk instead of grading on test presence. Bugs and assurance-sensitive contracts retain stronger negative controls, and unavailable required manual or visual proof remains a stop boundary.
