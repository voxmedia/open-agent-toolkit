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

Learnings are judgment entries in project-log.md with a body head of **Category:** (gotcha, efficiency, documentation-gap, candidate-skill-content, decision, environment-limited), **Source:**, **Origin:** and **Recorded:**, written through one shared producer function with the source id as idempotency key. No producer creates oat-execution-learnings.md; summary and retro read the log first and an existing legacy file second, deduplicating only proven twins. Disabling the project log (`workflow.projectLog: false`) stops its creation: when no project-log.md exists, learnings are not persisted, the append skips and the producer warns once and continues. An existing project-log.md keeps accepting learnings without a warning regardless of the flag, so recorded history is never stranded (DR-260718-automatic-create-on-first; artifact-cleanup D3, D14 as amended 2026-10-12).

## Consequences

The four judgment types and the heading grammar are unchanged. oat project log check reports learnings: legacy for an older project. Disabling the log is the operator's choice; the goal skill's disabled-log fallback is gone.
