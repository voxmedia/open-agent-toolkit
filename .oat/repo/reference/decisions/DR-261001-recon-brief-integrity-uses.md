---
id: DR-261001-recon-brief-integrity-uses
title: Recon brief integrity uses rebuild-and-compare
date: 2026-10-01
status: accepted
legacy_id: null
---

# Recon brief integrity uses rebuild-and-compare

## Context

Recon review briefs were checked one field at a time. Three review rounds in backlog-wave-3 each found a new unbound field (claims, adversarial and coverage entries, then questions and scope) that let an injected claim, note, or source publish, and an omission-gap rule added in review was unsupported by any acceptance criterion.

## Decision

The recon validator rebuilds every brief type from the prior ledger with the production brief generator and rejects any difference with REVIEW_BRIEF_MISMATCH, once per brief per validation pass. The omission-gap rule is deleted: a claim a review omits stays unresolved and is listed as not reviewed in the packet's Review Downgrades section.

## Consequences

Brief integrity no longer depends on enumerating protected fields, and new brief fields are covered automatically. The change removed net 672 lines and made validation linear (800 claims from 4,402 ms to 97 ms). Forced partial status for omitted claims could be reintroduced if a consumer acts on a silently skipped claim.
