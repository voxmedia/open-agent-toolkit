---
id: DR-260817-security-relevant-options-must
title: Security-relevant options must be required arguments
date: 2026-08-17
status: accepted
legacy_id: null
---

# Security-relevant options must be required arguments

## Context

p07 added a publicAccess option to catalogFromManifest that silently defaulted to the permissive public branch. It was threaded through the call sites inside the task's declared file boundary and missed the four outside it — exactly the four files absent from the fixing commit's diff — making protected-mode publication unable to reach built-durable, concealed by two fixtures that rebuilt their expected value with the same omission.

## Decision

Make security-relevant policy options required arguments whose omission throws: catalogFromManifest and validateInitiativeCatalog require an explicit { publicAccess }, with explicit undefined reading as public for v1 records that carry no such field. The guard tests call-site syntax ('publicAccess' in options), which cannot be satisfied by accident of data flow. Cross-cutting options additionally require a repo-wide call-site sweep, not a boundary-scoped edit.

## Consequences

A missed call site is a loud throw instead of a silently wrong hash; 30 call sites were swept and the strictness is enforced by a dedicated guard test. Residual class accepted: an expression that evaluates to undefined remains silently permissive (no site exposed).
