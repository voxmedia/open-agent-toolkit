---
id: DR-260827-scope-neutral-complete-pack
title: Scope-neutral complete pack contract
date: 2026-08-27
status: accepted
legacy_id: null
---

# Scope-neutral complete pack contract

## Context

Pack availability previously relied on partial, command-specific definitions and could treat one installed member as a complete pack.

## Decision

Use one typed release manifest and scoped intent plus full inventory as the authority for every pack lifecycle command at project and user scope.

## Consequences

Updates add new release members and restore missing managed assets; commands share deterministic ownership and completeness semantics; durable per-member exclusions are not supported.
