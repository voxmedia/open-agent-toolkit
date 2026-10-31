---
id: DR-261031-bind-gate-artifact-admission
title: Bind gate-artifact admission to tracked Reviews-row cells
date: 2026-10-31
status: accepted
legacy_id: null
---

# Bind gate-artifact admission to tracked Reviews-row cells

## Context

The configured implementation exit gate's own review-artifact commit staled the goal milestone carrier it had just produced (GitHub #384), because the artifact path was not an allowed bookkeeping successor. The issue proposed admitting the artifact by its oat_review_phase_ids frontmatter, but the judged commit can itself rewrite that file, contradicting the brief contract section 12.8 rule that unlocks come only from tracked append-only rows.

## Decision

Admit a gate artifact as a bookkeeping successor of a carrier only when its Reviews row is Type code, Invocation gate, carries a non-placeholder reviewed head equal to the carrier's reviewed_head, and names a non-placeholder artifact under reviews/ (or reviews/archived/). The artifact joins EvidenceScope.evidenceArtifacts only.

## Consequences

The gate's own artifact commit no longer stales the carrier and no placeholder row is needed, while manual-invocation rows, mismatched heads and non-review paths stay disallowed. Gate artifacts never enter ownEvidenceArtifacts and are never selected as integrated-review rows, so set-once delivery fields still unlock only from a delivery's own rows. Treating an Invocation-cell edit as a Reviews-row identity change is deferred.
