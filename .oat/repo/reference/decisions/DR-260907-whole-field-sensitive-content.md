---
id: DR-260907-whole-field-sensitive-content
title: Whole-field sensitive-content suppression
date: 2026-09-07
status: accepted
legacy_id: null
---

# Whole-field sensitive-content suppression

## Context

Inbound remote ticket text may contain sensitive material, but attempting credential-value parsing would create an unsound general-DLP claim and broader data inspection boundary.

## Decision

Persist only bounded allowlisted inbound fields and, when a conservative sensitive-content signal fires, suppress the entire affected field and mark the snapshot incomplete.

## Consequences

Stored snapshots fail closed and preserve incompleteness evidence, while OAT explicitly avoids credential parsing, arbitrary-file scanning, and general-DLP guarantees.
