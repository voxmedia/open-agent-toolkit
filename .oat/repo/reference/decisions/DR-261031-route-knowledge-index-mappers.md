---
id: DR-261031-route-knowledge-index-mappers
title: Route knowledge-index mappers through the generic dispatcher
date: 2026-10-31
status: accepted
legacy_id: null
---

# Route knowledge-index mappers through the generic dispatcher

## Context

oat-repo-knowledge-index could delete generated knowledge before confirming a mapper worker could launch, and its launch blocks used Claude-only controls and a maintainer-specific temp path (GitHub #355). The operator required the skill to work on Codex and Cursor as well as Claude.

## Decision

Resolve and authorize a mapper route through oat-dispatch-subagents before any ownership cleanup or knowledge write, on both the first-run and Refresh paths, and stop untouched when no route resolves. Mapper launches are provider-neutral requests with labelled Claude, Codex and Cursor routes that launch the installed oat-codebase-mapper projection; Claude-specific controls live only in the Claude route. The write probe is a generator request verified by file, and a probe that never launched is a route failure, not read-only mode.

## Consequences

Knowledge is never mutated before a usable route exists, and the skill runs on all three providers. The workflows-pack skill now needs the utility pack's dispatch skills; it names the install/update recovery commands, and declaring a workflows-to-utility pack dependency is left for operator sign-off. The preflight was simplified at the review-cycle cap, dropping a pre-commit stray-change check (reintroduction trigger recorded).
