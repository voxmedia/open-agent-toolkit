---
id: DR-260831-terminal-discovery-exclusion
title: Terminal discovery exclusion
date: 2026-08-31
status: accepted
legacy_id: null
---

# Terminal discovery exclusion

## Context

Retained completed history and legacy completion evidence could be mistaken for active discovery inputs and rematerialize archived projects through list, pull, or open.

## Decision

Exclude completed refs and terminal archive evidence from active listing, remote discovery, pull, open, and continuation guidance while preserving precise legacy and mismatch diagnoses.

## Consequences

Archived projects cannot be resurrected through ordinary active workflows, and transport or authentication failures cannot degrade to verified absence.
