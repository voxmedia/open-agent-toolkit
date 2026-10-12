---
id: DR-261012-learnings-in-the-project-log
title: Learnings in the project log
date: 2026-10-12
status: accepted
legacy_id: null
---

# Learnings in the project log

## Context

Autonomous, cloud and goal runs wrote learnings to oat-execution-learnings.md while other observations went to project-log.md, so summary and retro read two formats and the learnings file had no categories in the log.

## Decision

Learnings are judgment entries in project-log.md with a body head of **Category:** (gotcha, efficiency, documentation-gap, candidate-skill-content, decision, environment-limited), **Source:**, **Origin:** and **Recorded:**, written through one shared producer function with the source id as idempotency key. No producer creates oat-execution-learnings.md; summary and retro read the log first and an existing legacy file second, deduplicating only proven twins. With the project log disabled, learnings are not persisted: the producer warns once and continues (artifact-cleanup D3, D14).

## Consequences

The four judgment types and the heading grammar are unchanged. oat project log check reports learnings: legacy for an older project. Disabling the log is the operator's choice; the goal skill's disabled-log fallback is gone.
