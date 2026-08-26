---
id: DR-260826-pre-plan-the-lockstep-bump
title: Pre-plan the lockstep bump as part of a wave lane
date: 2026-08-26
status: accepted
legacy_id: null
---

# Pre-plan the lockstep bump as part of a wave lane

## Context

Wave 1 learned late that any packages/cli/src/\*\* change (tests included) is a publishable change requiring the five-package lockstep bump, forcing a root-owned bump after fan-in.

## Decision

At the wave-boundary drift refresh, intersect each lane's write surface with the release change-detection roots and, when they overlap, add a rule-1 addendum that extends the in-worktree recheck to the release surfaces and requires a fetch-first pnpm release:check-versions before commit; the lane owns the bump.

## Consequences

Wave 2 shipped 0.2.33 -> 0.2.34 inside the lane with no post-fan-in bump commit; the plan gate could verify the bump plan up front; W3-W4 inherit the rule.
