---
id: DR-260731-tiered-prevention
title: Tiered prevention with observable recovery
date: 2026-07-31
status: accepted
legacy_id: null
---

# Tiered prevention with observable recovery

## Context

Task-local defects should be caught before commit without forcing disproportionate full-repository checks per task, and reduced authorization prompts must not hide unchanged defect volume.

## Decision

Run every applicable discoverable and proportionate check before task commits, retain expensive broad checks at phase boundaries when appropriate, and emit one canonical event for every later post-commit recovery disposition.

## Consequences

Prevention cost stays proportional to the changed surface. Composition failures can still enter bounded recovery, while canonical records make defect class, discovering check, authorization source, attempt usage, and outcome measurable independently of prompt count.
