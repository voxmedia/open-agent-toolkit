---
id: DR-261011-goal-milestone-extraction-is
title: Goal milestone extraction is manual in v1.5
date: 2026-10-11
status: accepted
legacy_id: null
---

# Goal milestone extraction is manual in v1.5

## Context

A goal phase sometimes grows into work that deserves its own project. oat-project-split decomposes plans into sibling projects but knows nothing of milestones, deliveries or the outcome audit.

## Decision

Extraction in goal mode is a manual brief amendment, not oat-project-split: the transferred phase gets '**Extracted to:** <slug>' in the brief and the journal marker pair '**Status:** extracted' / '**Extracted to:** <slug>'; the child project records oat_extracted_from: <goal slug> and the transferred outcome text. The phase is exempt from milestone membership, is never delivered by the goal, and stays in the outcome audit as extracted: the closeout boundary resolves the child by slug and requires it complete, or an approved deferral (non-empty reason and scope_decision_ref) under met_with_deferrals (child-deferral-under-met otherwise). split is unchanged.

## Consequences

Promotion of a goal (or brief) with an extracted phase is refused (extracted-phases). An automated extraction path is a later candidate (backlog), not v1.5 scope.
