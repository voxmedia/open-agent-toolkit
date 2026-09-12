---
id: DR-260831-approval-bound-homogeneous
title: Approval-bound homogeneous dispatch
date: 2026-08-31
status: superseded
legacy_id: null
---

# Approval-bound homogeneous dispatch

## Context

Recon is intended to fan out inexpensive workers, but model availability changes and the user must retain control over the exact cost and capability selection.

## Decision

Keep recon provider-neutral and require explicit approval of one exact model and effort selection before launch; use that approved homogeneous selection for every worker in the run.

## Consequences

The run's cost and concurrence envelope is auditable without baking a dated model into the skill. Independence comes from blind or separately scoped passes rather than heterogeneous model selection.

## Superseded

Superseded on 2026-09-10 by DR-260910-restore-economical-recon. Approval now
binds independently selected exact targets for every wave in one complete
envelope, so a harder assignment does not raise unrelated evidence workers to a
run-wide maximum.
