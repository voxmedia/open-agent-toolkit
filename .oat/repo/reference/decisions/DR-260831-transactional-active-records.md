---
id: DR-260831-transactional-active-records
title: Transactional active records
date: 2026-08-31
status: accepted
legacy_id: null
---

# Transactional active records

## Context

Synced JSON records previously combined active discovery, completion state, and archive retry bindings, leaving terminal projects in the active namespace after archival.

## Decision

Treat the active synced JSON record as transactional state and delete it in the exact successful archive lifecycle commit; retain durable identity in archive metadata, summary output, and the completed ref.

## Consequences

Completed projects leave the active record namespace while recordless retries must recover from durable terminal evidence without recreating active state.
