---
id: DR-260718-separate-native-read-mappings
title: Separate native-read mappings from adoption sources
date: 2026-07-18
status: accepted
legacy_id: null
---

# Separate native-read mappings from adoption sources

## Context

Cursor reads canonical skills directly, but existing provider-local Cursor skills still need migration visibility without violating the native-read mapping contract.

## Decision

Keep native-read providerDir equal to canonicalDir and model .cursor/skills independently as an adoption source used by stray and migration scans.

## Consequences

Sync no longer generates Cursor skill views, while Cursor-local skills remain discoverable for explicit adoption or keep-local handling.
