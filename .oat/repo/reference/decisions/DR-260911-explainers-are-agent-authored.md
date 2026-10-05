---
id: DR-260911-explainers-are-agent-authored
title: Explainers are agent-authored; the provider seams and durability path are
  retired
date: 2026-09-11
status: accepted
legacy_id: null
---

# Explainers are agent-authored; the provider seams and durability path are retired

## Context

Explainer Kit had accumulated provider callback seams, expansion planning, content approval, publication, and per-run durability machinery around the visual artifact. That machinery made lifecycle callers reproduce internal contracts and made the mechanical pipeline, rather than the agent-authored explanation, the center of the feature.

## Decision

Use one agent-authored generation flow: bundle approved inputs into a fact base and ledger, let the host agent author exactly one recipe-guided HTML page, verify it with the highest available browser rung plus browser-free checks, and record an exact manifest v2 package. Lifecycle callers consume persisted intent and the outcomes built, built-needs-review, failed, or incomplete. The selected archive export is the durable completion copy; provider callback/module seams, expansion profiles, content approval, publication, and the separate durability path are retired. This decision supersedes DR-260726-explainer-authoring-is-two, DR-260726-recipe-policy-owns-expansion, DR-260726-expansion-artifacts-get-id, DR-260726-explainer-render-qa-is-opt, and DR-260817-version-agnostic-publication.

## Consequences

The host agent owns prose and page composition while the core owns evidence preparation, safety, traceability, browser-ladder verification, and immutable recording. Lifecycle skills share one Generate vocabulary and may archive built-needs-review with its human-review signal intact. Existing superseded records remain unchanged as history. Removed provider, publication, and durability contracts are not compatibility surfaces.

## Amendment: Completion export (2026-10-04)

Completion verifies the selected run's immutable hashes and complete inventory
before exporting one self-contained tracked HTML page. The archive JSON report
identifies the run, original page and hash, exported hash, and verified artifact
count. Summary and PR references point to that page. The full original run,
manifest, source, and QA evidence remain byte-for-byte in the archived project;
no tracked sidecar is required. Matching retries adopt the same page, while a
conflicting destination fails without overwrite. Existing legacy packages and
receipts remain readable. This amendment changes the completion export, while
preserving the original agent-authored generation decision and its history.
