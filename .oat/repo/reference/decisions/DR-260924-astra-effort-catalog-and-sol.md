---
id: DR-260924-astra-effort-catalog-and-sol
title: Astra effort catalog and Sol max support
date: 2026-09-24
status: accepted
legacy_id: null
---

# Astra effort catalog and Sol max support

## Context

The Frontier recommendation needed Astra high and xhigh, while exact role dispatch also needs a supported-effort catalog and existing Sol max configurations must remain valid.

## Decision

Support Astra low, medium, high, xhigh, and max; exclude ultra; remove Sol max only from the bundled Frontier recommendation, not from catalog support.

## Consequences

Ten Astra implementer and reviewer variants are generated. Existing Sol max selections remain resolvable and populated user cells remain preserved.
