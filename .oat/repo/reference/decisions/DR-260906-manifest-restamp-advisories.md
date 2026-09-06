---
id: DR-260906-manifest-restamp-advisories
title: Manifest restamp advisories precede the save and never block
date: 2026-09-06
status: accepted
legacy_id: null
---

# Manifest restamp advisories precede the save and never block

## Context

Wave 4 p02: init, remove-skill, and interactive status adoption saved the sync manifest through saveManifest, which always restamps oatVersion to the invoking CLI version, without reporting the producer version they replaced; only sync (PR #217) warned first.

## Decision

Every non-sync save site computes a producing-versus-invoking version diagnostic from the pre-mutation manifest with one shared pure helper (plain string identity, not semver), emits one scoped human advisory immediately before the save or a manifestVersionRestamps array in JSON, and never blocks; saveManifest keeps its final OAT_VERSION restamp; commands that never save (JSON status) carry no restamp evidence; a restamp-only sync apply reports the refresh instead of claiming no changes.

## Consequences

Operators see producer evidence before it is replaced across init, remove-skill, status, and sync; the advisory is diagnostic only and adds no exit-code semantics; engine save sites reached only through sync inherit sync's advisory.
