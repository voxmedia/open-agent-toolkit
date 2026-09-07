---
id: DR-260831-approval-bound-homogeneous
title: Approval-bound homogeneous dispatch
date: 2026-08-31
status: accepted
legacy_id: null
---

# Approval-bound homogeneous dispatch

## Context

Recon is intended to fan out inexpensive workers, but model availability changes and the user must retain control over the exact cost and capability selection.

## Decision

Keep recon provider-neutral and require explicit approval of one exact model and effort selection before launch; use that approved homogeneous selection for every worker in the run.

## Consequences

The run's cost and concurrence envelope is auditable without baking a dated model into the skill. Independence comes from blind or separately scoped passes rather than heterogeneous model selection.
