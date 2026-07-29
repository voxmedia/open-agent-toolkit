---
id: DR-260729-adaptive-recaps-share-one
title: Adaptive recaps share one immutable set plan
date: 2026-07-29
status: accepted
legacy_id: null
---

# Adaptive recaps share one immutable set plan

## Context

Independent per-artifact authoring could drift in terminology, status, numbers, source coverage, and visual intent across a recap set.

## Decision

Plan each adaptive recap once and bind every artifact to one immutable shared ledger covering portfolio, drafts, terminology, status, numbers, sources, and visual intent.

## Consequences

Whole-set cohesion becomes a verifiable runtime contract; retained plans must be authenticated across approval resume and supplied consistently to every author.
