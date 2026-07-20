---
id: DR-260719-root-owned-orchestration
title: Root-owned orchestration logging
date: 2026-07-19
status: accepted
legacy_id: null
---

# Root-owned orchestration logging

## Context

Reviewer orchestration needs durable traceability, while reviewers and their workers must remain read-only with respect to the append-only project log.

## Decision

The reviewer records compact orchestration evidence in the review artifact, and the root lifecycle validates it before appending one structural project-log entry.

## Consequences

Review evidence remains auditable without introducing competing log writers, duplicating every worker record, or expanding structured review output schemas.
