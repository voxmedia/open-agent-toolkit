---
id: DR-260817-no-structural-root
title: No structural root-correspondence rule
date: 2026-08-17
status: accepted
legacy_id: null
---

# No structural root-correspondence rule

## Context

A final-review finding proposed requiring the publication S3 key prefix to equal the public root path so divergent roots could not silently reach protected-mode receipts. The rule shipped and immediately broke the repository's own production CloudFront Origin Path fixture, which maps a bucket prefix to the distribution root; suffix-containment fails vacuously on the same case because an empty path is a suffix of everything.

## Decision

Do not enforce any structural correspondence between s3Uri and publicBaseUrl: the S3-key-to-URL mapping is underdetermined by the two strings because it lives in CDN configuration the tool cannot read. Surface protected-mode uncertainty as catalog verification state instead, and keep divergence detection only as a suppressible warning. Independent cross-model advisory (Codex) concurred at high confidence.

## Consequences

A typo-catching heuristic was deliberately given up; the receipt's skipped-protected status and the catalog policy marker carry the honesty instead. The sound long-term control — an authenticated end-to-end GET through the advertised URL with scoped, host-bound credentials — is backlog BL-260817-verify-protected-mode-public.
