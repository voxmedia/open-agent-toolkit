---
id: DR-260706-managed-uncapped-is-explicit
title: Managed Uncapped is explicit state
date: 2026-07-06
status: accepted
legacy_id: null
---

# Managed Uncapped is explicit state

## Context

The absence of dispatch policy remains unresolved or legacy-compatible; it is not silently upgraded into managed uncapped behavior.

## Decision

Represent managed uncapped dispatch as explicit persisted policy state instead
of relying on a missing dispatch policy or ceiling value.

## Consequences

Existing projects with absent policy state continue to prompt or block according
to interactive/non-interactive rules. Users must choose `Uncapped` before OAT
uses uncapped preferred selection.
