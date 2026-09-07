---
id: DR-260907-universal-outbound-projection
title: Universal outbound projection gate
date: 2026-09-07
status: accepted
legacy_id: null
---

# Universal outbound projection gate

## Context

Remote create and update operations can publish sensitive or unintended content unless every mutation uses the same bounded, reviewable safety boundary.

## Decision

Require every outbound mutation to consume only an explicit normalized projection and pass one provider-neutral privacy and safety gate whose result digest is bound to preview, approval, action construction, and verification.

## Consequences

Missing, blocked, stale, or mismatched safety evidence fails closed, and no repository or arbitrary-file scan is needed to authorize a remote write.
