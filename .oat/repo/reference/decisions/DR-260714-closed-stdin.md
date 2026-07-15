---
id: DR-260714-closed-stdin
title: Closed stdin for noninteractive gates
date: 2026-07-14
status: accepted
legacy_id: null
---

# Closed stdin for noninteractive gates

## Context

Gate prompts already travel through process arguments, but inherited stdin could make a noninteractive target wait for parent EOF.

## Decision

Ignore stdin at the gate process boundary while continuing to pipe stdout and stderr.

## Consequences

Noninteractive targets start promptly without changing diagnostics, liveness tracking, timeout handling, or target selection.
