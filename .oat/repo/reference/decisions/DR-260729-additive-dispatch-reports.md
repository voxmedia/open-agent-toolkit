---
id: DR-260729-additive-dispatch-reports
title: Additive dispatch reports
date: 2026-07-29
status: accepted
legacy_id: null
---

# Additive dispatch reports

## Context

Dispatch reports needed classification, legacy preferred-selection provenance, and notices without invalidating legacy producers, consumers, or compatibility-stamp parsers.

## Decision

Extend Dispatch Report V1 with additive nullable classification and preferred-selection fields plus ordered notices, using safe defaults and leaving existing field meanings and the Dispatch stamp grammar unchanged.

## Consequences

New consumers gain structured provenance and diagnostics, legacy producers remain valid, and compatibility stamps stay byte-for-byte stable.
