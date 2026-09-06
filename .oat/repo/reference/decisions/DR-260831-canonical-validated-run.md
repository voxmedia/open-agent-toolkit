---
id: DR-260831-canonical-validated-run
title: Canonical validated-run boundary
date: 2026-08-31
status: superseded
legacy_id: null
---

# Canonical validated-run boundary

## Context

A reduced recon-specific approval envelope and scattered validation would allow packet claims to drift from the dispatch contract and terminal execution evidence.

## Decision

Reuse the dispatch system's complete canonical approval projection and admit evidence only through one ValidatedRun boundary that binds accepted-child receipts, a fresh catalog recheck, topology, provenance, and assurance claims.

## Consequences

Recon adds no parallel approval schema or validation framework. Invalid structural, receipt-chain, freshness, and canonical-value mutations fail at the existing packet publication boundary.

## Superseded

Superseded on 2026-09-04 by DR-260904-remove-dispatch-receipt-chain: the accepted-child receipts and catalog recheck this decision bound had no producer in any live launcher.
