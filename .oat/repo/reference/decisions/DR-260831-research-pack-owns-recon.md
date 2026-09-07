---
id: DR-260831-research-pack-owns-recon
title: Research pack owns recon distribution
date: 2026-08-31
status: accepted
legacy_id: null
---

# Research pack owns recon distribution

## Context

Recon is broadly useful beyond OAT projects but depends on shared dispatch capabilities and needs a clear distribution owner without forcing automatic workflow coupling.

## Decision

Ship recon in the research pack with a same-scope utility-pack dependency and materializable worker definition; defer project-discovery and broader analysis integrations to separate backlog work.

## Consequences

The standalone skill remains generally applicable and installable through the research tool family. Future callers must reuse its packet and approval contracts rather than embedding duplicate recon implementations.
