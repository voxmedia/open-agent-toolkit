---
id: DR-261012-archive-retry-identity
title: Archive retry identity and generations
date: 2026-10-12
status: accepted
legacy_id: null
---

# Archive retry identity and generations

## Context

A retried local archive created a timestamp-suffixed twin of an already archived project (the wave-5 double copy); reopened work had no defined archive identity.

## Decision

An archive is identified by project, originating scope and an explicit generation, bound to a manifest hash over retained files. An identical retry reuses the original snapshot, dated export identity, S3 destination and receipt across dates and after source removal; changed or ambiguous content refuses before any side effect with a stable archive-\* reason code and follow-up guidance. oat project archive --new-generation <reason> archives reopened work as the next generation bound to exactly one predecessor, persisted before any side effect. The synced protections from 49aeb5075 are preserved (artifact-cleanup D11).

## Consequences

Reopened work is a follow-up project or a new generation. Dry-run and apply share one read-only identity evaluator. Existing archives are never modified by a retry.
