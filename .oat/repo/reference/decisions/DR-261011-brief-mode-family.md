---
id: DR-261011-brief-mode-family
title: Brief mode family and isBriefMode predicate
date: 2026-10-11
status: accepted
legacy_id: null
---

# Brief mode family and isBriefMode predicate

## Context

OAT needed a workflow for one delivery whose outcome and design can be agreed in conversation, without discovery, spec, design, or an up-front task plan. A later goal mode (many milestones) shares most of its contract.

## Decision

Register brief as a fifth workflow mode beside spec-driven, quick, import, and lite, and define a mode family BRIEF_MODES with one predicate isBriefMode in the control plane. Goal is appended to WORKFLOW_MODES and BRIEF_MODES only when its consumers ship (v1.5), so --mode choices never expose it early. No other isXMode helpers are added; existing === 'lite' checks stay. The entry skill is oat-project-brief and the shared rules live in its references/brief-contract.md.

## Consequences

Record<WorkflowMode, ...> maps become type errors on registration, forcing scaffold, router, and dashboard coverage. Every mode-aware skill, doc, and test that lists quick with spec-driven and lite must also name brief; a contract test guards that inventory. Goal reuses the family seam instead of adding a parallel one.
