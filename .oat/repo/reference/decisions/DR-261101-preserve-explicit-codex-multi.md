---
id: DR-261101-preserve-explicit-codex-multi
title: Preserve explicit Codex multi-agent settings
date: 2026-11-01
status: accepted
legacy_id: null
---

# Preserve explicit Codex multi-agent settings

## Context

mergeCodexConfig forced [features] multi_agent = true and raised [agents] max_depth to at least 2 on every sync, overwriting user values despite the adoption docs, and reported only a generic codex:config:update. Default managed dispatch needs depth 1; depth 2 only enables optional nested phase work, and oat doctor already warns when managed roles exist without multi_agent.

## Decision

oat sync and oat providers codex materialize never rewrite an explicit multi_agent or max_depth value. They add only absent keys (max_depth 2 or a higher inherited value) and report each added key, conflict and note in human and JSON output. multi_agent = false and max_depth below 1 are reported as conflicts; max_depth = 1 is kept and noted as disabling only optional nested work. Sync still writes role files and tables rather than refusing the role step.

## Consequences

Users stay in control of their Codex config, and sync output says what OAT needs when a kept value conflicts. A repository with multi_agent = false receives roles it cannot use until the user changes the value; oat doctor reports that condition.
