---
id: DR-260714-fail-closed-scaffold-rendering
title: Fail-closed scaffold rendering
date: 2026-07-14
status: accepted
legacy_id: null
---

# Fail-closed scaffold rendering

## Context

Real project state templates used whitespace-padded OAT tokens that literal replacement silently preserved as valid but incorrectly typed YAML.

## Decision

Accept canonical and legacy internal whitespace during token replacement, exercise the real templates, and reject any unresolved OAT token before writing scaffold output.

## Consequences

All workflow modes render typed state values, and future token drift becomes an actionable scaffold failure instead of latent project corruption.
