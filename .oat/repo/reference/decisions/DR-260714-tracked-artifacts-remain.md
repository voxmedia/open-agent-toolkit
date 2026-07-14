---
id: DR-260714-tracked-artifacts-remain
title: Tracked artifacts remain formatted
date: 2026-07-14
status: accepted
legacy_id: null
---

# Tracked artifacts remain formatted

## Context

Ignore patterns were rejected as the upstream solution because project summaries, reviews, and other lifecycle artifacts are tracked, reviewed content across multiple locations. Consumers may add local exclusions, but OAT writers remain responsible for valid output.

## Decision

Keep tracked lifecycle artifacts inside repository formatting coverage and make
their writers responsible for producing valid output. Do not use ignore
patterns as the upstream substitute for formatting.

## Consequences

Project reviews, summaries, plans, and other tracked Markdown remain suitable
for whole-tree format gates and code review. Consuming repositories may add
local exclusions, but those exclusions do not weaken OAT's writer contract.
