---
id: DR-260817-catalog-carries-policy-never
title: Catalog carries policy, never outcome
date: 2026-08-17
status: accepted
legacy_id: null
---

# Catalog carries policy, never outcome

## Context

The initiative catalog is serialized, hashed, and uploaded as an artifact before any public verification runs, and its hash is bound into the publish receipt. Writing a post-verification outcome into it would require re-upload or invalidate its own hash. p07 also published a changed catalog wire shape under the unchanged v1 version string against released 0.2.30.

## Decision

initiative-catalog/v2 carries a publicVerification policy marker (required or skipped-by-policy) resolved before serialization — policy, never outcome; per-artifact outcomes live in the receipt. Compatibility is regenerate-only: no v1 read path exists, evidenced by the fact that no released consumer could verify v1 catalog evidence even under its own library.

## Consequences

Third-party catalog consumers can see whether advertised URLs were policy-exempt from anonymous verification without any hash-ordering paradox. Any future catalog shape change requires a version bump; a version-binding contract test with hardcoded expected literals enforces it.
