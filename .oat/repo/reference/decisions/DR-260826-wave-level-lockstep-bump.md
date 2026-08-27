---
id: DR-260826-wave-level-lockstep-bump
title: Wave-level lockstep bump instead of exempting test paths
date: 2026-08-26
status: accepted
legacy_id: null
---

# Wave-level lockstep bump instead of exempting test paths

## Context

In wave-1-execution, plan-mandated test files under packages/cli/src/release/ made packages/cli a changed publishable root (versionPolicyIgnorePatterns is only assets/\*\*), so release:check-versions demanded a five-package lockstep bump that the phase could not make within its scope.

## Decision

Perform one root-owned lockstep bump of all five public packages (0.2.32 to 0.2.33) on the integration branch after fan-in rather than exempting src/\*_/_.test.ts from version policy.

## Consequences

The repository guardrail is honored with a single reviewable commit; the new strict-greater guard exercises its green path; whether test-only paths should be version-policy-ignored remains an open operator policy decision tracked as a backlog candidate.
