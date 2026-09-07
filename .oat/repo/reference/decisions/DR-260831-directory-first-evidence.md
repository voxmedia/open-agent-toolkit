---
id: DR-260831-directory-first-evidence
title: Directory-first evidence packet contract
date: 2026-08-31
status: accepted
legacy_id: null
---

# Directory-first evidence packet contract

## Context

Recon must hand bounded evidence to expensive consumers without forcing them to ingest every worker dossier or repeat mechanical source gathering.

## Decision

Publish every recon result as a packet directory whose normal consumer surface is the manifest, synthesis, canonical claim ledger, gaps, and review artifacts; keep raw dossiers available only for targeted follow-up.

## Consequences

Consumers can point at one directory and inspect compact, validated evidence first, while preserving auditability and reducing default context use. Integrations must consume the packet contract rather than invent inline or caller-specific result formats.
