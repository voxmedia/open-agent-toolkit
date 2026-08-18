---
id: DR-260817-local-gates-mirror-ci-exactly
title: Local gates mirror CI exactly
date: 2026-08-17
status: accepted
legacy_id: null
---

# Local gates mirror CI exactly

## Context

Version-bump drift twice reached review because CI's validate-skill-version-bumps step ran in no local script, so 'all local gates green' never implied CI green; separately, the orchestrator's piped gate markers (cmd | tail && echo OK) printed OK regardless of exit status, masking real failures including one at a merge commit.

## Decision

The root AGENTS.md Definition of Done lists CI's eight gate steps exactly, in CI order, so a locally green run implies CI green; check:skill-bumps and release:check-versions run locally; gate verification captures explicit per-gate exit codes and never derives success from a pipeline whose exit status is tail's.

## Consequences

contributing docs and the README point at the single authoritative list instead of carrying drifting copies. Known residual: the merge-base version check structurally cannot catch branch-behind-published-main (backlog BL-260817-detect-branch-behind-published).
