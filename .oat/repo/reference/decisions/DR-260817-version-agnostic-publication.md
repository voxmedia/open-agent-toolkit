---
id: DR-260817-version-agnostic-publication
title: Version-agnostic publication gates
date: 2026-08-17
status: accepted
legacy_id: null
---

# Version-agnostic publication gates

## Context

The explainer-kit publication-root gate was keyed to the exact string publish-request/v2, so a credential-bearing publish-request/v1 block bypassed validation entirely and its root was persisted verbatim into the hash-covered run-request.json (the second final review's Critical). The same fail-open shape later resurfaced on the receipt branch and in the $id contract-kind form.

## Decision

Validate publication roots for every publish-request and publish-receipt shape by default (default deny), never keying a security gate to an exact version string; retain publish-request/v1 rather than removing it in a patch release, since six of nine benign v1 root shapes already pass strict validation and the three that fail should fail.

## Consequences

A future v3 contract cannot silently reintroduce the bypass. v1 removal is deferred to backlog BL-260817-drop-explainer-kit-publish for a future minor. The pattern was applied three times before it held everywhere (request gate, receipt gate, $id-form), which is itself evidence for the rule.
