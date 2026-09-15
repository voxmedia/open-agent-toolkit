---
id: DR-260915-the-doctor-reads-cli-signals
title: The doctor reads CLI signals and does not restate them
date: 2026-09-15
status: accepted
legacy_id: null
---

# The doctor reads CLI signals and does not restate them

## Context

The 1.x oat-doctor carried an eleven-key config description list and a hand-maintained pack manifest, and both drifted from the CLI. The CLI already exposes describe, doctor, pjm doctor, and instructions validate as JSON, and five config descriptions stated deprecations only in prose.

## Decision

oat-doctor sources config knowledge from oat config describe and health from the CLI doctors and instructions validate, with projected fields. Deprecation is a structured deprecated field on describe entries (supersededBy, note, legacyValues), not a prose match. The skill keeps no key list or pack manifest.

## Consequences

A new CLI deprecation or pjm check reaches the doctor without a skill edit. The skill depends on CLI JSON shapes, so a contract test pins every projected field against the built CLI. New config deprecations must set supersededBy to a real catalog key, enforced by test.
